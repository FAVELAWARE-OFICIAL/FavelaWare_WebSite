"""
Gera o SQL de carga das listas de presença (planilhas .xlsx) para o Supabase.

Serve só para a PRIMEIRA carga, com o banco vazio (ele se recusa a rodar se
já houver dados: depois da carga, o site é a fonte da verdade).
O SQL gerado tem dados pessoais dos alunos, então NUNCA vai para o git:
grave fora do repositório (ou em arquivo coberto pelo .gitignore).

Uso (precisa de: pip install openpyxl):
    python scripts/importar_planilhas.py <saida.sql>
    npx supabase db query --linked -f <saida.sql>
"""

import datetime
import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent

EDICOES = [
    {'nome': 'Edição 1 (2022)', 'arquivo': 'Lista de Presença - 2022_1.xlsx'},
    {'nome': 'Edição 2 (2023-2024)', 'arquivo': 'Lista de Presença - Edição 2.xlsx'},
    {'nome': 'Edição 3 (2025-2026)', 'arquivo': 'Lista de Presença - Edição 3.xlsx'},
]

# Nome padronizado de cada turma (aba da planilha -> nome no banco).
# Padrão: "Turma 1", "Turma 2"... ou "Turma A", "Turma B"... e "Turma Única".
NOMES_DE_TURMA = {
    'TURMA 1 - QUASAB': 'Turma 1',
    'TURMA 2 - QUASEX': 'Turma 2',
    'TURMA A': 'Turma 1',  # no site oficial, a Edição 2 usa Turma 1 e Turma 2
    'TURMA B': 'Turma 2',
    'TURMA': 'Turma Única',
}

# Abas que não são turma nem professores (tratadas à parte ou ignoradas)
ABAS_ESPECIAIS = {'Gráficos', 'Página8', 'Duplas', 'MUDANÇA DE HORÁRIO TURMA 1'}

SITUACOES = {
    'p': 'presente',
    'a': 'ausente',
    'f': 'ausente',
    'provas': 'justificada',
    'viajando': 'justificada',
    'luto': 'justificada',
    'x': 'justificada',
    'j': 'justificada',  # chamada feita pelo site
    'folga': 'folga',
}

# Turmas do site (src/data/turmas.ts) -> (ordem da edição, aba da planilha).
# A turma "2022.2" do site não tem planilha, então fica de fora.
TURMAS_DO_SITE = {
    'turma-1-2022-1': 1,
    'turma-2-2022-1': 1,
    'turma-1-2023-2': 2,
    'turma-2-2023-2': 2,
    'turma-2025': 3,
}

# Nome do site -> nome da planilha, quando os dois foram digitados diferente
NOMES_DIFERENTES = {
    'Marcos Vinicius Rodigues da Silva': 'Marcos Vinicius Rodriques Da Silva',
}

# Palavras que não ajudam a identificar a pessoa
PARTICULAS = {'de', 'da', 'do', 'das', 'dos', 'e'}

HORARIOS = {'8HS-12HS': '08h-12h', '9HS-13HS': '09h-13h', '13HS-17HS': '13h-17h'}


class ErroDePlanilha(Exception):
    pass


def texto(valor):
    if valor is None:
        return None
    limpo = re.sub(r'\s+', ' ', str(valor)).strip()
    return limpo or None


def chave_nome(nome):
    """Nome normalizado para casar a mesma pessoa entre abas."""
    sem_acento = unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', sem_acento).strip().casefold()


def sql(valor):
    if valor is None:
        return 'null'
    if isinstance(valor, (int, float)):
        return str(valor)
    if isinstance(valor, datetime.date):
        return f"'{valor.isoformat()}'"
    return "'" + str(valor).replace("'", "''") + "'"


class Carga:
    def __init__(self):
        self.linhas = {}  # tabela -> lista de (colunas, valores)
        self.proximo_id = {}

    def inserir(self, tabela, **campos):
        if 'id' not in campos and tabela in ('edicoes', 'turmas', 'participantes', 'aulas', 'conteudos', 'duplas'):
            campos = {'id': self.novo_id(tabela), **campos}
        self.linhas.setdefault(tabela, []).append(campos)
        return campos.get('id')

    # ATENÇÃO: os ids saem na ordem das planilhas. src/data/turmas.ts guarda o
    # participanteId de cada aluno do site (e o banco marca esses alunos com
    # no_site): reimportar com as linhas em outra ordem troca as fotos de pessoa.
    def novo_id(self, tabela):
        self.proximo_id[tabela] = self.proximo_id.get(tabela, 0) + 1
        return self.proximo_id[tabela]


