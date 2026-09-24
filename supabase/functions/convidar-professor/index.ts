/**
 * Edge Function: convidar-professor
 *
 * Chamada pelo painel do gestor para convidar alguém por e-mail:
 *   1. confere que quem chamou está logado e é gestor;
 *   2. manda o convite por e-mail (a pessoa define a senha pelo link);
 *   3. marca o perfil com o papel pedido:
 *      - "professor" (padrão): e grava os vínculos com as turmas;
 *      - "banca": membro externo da banca avaliadora. Se o e-mail já tem conta
 *        (ex.: uma gestora), não convida nem muda o papel: só devolve a conta,
 *        e o painel a vincula à banca (função cadastrar_membro_banca).
 *
 * Roda no servidor do Supabase com a chave secreta (SUPABASE_SERVICE_ROLE_KEY,
 * injetada pela própria plataforma). Essa chave nunca vai para o navegador.
 *
 * Conta que já existe nunca muda de papel (banca confirmada só é vinculada).
 *
 * Corpo: { "nome": "Maria", "email": "maria@exemplo.com", "papel": "professor" | "banca",
 *          "turmas": [5], "redirecionar_para": "https://.../definir-senha" }
 * Resposta: { id, convidado } (convidado = false quando a conta já existia)
 */
import { cabecalhosCors, clienteAdmin, criarResposta, lerJson, recusaSeNaoForGestor, servir } from '../_shared/http.ts';

const CORS = cabecalhosCors('POST, OPTIONS');
const resposta = criarResposta(CORS);

/** Mesma regra de src/utils/texto.ts (emailValido) */
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAMANHO_MAXIMO_NOME = 120;

/**
 * Conta que já usa este e-mail, pelo e-mail do próprio Auth (comparação exata),
 * e se o e-mail dela já foi confirmado. null = nenhuma conta com esse e-mail.
 * Se a lista falhar, devolve "existe, sem confirmação": o convite é recusado
 * (falha fechada) em vez de arriscar mexer numa conta que já existe.
 */
async function contaPeloEmail(
  admin: ReturnType<typeof clienteAdmin>,
  email: string,
): Promise<{ id: string | null; confirmada: boolean } | null> {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) return { id: null, confirmada: false };
    const achada = data.users.find((u) => u.email?.toLowerCase() === email);
    if (achada) return { id: achada.id, confirmada: Boolean(achada.email_confirmed_at) };
    if (data.users.length < 1000) return null;
  }
  return { id: null, confirmada: false };
}

async function convidar(req: Request): Promise<Response> {
  const admin = clienteAdmin();

  // 1. Quem chamou? (o token do gestor vem no cabeçalho Authorization)
  const recusa = await recusaSeNaoForGestor(admin, req, 'Só o gestor pode convidar.');
  if (recusa) return resposta(recusa.http, { erro: recusa.erro });

  // 2. Valida o pedido
  const corpo = await lerJson(req);
  if (!corpo) return resposta(400, { erro: 'Pedido inválido.' });
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  const papel = corpo.papel === 'banca' ? 'banca' : 'professor';
  const turmas =
    papel === 'professor' && Array.isArray(corpo.turmas)
      ? corpo.turmas.filter((t): t is number => Number.isInteger(t))
      : [];
  const redirecionar = typeof corpo.redirecionar_para === 'string' ? corpo.redirecionar_para : undefined;

  if (!nome || nome.length > TAMANHO_MAXIMO_NOME) return resposta(400, { erro: 'Informe o nome.' });
  if (!EMAIL_VALIDO.test(email)) return resposta(400, { erro: 'E-mail inválido.' });

  // Conta que já existe nunca muda de papel por aqui:
  // - banca: com e-mail confirmado (ex.: gestora, instrutor), só é vinculada;
  // - sem confirmação, ou convite de instrutor: recusa (o convite reenviado
  //   mudaria o papel de quem já tem conta).
  const existente = await contaPeloEmail(admin, email);
  if (existente) {
    if (papel === 'banca' && existente.confirmada && existente.id) {
      return resposta(200, { id: existente.id, convidado: false });
    }
    return resposta(409, {
      erro:
        papel === 'banca'
          ? 'Já existe uma conta com esse e-mail, ainda sem confirmar. Peça para a pessoa entrar pelo e-mail que recebeu antes.'
          : 'Já existe uma conta com esse e-mail.',
    });
  }

  // 3. Convite (cria a conta e manda o e-mail). O gatilho do banco cria o perfil como "aluno".
  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: redirecionar,
  });
  if (erroConvite || !convite.user) {
    const jaExiste = erroConvite?.code === 'email_exists' || /already/i.test(erroConvite?.message ?? '');
    return resposta(jaExiste ? 409 : 500, {
      erro: jaExiste ? 'Já existe uma conta com esse e-mail.' : 'Não foi possível enviar o convite. Tente de novo.',
    });
  }

  // 4. Marca o papel (e, para instrutor, vincula às turmas)
  const { error: erroPerfil } = await admin.from('perfis').update({ papel, nome, email }).eq('id', convite.user.id);
  if (erroPerfil) return resposta(500, { erro: 'Convite enviado, mas não foi possível marcar o papel da conta.' });

  if (turmas.length) {
    const { error: erroVinculo } = await admin
      .from('professores_turmas')
      .insert(turmas.map((turma_id) => ({ professor_id: convite.user.id, turma_id })));
    if (erroVinculo) return resposta(500, { erro: 'Instrutor cadastrado, mas não foi possível vincular as turmas.' });
  }

  return resposta(201, { id: convite.user.id, convidado: true });
}

servir('convidar-professor', CORS, { POST: convidar });
