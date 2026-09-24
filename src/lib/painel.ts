/**
 * ============================================
 * PAINEL DO GESTOR
 * ============================================
 *
 * Busca no Supabase as listas de presença de uma edição e faz as contas do painel.
 * As tabelas só respondem para quem é gestor (regras RLS no banco): para qualquer
 * outra pessoa as consultas voltam vazias.
 *
 * As contas são feitas aqui (e não no banco) porque o filtro de período muda
 * quais aulas entram — e a frequência precisa ser recalculada a cada filtro.
 */
import { formatarData } from '../utils/datas';
import { supabase } from './supabase';

export type Situacao = 'presente' | 'ausente' | 'justificada' | 'folga';

export interface Turma {
  id: number;
  nome: string;
}

export interface Participante {
  id: number;
  turma_id: number | null;
  funcao: 'aluno' | 'professor';
  nome: string;
  login: string | null;
  observacao: string | null;
  foto: string | null;
}

export interface Aula {
  id: number;
  turma_id: number | null;
  data: string | null;
  ordem: number;
  descricao: string | null;
}

export interface Presenca {
  participante_id: number;
  aula_id: number;
  situacao: Situacao;
  registro_original: string;
  justificativa: string | null;
  atestado_id: string | null;
}

export interface MudancaHorario {
  participante_id: number;
  horario: string | null;
}

export interface DadosDaEdicao {
  turmas: Turma[];
  participantes: Participante[];
  aulas: Aula[];
  presencas: Presenca[];
  mudancasHorario: MudancaHorario[];
}

/**
 * Linhas por página nas consultas grandes. Precisa ser igual ao "Max rows" do
 * projeto Supabase (Settings > API): se lá for menor, cada página volta
 * incompleta e linhas se perdem sem erro.
 */
const TAMANHO_PAGINA = 1000;

export class ServicoPainel {
  /**
   * Tudo de uma edição, em uma rodada só: as consultas saem ao mesmo tempo.
   * Presenças e mudanças de horário são filtradas pela edição no próprio banco
   * (junção com aulas/participantes), sem mandar listas de ids na URL.
   */
  async carregarDadosDaEdicao(edicaoId: number): Promise<DadosDaEdicao> {
    const [turmas, participantes, aulas, presencas, mudancas] = await Promise.all([
      supabase.from('turmas').select('id, nome').eq('edicao_id', edicaoId).order('nome'),
      supabase
        .from('participantes')
        .select('id, turma_id, funcao, nome, login, observacao, foto')
        .eq('edicao_id', edicaoId)
        .order('nome'),
      supabase.from('aulas').select('id, turma_id, data, ordem, descricao').eq('edicao_id', edicaoId).order('ordem'),
      // "aulas!inner()" só filtra pela edição: não devolve nenhuma coluna de aulas
      this.buscarTudo<Presenca>(
        (de, ate) =>
          supabase
            .from('presencas')
            .select(
              'participante_id, aula_id, situacao, registro_original, justificativa, atestado_id, aulas!inner()',
              {
                count: de === 0 ? 'exact' : undefined,
              },
            )
            .eq('aulas.edicao_id', edicaoId)
            .order('aula_id')
            .order('participante_id')
            .range(de, ate) as unknown as PromiseLike<{
            data: Presenca[] | null;
            error: unknown;
            count: number | null;
          }>,
      ),
      supabase
        .from('mudancas_horario')
        .select('participante_id, horario, participantes!inner()')
        .eq('participantes.edicao_id', edicaoId),
    ]);
    for (const r of [turmas, participantes, aulas, mudancas]) if (r.error) throw r.error;

    return {
      turmas: turmas.data!,
      participantes: participantes.data! as Participante[],
      aulas: aulas.data!,
      presencas,
      mudancasHorario: mudancas.data! as MudancaHorario[],
    };
  }

  /**
   * A API devolve no máximo TAMANHO_PAGINA linhas por vez. A primeira página já
   * traz o total; as demais são pedidas todas ao mesmo tempo.
   */
  private async buscarTudo<T>(
    consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown; count: number | null }>,
  ): Promise<T[]> {
    const primeira = await consulta(0, TAMANHO_PAGINA - 1);
    if (primeira.error) throw primeira.error;
    const total = primeira.count ?? 0;
    const restantes = await Promise.all(
      Array.from({ length: Math.max(0, Math.ceil(total / TAMANHO_PAGINA) - 1) }, (_, i) => {
        const de = (i + 1) * TAMANHO_PAGINA;
        return consulta(de, de + TAMANHO_PAGINA - 1);
      }),
    );
    const todas = [...(primeira.data ?? [])];
    for (const pagina of restantes) {
      if (pagina.error) throw pagina.error;
      todas.push(...(pagina.data ?? []));
    }
    // Página que voltou menor que o pedido: o limite de linhas do Supabase é menor que TAMANHO_PAGINA
    if (todas.length < total) console.error('[painel] presenças incompletas', { recebidas: todas.length, total });
    return todas;
  }
}

