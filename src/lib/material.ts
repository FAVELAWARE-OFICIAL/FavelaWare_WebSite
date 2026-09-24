/**
 * ============================================
 * MATERIAL DAS AULAS (TRILHAS E LINKS)
 * ============================================
 *
 * O material fica organizado em trilhas (Carreira Tech, Git e GitHub...), cada
 * uma com seus links (Drive, GitBook, YouTube...).
 * - Gestor e professores cadastram e editam (regras RLS no banco).
 * - Alunos com acesso só leem.
 * - Só links https:// são aceitos (o banco também confere).
 */
import { supabase } from './supabase';

export interface MaterialDaTrilha {
  id: number;
  titulo: string;
  descricao: string | null;
  url: string;
  ordem: number;
}

export interface Trilha {
  id: number;
  nome: string;
  descricao: string | null;
  ordem: number;
  materiais: MaterialDaTrilha[];
}

/** Chave do cache (ver lib/cache.ts) */
export const CHAVE_MATERIAL = 'material';

/** Todas as trilhas com os materiais, na ordem definida pela equipe */
export async function carregarTrilhas(): Promise<Trilha[]> {
  const { data, error } = await supabase
    .from('trilhas')
    .select('id, nome, descricao, ordem, materiais(id, titulo, descricao, url, ordem)')
    .order('ordem')
    .order('nome');
  if (error) throw error;
  return (data as Trilha[]).map((t) => ({
    ...t,
    materiais: [...t.materiais].sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR')),
  }));
}

/** "https://drive.google.com/..." -> "drive.google.com" (mostrado no cartão) */
export function dominioDoLink(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const linkValido = (url: string) => /^https:\/\/\S+$/i.test(url.trim());

const vazioViraNulo = (texto: string) => (texto.trim() ? texto.trim() : null);

const erroPadrao = (erro: { code?: string }, padrao: string) =>
  erro.code === '23505'
    ? 'Já existe uma trilha com esse nome.'
    : erro.code === '23514'
      ? 'Confira os campos: algum valor não é aceito.'
      : padrao;

// ============================================
// TRILHAS
// ============================================

export async function salvarTrilha(dados: { nome: string; descricao: string }, id?: number): Promise<string | null> {
  const campos = { nome: dados.nome.trim(), descricao: vazioViraNulo(dados.descricao) };
  if (id) {
    const { error } = await supabase.from('trilhas').update(campos).eq('id', id);
    return error ? erroPadrao(error, 'Não foi possível salvar a trilha.') : null;
  }
  // Trilha nova entra no fim da lista
  const { data: ultima } = await supabase
    .from('trilhas')
    .select('ordem')
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from('trilhas').insert({ ...campos, ordem: (ultima?.ordem ?? 0) + 1 });
  return error ? erroPadrao(error, 'Não foi possível criar a trilha.') : null;
}

/** Apaga a trilha e TODOS os materiais dela */
export async function apagarTrilha(id: number): Promise<string | null> {
  const { error } = await supabase.from('trilhas').delete().eq('id', id);
  if (!error) return null;
  // Trilha com atividades não é apagada (o banco protege as entregas)
  return error.code === '23503'
    ? 'Esta trilha tem atividades. Apague ou mude a trilha das atividades antes.'
    : 'Não foi possível apagar a trilha.';
}

// ============================================
// MATERIAIS
// ============================================

export async function salvarMaterial(
  dados: { trilha_id: number; titulo: string; descricao: string; url: string },
  id?: number,
): Promise<string | null> {
  if (!linkValido(dados.url)) return 'O link precisa começar com https://';
  const campos = {
    trilha_id: dados.trilha_id,
    titulo: dados.titulo.trim(),
    descricao: vazioViraNulo(dados.descricao),
    url: dados.url.trim(),
  };
  if (id) {
    const { error } = await supabase.from('materiais').update(campos).eq('id', id);
    return error ? erroPadrao(error, 'Não foi possível salvar o material.') : null;
  }
  const { data: ultimo } = await supabase
    .from('materiais')
    .select('ordem')
    .eq('trilha_id', dados.trilha_id)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from('materiais').insert({ ...campos, ordem: (ultimo?.ordem ?? 0) + 1 });
  return error ? erroPadrao(error, 'Não foi possível adicionar o material.') : null;
}

export async function apagarMaterial(id: number): Promise<string | null> {
  const { error } = await supabase.from('materiais').delete().eq('id', id);
  return error ? 'Não foi possível apagar o material.' : null;
}
