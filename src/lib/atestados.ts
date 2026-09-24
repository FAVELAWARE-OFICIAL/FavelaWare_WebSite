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
import { excecaoDeNegocio, excecaoDeSistema, sucesso, type ResultadoOperacao } from '../types';
import { erroDeSistemaNaFuncao, mensagemDaFuncao } from './banco';
import { supabase } from './supabase';

/** O que vai junto de uma falta justificada */
export interface Justificativa {
  texto: string;
  /** Atestado já guardado (id da tabela atestados), ou null */
  atestadoId: string | null;
}

export const TAMANHO_MAXIMO_JUSTIFICATIVA = 1000;
export const TAMANHO_MAXIMO_ATESTADO = 10 * 1024 * 1024;
/** PDF ou foto (os mesmos tipos da Edge Function e da tabela) */
export const TIPOS_DE_ATESTADO = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

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
      if (arquivo.size > TAMANHO_MAXIMO_ATESTADO) return 'O atestado passa de 10 MB.';
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
    const mensagem = await mensagemDaFuncao(error, 'Não foi possível enviar o atestado. Tente de novo.');
    return { resultado: erroDeSistemaNaFuncao(error) ? excecaoDeSistema(mensagem) : excecaoDeNegocio(mensagem) };
  }

  /** Gestor: link de download do atestado (vale 2 minutos) */
  async linkParaBaixar(atestadoId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('atestados/link', { body: { atestado_id: atestadoId } });
    if (error) throw new Error(await mensagemDaFuncao(error, 'Não foi possível baixar o atestado.'));
    return (data as { url: string }).url;
  }
}

export const servicoAtestados = new ServicoAtestados();