def ler_lista_de_presenca(carga, ws, edicao_id, turma_id, funcao):
    """Lê uma aba de chamada (turma ou professores) e devolve {nome normalizado: participante_id}."""
    linhas = list(ws.iter_rows(values_only=True))
    i_cab = next((i for i, l in enumerate(linhas) if any(isinstance(c, datetime.datetime) for c in l)), None)
    if i_cab is None:
        raise ErroDePlanilha(f'{ws.title}: cabeçalho com datas não encontrado')
    cab = [texto(c) if not isinstance(c, datetime.datetime) else c for c in linhas[i_cab]]

    col_login = next((j for j, c in enumerate(cab) if c == 'Login'), None)
    col_obs = next((j for j, c in enumerate(cab) if c == 'Observações'), None)
    datas = [j for j, c in enumerate(cab) if isinstance(c, datetime.datetime)]
    fim = next(j for j, c in enumerate(cab) if c == 'PRESENÇAS') if 'PRESENÇAS' in cab else datas[-1] + 1
    # Colunas entre a primeira data e o total: com data, ou sem data mas com chamada
    colunas_aula = list(range(datas[0], fim))

    pessoas = []
    for linha in linhas[i_cab + 1:]:
        nome = texto(linha[0])
        if not nome or nome.lower().startswith('presen'):
            break
        pessoas.append((nome, linha))

    aulas = {}
    for ordem, j in enumerate(colunas_aula, start=1):
        if not any(texto(l[j]) for _, l in pessoas):
            continue  # coluna vazia (sem aula)
        data = cab[j].date() if isinstance(cab[j], datetime.datetime) else None
        aulas[j] = carga.inserir(
            'aulas', edicao_id=edicao_id, turma_id=turma_id, data=data, ordem=ordem,
            descricao=None if data else 'Aula sem data na planilha',
        )

    ids = {}
    for nome, linha in pessoas:
        pid = carga.inserir(
            'participantes', edicao_id=edicao_id, turma_id=turma_id, funcao=funcao, nome=nome,
            login=texto(linha[col_login]) if col_login is not None else None,
            observacao=texto(linha[col_obs]) if col_obs is not None else None,
        )
        ids[chave_nome(nome)] = pid
        for j, aula_id in aulas.items():
            registro = texto(linha[j])
            if not registro:
                continue
            situacao = SITUACOES.get(registro.casefold())
            if situacao is None:
                raise ErroDePlanilha(f'{ws.title}: código desconhecido "{registro}" para {nome}')
            carga.inserir('presencas', participante_id=pid, aula_id=aula_id, situacao=situacao, registro_original=registro)

    # Rodapé: presenças por conteúdo ("quant dias" | P | A)
    rodape = []
    i_cont = next((i for i, l in enumerate(linhas) if 'quant dias' in [texto(c) for c in l[:3]]), None)
    if i_cont is not None:
        for l in linhas[i_cont + 1:]:
            nome = texto(l[0])
            if nome == 'Total' or (not nome and not texto(l[2])):
                break
            if nome:  # a Edição 2 tem o bloco, mas sem o nome dos conteúdos: não dá para usar
                rodape.append((nome, int(float(l[1])), int(float(l[2])), int(float(l[3])) if texto(l[3]) else None))
    return ids, rodape


def fotos_do_site():
    """{ordem da edição: [(nome curto, caminho da foto)]} lidos de src/data/turmas.ts."""
    fonte = (RAIZ / 'src' / 'data' / 'turmas.ts').read_text(encoding='utf-8')
    lista = json.loads(fonte[fonte.index('export const turmas: Turma[] = ') + 31: fonte.rindex(']') + 1])
    fotos = {}
    for turma in lista:
        ordem = TURMAS_DO_SITE.get(turma['slug'])
        if ordem is None:
            continue
        for aluno in turma['alunos']:
            if aluno.get('foto'):
                fotos.setdefault(ordem, []).append((aluno['nome'], aluno['foto']))
    return fotos


