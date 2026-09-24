/**
 * ============================================
 * ATIVIDADES (CRIAÇÃO E CORREÇÃO)
 * ============================================
 *
 * - Professor da turma e gestor criam a atividade (turma + trilha + prazo).
 * - O aluno entrega com link, texto e/ou arquivo (ver lib/entregas.ts).
 * - O professor responde com feedback, nota (0 a 100) e "Concluída" ou "Refazer";
 *   no "Refazer" o aluno envia de novo (2ª tentativa...).
 *
 * As regras (quem vê, quem envia, prazo, numeração, quem avaliou) ficam no banco:
 * migration 20260925110000_atividades.sql. Aqui só se lê, grava e resume.
 */
import { CODIGO_REGRA_DO_BANCO, codigoDoErro, mensagemDaRegraDoBanco } from './banco';
import type { RegrasDeEntrega } from './entregas';
import { servicoSessao } from './sessao';
import { supabase } from './supabase';
import { servicoTurmas, type TurmaComEdicao } from './turmas';

export type StatusTentativa = 'aguardando' | 'concluida' | 'refazer';

export interface Tentativa {
  id: number;
  participante_id: number;
  numero: number;
  comentario: string | null;
  link: string | null;
  /** Arquivo antigo, no Storage do Supabase */
  arquivo_caminho: string | null;
  arquivo_nome: string | null;
  /** Arquivo no Google Drive (o nome para o download vem junto) */
  arquivo_id: string | null;
  arquivo: { nome: string } | null;
  enviada_em: string;
  status: StatusTentativa;
  feedback: string | null;
  nota: number | null;
  avaliada_em: string | null;
  avaliada_por_nome: string | null;
}

export interface Atividade extends RegrasDeEntrega {
  id: number;
  turma_id: number;
  trilha_id: number;
  titulo: string;
  enunciado: string;
  prazo: string;
  trilha: { nome: string; ordem: number } | null;
  tentativas: Tentativa[];
}

export interface AlunoDaTurma {
  id: number;
  nome: string;
}

export interface AtividadesDaTurma {
  alunos: AlunoDaTurma[];
  atividades: Atividade[];
}

export interface AtividadesDoAluno {
  participanteId: number | null;
  /**
   * Reserva do "Ver como aluno": hoje a conta vira o aluno da turma de
   * demonstração; este modo só vale se a demonstração não existir.
   * "Ver como aluno" (conta que alterna papéis, sem aluno ligado): recebe as
   * atividades e a lista de turmas; a tela mostra uma turma como o aluno vê, e o
   * envio não é gravado.
   */
  visualizacao: boolean;
  turmas: TurmaComEdicao[];
  atividades: Atividade[];
}

export interface DadosDaAtividade extends RegrasDeEntrega {
  trilha_id: number;
  titulo: string;
  enunciado: string;
  /** ISO */
  prazo: string;
}

const COLUNAS_TENTATIVA =
  'id, participante_id, numero, comentario, link, arquivo_caminho, arquivo_nome, arquivo_id, arquivo:arquivos_entrega(nome), enviada_em, status, feedback, nota, avaliada_em, avaliada_por_nome';
const COLUNAS_ATIVIDADE = `id, turma_id, trilha_id, titulo, enunciado, prazo, exige_texto, exige_link, tipo_link, exige_arquivo, formatos, trilha:trilhas(nome, ordem), tentativas(${COLUNAS_TENTATIVA})`;

/** Chaves do cache (ver lib/cache.ts) */
export const CHAVE_ATIVIDADES_ALUNO = 'atividades:aluno';
export const chaveAtividadesDaTurma = (turmaId: number) => `atividades:turma:${turmaId}`;

// ============================================
// SITUAÇÃO E RESUMO (contas sobre os dados já carregados)
// ============================================
export type Situacao = 'pendente' | 'aguardando' | 'refazer' | 'concluida' | 'encerrada';

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  pendente: 'Pendente',
  aguardando: 'Aguardando correção',
  refazer: 'Refazer',
  concluida: 'Concluída',
  encerrada: 'Prazo encerrado',
};

/** O prazo da atividade já passou? */
const prazoEncerrado = (prazo: string) => new Date(prazo) < new Date();

/** Tentativas de um aluno numa atividade, da 1ª à última */
export const tentativasDe = (atividade: Atividade, participanteId: number) =>
  atividade.tentativas.filter((t) => t.participante_id === participanteId);

export function situacaoDoAluno(tentativas: Tentativa[], prazo: string): Situacao {
  const ultima = tentativas[tentativas.length - 1];
  if (!ultima) return prazoEncerrado(prazo) ? 'encerrada' : 'pendente';
  return ultima.status;
}

/** O aluno ainda pode enviar? (1º envio até o prazo; depois de "Refazer", sempre) */
export const podeEnviar = (situacao: Situacao) => situacao === 'pendente' || situacao === 'refazer';

/** Resumo da atividade só com quem está na turma: entregas para corrigir, quem entregou e o prazo */
export function resumoNaTurma(atividade: Atividade, idsDosAlunos: Set<number>) {
  const daTurma = atividade.tentativas.filter((t) => idsDosAlunos.has(t.participante_id));
  return {
    aguardando: daTurma.filter((t) => t.status === 'aguardando').length,
    entregaram: new Set(daTurma.map((t) => t.participante_id)).size,
    encerrada: prazoEncerrado(atividade.prazo),
  };
}

