/**
 * Equipe da edição atual, direto do banco, para a página Sobre.
 * undefined enquanto carrega; null quando não há edição aberta com turma (aí o
 * Sobre mostra a equipe anterior, a Edição III).
 */
import { useEffect, useState } from 'react';

import { servicoSitePublico, type EquipeDaEdicao } from '../lib/sitePublico';

export function useEquipeDaEdicaoAtual(): EquipeDaEdicao | null | undefined {
  const [equipe, setEquipe] = useState<EquipeDaEdicao | null | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    servicoSitePublico.equipeDaEdicaoAtual().then((resultado) => ativo && setEquipe(resultado));
    return () => {
      ativo = false;
    };
  }, []);

  return equipe;
}
