---
name: favelaware-padrao-visual
description: Padrão visual e de código do site FavelaWare (React + Vite + TypeScript + Tailwind + Framer Motion). Use ao criar ou alterar QUALQUER UI — página, componente, card, formulário, botão, cor, espaçamento, animação ou classe Tailwind. Também ao revisar mudança de UI, corrigir inconsistência visual, ou quando pedirem "padronizar", "seguir o padrão do site", "deixar consistente" ou "arrumar o visual".
---

# Padrão visual — FavelaWare

Não existe biblioteca de componentes (sem shadcn/Radix/MUI) nem `docs/DESIGN-SYSTEM.md`.
**A fonte de verdade é o código que já está no repositório.** Antes de inventar um padrão,
abra o arquivo de referência da tabela abaixo e copie o que já existe.

| Vai fazer                     | Copie de                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| Página interna nova           | `src/pages/Contato.tsx` (a mais enxuta)                                     |
| Página interna com lista      | `src/pages/Aulas.tsx` (os dados moram em `src/data/aulas.ts`, não no JSX)   |
| Formulário                    | `src/pages/Login.tsx` (form completo com envio)                             |
| Grade de cards clicáveis      | `src/pages/Material.tsx` / `src/pages/Turmas.tsx`                           |
| Foto ampliada                 | `src/components/Lightbox.tsx` (Esc, foco preso e devolvido, scroll travado) |
| Link com animação             | `src/components/MotionLink.tsx` (hover trava se o pai re-renderizar durante ele — ver cabeçalho) |
| Ícone de marca / rede social  | `src/components/RedesSociais.tsx` (`<LinksRedesSociais fundo="roxo" \| "claro">`) |
| E-mail, telefone, endereço, Instagram | `src/data/contato.ts` — **sempre** importados daqui, nunca escritos no JSX |
| Voltar ao topo ao trocar de rota | `src/components/RolarAoTopo.tsx` (já montado no `App.tsx`)               |
| Linha do tempo / etapas       | `src/components/MacroTimeline.tsx`                                          |
| Seção de destaque colorida    | `src/components/Hero.tsx`                                                   |
| Cores e animações do tema     | `tailwind.config.js`                                                        |
| Utilitários CSS               | `src/index.css` (`.glass-effect`, `.glow-*`)                                |
| Tipos compartilhados          | `src/types.ts`                                                              |

## Cores da marca

| Uso                             | Valor                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| Roxo institucional              | `#2d2a5f` — navbar, header de página, rodapé, texto sobre verde                    |
| Rodapé                          | `bg-[#2d2a5f]` com borda verde `border-t-4 border-[#8bc53f]`                       |
| Verde da marca                  | `#8bc53f` (= `favela-green-500`), hover `#7ab52f`                                  |
| Gradiente verde (Hero/destaque) | `from-[#8bc53f] via-[#7ab52f] to-[#6aa520]`                                        |
| Gradiente de botão principal    | `from-favela-green-600 to-favela-blue-600`                                         |
| Texto em fundo claro            | `text-gray-900` (título) · `text-gray-600` (apoio)                                 |
| Texto em fundo roxo/verde       | `text-white` · apoio `text-white/80`                                               |

Escalas disponíveis em `tailwind.config.js`: `favela-green` 50–900, `favela-blue` 500/600/700,
`favela-purple` 500/600, `favela-pink` 500/600.

**Tom fora da escala vira no-op:** `favela-blue-50`, `favela-purple-100`, `favela-pink-100` e
afins não estão definidos e deixam o elemento sem cor nenhuma. Use um tom que existe ou
adicione o tom à config.

## Banner e logo da marca

`public/imgs/backgrounds/fundo.png` é o **banner oficial** — foto da comunidade com
código binário sobreposto, o mesmo do site https://favelaware.animahub.com.br.

**Use como fundo de verdade, nunca como textura escondida:**

