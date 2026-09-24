/**
 * ============================================
 * DADOS DA CHAMADA (ÁREA DO PROFESSOR)
 * ============================================
 *
 * O professor só enxerga as turmas às quais o gestor o vinculou: quem filtra é
 * o banco (RLS), não este arquivo. Para o gestor, todas as turmas aparecem.
 *
 * A gravação vai pela função registrar_chamada do banco, que cria a aula do dia
 * (se ainda não existir) e grava todas as presenças numa só transação.
 */
import { supabase } from './supabase';

/** Só estas três opções na chamada feita pelo site */
export type Marcacao = 'presente' | 'ausente' | 'justificada';

export interface TurmaDoProfessor {
  id: number;
  nome: string;
  edicao: string;
}

export interface AlunoDaChamada {
  id: number;
  nome: string;
  login: string | null;
  foto: string | null;
}

export interface AulaRegistrada {
  id: number;
  data: string;
  ordem: number;
}

export async function carregarMinhasTurmas(): Promise<TurmaDoProfessor[]> {
  const { data, error } = await supabase.from('turmas').select('id, nome, edicoes(nome, ordem)');
  if (error) throw error;
  // Da edição mais recente para a mais antiga: a primeira da lista é a turma padrão.
  // A edição de demonstração tem ordem 0, então fica sempre no fim.
  return data
    .map((t) => {
      // A relação muitos-para-um volta como objeto
      const edicao = t.edicoes as unknown as { nome: string; ordem: number } | null;
      return { id: t.id, nome: t.nome, edicao: edicao?.nome ?? '', ordem: edicao?.ordem ?? 0 };
    })
    .sort((a, b) => b.ordem - a.ordem || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(({ ordem: _ordem, ...turma }) => turma);
}

export async function carregarAlunos(turmaId: number): Promise<AlunoDaChamada[]> {
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
export async function carregarAulas(turmaId: number): Promise<AulaRegistrada[]> {
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

/**
 * A aula de uma data. Se a planilha tiver duas aulas no mesmo dia, vale a de
 * menor ordem — a mesma que a função registrar_chamada edita.
 */
export function aulaDoDia(aulas: AulaRegistrada[], data: string): AulaRegistrada | undefined {
  return aulas.find((a) => a.data === data); // já vem ordenada por data e ordem
}

/** Marcações já salvas numa aula: { id do aluno: situação } */
export async function carregarMarcacoes(aulaId: number): Promise<Record<number, Marcacao>> {
  const { data, error } = await supabase.from('presencas').select('participante_id, situacao').eq('aula_id', aulaId);
  if (error) throw error;
  const marcacoes: Record<number, Marcacao> = {};
  for (const p of data) {
    // "folga" é só de professor; aqui só entram as três opções da chamada
    if (p.situacao === 'presente' || p.situacao === 'ausente' || p.situacao === 'justificada') {
      marcacoes[p.participante_id] = p.situacao;
    }
  }
  return marcacoes;
}

/** Grava a chamada do dia. Aluno sem marcação fica (ou volta a ficar) sem registro. */
export async function salvarChamada(
  turmaId: number,
  data: string,
  alunos: AlunoDaChamada[],
  marcacoes: Record<number, Marcacao | undefined>,
): Promise<void> {
  const { error } = await supabase.rpc('registrar_chamada', {
    p_turma_id: turmaId,
    p_data: data,
    p_registros: alunos.map((a) => ({ participante_id: a.id, situacao: marcacoes[a.id] ?? null })),
  });
  if (error) throw error;
}

/** Data de hoje no fuso do navegador, no formato do banco (AAAA-MM-DD) */
export function hoje(): string {
  const d = new Date();
  const doisDigitos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}
