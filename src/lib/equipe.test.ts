import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => import('../testes/supabaseFalso'));

import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase as supabaseFalso } from '../testes/supabaseFalso';
import { excecaoDeNegocio, StatusProcessamento, sucesso } from '../types';
import { servicoEquipe } from './equipe';

describe('equipe: remover apaga a conta pelo servidor', () => {
  const chamarFuncao = (resposta: { error: unknown }) => {
    const invoke = vi.fn(async () => ({ data: null, ...resposta }));
    Object.assign(supabaseFalso, { functions: { invoke } });
    return invoke;
  };

  it('chama a Edge Function remover-membro com a conta', async () => {
    const invoke = chamarFuncao({ error: null });
    await servicoEquipe.remover('conta-1');
    expect(invoke).toHaveBeenCalledWith('remover-membro', { body: { id: 'conta-1' } });
  });

  it('recusa do servidor vira erro com o texto dele', async () => {
    const recusa = new Response(JSON.stringify({ erro: 'Você não pode remover a própria conta.' }), { status: 403 });
    chamarFuncao({ error: new FunctionsHttpError(recusa) });
    await expect(servicoEquipe.remover('conta-1')).rejects.toThrow('Você não pode remover a própria conta.');
  });

  it('falha de rede vira erro com o texto padrão', async () => {
    chamarFuncao({ error: new Error('rede') });
    await expect(servicoEquipe.remover('conta-1')).rejects.toThrow('Não foi possível remover da equipe.');
  });
});

describe('equipe: adicionar membro pela tela Membros', () => {
  afterEach(() => vi.restoreAllMocks());

  const convitePronto = () =>
    vi.spyOn(servicoEquipe, 'convidar').mockResolvedValue({ resultado: sucesso(), contaId: 'conta-1' });

  it('instrutor: só o convite, sem turma e sem trocar a função', async () => {
    const convidar = convitePronto();
    const trocar = vi.spyOn(servicoEquipe, 'trocarFuncao');
    const { resultado, aviso } = await servicoEquipe.adicionarMembro('Maria', 'maria@exemplo.com', 'professor');
    expect(convidar).toHaveBeenCalledWith('Maria', 'maria@exemplo.com', []);
    expect(trocar).not.toHaveBeenCalled();
    expect(resultado.status).toBe(StatusProcessamento.Sucesso);
    expect(aviso).toBeUndefined();
  });

  it('gestor, colaborador e parceiro: convite e depois a troca de função da conta criada', async () => {
    convitePronto();
    const trocar = vi.spyOn(servicoEquipe, 'trocarFuncao').mockResolvedValue(null);
    for (const papel of ['gestor', 'colaborador', 'parceiro'] as const) {
      const { resultado, aviso } = await servicoEquipe.adicionarMembro('Ana', 'ana@exemplo.com', papel);
      expect(trocar).toHaveBeenLastCalledWith('conta-1', papel);
      expect(resultado.status).toBe(StatusProcessamento.Sucesso);
      expect(aviso).toBeUndefined();
    }
  });

  it('convite recusado: devolve o erro e não troca função', async () => {
    vi.spyOn(servicoEquipe, 'convidar').mockResolvedValue({
      resultado: excecaoDeNegocio('Já existe uma conta com esse e-mail.'),
    });
    const trocar = vi.spyOn(servicoEquipe, 'trocarFuncao');
    const { resultado } = await servicoEquipe.adicionarMembro('Ana', 'ana@exemplo.com', 'gestor');
    expect(resultado.mensagem).toBe('Já existe uma conta com esse e-mail.');
    expect(trocar).not.toHaveBeenCalled();
  });

  it('convite saiu e a troca falhou: sucesso com aviso de que ficou como instrutor', async () => {
    convitePronto();
    vi.spyOn(servicoEquipe, 'trocarFuncao').mockResolvedValue('Só a coordenação troca a função das pessoas.');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { resultado, aviso } = await servicoEquipe.adicionarMembro('Ana', 'ana@exemplo.com', 'gestor');
    expect(resultado.status).toBe(StatusProcessamento.Sucesso);
    expect(aviso).toContain('ficou como instrutor(a)');
  });
});
