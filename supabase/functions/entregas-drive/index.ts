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
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import {
  base64,
  clienteDoUsuario,
  drive,
  lerArquivoDoFormulario,
  nomeDePasta,
  nomeParaDownload,
  paginaDeTexto,
  respostaDeDownload,
  TIPOS_DE_ARQUIVO,
} from '../_shared/drive.ts';
import {
  cabecalhosCors,
  clienteAdmin,
  CODIGO_REGRA_DO_BANCO,
  criarResposta,
  lerJson,
  servir,
  UUID_VALIDO,
} from '../_shared/http.ts';

/** Mesmos limites do banco, conferidos antes do Drive */
const TAMANHO_MAXIMO_COMENTARIO = 10000;
const TAMANHO_MAXIMO_LINK = 2000;

const CORS = cabecalhosCors('GET, POST, OPTIONS');
const resposta = criarResposta(CORS);

const admin = clienteAdmin();

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
  if (driveId) await drive.mandarParaLixeira(driveId, 'entregas-drive');
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
  // Tamanho, tipo e conteúdo do arquivo (um .exe chamado de .pdf não passa)
  const lido = await lerArquivoDoFormulario(req, TIPOS_DE_ARQUIVO, resposta, {
    tamanho: 'O arquivo precisa ter até 10 MB.',
    tipo: 'Tipo de arquivo não aceito. Use PDF, imagem, ZIP, TXT ou Office.',
    conteudo:
      'O conteúdo do arquivo não bate com o tipo. Envie o arquivo original (PDF, imagem, ZIP, TXT ou Office).',
  });
  if (lido instanceof Response) return lido;
  const { form, arquivo, bytes, ext } = lido;
  const atividadeId = Number(form.get('atividade_id'));
  const comentario = String(form.get('comentario') ?? '').trim();
  const link = String(form.get('link') ?? '').trim();
  if (!Number.isInteger(atividadeId) || atividadeId <= 0) return resposta(400, { erro: 'Atividade inválida.' });
  if (link && !/^https:\/\/\S+$/i.test(link)) return resposta(400, { erro: 'O link precisa começar com https://' });
  // Os mesmos limites do banco, conferidos ANTES do Drive (senão o registro falharia
  // depois do upload e sobraria arquivo na lixeira do Drive)
  if (comentario.length > TAMANHO_MAXIMO_COMENTARIO) {
    return resposta(400, { erro: 'O comentário passa de 10.000 caracteres.' });
  }
  if (link.length > TAMANHO_MAXIMO_LINK) return resposta(400, { erro: 'O link é longo demais.' });
  if (/\u0000/.test(comentario + link)) return resposta(400, { erro: 'O texto tem caracteres inválidos.' });
  return { atividadeId, comentario, link, arquivo, bytes, ext, nome: nomeParaDownload(arquivo.name, ext, 'entrega') };
}

/**
 * Regras da atividade (comentário e link) conferidas ANTES de reservar e subir:
 * senão o arquivo iria ao Drive à toa e gastaria o limite do aluno. O formato é
 * conferido na reserva, e o trigger confere tudo de novo no registro.
 * Devolve o título da atividade (vai no nome do arquivo no Drive) ou a recusa.
 */
async function conferirRegrasDaAtividade(
  usuario: SupabaseClient,
  pedido: PedidoDeEnvio,
): Promise<{ titulo: string } | Response> {
  const { atividadeId, comentario, link } = pedido;
  const { data: atividade } = await usuario
    .from('atividades')
    .select('titulo, exige_texto, exige_link, tipo_link')
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
  return { titulo: atividade.titulo };
}

// ============================================
// ROTAS
// ============================================
async function enviar(req: Request): Promise<Response> {
  const usuario = (await clienteDoUsuario(req))?.cliente;
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
    if (erroReserva?.code === CODIGO_REGRA_DO_BANCO) return resposta(409, { erro: erroReserva.message });
    return resposta(500, { erro: 'Não foi possível conferir a entrega agora. Tente de novo.' });
  }
  console.log('[entregas-drive] reservado', { atividadeId, arquivo: reserva.arquivo_id });

  // 2. Drive: na pasta do aluno, <raiz>/Alunos/<Nome (id)>/atividade/ (a mesma do
  //    atestado). O nome vem do banco, nunca do navegador.
  const { data: aluno } = await admin.from('participantes').select('nome').eq('id', reserva.participante_id).maybeSingle();
  let driveId: string;
  try {
    const r = await drive.chamar('enviar', {
      pessoa: `${nomeDePasta(aluno?.nome ?? 'Aluno')} (${reserva.participante_id})`,
      nome: `${atividadeId} - ${nomeDePasta(regras.titulo).slice(0, 120)} - ${reserva.arquivo_id}.${ext}`,
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
      erro: erroEntrega.code === CODIGO_REGRA_DO_BANCO ? erroEntrega.message : 'Não foi possível registrar a entrega. Tente de novo.',
    });
  }
  console.log('[entregas-drive] registrado', { arquivo: reserva.arquivo_id });
  return resposta(200, { ok: true });
}

async function gerarLink(req: Request): Promise<Response> {
  const usuario = (await clienteDoUsuario(req))?.cliente;
  if (!usuario) return resposta(401, { erro: 'Faça login novamente.' });
  const corpo = await lerJson(req);
  if (!corpo) return resposta(400, { erro: 'Pedido inválido.' });
  const id = typeof corpo.arquivo_id === 'string' ? corpo.arquivo_id : '';
  if (!UUID_VALIDO.test(id)) return resposta(400, { erro: 'Arquivo inválido.' });

  // Se a RLS devolver a linha, quem pediu pode ver o arquivo
  const { data } = await usuario.from('arquivos_entrega').select('id').eq('id', id).maybeSingle();
  if (!data) return resposta(404, { erro: 'Arquivo não encontrado.' });
  if (!drive.temSegredo) return resposta(503, { erro: 'Download indisponível agora.' });

  return resposta(200, { url: await drive.linkAssinado('baixar', id, 'entregas-drive/baixar') });
}

async function baixar(url: URL): Promise<Response> {
  const ticket = await drive.lerTicket(url, 'baixar');
  if (!('id' in ticket)) return paginaDeTexto(CORS, ticket.status, ticket.texto);

  const { data: arquivo } = await admin
    .from('arquivos_entrega')
    .select('drive_id, nome, mime')
    .eq('id', ticket.id)
    .is('descartado_em', null)
    .not('drive_id', 'is', null)
    .maybeSingle();
  if (!arquivo) return paginaDeTexto(CORS, 404, 'Arquivo não encontrado.');
  return respostaDeDownload(arquivo, TIPOS_DE_ARQUIVO, CORS, 'entregas-drive', 'entrega');
}

servir('entregas-drive', CORS, {
  'POST enviar': (req) => enviar(req),
  'POST link': (req) => gerarLink(req),
  'GET baixar': (_req, url) => baixar(url),
});
