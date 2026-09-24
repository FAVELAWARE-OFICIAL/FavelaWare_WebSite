/**
 * ============================================
 * GESTÃO (ÁREA DO GESTOR)
 * ============================================
 *
 * Cadastros feitos pelo gestor: edições, turmas, alunos, correção de presença
 * e solicitações dos alunos. O banco só aceita estas gravações de quem é
 * gestor (regras RLS); aqui é só a chamada.
 */
import { supabase } from './supabase';
import type { Situacao } from './dashboard';

// ============================================
// NOMES DE TURMA
// ============================================

/** Padrão do banco: "Turma Única", "Turma 1", "Turma 2"... ou "Turma A", "Turma B"... */
export const NOMES_DE_TURMA = [
  'Turma Única',
  'Turma 1',
  'Turma 2',
  'Turma 3',
  'Turma 4',
  'Turma A',
  'Turma B',
  'Turma C',
  'Turma D',
];

/** Traduz erros comuns do banco para uma frase que o gestor entende */
function mensagemDeErro(erro: { code?: string; message?: string }, padrao: string): string {
  if (erro.code === '23505') return 'Já existe um cadastro com esse nome.';
  if (erro.code === '23514') return 'Valor fora do padrão aceito.';
  return padrao;
}

// ============================================
// EDIÇÕES E TURMAS
// ============================================

export interface TurmaComAlunos {
  id: number;
  nome: string;
  alunos: number;
}

/** Chaves do cache (ver lib/cache.ts): o layout pré-carrega, as páginas leem */
export const chaveTurmas = (edicaoId: number) => `turmas:${edicaoId}`;
export const chaveSolicitacoes = (edicaoId: number) => `solicitacoes:${edicaoId}`;

