/**
 * ============================================
 * SOLICITAÇÕES DOS ALUNOS
 * ============================================
 *
 * Pedidos de mudança de turno, de turma ou outro assunto, e a resposta do gestor.
 * O banco só aceita a resposta de quem é gestor (RLS).
 */
import { vazioViraNulo } from '../utils/texto';
import { servicoSessao } from './sessao';
import { supabase } from './supabase';

export type TipoSolicitacao = 'mudanca_turno' | 'mudanca_turma' | 'outro';
export type StatusSolicitacao = 'pendente' | 'aprovada' | 'recusada';

export const TIPOS_SOLICITACAO: Record<TipoSolicitacao, string> = {
  mudanca_turno: 'Mudança de turno',
  mudanca_turma: 'Mudança de turma',
  outro: 'Outro assunto',
};

export interface Solicitacao {
  id: number;
  participante_id: number;
  tipo: TipoSolicitacao;
  descricao: string;
  status: StatusSolicitacao;
  resposta: string | null;
  criada_em: string;
  resolvida_em: string | null;
}

/** Chave do cache (ver lib/cache.ts): o layout pré-carrega, a página lê */
export const chaveSolicitacoes = (edicaoId: number) => `solicitacoes:${edicaoId}`;

export class ServicoSolicitacoes {
  /** Solicitações dos alunos de uma edição (filtradas pela edição no próprio banco) */
  async carregar(edicaoId: number): Promise<Solicitacao[]> {
    const { data, error } = await supabase
      .from('solicitacoes')
      .select('id, participante_id, tipo, descricao, status, resposta, criada_em, resolvida_em, participantes!inner()')
      .eq('participantes.edicao_id', edicaoId)
      .order('criada_em', { ascending: false });
    if (error) throw error;
    return data as Solicitacao[];
  }

  async registrar(participanteId: number, tipo: TipoSolicitacao, descricao: string): Promise<string | null> {
    const { error } = await supabase
      .from('solicitacoes')
      .insert({ participante_id: participanteId, tipo, descricao: descricao.trim() });
    return error ? 'Não foi possível registrar a solicitação.' : null;
  }

  async responder(id: number, status: StatusSolicitacao, resposta: string): Promise<string | null> {
    const gestor = await servicoSessao.contaConferida();
    const pendente = status === 'pendente';
    const { error } = await supabase
      .from('solicitacoes')
      .update({
        status,
        resposta: vazioViraNulo(resposta),
        resolvida_em: pendente ? null : new Date().toISOString(),
        resolvida_por: pendente ? null : (gestor?.id ?? null),
      })
      .eq('id', id);
    return error ? 'Não foi possível atualizar a solicitação.' : null;
  }
}

export const servicoSolicitacoes = new ServicoSolicitacoes();