```tsx
<div
  className="relative bg-[#8bc53f]"        {/* só cor de reserva */}
  style={{
    backgroundImage: "url('/imgs/backgrounds/fundo.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
>
  {/* Véu para o texto branco ter contraste */}
  <div className="absolute inset-0 bg-gradient-to-br from-[#2d2a5f]/45 via-[#2d2a5f]/25 to-[#2d2a5f]/50" />
  <div className="relative z-10">{/* conteúdo */}</div>
</div>
```

Erros já cometidos aqui, não repita:

- Colocar o banner a `opacity-10` **debaixo** de um gradiente verde sólido — some a foto
  e o código binário, e o resultado não parece o site oficial.
- Usar `backgroundBlendMode: 'overlay'` com gradiente verde — lava a imagem.
- Tirar o escurecimento sem colocar véu — o banner tem trechos muito claros e o texto
  branco fica ilegível. Foto de fundo **sempre** pede véu ou `drop-shadow` no texto.

O banner original tem só 642×361: em tela cheia fica borrado. É limitação do arquivo de
origem, não erro de código — se aparecer versão em alta, basta substituir o arquivo.

Logo: `public/imgs/logo/logo.png` (1000×635, fundo transparente). Como não é quadrado,
dimensione só pela largura (`w-64 object-contain`), nunca `w-24 h-24`.

`public/imgs/README.md` tem o inventário completo, inclusive quem é quem em `team/`.

## Anatomia de uma página interna

```tsx
<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
  <Navbar />

  {/* Header roxo — o pt-32 compensa a navbar fixa de h-20 */}
  <div className="bg-[#2d2a5f] pt-32 pb-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }} className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">TÍTULO</h1>
        <p className="text-xl text-white/80 max-w-3xl mx-auto">Subtítulo</p>
      </motion.div>
    </div>
  </div>

  {/* Conteúdo */}
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    {/* seções com mb-16 entre elas */}
  </div>

  <Footer />
</div>
```

Título de página em CAIXA ALTA. Seções internas usam
`<h2 className="text-3xl font-bold text-gray-900 mb-4">`.

Tela sem navegação (login e afins) é a exceção: `min-h-screen flex`, sem `Navbar`/`Footer`,
mas sempre com um caminho de volta para `/`.

## Formulário canônico (`src/pages/Login.tsx`)

```tsx
<form onSubmit={handleSubmit} className="space-y-6">
  <div>
    <label htmlFor="campo" className="block text-sm font-medium text-gray-700 mb-2">
      Rótulo *
    </label>
    <input
      type="text" id="campo" name="campo"
      value={formData.campo} onChange={handleInputChange} required
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-favela-green-500 focus:border-transparent transition-all"
      placeholder="Ex: ..."
    />
  </div>
</form>
```

- Um `useState` com objeto `formData` + um `handleInputChange` genérico (usa `e.target.name`,
  e `checked` quando o campo é checkbox).
- Estado de envio: `carregando`/`enviando` (boolean) e `mensagem`
  (`{ tipo: 'sucesso' | 'erro', texto: string }`).
- Bloco de mensagem acima do form, com `role="alert"`: `bg-green-100 text-green-800 border border-green-300`
  para sucesso, `bg-red-100 text-red-800 border border-red-300` para erro, entrando com
  `initial={{ opacity: 0, y: -10 }}`.
- Botão de envio ocupa a largura toda, mostra spinner SVG `animate-spin` enquanto envia e
  fica `bg-gray-400 cursor-not-allowed` quando desabilitado.

## Botões

```tsx
<motion.button
  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
  className="w-full py-4 px-6 rounded-lg font-bold text-white text-lg shadow-lg transition-all bg-gradient-to-r from-favela-green-600 to-favela-blue-600 hover:shadow-xl"
/>
```

