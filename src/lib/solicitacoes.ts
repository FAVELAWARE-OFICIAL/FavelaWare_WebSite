/**
 * ============================================
 * SOLICITAÇÕES DOS ALUNOS (CONVERSA)
 * ============================================
 *
 * O aluno pede o que precisa e conversa com a coordenação até a devolutiva:
 * - aluno: abre o pedido (tipo escrito por ele) e troca mensagens na conversa;
 * - gestor: vê os pedidos de todas as edições, conversa (pode pedir mais
 *   informação) e conclui (aprova ou recusa) com a devolutiva.
 * O parceiro não participa das solicitações.
 * Status: aberta (pendente) -> em andamento -> concluída (aprovada ou recusada).
 * Quem pode ler e escrever o quê é conferido no banco (RLS e funções).
 */
import { vazioViraNulo } from '../utils/texto';
import { mensagemDaRegraDoBanco } from './banco';
import { servicoSessao, type Papel } from './sessao';
import { supabase } from './supabase';

/** pendente = aberta; em_andamento = a coordenação está cuidando; aprovada/recusada = concluída */
export type StatusSolicitacao = 'pendente' | 'em_andamento' | 'aprovada' | 'recusada';

/** Os mesmos limites do banco */
export const TAMANHO_MAXIMO_TIPO = 80;
export const TAMANHO_MAXIMO_TEXTO = 2000;

export interface Solicitacao {
  id: number;
  participante_id: number;
  /** Escrito pelo aluno (ex.: "Mudança de turno") */
  tipo: string;
  descricao: string;
  status: StatusSolicitacao;
  /** Devolutiva final, dada ao concluir */
  resposta: string | null;
  criada_em: string;
  resolvida_em: string | null;
  /** Nome de quem concluiu (o banco manda pronto: o aluno não lê o perfil da equipe) */
  respondida_por: string | null;
  /** Nome e foto do aluno (a primeira fala da conversa) */
  aluno: string;
  foto: string | null;
}

/** Como o gestor vê: com a edição (a lista junta todas) e o id de quem concluiu */
export interface SolicitacaoDaEquipe extends Solicitacao {
  edicao: string;
  respondida_por_id: string | null;
}

export interface MensagemDaSolicitacao {
  id: number;
  solicitacao_id: number;
  autor_id: string | null;
  autor_papel: Papel;
  autor_nome: string | null;
  autor_foto: string | null;
  texto: string;
  criada_em: string;
}

/** Chaves do cache (ver lib/cache.ts): o layout pré-carrega, a página lê */
export const CHAVE_SOLICITACOES = 'solicitacoes:equipe';
export const CHAVE_MINHAS_SOLICITACOES = 'solicitacoes:minhas';

export class ServicoSolicitacoes {
  /** Ainda sem devolutiva: aberta ou em andamento */
  emAberto(solicitacao: Pick<Solicitacao, 'status'>): boolean {
    return solicitacao.status === 'pendente' || solicitacao.status === 'em_andamento';
  }

  /** Gestor: as de todas as edições, da mais nova para a mais antiga */
  async carregar(): Promise<SolicitacaoDaEquipe[]> {
    const { data, error } = await supabase.rpc('solicitacoes_da_equipe');
    if (error) throw error;
    return data as SolicitacaoDaEquipe[];
  }

  /** Aluno: as próprias solicitações, com o nome de quem respondeu */
  async carregarMinhas(): Promise<Solicitacao[]> {
    const { data, error } = await supabase.rpc('minhas_solicitacoes');
    if (error) throw error;
    return data as Solicitacao[];
  }

