/** A lista de alunos com a foto atual do dashboard (enquanto carrega, a do arquivo). Ver src/lib/fotosDoSite.ts. */
import { useEffect, useState } from 'react';

import type { Aluno } from '../data/turmas';
import { servicoFotosDoSite } from '../lib/fotosDoSite';

export function useAlunosComFotoAtual<T extends { alunos: Aluno[] }>(turmas: T[]): T[] {
  const [fotos, setFotos] = useState<Map<number, string | null> | null>(null);

  useEffect(() => {
    let ativo = true;
    servicoFotosDoSite.buscar().then((mapa) => ativo && setFotos(mapa));
    return () => {
      ativo = false;
    };
  }, []);

  if (!fotos?.size) return turmas;
  return turmas.map((turma) => ({
    ...turma,
    alunos: turma.alunos.map((aluno) => {
      if (!aluno.participanteId || !fotos.has(aluno.participanteId)) return aluno;
      return { ...aluno, foto: fotos.get(aluno.participanteId) ?? undefined };
    }),
  }));
}
