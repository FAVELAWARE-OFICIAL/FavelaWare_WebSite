/**
 * ============================================
 * SENHA
 * ============================================
 *
 * As três formas de definir senha, com as mesmas regras e mensagens:
 * - troca pelo "Meu perfil" (confere a senha atual antes);
 * - primeiro acesso do aluno (troca a senha padrão e completa os dados);
 * - convite do instrutor (link do e-mail).
 */
import { excecaoDeNegocio, excecaoDeSistema, sucesso, type ResultadoOperacao } from '../types';
import { CODIGO_REGRA_DO_BANCO } from './banco';
import { servicoSessao } from './sessao';
import { supabase } from './supabase';

export const TAMANHO_MINIMO_SENHA = 8;

/**
 * Política de senha do projeto. Os conjuntos são os mesmos da configuração
 * "Password requirements" do Supabase Auth (letras sem acento, dígitos e os
 * símbolos do teclado), para o site nunca aceitar o que o servidor recusa.
 * A Edge Function acessos-alunos confere a mesma regra na senha padrão.
 */
export const REQUISITOS_DA_SENHA: { id: string; texto: string; atende: (senha: string) => boolean }[] = [
  {
    id: 'tamanho',
    texto: `Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`,
    atende: (s) => s.length >= TAMANHO_MINIMO_SENHA,
  },
  { id: 'maiuscula', texto: 'Uma letra maiúscula', atende: (s) => /[A-Z]/.test(s) },
  { id: 'minuscula', texto: 'Uma letra minúscula', atende: (s) => /[a-z]/.test(s) },
  { id: 'numero', texto: 'Um número', atende: (s) => /[0-9]/.test(s) },
  {
    id: 'especial',
    texto: 'Um caractere especial (ex.: ! @ # $ %)',
    atende: (s) => /[!-/:-@[-`{-~]/.test(s),
  },
];

/** A senha cumpre toda a política? */
export const senhaForte = (senha: string) => REQUISITOS_DA_SENHA.every((r) => r.atende(senha));

export type EtapaSenha = 'conferindo' | 'salvando';

/** Mensagem do erro do Supabase ao gravar a senha */
function traduzirErroDeSenha(
  codigo: string | undefined,
  diferenteDe: string | null,
  padrao: string,
): ResultadoOperacao {
  if (codigo === 'same_password' && diferenteDe) {
    return excecaoDeNegocio(`A nova senha precisa ser diferente ${diferenteDe}.`);
  }
  if (codigo === 'weak_password') return excecaoDeNegocio('Senha fraca ou já vazada em outros sites. Escolha outra.');
  return excecaoDeSistema(padrao);
}

export class ServicoSenha {
  /** Confere a nova senha antes de enviar. Devolve o problema, ou null. */
  validarNova(senha: string, confirmacao: string, rotulo = 'A senha', asDuas = 'As duas senhas'): string | null {
    const faltando = REQUISITOS_DA_SENHA.filter((r) => !r.atende(senha)).map((r) => r.texto.toLowerCase());
    if (faltando.length) return `${rotulo} precisa ter: ${faltando.join(', ')}.`;
    if (senha !== confirmacao) return `${asDuas} não são iguais.`;
    return null;
  }

  /**
   * Troca a senha: confere a senha atual (entrando de novo com ela) e só então
   * grava a nova. Depois encerra as sessões abertas em outros aparelhos.
   */
  async trocar(atual: string, nova: string, aoMudarEtapa: (etapa: EtapaSenha) => void): Promise<ResultadoOperacao> {
    const email = (await servicoSessao.contaAtual())?.email;
    if (!email) return excecaoDeNegocio('Sua sessão terminou. Entre de novo.');

    aoMudarEtapa('conferindo');
    const conferencia = await supabase.auth.signInWithPassword({ email, password: atual });
    if (conferencia.error) {
      return excecaoDeNegocio(
        conferencia.error.status === 429
          ? 'Muitas tentativas. Espere alguns minutos e tente de novo.'
          : 'A senha atual não confere.',
      );
    }

    aoMudarEtapa('salvando');
    const troca = await supabase.auth.updateUser({ password: nova });
    if (troca.error) {
      console.error('[senha] falha ao trocar a senha', troca.error.code);
      return traduzirErroDeSenha(troca.error.code, 'da atual', 'Não foi possível trocar a senha. Tente de novo.');
    }

    // Quem estava logado com a senha antiga em outro aparelho sai
    const saida = await supabase.auth.signOut({ scope: 'others' });
    if (saida.error) console.error('[senha] senha trocada, mas não encerrou as outras sessões', saida.error.code);
    return sucesso();
  }

  /** Primeiro acesso do aluno: troca a senha padrão e grava nascimento e e-mail (libera a conta) */
  async concluirPrimeiroAcesso(
    senha: string,
    dados: { nome: string; dataNascimento: string; email: string },
  ): Promise<ResultadoOperacao> {
    const troca = await supabase.auth.updateUser({ password: senha });
    if (troca.error) {
      console.error('[senha] primeiro acesso: falha ao trocar a senha', troca.error.code);
      return traduzirErroDeSenha(
        troca.error.code,
        'da senha padrão',
        'Não foi possível trocar a senha. Tente de novo.',
      );
    }

    const { error } = await supabase.rpc('concluir_primeiro_acesso', {
      p_nome: dados.nome,
      p_data_nascimento: dados.dataNascimento,
      p_email: dados.email.trim(),
    });
    if (error) {
      console.error('[senha] primeiro acesso: falha ao salvar os dados', error.code);
      if (error.code === CODIGO_REGRA_DO_BANCO && error.message) return excecaoDeNegocio(error.message);
      return excecaoDeSistema('A senha foi trocada, mas não foi possível salvar seus dados. Tente de novo.');
    }
    servicoSessao.esquecerPerfil(); // o perfil mudou (não precisa mais trocar a senha)
    return sucesso();
  }

  /** Convite do instrutor: grava a senha e devolve a área da pessoa */
  async definirPeloConvite(senha: string): Promise<{ resultado: ResultadoOperacao; destino: string }> {
    const { data, error } = await supabase.auth.updateUser({ password: senha });
    if (error || !data.user) {
      console.error('[senha] convite: falha ao salvar a senha', error?.code);
      return {
        resultado: traduzirErroDeSenha(error?.code, null, 'Não foi possível salvar a senha. Tente de novo.'),
        destino: '/',
      };
    }
    servicoSessao.esquecerPerfil();
    return {
      resultado: sucesso(),
      destino: servicoSessao.destinoDoPerfil(await servicoSessao.carregarPerfil(data.user.id)) ?? '/',
    };
  }
}

export const servicoSenha = new ServicoSenha();
