/**
 * Edge Function: convidar-professor
 *
 * Chamada pelo painel do gestor para cadastrar um professor:
 *   1. confere que quem chamou está logado e é gestor;
 *   2. manda o convite por e-mail (o professor define a senha pelo link);
 *   3. marca o perfil como "professor" e grava os vínculos com as turmas.
 *
 * Roda no servidor do Supabase com a chave secreta (SUPABASE_SERVICE_ROLE_KEY,
 * injetada pela própria plataforma). Essa chave nunca vai para o navegador.
 *
 * Corpo: { "nome": "Maria", "email": "maria@exemplo.com", "turmas": [5], "redirecionar_para": "https://.../definir-senha" }
 */
import { cabecalhosCors, clienteAdmin, criarResposta, lerJson, recusaSeNaoForGestor, servir } from '../_shared/http.ts';

const CORS = cabecalhosCors('POST, OPTIONS');
const resposta = criarResposta(CORS);

/** Mesma regra de src/utils/texto.ts (emailValido) */
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAMANHO_MAXIMO_NOME = 120;

async function convidar(req: Request): Promise<Response> {
  const admin = clienteAdmin();

  // 1. Quem chamou? (o token do gestor vem no cabeçalho Authorization)
  const recusa = await recusaSeNaoForGestor(admin, req, 'Só o gestor pode cadastrar instrutores.');
  if (recusa) return resposta(recusa.http, { erro: recusa.erro });

  // 2. Valida o pedido
  const corpo = await lerJson(req);
  if (!corpo) return resposta(400, { erro: 'Pedido inválido.' });
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  const turmas = Array.isArray(corpo.turmas) ? corpo.turmas.filter((t): t is number => Number.isInteger(t)) : [];
  const redirecionar = typeof corpo.redirecionar_para === 'string' ? corpo.redirecionar_para : undefined;

  if (!nome || nome.length > TAMANHO_MAXIMO_NOME) return resposta(400, { erro: 'Informe o nome do instrutor.' });
  if (!EMAIL_VALIDO.test(email)) return resposta(400, { erro: 'E-mail inválido.' });

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

  // 4. Promove a professor e vincula às turmas
  const { error: erroPerfil } = await admin
    .from('perfis')
    .update({ papel: 'professor', nome, email })
    .eq('id', convite.user.id);
  if (erroPerfil) return resposta(500, { erro: 'Convite enviado, mas não foi possível marcar como instrutor.' });

  if (turmas.length) {
    const { error: erroVinculo } = await admin
      .from('professores_turmas')
      .insert(turmas.map((turma_id) => ({ professor_id: convite.user.id, turma_id })));
    if (erroVinculo) return resposta(500, { erro: 'Instrutor cadastrado, mas não foi possível vincular as turmas.' });
  }

  return resposta(201, { id: convite.user.id });
}

servir('convidar-professor', CORS, { POST: convidar });
