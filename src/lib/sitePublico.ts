/**
 * ============================================
 * DADOS DO BANCO NO SITE PÚBLICO
 * ============================================
 *
 * O site público (sem login) lê do banco só o que mostra, por funções que
 * devolvem nome e foto e nada mais:
 * - fotos_das_turmas: a foto que o gestor põe no dashboard substitui a do
 *   arquivo nas páginas de turmas (cada aluno de src/data/turmas.ts tem o
 *   participanteId, o id dele no banco);
 * - turmas_do_site: as turmas e os alunos das edições novas (a 4ª em diante),
 *   que não estão escritas à mão em src/data/turmas.ts;
 * - equipe_da_edicao_atual: os instrutores da edição atual, na página Sobre.
 *
 * Aqui mora a regra (montar as turmas no formato do site, juntar com as do
 * arquivo, o título da equipe). Os hooks de src/hooks/ só guardam o estado.
 *
 * Usa fetch direto (sem o cliente do Supabase) para o site público continuar
 * leve. Se o banco não responder, a página fica só com o que está no arquivo.
 */
import { CHAVE_PUBLICAVEL_SUPABASE, PREFIXO_FOTOS_PUBLICAS, URL_SUPABASE } from '../config';
import type { TurmaDoSite } from '../data/turmas';
import { perfilLinkedinValido } from '../utils/texto';

// Só aceita foto do próprio site ou do bucket de fotos do projeto: um valor
// estranho no banco nunca vira imagem de outro endereço no site público
const fotoConfiavel = (foto: unknown): string | null =>
  typeof foto === 'string' &&
  (foto.startsWith('/imgs/') || (PREFIXO_FOTOS_PUBLICAS !== null && foto.startsWith(PREFIXO_FOTOS_PUBLICAS)))
    ? foto
    : null;

/** Linha de turmas_do_site */
interface AlunoDoBanco {
  edicaoOrdem: number;
  edicaoNome: string;
  encerrada: boolean;
  turmaId: number;
  turmaNome: string;
  /** Já no formato curto do site ("Maria Lima"), montado pelo banco */
  alunoNome: string | null;
  foto: string | null;
}

/** Linha de equipe_da_edicao_atual */
export interface InstrutorDaEdicao {
  edicaoOrdem: number;
  edicaoNome: string;
  nome: string;
  foto: string | null;
  linkedin: string | null;
}

/** A equipe da edição atual, pronta para a página Sobre */
export interface EquipeDaEdicao {
  titulo: string;
  instrutores: InstrutorDaEdicao[];
}

export class ServicoSitePublico {
  /** Cada consulta é buscada uma vez por visita e reaproveitada entre as páginas */
  private buscas = new Map<string, Promise<unknown[]>>();

  /** { id do aluno: foto atual (null = sem foto) }; vazio se o banco não responder */
  async fotosDosAlunos(): Promise<Map<number, string | null>> {
    const linhas = await this.chamar<{ id: number; foto: unknown }>('fotos_das_turmas');
    // Foto estranha (fora do site e do bucket) vira "sem foto", nunca imagem de outro endereço
    return new Map(linhas.map((l) => [l.id, fotoConfiavel(l.foto)]));
  }

  /** Turmas das edições novas, no formato do site (turma sem aluno também aparece) */
  async turmasDoBanco(): Promise<TurmaDoSite[]> {
    const linhas = await this.chamar<Record<string, unknown>>('turmas_do_site');
    return this.montarTurmas(
      linhas.map((l) => ({
        edicaoOrdem: Number(l.edicao_ordem),
        edicaoNome: String(l.edicao_nome ?? ''),
        encerrada: Boolean(l.encerrada),
        turmaId: Number(l.turma_id),
        turmaNome: String(l.turma_nome ?? ''),
        alunoNome: typeof l.aluno_nome === 'string' ? l.aluno_nome : null,
        foto: fotoConfiavel(l.foto),
      })),
    );
  }

