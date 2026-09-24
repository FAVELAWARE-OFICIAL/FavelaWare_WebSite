/**
 * Dados de uma chave do cache para usar numa página (ver src/lib/cache.ts).
 * - `dados` vem na hora se já estiver guardado (sem carregamento);
 * - se estava guardado, busca de novo em segundo plano e troca sem piscar;
 * - `recarregar()` busca de novo (use depois de gravar).
 */
import { useCallback, useEffect, useState } from 'react';

import { servicoCache } from '../lib/cache';

export function useDadosEmCache<T>(chave: string, carregar: () => Promise<T>) {
  const [dados, setDados] = useState<T | undefined>(() => servicoCache.lerGuardado<T>(chave));
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    const jaTinha = servicoCache.lerGuardado<T>(chave);
    setDados(jaTinha);
    setErro(false);
    // Tinha guardado: mostra e atualiza por trás. Não tinha: busca (a página mostra o carregamento).
    servicoCache
      .buscar(chave, carregar, jaTinha !== undefined)
      .then((novos) => ativo && setDados(novos))
      .catch(() => ativo && jaTinha === undefined && setErro(true));
    return () => {
      ativo = false;
    };
    // `carregar` muda a cada render; a chave identifica a consulta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const recarregar = useCallback(async () => {
    setDados(await servicoCache.buscar(chave, carregar, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return { dados, erro, recarregar };
}
