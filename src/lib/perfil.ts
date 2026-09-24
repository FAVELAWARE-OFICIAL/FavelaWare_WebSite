/**
 * ============================================
 * MEU PERFIL
 * ============================================
 *
 * Dados que cada pessoa vê e altera na tela "Meu perfil":
 * - gestor e professor: nome de exibição;
 * - aluno: data de nascimento e e-mail de contato (o nome é o oficial da turma);
 * - todos: a senha, conferindo antes a senha atual.
 *
 * O banco não deixa ninguém mexer direto no próprio perfil (isso abriria o
 * papel): os dados passam pelas funções atualizar_meu_perfil e
 * atualizar_meus_dados_de_aluno, que só alteram a coluna certa.
 */
import { carregarPerfil, esquecerPerfil, supabase, type Papel } from './supabase';

export const TAMANHO_MINIMO_SENHA = 8;

/** Avisa a barra superior que o nome mudou (ela relê o perfil) */
export const EVENTO_PERFIL_ALTERADO = 'perfil-alterado';

export interface MeusDados {
  papel: Papel | null;
  nome: string;
  /** Login (aluno) ou e-mail de acesso (equipe) */
  acesso: string;
  /** Só aluno ligado a uma turma */
  aluno: { dataNascimento: string; email: string } | null;
}

const DOMINIO_ALUNO = '@aluno.favelaware.invalid';

export async function carregarMeusDados(): Promise<MeusDados> {
  const { data: sessao } = await supabase.auth.getSession();
  const conta = sessao.session?.user;
  if (!conta) throw new Error('Sem sessão');
  const perfil = await carregarPerfil(conta.id);
  if (!perfil.papel) throw new Error('Não foi possível carregar o perfil');

  const email = conta.email ?? '';
  const dados: MeusDados = {
    papel: perfil.papel,
    nome: perfil.nome ?? '',
    acesso: email.endsWith(DOMINIO_ALUNO) ? email.slice(0, -DOMINIO_ALUNO.length) : email,
    aluno: null,
  };

  if (perfil.papel === 'aluno' && perfil.participanteId) {
    const { data, error } = await supabase
      .from('participantes')
      .select('nome, data_nascimento, email')
      .eq('id', perfil.participanteId)
      .single();
    if (error) throw error;
    dados.nome = data.nome;
    dados.aluno = { dataNascimento: data.data_nascimento ?? '', email: data.email ?? '' };
  }
  return dados;
}

function avisarQueMudou() {
  esquecerPerfil();
  window.dispatchEvent(new Event(EVENTO_PERFIL_ALTERADO));
}

/** Gestor e professor: nome de exibição */
export async function salvarNome(nome: string): Promise<void> {
  const { error } = await supabase.rpc('atualizar_meu_perfil', { p_nome: nome });
  if (error) throw error;
  avisarQueMudou();
}

/** Aluno: data de nascimento e e-mail de contato */
export async function salvarDadosDeAluno(dataNascimento: string, email: string): Promise<void> {
  const { error } = await supabase.rpc('atualizar_meus_dados_de_aluno', {
    p_data_nascimento: dataNascimento,
    p_email: email,
  });
  if (error) throw error;
  avisarQueMudou();
}

export type EtapaSenha = 'conferindo' | 'salvando';

/**
 * Troca a senha: confere a senha atual (entrando de novo com ela) e só então
 * grava a nova. Depois encerra as sessões abertas em outros aparelhos.
 * Devolve null se deu certo, ou o texto do erro para mostrar.
 */
export async function trocarSenha(
  atual: string,
  nova: string,
  aoMudarEtapa: (etapa: EtapaSenha) => void,
): Promise<string | null> {
  const { data: sessao } = await supabase.auth.getSession();
  const email = sessao.session?.user.email;
  if (!email) return 'Sua sessão terminou. Entre de novo.';

  aoMudarEtapa('conferindo');
  const conferencia = await supabase.auth.signInWithPassword({ email, password: atual });
  if (conferencia.error) {
    return conferencia.error.status === 429
      ? 'Muitas tentativas. Espere alguns minutos e tente de novo.'
      : 'A senha atual não confere.';
  }

  aoMudarEtapa('salvando');
  const troca = await supabase.auth.updateUser({ password: nova });
  if (troca.error) {
    console.error('[perfil] falha ao trocar a senha', troca.error.code);
    return troca.error.code === 'same_password'
      ? 'A nova senha precisa ser diferente da atual.'
      : troca.error.code === 'weak_password'
        ? 'Senha fraca ou já vazada em outros sites. Escolha outra.'
        : 'Não foi possível trocar a senha. Tente de novo.';
  }

  // Quem estava logado com a senha antiga em outro aparelho sai
  const saida = await supabase.auth.signOut({ scope: 'others' });
  if (saida.error) console.error('[perfil] senha trocada, mas não encerrou as outras sessões', saida.error.code);
  return null;
}

/** Texto para o usuário a partir do erro do banco ao salvar os dados */
export function mensagemDoErroDePerfil(erro: unknown, deAluno: boolean): string {
  console.error('[perfil] falha ao salvar', (erro as { code?: string } | null)?.code); // só o código: o detalhe traz a linha com os dados
  const codigo = (erro as { code?: string } | null)?.code;
  if (codigo === '23514') return 'Confira o e-mail e a data de nascimento.';
  if (codigo === '22023') return deAluno ? 'Informe a data de nascimento e o e-mail.' : 'O nome precisa ter entre 2 e 80 letras.';
  return 'Não foi possível salvar. Tente de novo.';
}
