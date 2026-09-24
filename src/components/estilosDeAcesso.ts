/** Campo de texto das telas de acesso (login, primeiro acesso, definir senha e dados do instrutor) */
export const classeCampoDeAcesso =
  'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-favela-green-500 focus:border-transparent transition-all';

/** Botão de envio das telas de acesso: cinza e sem clique enquanto processa */
export const classeBotaoDeAcesso = (ocupado: boolean) =>
  `w-full py-4 px-6 rounded-lg font-bold text-white text-lg shadow-lg transition-all ${
    ocupado
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-gradient-to-r from-favela-green-600 to-favela-blue-600 hover:shadow-xl'
  }`;

/** Campo compacto das telas em etapas (TelaDeEtapas): a etapa inteira cabe na tela sem rolar */
export const classeCampoDeEtapa =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 transition-all focus:border-transparent focus:ring-2 focus:ring-favela-green-500 lg:py-3';
export const classeRotuloDeEtapa = 'mb-1 block text-sm font-medium text-gray-700 lg:mb-1.5';
