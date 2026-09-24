/**
 * Apoio comum às Edge Functions: CORS, resposta JSON com o status padronizado,
 * cliente com a chave secreta e a checagem de gestor.
 *
 * Configuração (npx supabase secrets set ...):
 *   ORIGEM_PERMITIDA  a origem aceita pelo CORS (ex.: https://favelaware.com.br).
 *                     Uma só: lista com vírgula o navegador recusa. Sem ela, vale '*'.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Os 5 status padronizados (regra 3 de docs/boas-praticas.md; os mesmos de src/types.ts) */
export const StatusProcessamento = {
  EmExecucao: 1,
  ExcecaoNegocio: 2,
  ExcecaoSistema: 3,
  Sucesso: 4,
  Cancelado: 5,
} as const;

export type StatusProcessamento = (typeof StatusProcessamento)[keyof typeof StatusProcessamento];

/** Status de uma resposta HTTP: 2xx sucesso, 4xx exceção de negócio, 5xx exceção de sistema */
export const statusDoHttp = (http: number): StatusProcessamento =>
  http < 400
    ? StatusProcessamento.Sucesso
    : http < 500
      ? StatusProcessamento.ExcecaoNegocio
      : StatusProcessamento.ExcecaoSistema;

/** Cabeçalhos CORS com os métodos da função */
export const cabecalhosCors = (metodos: string) => ({
  'Access-Control-Allow-Origin': Deno.env.get('ORIGEM_PERMITIDA') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': metodos,
});

/** Resposta JSON com o status padronizado junto (o corpo antigo continua igual) */
export const criarResposta =
  (cors: Record<string, string>) =>
  (http: number, corpo: Record<string, unknown>): Response =>
    new Response(JSON.stringify({ ...corpo, status: statusDoHttp(http) }), {
      status: http,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

/** Cliente com a chave secreta (SUPABASE_SERVICE_ROLE_KEY, injetada pela plataforma; nunca vai ao navegador) */
export const clienteAdmin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Token do cabeçalho Authorization ("Bearer ...") */
export const tokenDoPedido = (req: Request) => req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null;

/**
 * Confere que quem chamou está logado e é gestor.
 * Devolve null se é gestor, ou o motivo da recusa (401 ou 403).
 */
export async function recusaSeNaoForGestor(
  admin: SupabaseClient,
  req: Request,
  proibido: string,
): Promise<{ http: 401 | 403; erro: string } | null> {
  const token = tokenDoPedido(req);
  if (!token) return { http: 401, erro: 'Faça login novamente.' };
  const { data: quem, error } = await admin.auth.getUser(token);
  if (error || !quem.user) return { http: 401, erro: 'Faça login novamente.' };
  const { data: perfil } = await admin.from('perfis').select('papel').eq('id', quem.user.id).maybeSingle();
  if (perfil?.papel !== 'gestor') return { http: 403, erro: proibido };
  return null;
}

/** Código que os gatilhos do banco usam para recusar por regra de negócio (o texto vem pronto para a tela) */
export const CODIGO_REGRA_DO_BANCO = '22023';

/** Id no formato UUID (atestado, arquivo, conta) */
export const UUID_VALIDO = /^[0-9a-f-]{36}$/;

/** Corpo JSON do pedido como objeto; null se não for JSON ou não for um objeto (a função responde 400) */
export async function lerJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const corpo = await req.json();
    return corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? (corpo as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

type Atender = (req: Request, url: URL) => Promise<Response>;

/**
 * Deno.serve comum às funções: responde o OPTIONS do CORS, escolhe a rota e
 * transforma erro inesperado em 500 com CORS e status (nunca sai sem cabeçalho).
 * `rotas`: "POST enviar" (método + último pedaço do caminho) ou só "POST"
 * (função de uma rota só; outro método recebe 405).
 */
export function servir(origem: string, cors: Record<string, string>, rotas: Record<string, Atender>): void {
  const resposta = criarResposta(cors);
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    const url = new URL(req.url);
    // Object.hasOwn: um método estranho (ex.: "constructor") nunca acha função do protótipo
    const chave = [`${req.method} ${url.pathname.split('/').pop()}`, req.method].find((c) => Object.hasOwn(rotas, c));
    const atender = chave ? rotas[chave] : undefined;
    try {
      if (atender) return await atender(req, url);
      const rotaUnica = Object.keys(rotas).some((chave) => !chave.includes(' '));
      return rotaUnica
        ? resposta(405, { erro: 'Método não permitido' })
        : resposta(404, { erro: 'Rota não encontrada.' });
    } catch (e) {
      console.error(`[${origem}] erro inesperado`, String(e));
      return resposta(500, { erro: 'Erro inesperado. Tente de novo.' });
    }
  });
}
