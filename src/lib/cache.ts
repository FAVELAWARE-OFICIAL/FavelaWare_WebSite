/**
 * ============================================
 * CACHE DE DADOS DAS ÁREAS RESTRITAS
 * ============================================
 *
 * Guarda o que já foi buscado no Supabase, por uma chave ("turmas:3",
 * "equipe"...). Com isso:
 * - o layout carrega tudo de uma vez na abertura e as páginas abrem na hora;
 * - voltar a uma página mostra o que estava guardado e atualiza por trás;
 * - dois pedidos iguais ao mesmo tempo viram uma consulta só.
 *
 * O hook das páginas fica em src/hooks/useDadosEmCache.ts.
 */

interface Entrada {
  dados?: unknown;
  promessa?: Promise<unknown>;
}

export class ServicoCache {
  private guardados = new Map<string, Entrada>();

  /** O que já está guardado para a chave (undefined se nada) */
  lerGuardado<T>(chave: string): T | undefined {
    return this.guardados.get(chave)?.dados as T | undefined;
  }

  /** Busca (ou reaproveita a busca em andamento / o que já foi guardado) */
  buscar<T>(chave: string, carregar: () => Promise<T>, forcar = false): Promise<T> {
    const entrada = this.guardados.get(chave);
    if (!forcar && entrada?.dados !== undefined) return Promise.resolve(entrada.dados as T);
    if (!forcar && entrada?.promessa) return entrada.promessa as Promise<T>;

    const promessa = carregar().then(
      (dados) => {
        this.guardados.set(chave, { dados });
        return dados;
      },
      (erro) => {
        this.guardados.delete(chave); // falhou: na próxima vez tenta de novo
        throw erro;
      },
    );
    this.guardados.set(chave, { ...entrada, promessa });
    return promessa;
  }

  /** Esquece o que foi guardado (todas as chaves que começam com o prefixo) */
  esquecer(prefixo = ''): void {
    for (const chave of [...this.guardados.keys()]) if (chave.startsWith(prefixo)) this.guardados.delete(chave);
  }
}

export const servicoCache = new ServicoCache();
