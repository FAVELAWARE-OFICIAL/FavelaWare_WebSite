/**
 * ============================================
 * TURMAS
 * ============================================
 *
 * Listas de turmas (com a edição de cada uma) e o cadastro feito pelo gestor.
 * O professor só enxerga as turmas às quais foi vinculado: quem filtra é o
 * banco (RLS). O banco só aceita gravação de quem é gestor.
 */
import { mensagemDeErroDeCadastro } from './banco';
import { supabase } from './supabase';

/** Padrão do banco: "Turma Única", "Turma 1", "Turma 2"... ou "Turma A", "Turma B"... */
export const NOMES_DE_TURMA = [
  'Turma Única',
  'Turma 1',
  'Turma 2',
  'Turma 3',
  'Turma 4',
  'Turma A',
  'Turma B',
  'Turma C',
  'Turma D',
];

export interface TurmaComEdicao {
  id: number;
  nome: string;
  edicao: string;
  ordemEdicao: number;
  /** A edição já acabou: a chamada desta turma é só para consulta */
  edicaoEncerrada: boolean;
  /** Turma da edição de demonstração (só para o "Ver como") */
  demonstracao: boolean;
}

export interface TurmaComAlunos {
  id: number;
  nome: string;
  alunos: number;
}

/** Chave do cache (ver lib/cache.ts): o layout pré-carrega, as páginas leem */
export const chaveTurmas = (edicaoId: number) => `turmas:${edicaoId}`;

export class ServicoTurmas {
  /**
   * Turmas visíveis para quem está logado, da edição mais recente para a mais
   * antiga: a primeira da lista é a turma padrão. A edição de demonstração tem
   * ordem 0, então fica sempre no fim.
   */
  async carregarComEdicao(): Promise<TurmaComEdicao[]> {
    const { data, error } = await supabase
      .from('turmas')
      .select('id, nome, edicoes(nome, ordem, encerrada, demonstracao)');
    if (error) throw error;
    return data
      .map((t) => {
        // A relação muitos-para-um volta como objeto
        const edicao = t.edicoes as unknown as {
          nome: string;
          ordem: number;
          encerrada: boolean;
          demonstracao: boolean;
        } | null;
        return {
          id: t.id,
          nome: t.nome,
          edicao: edicao?.nome ?? '',
          ordemEdicao: edicao?.ordem ?? 0,
          edicaoEncerrada: edicao?.encerrada ?? false,
          demonstracao: edicao?.demonstracao ?? false,
        };
      })
      .sort((a, b) => b.ordemEdicao - a.ordemEdicao || a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  /** Turmas de uma edição e quantos alunos cada uma tem (a contagem é feita no banco) */
  async carregarDaEdicao(edicaoId: number): Promise<TurmaComAlunos[]> {
    const { data, error } = await supabase
      .from('turmas')
      .select('id, nome, participantes(count)')
      .eq('edicao_id', edicaoId)
      .order('nome');
    if (error) throw error;
    return data.map((t) => ({
      id: t.id,
      nome: t.nome,
      alunos: (t.participantes as unknown as { count: number }[])[0]?.count ?? 0,
    }));
  }

  async criar(edicaoId: number, nome: string): Promise<string | null> {
    const { error } = await supabase.from('turmas').insert({ edicao_id: edicaoId, nome });
    return error ? mensagemDeErroDeCadastro(error, 'Não foi possível criar a turma.') : null;
  }

  async renomear(id: number, nome: string): Promise<string | null> {
    const { error } = await supabase.from('turmas').update({ nome }).eq('id', id);
    return error ? mensagemDeErroDeCadastro(error, 'Não foi possível renomear a turma.') : null;
  }

  /** O banco só apaga turma sem alunos e sem aulas (senão o histórico iria junto) */
  async apagar(id: number): Promise<string | null> {
    const { data, error } = await supabase.from('turmas').delete().eq('id', id).select('id');
    if (error) return 'Não foi possível apagar a turma.';
    return data.length ? null : 'A turma tem alunos ou aulas registradas: só dá para apagar turma vazia.';
  }
}

export const servicoTurmas = new ServicoTurmas();