export const servicoPainel = new ServicoPainel();

// ============================================
// CONTAS
// ============================================

export interface Resumo {
  presentes: number;
  ausentes: number;
  justificadas: number;
  folgas: number;
  /** presentes / (presentes + ausentes); null quando não houve aula contável */
  frequencia: number | null;
}

function resumir(situacoes: Situacao[]): Resumo {
  const r = { presentes: 0, ausentes: 0, justificadas: 0, folgas: 0 };
  for (const s of situacoes) {
    if (s === 'presente') r.presentes++;
    else if (s === 'ausente') r.ausentes++;
    else if (s === 'justificada') r.justificadas++;
    else r.folgas++;
  }
  const contaveis = r.presentes + r.ausentes;
  return { ...r, frequencia: contaveis ? r.presentes / contaveis : null };
}

export type Faixa = 'todas' | 'baixa' | 'media' | 'alta' | 'risco';

/** Meta de frequência do curso: abaixo dela o aluno está "em risco" */
export const META_FREQUENCIA = 0.75;

/** Abaixo disto a frequência é "baixa" (vermelho); entre isto e a meta, "média" (âmbar) */
const LIMITE_FREQUENCIA_BAIXA = 0.5;

/** Faltas seguidas (nas aulas mais recentes) que indicam possível desistência */
export const FALTAS_SEGUIDAS_ALERTA = 3;

/** Faixas de frequência usadas no filtro e no gráfico de distribuição */
export const FAIXAS: { valor: Exclude<Faixa, 'todas' | 'risco'>; rotulo: string; cor: string }[] = [
  { valor: 'baixa', rotulo: `Abaixo de ${LIMITE_FREQUENCIA_BAIXA * 100}%`, cor: '#dc2626' },
  {
    valor: 'media',
    rotulo: `De ${LIMITE_FREQUENCIA_BAIXA * 100}% a ${META_FREQUENCIA * 100 - 1}%`,
    cor: '#f59e0b',
  },
  { valor: 'alta', rotulo: `${META_FREQUENCIA * 100}% ou mais`, cor: '#8bc53f' },
];

export function faixaDe(frequencia: number | null): Exclude<Faixa, 'todas' | 'risco'> | null {
  if (frequencia === null) return null;
  if (frequencia < LIMITE_FREQUENCIA_BAIXA) return 'baixa';
  if (frequencia < META_FREQUENCIA) return 'media';
  return 'alta';
}

/** Cor da faixa de uma frequência (cinza quando não há dado) */
export const corDaFrequencia = (frequencia: number | null) =>
  FAIXAS.find((f) => f.valor === faixaDe(frequencia))?.cor ?? '#9ca3af';

export function formatarPercentual(valor: number | null): string {
  return valor === null ? '—' : `${Math.round(valor * 100)}%`;
}

// ============================================
// PAINEL: todas as contas a partir dos dados + filtros
// ============================================

export interface Filtros {
  turma: string; // 'todas' ou o id da turma
  busca: string;
  faixa: Faixa;
  dataDe: string;
  dataAte: string;
}

export const FILTROS_INICIAIS: Filtros = { turma: 'todas', busca: '', faixa: 'todas', dataDe: '', dataAte: '' };

export type AlunoDoPainel = Participante &
  Resumo & {
    turma: string;
    /** Faltas seguidas nas aulas mais recentes da turma (sem contar justificadas) */
    faltasSeguidas: number;
  };

const media = (lista: number[]) => (lista.length ? lista.reduce((s, v) => s + v, 0) / lista.length : null);

