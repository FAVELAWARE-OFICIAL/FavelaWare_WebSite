/**
 * ============================================
 * CHAMADA (PRESENÇA DOS ALUNOS)
 * ============================================
 *
 * O professor só enxerga as turmas às quais o gestor o vinculou: quem filtra é
 * o banco (RLS), não este arquivo. Para o gestor, todas as turmas aparecem.
 *
 * - O professor grava a chamada do dia pela função registrar_chamada do banco,
 *   que cria a aula (se ainda não existir) e grava as presenças numa transação.
 * - O gestor corrige uma célula da planilha de chamada.
 */
import type { Justificativa } from './atestados';
import { supabase } from './supabase';

/** Só estas três opções na chamada feita pelo site ("folga" é só de professor) */
export type Marcacao = 'presente' | 'ausente' | 'justificada';

/**
 * As três opções da chamada: letra no botão, nome completo para leitor de tela.
 * É A de ausente, a letra das planilhas; no ponto do professor a falta é F.
 */
export const OPCOES_CHAMADA: { valor: Marcacao; letra: string; rotulo: string; classe: string }[] = [
  {
    valor: 'presente',
    letra: 'P',
    rotulo: 'Presente',
    classe: 'bg-favela-green-500 border-favela-green-500 text-[#2d2a5f]',
  },
  { valor: 'ausente', letra: 'A', rotulo: 'Ausente', classe: 'bg-red-600 border-red-600 text-white' },
  {
    valor: 'justificada',
    letra: 'J',
    rotulo: 'Falta justificada',
    classe: 'bg-amber-400 border-amber-400 text-gray-900',
  },
];

/** Letra gravada como registro original da marcação */
export const LETRA_DA_MARCACAO = Object.fromEntries(OPCOES_CHAMADA.map((o) => [o.valor, o.letra])) as Record<
  Marcacao,
  string
>;

export interface AlunoDaChamada {
  id: number;
  nome: string;
  login: string | null;
  foto: string | null;
}

/** Justificativa de cada aluno marcado J: { id do aluno: justificativa } */
export type JustificativasDaChamada = Record<number, Justificativa | undefined>;

export interface AulaRegistrada {
  id: number;
  data: string;
  ordem: number;
}

/**
 * A aula de uma data. Se a planilha tiver duas aulas no mesmo dia, vale a de
 * menor ordem — a mesma que a função registrar_chamada edita.
 */
export function aulaDoDia(aulas: AulaRegistrada[], data: string): AulaRegistrada | undefined {
  return aulas.find((a) => a.data === data); // já vem ordenada por data e ordem
}

export class ServicoChamada {
  async carregarAlunos(turmaId: number): Promise<AlunoDaChamada[]> {
    const { data, error } = await supabase
      .from('participantes')
      .select('id, nome, login, foto')
      .eq('turma_id', turmaId)
      .eq('funcao', 'aluno')
      .order('nome');
    if (error) throw error;
    return data;
  }

  /** Dias que já têm chamada nesta turma (mais recentes primeiro) */
  async carregarAulas(turmaId: number): Promise<AulaRegistrada[]> {
    const { data, error } = await supabase
      .from('aulas')
      .select('id, data, ordem')
      .eq('turma_id', turmaId)
      .not('data', 'is', null)
      .order('data', { ascending: false })
      .order('ordem');
    if (error) throw error;
    return data as AulaRegistrada[];
  }

  /** Marcações já salvas numa aula ({ id do aluno: situação }) e as justificativas dos J */
  async carregarMarcacoes(
    aulaId: number,
  ): Promise<{ marcacoes: Record<number, Marcacao>; justificativas: JustificativasDaChamada }> {
    const { data, error } = await supabase
      .from('presencas')
      .select('participante_id, situacao, justificativa, atestado_id')
      .eq('aula_id', aulaId);
    if (error) throw error;
    const marcacoes: Record<number, Marcacao> = {};
    const justificativas: JustificativasDaChamada = {};
    for (const p of data) {
      // "folga" é só de professor; aqui só entram as três opções da chamada
      if (p.situacao === 'presente' || p.situacao === 'ausente' || p.situacao === 'justificada') {
        marcacoes[p.participante_id] = p.situacao;
      }
      if (p.situacao === 'justificada' && (p.justificativa || p.atestado_id)) {
        justificativas[p.participante_id] = { texto: p.justificativa ?? '', atestadoId: p.atestado_id };
      }
    }
    return { marcacoes, justificativas };
  }

  /**
   * Grava a chamada do dia. Aluno sem marcação fica (ou volta a ficar) sem registro.
   * Aluno com J leva a justificativa e o atestado (o banco apaga os dois nas outras marcações).
   */
  async salvar(
    turmaId: number,
    data: string,
    alunos: AlunoDaChamada[],
    marcacoes: Record<number, Marcacao | undefined>,
    justificativas: JustificativasDaChamada = {},
  ): Promise<void> {
    const { error } = await supabase.rpc('registrar_chamada', {
      p_turma_id: turmaId,
      p_data: data,
      p_registros: alunos.map((a) => {
        const situacao = marcacoes[a.id] ?? null;
        const justificativa = situacao === 'justificada' ? justificativas[a.id] : undefined;
        return {
          participante_id: a.id,
          situacao,
          justificativa: justificativa?.texto ?? null,
          atestado_id: justificativa?.atestadoId ?? null,
        };
      }),
    });
    if (error) throw error;
  }

  /** Gestor: define a situação de um aluno numa aula (null = apaga o registro) */
  async corrigirPresenca(aulaId: number, participanteId: number, situacao: Marcacao | null): Promise<void> {
    if (!situacao) {
      const { error } = await supabase
        .from('presencas')
        .delete()
        .eq('aula_id', aulaId)
        .eq('participante_id', participanteId);
      if (error) throw error;
      return;
    }
    // Atualiza; se ainda não havia registro, insere. (upsert não serve: ele também
    // reescreve as colunas da chave, e o banco só libera alterar situação e registro.)
    const campos = { situacao, registro_original: LETRA_DA_MARCACAO[situacao] };
    const { data, error } = await supabase
      .from('presencas')
      .update(campos)
      .eq('aula_id', aulaId)
      .eq('participante_id', participanteId)
      .select('aula_id');
    if (error) throw error;
    if (data.length) return;
    const { error: erroInsercao } = await supabase
      .from('presencas')
      .insert({ ...campos, aula_id: aulaId, participante_id: participanteId });
    if (erroInsercao) throw erroInsercao;
  }
}

export const servicoChamada = new ServicoChamada();
