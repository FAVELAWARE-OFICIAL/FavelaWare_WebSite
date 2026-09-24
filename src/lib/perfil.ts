/**
 * ============================================
 * MEU PERFIL
 * ============================================
 *
 * Dados que cada pessoa vê e altera na tela "Meu perfil":
 * - gestor e professor: nome de exibição;
 * - aluno: data de nascimento e e-mail de contato (o nome é o oficial da turma).
 * A senha fica em lib/senha.ts.
 *
 * O banco não deixa ninguém mexer direto no próprio perfil (isso abriria o
 * papel): os dados passam pelas funções atualizar_meu_perfil e
 * atualizar_meus_dados_de_aluno, que só alteram a coluna certa.
 */
import { emailValido, normalizarGithub, normalizarLinkedin } from '../utils/texto';
import { CODIGO_REGRA_DO_BANCO, codigoDoErro } from './banco';
import { servicoFotoPadronizada } from './fotoPadronizada';
import { servicoSessao, type Papel } from './sessao';
import { supabase } from './supabase';

/** Avisa a barra superior que o nome mudou (ela relê o perfil) */
export const EVENTO_PERFIL_ALTERADO = 'perfil-alterado';

export interface MeusDados {
  papel: Papel | null;
  nome: string;
  /** Login (aluno) ou e-mail de acesso (equipe) */
  acesso: string;
  /** Foto do perfil (aluno: a da ficha da turma); sem foto, o avatar padrão */
  foto: string | null;
  /** Líder discente (todas as personas): a foto dela é sempre a do perfil */
  todasAsPersonas: boolean;
  /** Redes e contato (qualquer papel). No site aparece só o LinkedIn */
  redes: RedesDoPerfil;
  /** Só aluno ligado a uma turma */
  aluno: { dataNascimento: string; email: string } | null;
}

export interface RedesDoPerfil {
  linkedin: string;
  github: string;
  /** Gmail ou outro e-mail de contato (o aluno usa o e-mail de contato da ficha) */
  emailContato: string;
}

export class ServicoPerfil {
  async carregarMeusDados(): Promise<MeusDados> {
    const { conta, perfil } = await servicoSessao.exigirContaLogada();
    const dados: MeusDados = {
      papel: perfil.papel,
      nome: perfil.nome ?? '',
      acesso: servicoSessao.identificadorDoEmail(conta.email ?? ''),
      foto: perfil.foto,
      todasAsPersonas: perfil.podeAlternarPapel,
      redes: { linkedin: '', github: '', emailContato: '' },
      aluno: null,
    };

    const { data: redes, error: erroRedes } = await supabase
      .from('perfis')
      .select('linkedin, github, email_contato')
      .eq('id', conta.id)
      .single();
    if (erroRedes) throw erroRedes;
    dados.redes = {
      linkedin: redes.linkedin ?? '',
      github: redes.github ?? '',
      emailContato: redes.email_contato ?? '',
    };

    if (perfil.papel === 'aluno' && perfil.participanteId) {
      const { data, error } = await supabase
        .from('participantes')
        .select('nome, data_nascimento, email, foto')
        .eq('id', perfil.participanteId)
        .single();
      if (error) throw error;
      dados.nome = data.nome;
      // A mesma foto que a troca grava (atualizar_minha_foto): a da ficha, fora a líder vendo como aluno
      if (!perfil.podeAlternarPapel) dados.foto = data.foto ?? dados.foto;
      dados.aluno = { dataNascimento: data.data_nascimento ?? '', email: data.email ?? '' };
    }
    return dados;
  }

  /** Gestor e professor: nome de exibição */
  async salvarNome(nome: string): Promise<void> {
    const { error } = await supabase.rpc('atualizar_meu_perfil', { p_nome: nome });
    if (error) throw error;
    this.avisarQueMudou();
  }

  /** Aluno: data de nascimento e e-mail de contato */
  async salvarDadosDeAluno(dataNascimento: string, email: string): Promise<void> {
    const { error } = await supabase.rpc('atualizar_meus_dados_de_aluno', {
      p_data_nascimento: dataNascimento,
      p_email: email,
    });
    if (error) throw error;
    this.avisarQueMudou();
  }

  /**
   * A própria foto (qualquer papel), no padrão do site. O aluno troca a da ficha
   * da turma; os outros, a do perfil. O banco confere que a foto foi enviada
   * pela própria pessoa. Devolve a URL nova.
   */
  async trocarMinhaFoto(arquivo: File, fotoAntiga: string | null): Promise<string> {
    const url = await servicoFotoPadronizada.trocar(
      arquivo,
      'perfis',
      async (nova) => {
        const { error } = await supabase.rpc('atualizar_minha_foto', { p_foto: nova });
        if (!error) return;
        console.error('[perfil] foto enviada, mas não gravada', codigoDoErro(error));
        throw new Error('Não foi possível salvar a foto.');
      },
      fotoAntiga,
    );
    this.avisarQueMudou();
    return url;
  }

  /**
   * Redes e contato: confere e completa o que a pessoa colou antes de gravar.
   * Devolve o problema (texto para a tela) ou null.
   */
  async salvarRedes(redes: RedesDoPerfil): Promise<string | null> {
    const linkedin = normalizarLinkedin(redes.linkedin);
    if (linkedin === undefined) return 'O LinkedIn precisa ser um perfil: linkedin.com/in/seu-nome.';
    const github = normalizarGithub(redes.github);
    if (github === undefined) return 'O GitHub precisa ser um usuário: github.com/seu-usuario.';
    if (redes.emailContato.trim() && !emailValido(redes.emailContato)) return 'Confira o e-mail de contato.';
    const { error } = await supabase.rpc('atualizar_minhas_redes', {
      p_linkedin: linkedin ?? '',
      p_github: github ?? '',
      p_email_contato: redes.emailContato,
    });
    if (!error) return null;
    console.error('[perfil] falha ao salvar as redes', codigoDoErro(error));
    return 'Não foi possível salvar as redes. Tente de novo.';
  }

  /** Texto para o usuário a partir do erro do banco ao salvar os dados */
  mensagemDoErro(erro: unknown, deAluno: boolean): string {
    const codigo = codigoDoErro(erro);
    console.error('[perfil] falha ao salvar', codigo); // só o código: o detalhe traz a linha com os dados
    if (codigo === '23514') return 'Confira o e-mail e a data de nascimento.';
    if (codigo === CODIGO_REGRA_DO_BANCO) {
      return deAluno ? 'Informe a data de nascimento e o e-mail.' : 'O nome precisa ter entre 2 e 80 letras.';
    }
    return 'Não foi possível salvar. Tente de novo.';
  }

  private avisarQueMudou() {
    servicoSessao.esquecerPerfil();
    window.dispatchEvent(new Event(EVENTO_PERFIL_ALTERADO));
  }
}

export const servicoPerfil = new ServicoPerfil();
