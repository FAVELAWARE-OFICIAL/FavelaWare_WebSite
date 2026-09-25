/**
 * Edge Function: remover-membro
 *
 * Chamada pelo painel do gestor (telas Membros e Equipe) para tirar alguém da
 * equipe APAGANDO a conta de login. Com a conta, o banco apaga em cascata o
 * perfil e o que é da pessoa: vínculos com turmas, ponto, dados do RPA,
 * atestados, notas que ela deu na avaliação final e notas da banca. Chamadas,
 * solicitações e demais registros ficam, sem o nome de quem fez (set null).
 * O e-mail fica livre para um convite novo.
 *
 *   1. confere que quem chamou está logado e é gestor;
 *   2. recusa apagar a própria conta, a da responsável pelo portal (todas as
 *      personas) e contas de aluno (aluno não é removido por aqui);
 *   3. apaga a conta no Auth.
 *
 * Corpo: { "id": "<uuid da conta>" }
 * Resposta: { id }
 */
import {
  cabecalhosCors,
  clienteAdmin,
  criarResposta,
  lerJson,
  recusaSeNaoForGestor,
  servir,
  tokenDoPedido,
  UUID_VALIDO,
} from '../_shared/http.ts';

const CORS = cabecalhosCors('POST, OPTIONS');
const resposta = criarResposta(CORS);

async function remover(req: Request): Promise<Response> {
  const admin = clienteAdmin();

  // 1. Quem chamou? (o token do gestor vem no cabeçalho Authorization)
  const recusa = await recusaSeNaoForGestor(admin, req, 'Só o gestor remove alguém da equipe.');
  if (recusa) return resposta(recusa.http, { erro: recusa.erro });
  const { data: quem } = await admin.auth.getUser(tokenDoPedido(req)!);

  // 2. Valida o pedido e a conta que vai sair
  const corpo = await lerJson(req);
  const id = typeof corpo?.id === 'string' ? corpo.id : '';
  if (!UUID_VALIDO.test(id)) return resposta(400, { erro: 'Pedido inválido.' });
  if (id === quem.user?.id) return resposta(403, { erro: 'Você não pode remover a própria conta.' });

  const { data: perfil, error: erroPerfil } = await admin
    .from('perfis')
    .select('papel, pode_alternar_papel')
    .eq('id', id)
    .maybeSingle();
  if (erroPerfil) return resposta(500, { erro: 'Não foi possível conferir a conta. Tente de novo.' });
  if (!perfil) return resposta(404, { erro: 'Essa pessoa não está mais na equipe.' });
  if (perfil.pode_alternar_papel) {
    return resposta(403, { erro: 'A responsável pelo portal não pode ser removida.' });
  }
  if (perfil.papel === 'aluno') return resposta(403, { erro: 'Aluno não é removido pela equipe.' });

  // 3. Apaga a conta (o perfil e o que é da pessoa saem em cascata no banco)
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    console.error('[remover-membro] falha ao apagar a conta', error.status);
    return resposta(500, { erro: 'Não foi possível apagar a conta. Tente de novo.' });
  }
  console.log('[remover-membro] conta apagada');
  return resposta(200, { id });
}

servir('remover-membro', CORS, { POST: remover });
