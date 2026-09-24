/**
 * ============================================
 * ATIVIDADES (ENTREGAS E CORREÇÃO)
 * ============================================
 *
 * - Professor da turma e gestor criam a atividade (turma + trilha + prazo).
 * - O aluno entrega com link, texto e/ou arquivo.
 * - O professor responde com feedback, nota (0 a 100) e "Concluída" ou "Refazer";
 *   no "Refazer" o aluno envia de novo (2ª tentativa...).
 *
 * As regras (quem vê, quem envia, prazo, numeração, quem avaliou) ficam no banco:
 * migration 20260925110000_atividades.sql. Aqui só se lê e grava.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';

import { carregarTodasTurmas, type TurmaComEdicao } from './equipe';
import { carregarPerfil, supabase } from './supabase';

export type StatusTentativa = 'aguardando' | 'concluida' | 'refazer';

export interface Tentativa {
  id: number;
  participante_id: number;
  numero: number;
  comentario: string | null;
  link: string | null;
  /** Arquivo antigo, no Storage do Supabase */
  arquivo_caminho: string | null;
  arquivo_nome: string | null;
  /** Arquivo no Google Drive (o nome para o download vem junto) */
  arquivo_id: string | null;
  arquivo: { nome: string } | null;
  enviada_em: string;
  status: StatusTentativa;
  feedback: string | null;
  nota: number | null;
  avaliada_em: string | null;
  avaliada_por_nome: string | null;
}

export type TipoLink = 'qualquer' | 'github' | 'drive';
export type Formato = 'pdf' | 'imagem' | 'zip' | 'office' | 'txt';

/** O que a atividade exige na entrega (o banco confere as mesmas regras) */
export interface RegrasDeEntrega {
  exige_texto: boolean;
  exige_link: boolean;
  /** Vale também quando o link é opcional: se vier, tem de ser deste tipo */
  tipo_link: TipoLink;
  exige_arquivo: boolean;
  /** Formatos aceitos; vazio = qualquer formato aceito */
  formatos: Formato[];
}

export const SEM_REGRAS: RegrasDeEntrega = {
  exige_texto: false,
  exige_link: false,
  tipo_link: 'qualquer',
  exige_arquivo: false,
  formatos: [],
};

export interface Atividade extends RegrasDeEntrega {
  id: number;
  turma_id: number;
  trilha_id: number;
  titulo: string;
  enunciado: string;
  prazo: string;
  trilha: { nome: string; ordem: number } | null;
  tentativas: Tentativa[];
}

const COLUNAS_TENTATIVA =
  'id, participante_id, numero, comentario, link, arquivo_caminho, arquivo_nome, arquivo_id, arquivo:arquivos_entrega(nome), enviada_em, status, feedback, nota, avaliada_em, avaliada_por_nome';
const COLUNAS_ATIVIDADE = `id, turma_id, trilha_id, titulo, enunciado, prazo, exige_texto, exige_link, tipo_link, exige_arquivo, formatos, trilha:trilhas(nome, ordem), tentativas(${COLUNAS_TENTATIVA})`;

/** Chaves do cache (ver lib/cache.ts) */
export const CHAVE_ATIVIDADES_ALUNO = 'atividades:aluno';
export const chaveAtividadesDaTurma = (turmaId: number) => `atividades:turma:${turmaId}`;

function arrumar(atividades: Atividade[]): Atividade[] {
  return atividades
    .map((a) => ({ ...a, tentativas: [...a.tentativas].sort((x, y) => x.numero - y.numero) }))
    .sort((a, b) => a.prazo.localeCompare(b.prazo));
}

/** Tentativas de um aluno numa atividade, da 1ª à última */
export const tentativasDe = (atividade: Atividade, participanteId: number) =>
  atividade.tentativas.filter((t) => t.participante_id === participanteId);

