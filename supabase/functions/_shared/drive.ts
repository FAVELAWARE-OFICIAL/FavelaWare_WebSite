/**
 * Apoio comum às Edge Functions que guardam arquivos no Google Drive da ONG
 * (entregas-drive e atestados), pelo Apps Script em google-apps-script/entregas.gs.
 *
 * - O Apps Script só aceita pedidos assinados (HMAC-SHA256) com DRIVE_HMAC_SEGREDO.
 * - Os links de download são tickets assinados com o mesmo segredo e validade curta.
 *
 * Segredos (npx supabase secrets set ...):
 *   DRIVE_WEBAPP_URL         URL /exec do App da Web do Apps Script
 *   DRIVE_HMAC_SEGREDO       segredo compartilhado com o Apps Script
 *   DRIVE_TEMPO_LIMITE_MS    opcional, inteiro de 1 a 60000 (padrão 60000). O teto é a
 *                            validade do pedido no Apps Script (VALIDADE_MS, 60 s).
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { clienteAdmin, tokenDoPedido } from './http.ts';

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
const CHAVE_PUBLICA = Deno.env.get('SUPABASE_ANON_KEY')!;

/** Tamanho máximo de arquivo (o mesmo do portal e do Apps Script) */
export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;

/** Validade do link de download (igual a VALIDADE_LINK_DOWNLOAD_S em src/config.ts) */
export const VALIDADE_LINK_S = 120;

/** Tipos de arquivo aceitos nas entregas e a extensão de cada um (os mesmos do portal e do Apps Script) */
export const TIPOS_DE_ARQUIVO: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

/** Atestado: só PDF ou foto (os mesmos tipos da tabela atestados) */
export const TIPOS_DE_ATESTADO: Record<string, string> = Object.fromEntries(
  ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].map((tipo) => [tipo, TIPOS_DE_ARQUIVO[tipo]]),
);

/** Folga do formulário multipart sobre o arquivo */
const MARGEM_DO_FORMULARIO = 1024 * 1024;

/** Textos de recusa de lerArquivoDoFormulario (mudam entre "arquivo" e "atestado") */
interface TextosDoArquivo {
  tamanho: string;
  tipo: string;
  conteudo: string;
}

/**
 * Lê o formulário multipart e confere o arquivo: pedido grande demais é recusado
 * antes de ser lido; depois o tipo pela lista, o tamanho e o conteúdo (um .exe
 * chamado de .pdf não passa). Devolve o formulário e o arquivo, ou a recusa.
 */
export async function lerArquivoDoFormulario(
  req: Request,
  tipos: Record<string, string>,
  resposta: (http: number, corpo: Record<string, unknown>) => Response,
  textos: TextosDoArquivo,
): Promise<{ form: FormData; arquivo: File; bytes: Uint8Array; ext: string } | Response> {
  const tamanhoDoPedido = Number(req.headers.get('Content-Length') ?? '0');
  if (!tamanhoDoPedido || tamanhoDoPedido > TAMANHO_MAXIMO_ARQUIVO + MARGEM_DO_FORMULARIO) {
    return resposta(413, { erro: textos.tamanho });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return resposta(400, { erro: 'Pedido inválido.' });
  }
  const arquivo = form.get('arquivo');
  if (!(arquivo instanceof File)) return resposta(400, { erro: 'Arquivo não recebido.' });
  const ext = tipos[arquivo.type];
  if (!ext) return resposta(400, { erro: textos.tipo });
  if (arquivo.size < 1 || arquivo.size > TAMANHO_MAXIMO_ARQUIVO) return resposta(400, { erro: textos.tamanho });
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (!conteudoBateComTipo(bytes, arquivo.type)) return resposta(400, { erro: textos.conteudo });
  return { form, arquivo, bytes, ext };
}

export class DriveIndisponivel extends Error {}

export class ServicoDrive {
  private codificador = new TextEncoder();
  private chaveHmac: Promise<CryptoKey> | null = null;

  constructor(
    private url: string,
    private segredo: string,
    private tempoLimiteMs: number,
  ) {}

  get configurado(): boolean {
    return Boolean(this.url && this.segredo);
  }

