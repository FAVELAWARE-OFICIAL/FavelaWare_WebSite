/**
 * Edições do Hall da Fama: as novas encerradas (do banco, retrato do dia do
 * encerramento) antes das do arquivo. Enquanto o banco responde, ou se ele não
 * responder, ficam só as do arquivo.
 */
import { useEffect, useMemo, useState } from 'react';

import { gruposDoArquivo, type GrupoDoHall } from '../data/hallDaFama';
import { servicoSitePublico } from '../lib/sitePublico';

export function useHallDaFama(): GrupoDoHall[] {
  const [doBanco, setDoBanco] = useState<GrupoDoHall[]>([]);

  useEffect(() => {
    let ativo = true;
    servicoSitePublico.hallDoBanco().then((grupos) => ativo && setDoBanco(grupos));
    return () => {
      ativo = false;
    };
  }, []);

  return useMemo(() => [...doBanco, ...gruposDoArquivo], [doBanco]);
}
