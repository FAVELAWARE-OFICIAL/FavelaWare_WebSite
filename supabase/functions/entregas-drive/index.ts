/**
 * Edge Function: entregas-drive
 *
 * Ponte entre o portal e o Google Drive (Apps Script em google-apps-script/entregas.gs).
 * O arquivo da entrega vai para o Drive da ONG; no banco fica só a referência.
 *
 * Rotas:
 *   POST /entregas-drive/enviar  (multipart, com login do aluno)
 *        campos: atividade_id, comentario?, link?, arquivo
 *        0. confere tamanho, tipo pelo conteúdo e os textos;
 *        1. reserva a vaga com o login do aluno (reservar_arquivo: regra de envio,
 *           limite de arquivos e cota diária, com trava contra pedidos simultâneos);
 *        2. manda o arquivo ao Apps Script (pedido assinado com HMAC);
 *        3. completa a reserva com o id do Drive (só o servidor grava);
 *        4. registra a entrega com o login do aluno (os triggers carimbam quem e quando);
 *           se algo falhar, a reserva fica descartada e o arquivo vai para a lixeira.
 *   POST /entregas-drive/link    (json { arquivo_id }, com login)
 *        confere se quem pede pode ver o arquivo (a leitura passa pela RLS) e
 *        devolve um link de download que vale VALIDADE_LINK_S segundos.
 *   GET  /entregas-drive/baixar?t=...
 *        o link acima: entrega o arquivo como download (nunca abre no navegador).
 *
 * Toda resposta JSON leva "status" (regra 3): 4 sucesso, 2 exceção de negócio, 3 de sistema.
 *
 * Segredos e configuração (npx supabase secrets set ...):
 *   DRIVE_WEBAPP_URL         URL /exec do App da Web do Apps Script
 *   DRIVE_HMAC_SEGREDO       segredo compartilhado com o Apps Script (e usado nos links)
 *   DRIVE_TEMPO_LIMITE_MS    opcional, inteiro de 1 a 60000 (padrão 60000). O teto é a
 *                            validade do pedido no Apps Script (VALIDADE_MS, 60 s): um pedido
 *                            mais lento que ela chega vencido e é recusado lá.
 *   ORIGEM_PERMITIDA         opcional (ver _shared/http.ts)
 * Implantar com --no-verify-jwt (a rota /baixar é um link sem login); as rotas
 * POST conferem o login aqui dentro.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { cabecalhosCors, clienteAdmin, criarResposta, tokenDoPedido } from '../_shared/http.ts';

const TIPOS: Record<string, string> = {
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
const TAMANHO_MAXIMO = 10 * 1024 * 1024;
/** Folga do formulário multipart sobre o arquivo */
const MARGEM_DO_FORMULARIO = 1024 * 1024;
/** Validade do link de download (igual a VALIDADE_LINK_DOWNLOAD_S em src/config.ts) */
const VALIDADE_LINK_S = 120;
/** Mesmos limites do banco, conferidos antes do Drive */
const TAMANHO_MAXIMO_COMENTARIO = 10000;
const TAMANHO_MAXIMO_LINK = 2000;

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
const CHAVE_PUBLICA = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS = cabecalhosCors('GET, POST, OPTIONS');
const resposta = criarResposta(CORS);

const admin = clienteAdmin();

// ============================================
// DRIVE (Apps Script, com pedido assinado)
// ============================================
class DriveIndisponivel extends Error {}

