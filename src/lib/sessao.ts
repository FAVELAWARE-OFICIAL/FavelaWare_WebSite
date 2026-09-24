/**
 * ============================================
 * SESSÃO E PERFIL DE QUEM ESTÁ LOGADO
 * ============================================
 *
 * Entrar, sair, saber quem está logado e para onde a pessoa vai.
 * O perfil (papel, nome, foto...) é buscado UMA vez por sessão e reaproveitado
 * pela guarda de rota, pela barra superior e pelas páginas.
 */
import type { User } from '@supabase/supabase-js';

import { excecaoDeNegocio, excecaoDeSistema, sucesso, type ResultadoOperacao } from '../types';
import { servicoCache } from './cache';
import { definirLembrarDeMim, supabase } from './supabase';

export type Papel = 'aluno' | 'professor' | 'gestor';

export interface MeuPerfil {
  papel: Papel | null;
  nome: string | null;
  foto: string | null;
  /** Aluno da turma ligado a esta conta (só alunos com acesso criado pelo gestor) */
  participanteId: number | null;
  /** Aluno que ainda não fez o primeiro acesso (trocar senha + completar dados) */
  precisaTrocarSenha: boolean;
  /** Conta que pode "ver como" gestor, professor ou aluno */
  podeAlternarPapel: boolean;
}

/** Quem está logado e o perfil dele */
export interface ContaLogada {
  conta: User;
  perfil: MeuPerfil;
}

const PERFIL_VAZIO: MeuPerfil = {
  papel: null,
  nome: null,
  foto: null,
  participanteId: null,
  precisaTrocarSenha: false,
  podeAlternarPapel: false,
};

// Aluno entra com o login da turma (nome.sobrenome). Por trás, o Supabase Auth
// usa um e-mail interno que nunca recebe mensagem (".invalid" é reservado).
// A Edge Function acessos-alunos usa o mesmo domínio.
const DOMINIO_ALUNO = 'aluno.favelaware.invalid';

/** Área de cada papel */
const AREA_DO_PAPEL: Record<Papel, string> = { gestor: '/dashboard', professor: '/professor', aluno: '/aluno' };

/**
 * Credencial errada e e-mail inexistente dão a MESMA mensagem de propósito:
 * assim ninguém descobre quais e-mails têm conta.
 */
function traduzirErroDeLogin(codigo?: string): ResultadoOperacao {
  switch (codigo) {
    case 'invalid_credentials':
      return excecaoDeNegocio('E-mail (ou login) ou senha incorretos.');
    case 'email_not_confirmed':
      return excecaoDeNegocio('Confirme seu email antes de entrar (veja sua caixa de entrada).');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return excecaoDeNegocio('Muitas tentativas seguidas. Espere um pouco e tente de novo.');
    default:
      return excecaoDeSistema('Não foi possível entrar agora. Tente novamente em instantes.');
  }
}

export class ServicoSessao {
  private perfilEmCache: { usuarioId: string; promessa: Promise<MeuPerfil> } | null = null;
  private ultimoUsuario: string | null | undefined;

  constructor() {
    // Saiu ou trocou de conta (mesmo sem "Sair", ou em outra aba): esquece tudo o
    // que foi guardado, para os dados de uma conta nunca aparecerem para a próxima.
    supabase.auth.onAuthStateChange((evento, sessao) => {
      const usuario = sessao?.user.id ?? null;
      if (evento === 'SIGNED_OUT' || (this.ultimoUsuario !== undefined && usuario !== this.ultimoUsuario)) {
        this.perfilEmCache = null;
        servicoCache.esquecer();
      }
      this.ultimoUsuario = usuario;
    });
  }

