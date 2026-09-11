---
name: elkys-navegacao
description: Navegação, rotas e arquitetura de informação do Elkys. Use ao adicionar/alterar rota, menu, sidebar, breadcrumb, link, header, footer, estado ativo, navegação mobile, guarda de rota por papel, redirect, 404 ou fluxo entre telas — tanto no site público quanto nos portais Admin e Cliente.
---

# Navegação e arquitetura de informação — Elkys

## As três zonas (`src/App.tsx`)

| Zona            | Rotas                                                                 | Guarda                                                  |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| Público         | `/`, `/cases`, `/servicos/:slug`, `/como-trabalhamos`, páginas legais | nenhuma                                                 |
| Auth            | `/login`, `/forgot-password`                                          | nenhuma                                                 |
| Portal          | `/portal/*`                                                           | `ProtectedRoute` → `MustChangePasswordGuard` → `PortalRoleGuard` → Layout |
| Fallback        | `*` → `NotFound`                                                      | —                                                       |

`/portal/admin/*` aceita `admin_super`, `admin`, `comercial`, `juridico`, `financeiro`, `po`, `developer`, `designer`, `marketing`, `support`.
`/portal/cliente/*` aceita só `cliente`.

## Regras ao adicionar rota

1. **Sempre** `React.lazy()` + `Suspense` — nenhuma página entra no bundle síncrono.
2. Rota nova no **portal** entra dentro do `/portal/*` e respeita a cadeia de guardas inteira. Nunca pendure rota autenticada fora dela.
3. Rota nova **pública** precisa de:
   - entrada no `scripts/generate-sitemap.cjs`,
   - chunk incluído em `landingChunkPatterns` no `vite.config.ts` (senão o PurgeCSS mata o CSS dela — ver skill `elkys-perf-web`),
   - `<SEO>` com title/description próprios,
   - label em `pathMap` de `src/components/Breadcrumbs.tsx` se for aparecer em breadcrumb.
4. Papéis novos ou mudança de acesso → atualizar `docs/PERMISSIONS.md`.
5. Mudança de rota → atualizar a nota afetada no brain (`obsidian_elkys/07-frontend/routing.md`).

## Acessibilidade da navegação (§12 do DS)

- Link ativo: `aria-current="page"`.
- Toggle de sidebar: `aria-expanded={!collapsed}`.
- Cada bloco de navegação é um `<nav>` com label distinto (`aria-label`), senão leitor de tela não diferencia header de sidebar de footer.
- Alvo mínimo de 44px. `Navigation.tsx:359` tem `p-2 min-h-[44px] min-w-[44px]` duplicando padding do `<Button>` — usar o DS em vez de recriar.
- Breadcrumbs injeta `BreadcrumbList` JSON-LD direto no `<head>` (sem react-helmet) — mantenha esse padrão ao estender.

## Princípios de IA

- O rótulo do link é o que o usuário controla, não como o sistema é feito ("Cobranças", não "Charges").
- Uma ação mantém o mesmo nome do menu até o título da página e o toast.
- `ScrollToTop.tsx` já cuida do reset de scroll — não reimplemente por página.
- Estado vazio é convite à ação, não mensagem de erro. Use `AdminEmptyState`.
- UI em português do Brasil (ver `docs/CONVENCAO-IDIOMA.md`).
