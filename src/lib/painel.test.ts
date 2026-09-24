import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => import('../testes/supabaseFalso'));

import { FAIXAS, FILTROS_INICIAIS, faixaDe, montarPainel, type DadosDaEdicao } from './painel';

/**
 * Turma A: alunos 10 e 11; aula 100 (01/03) e aula 101 (sem data).
 * Turma B: aluno 20; aula 200 (01/03).
 */
const dados: DadosDaEdicao = {
  turmas: [
    { id: 1, nome: 'Turma A' },
    { id: 2, nome: 'Turma B' },
  ],
  participantes: [
    { id: 10, turma_id: 1, funcao: 'aluno', nome: 'Ana', login: 'ana.silva', observacao: null, foto: null },
    { id: 11, turma_id: 1, funcao: 'aluno', nome: 'Bruno', login: 'bruno.souza', observacao: null, foto: null },
    { id: 20, turma_id: 2, funcao: 'aluno', nome: 'Carla', login: 'carla.lima', observacao: null, foto: null },
  ],
  aulas: [
    { id: 100, turma_id: 1, data: '2026-03-01', ordem: 1, descricao: null },
    { id: 101, turma_id: 1, data: null, ordem: 2, descricao: 'Aula sem data na planilha' },
    { id: 200, turma_id: 2, data: '2026-03-01', ordem: 1, descricao: null },
  ],
  presencas: [
    { participante_id: 10, aula_id: 100, situacao: 'presente', registro_original: 'P' },
    { participante_id: 11, aula_id: 100, situacao: 'ausente', registro_original: 'A' },
    { participante_id: 10, aula_id: 101, situacao: 'presente', registro_original: 'P' },
    { participante_id: 20, aula_id: 200, situacao: 'presente', registro_original: 'P' },
  ],
  mudancasHorario: [],
};

describe('montarPainel: presentes por aula', () => {
  it('conta só as aulas com data, no mesmo recorte do divisor', () => {
    const painel = montarPainel(dados, FILTROS_INICIAIS);
    // Aulas com data: 100 e 200. Presentes nelas: Ana (100) e Carla (200).
    // Antes dava round(3 / 2) = 2, porque a aula sem data entrava só no numerador.
    expect(painel.quantidadeDeAulas).toBe(2);
    expect(painel.presentesPorAula).toBe(1);
  });

  it('com filtro de turma, não mistura presenças de outra turma', () => {
    const painel = montarPainel(dados, { ...FILTROS_INICIAIS, turma: '1' });
    expect(painel.quantidadeDeAulas).toBe(1);
    expect(painel.presentesPorAula).toBe(1); // só a Ana na aula 100
  });

  it('sem aula com data, a média é 0 e não divide por zero', () => {
    const painel = montarPainel(dados, { ...FILTROS_INICIAIS, dataDe: '2027-01-01' });
    expect(painel.quantidadeDeAulas).toBe(0);
    expect(painel.presentesPorAula).toBe(0);
  });
});

describe('montarPainel: comparação entre turmas', () => {
  it('turma sem aula contável no período fica sem valor, não 0%', () => {
    const painel = montarPainel(dados, { ...FILTROS_INICIAIS, dataDe: '2027-01-01' });
    expect(painel.porTurma.map((t) => t.valor)).toEqual([null, null]);
  });

  it('turma com aula tem a média de frequência dos alunos', () => {
    const painel = montarPainel(dados, FILTROS_INICIAIS);
    // Ana 100% (2 de 2), Bruno 0% (0 de 1): média 50%. Carla 100%.
    expect(painel.porTurma).toEqual([
      { rotulo: 'Turma A', alunos: 2, valor: 0.5 },
      { rotulo: 'Turma B', alunos: 1, valor: 1 },
    ]);
  });
});

describe('faixas de frequência', () => {
  it('mantêm os mesmos rótulos de antes', () => {
    expect(FAIXAS.map((f) => f.rotulo)).toEqual(['Abaixo de 50%', 'De 50% a 74%', '75% ou mais']);
  });

  it('classificam nos limites', () => {
    expect(faixaDe(null)).toBeNull();
    expect(faixaDe(0.49)).toBe('baixa');
    expect(faixaDe(0.5)).toBe('media');
    expect(faixaDe(0.74)).toBe('media');
    expect(faixaDe(0.75)).toBe('alta');
  });

  it('abaixo da meta conta quem está abaixo de 75%', () => {
    expect(montarPainel(dados, FILTROS_INICIAIS).abaixoDaMeta).toBe(1); // o Bruno
  });
});
