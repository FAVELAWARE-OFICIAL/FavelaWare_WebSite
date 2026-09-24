---
name: navegacao-web
description: Navegação, rotas e arquitetura de informação de aplicação web. Use ao adicionar ou alterar rota, menu, sidebar, breadcrumb, link, header, footer, estado ativo, navegação mobile, guarda de rota por papel, redirect, 404 ou fluxo entre telas.
---

# Navegação e arquitetura de informação

Se o projeto tiver skill própria de navegação (ex.: `<projeto>-navegacao`), carregue-a junto: ela traz as rotas, os arquivos e as decisões reais, e manda no detalhe.

## Antes de mexer: mapeie as zonas

Localize o arquivo de rotas (em React, costuma ser `src/App.tsx` ou `src/router.*`; em roteamento por pasta, `app/` ou `pages/`) e anote as zonas — pública, autenticação, área autenticada, fallback `*` — com a cadeia de guardas e os papéis aceitos em cada uma. Pronto quando você sabe dizer em qual zona a rota nova entra e por quais guardas ela passa.

## Regras ao adicionar rota

1. **Siga o carregamento das rotas vizinhas.** Se o projeto carrega página sob demanda (`React.lazy()` + `Suspense` ou equivalente), a rota nova também — nenhuma página a mais no bundle síncrono.
2. **Rota autenticada entra dentro da zona protegida** e passa pela cadeia de guardas inteira. Pendurada fora dela, fica sem guarda.
3. **A rota nova aparece em todo lugar onde a vizinha aparece.** Busque o path de uma rota do mesmo tipo no projeto inteiro: sitemap, prerender, lista de chunks do build (ver `performance-web`), componente de SEO com title/description próprios, rótulos de breadcrumb, menu, rodapé. Cada ocorrência da vizinha é um lugar que a nova precisa.
4. Papel novo ou mudança de acesso → atualize o documento de permissões do projeto, se houver.
5. Mudança de rota → atualize a documentação de roteamento do projeto (docs, ADR, vault), se houver.

## Acessibilidade da navegação

- Link ativo: `aria-current="page"`.
- Toggle de menu ou sidebar: `aria-expanded` refletindo o estado.
- Cada bloco de navegação é um `<nav>` com `aria-label` distinto, senão leitor de tela não diferencia header de sidebar de footer.
- Alvo mínimo de 44px. Use o botão do design system em vez de recriar padding.
- Breadcrumb com `BreadcrumbList` JSON-LD: estenda o mecanismo que o projeto já usa para injetar no `<head>`.

## Princípios de arquitetura de informação

- O rótulo do link é o que o usuário controla, não como o sistema é feito ("Cobranças", não "Charges").
- Uma ação mantém o mesmo nome do menu até o título da página e o toast.
- Reset de scroll na troca de rota mora num componente único; procure-o antes de reimplementar por página.
- Estado vazio é convite à ação, não mensagem de erro. Use o componente de estado vazio do projeto, se houver.
- UI no idioma do produto; se houver documento de convenção de idioma, ele manda.
