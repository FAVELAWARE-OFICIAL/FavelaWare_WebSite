/**
 * ============================================
 * JUSTIFICATIVA E ATESTADO DA FALTA JUSTIFICADA (J)
 * ============================================
 *
 * Marcar J na chamada (aluno) ou no ponto (instrutor) pede uma justificativa e
 * aceita um atestado. O arquivo vai para o Google Drive da ONG pela Edge
 * Function "atestados" (pastas pelo nome da pessoa); no banco fica a referência.
 * Atestado é dado de saúde: só o gestor baixa.
 */
import { TAMANHO_MAXIMO_ARQUIVO } from '../config';
import { sucesso, type ResultadoOperacao } from '../types';
import { linkDaFuncao, resultadoDaFuncao } from './banco';
import { FORMATOS } from './entregas';
import { supabase } from './supabase';

/** O que vai junto de uma falta justificada */
export interface Justificativa {
  texto: string;
  /** Atestado já guardado (id da tabela atestados), ou null */
  atestadoId: string | null;
}

export const TAMANHO_MAXIMO_JUSTIFICATIVA = 1000;
/** PDF ou foto (os mesmos tipos da Edge Function e da tabela) */
export const TIPOS_DE_ATESTADO = [...FORMATOS.pdf.tipos, ...FORMATOS.imagem.tipos];

/** De quem é o atestado: um aluno da chamada ou um instrutor (vazio = quem está logado) */
export type DonoDoAtestado = { participanteId: number } | { professorId?: string };

export class ServicoAtestados {
  /** Confere a justificativa e o arquivo antes de enviar. Devolve o problema, ou null. */
  validar(texto: string, arquivo: File | null): string | null {
    if (!texto.trim()) return 'Escreva a justificativa da falta.';
    if (texto.trim().length > TAMANHO_MAXIMO_JUSTIFICATIVA) {
      return `A justificativa passa de ${TAMANHO_MAXIMO_JUSTIFICATIVA} caracteres.`;
    }
    if (arquivo) {
      if (!TIPOS_DE_ATESTADO.includes(arquivo.type)) return 'Envie o atestado em PDF ou foto (PNG, JPG ou WebP).';
      if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) return 'O atestado passa de 10 MB.';
    }
    return null;
  }

  /** Guarda o atestado no Drive e devolve o id dele */
  async enviar(dono: DonoDoAtestado, arquivo: File): Promise<{ resultado: ResultadoOperacao; atestadoId?: string }> {
    const form = new FormData();
    if ('participanteId' in dono) form.append('participante_id', String(dono.participanteId));
    else if (dono.professorId) form.append('professor_id', dono.professorId);
    form.append('arquivo', arquivo, arquivo.name);

    const { data, error } = await supabase.functions.invoke('atestados/enviar', { body: form });
    if (!error) return { resultado: sucesso(), atestadoId: (data as { atestado_id: string }).atestado_id };
    console.error('[atestados] falha ao enviar', error.message);
    return { resultado: await resultadoDaFuncao(error, 'Não foi possível enviar o atestado. Tente de novo.') };
  }

  /** Gestor: link de download do atestado (vale 2 minutos) */
  linkParaBaixar(atestadoId: string): Promise<string> {
    return linkDaFuncao('atestados/link', { atestado_id: atestadoId }, 'Não foi possível baixar o atestado.');
  }
}

export const servicoAtestados = new ServicoAtestados();