/** Agrupa por trilha, na ordem das trilhas do material */
export function porTrilha(atividades: Atividade[]): { trilha: string; atividades: Atividade[] }[] {
  const grupos = new Map<number, { trilha: string; ordem: number; atividades: Atividade[] }>();
  for (const a of atividades) {
    const g = grupos.get(a.trilha_id) ?? {
      trilha: a.trilha?.nome ?? 'Trilha',
      ordem: a.trilha?.ordem ?? 0,
      atividades: [],
    };
    g.atividades.push(a);
    grupos.set(a.trilha_id, g);
  }
  return [...grupos.values()].sort((a, b) => a.ordem - b.ordem || a.trilha.localeCompare(b.trilha, 'pt-BR'));
}

// ============================================
// SITUAÇÃO (o que mostrar para o aluno)
// ============================================
export type Situacao = 'pendente' | 'aguardando' | 'refazer' | 'concluida' | 'encerrada';

export function situacaoDoAluno(tentativas: Tentativa[], prazo: string): Situacao {
  const ultima = tentativas[tentativas.length - 1];
  if (!ultima) return new Date(prazo) < new Date() ? 'encerrada' : 'pendente';
  return ultima.status;
}

/** O aluno ainda pode enviar? (1º envio até o prazo; depois de "Refazer", sempre) */
export const podeEnviar = (situacao: Situacao) => situacao === 'pendente' || situacao === 'refazer';

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  pendente: 'Pendente',
  aguardando: 'Aguardando correção',
  refazer: 'Refazer',
  concluida: 'Concluída',
  encerrada: 'Prazo encerrado',
};

// ============================================
// DATAS (sempre no horário de Brasília)
// ============================================
const FUSO = 'America/Sao_Paulo';

export const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** timestamptz -> valor de <input type="datetime-local"> no horário de Brasília */
export function paraCampoDataHora(iso: string): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

/**
 * Valor de <input type="datetime-local"> (horário de Brasília) -> ISO.
 * Usa -03:00 fixo: o Brasil não tem horário de verão desde 2019. Se voltar a ter,
 * trocar pelo deslocamento calculado com Intl (senão o prazo muda 1h ao editar).
 */
export const deCampoDataHora = (valor: string) => new Date(`${valor}:00-03:00`).toISOString();

// ============================================
// ALUNO
// ============================================
export interface AtividadesDoAluno {
  participanteId: number | null;
  /**
   * Reserva do "Ver como aluno": hoje a conta vira o aluno da turma de
   * demonstração; este modo só vale se a demonstração não existir.
   * "Ver como aluno" (conta que alterna papéis, sem aluno ligado): recebe as
   * atividades e a lista de turmas; a tela mostra uma turma como o aluno vê, e o
   * envio não é gravado.
   */
  visualizacao: boolean;
  turmas: TurmaComEdicao[];
  atividades: Atividade[];
}

/**
 * Aluno: atividades da turma dele, com as tentativas dele (o banco só devolve as dele).
 * Visualização ("ver como aluno"): atividades de todas as turmas e a lista de turmas.
 */
export async function carregarAtividadesDoAluno(): Promise<AtividadesDoAluno> {
  const { data: sessao } = await supabase.auth.getSession();
  const usuarioId = sessao.session?.user.id;
  if (!usuarioId) throw new Error('Sem sessão');
  const perfil = await carregarPerfil(usuarioId);
  if (!perfil.papel) throw new Error('Não foi possível carregar o perfil');

  const visualizacao = !perfil.participanteId && perfil.podeAlternarPapel;
  if (!perfil.participanteId && !visualizacao)
    return { participanteId: null, visualizacao: false, turmas: [], atividades: [] };

  const [atividades, turmas] = await Promise.all([
    supabase.from('atividades').select(COLUNAS_ATIVIDADE),
    visualizacao ? carregarTodasTurmas() : Promise.resolve([]),
  ]);
  if (atividades.error) throw atividades.error;
  return {
    participanteId: perfil.participanteId,
    visualizacao,
    turmas,
    atividades: arrumar(atividades.data as unknown as Atividade[]),
  };
}

