---
name: elkys-perf-web
description: Otimização de performance do site Elkys — LCP, Core Web Vitals, PageSpeed, tamanho de bundle, chunks, CSS crítico, preload, imagens, fontes e tempo de build. Use ao mexer em vite.config.ts, manualChunks, scripts de build/prerender, ao adicionar dependência pesada, ao investigar "site lento", "PSI baixo", "LCP alto", ou antes de subir mudança que afete a landing.
---

# Performance web — Elkys

O pipeline de build **já é altamente otimizado**. A maior parte do risco aqui é **regredir**, não deixar de otimizar.
Leia `vite.config.ts` (o comentário do plugin `landingCssAndPreloads` explica o porquê de cada decisão) antes de propor qualquer mudança.

## Arquitetura de performance atual

1. **PurgeCSS split landing/portal** — o CSS da landing é purgado contra uma *positive list* de chunks (`landingChunkPatterns`) e injetado inline como `<style>`. O portal carrega a folha completa sob demanda via `PortalShell` (`window.__ELKYS_FULL_CSS__`).
2. **modulepreload** `fetchpriority=high` para `react-vendor` e `query-vendor`, injetado **antes** do `<style>` inline.
3. **Entry JS inlined no HTML** — elimina o round-trip "HTML → entry.js" que o PSI reporta como encadeamento crítico.
4. **Prerender** (`scripts/prerender.cjs`) + sitemap + `.htaccess`, tudo no `npm run build`.
5. `build:min` usa Terser e remove `console.*`.

## Armadilhas já pagas (NÃO repetir)

- **Extrair "critical CSS" e tornar o resto async já foi tentado e causou ~2s de render delay no LCP.** As utilities do Tailwind não entravam no inline e o `<h1>` do Hero só ganhava estilo final quando a folha async chegava. **O CSS continua blocking de propósito.** Não reabra isso sem medição.
- O `landingCssAndPreloads` foi unificado num único `closeBundle` porque dois plugins `enforce:"post"` rodam em paralelo no Rollup e os hints acabavam injetados antes do `<style>`. **Não separe de novo.**

## Regras ao mexer

- **Adicionou página nova na landing?** Inclua o chunk em `landingChunkPatterns` do `vite.config.ts`, senão o PurgeCSS remove o CSS dela e a página quebra visualmente em produção.
- **Dependência nova pesada** (3D, gráfico, editor): tem de ficar **fora** do caminho da landing. `React.lazy()` + entrada própria em `manualChunks`. Nunca importe no entry.
- **Fontes**: Poppins self-hosted, 4 pesos, com subset. Sem Google Fonts CDN. Não adicione peso novo sem justificar.
- **Imagens**: logo já em webp. Prefira webp/avif + `width`/`height` explícitos (evita CLS) + `loading="lazy"` fora do viewport. O LCP do Hero **não** pode ser lazy.
- `chunkSizeWarningLimit` é 1000 — aviso de chunk grande é sinal real, não ruído.

## Como medir

- `npm run build` e olhe o output de chunks; `rollup-plugin-visualizer` já está configurado.
- Para trace real de LCP/CWV, use as skills `debug-optimize-lcp` e `chrome-devtools` (plugin `chrome-devtools-mcp`).
- Produção: https://elkys.com.br — o deploy é estático via FTP na Hostinger, sem SSR em runtime.

Sempre reporte o delta medido (antes/depois), nunca só "otimizei".