export function montarPainel(dados: DadosDaEdicao, filtros: Filtros) {
  const { turmas, participantes, aulas, presencas } = dados;
  const nomeTurma = new Map(turmas.map((t) => [t.id, t.nome]));
  const turmaEscolhida = filtros.turma === 'todas' ? null : Number(filtros.turma);

  // Período: aula sem data só entra quando nenhum período foi escolhido
  const semPeriodo = !filtros.dataDe && !filtros.dataAte;
  const dentroDoPeriodo = (data: string | null) =>
    data ? (!filtros.dataDe || data >= filtros.dataDe) && (!filtros.dataAte || data <= filtros.dataAte) : semPeriodo;

  const aulasValidas = aulas.filter((a) => dentroDoPeriodo(a.data));
  const aulasDeAlunos = aulasValidas.filter(
    (a) => a.turma_id !== null && (turmaEscolhida === null || a.turma_id === turmaEscolhida),
  );
  const aulasDeProfessores = aulasValidas.filter((a) => a.turma_id === null);
  const idsAulasValidas = new Set(aulasValidas.map((a) => a.id));

  // Presenças indexadas por pessoa, por aula e por célula (pessoa-aula)
  const porPessoa = new Map<number, Presenca[]>();
  const porAula = new Map<number, Presenca[]>();
  const celulas = new Map<string, Presenca>();
  const agrupar = (mapa: Map<number, Presenca[]>, chave: number, p: Presenca) => {
    const lista = mapa.get(chave);
    if (lista) lista.push(p);
    else mapa.set(chave, [p]);
  };
  for (const p of presencas) {
    if (!idsAulasValidas.has(p.aula_id)) continue;
    celulas.set(`${p.participante_id}-${p.aula_id}`, p);
    agrupar(porPessoa, p.participante_id, p);
    agrupar(porAula, p.aula_id, p);
  }
  const resumoDe = (id: number): Resumo => resumir((porPessoa.get(id) ?? []).map((p) => p.situacao));

  // Aulas de cada turma, da mais recente para a mais antiga (para contar faltas seguidas)
  const aulasRecentesDaTurma = new Map<number, Aula[]>();
  for (const a of aulasValidas) {
    if (a.turma_id === null || !a.data) continue;
    const lista = aulasRecentesDaTurma.get(a.turma_id);
    if (lista) lista.push(a);
    else aulasRecentesDaTurma.set(a.turma_id, [a]);
  }
  for (const lista of aulasRecentesDaTurma.values()) lista.sort((x, y) => y.data!.localeCompare(x.data!));

  /** Quantas das últimas aulas o aluno faltou seguidas (para na primeira presença/justificativa) */
  const faltasSeguidasDe = (id: number, turmaId: number | null): number => {
    let seguidas = 0;
    for (const aula of aulasRecentesDaTurma.get(turmaId ?? -1) ?? []) {
      const registro = celulas.get(`${id}-${aula.id}`);
      if (!registro) continue; // sem registro (ainda não estava na turma): ignora
      if (registro.situacao !== 'ausente') break;
      seguidas++;
    }
    return seguidas;
  };

  // Alunos depois dos filtros de turma, busca e faixa
  const busca = filtros.busca.trim().toLowerCase();
  const alunos: AlunoDoPainel[] = participantes
    .filter((p) => p.funcao === 'aluno')
    .filter((p) => turmaEscolhida === null || p.turma_id === turmaEscolhida)
    .filter((p) => !busca || p.nome.toLowerCase().includes(busca) || !!p.login?.toLowerCase().includes(busca))
    .map((p) => ({
      ...p,
      turma: nomeTurma.get(p.turma_id!) ?? '',
      ...resumoDe(p.id),
      faltasSeguidas: faltasSeguidasDe(p.id, p.turma_id),
    }))
    .filter(
      (p) =>
        filtros.faixa === 'todas' ||
        (filtros.faixa === 'risco'
          ? p.frequencia !== null && p.frequencia < META_FREQUENCIA
          : faixaDe(p.frequencia) === filtros.faixa),
    );
  const idsAlunos = new Set(alunos.map((a) => a.id));
  const frequencias = alunos.map((a) => a.frequencia).filter((f): f is number => f !== null);

  // Presença por aula, só com os alunos filtrados: vira a linha do tempo
  const turmasVisiveis = turmas.filter((t) => turmaEscolhida === null || t.id === turmaEscolhida);
  const pontosPorData = new Map<string, Record<string, string | number | null>>();
  for (const aula of aulasDeAlunos) {
    if (!aula.data) continue;
    const doDia = (porAula.get(aula.id) ?? []).filter((p) => idsAlunos.has(p.participante_id));
    const r = resumir(doDia.map((p) => p.situacao));
    if (r.frequencia === null) continue;
    const data = formatarData(aula.data); // "07/03/2024" -> rótulo "07/03/24"
    const ponto = pontosPorData.get(aula.data) ?? { data: aula.data, rotulo: data.slice(0, 6) + data.slice(-2) };
    const turma = nomeTurma.get(aula.turma_id!)!;
    ponto[turma] = r.frequencia;
    ponto[`${turma}__detalhe`] = `${r.presentes} de ${r.presentes + r.ausentes} presentes`;
    pontosPorData.set(aula.data, ponto);
  }

  const pontos = [...pontosPorData.values()].sort((a, b) => String(a.data).localeCompare(String(b.data)));

  // Totais de todos os registros de presença dos alunos filtrados
  const totais = resumir(
    [...porPessoa.entries()].filter(([id]) => idsAlunos.has(id)).flatMap(([, lista]) => lista.map((p) => p.situacao)),
  );

  // Presentes por aula: as aulas com data da(s) turma(s) visível(is) e, nelas,
  // só os alunos filtrados. Numerador e denominador no MESMO recorte.
  const aulasComData = aulasDeAlunos.filter((a) => a.data);
  const presentesNasAulasComData = aulasComData.reduce(
    (total, aula) =>
      total +
      (porAula.get(aula.id) ?? []).filter((p) => p.situacao === 'presente' && idsAlunos.has(p.participante_id)).length,
    0,
  );

  // Período das aulas (primeira e última data)
  const datas = aulasComData.map((a) => a.data!).sort();

  // Aulas em que a presença foi melhor e pior (média entre as turmas do dia)
  const mediaDoPonto = (ponto: Record<string, string | number | null>) =>
    media(turmasVisiveis.map((t) => ponto[t.nome]).filter((v): v is number => typeof v === 'number'));
  const pontosComMedia = pontos
    .map((ponto) => ({ data: String(ponto.data), media: mediaDoPonto(ponto) }))
    .filter((p): p is { data: string; media: number } => p.media !== null);
  const melhorAula = pontosComMedia.reduce<(typeof pontosComMedia)[number] | null>(
    (m, p) => (!m || p.media > m.media ? p : m),
    null,
  );
  const piorAula = pontosComMedia.reduce<(typeof pontosComMedia)[number] | null>(
    (m, p) => (!m || p.media < m.media ? p : m),
    null,
  );

  // Quem precisa de atenção: abaixo da meta, de quem tem mais faltas para menos
  // (no empate, a menor frequência primeiro; depois o nome)
  const emRisco = alunos
    .filter((a) => a.frequencia !== null && a.frequencia < META_FREQUENCIA)
    .sort((a, b) => b.ausentes - a.ausentes || a.frequencia! - b.frequencia! || a.nome.localeCompare(b.nome, 'pt-BR'));

  return {
    turmasVisiveis,
    alunos,
    totais,
    /** Aulas com data no recorte atual */
    quantidadeDeAulas: aulasComData.length,
    /** Média de alunos presentes por aula (arredondada), no recorte atual */
    presentesPorAula: aulasComData.length ? Math.round(presentesNasAulasComData / aulasComData.length) : 0,
    periodo: datas.length ? { inicio: datas[0], fim: datas[datas.length - 1] } : null,
    melhorAula,
    piorAula,
    emRisco,
    possivelDesistencia: alunos.filter((a) => a.faltasSeguidas >= FALTAS_SEGUIDAS_ALERTA),
    aulasDeAlunos,
    aulasDeProfessores,
    celulas,
    professores: participantes.filter((p) => p.funcao === 'professor').map((p) => ({ ...p, ...resumoDe(p.id) })),
    pontos,
    frequenciaMedia: media(frequencias),
    abaixoDaMeta: frequencias.filter((f) => f < META_FREQUENCIA).length,
    distribuicao: FAIXAS.map((f) => {
      const quantos = alunos.filter((a) => faixaDe(a.frequencia) === f.valor).length;
      return { rotulo: f.rotulo, cor: f.cor, valor: quantos, parte: alunos.length ? quantos / alunos.length : 0 };
    }),
    porTurma: turmasVisiveis.map((t) => {
      const daTurma = alunos.filter((a) => a.turma_id === t.id);
      return {
        rotulo: t.nome,
        alunos: daTurma.length,
        /** null = nenhuma aula contável no recorte (sem dados, não 0%) */
        valor: media(daTurma.filter((a) => a.frequencia !== null).map((a) => a.frequencia!)),
      };
    }),
  };
}

export type Painel = ReturnType<typeof montarPainel>;
