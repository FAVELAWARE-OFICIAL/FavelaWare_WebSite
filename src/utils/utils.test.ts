import { afterEach, describe, expect, it, vi } from 'vitest';

import { dataDoBanco, deCampoDataHora, diasAtras, formatarData, hoje, paraCampoDataHora } from './datas';
import { emailValido, linkValido, vazioViraNulo } from './texto';

describe('datas', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formata a data do banco sem passar por fuso', () => {
    expect(formatarData('2024-03-07')).toBe('07/03/2024');
    expect(formatarData(null)).toBe('sem data');
  });

  it('usa a data local, não a de UTC', () => {
    expect(dataDoBanco(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('conta dias para trás a partir de hoje', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 1, 10));
    expect(hoje()).toBe('2026-03-01');
    expect(diasAtras(1)).toBe('2026-02-28');
    expect(diasAtras(30)).toBe('2026-01-30');
  });

  it('ida e volta do campo de data e hora no horário de Brasília', () => {
    expect(deCampoDataHora('2026-03-07T14:30')).toBe('2026-03-07T17:30:00.000Z');
    expect(paraCampoDataHora('2026-03-07T17:30:00.000Z')).toBe('2026-03-07T14:30');
  });
});

describe('texto', () => {
  it('campo vazio vira nulo', () => {
    expect(vazioViraNulo('   ')).toBeNull();
    expect(vazioViraNulo(' Maria ')).toBe('Maria');
  });

  it('confere e-mail e link https', () => {
    expect(emailValido(' maria@exemplo.com ')).toBe(true);
    expect(emailValido('maria@exemplo')).toBe(false);
    expect(linkValido('https://drive.google.com/x')).toBe(true);
    expect(linkValido('http://drive.google.com/x')).toBe(false);
  });
});
