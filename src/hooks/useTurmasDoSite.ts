/**
 * Turmas da página Turmas (e do detalhe de cada turma): as do arquivo com a
 * foto atual do dashboard e as das edições novas, do banco (a regra fica em
 * servicoSitePublico). Enquanto o banco responde, ficam só as do arquivo.
 */
import { useEffect, useState } from 'react';

import { turmas as turmasDoArquivo, type TurmaDoSite } from '../data/turmas';
import { servicoSitePublico, type AlunoAtualizado } from '../lib/sitePublico';

export function useTurmasDoSite(): { turmas: TurmaDoSite[]; carregandoDoBanco: boolean } {
  const [fotos, setFotos] = useState<Map<number, AlunoAtualizado>>(new Map());
  const [novas, setNovas] = useState<TurmaDoSite[] | null>(null);

  useEffect(() => {
    let ativo = true;
    servicoSitePublico.fotosDosAlunos().then((mapa) => ativo && setFotos(mapa));
    servicoSitePublico.turmasDoBanco().then((turmas) => ativo && setNovas(turmas));
    return () => {
      ativo = false;
    };
  }, []);

  return {
    turmas: servicoSitePublico.juntarTurmas(turmasDoArquivo, fotos, novas ?? []),
    carregandoDoBanco: novas === null,
  };
}