/** Entregas esperando correção num conjunto de atividades (só de quem está na turma) */
export const paraCorrigir = (atividades: Atividade[], idsDosAlunos: Set<number>) =>
  atividades.reduce((total, a) => total + resumoNaTurma(a, idsDosAlunos).aguardando, 0);

function arrumar(atividades: Atividade[]): Atividade[] {
  return atividades
    .map((a) => ({ ...a, tentativas: [...a.tentativas].sort((x, y) => x.numero - y.numero) }))
    .sort((a, b) => a.prazo.localeCompare(b.prazo));
}

export class ServicoAtividades {
  /**
   * Aluno: atividades da turma dele, com as tentativas dele (o banco só devolve as dele).
   * Visualização ("ver como aluno"): atividades de todas as turmas e a lista de turmas.
   */
  async carregarDoAluno(): Promise<AtividadesDoAluno> {
    const { perfil } = await servicoSessao.exigirContaLogada();

    const visualizacao = !perfil.participanteId && perfil.podeAlternarPapel;
    if (!perfil.participanteId && !visualizacao) {
      return { participanteId: null, visualizacao: false, turmas: [], atividades: [] };
    }

    const [atividades, turmas] = await Promise.all([
      supabase.from('atividades').select(COLUNAS_ATIVIDADE),
      visualizacao ? servicoTurmas.carregarComEdicao() : Promise.resolve([]),
    ]);
    if (atividades.error) throw atividades.error;
    return {
      participanteId: perfil.participanteId,
      visualizacao,
      turmas,
      atividades: arrumar(atividades.data as unknown as Atividade[]),
    };
  }

  async carregarDaTurma(turmaId: number): Promise<AtividadesDaTurma> {
    const [alunos, atividades] = await Promise.all([
      supabase.from('participantes').select('id, nome').eq('turma_id', turmaId).eq('funcao', 'aluno').order('nome'),
      supabase.from('atividades').select(COLUNAS_ATIVIDADE).eq('turma_id', turmaId),
    ]);
    if (alunos.error) throw alunos.error;
    if (atividades.error) throw atividades.error;
    return { alunos: alunos.data, atividades: arrumar(atividades.data as unknown as Atividade[]) };
  }

  /** Cria (com turma) ou edita (com id). Devolve null se deu certo, ou o texto do erro. */
  async salvar(dados: DadosDaAtividade, alvo: { turmaId: number } | { id: number }): Promise<string | null> {
    const campos = { ...dados, titulo: dados.titulo.trim(), enunciado: dados.enunciado.trim() };
    const { error } =
      'id' in alvo
        ? await supabase.from('atividades').update(campos).eq('id', alvo.id)
        : await supabase.from('atividades').insert({ ...campos, turma_id: alvo.turmaId });
    if (!error) return null;
    console.error('[atividades] falha ao salvar a atividade', error.code);
    if (error.code === CODIGO_REGRA_DO_BANCO) return 'O prazo precisa ser depois de agora.';
    if (error.code === '23514') return 'Confira os campos: título até 120 letras e enunciado preenchido.';
    return 'Não foi possível salvar a atividade.';
  }

  /** Só apaga atividade sem entregas (o banco confere). Devolve null se apagou. */
  async apagar(id: number): Promise<string | null> {
    const { data, error } = await supabase.from('atividades').delete().eq('id', id).select('id');
    if (error) {
      console.error('[atividades] falha ao apagar', error.code);
      return 'Não foi possível apagar a atividade.';
    }
    return data.length ? null : 'Esta atividade já tem entregas e não pode ser apagada.';
  }

  /**
   * Responde a última tentativa do aluno, com a nota como foi digitada ("" = sem nota).
   * Devolve null se deu certo, ou o texto do erro.
   */
  async avaliar(
    tentativaId: number,
    avaliacao: { status: 'concluida' | 'refazer'; feedback: string; notaDigitada: string },
  ): Promise<string | null> {
    const nota = avaliacao.notaDigitada.trim() === '' ? null : Number(avaliacao.notaDigitada);
    if (nota !== null && (!Number.isInteger(nota) || nota < 0 || nota > 100)) {
      return 'A nota vai de 0 a 100, sem vírgula.';
    }
    if (!avaliacao.feedback.trim()) return 'Escreva o feedback para o aluno.';
    if (avaliacao.status === 'concluida' && nota === null) return 'Dê a nota (0 a 100) para concluir.';
    const { data, error } = await supabase
      .from('tentativas')
      .update({ status: avaliacao.status, feedback: avaliacao.feedback.trim(), nota })
      .eq('id', tentativaId)
      .select('id');
    if (error) {
      console.error('[atividades] falha ao avaliar', codigoDoErro(error));
      return mensagemDaRegraDoBanco(error, 'Não foi possível salvar a correção.');
    }
    return data.length ? null : 'Você não pode corrigir esta entrega.';
  }
}

export const servicoAtividades = new ServicoAtividades();
