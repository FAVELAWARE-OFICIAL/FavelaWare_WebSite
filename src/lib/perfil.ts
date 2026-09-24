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
import { CODIGO_REGRA_DO_BANCO, codigoDoErro } from './banco';
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
  /** Só aluno ligado a uma turma */
  aluno: { dataNascimento: string; email: string } | null;
}

export class ServicoPerfil {
  async carregarMeusDados(): Promise<MeusDados> {
    const { conta, perfil } = await servicoSessao.exigirContaLogada();
    const dados: MeusDados = {
      papel: perfil.papel,
      nome: perfil.nome ?? '',
      acesso: servicoSessao.identificadorDoEmail(conta.email ?? ''),
      foto: perfil.foto,
      aluno: null,
    };

    if (perfil.papel === 'aluno' && perfil.participanteId) {
      const { data, error } = await supabase
        .from('participantes')
        .select('nome, data_nascimento, email, foto')
        .eq('id', perfil.participanteId)
        .single();
      if (error) throw error;
      dados.nome = data.nome;
      dados.foto = dados.foto ?? data.foto;
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
