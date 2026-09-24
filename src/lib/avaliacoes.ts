/**
 * ============================================
 * AVALIAÇÕES DO FIM DA EDIÇÃO
 * ============================================
 *
 * - Instrutores: nota 0 a 5 em três critérios para cada aluno da turma, a partir
 *   da data que o gestor define. Salvou, travou: o instrutor não edita nem vê mais.
 * - Banca avaliadora (apresentação final): o gestor cadastra os membros (nome,
 *   e-mail e organização). Quem é de fora recebe convite por e-mail e entra numa
 *   conta que só vê a avaliação; quem já tem conta (ex.: uma gestora) só é
 *   vinculado. Cada membro dá 0 a 5 em três critérios e só vê as próprias notas;
 *   quando todos concluem, aparece a lista final.
 * - Resultado (só gestor): média das somas dos instrutores (0 a 15) + soma da banca.
 * As regras e as contas ficam no banco (funções em 20261001101000); aqui só chama.
 */
import { CODIGO_REGRA_DO_BANCO, mensagemDaRegraDoBanco } from './banco';
import { servicoEquipe } from './equipe';
import { excecaoDeNegocio, excecaoDeSistema, StatusProcessamento, sucesso, type ResultadoOperacao } from '../types';
import { supabase } from './supabase';

/** Critério de uma planilha de avaliação */
export interface Criterio<C extends string> {
  chave: C;
  rotulo: string;
  detalhe: string;
}

export const CRITERIOS_INSTRUTOR: Criterio<'participacao' | 'entrega' | 'comportamento'>[] = [
  { chave: 'participacao', rotulo: 'Participação em sala', detalhe: 'Iniciativa / Proatividade' },
  { chave: 'entrega', rotulo: 'Entrega das atividades', detalhe: 'Organização e Qualidade' },
  { chave: 'comportamento', rotulo: 'Comportamento', detalhe: 'Contribuições e Trabalho em equipe' },
];
export const NOTA_MAXIMA_INSTRUTOR = 5;

/** Avisa a área do instrutor que ele salvou (o item "Avaliação" do menu some quando não falta nada) */
export const EVENTO_AVALIACAO_SALVA = 'avaliacao-salva';

export const CRITERIOS_BANCA: Criterio<'inovacao' | 'apresentacao' | 'aplicabilidade'>[] = [
  { chave: 'inovacao', rotulo: 'Inovação / Funcionalidade', detalhe: '' },
  { chave: 'apresentacao', rotulo: 'Qualidade da apresentação', detalhe: '' },
  { chave: 'aplicabilidade', rotulo: 'Aplicabilidade', detalhe: '' },
];
export const NOTA_MAXIMA_BANCA = 5;

export type NotasDoInstrutor = Record<(typeof CRITERIOS_INSTRUTOR)[number]['chave'], number | null> & {
  observacao: string;
};
export type NotasDaBanca = Record<(typeof CRITERIOS_BANCA)[number]['chave'], number | null>;

/** Soma das notas preenchidas (null = ainda sem nota) */
export const somaDasNotas = (notas: Record<string, number | null | string>, chaves: string[]) =>
  chaves.reduce((soma, c) => soma + (typeof notas[c] === 'number' ? (notas[c] as number) : 0), 0);

/** Todos os critérios com nota? */
export const notasCompletas = (notas: Record<string, number | null | string>, chaves: string[]) =>
  chaves.every((c) => typeof notas[c] === 'number');

export interface TurmaParaAvaliar {
  turma_id: number;
  turma_nome: string;
  edicao_nome: string;
  alunos: number;
}

export interface MembroDaBanca {
  id: number;
  perfil_id: string;
  nome: string;
  email: string;
  organizacao: string;
  concluida_em: string | null;
}

export interface LinhaDoResultado {
  participante_id: number;
  nome: string;
  foto: string | null;
  turma: string | null;
  nota_instrutores: number | null;
  instrutores_que_avaliaram: number;
  instrutores_da_turma: number;
  nota_banca: number | null;
  membros_que_avaliaram: number;
  total: number;
}

