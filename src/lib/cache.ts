/**
 * ============================================
 * CACHE DE DADOS DAS ÁREAS RESTRITAS
 * ============================================
 *
 * Guarda o que já foi buscado no Supabase, por uma chave ("turmas:3",
 * "equipe"...). Com isso:
 * - o layout carrega tudo de uma vez na abertura (durante a pintura do
 *   carregamento) e as páginas abrem na hora, já com os dados;
 * - voltar a uma página mostra o que estava guardado imediatamente e atualiza
 *   em segundo plano, sem piscar a tela;
 * - dois pedidos iguais ao mesmo tempo viram uma consulta só.
 *
 * Depois de gravar algo, a página chama recarregar() para buscar de novo.
 */
import { useCallback, useEffect, useState } from 'react';

interface Entrada {
  dados?: unknown;
  promessa?: Promise<unknown>;
}

const guardados = new Map<string, Entrada>();

/** Busca (ou reaproveita a busca em andamento / o que já foi guardado) */
export function buscarComCache<T>(chave: string, carregar: () => Promise<T>, forcar = false): Promise<T> {
  const entrada = guardados.get(chave);
  if (!forcar && entrada?.dados !== undefined) return Promise.resolve(entrada.dados as T);
  if (!forcar && entrada?.promessa) return entrada.promessa as Promise<T>;

  const promessa = carregar().then(
    (dados) => {
      guardados.set(chave, { dados });
      return dados;
    },
    (erro) => {
      guardados.delete(chave); // falhou: na próxima vez tenta de novo
      throw erro;
    },
  );
  guardados.set(chave, { ...entrada, promessa });
  return promessa;
}

/** Esquece o que foi guardado (todas as chaves que começam com o prefixo) */
export function esquecerCache(prefixo = ''): void {
  for (const chave of [...guardados.keys()]) if (chave.startsWith(prefixo)) guardados.delete(chave);
}

/**
 * Dados de uma chave para usar numa página.
 * - `dados` vem na hora se já estiver guardado (sem carregamento);
 * - se estava guardado, busca de novo em segundo plano e troca sem piscar;
 * - `recarregar()` busca de novo (use depois de gravar).
 */
export function useDadosEmCache<T>(chave: string, carregar: () => Promise<T>) {
  const [dados, setDados] = useState<T | undefined>(() => guardados.get(chave)?.dados as T | undefined);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    const jaTinha = guardados.get(chave)?.dados as T | undefined;
    setDados(jaTinha);
    setErro(false);
    // Tinha guardado: mostra e atualiza por trás. Não tinha: busca (a página mostra o carregamento).
    buscarComCache(chave, carregar, jaTinha !== undefined)
      .then((novos) => ativo && setDados(novos))
      .catch(() => ativo && jaTinha === undefined && setErro(true));
    return () => { ativo = false; };
    // `carregar` muda a cada render; a chave identifica a consulta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const recarregar = useCallback(async () => {
    setDados(await buscarComCache(chave, carregar, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return { dados, erro, recarregar };
}
