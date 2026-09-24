/**
 * ============================================
 * DESIGN SYSTEM DAS ÁREAS RESTRITAS (gestor e professor)
 * ============================================
 *
 * Fonte única de tipografia, espaçamento, superfícies, formas e cores de estado.
 * Componentes e páginas usam estes tokens em vez de escrever classes soltas:
 * mudou aqui, muda em todas as telas.
 *
 * Regras (resumo — detalhes na skill favelaware-padrao-visual):
 * - Tipografia: só os papéis de `texto` abaixo. Nada de text-base/xl solto.
 * - Espaçamento: blocos da página a 24px (mb-6/gap-6); dentro do cartão 20px (p-5);
 *   entre campos e botões 12px (gap-3); itens de lista 12px (space-y-3).
 * - Forma: tudo rounded-lg; só selos e avatares são redondos (rounded-full).
 * - Cor: cinza para estrutura, verde da marca para ação principal e "ativo",
 *   vermelho para erro/perigo, âmbar para atenção. Roxo da marca: gráficos e iniciais.
 * - Foco: todo elemento clicável usa `foco` (anel verde só no teclado).
 */

export const texto = {
  /** Título da página, na barra superior */
  tituloPagina: 'text-lg font-semibold text-gray-900',
  /** Título de cartão, janela e seção */
  titulo: 'text-sm font-semibold text-gray-900',
  /** Texto corrido */
  corpo: 'text-sm text-gray-700',
  /** Nome de pessoa/item em listas e tabelas */
  destaque: 'text-sm font-medium text-gray-900',
  /** Informação secundária: datas, logins, contagens */
  apoio: 'text-xs text-gray-500',
  /** Rótulo de campo de formulário */
  rotulo: 'mb-1 block text-xs font-medium text-gray-600',
  /** Rótulo de indicador numérico e cabeçalho de tabela */
  rotuloMaiusculo: 'text-xs font-medium uppercase tracking-wide text-gray-500',
  /** Número grande de indicador */
  numero: 'text-3xl font-semibold tabular-nums',
} as const;

export const espaco = {
  /** Entre blocos de uma página (filtros, avisos, grades) */
  entreBlocos: 'mb-6',
  /** Entre cartões numa grade */
  grade: 'gap-6',
  /** Entre indicadores, campos e botões */
  compacto: 'gap-3',
  /** Dentro de cartão */
  cartao: 'p-5',
  /** Cabeçalho de cartão e de janela */
  cabecalho: 'px-5 py-4',
  /** Célula de tabela */
  celula: 'px-4 py-2.5',
  /** Itens de lista de cartões */
  lista: 'space-y-3',
  /** Campos de formulário */
  formulario: 'space-y-4',
} as const;

export const superficie = {
  cartao: 'rounded-lg border border-gray-200 bg-white shadow-sm',
  vazio: 'rounded-lg border border-dashed border-gray-300 bg-white',
  /** Fundo das áreas restritas */
  pagina: 'bg-gray-100',
} as const;

/** Anel de foco (aparece só na navegação por teclado) */
export const foco = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500';

export const campo =
  `w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-favela-green-500`;

/** Cores de estado (fundo + texto + borda) */
export const estado = {
  sucesso: 'border-green-300 bg-green-50 text-green-800',
  erro: 'border-red-300 bg-red-50 text-red-800',
  atencao: 'border-amber-300 bg-amber-50 text-amber-800',
} as const;

/** Selos (status, contagens): pílula pequena */
export const selo = {
  base: 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
  neutro: 'bg-gray-200 text-gray-700',
  sucesso: 'bg-green-100 text-green-800',
  atencao: 'bg-amber-100 text-amber-800',
  erro: 'bg-red-100 text-red-800',
  informacao: 'bg-blue-100 text-favela-blue-700',
  /** Verde da marca com o roxo institucional (trilha, contagem da aba ativa) */
  marca: 'bg-favela-green-500 text-[#2d2a5f]',
} as const;
