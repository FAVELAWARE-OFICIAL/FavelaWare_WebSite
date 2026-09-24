/**
 * ============================================
 * ESCOLHER FOTO
 * ============================================
 *
 * Botão (ou link) que abre o seletor de imagem. O input fica escondido
 * dentro do label; o texto visível é o `rotulo`, decidido por quem usa.
 * Depois de cada escolha o input é zerado, para dar para escolher o mesmo
 * arquivo de novo.
 */

const CLASSES = {
  botao:
    'inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-favela-green-500',
  'botao-compacto':
    'inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-favela-green-500',
  link: 'cursor-pointer rounded text-xs font-medium text-favela-green-700 hover:underline focus-within:ring-2 focus-within:ring-favela-green-500',
};

const EscolherFoto: React.FC<{
  aoEscolher: (arquivo: File) => void;
  ocupado: boolean;
  rotulo: string;
  variante: keyof typeof CLASSES;
  /** aria-label do input, quando o rótulo sozinho não diz de quem é a foto */
  rotuloAcessivel?: string;
}> = ({ aoEscolher, ocupado, rotulo, variante, rotuloAcessivel }) => (
  <label className={`${CLASSES[variante]} ${ocupado ? 'pointer-events-none opacity-50' : ''}`}>
    {rotulo}
    <input
      type="file"
      accept="image/*"
      className="sr-only"
      aria-label={rotuloAcessivel}
      onChange={(e) => {
        const arquivo = e.target.files?.[0];
        e.target.value = '';
        if (arquivo) aoEscolher(arquivo);
      }}
    />
  </label>
);

export default EscolherFoto;
