/**
 * Cliente Supabase falso para os testes dos serviços: nenhum teste toca a rede.
 * Uso: vi.mock('../lib/supabase', () => import('../testes/supabaseFalso'));
 */
import { vi } from 'vitest';

/** Liga para simular falha de leitura no banco */
export const consultaFalha = { ativa: false };

export const removerDoStorage = vi.fn(async () => ({ error: null }));

export const supabase = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    getSession: async () => ({ data: { session: null } }),
  },
  storage: { from: () => ({ remove: removerDoStorage }) },
  from: () => {
    if (!consultaFalha.ativa) throw new Error('Teste não deveria chegar ao banco');
    // Consulta encadeada (select/eq/order/limit) que termina com erro do banco
    const erro = { data: null, error: { code: '08006', message: 'conexão perdida' } };
    const cadeia: Record<string, unknown> = {};
    for (const metodo of ['select', 'eq', 'order', 'limit']) cadeia[metodo] = () => cadeia;
    cadeia.maybeSingle = async () => erro;
    return cadeia;
  },
};

export const definirLembrarDeMim = () => {};
