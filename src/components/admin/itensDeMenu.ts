/**
 * Itens de menu usados em mais de uma área (ver MenuLateral).
 * A avaliação da banca aparece na área da banca e no menu de quem é da equipe
 * (gestor, instrutor, parceiro) e foi posto na banca avaliadora.
 */
import { IconeAvaliacao } from './Icones';
import type { ItemMenu } from './MenuLateral';

export const ITEM_BANCA: ItemMenu = { caminho: '/banca', rotulo: 'Banca avaliadora', Icone: IconeAvaliacao };