export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;
export const TIPOS_ACEITOS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};
/** Grupos de formato que o professor pode exigir (os mesmos do banco) */
export const FORMATOS: Record<Formato, { rotulo: string; tipos: string[] }> = {
  pdf: { rotulo: 'PDF', tipos: ['application/pdf'] },
  imagem: { rotulo: 'Imagem (PNG, JPG, WebP)', tipos: ['image/png', 'image/jpeg', 'image/webp'] },
  zip: { rotulo: 'ZIP', tipos: ['application/zip', 'application/x-zip-compressed'] },
  office: {
    rotulo: 'Office (Word, Excel, PowerPoint)',
    tipos: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  txt: { rotulo: 'Texto (TXT)', tipos: ['text/plain'] },
};

export const ROTULO_TIPO_LINK: Record<TipoLink, string> = {
  qualquer: 'Qualquer link',
  github: 'Link do GitHub',
  drive: 'Link do Google Drive',
};

/** Tipos de arquivo aceitos nesta atividade (para o seletor e para a validação) */
export const tiposAceitos = (formatos: Formato[]): string[] =>
  formatos.length ? formatos.flatMap((f) => FORMATOS[f].tipos) : Object.keys(TIPOS_ACEITOS);

/** "PDF ou Imagem (PNG, JPG, WebP)" — texto dos formatos aceitos */
export const formatosEmTexto = (formatos: Formato[]): string =>
  formatos.length ? formatos.map((f) => FORMATOS[f].rotulo).join(' ou ') : 'PDF, imagem, ZIP, TXT ou Office';

/** "comentário · link do GitHub · arquivo PDF" — resumo das exigências (vazio se não houver) */
export function resumoDasRegras(r: RegrasDeEntrega): string {
  const partes: string[] = [];
  if (r.exige_texto) partes.push('comentário');
  const link = r.tipo_link === 'github' ? 'link do GitHub' : r.tipo_link === 'drive' ? 'link do Google Drive' : 'link';
  const formatos = r.formatos.map((f) => FORMATOS[f].rotulo.split(' ')[0]).join('/');
  // Restrição de tipo/formato aparece mesmo quando o campo é opcional
  if (r.exige_link) partes.push(link);
  else if (r.tipo_link !== 'qualquer') partes.push(`${link} (se enviar link)`);
  if (r.exige_arquivo) partes.push(formatos ? `arquivo ${formatos}` : 'arquivo');
  else if (formatos) partes.push(`arquivo ${formatos} (se enviar arquivo)`);
  return partes.join(' · ');
}

/** "Esta atividade pede o link do GitHub." — texto do que falta (igual ao banco) */
const PEDE_LINK: Record<TipoLink, string> = {
  qualquer: 'Esta atividade pede um link.',
  github: 'Esta atividade pede o link do GitHub.',
  drive: 'Esta atividade pede o link do Google Drive.',
};

/** O link combina com o tipo pedido? (o banco confere igual) */
export function linkDoTipo(link: string, tipo: TipoLink): boolean {
  if (tipo === 'github') return /^https:\/\/(www\.)?github\.com\/\S+$/i.test(link);
  if (tipo === 'drive') return /^https:\/\/(drive|docs)\.google\.com\/\S+$/i.test(link);
  return true;
}

export type EtapaEnvio = 'arquivo' | 'registro';

export interface Entrega {
  comentario: string;
  link: string;
  arquivo: File | null;
}

/** Confere a entrega antes de enviar (com as regras da atividade). Devolve o problema, ou null se está ok. */
export function validarEntrega({ comentario, link, arquivo }: Entrega, regras: RegrasDeEntrega): string | null {
  const texto = comentario.trim();
  const url = link.trim();
  if (!texto && !url && !arquivo) return 'Envie um link, um texto ou um arquivo.';
  if (regras.exige_texto && !texto) return 'Esta atividade pede um comentário ou resposta.';
  if (regras.exige_link && !url) return PEDE_LINK[regras.tipo_link];
  if (url && !/^https:\/\/\S+$/i.test(url)) return 'O link precisa começar com https://';
  if (url && !linkDoTipo(url, regras.tipo_link)) {
    return regras.tipo_link === 'github'
      ? 'O link precisa ser do GitHub (https://github.com/...).'
      : 'O link precisa ser do Google Drive (https://drive.google.com/...).';
  }
  if (regras.exige_arquivo && !arquivo) return `Esta atividade pede um arquivo (${formatosEmTexto(regras.formatos)}).`;
  if (arquivo) {
    if (!TIPOS_ACEITOS[arquivo.type] || !tiposAceitos(regras.formatos).includes(arquivo.type)) {
      return `Formato não aceito nesta atividade. Use ${formatosEmTexto(regras.formatos)}.`;
    }
    if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) return 'O arquivo passa de 10 MB.';
  }
  return null;
}

