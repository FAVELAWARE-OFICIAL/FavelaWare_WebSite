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
 * Resposta: { "criados": n, "redefinidos": n, "ignorados": [{ "nome", "motivo", "status" }], "status" }
 *   status de cada ignorado: 2 = exceção de negócio (o gestor corrige), 3 = de sistema (tentar de novo).
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import {
  StatusProcessamento,
  cabecalhosCors,
  clienteAdmin,
  criarResposta,
  recusaSeNaoForGestor,
} from '../_shared/http.ts';

/** O mesmo domínio de src/lib/sessao.ts (DOMINIO_ALUNO) */
const DOMINIO = 'aluno.favelaware.invalid';
const LOGIN_VALIDO = /^[a-z0-9]+(\.[a-z0-9]+)*$/;
const TAMANHO_MINIMO_SENHA = 8;
const TAMANHO_MAXIMO_SENHA = 72; // limite do bcrypt
/** A mesma política de src/lib/senha.ts: maiúscula, minúscula, número e caractere especial */
const SENHA_FORTE = [/[A-Z]/, /[a-z]/, /[0-9]/, /[!-/:-@[-`{-~]/];
const MAXIMO_DE_ALUNOS = 200;

const CORS = cabecalhosCors('POST, OPTIONS');
const resposta = criarResposta(CORS);

interface Aluno {
  id: number;
  nome: string;
  login: string | null;
  funcao: string;
  edicoes: unknown;
}

interface Ignorado {
  nome: string;
  motivo: string;
  status: StatusProcessamento;
}

/** "Maria da Silva Santos" -> "maria.santos" (primeiro e último nome, sem acento) */
function loginDoNome(nome: string): string {
  const partes = nome
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return partes.length > 1 ? `${partes[0]}.${partes[partes.length - 1]}` : (partes[0] ?? '');
}

/** Cria ou redefine o acesso de cada aluno e junta o resultado */
class ServicoAcessos {
  criados = 0;
  redefinidos = 0;
  ignorados: Ignorado[] = [];

  constructor(
    private admin: SupabaseClient,
    private senha: string,
  ) {}

  ignorar(aluno: Aluno, motivo: string, status: StatusProcessamento = StatusProcessamento.ExcecaoNegocio) {
    this.ignorados.push({ nome: aluno.nome, motivo, status });
  }

  /** Volta para a senha padrão e para o primeiro acesso */
  async redefinir(aluno: Aluno, conta: string | undefined): Promise<void> {
    if (!conta) return this.ignorar(aluno, 'ainda não tem acesso');

    // A troca obrigatória vem ANTES da senha padrão: se a senha voltasse e a
    // marcação falhasse, a conta ficaria com uma senha que o gestor conhece e
    // sem obrigação de troca.
    const { error: erroMarcacao } = await this.admin
      .from('perfis')
      .update({ precisa_trocar_senha: true })
      .eq('id', conta);
    if (erroMarcacao) {
      console.error('[acessos-alunos] redefinir: não marcou a troca obrigatória', erroMarcacao.code);
      return this.ignorar(aluno, 'não foi possível redefinir agora', StatusProcessamento.ExcecaoSistema);
    }

    const { error } = await this.admin.auth.admin.updateUserById(conta, { password: this.senha });
    if (error) {
      console.error('[acessos-alunos] redefinir: não trocou a senha', error.code);
      return this.ignorar(
        aluno,
        'não foi possível trocar a senha; a troca obrigatória ficou marcada e o aluno entra com a senha antiga',
        StatusProcessamento.ExcecaoSistema,
      );
    }
    this.redefinidos++;
  }

  /** Cria a conta com a senha padrão e liga ao aluno da turma */
  async criar(aluno: Aluno, conta: string | undefined): Promise<void> {
    if (conta) return this.ignorar(aluno, 'já tem acesso');
    const login = (aluno.login ?? '').trim().toLowerCase() || loginDoNome(aluno.nome);
    if (!LOGIN_VALIDO.test(login)) return this.ignorar(aluno, `login inválido ("${login}"): corrija na ficha do aluno`);

    const { data: criado, error } = await this.admin.auth.admin.createUser({
      email: `${login}@${DOMINIO}`,
      password: this.senha,
      email_confirm: true, // não manda e-mail (o domínio nem existe)
      user_metadata: { nome: aluno.nome },
    });
    if (error || !criado.user) {
      const jaExiste = /already|exists|registered/i.test(error?.message ?? '');
      return jaExiste
        ? this.ignorar(aluno, `o login "${login}" já é usado por outra conta`)
        : this.ignorar(aluno, 'não foi possível criar a conta', StatusProcessamento.ExcecaoSistema);
    }

    // O gatilho do banco já criou o perfil (como aluno); liga ao aluno da turma
    const { error: erroPerfil } = await this.admin
      .from('perfis')
      .update({ participante_id: aluno.id, precisa_trocar_senha: true, nome: aluno.nome })
      .eq('id', criado.user.id);
    if (erroPerfil) {
      await this.admin.auth.admin.deleteUser(criado.user.id); // não deixa conta solta
      return this.ignorar(aluno, 'não foi possível ligar a conta ao aluno', StatusProcessamento.ExcecaoSistema);
    }
    this.criados++;

    // Guarda o login gerado, para o gestor informar ao aluno. A conta já existe:
    // se falhar, avisa com o login para ele não se perder.
    if (!aluno.login) {
      const { error: erroLogin } = await this.admin.from('participantes').update({ login }).eq('id', aluno.id);
      if (erroLogin) {
        this.ignorar(
          aluno,
          `acesso criado com o login "${login}", mas ele não foi salvo na ficha: anote e corrija a ficha`,
          StatusProcessamento.ExcecaoSistema,
        );
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido' });

  const admin = clienteAdmin();

  // 1. Só gestor
  const recusa = await recusaSeNaoForGestor(admin, req, 'Só o gestor cria acessos de alunos.');
  if (recusa) return resposta(recusa.http, { erro: recusa.erro });

  // 2. Pedido
  let corpo: { acao?: unknown; participantes?: unknown; senha?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return resposta(400, { erro: 'Pedido inválido.' });
  }
  const acao = corpo.acao === 'redefinir' ? 'redefinir' : corpo.acao === 'criar' ? 'criar' : null;
  const ids = Array.isArray(corpo.participantes)
    ? corpo.participantes.filter((i): i is number => Number.isInteger(i))
    : [];
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  if (!acao) return resposta(400, { erro: 'Ação inválida.' });
  if (!ids.length || ids.length > MAXIMO_DE_ALUNOS) {
    return resposta(400, { erro: `Escolha de 1 a ${MAXIMO_DE_ALUNOS} alunos.` });
  }
  if (senha.length < TAMANHO_MINIMO_SENHA || senha.length > TAMANHO_MAXIMO_SENHA) {
    return resposta(400, {
      erro: `A senha padrão precisa ter de ${TAMANHO_MINIMO_SENHA} a ${TAMANHO_MAXIMO_SENHA} caracteres.`,
    });
  }
  if (!SENHA_FORTE.every((regra) => regra.test(senha))) {
    return resposta(400, {
      erro: 'A senha padrão precisa ter letra maiúscula, letra minúscula, número e caractere especial.',
    });
  }

  // 3. Alunos e contas já ligadas (sem as contas não dá para saber quem já tem acesso)
  const { data: alunos, error: erroAlunos } = await admin
    .from('participantes')
    .select('id, nome, login, funcao, edicoes(demonstracao)')
    .in('id', ids);
  if (erroAlunos) return resposta(500, { erro: 'Não foi possível ler os alunos.' });

  const { data: ligados, error: erroLigados } = await admin
    .from('perfis')
    .select('id, participante_id')
    .in('participante_id', ids);
  if (erroLigados) return resposta(500, { erro: 'Não foi possível conferir quem já tem acesso.' });
  const contaDoAluno = new Map((ligados ?? []).map((l) => [l.participante_id as number, l.id as string]));

  // 4. Um aluno por vez
  const servico = new ServicoAcessos(admin, senha);
  for (const aluno of (alunos ?? []) as Aluno[]) {
    // O aluno da edição de demonstração é usado pelo "Ver como"; não ganha login
    if ((aluno.edicoes as { demonstracao: boolean } | null)?.demonstracao) {
      servico.ignorar(aluno, 'aluno de demonstração (use "Ver como → Aluno")');
      continue;
    }
    if (aluno.funcao !== 'aluno') continue;
    const conta = contaDoAluno.get(aluno.id);
    if (acao === 'redefinir') await servico.redefinir(aluno, conta);
    else await servico.criar(aluno, conta);
  }

  return resposta(200, { criados: servico.criados, redefinidos: servico.redefinidos, ignorados: servico.ignorados });
});
