/**
 * Edge Function: acessos-alunos
 *
 * Chamada pelo painel do gestor para criar (ou redefinir) o acesso dos alunos:
 *   - login = o "login" da planilha (nome.sobrenome); sem login, é gerado do nome;
 *   - e-mail interno <login>@aluno.favelaware.invalid (".invalid" nunca recebe e-mail);
 *   - senha = a senha padrão informada pelo gestor (não fica guardada em lugar nenhum);
 *   - no primeiro acesso o aluno é obrigado a trocar a senha e completar os dados.
 *
 * Roda no servidor do Supabase com a chave secreta (injetada pela plataforma).
 *
 * Corpo: { "acao": "criar" | "redefinir", "participantes": [1, 2], "senha": "..." }
 * Resposta: { "criados": n, "redefinidos": n, "ignorados": [{ "nome": "...", "motivo": "..." }] }
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const DOMINIO = 'aluno.favelaware.invalid';

const CABECALHOS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const resposta = (status: number, corpo: Record<string, unknown>) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CABECALHOS_CORS, 'Content-Type': 'application/json' } });

/** "Maria da Silva Santos" -> "maria.santos" (primeiro e último nome, sem acento) */
function loginDoNome(nome: string): string {
  const partes = nome
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  return partes.length > 1 ? `${partes[0]}.${partes[partes.length - 1]}` : partes[0] ?? '';
}

const LOGIN_VALIDO = /^[a-z0-9]+(\.[a-z0-9]+)*$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS_CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Só gestor
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return resposta(401, { erro: 'Faça login novamente.' });
  const { data: quem } = await admin.auth.getUser(token);
  if (!quem.user) return resposta(401, { erro: 'Faça login novamente.' });
  const { data: perfil } = await admin.from('perfis').select('papel').eq('id', quem.user.id).maybeSingle();
  if (perfil?.papel !== 'gestor') return resposta(403, { erro: 'Só o gestor cria acessos de alunos.' });

  // 2. Pedido
  let corpo: { acao?: unknown; participantes?: unknown; senha?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return resposta(400, { erro: 'Pedido inválido.' });
  }
  const acao = corpo.acao === 'redefinir' ? 'redefinir' : corpo.acao === 'criar' ? 'criar' : null;
  const ids = Array.isArray(corpo.participantes) ? corpo.participantes.filter((i): i is number => Number.isInteger(i)) : [];
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  if (!acao) return resposta(400, { erro: 'Ação inválida.' });
  if (!ids.length || ids.length > 200) return resposta(400, { erro: 'Escolha de 1 a 200 alunos.' });
  if (senha.length < 8 || senha.length > 72) return resposta(400, { erro: 'A senha padrão precisa ter de 8 a 72 caracteres.' });

  const { data: alunos, error: erroAlunos } = await admin
    .from('participantes')
    .select('id, nome, login, funcao, edicoes(demonstracao)')
    .in('id', ids);
  if (erroAlunos) return resposta(500, { erro: 'Não foi possível ler os alunos.' });

  const { data: ligados } = await admin.from('perfis').select('id, participante_id').in('participante_id', ids);
  const contaDoAluno = new Map((ligados ?? []).map((l) => [l.participante_id as number, l.id as string]));

  let criados = 0;
  let redefinidos = 0;
  const ignorados: { nome: string; motivo: string }[] = [];

  for (const aluno of alunos ?? []) {
    // O aluno da edição de demonstração é usado pelo "Ver como aluno"; não ganha login
    if ((aluno.edicoes as unknown as { demonstracao: boolean } | null)?.demonstracao) {
      ignorados.push({ nome: aluno.nome, motivo: 'aluno de demonstração (use "Ver como → Aluno")' });
      continue;
    }
    if (aluno.funcao !== 'aluno') continue;
    const contaExistente = contaDoAluno.get(aluno.id);

    // ---------- Redefinir: volta para a senha padrão e para o primeiro acesso ----------
    if (acao === 'redefinir') {
      if (!contaExistente) {
        ignorados.push({ nome: aluno.nome, motivo: 'ainda não tem acesso' });
        continue;
      }
      const { error } = await admin.auth.admin.updateUserById(contaExistente, { password: senha });
      if (error) {
        ignorados.push({ nome: aluno.nome, motivo: 'não foi possível trocar a senha' });
        continue;
      }
      await admin.from('perfis').update({ precisa_trocar_senha: true }).eq('id', contaExistente);
      redefinidos++;
      continue;
    }

    // ---------- Criar ----------
    if (contaExistente) {
      ignorados.push({ nome: aluno.nome, motivo: 'já tem acesso' });
      continue;
    }
    let login = (aluno.login ?? '').trim().toLowerCase() || loginDoNome(aluno.nome);
    if (!LOGIN_VALIDO.test(login)) {
      ignorados.push({ nome: aluno.nome, motivo: `login inválido ("${login}"): corrija na ficha do aluno` });
      continue;
    }

    const { data: criado, error } = await admin.auth.admin.createUser({
      email: `${login}@${DOMINIO}`,
      password: senha,
      email_confirm: true, // não manda e-mail (o domínio nem existe)
      user_metadata: { nome: aluno.nome },
    });
    if (error || !criado.user) {
      const jaExiste = /already|exists|registered/i.test(error?.message ?? '');
      ignorados.push({
        nome: aluno.nome,
        motivo: jaExiste ? `o login "${login}" já é usado por outra conta` : 'não foi possível criar a conta',
      });
      continue;
    }

    // O gatilho do banco já criou o perfil (como aluno); liga ao aluno da turma
    const { error: erroPerfil } = await admin
      .from('perfis')
      .update({ participante_id: aluno.id, precisa_trocar_senha: true, nome: aluno.nome })
      .eq('id', criado.user.id);
    if (erroPerfil) {
      await admin.auth.admin.deleteUser(criado.user.id); // não deixa conta solta
      ignorados.push({ nome: aluno.nome, motivo: 'não foi possível ligar a conta ao aluno' });
      continue;
    }
    // Guarda o login gerado, para o gestor informar ao aluno
    if (!aluno.login) await admin.from('participantes').update({ login }).eq('id', aluno.id);
    criados++;
  }

  return resposta(200, { criados, redefinidos, ignorados });
});