  /**
   * Lista da página Turmas: as novas (do banco) e as do arquivo com a foto atual
   * do dashboard por cima. Com uma edição nova em andamento, a do arquivo deixa
   * de ser a "atual".
   */
  juntarTurmas(doArquivo: TurmaDoSite[], fotos: Map<number, string | null>, novas: TurmaDoSite[]): TurmaDoSite[] {
    const comFotos = !fotos.size
      ? doArquivo
      : doArquivo.map((turma) => ({
          ...turma,
          alunos: turma.alunos.map((aluno) =>
            !aluno.participanteId || !fotos.has(aluno.participanteId)
              ? aluno
              : { ...aluno, foto: fotos.get(aluno.participanteId) ?? undefined },
          ),
        }));
    const temAtualNoBanco = novas.some((t) => t.atual);
    return [...novas, ...(temAtualNoBanco ? comFotos.map((t) => ({ ...t, atual: false })) : comFotos)];
  }

  /** Instrutores da edição atual com o título da seção (null se não houver edição aberta com instrutor) */
  async equipeDaEdicaoAtual(): Promise<EquipeDaEdicao | null> {
    const linhas = await this.chamar<Record<string, unknown>>('equipe_da_edicao_atual');
    const instrutores = linhas.map((l) => ({
      edicaoOrdem: Number(l.edicao_ordem),
      edicaoNome: String(l.edicao_nome ?? ''),
      nome: String(l.nome ?? 'Instrutor'),
      foto: fotoConfiavel(l.foto),
      linkedin: typeof l.linkedin === 'string' && perfilLinkedinValido(l.linkedin) ? l.linkedin : null,
    }));
    if (!instrutores.length) return null;
    // O título segue o das edições anteriores: "EQUIPE — EDIÇÃO IV"
    return { titulo: `EQUIPE — EDIÇÃO ${this.numeroRomano(instrutores[0].edicaoOrdem)}`, instrutores };
  }

  /** Linhas do banco (uma por aluno) -> turmas no formato do site */
  private montarTurmas(linhas: AlunoDoBanco[]): TurmaDoSite[] {
    const porTurma = new Map<number, TurmaDoSite>();
    for (const l of linhas) {
      let turma = porTurma.get(l.turmaId);
      if (!turma) {
        turma = {
          slug: `edicao-${l.edicaoOrdem}-${this.paraSlug(l.turmaNome)}`,
          nome: l.turmaNome,
          edicao: `${l.edicaoOrdem}ª Edição`,
          // "Edição 4 (2026)" -> "2026"
          periodo: /\(([^)]+)\)/.exec(l.edicaoNome)?.[1] ?? '',
          atual: !l.encerrada,
          alunos: [],
        };
        porTurma.set(l.turmaId, turma);
      }
      if (l.alunoNome) turma.alunos.push({ nome: l.alunoNome, foto: l.foto ?? undefined });
    }
    return [...porTurma.values()];
  }

  /** "Turma 1" -> "turma-1" (sem acento, para a URL) */
  private paraSlug(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** 4 -> "IV" */
  private numeroRomano(numero: number): string {
    const valores: [number, string][] = [
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ];
    let resto = numero;
    let romano = '';
    for (const [valor, letras] of valores) {
      while (resto >= valor) {
        romano += letras;
        resto -= valor;
      }
    }
    return romano;
  }

  /** Chama uma função pública do banco; lista vazia se não der (a página segue com o arquivo) */
  private chamar<T>(funcao: string): Promise<T[]> {
    if (!URL_SUPABASE || !CHAVE_PUBLICAVEL_SUPABASE) return Promise.resolve([]);
    let busca = this.buscas.get(funcao);
    if (!busca) {
      busca = fetch(`${URL_SUPABASE}/rest/v1/rpc/${funcao}`, {
        method: 'POST',
        headers: {
          apikey: CHAVE_PUBLICAVEL_SUPABASE,
          Authorization: `Bearer ${CHAVE_PUBLICAVEL_SUPABASE}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
        .then((resposta) => (resposta.ok ? resposta.json() : Promise.reject(new Error(String(resposta.status)))))
        .then((linhas: unknown) => (Array.isArray(linhas) ? linhas : []))
        .catch((erro) => {
          console.error(`[site] ${funcao} indisponível; ficando com o arquivo`, erro?.message);
          this.buscas.delete(funcao); // na próxima página tenta de novo
          return [];
        });
      this.buscas.set(funcao, busca);
    }
    return busca as Promise<T[]>;
  }
}

export const servicoSitePublico = new ServicoSitePublico();