def palavras(nome):
    return {p for p in chave_nome(nome).split() if p not in PARTICULAS}


def casar_fotos(carga, ordem, edicao_id, fotos):
    """O site usa nome curto ("Adrian Andrade"); a planilha, o completo.
    Casa quando todas as palavras do nome curto estão no nome completo, e só
    se houver exatamente um aluno assim na edição."""
    alunos = [p for p in carga.linhas['participantes'] if p['edicao_id'] == edicao_id and p['funcao'] == 'aluno']
    sem_par = []
    for nome_curto, foto in fotos.get(ordem, []):
        procurado = palavras(NOMES_DIFERENTES.get(nome_curto, nome_curto))
        candidatos = [a for a in alunos if procurado <= palavras(a['nome'])]
        if len(candidatos) == 1:
            candidatos[0]['foto'] = foto
        else:
            sem_par.append(f'{nome_curto} ({len(candidatos)} candidatos)')
    if sem_par:
        print(f'aviso: edição {ordem}, fotos sem aluno correspondente: {", ".join(sem_par)}')


def importar_edicao(carga, ordem, info):
    wb = openpyxl.load_workbook(RAIZ / info['arquivo'], data_only=True)
    edicao = {'nome': info['nome'], 'ordem': ordem, 'arquivo_origem': info['arquivo']}

    if 'Gráficos' in wb.sheetnames:
        l = list(wb['Gráficos'].iter_rows(values_only=True))
        i_res = next(i for i, r in enumerate(l) if texto(r[0]) == 'Total number of students')
        total, aprovados, desistentes = (int(float(v)) for v in l[i_res + 1][:3])
        edicao.update(total_alunos_informado=total, aprovados_informado=aprovados, desistentes_informado=desistentes)
    edicao_id = carga.inserir('edicoes', **edicao)

    turmas = {}
    rodapes = {}
    for ws in wb.worksheets:
        if ws.title in ABAS_ESPECIAIS:
            continue
        if ws.title == 'PROFESSORES':
            ler_lista_de_presenca(carga, ws, edicao_id, None, 'professor')
            continue
        turma_id = carga.inserir('turmas', edicao_id=edicao_id, nome=NOMES_DE_TURMA[ws.title])
        ids, rodape = ler_lista_de_presenca(carga, ws, edicao_id, turma_id, 'aluno')
        turmas[ws.title] = (turma_id, ids)
        rodapes[turma_id] = rodape

    # Conteúdos: nomes em português vêm do rodapé das turmas; % médio vem da aba Gráficos (mesma ordem)
    base = next((r for r in rodapes.values() if r), None)
    if base:
        graficos = []
        if 'Gráficos' in wb.sheetnames:
            for r in list(wb['Gráficos'].iter_rows(values_only=True))[1:]:
                if not texto(r[0]):
                    break
                graficos.append((texto(r[0]), float(r[1])))
        if graficos and len(graficos) != len(base):
            raise ErroDePlanilha(f'{info["arquivo"]}: Gráficos tem {len(graficos)} conteúdos, turmas têm {len(base)}')
        for i, (nome, dias, _, _) in enumerate(base):
            cid = carga.inserir(
                'conteudos', edicao_id=edicao_id, ordem=i + 1, nome=nome, dias=dias,
                nome_ingles=graficos[i][0] if graficos else None,
                percentual_medio=graficos[i][1] if graficos else None,
            )
            for turma_id, rodape in rodapes.items():
                if rodape:
                    carga.inserir('conteudos_turma', conteudo_id=cid, turma_id=turma_id,
                                  presencas=rodape[i][2], faltas=rodape[i][3])

    primeira_turma_id, primeira_turma = next(iter(turmas.values()))

    def achar(nome, aba):
        pid = primeira_turma.get(chave_nome(nome))
        if pid is None:
            raise ErroDePlanilha(f'{info["arquivo"]} / {aba}: "{nome}" não está na primeira turma')
        return pid

    # Página8 (só 2022): chamada avulsa, sem data, dos alunos da Turma 1
    if 'Página8' in wb.sheetnames:
        aula_id = carga.inserir('aulas', edicao_id=edicao_id, turma_id=primeira_turma_id, data=None,
                                ordem=1000, descricao='Chamada avulsa sem data (aba Página8)')
        for r in wb['Página8'].iter_rows(values_only=True):
            if texto(r[0]):
                registro = texto(r[1])
                carga.inserir('presencas', participante_id=achar(texto(r[0]), 'Página8'), aula_id=aula_id,
                              situacao=SITUACOES[registro.casefold()], registro_original=registro)

    # Mudança de horário: a aba é idêntica nas 3 planilhas e fala da Turma 1 de 2022
    if ordem == 1:
        l = list(wb['MUDANÇA DE HORÁRIO TURMA 1'].iter_rows(values_only=True))
        cab = [texto(c) for c in l[0]]
        for r in l[1:]:
            if texto(r[0]):
                marcados = [HORARIOS[cab[j]] for j in range(1, len(cab)) if texto(r[j])]
                if len(marcados) > 1:
                    raise ErroDePlanilha(f'Mudança de horário: {r[0]} marcou mais de um horário')
                # Nome que não está na chamada e sem horário marcado não tem o que guardar
                if not marcados and chave_nome(texto(r[0])) not in primeira_turma:
                    print(f'aviso: mudança de horário ignorou "{texto(r[0])}" (fora da turma, sem horário)')
                    continue
                carga.inserir('mudancas_horario', participante_id=achar(texto(r[0]), 'Mudança de horário'),
                              horario=marcados[0] if marcados else None)

    # Duplas: pares de colunas (nome, email) por turma, na ordem das abas de turma
    if 'Duplas' in wb.sheetnames:
        l = list(wb['Duplas'].iter_rows(values_only=True))
        nomes_turma = list(turmas)
        for k, j in enumerate(range(0, len(l[0]), 2)):
            if not texto(l[0][j]):
                continue
            turma_id = turmas[nomes_turma[k]][0]
            ordem_dupla = 0
            for r in l[1:]:
                if j < len(r) and texto(r[j]):
                    ordem_dupla += 1
                    carga.inserir('duplas', turma_id=turma_id, ordem=ordem_dupla,
                                  integrantes=texto(r[j]), emails=texto(r[j + 1]))


