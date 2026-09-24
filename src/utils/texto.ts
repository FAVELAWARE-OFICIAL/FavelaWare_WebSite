/** Validações e ajustes de texto usados em mais de um formulário */

/** "  " -> null; " Maria " -> "Maria" (campo opcional vazio vira nulo no banco) */
export const vazioViraNulo = (texto: string) => (texto.trim() ? texto.trim() : null);

/** E-mail com usuário, @ e domínio com ponto (o banco confere de novo) */
export const emailValido = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

/** Link aceito pelo sistema: só https:// */
export const linkValido = (url: string) => /^https:\/\/\S+$/i.test(url.trim());
