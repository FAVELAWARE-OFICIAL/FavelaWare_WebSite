/**
 * Tipos compartilhados do site e da padronização de status.
 * Tipos de um assunto só (turmas, atividades, ponto...) ficam no serviço dele, em src/lib/.
 */

// ============================================
// STATUS DE PROCESSAMENTO (regra 3 de docs/boas-praticas.md)
// ============================================

/** Os 5 status padronizados de qualquer processamento */
export const StatusProcessamento = {
  EmExecucao: 1,
  ExcecaoNegocio: 2,
  ExcecaoSistema: 3,
  Sucesso: 4,
  Cancelado: 5,
} as const;

export type StatusProcessamento = (typeof StatusProcessamento)[keyof typeof StatusProcessamento];

/** Resultado de uma operação: o status e, quando não deu certo, a mensagem para a pessoa */
export interface ResultadoOperacao {
  status: StatusProcessamento;
  mensagem: string | null;
}

export const sucesso = (): ResultadoOperacao => ({ status: StatusProcessamento.Sucesso, mensagem: null });

/** Falha esperada: regra de negócio ou dado que a pessoa pode corrigir */
export const excecaoDeNegocio = (mensagem: string): ResultadoOperacao => ({
  status: StatusProcessamento.ExcecaoNegocio,
  mensagem,
});

/** Falha técnica inesperada: rede, banco ou serviço fora do ar */
export const excecaoDeSistema = (mensagem: string): ResultadoOperacao => ({
  status: StatusProcessamento.ExcecaoSistema,
  mensagem,
});

// ============================================
// CONTEÚDO DO SITE PÚBLICO
// ============================================

/** Foto em destaque na página inicial (as da página Galeria ficam em src/data/galeria.ts) */
export interface FotoEmDestaque {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  imagem: string;
}

/** Parceiro ou idealizador do projeto (fonte única: src/data/parceiros.ts) */
export interface Parceiro {
  nome: string;
  /** Mostrado quando a imagem não carrega */
  emoji: string;
  imagem: string;
  descricao: string;
  /** Sem site oficial conhecido fica sem o botão "SAIBA MAIS" */
  site?: string;
}

/** Artigo científico (página Reconhecimentos) */
export interface ArtigoCientifico {
  id: number;
  titulo: string;
  descricao: string;
  /** DOI ou link do artigo */
  doi: string;
  ano: string;
  icone: string;
}

/** Prêmio ou reconhecimento recebido */
export interface Premio {
  id: number;
  titulo: string;
  descricao: string;
  ano: string;
  link?: string;
  imagens: string[];
  icone: string;
}

/** Forma de contato (página Contato) */
export interface ContatoInfo {
  tipo: 'email' | 'telefone' | 'endereco';
  titulo: string;
  valor: string;
  /** mailto:, tel: ou mapa */
  link?: string;
  icone: string;
}
