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
import { linkValido, vazioViraNulo } from '../utils/texto';
import { mensagemDeErroDeCadastro, proximaOrdem } from './banco';
import { supabase } from './supabase';

export interface MaterialDaTrilha {
  id: number;
  titulo: string;
  descricao: string | null;
  url: string;
  ordem: number;
}

/** Trilha cadastrada no portal (as trilhas do site público ficam em src/data/trilhas.ts) */
export interface TrilhaDoPortal {
  id: number;
  nome: string;
  descricao: string | null;
  ordem: number;
  materiais: MaterialDaTrilha[];
}

/** Chave do cache (ver lib/cache.ts) */
export const CHAVE_MATERIAL = 'material';

const DUPLICADO = 'Já existe uma trilha com esse nome.';

/** Mesmas mensagens de antes para o que o banco recusa (valor fora do padrão tem texto próprio) */
const mensagemDoErro = (erro: { code?: string }, padrao: string) =>
  erro.code === '23514'
    ? 'Confira os campos: algum valor não é aceito.'
    : mensagemDeErroDeCadastro(erro, padrao, DUPLICADO);

/** "https://drive.google.com/..." -> "drive.google.com" (mostrado no cartão) */
export function dominioDoLink(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export class ServicoMaterial {
  /** Todas as trilhas com os materiais, na ordem definida pela equipe */
  async carregarTrilhas(): Promise<TrilhaDoPortal[]> {
    const { data, error } = await supabase
      .from('trilhas')
      .select('id, nome, descricao, ordem, materiais(id, titulo, descricao, url, ordem)')
      .order('ordem')
      .order('nome');
    if (error) throw error;
    return (data as TrilhaDoPortal[]).map((t) => ({
      ...t,
      materiais: [...t.materiais].sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR')),
    }));
  }

  async salvarTrilha(dados: { nome: string; descricao: string }, id?: number): Promise<string | null> {
    const campos = { nome: dados.nome.trim(), descricao: vazioViraNulo(dados.descricao) };
    if (id) {
      const { error } = await supabase.from('trilhas').update(campos).eq('id', id);
      return error ? mensagemDoErro(error, 'Não foi possível salvar a trilha.') : null;
    }
    // Trilha nova entra no fim da lista
    const ordem = await proximaOrdem('trilhas');
    if (ordem === null) return 'Não foi possível criar a trilha.';
    const { error } = await supabase.from('trilhas').insert({ ...campos, ordem });
    return error ? mensagemDoErro(error, 'Não foi possível criar a trilha.') : null;
  }

  /** Apaga a trilha e TODOS os materiais dela */
  async apagarTrilha(id: number): Promise<string | null> {
    const { error } = await supabase.from('trilhas').delete().eq('id', id);
    if (!error) return null;
    // Trilha com atividades não é apagada (o banco protege as entregas)
    return error.code === '23503'
      ? 'Esta trilha tem atividades. Apague ou mude a trilha das atividades antes.'
      : 'Não foi possível apagar a trilha.';
  }

  async salvarMaterial(
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
      return error ? mensagemDoErro(error, 'Não foi possível salvar o material.') : null;
    }
    const ordem = await proximaOrdem('materiais', { coluna: 'trilha_id', valor: dados.trilha_id });
    if (ordem === null) return 'Não foi possível adicionar o material.';
    const { error } = await supabase.from('materiais').insert({ ...campos, ordem });
    return error ? mensagemDoErro(error, 'Não foi possível adicionar o material.') : null;
  }

  async apagarMaterial(id: number): Promise<string | null> {
    const { error } = await supabase.from('materiais').delete().eq('id', id);
    return error ? 'Não foi possível apagar o material.' : null;
  }
}

export const servicoMaterial = new ServicoMaterial();
