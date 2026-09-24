/**
 * Preferências deste navegador (tema, menu, edição e turma escolhidas).
 * localStorage pode falhar (aba anônima, bloqueio): nesse caso só não lembra.
 */

/** Turma escolhida por último na área do professor (chamada e trilhas) */
export const PREFERENCIA_TURMA_DO_PROFESSOR = 'professor:turma';

export function lerPreferencia(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

export function gravarPreferencia(chave: string, valor: string): void {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* sem memória, sem problema */
  }
}
