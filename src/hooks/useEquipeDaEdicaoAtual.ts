/** Instrutores da edição atual, direto do banco, para a página Sobre (null enquanto carrega ou sem edição aberta) */
import { useEffect, useState } from 'react';

import { servicoSitePublico, type EquipeDaEdicao } from '../lib/sitePublico';

export function useEquipeDaEdicaoAtual(): EquipeDaEdicao | null {
  const [equipe, setEquipe] = useState<EquipeDaEdicao | null>(null);

  useEffect(() => {
    let ativo = true;
    servicoSitePublico.equipeDaEdicaoAtual().then((resultado) => ativo && setEquipe(resultado));
    return () => {
      ativo = false;
    };
  }, []);

  return equipe;
}
