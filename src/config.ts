/**
 * Configuração do site (regra 7 de docs/boas-praticas.md).
 *
 * O que muda por ambiente vem do .env.local (ver .env.example); o resto são
 * nomes fixos do projeto Supabase, reunidos aqui para não se repetirem.
 */

/** URL do projeto Supabase */
export const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/** Chave publicável do Supabase (pode ir para o navegador: quem protege os dados é a RLS) */
export const CHAVE_PUBLICAVEL_SUPABASE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Bucket público das fotos dos alunos (dashboard e páginas de turmas) */
export const BUCKET_FOTOS_ALUNOS = 'fotos-alunos';

/** Bucket privado das entregas antigas (antes do Google Drive) */
export const BUCKET_ENTREGAS_ANTIGAS = 'entregas';

/** Validade, em segundos, do link de download de uma entrega (igual à da Edge Function) */
export const VALIDADE_LINK_DOWNLOAD_S = 120;