Variante sólida da marca (verde com texto roxo):
`bg-[#8bc53f] hover:bg-[#7ab52f] text-[#2d2a5f] font-bold py-4 px-8 rounded-xl shadow-md hover:shadow-xl`.

## Cards

`bg-white rounded-xl shadow-lg p-8` — ou `rounded-2xl shadow-xl p-8 md:p-12` para o card grande
de uma seção, sempre com `transition-all duration-300`. Card clicável (é `<motion.a>` ou está
dentro de `<Link>`) ganha borda `border-2 border-transparent hover:border-favela-green-500` e
`whileHover={{ scale: 1.05, y: -5 }}`; card só informativo fica sem hover. Os cards de
`Contato.tsx` ainda têm hover sem serem clicáveis — não copie esse trecho.

## Movimento (Framer Motion)

Declare estas duas constantes no topo do componente — é o vocabulário repetido em todas as páginas:

```tsx
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.15 } },
};
```

Seção: `<motion.section {...fadeInUp}>`. Lista: container com `variants={staggerContainer}`,
`initial="initial"`, `animate="animate"`, e cada filho com `variants={fadeInUp}`.

## Regras duras

- **Espaçamento**: header `pt-32 pb-16`, conteúdo `py-16`, seção para seção `mb-16`,
  campos de form `space-y-6`, container sempre `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- **Responsivo**: mobile primeiro. Grade é `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`,
  título é `text-4xl md:text-5xl`. Nunca entregue tela que quebre em 375px de largura.
- **Foco visível**: todo campo usa `focus:ring-2 focus:ring-favela-green-500`. Na navbar
  (fundo roxo), o anel é `focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2
  focus-visible:ring-offset-[#2d2a5f]`. Nunca remova o anel de foco sem colocar outro no lugar.
- **Hover só em elemento clicável** (link, botão, card que é link). Elemento informativo
  fica parado, senão parece clicável.
- **Botão só com ícone precisa de `aria-label`**; todo `input` precisa de `<label htmlFor>`
  ligado ao `id` (ou `aria-label`, se o rótulo for visualmente omitido).
- **Toda UI em português do Brasil**, inclusive nomes de estado e de função
  (`carregando`, `mensagem`, `handleSubmit`).
- **Ícones sem biblioteca**: emoji para ícone decorativo de conteúdo (📝 ✉️ 📞 📍); SVG
  inline para ícone de marca e rede social, reusando `LinksRedesSociais` de
  `src/components/RedesSociais.tsx`.
- **Rota nova** exige entrada em `src/App.tsx`. A navbar já fica roxa em toda rota que
  não é `/` (`getNavbarBg()` em `src/components/Navbar.tsx`); se a página entrar no menu,
  acrescente-a em `menuItems` da Navbar (e meça, ver abaixo) e, se couber, em
  `linksRapidos` do `Footer.tsx`.
- **Navbar**: o menu completo (9 itens + botão LOGIN) precisa de 1136px, então o menu
  desktop só aparece a partir de `xl:` (1280px) — abaixo disso é o hambúrguer. Ao
  acrescentar item no menu, meça de novo (`scrollWidth` do container do menu + largura
  da marca + 64px de padding) antes de assumir que cabe. Item que é **ação** (login,
  inscrição) entra destacado depois da lista, não como mais um link (hoje o LOGIN é um
  botão redondo com ícone, `aria-label` e rótulo no hover), e precisa aparecer também
  no menu mobile.
- **Componente é `React.FC`**; tipo compartilhado mora em `src/types.ts`.
- **Comentário didático em PT-BR** é o estilo da casa (o site é material de ensino):
  cabeçalho `/** ==== NOME ==== */` no topo do arquivo e comentário curto explicando o
  porquê de cada bloco. Mantenha esse tom — densidade parecida com a dos arquivos vizinhos.

## Ao terminar

Rode `npm run lint` e `npx tsc --noEmit`. Se criou página, confira também o estado da navbar
na rota nova e o comportamento em largura de celular.
