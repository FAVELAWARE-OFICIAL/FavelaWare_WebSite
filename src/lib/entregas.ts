/**
 * ============================================
 * ENTREGAS DOS ALUNOS
 * ============================================
 *
 * O que cada atividade exige, a conferência antes de enviar, o envio (com ou
 * sem arquivo) e o link de download dos arquivos. As mesmas regras são
 * conferidas de novo na Edge Function entregas-drive e no banco.
 */
import { BUCKET_ENTREGAS_ANTIGAS, TAMANHO_MAXIMO_ARQUIVO, VALIDADE_LINK_DOWNLOAD_S } from '../config';
import { excecaoDeNegocio, excecaoDeSistema, sucesso, type ResultadoOperacao } from '../types';
import { linkValido } from '../utils/texto';
import type { Tentativa } from './atividades';
import { CODIGO_REGRA_DO_BANCO, linkDaFuncao, resultadoDaFuncao } from './banco';
import { supabase } from './supabase';

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

/** Tipos de arquivo aceitos pelo portal e a extensão de cada um */
const TIPOS_ACEITOS: Record<string, string> = {
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

/** "Esta atividade pede o link do GitHub." — texto do que falta (igual ao banco) */
const PEDE_LINK: Record<TipoLink, string> = {
  qualquer: 'Esta atividade pede um link.',
  github: 'Esta atividade pede o link do GitHub.',
  drive: 'Esta atividade pede o link do Google Drive.',
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

/** O link combina com o tipo pedido? (o banco confere igual) */
function linkDoTipo(link: string, tipo: TipoLink): boolean {
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

export class ServicoEntregas {
  /** Confere a entrega antes de enviar (com as regras da atividade). Devolve o problema, ou null se está ok. */
  validar({ comentario, link, arquivo }: Entrega, regras: RegrasDeEntrega): string | null {
    const texto = comentario.trim();
    const url = link.trim();
    if (!texto && !url && !arquivo) return 'Envie um link, um texto ou um arquivo.';
    if (regras.exige_texto && !texto) return 'Esta atividade pede um comentário ou resposta.';
    if (regras.exige_link && !url) return PEDE_LINK[regras.tipo_link];
    if (url && !linkValido(url)) return 'O link precisa começar com https://';
    if (url && !linkDoTipo(url, regras.tipo_link)) {
      return regras.tipo_link === 'github'
        ? 'O link precisa ser do GitHub (https://github.com/...).'
        : 'O link precisa ser do Google Drive (https://drive.google.com/...).';
    }
    if (regras.exige_arquivo && !arquivo)
      return `Esta atividade pede um arquivo (${formatosEmTexto(regras.formatos)}).`;
    if (arquivo) {
      if (!TIPOS_ACEITOS[arquivo.type] || !tiposAceitos(regras.formatos).includes(arquivo.type)) {
        return `Formato não aceito nesta atividade. Use ${formatosEmTexto(regras.formatos)}.`;
      }
      if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) return 'O arquivo passa de 10 MB.';
    }
    return null;
  }

  /**
   * Envia a entrega. Com arquivo, o servidor guarda no Google Drive e registra
   * a entrega de uma vez (Edge Function entregas-drive; se o registro falhar, o
   * arquivo vai para a lixeira). Sem arquivo, registra direto no banco.
   */
  async enviar(
    atividadeId: number,
    participanteId: number,
    entrega: Entrega,
    aoMudarEtapa: (etapa: EtapaEnvio) => void,
    regras: RegrasDeEntrega,
  ): Promise<ResultadoOperacao> {
    const problema = this.validar(entrega, regras);
    if (problema) return excecaoDeNegocio(problema);
    const comentario = entrega.comentario.trim();
    const link = entrega.link.trim();
    const { arquivo } = entrega;

    if (arquivo) {
      aoMudarEtapa('arquivo');
      const form = new FormData();
      form.append('atividade_id', String(atividadeId));
      form.append('comentario', comentario);
      form.append('link', link);
      form.append('arquivo', arquivo, arquivo.name);
      const { error } = await supabase.functions.invoke('entregas-drive/enviar', { body: form });
      if (!error) return sucesso();
      console.error('[entregas] falha ao enviar para o Drive', error.message);
      return resultadoDaFuncao(error, 'Não foi possível enviar o arquivo. Tente de novo.');
    }

    aoMudarEtapa('registro');
    const { error } = await supabase.from('tentativas').insert({
      atividade_id: atividadeId,
      participante_id: participanteId,
      comentario: comentario || null,
      link: link || null,
    });
    if (!error) return sucesso();
    console.error('[entregas] falha ao registrar a entrega', error.code);
    // 22023: regra da atividade recusada pelo banco, com o texto para o aluno
    return error.code === CODIGO_REGRA_DO_BANCO
      ? excecaoDeNegocio(error.message)
      : excecaoDeSistema('Não foi possível registrar a entrega. Tente de novo.');
  }

  /**
   * Link de download (vale 2 minutos) de um arquivo da entrega.
   * - Arquivo no Google Drive: o servidor confere quem pode ver e devolve o link.
   * - Arquivo antigo no Storage do Supabase: URL assinada, como antes.
   */
  async linkDoArquivo(t: Pick<Tentativa, 'arquivo_id' | 'arquivo_caminho' | 'arquivo_nome'>): Promise<string> {
    if (t.arquivo_id) {
      return linkDaFuncao('entregas-drive/link', { arquivo_id: t.arquivo_id }, 'Não foi possível baixar o arquivo.');
    }
    const { data, error } = await supabase.storage
      .from(BUCKET_ENTREGAS_ANTIGAS)
      .createSignedUrl(t.arquivo_caminho!, VALIDADE_LINK_DOWNLOAD_S, { download: t.arquivo_nome ?? 'entrega' });
    if (error) throw error;
    return data.signedUrl;
  }
}

export const servicoEntregas = new ServicoEntregas();