  get temSegredo(): boolean {
    return Boolean(this.segredo);
  }

  /** HMAC-SHA256 em hexadecimal */
  async assinar(texto: string): Promise<string> {
    this.chaveHmac ??= crypto.subtle.importKey(
      'raw',
      this.codificador.encode(this.segredo),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const assinatura = new Uint8Array(
      await crypto.subtle.sign('HMAC', await this.chaveHmac, this.codificador.encode(texto)),
    );
    return [...assinatura].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** Comparação em tempo constante (não vaza onde a assinatura difere) */
  iguais(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diferenca = 0;
    for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diferenca === 0;
  }

  /** Chama o Apps Script com o pedido assinado. Erro de rede/configuração = DriveIndisponivel. */
  async chamar(acao: string, dados: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.configurado) throw new DriveIndisponivel('Drive não configurado');
    const corpo = JSON.stringify({ ...dados, acao, ts: Date.now(), nonce: crypto.randomUUID() });
    let r: Response;
    try {
      // O App da Web responde com um redirecionamento (302) para o resultado: o fetch segue
      r = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corpo, assinatura: await this.assinar(corpo) }),
        redirect: 'follow',
        signal: AbortSignal.timeout(this.tempoLimiteMs), // Apps Script travado não prende o pedido
      });
    } catch (e) {
      throw new DriveIndisponivel(`rede: ${e}`);
    }
    if (!r.ok) throw new DriveIndisponivel(`http ${r.status}`);
    try {
      return await r.json();
    } catch {
      throw new DriveIndisponivel('resposta sem JSON');
    }
  }

  /** Limpeza: manda para a lixeira do Drive e registra no log se falhar (sem sumir) */
  async mandarParaLixeira(driveId: string, origem: string): Promise<void> {
    try {
      const r = await this.chamar('lixeira', { id: driveId });
      if (!r.ok) console.error(`[${origem}] limpeza: o Drive recusou a lixeira`, { driveId, erro: r.erro });
    } catch (e) {
      console.error(`[${origem}] limpeza: Drive fora do ar; arquivo ficou no Drive`, { driveId, erro: String(e) });
    }
  }

  /** Link de download assinado: `<rota>?t=<id>.<expira>.<assinatura>` (o prefixo separa os tipos de arquivo) */
  async linkAssinado(prefixo: string, id: string, rota: string): Promise<string> {
    const ticket = `${id}.${Math.floor(Date.now() / 1000) + VALIDADE_LINK_S}`;
    const t = `${ticket}.${await this.assinar(`${prefixo}:${ticket}`)}`;
    return `${URL_SUPABASE}/functions/v1/${rota}?t=${encodeURIComponent(t)}`;
  }

  /** Confere o ticket do link. Devolve o id, ou o motivo da recusa (status + texto) */
  async lerTicket(url: URL, prefixo: string): Promise<{ id: string } | { status: number; texto: string }> {
    const [id, expira, assinatura] = (url.searchParams.get('t') ?? '').split('.');
    if (!id || !expira || !assinatura || !this.temSegredo) return { status: 400, texto: 'Link inválido.' };
    if (!this.iguais(await this.assinar(`${prefixo}:${id}.${expira}`), assinatura)) {
      return { status: 403, texto: 'Link inválido.' };
    }
    if (Number(expira) < Date.now() / 1000) {
      return { status: 410, texto: 'Este link expirou. Volte ao portal e clique no arquivo de novo.' };
    }
    return { id };
  }
}

/** Padrão e teto do tempo limite: a validade do pedido no Apps Script (VALIDADE_MS) */
const TEMPO_LIMITE_PADRAO_MS = 60000;

/** DRIVE_TEMPO_LIMITE_MS só vale se for inteiro entre 1 e 60000; fora disso, fica o padrão */
function tempoLimiteDoDrive(): number {
  const configurado = Deno.env.get('DRIVE_TEMPO_LIMITE_MS');
  if (configurado === undefined) return TEMPO_LIMITE_PADRAO_MS;
  const valor = Number(configurado);
  if (Number.isInteger(valor) && valor > 0 && valor <= TEMPO_LIMITE_PADRAO_MS) return valor;
  console.error('[drive] DRIVE_TEMPO_LIMITE_MS inválido; usando o padrão', { configurado });
  return TEMPO_LIMITE_PADRAO_MS;
}

