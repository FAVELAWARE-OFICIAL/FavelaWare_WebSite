/** Tamanho para a tela: "320 KB", "1,5 MB" (vírgula decimal) */
export const tamanhoLegivel = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

/**
 * Baixa um arquivo por um link (de Edge Function) e salva com o nome escolhido.
 * Baixar pelo fetch mantém a pessoa no portal: se o servidor ou o Drive falhar,
 * quem chamou mostra o erro no botão em vez de abrir uma página de erro.
 */
export async function baixarPorLink(url: string, nome: string): Promise<void> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  const endereco = URL.createObjectURL(await r.blob());
  const a = document.createElement('a');
  a.href = endereco;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(endereco), 10000);
}
