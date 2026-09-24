/**
 * ============================================
 * FAVELAWARE · ENTREGAS NO GOOGLE DRIVE (Web App)
 * ============================================
 *
 * Guarda no Drive da conta da ONG os arquivos que os alunos entregam no portal.
 * Quem chama este script é SÓ a Edge Function "entregas-drive" do Supabase:
 * toda chamada vem assinada (HMAC-SHA256) com um segredo que só os dois conhecem.
 * Sem a assinatura certa, nada é gravado, lido ou apagado.
 *
 * Pastas: <PASTA_RAIZ>/turma_<id>/atividade_<id>/<participante>-<uuid>.<ext>
 * (só números: nenhum nome de aluno fica no Drive).
 *
 * Professor e aluno abrem os arquivos pelo portal, que confere quem pode ver cada
 * entrega. A pasta pode ser compartilhada com pessoas convidadas por e-mail (equipe e
 * parceiros), mas nunca por "qualquer pessoa com o link".
 *
 * Configuração (uma vez) — ver google-apps-script/README.md:
 *   Propriedades do script:
 *     SEGREDO        = o mesmo valor do segredo DRIVE_HMAC_SEGREDO do Supabase
 *     PASTA_RAIZ_ID  = id da pasta "FavelaWare · Entregas" no Drive
 *   Implantar > Nova implantação > App da Web:
 *     Executar como: Eu · Quem pode acessar: Qualquer pessoa
 *   (a proteção é a assinatura, não o login do Google)
 */

// Tipos aceitos -> extensão (a mesma lista do portal e do banco)
var TIPOS = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
};
var TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB
// Pedido vale 1 minuto. A Edge Function entregas-drive desiste depois de
// DRIVE_TEMPO_LIMITE_MS (padrão 60 s): os dois andam juntos. Aumentar um sem o
// outro faz pedido lento chegar vencido aqui (ou a função desistir antes).
var VALIDADE_MS = 60 * 1000;
// Espera máxima pela trava das pastas: precisa caber dentro dos 60 s acima
var ESPERA_DA_TRAVA_MS = 20 * 1000;
var ID_DRIVE = /^[A-Za-z0-9_-]{10,200}$/;

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var segredo = props.getProperty('SEGREDO');
    var raizId = props.getProperty('PASTA_RAIZ_ID');
    if (!segredo || !raizId) return responder({ erro: 'configuracao' });

    // 1. Assinatura: HMAC do "corpo" com o segredo
    var pedido = JSON.parse(e.postData.contents);
    if (typeof pedido.corpo !== 'string' || typeof pedido.assinatura !== 'string') return responder({ erro: 'pedido' });
    var esperada = hex(Utilities.computeHmacSha256Signature(pedido.corpo, segredo));
    if (!iguais(esperada, pedido.assinatura)) return responder({ erro: 'assinatura' });

    // 2. Pedido recente e usado uma vez só (contra reenvio de um pedido copiado)
    var dados = JSON.parse(pedido.corpo);
    if (typeof dados.ts !== 'number' || Math.abs(Date.now() - dados.ts) > VALIDADE_MS) return responder({ erro: 'expirado' });
    if (typeof dados.nonce !== 'string' || !/^[0-9a-f-]{36}$/.test(dados.nonce)) return responder({ erro: 'pedido' });
    var cache = CacheService.getScriptCache();
    if (cache.get('n:' + dados.nonce)) return responder({ erro: 'repetido' });
    cache.put('n:' + dados.nonce, '1', 180);

    var raiz = DriveApp.getFolderById(raizId);
    // A pasta pode ser compartilhada com pessoas convidadas por e-mail (equipe,
    // parceiros), mas NUNCA aberta por link: aí qualquer um com o link veria os
    // trabalhos dos alunos. Se estiver aberta por link, o script para (falha fechada).
    var acesso = raiz.getSharingAccess();
    if (acesso === DriveApp.Access.ANYONE || acesso === DriveApp.Access.ANYONE_WITH_LINK) {
      console.error('[entregas] a pasta raiz está aberta por link: nada é feito até voltar para "Restrito"');
      return responder({ erro: 'pasta-publica' });
    }
    if (dados.acao === 'enviar') return responder(enviar(dados, raiz));
    if (dados.acao === 'baixar') return responder(baixar(dados, raiz));
    if (dados.acao === 'lixeira') return responder(lixeira(dados, raiz));
    return responder({ erro: 'acao' });
  } catch (err) {
    console.error('[entregas] ' + err);
    return responder({ erro: 'interno' });
  }
}

