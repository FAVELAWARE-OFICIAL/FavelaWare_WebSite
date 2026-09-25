/**
 * ============================================
 * EQUIPE (PROFESSORES) — ÁREA DO GESTOR
 * ============================================
 *
 * Cadastro de professores e vínculo com as turmas.
 * - Cadastrar exige a chave secreta do Supabase (criar conta + mandar convite),
 *   então passa pela Edge Function "convidar-professor", que roda no servidor.
 * - Vincular/desvincular turma e tirar o acesso são gravações diretas: o banco
 *   só aceita porque quem está logado é gestor (RLS).
 */
import { StatusProcessamento, sucesso, type ResultadoOperacao } from '../types';
import { resultadoDaFuncao } from './banco';
import { servicoFotoPadronizada } from './fotoPadronizada';
import type { Papel } from './sessao';
import { supabase } from './supabase';
import { servicoTurmas, type TurmaComEdicao } from './turmas';

/** Professor atual (papel professor), como o gestor vê na equipe e no ponto */
export interface ProfessorAtual {
  id: string;
  nome: string | null;
  email: string | null;
  /** Foto no padrão do site (círculo verde); sem foto, o avatar padrão */
  foto: string | null;
}

/** Pessoa da equipe (qualquer conta que não é de aluno), na tela Equipe */
export interface MembroDaEquipe {
  id: string;
  nome: string | null;
  email: string | null;
  foto: string | null;
  papel: Papel;
  /** A dona do portal: tem todas as personas ("Ver como"); a função dela só ela muda */
  todasAsPersonas: boolean;
  /** Vínculo (Mundiale, AOPA, Ânima...) e cargo: saem no cartão da página Sobre e do Hall da Fama */
  organizacao: string | null;
  cargo: string | null;
}

/** Funções que o gestor pode dar na tela Equipe (aluno tem acesso pela turma) */
export const FUNCOES_DA_EQUIPE: Papel[] = ['gestor', 'professor', 'parceiro', 'banca'];

/** Funções de quem entra pela tela Membros (a banca entra pela Avaliação, já ligada à edição) */
export const FUNCOES_DE_NOVO_MEMBRO = ['gestor', 'professor', 'parceiro'] as const satisfies readonly Papel[];
export type FuncaoDeNovoMembro = (typeof FUNCOES_DE_NOVO_MEMBRO)[number];

export interface Professor extends ProfessorAtual {
  turmas: number[];
}

/** Chave do cache (ver lib/cache.ts) e a carga completa da página Equipe */
export const CHAVE_EQUIPE = 'equipe';

export class ServicoEquipe {
  async carregar(): Promise<{ turmas: TurmaComEdicao[]; professores: Professor[] }> {
    const [turmas, professores] = await Promise.all([servicoTurmas.carregarComEdicao(), this.carregarProfessores()]);
    return { turmas, professores };
  }

  /** Gestor: os professores atuais, por nome (a equipe e o ponto usam a mesma lista) */
  async listarProfessores(): Promise<ProfessorAtual[]> {
    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome, email, foto')
      .eq('papel', 'professor')
      .order('nome');
    if (error) throw error;
    return data;
  }

