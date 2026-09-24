/**
 * ============================================
 * ALUNOS (CADASTRO DO GESTOR)
 * ============================================
 *
 * Cadastro, edição e remoção de alunos de uma edição. A foto de cada um fica
 * com servicoFotoPadronizada. O banco só aceita gravação de quem é gestor (RLS).
 */
import { vazioViraNulo } from '../utils/texto';
import { CODIGO_REGRA_DO_BANCO, mensagemDeErroDeCadastro } from './banco';
import { supabase } from './supabase';

export interface DadosDoAluno {
  nome: string;
  login: string;
  turma_id: number;
  observacao: string;
  foto: string | null;
}

export class ServicoAlunos {
  async salvar(edicaoId: number, dados: DadosDoAluno, id?: number): Promise<string | null> {
    const campos = {
      nome: dados.nome.trim(),
      login: vazioViraNulo(dados.login),
      turma_id: dados.turma_id,
      observacao: vazioViraNulo(dados.observacao),
      foto: dados.foto,
    };
    const { error } = id
      ? await supabase.from('participantes').update(campos).eq('id', id)
      : await supabase.from('participantes').insert({ ...campos, edicao_id: edicaoId, funcao: 'aluno' });
    return error ? mensagemDeErroDeCadastro(error, 'Não foi possível salvar o aluno.') : null;
  }

  /** Remove o aluno e TODO o histórico de presença dele */
  async remover(id: number): Promise<string | null> {
    const { error } = await supabase.from('participantes').delete().eq('id', id);
    if (!error) return null;
    console.error('[alunos] falha ao remover', error.code, error.message);
    // 22023: a presença do aluno é de uma edição encerrada (o banco protege o histórico)
    return error.code === CODIGO_REGRA_DO_BANCO
      ? 'Esta edição foi encerrada: o aluno e o histórico de presença dele não podem mais ser removidos.'
      : 'Não foi possível remover o aluno.';
  }
}

export const servicoAlunos = new ServicoAlunos();
