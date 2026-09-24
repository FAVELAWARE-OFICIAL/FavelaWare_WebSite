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

/** Completa o que a pessoa costuma colar ("linkedin.com/in/maria", sem https) e padroniza */
function completarLink(texto: string): string {
  const completo = /^https?:\/\//i.test(texto) ? texto.replace(/^https?:/i, 'https:') : `https://${texto}`;
  // Sem ?busca e #âncora; esquema e domínio em minúsculas
  return completo.split(/[?#]/)[0].replace(/^https:\/\/[^/]+/i, (inicio) => inicio.toLowerCase());
}

/**
 * LinkedIn como o banco aceita: https://(www.)linkedin.com/in/<perfil>.
 * Devolve null se vazio, ou undefined se não for um perfil do LinkedIn.
 */
export function normalizarLinkedin(valor: string | null): string | null | undefined {
  const texto = (valor ?? '').trim();
  if (!texto) return null;
  const link = completarLink(texto);
  return perfilLinkedinValido(link) ? link : undefined;
}

/**
 * GitHub como o banco aceita: https://github.com/<usuario>. Aceita só o usuário
 * ("maria-dev") ou o endereço colado. null se vazio, undefined se não servir.
 */
export function normalizarGithub(valor: string | null): string | null | undefined {
  const texto = (valor ?? '').trim().replace(/^@/, '');
  if (!texto) return null;
  // "www.github.com" também vale: fica sem o www
  const link = /github\.com/i.test(texto)
    ? completarLink(texto).replace('https://www.github.com', 'https://github.com')
    : `https://github.com/${texto}`;
  return /^https:\/\/github\.com\/[A-Za-z0-9](-?[A-Za-z0-9]){0,38}\/?$/.test(link) ? link : undefined;
}

/** Link aceito pelo sistema: só https:// */
export const linkValido = (url: string) => /^https:\/\/\S+$/i.test(url.trim());