/** Quem avaliou cada turma (instrutores vinculados e se já salvaram) */
export interface SituacaoDosInstrutores {
  turmaId: number;
  turma: string;
  instrutores: { id: string; nome: string; avaliou: boolean }[];
}

/** Painel do gestor numa edição */
export interface PainelDeAvaliacoes {
  /** Prazo dos instrutores (início e fim) */
  liberadaEm: string | null;
  liberadaAte: string | null;
  /** Dia da banca (apresentação final): só nesse dia a banca dá nota */
  bancaEm: string | null;
  instrutores: SituacaoDosInstrutores[];
  banca: (MembroDaBanca & { avaliados: number })[];
  alunos: number;
}

export const chaveAvaliacoes = (edicaoId: number) => `avaliacoes:${edicaoId}`;

/** Código que o banco usa para quem não está na banca */
const FORA_DA_BANCA = '42501';
export const CHAVE_AVALIACOES_PENDENTES = 'avaliacoes:pendentes';

export class ServicoAvaliacoes {
  // ---------- Instrutor ----------

  /** Turmas que o instrutor ainda precisa avaliar */
  async pendentesDoInstrutor(): Promise<TurmaParaAvaliar[]> {
    const { data, error } = await supabase.rpc('minhas_avaliacoes_pendentes');
    if (error) throw error;
    return data as TurmaParaAvaliar[];
  }

  /** Alunos da turma que o instrutor ainda não avaliou (os de quem entrou depois também) */
  async alunosParaAvaliar(turmaId: number): Promise<{ id: number; nome: string; foto: string | null }[]> {
    const { data, error } = await supabase.rpc('alunos_para_avaliar', { p_turma_id: turmaId });
    if (error) throw error;
    return data as { id: number; nome: string; foto: string | null }[];
  }

  /** Grava a turma inteira de uma vez (depois não edita) */
  async salvarDaTurma(turmaId: number, notas: Map<number, NotasDoInstrutor>): Promise<ResultadoOperacao> {
    const chaves = CRITERIOS_INSTRUTOR.map((c) => c.chave);
    if ([...notas.values()].some((n) => !notasCompletas(n, chaves))) {
      return excecaoDeNegocio('Dê as três notas a todos os alunos antes de salvar.');
    }
    const { error } = await supabase.rpc('salvar_avaliacao_da_turma', {
      p_turma_id: turmaId,
      p_notas: [...notas.entries()].map(([participante_id, n]) => ({ participante_id, ...n })),
    });
    if (!error) {
      window.dispatchEvent(new Event(EVENTO_AVALIACAO_SALVA));
      return sucesso();
    }
    console.error('[avaliações] falha ao salvar a turma', error.code);
    return excecaoDeNegocio(mensagemDaRegraDoBanco(error, 'Não foi possível salvar a avaliação. Tente de novo.'));
  }

  // ---------- Gestor ----------

