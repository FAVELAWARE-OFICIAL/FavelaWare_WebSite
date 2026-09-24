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
import { sucesso, type ResultadoOperacao } from '../types';
import { resultadoDaFuncao } from './banco';
import { servicoFotoPadronizada } from './fotoPadronizada';
import { supabase } from './supabase';
import { servicoTurmas, type TurmaComEdicao } from './turmas';

/** Professor atual (papel professor), como o gestor vê na equipe e no ponto */
export interface ProfessorAtual {
  id: string;
  nome: string | null;
  email: string | null;
  /** Foto no padrão do site (círculo verde); sem foto, o avatar padrão */
  foto: string | null;
}

export interface Professor extends ProfessorAtual {
  turmas: number[];
}

/** Chave do cache (ver lib/cache.ts) e a carga completa da página Equipe */
export const CHAVE_EQUIPE = 'equipe';

export class ServicoEquipe {
  async carregar(): Promise<{ turmas: TurmaComEdicao[]; professores: Professor[] }> {
    const [turmas, professores] = await Promise.all([servicoTurmas.carregarComEdicao(), this.carregarProfessores()]);
    return { turmas, professores };
  }

  /** Gestor: os professores atuais, por nome (a equipe e o ponto usam a mesma lista) */
  async listarProfessores(): Promise<ProfessorAtual[]> {
    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome, email, foto')
      .eq('papel', 'professor')
      .order('nome');
    if (error) throw error;
    return data;
  }

  private async carregarProfessores(): Promise<Professor[]> {
    const [perfis, vinculos] = await Promise.all([
      this.listarProfessores(),
      supabase.from('professores_turmas').select('professor_id, turma_id'),
    ]);
    if (vinculos.error) throw vinculos.error;
    return perfis.map((p) => ({
      ...p,
      turmas: vinculos.data.filter((v) => v.professor_id === p.id).map((v) => v.turma_id),
    }));
  }

  /** Cadastra o professor e manda o convite por e-mail. Devolve o id da conta criada. */
  async convidar(
    nome: string,
    email: string,
    turmas: number[],
  ): Promise<{ resultado: ResultadoOperacao; professorId?: string }> {
    const { data, error } = await supabase.functions.invoke('convidar-professor', {
      body: { nome, email, turmas, redirecionar_para: `${window.location.origin}/definir-senha` },
    });
    if (!error) return { resultado: sucesso(), professorId: (data as { id?: string } | null)?.id };
    // A função devolve { erro: "mensagem em português" } nos erros esperados
    return {
      resultado: await resultadoDaFuncao(error, 'Não foi possível cadastrar agora. Tente de novo em instantes.'),
    };
  }

  /**
   * Foto do instrutor no padrão do site (círculo verde): aparece na equipe da
   * página Sobre. Troca a antiga, que sai do Storage. Devolve a URL nova.
   */
  async trocarFoto(professorId: string, arquivo: File, fotoAntiga: string | null): Promise<string> {
    const url = await servicoFotoPadronizada.enviar(arquivo, 'equipe');
    const { error } = await supabase.from('perfis').update({ foto: url }).eq('id', professorId);
    if (error) {
      console.error('[equipe] foto enviada, mas não gravada no perfil', error.code);
      await servicoFotoPadronizada.apagar(url);
      throw new Error('Não foi possível salvar a foto.');
    }
    await servicoFotoPadronizada.apagar(fotoAntiga);
    return url;
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