/**
 * Envia a entrega. Com arquivo: sobe o arquivo e depois registra; se o registro
 * falhar, apaga o arquivo que subiu. Devolve null se deu certo, ou o texto do erro.
 */
export async function enviarTentativa(
  atividadeId: number,
  participanteId: number,
  entrega: Entrega,
  aoMudarEtapa: (etapa: EtapaEnvio) => void,
  regras: RegrasDeEntrega,
): Promise<string | null> {
  const problema = validarEntrega(entrega, regras);
  if (problema) return problema;
  const comentario = entrega.comentario.trim();
  const link = entrega.link.trim();
  const { arquivo } = entrega;

  // Com arquivo: o servidor guarda no Google Drive e registra a entrega de uma vez
  // (Edge Function entregas-drive; se o registro falhar, o arquivo vai para a lixeira)
  if (arquivo) {
    aoMudarEtapa('arquivo');
    const form = new FormData();
    form.append('atividade_id', String(atividadeId));
    form.append('comentario', comentario);
    form.append('link', link);
    form.append('arquivo', arquivo, arquivo.name);
    const { error } = await supabase.functions.invoke('entregas-drive/enviar', { body: form });
    if (error) {
      console.error('[atividades] falha ao enviar para o Drive', error.message);
      return mensagemDaFuncao(error, 'Não foi possível enviar o arquivo. Tente de novo.');
    }
    return null;
  }

  aoMudarEtapa('registro');
  const { error } = await supabase.from('tentativas').insert({
    atividade_id: atividadeId,
    participante_id: participanteId,
    comentario: comentario || null,
    link: link || null,
  });
  if (error) {
    console.error('[atividades] falha ao registrar a entrega', error.code);
    return error.code === '22023' ? error.message : 'Não foi possível registrar a entrega. Tente de novo.';
  }
  return null;
}

/** Texto de erro que a Edge Function devolveu ({ erro }), ou o padrão */
async function mensagemDaFuncao(erro: unknown, padrao: string): Promise<string> {
  if (erro instanceof FunctionsHttpError) {
    try {
      const corpo = await erro.context.json();
      if (typeof corpo?.erro === 'string') return corpo.erro;
    } catch {
      /* resposta sem JSON: fica o padrão */
    }
  }
  return padrao;
}

/**
 * Link de download (vale 2 minutos) de um arquivo da entrega.
 * - Arquivo no Google Drive: o servidor confere quem pode ver e devolve o link.
 * - Arquivo antigo no Storage do Supabase: URL assinada, como antes.
 */
