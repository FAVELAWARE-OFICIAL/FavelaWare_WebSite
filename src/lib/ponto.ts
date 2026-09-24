/**
 * ============================================
 * PONTO DOS PROFESSORES
 * ============================================
 *
 * O professor marca o próprio dia: P (presente), F (falta) ou J (justificada).
 * Sem localização: os professores são de confiança. O gestor vê e corrige todos.
 * Quem grava é a função registrar_ponto do banco (as regras RLS valem lá dentro).
 */
import { carregarPerfil, supabase } from './supabase';

export type SituacaoPonto = 'presente' | 'ausente' | 'justificada';

/** Letra, nome e cor de cada marcação (F de falta, como o professor está acostumado) */
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
}

/** Chave do cache (ver lib/cache.ts) */
export const CHAVE_MEUS_PONTOS = 'meus-pontos';

/** Marca (ou desmarca, com situação nula) o ponto de um dia. Sem professor = o próprio. */
export async function registrarPonto(
  data: string,
  situacao: SituacaoPonto | null,
  professorId?: string,
): Promise<void> {
  const { error } = await supabase.rpc('registrar_ponto', {
    p_data: data,
    p_situacao: situacao,
    ...(professorId ? { p_professor: professorId } : {}),
  });
  if (error) throw error;
}

export interface MeusPontos {
  /** Só quem tem papel de professor bate ponto (o gestor entra na área, mas não bate) */
  souProfessor: boolean;
  pontos: Ponto[];
}

/**
 * Os pontos de quem está logado, mais recentes primeiro.
 * Filtra pelo próprio id: a RLS deixa o gestor ler os de todos.
 */
export async function carregarMeusPontos(): Promise<MeusPontos> {
  const { data: sessao } = await supabase.auth.getSession();
  const usuarioId = sessao.session?.user.id;
  if (!usuarioId) throw new Error('Sem sessão');
  const { papel } = await carregarPerfil(usuarioId);
  // Papel nulo = o perfil não carregou (rede): é erro, não "não é professor"
  if (!papel) throw new Error('Não foi possível carregar o perfil');
  if (papel !== 'professor') return { souProfessor: false, pontos: [] };

  const { data, error } = await supabase
    .from('pontos_professores')
    .select('professor_id, data, situacao, registrado_em')
    .eq('professor_id', usuarioId)
    .order('data', { ascending: false })
    .limit(90);
  if (error) throw error;
  return { souProfessor: true, pontos: data as Ponto[] };
}

/** Texto para o usuário a partir do erro do banco (o detalhe técnico vai para o console) */
export function mensagemDoErroDePonto(erro: unknown): string {
  console.error('[ponto] falha ao salvar', erro);
  const codigo = (erro as { code?: string } | null)?.code;
  if (codigo === '22023') return 'Esse dia ainda não chegou no horário de Brasília. Escolha hoje ou um dia anterior.';
  if (codigo === '42501') return 'Só dá para marcar o ponto de quem é instrutor.';
  return 'Não foi possível salvar o ponto. Tente de novo.';
}

export interface PontosDaEquipe {
  professores: { id: string; nome: string | null; email: string | null; foto: string | null }[];
  pontos: Ponto[];
}

/** Gestor: professores atuais e os pontos de todos num período */
export async function carregarPontosDaEquipe(de: string, ate: string): Promise<PontosDaEquipe> {
  const [professores, pontos] = await Promise.all([
    supabase.from('perfis').select('id, nome, email, foto').eq('papel', 'professor').order('nome'),
    supabase
      .from('pontos_professores')
      .select('professor_id, data, situacao, registrado_em')
      .gte('data', de)
      .lte('data', ate)
      .order('data'),
  ]);
  if (professores.error) throw professores.error;
  if (pontos.error) throw pontos.error;
  return { professores: professores.data, pontos: pontos.data as Ponto[] };
}
