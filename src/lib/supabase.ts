/**
 * Cliente Supabase único do site.
 *
 * As chaves vêm do .env.local (ver .env.example). A chave publicável pode
 * ficar no navegador: quem protege os dados são as políticas RLS do banco.
 */
import { createClient } from '@supabase/supabase-js';

import { CHAVE_PUBLICAVEL_SUPABASE as chavePublicavel, URL_SUPABASE as url } from '../config';

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
