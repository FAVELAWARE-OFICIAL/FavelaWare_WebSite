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
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Professor {
  id: string;
  nome: string | null;
  email: string | null;
  turmas: number[];
}

export interface TurmaComEdicao {
  id: number;
  nome: string;
  edicao: string;
  ordemEdicao: number;
}

/** Chave do cache (ver lib/cache.ts) e a carga completa da página Equipe */
export const CHAVE_EQUIPE = 'equipe';

export async function carregarEquipe(): Promise<{ turmas: TurmaComEdicao[]; professores: Professor[] }> {
  const [turmas, professores] = await Promise.all([carregarTodasTurmas(), carregarProfessores()]);
  return { turmas, professores };
}

export async function carregarTodasTurmas(): Promise<TurmaComEdicao[]> {
  const { data, error } = await supabase.from('turmas').select('id, nome, edicoes(nome, ordem)');
  if (error) throw error;
  return (
    data
      .map((t) => {
        const edicao = t.edicoes as unknown as { nome: string; ordem: number } | null;
        return { id: t.id, nome: t.nome, edicao: edicao?.nome ?? '', ordemEdicao: edicao?.ordem ?? 0 };
      })
      // Edição mais recente primeiro: é onde o gestor mais mexe
      .sort((a, b) => b.ordemEdicao - a.ordemEdicao || a.nome.localeCompare(b.nome, 'pt-BR'))
  );
}

export async function carregarProfessores(): Promise<Professor[]> {
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

/** Cadastra o professor e manda o convite. Devolve a mensagem de erro, ou null se deu certo. */
export async function convidarProfessor(nome: string, email: string, turmas: number[]): Promise<string | null> {
  const { error } = await supabase.functions.invoke('convidar-professor', {
    body: { nome, email, turmas, redirecionar_para: `${window.location.origin}/definir-senha` },
  });
  if (!error) return null;
  // A função devolve { erro: "mensagem em português" } nos erros esperados
  if (error instanceof FunctionsHttpError) {
    try {
      const corpo = await error.context.json();
      if (typeof corpo?.erro === 'string') return corpo.erro;
    } catch {
      /* resposta sem JSON: cai na mensagem genérica */
    }
  }
  return 'Não foi possível cadastrar agora. Tente de novo em instantes.';
}

export async function vincularTurma(professorId: string, turmaId: number, vincular: boolean): Promise<void> {
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
export async function removerProfessor(professorId: string): Promise<void> {
  const { error } = await supabase.from('perfis').update({ papel: 'aluno' }).eq('id', professorId);
  if (error) throw error;
  const { error: erroVinculos } = await supabase.from('professores_turmas').delete().eq('professor_id', professorId);
  if (erroVinculos) throw erroVinculos;
}