  /** Conta logada neste navegador (lê a sessão guardada, sem ir ao servidor) */
  async contaAtual(): Promise<User | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  }

  carregarPerfil(usuarioId: string): Promise<MeuPerfil> {
    if (this.perfilEmCache?.usuarioId !== usuarioId) {
      const promessa = Promise.resolve(
        supabase
          .from('perfis')
          .select('papel, nome, foto, participante_id, precisa_trocar_senha, pode_alternar_papel')
          .eq('id', usuarioId)
          .maybeSingle(),
      ).then(({ data, error }): MeuPerfil => {
        if (error) {
          this.perfilEmCache = null; // falhou: na próxima vez tenta de novo, em vez de guardar o erro
          return PERFIL_VAZIO;
        }
        return {
          papel: (data?.papel as Papel | undefined) ?? null,
          nome: data?.nome ?? null,
          foto: data?.foto ?? null,
          participanteId: data?.participante_id ?? null,
          precisaTrocarSenha: data?.precisa_trocar_senha ?? false,
          podeAlternarPapel: data?.pode_alternar_papel ?? false,
        };
      });
      this.perfilEmCache = { usuarioId, promessa };
    }
    return this.perfilEmCache.promessa;
  }

  /** Conta conferida no servidor (para gravar quem fez a ação); null se não houver */
  async contaConferida(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  }

  /** Conta e perfil de quem está logado; null se não houver sessão */
  async contaLogada(): Promise<ContaLogada | null> {
    const conta = await this.contaAtual();
    if (!conta) return null;
    return { conta, perfil: await this.carregarPerfil(conta.id) };
  }

  /**
   * Conta e perfil para os dados que só existem com login.
   * Sem sessão ou com o perfil sem carregar (rede) é erro, não "sem papel".
   */
  async exigirContaLogada(): Promise<ContaLogada> {
    const logada = await this.contaLogada();
    if (!logada) throw new Error('Sem sessão');
    if (!logada.perfil.papel) throw new Error('Não foi possível carregar o perfil');
    return logada;
  }

  /** Esquece o perfil guardado (ex.: depois do primeiro acesso, que muda o perfil) */
  esquecerPerfil(): void {
    this.perfilEmCache = null;
  }

  /** Aluno só tem área ligado a uma turma, ou com a conta que "vê como" aluno */
  alunoTemArea(perfil: MeuPerfil): boolean {
    return Boolean(perfil.participanteId || perfil.podeAlternarPapel);
  }

  /**
   * Para onde a pessoa vai depois de entrar (null = ainda não tem área):
   * gestor -> /dashboard; professor -> /professor; aluno da turma -> /aluno
   * (ou /primeiro-acesso, se ainda não trocou a senha padrão).
   */
  destinoDoPerfil(perfil: MeuPerfil): string | null {
    if (perfil.papel === 'gestor' || perfil.papel === 'professor') return AREA_DO_PAPEL[perfil.papel];
    if (perfil.papel === 'aluno' && this.alunoTemArea(perfil)) {
      return perfil.precisaTrocarSenha ? '/primeiro-acesso' : AREA_DO_PAPEL.aluno;
    }
    return null;
  }

  /** "maria.silva" -> "maria.silva@aluno.favelaware.invalid"; e-mail fica como está */
  emailDoIdentificador(identificador: string): string {
    const limpo = identificador.trim().toLowerCase();
    return limpo.includes('@') ? limpo : `${limpo}@${DOMINIO_ALUNO}`;
  }

  /** "maria.silva@aluno.favelaware.invalid" -> "maria.silva"; e-mail da equipe fica como está */
  identificadorDoEmail(email: string): string {
    const sufixo = `@${DOMINIO_ALUNO}`;
    return email.endsWith(sufixo) ? email.slice(0, -sufixo.length) : email;
  }

  /**
   * Entra com login (aluno) ou e-mail (equipe) e senha.
   * Devolve o resultado e, se deu certo, a área da pessoa (null = sem área ainda).
   */
  async entrar(
    identificador: string,
    senha: string,
    lembrar: boolean,
  ): Promise<{ resultado: ResultadoOperacao; destino: string | null }> {
    // Precisa vir antes do login: é na hora do login que a sessão é gravada
    definirLembrarDeMim(lembrar);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: this.emailDoIdentificador(identificador),
      password: senha,
    });
    if (error) return { resultado: traduzirErroDeLogin(error.code), destino: null };
    return { resultado: sucesso(), destino: this.destinoDoPerfil(await this.carregarPerfil(data.user.id)) };
  }

  async sair(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[sessão] falha ao sair', error.code);
  }

  /** Avisa quando a sessão acabar (sair em outra aba, token expirado). Devolve o cancelamento. */
  aoEncerrar(aviso: () => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') aviso();
    });
    return () => data.subscription.unsubscribe();
  }

  /** Avisa quando uma sessão começar (ex.: o link do convite virou sessão). Devolve o cancelamento. */
  aoIniciar(aviso: () => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (sessao) aviso();
    });
    return () => data.subscription.unsubscribe();
  }

  /**
   * Troca o papel da conta autorizada ("ver como" gestor, professor ou aluno) e
   * devolve para onde ir. O banco confere a permissão (função alternar_papel).
   */
  async alternarPapel(papel: Papel): Promise<{ resultado: ResultadoOperacao; destino: string | null }> {
    const { error } = await supabase.rpc('alternar_papel', { p_papel: papel });
    if (error) {
      console.error('[ver como] falha ao trocar de papel', error.code, error.message);
      // A mensagem do banco sobre a turma de demonstração é para a pessoa ler
      return {
        resultado: /demonstra/i.test(error.message ?? '')
          ? excecaoDeNegocio(error.message)
          : excecaoDeSistema('Não foi possível trocar de papel. Tente de novo.'),
        destino: null,
      };
    }
    this.esquecerPerfil();
    servicoCache.esquecer(); // dados guardados eram do papel anterior
    return { resultado: sucesso(), destino: AREA_DO_PAPEL[papel] };
  }
}

export const servicoSessao = new ServicoSessao();
