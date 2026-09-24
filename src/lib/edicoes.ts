/**
 * ============================================
 * EDIÇÕES DO CURSO
 * ============================================
 *
 * Lista de edições (1ª, 2ª, 3ª...) e o cadastro feito pelo gestor.
 * O banco só aceita gravação de quem é gestor (RLS).
 */
import { mensagemDeErroDeCadastro, proximaOrdem } from './banco';
import { supabase } from './supabase';

export interface Edicao {
  id: number;
  nome: string;
  total_alunos_informado: number | null;
  aprovados_informado: number | null;
  desistentes_informado: number | null;
  /** Edição de demonstração (teste do "Ver como"); não é uma edição real */
  demonstracao: boolean;
  /** Edição que já acabou: a presença não muda mais (o banco recusa) */
  encerrada: boolean;
}

export class ServicoEdicoes {
  async carregar(): Promise<Edicao[]> {
    const { data, error } = await supabase
      .from('edicoes')
      .select('id, nome, total_alunos_informado, aprovados_informado, desistentes_informado, demonstracao, encerrada')
      .order('ordem');
    if (error) throw error;
    return data;
  }

  /** Cria a edição depois da última e devolve o id dela */
  async criar(nome: string): Promise<{ erro: string | null; id?: number }> {
    const ordem = await proximaOrdem('edicoes');
    if (ordem === null) return { erro: 'Não foi possível criar a edição.' };
    const { data, error } = await supabase.from('edicoes').insert({ nome, ordem }).select('id').single();
    return error
      ? { erro: mensagemDeErroDeCadastro(error, 'Não foi possível criar a edição.') }
      : { erro: null, id: data.id };
  }

  /** Encerra a edição: a chamada fica só para consulta. Pelo site não reabre. */
  async encerrar(id: number): Promise<string | null> {
    const { error } = await supabase.from('edicoes').update({ encerrada: true }).eq('id', id);
    if (!error) return null;
    console.error('[edições] falha ao encerrar', error.code, error.message);
    return 'Não foi possível encerrar a edição.';
  }

  async renomear(id: number, nome: string): Promise<string | null> {
    const { error } = await supabase.from('edicoes').update({ nome }).eq('id', id);
    return error ? mensagemDeErroDeCadastro(error, 'Não foi possível renomear a edição.') : null;
  }
}

export const servicoEdicoes = new ServicoEdicoes();
