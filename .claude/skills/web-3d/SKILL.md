---
name: web-3d
description: 3D e WebGL na web — three.js, React Three Fiber, drei, shaders GLSL, modelos glTF/GLB, cena interativa, hero 3D, partículas, canvas WebGL e animação pesada. Use ao adicionar, alterar ou depurar elemento 3D, ou ao avaliar se vale a pena colocar 3D numa página.
---

# 3D na web

Se o projeto tiver skill própria de 3D (ex.: `<projeto>-web-3d`), carregue-a junto: ela traz o estado e as restrições reais do projeto, e manda no detalhe.

## Antes de adicionar 3D, decida se cabe

**Descubra o estado:** o `package.json` já tem `three`, `@react-three/fiber`, GSAP ou outra lib de animação? Se não, é greenfield — a decisão de stack é sua e precisa ser justificada.

three.js sozinho passa de ~150KB gzip. **Um canvas 3D no caminho crítico da página de entrada destrói o LCP** (ver `performance-web`).

Só siga se: (a) o 3D é o elemento característico da página, não decoração; e (b) existe fallback estático que entrega a mesma mensagem.
Se for só "dar um charme", uma animação CSS ou um SVG animado resolve por uma fração do custo.

## Divisão de trabalho com as skills de biblioteca

As skills de biblioteca cobrem o **como fazer** de cada lib. Esta cobre as **restrições de produção** — as duas se complementam, use ambas:

| Precisa de                                  | Use a skill                  |
| ------------------------------------------- | ---------------------------- |
| API do Three.js, WebGL, materiais, câmeras  | `threejs-webgl`              |
| Cena declarativa em React, hooks, drei      | `react-three-fiber`          |
| Animação, timeline, scroll-driven, pin      | `gsap-scrolltrigger`         |
| Combinar 3D + scroll + animação numa página | `web3d-integration-patterns` |
| Se cabe 3D aqui, budget, chunk, fallback    | **esta skill**               |

Nenhuma delas conhece o pipeline de build do projeto. **As regras abaixo têm precedência** sobre o que elas sugerirem.

## Stack recomendada

- `three` + `@react-three/fiber` + `@react-three/drei`.
- **Atenção de versão**: confira a versão do React no `package.json`. React Three Fiber v9 exige React 19 — em React 18, fixe a linha v8. Confirme a matriz de compatibilidade antes de instalar, não assuma. **A skill `react-three-fiber` não menciona restrição de versão nenhuma** — essa checagem é sua.
- **GSAP**: a skill `gsap-scrolltrigger` não fala de licenciamento. Confirme os termos atuais do GSAP/ScrollTrigger antes de usar em produção comercial.
- Sem R3F (cena simples, fora do ciclo do React): three.js puro num `useEffect` com cleanup explícito de `renderer.dispose()`, geometrias e materiais.

## Regras obrigatórias

1. **Carregamento isolado.** `React.lazy()` na cena inteira + chunk dedicado na config do bundler (`manualChunks` no Vite). Nunca importe `three` no entry ou em componente que a página de entrada carrega de forma síncrona.
2. **Fallback primeiro.** Renderize imagem/poster estático no `Suspense` fallback e enquanto o modelo carrega. O LCP não pode depender do WebGL.
3. **`prefers-reduced-motion` é lei.** CSS global que zera animação (`animation: none`) **não para um `requestAnimationFrame`**. Detecte via `matchMedia("(prefers-reduced-motion: reduce)")` e renderize um frame estático.
4. **Pause fora do viewport.** `IntersectionObserver` + `frameloop="demand"` ou parar o RAF. Cena 3D girando invisível queima bateria e trava o scroll no mobile.
5. **Degradar sem WebGL.** Cheque suporte e caia no fallback estático; nunca deixe tela branca.
6. **Cleanup.** `dispose()` em geometria, material, textura e renderer no unmount — vazamento aqui trava a SPA depois de algumas navegações. Se suspeitar de vazamento, use a skill `memory-leak-debugging`, se instalada.
7. **Assets**: glTF/GLB comprimido (Draco/Meshopt), texturas em KTX2/webp, servidos da pasta estática do projeto (`public/` no Vite). Orçamento: mantenha o payload 3D total abaixo de ~1MB.
8. **Acessibilidade**: o `<canvas>` precisa de `aria-label` ou de um resumo textual equivalente ao lado. 3D nunca é o único portador de informação.
9. **Cores** saem dos tokens do design system, não de hex solto no material — leia a CSS custom property e converta.

## Ao terminar

Meça o antes/depois com o build (olhe o chunk 3D isolado) e um trace de LCP na página afetada. Se o build tem lista de chunks para purge/preload da página de entrada, confirme que o chunk 3D não entrou nela.