  /** Gestor: todas as contas da equipe (sem alunos), por nome */
  async listarMembros(): Promise<MembroDaEquipe[]> {
    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome, email, foto, papel, pode_alternar_papel, organizacao, cargo')
      .or('papel.neq.aluno,pode_alternar_papel.eq.true')
      .order('nome');
    if (error) throw error;
    return data.map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      foto: p.foto,
      papel: p.papel as Papel,
      todasAsPersonas: p.pode_alternar_papel,
      organizacao: p.organizacao,
      cargo: p.cargo,
    }));
  }

  /**
   * Gestor: vínculo e cargo da pessoa (vazio apaga). Gestor, parceiro e a líder
   * discente só aparecem no site com cargo; o instrutor sem cargo sai como "Instrutor(a)".
   */
  async salvarVinculoECargo(id: string, vinculo: { organizacao: string; cargo: string }): Promise<string | null> {
    const { data, error } = await supabase
      .from('perfis')
      .update({ organizacao: vinculo.organizacao.trim() || null, cargo: vinculo.cargo.trim() || null })
      .eq('id', id)
      .select('id');
    // Sem erro e sem linha: a RLS recusou (quem salvou não é gestor)
    if (!error && data.length) return null;
    if (!error) return 'Só a coordenação define o vínculo e o cargo.';
    console.error('[equipe] falha ao salvar vínculo e cargo', error.code);
    return error.code === '23514'
      ? 'Vínculo e cargo têm até 60 letras, sem < e >.'
      : 'Não foi possível salvar o vínculo e o cargo.';
  }

  /** Gestor: troca a função da pessoa (o banco não deixa mexer na dona nem dar todas as personas) */
  async trocarFuncao(id: string, papel: Papel): Promise<string | null> {
    const { data, error } = await supabase.from('perfis').update({ papel }).eq('id', id).select('id');
    // Sem erro e sem linha: a RLS recusou (quem troca não é gestor)
    if (!error && data.length) return null;
    if (!error) return 'Só a coordenação troca a função das pessoas.';
    console.error('[equipe] falha ao trocar a função', error.code);
    return error.code === '42501' && error.message ? error.message : 'Não foi possível trocar a função.';
  }

  private async carregarProfessores(): Promise<Professor[]> {
    const [perfis, vinculos] = await Promise.all([
      this.listarProfessores(),
      supabase.from('professores_turmas').select('professor_id, turma_id'),
    ]);
    if (vinculos.error) throw vinculos.error;
    return perfis.map((p) => ({
      ...p,
      turmas: vinculos.data.filter((v) => v.professor_id === p.id).map((v) => v.turma_id),
    }));
  }

  /**
   * Convida por e-mail (a pessoa cria a senha pelo link). Devolve a conta.
   * - "professor": cadastra o instrutor e vincula às turmas;
   * - "banca": membro da banca avaliadora; se o e-mail já tem conta, só devolve
   *   a conta existente (convidado = false), sem mudar o papel dela.
   */
  async convidar(
    nome: string,
    email: string,
    turmas: number[],
    papel: 'professor' | 'banca' = 'professor',
  ): Promise<{ resultado: ResultadoOperacao; contaId?: string; convidado?: boolean }> {
    const { data, error } = await supabase.functions.invoke('convidar-professor', {
      // A banca entra direto na avaliação pelo link do convite (sem criar senha)
      body: {
        nome,
        email,
        turmas,
        papel,
        redirecionar_para: `${window.location.origin}${papel === 'banca' ? '/banca' : '/definir-senha'}`,
      },
    });
    if (!error) {
      const conta = data as { id?: string; convidado?: boolean } | null;
      return { resultado: sucesso(), contaId: conta?.id, convidado: conta?.convidado ?? true };
    }
    // A função devolve { erro: "mensagem em português" } nos erros esperados
    return {
      resultado: await resultadoDaFuncao(error, 'Não foi possível cadastrar agora. Tente de novo em instantes.'),
    };
  }

  /**
   * Gestor, na tela Membros: convida por e-mail já com a função. O convite do
   * servidor só cria instrutor (sem turma); gestor e parceiro são a troca de
   * função logo em seguida, que o banco só aceita de gestor.
   * Devolve o erro do convite, ou o aviso se o convite saiu e a troca falhou.
   */
  async adicionarMembro(
    nome: string,
    email: string,
    papel: FuncaoDeNovoMembro,
  ): Promise<{ resultado: ResultadoOperacao; aviso?: string }> {
    const { resultado, contaId } = await this.convidar(nome, email, []);
    if (resultado.status !== StatusProcessamento.Sucesso || papel === 'professor') return { resultado };
    const falha = contaId ? await this.trocarFuncao(contaId, papel) : 'O convite não devolveu a conta.';
    if (!falha) return { resultado };
    console.error('[equipe] convite enviado, mas a função não foi trocada');
    return { resultado, aviso: `${falha} A pessoa ficou como instrutor(a): troque a função na lista.` };
  }

  /**
   * Foto do instrutor no padrão do site (círculo verde): aparece na equipe da
   * página Sobre. Troca a antiga, que sai do Storage. Devolve a URL nova.
   */
  async trocarFoto(professorId: string, arquivo: File, fotoAntiga: string | null): Promise<string> {
    return servicoFotoPadronizada.trocar(
      arquivo,
      'equipe',
      async (url) => {
        const { error } = await supabase.from('perfis').update({ foto: url }).eq('id', professorId);
        if (!error) return;
        console.error('[equipe] foto enviada, mas não gravada no perfil', error.code);
        throw new Error('Não foi possível salvar a foto.');
      },
      fotoAntiga,
    );
  }

  async vincularTurma(professorId: string, turmaId: number, vincular: boolean): Promise<void> {
    const { error } = vincular
      ? await supabase.from('professores_turmas').insert({ professor_id: professorId, turma_id: turmaId })
      : await supabase.from('professores_turmas').delete().eq('professor_id', professorId).eq('turma_id', turmaId);
    if (error) throw error;
  }

  /**
   * Remove o professor da equipe: tira o papel de professor e os vínculos com as
   * turmas. A conta de login continua existindo (sem acesso a nada), e as
   * chamadas que ele já fez ficam no histórico.
   */
  async remover(professorId: string): Promise<void> {
    const { error } = await supabase.from('perfis').update({ papel: 'aluno' }).eq('id', professorId);
    if (error) throw error;
    const { error: erroVinculos } = await supabase.from('professores_turmas').delete().eq('professor_id', professorId);
    if (erroVinculos) throw erroVinculos;
  }
}

export const servicoEquipe = new ServicoEquipe();
