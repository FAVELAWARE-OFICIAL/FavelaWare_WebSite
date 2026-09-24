/**
 * ============================================
 * AVATAR DO ALUNO
 * ============================================
 *
 * Foto do aluno (a mesma da página da turma no site) ou, sem foto, o avatar
 * padrão do site (silhueta branca sobre verde). Se o arquivo da foto falhar,
 * cai no avatar padrão também.
 */
import { useState } from 'react';
import { FOTO_PADRAO_DE_PESSOA } from '../../data/imagens';

// Mesmo avatar usado em src/pages/TurmaDetalhe.tsx

const TAMANHOS = { sm: 'h-9 w-9', md: 'h-12 w-12', lg: 'h-20 w-20' };

const Avatar: React.FC<{ foto: string | null; nome: string; tamanho?: keyof typeof TAMANHOS }> = ({
  foto,
  nome,
  tamanho = 'sm',
}) => {
  const [falhou, setFalhou] = useState(false);
  return (
    <img
      src={foto && !falhou ? foto : FOTO_PADRAO_DE_PESSOA}
      alt={foto && !falhou ? `Foto de ${nome}` : ''}
      onError={() => setFalhou(true)}
      loading="lazy"
      className={`${TAMANHOS[tamanho]} shrink-0 rounded-full bg-favela-green-500 object-cover ring-1 ring-gray-200`}
    />
  );
};

export default Avatar;