export const drive = new ServicoDrive(
  Deno.env.get('DRIVE_WEBAPP_URL') ?? '',
  Deno.env.get('DRIVE_HMAC_SEGREDO') ?? '',
  tempoLimiteDoDrive(),
);

// ============================================
// ARQUIVOS
// ============================================

/** Primeiros bytes de cada tipo aceito (o tipo declarado pelo navegador não basta) */
function conteudoBateComTipo(b: Uint8Array, mime: string): boolean {
  const comeca = (...assinatura: number[]) => assinatura.every((x, i) => b[i] === x);
  switch (mime) {
    case 'application/pdf':
      return comeca(0x25, 0x50, 0x44, 0x46, 0x2d); // %PDF-
    case 'image/png':
      return comeca(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/jpeg':
      return comeca(0xff, 0xd8, 0xff);
    case 'image/webp':
      return comeca(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    case 'text/plain':
      // Texto: UTF-8 válido e sem byte nulo
      if (b.includes(0)) return false;
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(b);
        return true;
      } catch {
        return false;
      }
    default: // zip e Office (docx/xlsx/pptx são zip)
      return comeca(0x50, 0x4b, 0x03, 0x04) || comeca(0x50, 0x4b, 0x05, 0x06);
  }
}

/** Nome para o download: o original, com a extensão do tipo real */
export function nomeParaDownload(original: string, ext: string, reserva = 'arquivo'): string {
  const base =
    original
      .replace(/\.[^.]*$/, '')
      .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069"\\/]/g, '')
      .trim()
      .slice(0, 150) || reserva;
  return `${base}.${ext}`;
}

/** Nome de pasta seguro: sem barra, controle ou marca de direção; no máximo 80 letras */
export const nomeDePasta = (nome: string) =>
  nome
    .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Sem nome';

export function base64(bytes: Uint8Array): string {
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

/** Cliente que age COMO o usuário (a RLS e os triggers valem). null = sem login válido */
export async function clienteDoUsuario(req: Request): Promise<{ cliente: SupabaseClient; usuarioId: string } | null> {
  const token = tokenDoPedido(req);
  if (!token) return null;
  const { data } = await clienteAdmin().auth.getUser(token);
  if (!data.user) return null;
  return {
    cliente: createClient(URL_SUPABASE, CHAVE_PUBLICA, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }),
    usuarioId: data.user.id,
  };
}

/**
 * Busca o arquivo no Drive e devolve como download (nunca abre no navegador).
 * `tipos` diz quais tipos saem com o próprio Content-Type; o resto sai como binário.
 */
export async function respostaDeDownload(
  arquivo: { drive_id: string; nome: string; mime: string },
  tipos: Record<string, string>,
  cors: Record<string, string>,
  origem: string,
  nomeReserva = 'arquivo',
): Promise<Response> {
  const pagina = (status: number, texto: string) => paginaDeTexto(cors, status, texto);
  try {
    const r = await drive.chamar('baixar', { id: arquivo.drive_id });
    if (!r.ok || typeof r.base64 !== 'string') return pagina(404, 'Arquivo não encontrado no Drive.');
    const binario = atob(r.base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new Response(bytes, {
      headers: {
        ...cors, // o portal baixa com fetch (e mostra o erro no botão, se houver)
        // Sempre download, com o tipo da lista (nunca abre como página)
        'Content-Type': tipos[arquivo.mime] ? arquivo.mime : 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${nomeReserva}.${tipos[arquivo.mime] ?? 'bin'}"; filename*=UTF-8''${encodeURIComponent(
          arquivo.nome,
        ).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    console.error(`[${origem}] drive fora do ar no download`, String(e));
    return pagina(503, 'O Drive não respondeu agora. Tente de novo em instantes.');
  }
}

/** Página de texto simples (erro do link de download) */
export const paginaDeTexto = (cors: Record<string, string>, status: number, texto: string) =>
  new Response(texto, {
    status,
    headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
