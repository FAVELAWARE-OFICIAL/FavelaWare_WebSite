/**
 * ============================================
 * ACESSOS DOS ALUNOS (ÁREA DO GESTOR)
 * ============================================
 *
 * O aluno entra com o login da turma (nome.sobrenome) e uma senha padrão, que
 * ele troca no primeiro acesso. Criar e redefinir exige a chave secreta do
 * Supabase, então passa pela Edge Function "acessos-alunos" (roda no servidor).
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type SituacaoDoAcesso = 'sem-acesso' | 'primeiro-acesso' | 'ativo';

/** Chave do cache (ver lib/cache.ts) */
export const CHAVE_ACESSOS = 'acessos';

/** { id do aluno: situação } — quem não aparece está sem acesso */
export async function carregarAcessos(): Promise<Record<number, SituacaoDoAcesso>> {
  const { data, error } = await supabase
    .from('perfis')
    .select('participante_id, precisa_trocar_senha')
    .not('participante_id', 'is', null);
  if (error) throw error;
  return Object.fromEntries(
    data.map((p) => [p.participante_id as number, p.precisa_trocar_senha ? 'primeiro-acesso' : 'ativo']),
  );
}

export const ROTULO_ACESSO: Record<SituacaoDoAcesso, string> = {
  'sem-acesso': 'Sem acesso',
  'primeiro-acesso': 'Aguardando 1º acesso',
  ativo: 'Acesso ativo',
};

export interface ResultadoDosAcessos {
  criados: number;
  redefinidos: number;
  ignorados: { nome: string; motivo: string }[];
}

/** Cria ou redefine (volta para a senha padrão + primeiro acesso) */
export async function gerenciarAcessos(
  acao: 'criar' | 'redefinir',
  participantes: number[],
  senha: string,
): Promise<{ resultado?: ResultadoDosAcessos; erro?: string }> {
  const { data, error } = await supabase.functions.invoke('acessos-alunos', { body: { acao, participantes, senha } });
  if (!error) return { resultado: data as ResultadoDosAcessos };
  if (error instanceof FunctionsHttpError) {
    try {
      const corpo = await error.context.json();
      if (typeof corpo?.erro === 'string') return { erro: corpo.erro };
    } catch { /* resposta sem JSON: cai na mensagem genérica */ }
  }
  return { erro: 'Não foi possível concluir agora. Tente de novo em instantes.' };
}
