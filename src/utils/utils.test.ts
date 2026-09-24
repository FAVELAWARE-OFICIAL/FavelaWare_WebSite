import { afterEach, describe, expect, it, vi } from 'vitest';

import { dataDoBanco, deCampoDataHora, diasAtras, formatarData, hoje, paraCampoDataHora } from './datas';
import { tamanhoLegivel } from './arquivos';
import { emailValido, iniciaisDoNome, linkValido, perfilLinkedinValido, vazioViraNulo } from './texto';

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

describe('ajudantes compartilhados', () => {
  it('iniciais do avatar: duas primeiras palavras, e "?" sem nome', () => {
    expect(iniciaisDoNome('maria da silva')).toBe('MD');
    expect(iniciaisDoNome('  ')).toBe('?');
  });

  it('tamanho do arquivo com vírgula decimal', () => {
    expect(tamanhoLegivel(300)).toBe('1 KB');
    expect(tamanhoLegivel(1.5 * 1024 * 1024)).toBe('1,5 MB');
  });

  it('LinkedIn: só o perfil no formato que o banco aceita', () => {
    expect(perfilLinkedinValido('https://www.linkedin.com/in/maria-silva')).toBe(true);
    expect(perfilLinkedinValido('https://br.linkedin.com/in/maria/')).toBe(true);
    expect(perfilLinkedinValido('https://linkedin.com/company/x')).toBe(false);
    expect(perfilLinkedinValido('https://outro.site/in/maria')).toBe(false);
  });
});
