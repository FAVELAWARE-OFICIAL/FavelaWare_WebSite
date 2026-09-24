/**
 * Configuração do site (regra 7 de docs/boas-praticas.md).
 *
 * O que muda por ambiente vem do .env.local (ver .env.example); o resto são
 * nomes fixos do projeto Supabase, reunidos aqui para não se repetirem.
 */

/** O .env.local não tem o que o site precisa (a tela de erro explica como resolver) */
export class ErroDeConfiguracao extends Error {}

/** URL do projeto Supabase */
export const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/** Chave publicável do Supabase (pode ir para o navegador: quem protege os dados é a RLS) */
export const CHAVE_PUBLICAVEL_SUPABASE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Bucket público das fotos dos alunos (dashboard e páginas de turmas) */
export const BUCKET_FOTOS_ALUNOS = 'fotos-alunos';

/**
 * Começo da URL pública de toda foto desse bucket (null sem a URL do projeto).
 * Uma foto só é "nossa" se começar exatamente assim: vale para mostrar no site
 * e para apagar do Storage.
 */
export const PREFIXO_FOTOS_PUBLICAS = URL_SUPABASE
  ? `${URL_SUPABASE}/storage/v1/object/public/${BUCKET_FOTOS_ALUNOS}/`
  : null;

/** Bucket privado das entregas antigas (antes do Google Drive) */
export const BUCKET_ENTREGAS_ANTIGAS = 'entregas';

/** Validade, em segundos, do link de download de uma entrega (igual à da Edge Function) */
export const VALIDADE_LINK_DOWNLOAD_S = 120;

/** Maior arquivo aceito no envio ao Drive, entrega ou atestado (igual ao da Edge Function e do Apps Script) */
export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;