  async carregarPainel(edicaoId: number): Promise<PainelDeAvaliacoes> {
    const [edicao, turmas, vinculos, avaliadas, membros, notas, alunos] = await Promise.all([
      supabase
        .from('edicoes')
        .select('avaliacao_instrutores_em, avaliacao_instrutores_ate, banca_em, demonstracao')
        .eq('id', edicaoId)
        .single(),
      supabase.from('turmas').select('id, nome').eq('edicao_id', edicaoId).order('nome'),
      supabase
        .from('professores_turmas')
        .select('turma_id, professor_id, perfis(nome, papel, pode_alternar_papel), turmas!inner(edicao_id)')
        .eq('turmas.edicao_id', edicaoId),
      supabase
        .from('avaliacoes_instrutor')
        .select('turma_id, professor_id, turmas!inner(edicao_id)')
        .eq('turmas.edicao_id', edicaoId),
      supabase
        .from('membros_banca')
        .select('id, perfil_id, nome, email, organizacao, concluida_em')
        .eq('edicao_id', edicaoId)
        .order('criado_em'),
      supabase
        .from('notas_banca')
        .select('membro_id, membros_banca!inner(edicao_id)')
        .eq('membros_banca.edicao_id', edicaoId),
      supabase
        .from('participantes')
        .select('id', { count: 'exact', head: true })
        .eq('edicao_id', edicaoId)
        .eq('funcao', 'aluno'),
    ]);
    for (const r of [edicao, turmas, vinculos, avaliadas, membros, notas, alunos]) if (r.error) throw r.error;

    const jaAvaliou = new Set(avaliadas.data!.map((a) => `${a.turma_id}:${a.professor_id}`));
    const instrutores = turmas.data!.map((t) => ({
      turmaId: t.id,
      turma: t.nome,
      instrutores: vinculos
        .data!.filter((v) => v.turma_id === t.id)
        .map((v) => {
          const perfil = v.perfis as unknown as {
            nome: string | null;
            papel: string;
            pode_alternar_papel: boolean;
          } | null;
          // Conta do "Ver como" só avalia na demonstração: fora dela não conta como instrutor
          const avalia = perfil?.papel === 'professor' && (!perfil.pode_alternar_papel || edicao.data!.demonstracao);
          return { id: v.professor_id, nome: perfil?.nome ?? 'Instrutor', avalia };
        })
        .filter((v) => v.avalia)
        .map(({ id, nome }) => ({ id, nome, avaliou: jaAvaliou.has(`${t.id}:${id}`) })),
    }));
    const avaliadosPorMembro = new Map<number, number>();
    for (const n of notas.data!) avaliadosPorMembro.set(n.membro_id, (avaliadosPorMembro.get(n.membro_id) ?? 0) + 1);

    return {
      liberadaEm: edicao.data!.avaliacao_instrutores_em,
      liberadaAte: edicao.data!.avaliacao_instrutores_ate,
      bancaEm: edicao.data!.banca_em,
      instrutores,
      banca: (membros.data as MembroDaBanca[]).map((m) => ({ ...m, avaliados: avaliadosPorMembro.get(m.id) ?? 0 })),
      alunos: alunos.count ?? 0,
    };
  }

  /**
   * Prazos da edição: início e fim da avaliação dos instrutores, ou o dia da banca
   * (null = sem data). Grava só o que veio, para um cartão não salvar o do outro.
   * O banco confere que o fim não vem antes do início.
   */
  async definirPrazos(
    edicaoId: number,
    prazos: { inicio: string | null; fim: string | null } | { banca: string | null },
  ): Promise<string | null> {
    const colunas =
      'banca' in prazos
        ? { banca_em: prazos.banca }
        : { avaliacao_instrutores_em: prazos.inicio, avaliacao_instrutores_ate: prazos.fim };
    if ('inicio' in prazos && prazos.inicio && prazos.fim && prazos.fim < prazos.inicio) {
      return 'O fim do prazo vem antes do início.';
    }
    const { data, error } = await supabase.from('edicoes').update(colunas).eq('id', edicaoId).select('id');
    // Sem erro e sem linha: a RLS recusou (quem salvou não é gestor)
    if (!error && data.length) return null;
    if (!error) return 'Só a coordenação define as datas.';
    console.error('[avaliações] falha ao salvar os prazos', error.code);
    return mensagemDaRegraDoBanco(error, 'Não foi possível salvar as datas.');
  }

  /**
   * Põe a pessoa na banca: convida por e-mail quem é de fora (conta "banca") e
   * só vincula quem já tem conta. Devolve se o convite foi enviado.
   */
  async cadastrarMembro(
    edicaoId: number,
    campos: { nome: string; email: string; organizacao: string },
  ): Promise<{ erro: string | null; convidado?: boolean }> {
    const nome = campos.nome.trim();
    const email = campos.email.trim().toLowerCase();
    if (!nome || !email || !campos.organizacao.trim()) return { erro: 'Informe o nome, o e-mail e a organização.' };
    const conta = await servicoEquipe.convidar(nome, email, [], 'banca');
    if (conta.resultado.status !== StatusProcessamento.Sucesso || !conta.contaId) {
      return { erro: conta.resultado.mensagem ?? 'Não foi possível convidar.' };
    }
    // O e-mail gravado na banca o banco tira da própria conta
    const { error } = await supabase.rpc('cadastrar_membro_banca', {
      p_edicao: edicaoId,
      p_perfil: conta.contaId,
      p_nome: nome,
      p_organizacao: campos.organizacao,
    });
    if (error) {
      console.error('[avaliações] falha ao pôr na banca', error.code);
      return { erro: mensagemDaRegraDoBanco(error, 'Não foi possível pôr a pessoa na banca.') };
    }
    return { erro: null, convidado: conta.convidado };
  }

