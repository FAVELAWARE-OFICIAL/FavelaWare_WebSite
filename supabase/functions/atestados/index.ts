/**
 * Edge Function: atestados
 *
 * Atestado da falta justificada (J), na chamada dos alunos e no ponto dos
 * instrutores. O arquivo vai para o Google Drive da ONG pelo Apps Script
 * (google-apps-script/entregas.gs, ação "atestado"); no banco fica só a referência.
 *
 * Pastas no Drive (pedido da coordenação: pelo nome da pessoa):
 *   <PASTA_RAIZ>/Alunos/<Nome do aluno> (<id>)/atestado/<arquivo>
 *   <PASTA_RAIZ>/Instrutores/<Nome do instrutor> (<id>)/atestado/<arquivo>
 * A pasta do aluno é a mesma das atividades entregues (…/atividade/).
 * O número entre parênteses separa pessoas com o mesmo nome.
 *
 * Atestado é dado de saúde (sensível pela LGPD): só o gestor gera o link de download.
 *
 * Rotas:
 *   POST /atestados/enviar  (multipart, com login do instrutor ou do gestor)
 *        campos: participante_id (aluno da chamada) OU professor_id (vazio = o próprio), arquivo
 *   POST /atestados/link    (json { atestado_id }, só gestor)
 *   GET  /atestados/baixar?t=...  (o link acima; vale 2 minutos)
 *
 * Toda resposta JSON leva "status" (regra 3): 4 sucesso, 2 exceção de negócio, 3 de sistema.
 * Segredos: os mesmos de _shared/drive.ts. Implantar com --no-verify-jwt (a rota
 * /baixar é um link sem login); as rotas POST conferem o login aqui dentro.
 */
import {
  base64,
  clienteDoUsuario,
  drive,
  lerArquivoDoFormulario,
  nomeDePasta,
  nomeParaDownload,
  paginaDeTexto,
  respostaDeDownload,
  TIPOS_DE_ATESTADO,
} from '../_shared/drive.ts';
import { cabecalhosCors, clienteAdmin, criarResposta, lerJson, servir, UUID_VALIDO } from '../_shared/http.ts';

const CORS = cabecalhosCors('GET, POST, OPTIONS');
const resposta = criarResposta(CORS);
const admin = clienteAdmin();

/** De quem é o atestado e o nome da pasta dele no Drive */
interface Dono {
  grupo: 'Alunos' | 'Instrutores';
  pasta: string;
  participanteId: number | null;
  professorId: string | null;
}

/**
 * Descobre de quem é o atestado e confere se quem envia pode enviar:
 * - aluno: quem envia faz a chamada da turma dele (a RLS só mostra o aluno ao
 *   instrutor da turma e ao gestor) e a edição não pode estar encerrada;
 * - instrutor: o próprio instrutor, ou o gestor em nome dele.
 */
async function descobrirDono(
  form: FormData,
  usuario: NonNullable<Awaited<ReturnType<typeof clienteDoUsuario>>>,
): Promise<Dono | Response> {
  const { data: quemEnvia } = await admin.from('perfis').select('papel').eq('id', usuario.usuarioId).maybeSingle();
  const papel = quemEnvia?.papel;
  if (papel !== 'professor' && papel !== 'gestor') {
    return resposta(403, { erro: 'Só instrutor e gestor enviam atestado.' });
  }

  const participante = String(form.get('participante_id') ?? '').trim();
  if (participante) {
    const id = Number(participante);
    if (!Number.isInteger(id) || id <= 0) return resposta(400, { erro: 'Aluno inválido.' });
    // Com o login de quem envia: se a RLS devolver o aluno, a pessoa faz a chamada da turma
    const { data: aluno } = await usuario.cliente
      .from('participantes')
      .select('id, nome, edicao_id')
      .eq('id', id)
      .eq('funcao', 'aluno')
      .maybeSingle();
    if (!aluno) return resposta(403, { erro: 'Você não faz a chamada deste aluno.' });
    const { data: edicao } = await admin.from('edicoes').select('encerrada').eq('id', aluno.edicao_id).maybeSingle();
    if (edicao?.encerrada) return resposta(409, { erro: 'Esta edição foi encerrada: a presença não muda mais.' });
    return { grupo: 'Alunos', pasta: `${nomeDePasta(aluno.nome)} (${aluno.id})`, participanteId: aluno.id, professorId: null };
  }

  const professorId = String(form.get('professor_id') ?? '').trim() || usuario.usuarioId;
  if (!UUID_VALIDO.test(professorId)) return resposta(400, { erro: 'Instrutor inválido.' });
  if (professorId !== usuario.usuarioId && papel !== 'gestor') {
    return resposta(403, { erro: 'Só o gestor envia atestado de outro instrutor.' });
  }
  const { data: professor } = await admin
    .from('perfis')
    .select('id, nome, papel')
    .eq('id', professorId)
    .maybeSingle();
  if (professor?.papel !== 'professor') return resposta(403, { erro: 'Só instrutor tem atestado no ponto.' });
  return {
    grupo: 'Instrutores',
    pasta: `${nomeDePasta(professor.nome ?? 'Instrutor')} (${professor.id.slice(0, 8)})`,
    participanteId: null,
    professorId: professor.id,
  };
}