  /** Aluno: abre uma solicitação em nome dele (nasce aberta) */
  async enviarMinha(tipo: string, descricao: string): Promise<string | null> {
    if (!tipo.trim()) return 'Escreva o tipo do pedido.';
    if (tipo.trim().length > TAMANHO_MAXIMO_TIPO) return `O tipo passa de ${TAMANHO_MAXIMO_TIPO} caracteres.`;
    if (!descricao.trim()) return 'Descreva o que você precisa.';
    const logada = await servicoSessao.contaLogada().catch((erro) => {
      console.error('[solicitações] não conferiu a sessão', erro?.message);
      return undefined;
    });
    if (logada === undefined) return 'Não foi possível conferir sua conta agora. Tente de novo.';
    if (!logada) return 'Sua sessão acabou. Entre de novo para enviar.';
    const { perfil } = logada;
    if (!perfil.participanteId) return 'Sua conta não está ligada a uma turma. Fale com a coordenação.';
    const { error } = await supabase
      .from('solicitacoes')
      .insert({ participante_id: perfil.participanteId, tipo: tipo.trim(), descricao: descricao.trim() });
    return this.mensagemDoErro(error, 'Não foi possível enviar a solicitação. Tente de novo.');
  }

  /**
   * Gestor: move entre aberta e em andamento, sem concluir. Só mexe em pedido
   * ainda aberto: com a tela desatualizada, nunca desfaz uma conclusão.
   */
  async mover(id: number, status: 'pendente' | 'em_andamento'): Promise<string | null> {
    const { data, error } = await supabase
      .from('solicitacoes')
      .update({ status })
      .eq('id', id)
      .in('status', ['pendente', 'em_andamento'])
      .select('id');
    if (error) return this.mensagemDoErro(error, 'Não foi possível mover a solicitação.');
    return data.length ? null : 'Esta solicitação já foi concluída. Atualize a lista.';
  }

  /** Gestor: conclui com a devolutiva (aprovada/recusada) ou reabre (pendente). Quem e quando, o banco carimba */
  async responder(id: number, status: StatusSolicitacao, resposta: string): Promise<string | null> {
    const { error } = await supabase
      .from('solicitacoes')
      .update({ status, resposta: vazioViraNulo(resposta) })
      .eq('id', id);
    return this.mensagemDoErro(error, 'Não foi possível atualizar a solicitação.');
  }

  /** Mensagens da conversa, em ordem */
  async carregarMensagens(solicitacaoId: number): Promise<MensagemDaSolicitacao[]> {
    const { data, error } = await supabase
      .from('mensagens_solicitacao')
      .select('id, solicitacao_id, autor_id, autor_papel, autor_nome, autor_foto, texto, criada_em')
      .eq('solicitacao_id', solicitacaoId)
      .order('criada_em');
    if (error) throw error;
    return data as MensagemDaSolicitacao[];
  }

  /**
   * Escreve na conversa (a coordenação ou o aluno dono do pedido). Mensagem da
   * coordenação num pedido aberto já inicia o atendimento (o banco muda o status).
   */
  async enviarMensagem(solicitacaoId: number, texto: string): Promise<string | null> {
    if (!texto.trim()) return 'Escreva a mensagem.';
    if (texto.trim().length > TAMANHO_MAXIMO_TEXTO) return `A mensagem passa de ${TAMANHO_MAXIMO_TEXTO} caracteres.`;
    const { error } = await supabase
      .from('mensagens_solicitacao')
      .insert({ solicitacao_id: solicitacaoId, texto: texto.trim() });
    if (error?.code === '42501') return 'Esta conversa não recebe mais mensagens por aqui.';
    return this.mensagemDoErro(error, 'Não foi possível enviar a mensagem. Tente de novo.');
  }

  /** Recusa por regra do banco (ex.: edição encerrada) tem texto pronto; o resto, o padrão */
  private mensagemDoErro(erro: { code?: string; message?: string } | null, padrao: string): string | null {
    if (!erro) return null;
    console.error('[solicitações] falha ao gravar', erro.code);
    return mensagemDaRegraDoBanco(erro, padrao);
  }
}

export const servicoSolicitacoes = new ServicoSolicitacoes();
