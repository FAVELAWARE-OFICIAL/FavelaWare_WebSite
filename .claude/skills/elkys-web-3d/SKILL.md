---
name: elkys-web-3d
description: 3D e WebGL no site Elkys — three.js, React Three Fiber, drei, shaders GLSL, modelos glTF/GLB, cena interativa, hero 3D, partículas, canvas WebGL e animação pesada. Use ao adicionar, alterar ou depurar qualquer elemento 3D, ou ao avaliar se vale a pena colocar 3D numa página.
---

# 3D na web — Elkys

**Estado atual: o projeto não tem nenhuma dependência 3D ou de animação** (sem three, R3F, GSAP, framer-motion). Qualquer 3D aqui é greenfield — a decisão de stack é sua e precisa ser justificada.

## Antes de adicionar 3D, decida se cabe

O site é um bundle estático servido por FTP na Hostinger, com a landing sob otimização agressiva de LCP (ver skill `elkys-perf-web`). three.js sozinho passa de ~150KB gzip. **Um canvas 3D no caminho crítico da landing destrói o trabalho de performance existente.**

Só siga se: (a) o 3D é o elemento característico da página, não decoração; e (b) existe fallback estático que entrega a mesma mensagem.
Se for só "dar um charme", uma animação CSS ou um SVG animado resolve por uma fração do custo.

## Divisão de trabalho com as skills de biblioteca

Estas skills instaladas cobrem o **como fazer** de cada lib. Esta skill aqui cobre as **restrições do projeto Elkys** — as duas se complementam, use ambas:

| Precisa de                                  | Use a skill                  |
| ------------------------------------------- | ---------------------------- |
| API do Three.js, WebGL, materiais, câmeras  | `threejs-webgl`              |
| Cena declarativa em React, hooks, drei      | `react-three-fiber`          |
| Animação, timeline, scroll-driven, pin      | `gsap-scrolltrigger`         |
| Combinar 3D + scroll + animação numa página | `web3d-integration-patterns` |
| Se cabe 3D aqui, budget, chunk, fallback    | **esta skill**               |

Nenhuma delas conhece o pipeline de build do Elkys. **As regras abaixo têm precedência** sobre o que elas sugerirem.

## Stack recomendada

- `three` + `@react-three/fiber` + `@react-three/drei`.
- **Atenção de versão**: o projeto está em **React 18.3**. React Three Fiber v9 exige React 19 — confirme a matriz de compatibilidade e fixe a linha v8 se ficar no React 18. Verifique antes de instalar, não assuma. **A skill `react-three-fiber` não menciona restrição de versão nenhuma** — essa checagem é sua.
- **GSAP**: a skill `gsap-scrolltrigger` não fala de licenciamento. Confirme os termos atuais do GSAP/ScrollTrigger antes de usar em produção comercial.
- Sem R3F (cena simples, fora do ciclo do React): three.js puro num `useEffect` com cleanup explícito de `renderer.dispose()`, geometrias e materiais.

## Regras obrigatórias

1. **Carregamento isolado.** `React.lazy()` na cena inteira + entrada dedicada em `manualChunks` no `vite.config.ts`. Nunca importe `three` no entry ou em componente que a landing carrega de forma síncrona.
2. **Fallback primeiro.** Renderize imagem/poster estático no `Suspense` fallback e enquanto o modelo carrega. O LCP não pode depender do WebGL.
3. **`prefers-reduced-motion` é lei.** O DS já aplica `animation: none !important` globalmente (§10), mas isso **não para um `requestAnimationFrame`**. Detecte via `matchMedia("(prefers-reduced-motion: reduce)")` e renderize um frame estático — não anime.
4. **Pause fora do viewport.** `IntersectionObserver` + `frameloop="demand"` ou parar o RAF. Cena 3D girando invisível queima bateria e trava o scroll no mobile.
5. **Degradar sem WebGL.** Cheque suporte e caia no fallback estático; nunca deixe tela branca.
6. **Cleanup.** `dispose()` em geometria, material, textura e renderer no unmount — vazamento aqui trava a SPA depois de algumas navegações. Se suspeitar de vazamento, use a skill `memory-leak-debugging`.
7. **Assets**: glTF/GLB comprimido (Draco/Meshopt), texturas em KTX2/webp, servidos de `public/`. Orçamento: mantenha o payload 3D total abaixo de ~1MB.
8. **Acessibilidade**: o `<canvas>` precisa de `aria-label` ou de um resumo textual equivalente ao lado. 3D nunca é o único portador de informação.
9. **Cores** saem dos tokens do DS, não de hex solto no material — leia o CSS custom property e converta.

## Ao terminar

Meça o antes/depois com `npm run build` (olhe o chunk 3D isolado) e um trace de LCP na página afetada. Se o 3D entrou na landing, confirme que `landingChunkPatterns` não passou a arrastar o chunk 3D para o PurgeCSS scan.
