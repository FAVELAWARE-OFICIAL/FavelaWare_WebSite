/**
 * ============================================
 * PONTO DOS PROFESSORES
 * ============================================
 *
 * O professor marca o próprio dia: P (presente), F (falta) ou J (justificada).
 * Sem localização: os professores são de confiança. O gestor vê e corrige todos.
 * Quem grava é a função registrar_ponto do banco (as regras RLS valem lá dentro).
 */
import type { Justificativa } from './atestados';
import { CODIGO_REGRA_DO_BANCO, codigoDoErro } from './banco';
import { servicoEquipe, type ProfessorAtual } from './equipe';
import { servicoSessao } from './sessao';
import { supabase } from './supabase';

export type SituacaoPonto = 'presente' | 'ausente' | 'justificada';

/**
 * Letra, nome e cor de cada marcação. É F de falta, como o professor está
 * acostumado; na chamada dos alunos a falta é A (ver OPCOES_CHAMADA).
 */
export const OPCOES_PONTO: { valor: SituacaoPonto; letra: string; rotulo: string; classe: string }[] = [
  {
    valor: 'presente',
    letra: 'P',
    rotulo: 'Presente',
    classe: 'bg-favela-green-500 border-favela-green-500 text-[#2d2a5f]',
  },
  { valor: 'ausente', letra: 'F', rotulo: 'Falta', classe: 'bg-red-600 border-red-600 text-white' },
  {
    valor: 'justificada',
    letra: 'J',
    rotulo: 'Falta justificada',
    classe: 'bg-amber-400 border-amber-400 text-gray-900',
  },
];

export const opcaoDoPonto = (valor: SituacaoPonto) => OPCOES_PONTO.find((o) => o.valor === valor)!;

export interface Ponto {
  professor_id: string;
  data: string;
  situacao: SituacaoPonto;
  registrado_em: string;
  justificativa: string | null;
  atestado_id: string | null;
}

/** Quantos pontos recentes aparecem no histórico do professor */
export const QUANTIDADE_NO_HISTORICO = 90;

/** Chave do cache (ver lib/cache.ts) */
export const CHAVE_MEUS_PONTOS = 'meus-pontos';

export interface MeusPontos {
  /** Só quem tem papel de professor bate ponto (o gestor entra na área, mas não bate) */
  souProfessor: boolean;
  pontos: Ponto[];
}

export interface PontosDaEquipe {
  professores: ProfessorAtual[];
  pontos: Ponto[];
}

export class ServicoPonto {
  /**
   * Marca (ou desmarca, com situação nula) o ponto de um dia. Sem professor = o próprio.
   * Com J, leva a justificativa e o atestado (o banco apaga os dois nas outras marcações).
   */
  async registrar(
    data: string,
    situacao: SituacaoPonto | null,
    professorId?: string,
    justificativa?: Justificativa,
  ): Promise<void> {
    const { error } = await supabase.rpc('registrar_ponto', {
      p_data: data,
      p_situacao: situacao,
      ...(professorId ? { p_professor: professorId } : {}),
      ...(justificativa ? { p_justificativa: justificativa.texto, p_atestado: justificativa.atestadoId } : {}),
    });
    if (error) throw error;
  }

  /**
   * Os pontos mais recentes de quem está logado.
   * Filtra pelo próprio id: a RLS deixa o gestor ler os de todos.
   */
  async carregarMeus(): Promise<MeusPontos> {
    const { conta, perfil } = await servicoSessao.exigirContaLogada();
    if (perfil.papel !== 'professor') return { souProfessor: false, pontos: [] };

    const { data, error } = await supabase
      .from('pontos_professores')
      .select('professor_id, data, situacao, registrado_em, justificativa, atestado_id')
      .eq('professor_id', conta.id)
      .order('data', { ascending: false })
      .limit(QUANTIDADE_NO_HISTORICO);
    if (error) throw error;
    return { souProfessor: true, pontos: data as Ponto[] };
  }

  /**
   * O dia escolhido está coberto pelo histórico carregado? Com o histórico
   * cheio, um dia mais antigo que o último da lista pode ter ponto no banco.
   */
  diaEstaNoHistorico(pontos: Ponto[], dia: string): boolean {
    return pontos.length < QUANTIDADE_NO_HISTORICO || dia >= pontos[pontos.length - 1].data;
  }

  /** A marcação de quem está logado num dia fora do histórico (null = sem ponto) */
  async carregarMeuDia(dia: string): Promise<SituacaoPonto | null> {
    const { conta } = await servicoSessao.exigirContaLogada();
    const { data, error } = await supabase
      .from('pontos_professores')
      .select('situacao, justificativa, atestado_id')
      .eq('professor_id', conta.id)
      .eq('data', dia)
      .maybeSingle();
    if (error) throw error;
    return (data?.situacao as SituacaoPonto | undefined) ?? null;
  }

  /** Gestor: professores atuais e os pontos de todos num período */
  async carregarDaEquipe(de: string, ate: string): Promise<PontosDaEquipe> {
    const [professores, pontos] = await Promise.all([
      servicoEquipe.listarProfessores(),
      supabase
        .from('pontos_professores')
        .select('professor_id, data, situacao, registrado_em, justificativa, atestado_id')
        .gte('data', de)
        .lte('data', ate)
        .order('data'),
    ]);
    if (pontos.error) throw pontos.error;
    return { professores, pontos: pontos.data as Ponto[] };
  }

  /** Texto para o usuário a partir do erro do banco (o detalhe técnico vai para o console) */
  mensagemDoErro(erro: unknown): string {
    const codigo = codigoDoErro(erro);
    console.error('[ponto] falha ao salvar', codigo, (erro as { message?: string } | null)?.message);
    if (codigo === CODIGO_REGRA_DO_BANCO)
      return 'Esse dia ainda não chegou no horário de Brasília. Escolha hoje ou um dia anterior.';
    if (codigo === '42501') return 'Só dá para marcar o ponto de quem é instrutor.';
    return 'Não foi possível salvar o ponto. Tente de novo.';
  }
}

export const servicoPonto = new ServicoPonto();