async function enviar(req: Request): Promise<Response> {
  const usuario = await clienteDoUsuario(req);
  if (!usuario) return resposta(401, { erro: 'Faça login novamente.' });

  // 1. O arquivo: tipo, tamanho e conteúdo (um .exe chamado de .pdf não passa)
  const lido = await lerArquivoDoFormulario(req, TIPOS_DE_ATESTADO, resposta, {
    tamanho: 'O atestado precisa ter até 10 MB.',
    tipo: 'Envie o atestado em PDF ou foto (PNG, JPG ou WebP).',
    conteudo: 'O conteúdo do arquivo não bate com o tipo. Envie o arquivo original.',
  });
  if (lido instanceof Response) return lido;
  const { form, arquivo, bytes, ext } = lido;

  // 2. De quem é e se quem envia pode enviar
  const dono = await descobrirDono(form, usuario);
  if (dono instanceof Response) return dono;

  // 3. Reserva a referência (sem drive_id até o Drive confirmar)
  const { data: reserva, error: erroReserva } = await admin
    .from('atestados')
    .insert({
      participante_id: dono.participanteId,
      professor_id: dono.professorId,
      nome: nomeParaDownload(arquivo.name, ext, 'atestado'),
      mime: arquivo.type,
      tamanho: arquivo.size,
      enviado_por: usuario.usuarioId,
    })
    .select('id')
    .single();
  if (erroReserva || !reserva) {
    console.error('[atestados] falha ao reservar', erroReserva?.code);
    return resposta(500, { erro: 'Não foi possível guardar o atestado agora. Tente de novo.' });
  }
  const descartarReserva = async () => {
    const { error } = await admin.from('atestados').delete().eq('id', reserva.id);
    if (error) console.error('[atestados] limpeza: reserva ficou sem arquivo', { id: reserva.id, codigo: error.code });
  };

  // 4. Drive: <raiz>/<grupo>/<pessoa>/atestado/<id>.<ext>
  let driveId: string;
  try {
    const r = await drive.chamar('atestado', {
      grupo: dono.grupo,
      pessoa: dono.pasta,
      nome: `${reserva.id}.${ext}`,
      mime: arquivo.type,
      base64: base64(bytes),
    });
    if (!r.ok || typeof r.id !== 'string') {
      console.error('[atestados] drive recusou', r.erro);
      await descartarReserva();
      return resposta(502, { erro: 'Não foi possível guardar o atestado agora. Tente de novo em instantes.' });
    }
    driveId = r.id;
  } catch (e) {
    console.error('[atestados] drive fora do ar', String(e));
    await descartarReserva();
    return resposta(503, { erro: 'Envio de atestado indisponível agora. Salve só a justificativa ou tente mais tarde.' });
  }

  // 5. Completa a referência com o id do Drive
  const { error: erroRegistro } = await admin.from('atestados').update({ drive_id: driveId }).eq('id', reserva.id);
  if (erroRegistro) {
    console.error('[atestados] falha ao registrar', erroRegistro.code);
    await descartarReserva();
    await drive.mandarParaLixeira(driveId, 'atestados');
    return resposta(500, { erro: 'Não foi possível registrar o atestado. Tente de novo.' });
  }
  console.log('[atestados] guardado', { id: reserva.id, grupo: dono.grupo });
  return resposta(200, { atestado_id: reserva.id });
}

async function gerarLink(req: Request): Promise<Response> {
  const usuario = await clienteDoUsuario(req);
  if (!usuario) return resposta(401, { erro: 'Faça login novamente.' });
  const corpo = await lerJson(req);
  if (!corpo) return resposta(400, { erro: 'Pedido inválido.' });
  const id = typeof corpo.atestado_id === 'string' ? corpo.atestado_id : '';
  if (!UUID_VALIDO.test(id)) return resposta(400, { erro: 'Atestado inválido.' });

  // A RLS só devolve o atestado ao gestor
  const { data } = await usuario.cliente.from('atestados').select('id').eq('id', id).not('drive_id', 'is', null).maybeSingle();
  if (!data) return resposta(404, { erro: 'Atestado não encontrado.' });
  if (!drive.temSegredo) return resposta(503, { erro: 'Download indisponível agora.' });
  return resposta(200, { url: await drive.linkAssinado('atestado', id, 'atestados/baixar') });
}

async function baixar(url: URL): Promise<Response> {
  const ticket = await drive.lerTicket(url, 'atestado');
  if (!('id' in ticket)) return paginaDeTexto(CORS, ticket.status, ticket.texto);
  const { data: arquivo } = await admin
    .from('atestados')
    .select('drive_id, nome, mime')
    .eq('id', ticket.id)
    .not('drive_id', 'is', null)
    .maybeSingle();
  if (!arquivo) return paginaDeTexto(CORS, 404, 'Atestado não encontrado.');
  return respostaDeDownload(arquivo, TIPOS_DE_ATESTADO, CORS, 'atestados', 'atestado');
}

servir('atestados', CORS, {
  'POST enviar': (req) => enviar(req),
  'POST link': (req) => gerarLink(req),
  'GET baixar': (_req, url) => baixar(url),
});