/** Grava o arquivo na pasta da turma/atividade e devolve o id no Drive */
function enviar(dados, raiz) {
  var ext = TIPOS[dados.mime];
  if (!ext) return { erro: 'tipo' };
  if (!/^\d{1,18}$/.test(String(dados.turma)) || !/^\d{1,18}$/.test(String(dados.atividade))) return { erro: 'pedido' };
  if (!new RegExp('^\\d{1,18}-[0-9a-f-]{36}\\.' + ext + '$').test(dados.nome)) return { erro: 'pedido' };

  var bytes = Utilities.base64Decode(dados.base64);
  if (bytes.length < 1 || bytes.length > TAMANHO_MAXIMO) return { erro: 'tamanho' };

  // Criar pastas com trava: dois envios ao mesmo tempo não duplicam a pasta
  var trava = LockService.getScriptLock();
  trava.waitLock(ESPERA_DA_TRAVA_MS);
  var pasta;
  try {
    pasta = pastaFilha(pastaFilha(raiz, 'turma_' + dados.turma), 'atividade_' + dados.atividade);
  } finally {
    trava.releaseLock();
  }

  var arquivo = pasta.createFile(Utilities.newBlob(bytes, dados.mime, dados.nome));
  return { ok: true, id: arquivo.getId() };
}

/** Devolve o conteúdo (base64) de um arquivo que está dentro da pasta raiz */
function baixar(dados, raiz) {
  var arquivo = arquivoDaRaiz(dados.id, raiz);
  if (!arquivo) return { erro: 'nao-encontrado' };
  return { ok: true, base64: Utilities.base64Encode(arquivo.getBlob().getBytes()), mime: arquivo.getMimeType() };
}

/** Manda para a lixeira (limpeza quando a entrega não chegou a ser registrada) */
function lixeira(dados, raiz) {
  var arquivo = arquivoDaRaiz(dados.id, raiz);
  if (!arquivo) return { erro: 'nao-encontrado' };
  arquivo.setTrashed(true);
  return { ok: true };
}

// ============================================
// Ajudantes
// ============================================

/** Só mexe em arquivo que está em raiz/turma_x/atividade_y (nunca em outro lugar do Drive) */
function arquivoDaRaiz(id, raiz) {
  if (typeof id !== 'string' || !ID_DRIVE.test(id)) return null;
  var arquivo;
  try {
    arquivo = DriveApp.getFileById(id);
  } catch (e) {
    return null;
  }
  if (arquivo.isTrashed()) return null;
  var raizId = raiz.getId();
  var pais = arquivo.getParents();
  while (pais.hasNext()) {
    var atividade = pais.next();
    var turmas = atividade.getParents();
    while (turmas.hasNext()) {
      var raizes = turmas.next().getParents();
      while (raizes.hasNext()) if (raizes.next().getId() === raizId) return arquivo;
    }
  }
  return null;
}

function pastaFilha(pai, nome) {
  var achadas = pai.getFoldersByName(nome);
  return achadas.hasNext() ? achadas.next() : pai.createFolder(nome);
}

function hex(bytes) {
  return bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

/** Comparação em tempo constante (não revela quantos caracteres batem) */
function iguais(a, b) {
  if (a.length !== b.length) return false;
  var diferenca = 0;
  for (var i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
