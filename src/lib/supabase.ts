/**
 * Cliente Supabase único do site.
 *
 * As chaves vêm do .env.local (ver .env.example). A chave publicável pode
 * ficar no navegador: quem protege os dados são as políticas RLS do banco.
 */
import { createClient } from '@supabase/supabase-js';

import { esquecerCache } from './cache';

const url = import.meta.env.VITE_SUPABASE_URL;
const chavePublicavel = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !chavePublicavel) {
  throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local');
}

// Marca "Lembrar de mim": com ela a sessão fica no localStorage (sobrevive a
// fechar o navegador); sem ela, no sessionStorage (some ao fechar a aba).
const CHAVE_LEMBRAR = 'favelaware:lembrar';

export function definirLembrarDeMim(lembrar: boolean) {
  if (lembrar) localStorage.setItem(CHAVE_LEMBRAR, '1');
  else localStorage.removeItem(CHAVE_LEMBRAR);
}

const armazenamentoDaSessao = {
  getItem: (chave: string) => localStorage.getItem(chave) ?? sessionStorage.getItem(chave),
  setItem: (chave: string, valor: string) => {
    const lembrar = localStorage.getItem(CHAVE_LEMBRAR) === '1';
    (lembrar ? localStorage : sessionStorage).setItem(chave, valor);
    (lembrar ? sessionStorage : localStorage).removeItem(chave);
  },
  removeItem: (chave: string) => {
    localStorage.removeItem(chave);
    sessionStorage.removeItem(chave);
  },
};

export const supabase = createClient(url, chavePublicavel, {
  auth: { storage: armazenamentoDaSessao, persistSession: true, autoRefreshToken: true },
});

export type Papel = 'aluno' | 'professor' | 'gestor';

export interface MeuPerfil {
  papel: Papel | null;
  nome: string | null;
  foto: string | null;
  /** Aluno da turma ligado a esta conta (só alunos com acesso criado pelo gestor) */
  participanteId: number | null;
  /** Aluno que ainda não fez o primeiro acesso (trocar senha + completar dados) */
  precisaTrocarSenha: boolean;
  /** Conta que pode "ver como" gestor, professor ou aluno */
  podeAlternarPapel: boolean;
}

const PERFIL_VAZIO: MeuPerfil = {
  papel: null, nome: null, foto: null, participanteId: null, precisaTrocarSenha: false, podeAlternarPapel: false,
};

// Perfil de quem está logado, buscado UMA vez por sessão e reaproveitado pela
// guarda de rota, pela barra superior e pelo login (antes eram várias consultas).
let perfilEmCache: { usuarioId: string; promessa: Promise<MeuPerfil> } | null = null;

export function carregarPerfil(usuarioId: string): Promise<MeuPerfil> {
  if (perfilEmCache?.usuarioId !== usuarioId) {
    const promessa = Promise.resolve(
      supabase
        .from('perfis')
        .select('papel, nome, foto, participante_id, precisa_trocar_senha, pode_alternar_papel')
        .eq('id', usuarioId)
        .maybeSingle(),
    ).then(({ data, error }): MeuPerfil => {
      if (error) {
        perfilEmCache = null; // falhou: na próxima vez tenta de novo, em vez de guardar o erro
        return PERFIL_VAZIO;
      }
      return {
        papel: (data?.papel as Papel | undefined) ?? null,
        nome: data?.nome ?? null,
        foto: data?.foto ?? null,
        participanteId: data?.participante_id ?? null,
        precisaTrocarSenha: data?.precisa_trocar_senha ?? false,
        podeAlternarPapel: data?.pode_alternar_papel ?? false,
      };
    });
    perfilEmCache = { usuarioId, promessa };
  }
  return perfilEmCache.promessa;
}

/** Esquece o perfil guardado (ex.: depois do primeiro acesso, que muda o perfil) */
export function esquecerPerfil(): void {
  perfilEmCache = null;
}

// Saiu ou trocou de conta (mesmo sem "Sair", ou em outra aba): esquece tudo o
// que foi guardado, para os dados de uma conta nunca aparecerem para a próxima.
let ultimoUsuario: string | null | undefined;
supabase.auth.onAuthStateChange((evento, sessao) => {
  const usuario = sessao?.user.id ?? null;
  if (evento === 'SIGNED_OUT' || (ultimoUsuario !== undefined && usuario !== ultimoUsuario)) {
    perfilEmCache = null;
    esquecerCache();
  }
  ultimoUsuario = usuario;
});

/** Papel de quem está logado (tabela public.perfis). null se não houver perfil. */
export async function buscarPapel(usuarioId: string): Promise<Papel | null> {
  return (await carregarPerfil(usuarioId)).papel;
}

/**
 * Para onde a pessoa vai depois de entrar (null = ainda não tem área):
 * gestor -> /dashboard; professor -> /professor; aluno da turma -> /aluno
 * (ou /primeiro-acesso, se ainda não trocou a senha padrão).
 */
export function destinoDoPerfil(perfil: MeuPerfil): string | null {
  if (perfil.papel === 'gestor') return '/dashboard';
  if (perfil.papel === 'professor') return '/professor';
  if (perfil.papel === 'aluno' && (perfil.participanteId || perfil.podeAlternarPapel)) {
    return perfil.precisaTrocarSenha ? '/primeiro-acesso' : '/aluno';
  }
  return null;
}

// Aluno entra com o login da turma (nome.sobrenome). Por trás, o Supabase Auth
// usa um e-mail interno que nunca recebe mensagem (".invalid" é reservado).
const DOMINIO_ALUNO = 'aluno.favelaware.invalid';

/**
 * Troca o papel da conta autorizada ("ver como" gestor, professor ou aluno) e
 * devolve para onde ir. O banco confere a permissão (função alternar_papel).
 */
export async function alternarPapel(papel: Papel): Promise<string> {
  const { error } = await supabase.rpc('alternar_papel', { p_papel: papel });
  if (error) throw error;
  esquecerPerfil();
  return papel === 'gestor' ? '/dashboard' : papel === 'professor' ? '/professor' : '/aluno';
}

/** "maria.silva" -> "maria.silva@aluno.favelaware.invalid"; e-mail fica como está */
export function emailDoIdentificador(identificador: string): string {
  const limpo = identificador.trim().toLowerCase();
  return limpo.includes('@') ? limpo : `${limpo}@${DOMINIO_ALUNO}`;
}
