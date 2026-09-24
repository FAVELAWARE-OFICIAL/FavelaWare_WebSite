import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => import('../testes/supabaseFalso'));

import {
  resumoNaTurma,
  paraCorrigir,
  servicoAtividades,
  situacaoDoAluno,
  type Atividade,
  type Tentativa,
} from './atividades';

const tentativa = (participante: number, status: Tentativa['status'], numero = 1): Tentativa => ({
  id: participante * 10 + numero,
  participante_id: participante,
  numero,
  comentario: null,
  link: null,
  arquivo_caminho: null,
  arquivo_nome: null,
  arquivo_id: null,
  arquivo: null,
  enviada_em: '2026-03-01T12:00:00Z',
  status,
  feedback: null,
  nota: null,
  avaliada_em: null,
  avaliada_por_nome: null,
});

const atividade = (prazo: string, tentativas: Tentativa[]): Atividade => ({
  id: 1,
  turma_id: 1,
  trilha_id: 1,
  titulo: 'Atividade',
  enunciado: 'Faça',
  prazo,
  trilha: null,
  tentativas,
  exige_texto: false,
  exige_link: false,
  tipo_link: 'qualquer',
  exige_arquivo: false,
  formatos: [],
});

describe('resumo da atividade na turma', () => {
  // Aluno 99 saiu da turma: as entregas dele não contam
  const a = atividade('2000-01-01T00:00:00Z', [
    tentativa(1, 'refazer', 1),
    tentativa(1, 'aguardando', 2),
    tentativa(2, 'concluida'),
    tentativa(99, 'aguardando'),
  ]);
  const naTurma = new Set([1, 2, 3]);

  it('conta entregas para corrigir e quem entregou, só da turma', () => {
    expect(resumoNaTurma(a, naTurma)).toEqual({ aguardando: 1, entregaram: 2, encerrada: true });
  });

  it('soma as entregas para corrigir de várias atividades', () => {
    expect(paraCorrigir([a, a], naTurma)).toBe(2);
  });
});

describe('situação do aluno', () => {
  it('sem entrega: pendente antes do prazo e encerrada depois', () => {
    expect(situacaoDoAluno([], '2999-01-01T00:00:00Z')).toBe('pendente');
    expect(situacaoDoAluno([], '2000-01-01T00:00:00Z')).toBe('encerrada');
  });

  it('com entrega: a situação da última tentativa', () => {
    expect(situacaoDoAluno([tentativa(1, 'refazer', 1), tentativa(1, 'concluida', 2)], '2000-01-01T00:00:00Z')).toBe(
      'concluida',
    );
  });
});

describe('correção: conferência antes de gravar', () => {
  const corrigir = (notaDigitada: string, feedback = 'Bom trabalho', status: 'concluida' | 'refazer' = 'concluida') =>
    servicoAtividades.avaliar(1, { status, feedback, notaDigitada });

  it('recusa nota fora de 0 a 100 ou com vírgula', async () => {
    expect(await corrigir('101')).toBe('A nota vai de 0 a 100, sem vírgula.');
    expect(await corrigir('-1')).toBe('A nota vai de 0 a 100, sem vírgula.');
    expect(await corrigir('7.5')).toBe('A nota vai de 0 a 100, sem vírgula.');
  });

  it('exige feedback', async () => {
    expect(await corrigir('80', '   ')).toBe('Escreva o feedback para o aluno.');
  });

  it('exige nota para concluir, mas não para pedir refazer', async () => {
    expect(await corrigir('', 'Falta a parte 2')).toBe('Dê a nota (0 a 100) para concluir.');
    // Refazer sem nota passa da conferência e chega ao banco (que o falso recusa)
    await expect(corrigir('', 'Falta a parte 2', 'refazer')).rejects.toThrow('Teste não deveria chegar ao banco');
  });
});
