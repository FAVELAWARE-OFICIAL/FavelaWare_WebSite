/**
 * ============================================
 * ACESSOS DOS ALUNOS (ÁREA DO GESTOR)
 * ============================================
 *
 * O aluno entra com o login da turma (nome.sobrenome) e uma senha padrão, que
 * ele troca no primeiro acesso. Criar e redefinir exige a chave secreta do
 * Supabase, então passa pela Edge Function "acessos-alunos" (roda no servidor).
 */
import {
  excecaoDeNegocio,
  excecaoDeSistema,
  sucesso,
  type ResultadoOperacao,
  type StatusProcessamento,
} from '../types';
import { erroDeSistemaNaFuncao, mensagemDaFuncao } from './banco';
import { supabase } from './supabase';

export type SituacaoDoAcesso = 'sem-acesso' | 'primeiro-acesso' | 'ativo';

/** Chave do cache (ver lib/cache.ts) */
export const CHAVE_ACESSOS = 'acessos';

export const ROTULO_ACESSO: Record<SituacaoDoAcesso, string> = {
  'sem-acesso': 'Sem acesso',
  'primeiro-acesso': 'Aguardando 1º acesso',
  ativo: 'Acesso ativo',
};

/** Aluno que não teve o acesso criado/redefinido, ou que tem um aviso */
export interface AlunoIgnorado {
  nome: string;
  motivo: string;
  /** Exceção de negócio (corrigível pelo gestor) ou de sistema (tentar de novo) */
  status: StatusProcessamento;
}

export interface ResultadoDosAcessos {
  criados: number;
  redefinidos: number;
  ignorados: AlunoIgnorado[];
}

export class ServicoAcessos {
  /** { id do aluno: situação } — quem não aparece está sem acesso */
  async carregar(): Promise<Record<number, SituacaoDoAcesso>> {
    const { data, error } = await supabase
      .from('perfis')
      .select('participante_id, precisa_trocar_senha')
      .not('participante_id', 'is', null);
    if (error) throw error;
    return Object.fromEntries(
      data.map((p) => [p.participante_id as number, p.precisa_trocar_senha ? 'primeiro-acesso' : 'ativo']),
    );
  }

  /** Cria ou redefine (volta para a senha padrão + primeiro acesso) */
  async gerenciar(
    acao: 'criar' | 'redefinir',
    participantes: number[],
    senha: string,
  ): Promise<{ resultado: ResultadoOperacao; acessos?: ResultadoDosAcessos }> {
    const { data, error } = await supabase.functions.invoke('acessos-alunos', { body: { acao, participantes, senha } });
    if (!error) return { resultado: sucesso(), acessos: data as ResultadoDosAcessos };
    const mensagem = await mensagemDaFuncao(error, 'Não foi possível concluir agora. Tente de novo em instantes.');
    return { resultado: erroDeSistemaNaFuncao(error) ? excecaoDeSistema(mensagem) : excecaoDeNegocio(mensagem) };
  }
}

export const servicoAcessos = new ServicoAcessos();