/** Turmas de uma edição e quantos alunos cada uma tem (a contagem é feita no banco) */
export async function carregarTurmasDaEdicao(edicaoId: number): Promise<TurmaComAlunos[]> {
  const { data, error } = await supabase
    .from('turmas')
    .select('id, nome, participantes(count)')
    .eq('edicao_id', edicaoId)
    .order('nome');
  if (error) throw error;
  return data.map((t) => ({
    id: t.id,
    nome: t.nome,
    alunos: (t.participantes as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

/** Cria a edição depois da última (ordem = maior + 1) e devolve o id dela */
export async function criarEdicao(nome: string): Promise<{ erro: string | null; id?: number }> {
  const { data: ultima } = await supabase
    .from('edicoes')
    .select('ordem')
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from('edicoes')
    .insert({ nome, ordem: (ultima?.ordem ?? 0) + 1 })
    .select('id')
    .single();
  return error ? { erro: mensagemDeErro(error, 'Não foi possível criar a edição.') } : { erro: null, id: data.id };
}

export async function renomearEdicao(id: number, nome: string): Promise<string | null> {
  const { error } = await supabase.from('edicoes').update({ nome }).eq('id', id);
  return error ? mensagemDeErro(error, 'Não foi possível renomear a edição.') : null;
}

export async function criarTurma(edicaoId: number, nome: string): Promise<string | null> {
  const { error } = await supabase.from('turmas').insert({ edicao_id: edicaoId, nome });
  return error ? mensagemDeErro(error, 'Não foi possível criar a turma.') : null;
}

export async function renomearTurma(id: number, nome: string): Promise<string | null> {
  const { error } = await supabase.from('turmas').update({ nome }).eq('id', id);
  return error ? mensagemDeErro(error, 'Não foi possível renomear a turma.') : null;
}

/** O banco só apaga turma sem alunos e sem aulas (senão o histórico iria junto) */
export async function apagarTurma(id: number): Promise<string | null> {
  const { data, error } = await supabase.from('turmas').delete().eq('id', id).select('id');
  if (error) return 'Não foi possível apagar a turma.';
  return data.length ? null : 'A turma tem alunos ou aulas registradas: só dá para apagar turma vazia.';
}

// ============================================
// ALUNOS
// ============================================

export interface DadosDoAluno {
  nome: string;
  login: string;
  turma_id: number;
  observacao: string;
  foto: string | null;
}

const vazioViraNulo = (texto: string) => (texto.trim() ? texto.trim() : null);

export async function salvarAluno(edicaoId: number, dados: DadosDoAluno, id?: number): Promise<string | null> {
  const campos = {
    nome: dados.nome.trim(),
    login: vazioViraNulo(dados.login),
    turma_id: dados.turma_id,
    observacao: vazioViraNulo(dados.observacao),
    foto: dados.foto,
  };
  const { error } = id
    ? await supabase.from('participantes').update(campos).eq('id', id)
    : await supabase.from('participantes').insert({ ...campos, edicao_id: edicaoId, funcao: 'aluno' });
  return error ? mensagemDeErro(error, 'Não foi possível salvar o aluno.') : null;
}

/** Remove o aluno e TODO o histórico de presença dele */
export async function removerAluno(id: number): Promise<string | null> {
  const { error } = await supabase.from('participantes').delete().eq('id', id);
  return error ? 'Não foi possível remover o aluno.' : null;
}

// ============================================
// FOTO DO ALUNO (Supabase Storage)
// ============================================

const BUCKET_FOTOS = 'fotos-alunos';
const LADO_DA_FOTO = 400; // px: suficiente para o avatar, e o arquivo fica pequeno

/**
 * Reduz a foto no próprio navegador (400x400, recorte central, WebP) e envia.
 * Uma foto de celular de 4 MB vira ~30 KB: a página de alunos carrega rápido.
 */
export async function enviarFotoDoAluno(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');

  const imagem = await createImageBitmap(arquivo);
  const lado = Math.min(imagem.width, imagem.height);
  const canvas = document.createElement('canvas');
  canvas.width = LADO_DA_FOTO;
  canvas.height = LADO_DA_FOTO;
  canvas.getContext('2d')!.drawImage(
    imagem,
    (imagem.width - lado) / 2,
    (imagem.height - lado) / 2,
    lado,
    lado, // recorte quadrado do meio
    0,
    0,
    LADO_DA_FOTO,
    LADO_DA_FOTO,
  );
  imagem.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Não foi possível processar a foto.'))),
      'image/webp',
      0.85,
    ),
  );

  const caminho = `${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, blob, { contentType: 'image/webp' });
  if (error) throw new Error('Não foi possível enviar a foto.');
  return supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho).data.publicUrl;
}

/** Apaga do Storage uma foto que foi trocada (fotos do site, em /imgs, ficam) */
export async function apagarFotoAntiga(url: string | null): Promise<void> {
  const marcador = `/storage/v1/object/public/${BUCKET_FOTOS}/`;
  if (!url?.includes(marcador)) return;
  await supabase.storage.from(BUCKET_FOTOS).remove([url.split(marcador)[1]]);
}

// ============================================
// CORREÇÃO DE PRESENÇA (uma célula da chamada)
// ============================================

const LETRA: Record<Exclude<Situacao, 'folga'>, string> = { presente: 'P', ausente: 'A', justificada: 'J' };

export const LETRA_DA_SITUACAO = LETRA;

/** Define a situação de um aluno numa aula (null = apaga o registro) */
export async function corrigirPresenca(
  aulaId: number,
  participanteId: number,
  situacao: Exclude<Situacao, 'folga'> | null,
): Promise<void> {
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
  const campos = { situacao, registro_original: LETRA[situacao] };
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

// ============================================
// SOLICITAÇÕES DOS ALUNOS
// ============================================

export type TipoSolicitacao = 'mudanca_turno' | 'mudanca_turma' | 'outro';
export type StatusSolicitacao = 'pendente' | 'aprovada' | 'recusada';

export const TIPOS_SOLICITACAO: Record<TipoSolicitacao, string> = {
  mudanca_turno: 'Mudança de turno',
  mudanca_turma: 'Mudança de turma',
  outro: 'Outro assunto',
};

export interface Solicitacao {
  id: number;
  participante_id: number;
  tipo: TipoSolicitacao;
  descricao: string;
  status: StatusSolicitacao;
  resposta: string | null;
  criada_em: string;
  resolvida_em: string | null;
}

/** Solicitações dos alunos de uma edição (filtradas pela edição no próprio banco) */
export async function carregarSolicitacoes(edicaoId: number): Promise<Solicitacao[]> {
  const { data, error } = await supabase
    .from('solicitacoes')
    .select('id, participante_id, tipo, descricao, status, resposta, criada_em, resolvida_em, participantes!inner()')
    .eq('participantes.edicao_id', edicaoId)
    .order('criada_em', { ascending: false });
  if (error) throw error;
  return data as Solicitacao[];
}

export async function registrarSolicitacao(
  participanteId: number,
  tipo: TipoSolicitacao,
  descricao: string,
): Promise<string | null> {
  const { error } = await supabase
    .from('solicitacoes')
    .insert({ participante_id: participanteId, tipo, descricao: descricao.trim() });
  return error ? 'Não foi possível registrar a solicitação.' : null;
}

export async function responderSolicitacao(
  id: number,
  status: StatusSolicitacao,
  resposta: string,
): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  const pendente = status === 'pendente';
  const { error } = await supabase
    .from('solicitacoes')
    .update({
      status,
      resposta: vazioViraNulo(resposta),
      resolvida_em: pendente ? null : new Date().toISOString(),
      resolvida_por: pendente ? null : (data.user?.id ?? null),
    })
    .eq('id', id);
  return error ? 'Não foi possível atualizar a solicitação.' : null;
}
