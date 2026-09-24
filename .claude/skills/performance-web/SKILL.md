---
name: performance-web
description: Performance web — LCP, Core Web Vitals, PageSpeed, tamanho de bundle, chunks, CSS crítico, preload, imagens, fontes e tempo de build. Use ao mexer na configuração do bundler ou nos scripts de build/prerender, ao adicionar dependência pesada, ao investigar "site lento", "PSI baixo" ou "LCP alto", e antes de subir mudança que afete a página de entrada.
---

# Performance web

Se o projeto tiver skill própria de performance (ex.: `<projeto>-perf-web`), carregue-a junto: ela traz o pipeline real, os números medidos e o que já foi tentado, e manda no detalhe.

## Antes de propor qualquer mudança

Leia a configuração do bundler (`vite.config.*`, `webpack.config.*`, `next.config.*`) e os scripts de build do `package.json`; os comentários ali costumam explicar o porquê de cada decisão. Em pipeline já otimizado, o risco maior é **regredir**. Pronto quando você sabe dizer como o CSS chega à página de entrada (blocking, inline, purgado), quais chunks recebem preload e o que roda no build além do bundler (prerender, sitemap, pós-processamento).

## Armadilhas conhecidas

- **CSS crítico inline + resto async pode piorar o LCP.** Se as utilities (Tailwind) do elemento do LCP ficam fora do inline, ele só ganha o estilo final quando a folha async chega — num caso medido, ~2s de render delay. Troque CSS blocking por async só com medição antes/depois.
- **Plugins `enforce: "post"` rodam em paralelo no Rollup.** Dois `closeBundle` que injetam no mesmo HTML não têm ordem garantida: o que depende de ordem (hint antes do `<style>`, por exemplo) fica num plugin só.

## Regras ao mexer

- **Página nova na entrada:** se o build tem uma lista de chunks que alimenta purge de CSS, inline ou preload, inclua a página nela — senão o CSS dela some em produção.
- **Dependência pesada** (3D, gráfico, editor) fica **fora** do caminho da página de entrada: `React.lazy()`/import dinâmico + chunk próprio (`manualChunks` no Vite). Nunca no entry.
- **Fontes**: self-hosted, com subset, só os pesos usados. Peso novo precisa de justificativa.
- **Imagens**: webp/avif + `width`/`height` explícitos (evita CLS) + `loading="lazy"` fora do viewport. A imagem do LCP **nunca** é lazy.
- Aviso de chunk grande do bundler é sinal real, não ruído.

## Como medir

- Rode o build e leia o output de chunks; use o visualizador de bundle, se o projeto tiver (ex.: `rollup-plugin-visualizer`).
- Trace real de LCP/CWV: DevTools, ou as skills `debug-optimize-lcp` e `chrome-devtools` (plugin `chrome-devtools-mcp`), se instaladas.
- Saiba como é o deploy (estático, SSR, CDN) antes de atribuir lentidão ao código.

Sempre reporte o delta medido (antes/depois), nunca só "otimizei".