class ServicoDrive {
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
  async mandarParaLixeira(driveId: string): Promise<void> {
    try {
      const r = await this.chamar('lixeira', { id: driveId });
      if (!r.ok) console.error('[entregas-drive] limpeza: o Drive recusou a lixeira', { driveId, erro: r.erro });
    } catch (e) {
      console.error('[entregas-drive] limpeza: Drive fora do ar; arquivo ficou no Drive', { driveId, erro: String(e) });
    }
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
  console.error('[entregas-drive] DRIVE_TEMPO_LIMITE_MS inválido; usando o padrão', { configurado });
  return TEMPO_LIMITE_PADRAO_MS;
}

const drive = new ServicoDrive(
  Deno.env.get('DRIVE_WEBAPP_URL') ?? '',
  Deno.env.get('DRIVE_HMAC_SEGREDO') ?? '',
  tempoLimiteDoDrive(),
);

// ============================================
// APOIO
// ============================================

/**
 * Limpeza de um envio que não virou entrega: a reserva fica marcada como
 * descartada (continua contando no limite do aluno) e, se o arquivo chegou ao
 * Drive, vai para a lixeira. Tudo o que falhar fica no log.
 */
async function descartar(arquivoId: string, driveId: string | null): Promise<void> {
  const { error } = await admin
    .from('arquivos_entrega')
    .update({ descartado_em: new Date().toISOString() })
    .eq('id', arquivoId);
  if (error) console.error('[entregas-drive] limpeza: não marcou o descarte', { arquivoId, codigo: error.code });
  if (driveId) await drive.mandarParaLixeira(driveId);
}

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

/** Cliente que age COMO o usuário (a RLS e os triggers valem) */
async function clienteDoUsuario(req: Request): Promise<SupabaseClient | null> {
  const token = tokenDoPedido(req);
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return null;
  return createClient(URL_SUPABASE, CHAVE_PUBLICA, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Nome para o download: o original, com a extensão do tipo real */
function nomeParaDownload(original: string, ext: string): string {
  const base =
    original
      .replace(/\.[^.]*$/, '')
      .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069"\\/]/g, '')
      .trim()
      .slice(0, 150) || 'entrega';
  return `${base}.${ext}`;
}

function base64(bytes: Uint8Array): string {
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

// ============================================
// ENVIO: etapas
// ============================================
interface PedidoDeEnvio {
  atividadeId: number;
  comentario: string;
  link: string;
  arquivo: File;
  bytes: Uint8Array;
  ext: string;
  nome: string;
}

/** Etapa 0: lê e confere o formulário (tamanho, tipo pelo conteúdo e textos). Devolve o pedido ou a recusa. */
async function lerPedidoDeEnvio(req: Request): Promise<PedidoDeEnvio | Response> {
  // Pedido grande demais é recusado antes de ser lido
  const tamanhoDoPedido = Number(req.headers.get('Content-Length') ?? '0');
  if (!tamanhoDoPedido || tamanhoDoPedido > TAMANHO_MAXIMO + MARGEM_DO_FORMULARIO) {
    return resposta(413, { erro: 'O arquivo precisa ter até 10 MB.' });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return resposta(400, { erro: 'Pedido inválido.' });
  }
  const atividadeId = Number(form.get('atividade_id'));
  const comentario = String(form.get('comentario') ?? '').trim();
  const link = String(form.get('link') ?? '').trim();
  const arquivo = form.get('arquivo');
  if (!Number.isInteger(atividadeId) || atividadeId <= 0) return resposta(400, { erro: 'Atividade inválida.' });
  if (!(arquivo instanceof File)) return resposta(400, { erro: 'Arquivo não recebido.' });
  const ext = TIPOS[arquivo.type];
  if (!ext) return resposta(400, { erro: 'Tipo de arquivo não aceito. Use PDF, imagem, ZIP, TXT ou Office.' });
  if (arquivo.size < 1 || arquivo.size > TAMANHO_MAXIMO) {
    return resposta(400, { erro: 'O arquivo precisa ter até 10 MB.' });
  }
  if (link && !/^https:\/\/\S+$/i.test(link)) return resposta(400, { erro: 'O link precisa começar com https://' });
  // Os mesmos limites do banco, conferidos ANTES do Drive (senão o registro falharia
  // depois do upload e sobraria arquivo na lixeira do Drive)
  if (comentario.length > TAMANHO_MAXIMO_COMENTARIO) {
    return resposta(400, { erro: 'O comentário passa de 10.000 caracteres.' });
  }
  if (link.length > TAMANHO_MAXIMO_LINK) return resposta(400, { erro: 'O link é longo demais.' });
  if (/\u0000/.test(comentario + link)) return resposta(400, { erro: 'O texto tem caracteres inválidos.' });

  // O conteúdo precisa ser do tipo declarado (um .exe chamado de .pdf não passa)
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (!conteudoBateComTipo(bytes, arquivo.type)) {
    return resposta(400, {
      erro: 'O conteúdo do arquivo não bate com o tipo. Envie o arquivo original (PDF, imagem, ZIP, TXT ou Office).',
    });
  }
  return { atividadeId, comentario, link, arquivo, bytes, ext, nome: nomeParaDownload(arquivo.name, ext) };
}

/**
 * Regras da atividade (comentário e link) conferidas ANTES de reservar e subir:
 * senão o arquivo iria ao Drive à toa e gastaria o limite do aluno. O formato é
 * conferido na reserva, e o trigger confere tudo de novo no registro.
 * Devolve a turma da atividade ou a recusa.
 */
async function conferirRegrasDaAtividade(
  usuario: SupabaseClient,
  pedido: PedidoDeEnvio,
): Promise<{ turmaId: number } | Response> {
  const { atividadeId, comentario, link } = pedido;
  const { data: atividade } = await usuario
    .from('atividades')
    .select('turma_id, exige_texto, exige_link, tipo_link')
    .eq('id', atividadeId)
    .maybeSingle();
  if (!atividade) return resposta(404, { erro: 'Atividade não encontrada.' });
  if (atividade.exige_texto && !comentario) {
    return resposta(409, { erro: 'Esta atividade pede um comentário ou resposta.' });
  }
  if (atividade.exige_link && !link) {
    return resposta(409, {
      erro:
        atividade.tipo_link === 'github'
          ? 'Esta atividade pede o link do GitHub.'
          : atividade.tipo_link === 'drive'
            ? 'Esta atividade pede o link do Google Drive.'
            : 'Esta atividade pede um link.',
    });
  }
  if (link && atividade.tipo_link === 'github' && !/^https:\/\/(www\.)?github\.com\/\S+$/i.test(link)) {
    return resposta(409, { erro: 'O link precisa ser do GitHub (https://github.com/...).' });
  }
  if (link && atividade.tipo_link === 'drive' && !/^https:\/\/(drive|docs)\.google\.com\/\S+$/i.test(link)) {
    return resposta(409, { erro: 'O link precisa ser do Google Drive (https://drive.google.com/...).' });
  }
  return { turmaId: atividade.turma_id };
}

// ============================================
// ROTAS
// ============================================
async function enviar(req: Request): Promise<Response> {
  const usuario = await clienteDoUsuario(req);
  if (!usuario) return resposta(401, { erro: 'Faça login novamente.' });

  // 0. Formulário e regras da atividade
  const pedido = await lerPedidoDeEnvio(req);
  if (pedido instanceof Response) return pedido;
  const regras = await conferirRegrasDaAtividade(usuario, pedido);
  if (regras instanceof Response) return regras;
  const { atividadeId, arquivo, bytes, ext } = pedido;

  // 1. Reserva a vaga (com o login do aluno: a regra, o limite e a cota são do banco)
  const { data: reservas, error: erroReserva } = await usuario.rpc('reservar_arquivo', {
    p_atividade: atividadeId,
    p_nome: pedido.nome,
    p_mime: arquivo.type,
    p_tamanho: arquivo.size,
  });
  const reserva = (reservas as { arquivo_id: string; participante_id: number }[] | null)?.[0];
  if (erroReserva || !reserva) {
    console.log('[entregas-drive] envio recusado', erroReserva?.code);
    if (erroReserva?.code === '42501') return resposta(403, { erro: 'Você não pode enviar arquivo para esta atividade.' });
    if (erroReserva?.code === '22023') return resposta(409, { erro: erroReserva.message });
    return resposta(500, { erro: 'Não foi possível conferir a entrega agora. Tente de novo.' });
  }
  console.log('[entregas-drive] reservado', { atividadeId, arquivo: reserva.arquivo_id });

  // 2. Drive (o nome no Drive usa o id da reserva: nada de nome de aluno)
  let driveId: string;
  try {
    const r = await drive.chamar('enviar', {
      turma: regras.turmaId,
      atividade: atividadeId,
      nome: `${reserva.participante_id}-${reserva.arquivo_id}.${ext}`,
      mime: arquivo.type,
      base64: base64(bytes),
    });
    if (!r.ok || typeof r.id !== 'string') {
      console.error('[entregas-drive] drive recusou', r.erro);
      await descartar(reserva.arquivo_id, null);
      return resposta(502, { erro: 'Não foi possível guardar o arquivo agora. Tente de novo em instantes.' });
    }
    driveId = r.id;
  } catch (e) {
    console.error('[entregas-drive] drive fora do ar', String(e));
    await descartar(reserva.arquivo_id, null);
    return resposta(503, { erro: 'Envio de arquivo indisponível agora. Envie link ou texto, ou tente mais tarde.' });
  }
  console.log('[entregas-drive] drive ok', { arquivo: reserva.arquivo_id });

  // 3. Completa a reserva com o id do Drive (servidor)
  const { error: erroRegistro } = await admin
    .from('arquivos_entrega')
    .update({ drive_id: driveId })
    .eq('id', reserva.arquivo_id);
  if (erroRegistro) {
    console.error('[entregas-drive] falha ao registrar o arquivo', erroRegistro.code);
    await descartar(reserva.arquivo_id, driveId);
    return resposta(500, { erro: 'Não foi possível registrar a entrega. Tente de novo.' });
  }

  // 4. Entrega (com o login do aluno: triggers e RLS valem)
  const { error: erroEntrega } = await usuario.from('tentativas').insert({
    atividade_id: atividadeId,
    participante_id: reserva.participante_id,
    comentario: pedido.comentario || null,
    link: pedido.link || null,
    arquivo_id: reserva.arquivo_id,
  });
  if (erroEntrega) {
    console.error('[entregas-drive] falha ao registrar a entrega; limpando', erroEntrega.code);
    await descartar(reserva.arquivo_id, driveId);
    return resposta(409, {
      erro: erroEntrega.code === '22023' ? erroEntrega.message : 'Não foi possível registrar a entrega. Tente de novo.',
    });
  }
  console.log('[entregas-drive] registrado', { arquivo: reserva.arquivo_id });
  return resposta(200, { ok: true });
}

async function gerarLink(req: Request): Promise<Response> {
  const usuario = await clienteDoUsuario(req);
  if (!usuario) return resposta(401, { erro: 'Faça login novamente.' });
  let corpo: { arquivo_id?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return resposta(400, { erro: 'Pedido inválido.' });
  }
  const id = typeof corpo.arquivo_id === 'string' ? corpo.arquivo_id : '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return resposta(400, { erro: 'Arquivo inválido.' });

  // Se a RLS devolver a linha, quem pediu pode ver o arquivo
  const { data } = await usuario.from('arquivos_entrega').select('id').eq('id', id).maybeSingle();
  if (!data) return resposta(404, { erro: 'Arquivo não encontrado.' });
  if (!drive.temSegredo) return resposta(503, { erro: 'Download indisponível agora.' });

  const ticket = `${id}.${Math.floor(Date.now() / 1000) + VALIDADE_LINK_S}`;
  const t = `${ticket}.${await drive.assinar(`baixar:${ticket}`)}`;
  return resposta(200, { url: `${URL_SUPABASE}/functions/v1/entregas-drive/baixar?t=${encodeURIComponent(t)}` });
}

async function baixar(url: URL): Promise<Response> {
  const [id, expira, assinatura] = (url.searchParams.get('t') ?? '').split('.');
  const pagina = (status: number, texto: string) =>
    new Response(texto, {
      status,
      headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  if (!id || !expira || !assinatura || !drive.temSegredo) return pagina(400, 'Link inválido.');
  if (!drive.iguais(await drive.assinar(`baixar:${id}.${expira}`), assinatura)) return pagina(403, 'Link inválido.');
  if (Number(expira) < Date.now() / 1000) {
    return pagina(410, 'Este link expirou. Volte ao portal e clique no arquivo de novo.');
  }

  const { data: arquivo } = await admin
    .from('arquivos_entrega')
    .select('drive_id, nome, mime')
    .eq('id', id)
    .is('descartado_em', null)
    .not('drive_id', 'is', null)
    .maybeSingle();
  if (!arquivo) return pagina(404, 'Arquivo não encontrado.');

  try {
    const r = await drive.chamar('baixar', { id: arquivo.drive_id });
    if (!r.ok || typeof r.base64 !== 'string') return pagina(404, 'Arquivo não encontrado no Drive.');
    const binario = atob(r.base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new Response(bytes, {
      headers: {
        ...CORS, // o portal baixa com fetch (e mostra o erro no botão, se houver)
        // Sempre download, com o tipo da lista (nunca abre como página)
        'Content-Type': TIPOS[arquivo.mime] ? arquivo.mime : 'application/octet-stream',
        'Content-Disposition': `attachment; filename="entrega.${TIPOS[arquivo.mime] ?? 'bin'}"; filename*=UTF-8''${encodeURIComponent(
          arquivo.nome,
        ).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    console.error('[entregas-drive] drive fora do ar no download', String(e));
    return pagina(503, 'O Drive não respondeu agora. Tente de novo em instantes.');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const rota = url.pathname.split('/').pop();
  try {
    if (req.method === 'POST' && rota === 'enviar') return await enviar(req);
    if (req.method === 'POST' && rota === 'link') return await gerarLink(req);
    if (req.method === 'GET' && rota === 'baixar') return await baixar(url);
    return resposta(404, { erro: 'Rota não encontrada.' });
  } catch (e) {
    console.error('[entregas-drive] erro inesperado', String(e));
    return resposta(500, { erro: 'Erro inesperado. Tente de novo.' });
  }
});
