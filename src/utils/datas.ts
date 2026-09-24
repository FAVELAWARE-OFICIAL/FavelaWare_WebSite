/**
 * Datas do sistema.
 *
 * - Datas do banco (colunas `date`) circulam como texto "AAAA-MM-DD" e nunca
 *   passam por Date + UTC, que mudaria o dia pelo fuso.
 * - Data e hora (colunas `timestamptz`) aparecem sempre no horário de Brasília.
 */

const FUSO_BRASILIA = 'America/Sao_Paulo';

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Date -> "AAAA-MM-DD" pela data local (sem passar por UTC) */
export const dataDoBanco = (d: Date) =>
  `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;

/** Data de hoje no fuso do navegador, no formato do banco */
export const hoje = () => dataDoBanco(new Date());

/** "AAAA-MM-DD" de N dias antes de hoje */
export function diasAtras(n: number): string {
  const d = new Date(`${hoje()}T12:00:00`);
  d.setDate(d.getDate() - n);
  return dataDoBanco(d);
}

/** "2024-03-07" -> "07/03/2024" */
export function formatarData(data: string | null): string {
  if (!data) return 'sem data';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** timestamptz -> "07/03/2024" (só o dia, no fuso do navegador) */
export const formatarDia = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** timestamptz -> "07/03/2024 14:30" no horário de Brasília */
export const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    timeZone: FUSO_BRASILIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** timestamptz -> valor de <input type="datetime-local"> no horário de Brasília */
export function paraCampoDataHora(iso: string): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO_BRASILIA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

/**
 * Valor de <input type="datetime-local"> (horário de Brasília) -> ISO.
 * Usa -03:00 fixo: o Brasil não tem horário de verão desde 2019. Se voltar a ter,
 * trocar pelo deslocamento calculado com Intl (senão o prazo muda 1h ao editar).
 */
export const deCampoDataHora = (valor: string) => new Date(`${valor}:00-03:00`).toISOString();