# Este script é só para a PRIMEIRA carga, com o banco vazio. Depois dela, o
# site passa a ser a fonte da verdade (turmas, alunos e chamadas feitos lá) e
# uma carga completa apagaria tudo isso: por isso ela se recusa a rodar.
GUARDA = """do $$
begin
  if exists (select 1 from public.edicoes) then
    raise exception 'Carga cancelada: o banco já tem dados. Este script só faz a primeira carga, com o banco vazio.';
  end if;
end $$;"""


def gerar_sql(carga):
    ordem = ['edicoes', 'turmas', 'participantes', 'aulas', 'presencas',
             'conteudos', 'conteudos_turma', 'duplas', 'mudancas_horario']
    saida = ['begin;', GUARDA, f'truncate {", ".join("public." + t for t in ordem)} restart identity cascade;']
    for tabela in ordem:
        linhas = carga.linhas.get(tabela, [])
        if not linhas:
            continue
        colunas = list(dict.fromkeys(c for l in linhas for c in l))  # nem toda linha tem todas
        sobrepor = ' overriding system value' if 'id' in colunas else ''
        valores = ',\n'.join('(' + ', '.join(sql(l.get(c)) for c in colunas) + ')' for l in linhas)
        saida.append(f'insert into public.{tabela} ({", ".join(colunas)}){sobrepor} values\n{valores};')
        if 'id' in colunas:
            saida.append(f"select setval(pg_get_serial_sequence('public.{tabela}', 'id'), {max(l['id'] for l in linhas)});")
    saida.append('commit;')
    return '\n'.join(saida) + '\n'


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    carga = Carga()
    fotos = fotos_do_site()
    for ordem, info in enumerate(EDICOES, start=1):
        importar_edicao(carga, ordem, info)
        casar_fotos(carga, ordem, ordem, fotos)  # ids das edições seguem a ordem
    Path(sys.argv[1]).write_text(gerar_sql(carga), encoding='utf-8')
    for tabela, linhas in carga.linhas.items():
        print(f'{tabela}: {len(linhas)}')


if __name__ == '__main__':
    main()