export async function linkDoArquivo(
  t: Pick<Tentativa, 'arquivo_id' | 'arquivo_caminho' | 'arquivo_nome'>,
): Promise<string> {
  if (t.arquivo_id) {
    const { data, error } = await supabase.functions.invoke('entregas-drive/link', {
      body: { arquivo_id: t.arquivo_id },
    });
    if (error) throw new Error(await mensagemDaFuncao(error, 'Não foi possível baixar o arquivo.'));
    return (data as { url: string }).url;
  }
  const { data, error } = await supabase.storage
    .from('entregas')
    .createSignedUrl(t.arquivo_caminho!, 120, { download: t.arquivo_nome ?? 'entrega' });
  if (error) throw error;
  return data.signedUrl;
}

// ============================================
// EQUIPE (professor e gestor)
// ============================================
export interface AlunoDaTurma {
  id: number;
  nome: string;
}

export interface AtividadesDaTurma {
  alunos: AlunoDaTurma[];
  atividades: Atividade[];
}

export async function carregarAtividadesDaTurma(turmaId: number): Promise<AtividadesDaTurma> {
  const [alunos, atividades] = await Promise.all([
    supabase.from('participantes').select('id, nome').eq('turma_id', turmaId).eq('funcao', 'aluno').order('nome'),
    supabase.from('atividades').select(COLUNAS_ATIVIDADE).eq('turma_id', turmaId),
  ]);
  if (alunos.error) throw alunos.error;
  if (atividades.error) throw atividades.error;
  return { alunos: alunos.data, atividades: arrumar(atividades.data as unknown as Atividade[]) };
}

export interface DadosDaAtividade extends RegrasDeEntrega {
  trilha_id: number;
  titulo: string;
  enunciado: string;
  /** ISO */
  prazo: string;
}

/** Cria (com turma) ou edita (com id). Devolve null se deu certo, ou o texto do erro. */
export async function salvarAtividade(
  dados: DadosDaAtividade,
  alvo: { turmaId: number } | { id: number },
): Promise<string | null> {
  const campos = { ...dados, titulo: dados.titulo.trim(), enunciado: dados.enunciado.trim() };
  const { error } =
    'id' in alvo
      ? await supabase.from('atividades').update(campos).eq('id', alvo.id)
      : await supabase.from('atividades').insert({ ...campos, turma_id: alvo.turmaId });
  if (!error) return null;
  console.error('[atividades] falha ao salvar a atividade', error.code);
  if (error.code === '22023') return 'O prazo precisa ser depois de agora.';
  if (error.code === '23514') return 'Confira os campos: título até 120 letras e enunciado preenchido.';
  return 'Não foi possível salvar a atividade.';
}

/** Só apaga atividade sem entregas (o banco confere). Devolve null se apagou. */
export async function apagarAtividade(id: number): Promise<string | null> {
  const { data, error } = await supabase.from('atividades').delete().eq('id', id).select('id');
  if (error) {
    console.error('[atividades] falha ao apagar', error.code);
    return 'Não foi possível apagar a atividade.';
  }
  return data.length ? null : 'Esta atividade já tem entregas e não pode ser apagada.';
}

/** Responde a última tentativa do aluno. Devolve null se deu certo, ou o texto do erro. */
export async function avaliarTentativa(
  tentativaId: number,
  avaliacao: { status: 'concluida' | 'refazer'; feedback: string; nota: number | null },
): Promise<string | null> {
  if (!avaliacao.feedback.trim()) return 'Escreva o feedback para o aluno.';
  if (avaliacao.status === 'concluida' && avaliacao.nota === null) return 'Dê a nota (0 a 100) para concluir.';
  const { data, error } = await supabase
    .from('tentativas')
    .update({ status: avaliacao.status, feedback: avaliacao.feedback.trim(), nota: avaliacao.nota })
    .eq('id', tentativaId)
    .select('id');
  if (error) {
    console.error('[atividades] falha ao avaliar', error.code);
    return error.code === '22023' ? error.message : 'Não foi possível salvar a correção.';
  }
  return data.length ? null : 'Você não pode corrigir esta entrega.';
}