  /** Tira o membro da banca (as notas dele saem junto) */
  async excluirMembro(membroId: number): Promise<string | null> {
    const { error } = await supabase.from('membros_banca').delete().eq('id', membroId);
    if (!error) return null;
    console.error('[avaliações] falha ao tirar da banca', error.code);
    return mensagemDaRegraDoBanco(error, 'Não foi possível tirar o membro da banca.');
  }

  async carregarResultado(edicaoId: number): Promise<LinhaDoResultado[]> {
    const { data, error } = await supabase.rpc('resultado_das_avaliacoes', { p_edicao: edicaoId });
    if (error) throw error;
    return data as LinhaDoResultado[];
  }

  // ---------- Membro da banca (logado) ----------

  /** Está na banca de alguma edição? (mostra o acesso à avaliação) */
  async souDaBanca(): Promise<boolean> {
    const { data, error } = await supabase.rpc('sou_da_banca');
    if (error) throw error;
    return Boolean(data);
  }

  async abrirDaBanca(): Promise<{ resultado: ResultadoOperacao; dados?: AvaliacaoDaBanca }> {
    const { data, error } = await supabase.rpc('avaliacao_da_banca');
    if (!error) return { resultado: sucesso(), dados: data as AvaliacaoDaBanca };
    return { resultado: await this.erroDaBanca(error, 'Não foi possível abrir a avaliação.') };
  }

  async salvarNotaDaBanca(participanteId: number, notas: NotasDaBanca): Promise<ResultadoOperacao> {
    const { error } = await supabase.rpc('salvar_nota_da_banca', {
      p_participante: participanteId,
      p_inovacao: notas.inovacao,
      p_apresentacao: notas.apresentacao,
      p_aplicabilidade: notas.aplicabilidade,
    });
    return error ? this.erroDaBanca(error, 'Não foi possível salvar a nota. Tente de novo.') : sucesso();
  }

  async concluirDaBanca(): Promise<ResultadoOperacao> {
    const { error } = await supabase.rpc('concluir_avaliacao_da_banca');
    return error ? this.erroDaBanca(error, 'Não foi possível concluir. Tente de novo.') : sucesso();
  }

  /**
   * Fora da banca (42501) ou regra do banco (22023, ex.: falta aluno): o texto do
   * banco vai para a tela. O resto é falha técnica.
   */
  private erroDaBanca(error: { code?: string; message?: string }, padrao: string): ResultadoOperacao {
    console.error('[banca] falha', error.code);
    if ((error.code === FORA_DA_BANCA || error.code === CODIGO_REGRA_DO_BANCO) && error.message) {
      return excecaoDeNegocio(error.message);
    }
    return excecaoDeSistema(padrao);
  }
}

/** O que o membro da banca vê */
export type AvaliacaoDaBanca =
  | {
      completa: true;
      membro: { nome: string; organizacao: string };
      edicao: string;
      ranking: { nome: string; turma: string | null; foto: string | null; total: number }[];
    }
  | {
      completa: false;
      membro: { nome: string; organizacao: string };
      edicao: string;
      encerrada: boolean;
      concluida: boolean;
      /** Dia da banca (aaaa-mm-dd) e se hoje é esse dia */
      dia: string | null;
      hoje_e_o_dia: boolean;
      alunos: ({ id: number; nome: string; turma: string | null; foto: string | null } & NotasDaBanca)[];
    };

export const servicoAvaliacoes = new ServicoAvaliacoes();
