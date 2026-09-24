/**
 * ============================================
 * EQUIPE (PROFESSORES) — ÁREA DO GESTOR
 * ============================================
 *
 * Cadastro de professores e vínculo com as turmas.
 * - Cadastrar exige a chave secreta do Supabase (criar conta + mandar convite),
 *   então passa pela Edge Function "convidar-professor", que roda no servidor.
 * - Vincular/desvincular turma e tirar o acesso são gravações diretas: o banco
 *   só aceita porque quem está logado é gestor (RLS).
 */
import { excecaoDeNegocio, excecaoDeSistema, sucesso, type ResultadoOperacao } from '../types';
import { erroDeSistemaNaFuncao, mensagemDaFuncao } from './banco';
import { supabase } from './supabase';
import { servicoTurmas, type TurmaComEdicao } from './turmas';

export interface Professor {
  id: string;
  nome: string | null;
  email: string | null;
  turmas: number[];
}

/** Chave do cache (ver lib/cache.ts) e a carga completa da página Equipe */
export const CHAVE_EQUIPE = 'equipe';

export class ServicoEquipe {
  async carregar(): Promise<{ turmas: TurmaComEdicao[]; professores: Professor[] }> {
    const [turmas, professores] = await Promise.all([servicoTurmas.carregarComEdicao(), this.carregarProfessores()]);
    return { turmas, professores };
  }

  private async carregarProfessores(): Promise<Professor[]> {
    const [perfis, vinculos] = await Promise.all([
      supabase.from('perfis').select('id, nome, email').eq('papel', 'professor').order('nome'),
      supabase.from('professores_turmas').select('professor_id, turma_id'),
    ]);
    if (perfis.error) throw perfis.error;
    if (vinculos.error) throw vinculos.error;
    return perfis.data.map((p) => ({
      ...p,
      turmas: vinculos.data.filter((v) => v.professor_id === p.id).map((v) => v.turma_id),
    }));
  }

  /** Cadastra o professor e manda o convite por e-mail */
  async convidar(nome: string, email: string, turmas: number[]): Promise<ResultadoOperacao> {
    const { error } = await supabase.functions.invoke('convidar-professor', {
      body: { nome, email, turmas, redirecionar_para: `${window.location.origin}/definir-senha` },
    });
    if (!error) return sucesso();
    // A função devolve { erro: "mensagem em português" } nos erros esperados
    const mensagem = await mensagemDaFuncao(error, 'Não foi possível cadastrar agora. Tente de novo em instantes.');
    return erroDeSistemaNaFuncao(error) ? excecaoDeSistema(mensagem) : excecaoDeNegocio(mensagem);
  }

  async vincularTurma(professorId: string, turmaId: number, vincular: boolean): Promise<void> {
    const { error } = vincular
      ? await supabase.from('professores_turmas').insert({ professor_id: professorId, turma_id: turmaId })
      : await supabase.from('professores_turmas').delete().eq('professor_id', professorId).eq('turma_id', turmaId);
    if (error) throw error;
  }

  /**
   * Remove o professor da equipe: tira o papel de professor e os vínculos com as
   * turmas. A conta de login continua existindo (sem acesso a nada), e as
   * chamadas que ele já fez ficam no histórico.
   */
  async remover(professorId: string): Promise<void> {
    const { error } = await supabase.from('perfis').update({ papel: 'aluno' }).eq('id', professorId);
    if (error) throw error;
    const { error: erroVinculos } = await supabase.from('professores_turmas').delete().eq('professor_id', professorId);
    if (erroVinculos) throw erroVinculos;
  }
}

export const servicoEquipe = new ServicoEquipe();
