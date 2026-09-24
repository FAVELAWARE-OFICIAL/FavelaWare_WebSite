/**
 * Apoio comum aos serviços que falam com o Supabase:
 * mensagens de erro do banco e das Edge Functions, e a próxima posição de uma lista.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from './supabase';

type ErroDoBanco = { code?: string; message?: string } | null | undefined;

/** Código do erro do banco (só o código vai para o log: o detalhe pode trazer dados) */
export const codigoDoErro = (erro: unknown) => (erro as ErroDoBanco)?.code;

/** Cadastros com nome único: traduz duplicidade e valor fora do padrão */
export function mensagemDeErroDeCadastro(
  erro: ErroDoBanco,
  padrao: string,
  duplicado = 'Já existe um cadastro com esse nome.',
) {
  if (erro?.code === '23505') return duplicado;
  if (erro?.code === '23514') return 'Valor fora do padrão aceito.';
  return padrao;
}

/** Texto de erro que a Edge Function devolveu ({ erro }), ou o padrão */
export async function mensagemDaFuncao(erro: unknown, padrao: string): Promise<string> {
  if (erro instanceof FunctionsHttpError) {
    try {
      const corpo = await erro.context.json();
      if (typeof corpo?.erro === 'string') return corpo.erro;
    } catch {
      /* resposta sem JSON: fica o padrão */
    }
  }
  return padrao;
}

/** A Edge Function respondeu com erro de sistema (5xx) ou nem respondeu? */
export function erroDeSistemaNaFuncao(erro: unknown): boolean {
  if (erro instanceof FunctionsHttpError) return (erro.context as Response).status >= 500;
  return true; // rede ou relay: falha técnica
}

/**
 * Próxima posição (ordem = maior + 1) numa tabela ordenada.
 * Se a leitura falhar, devolve null (e registra o código): gravar com ordem
 * errada geraria uma mensagem enganosa ("já existe um cadastro com esse nome").
 */
export async function proximaOrdem(
  tabela: 'edicoes' | 'trilhas' | 'materiais',
  filtro?: { coluna: string; valor: number },
): Promise<number | null> {
  let consulta = supabase.from(tabela).select('ordem');
  if (filtro) consulta = consulta.eq(filtro.coluna, filtro.valor);
  const { data, error } = await consulta.order('ordem', { ascending: false }).limit(1).maybeSingle();
  if (error) {
    console.error(`[${tabela}] falha ao ler a última ordem`, error.code, error.message);
    return null;
  }
  return ((data as { ordem: number } | null)?.ordem ?? 0) + 1;
}
