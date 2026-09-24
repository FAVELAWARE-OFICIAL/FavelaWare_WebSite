/** Validações e ajustes de texto usados em mais de um formulário */

/** "  " -> null; " Maria " -> "Maria" (campo opcional vazio vira nulo no banco) */
export const vazioViraNulo = (texto: string) => (texto.trim() ? texto.trim() : null);

/** E-mail com usuário, @ e domínio com ponto (o banco confere de novo) */
export const emailValido = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

/** Iniciais para o avatar sem foto: "Maria da Silva" -> "MD"; nome vazio -> "?" */
export const iniciaisDoNome = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

/** Perfil do LinkedIn no formato que o banco aceita (https://[br.]linkedin.com/in/usuario) */
export const perfilLinkedinValido = (url: string) =>
  url.length <= 200 && /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9%_-]{2,100}\/?$/.test(url);

/** Link aceito pelo sistema: só https:// */
export const linkValido = (url: string) => /^https:\/\/\S+$/i.test(url.trim());
