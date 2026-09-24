# CLAUDE.md

Orientação para agentes de código neste repositório.

## CCMA, fluxo principal de desenvolvimento

O rigor é calibrado pelo risco, em quatro níveis. Invoque a skill `ccma` no início de qualquer trabalho de código: ela traz a tabela completa, a lista de superfícies sensíveis e as regras de custo de subagente. Diga o nível escolhido em uma linha antes de começar.

| Nível        | Quando                                                                               | Quem faz                                                                       |
| ------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 0 · direto   | Sem lógica: texto, docs, estilo, config, conflito, merge, publicação                 | A sessão principal, sem subagente                                              |
| 1 · pequeno  | Até 3 arquivos, sem superfície sensível                                              | Sessão principal planeja, codifica e testa; `reviewer` só do diff              |
| 2 · médio    | Mais arquivos, regra de negócio ou refatoração                                       | Sessão principal planeja, codifica e testa; `reviewer` completo                |
| 3 · sensível | Auth, permissão, RLS, migration, dinheiro, dado pessoal, dependência, infra, segredo | `planner`, código e teste na sessão principal, `reviewer` e `security-auditor` |

**Duas coisas nunca saem:** teste que prova a alteração, rodado e com o resultado real relatado, e revisão por quem não escreveu o código. Na dúvida entre dois níveis, vale o mais alto. Pedir "CCMA completo" força o nível 3.

Os papéis são subagentes em `.claude/agents/`. **Planner, reviewer e security-auditor não têm permissão de escrita de propósito**: quem escreve não aprova. O mesmo vale para o `auditor-de-padroes`, que fica fora do fluxo do PR.

Subagente só com briefing: objetivo, nível, arquivos tocados, o comando do diff e o que conferir. Nunca "entenda o projeto". O revisor lê o diff e os chamadores, não o repositório inteiro.

Skills de apoio em `.claude/skills/`, invocadas conforme o risco e não por protocolo:

| Skill             | Quando                                                                                |
| ----------------- | ------------------------------------------------------------------------------------- |
| `ponytail`        | Antes de escrever: isto precisa existir? Já existe no projeto?                        |
| `boas-praticas`   | Obrigatória antes do primeiro código, em todos os níveis com lógica                   |
| `code-security`   | Código que toque entrada de usuário, banco, arquivo, rede, renderização ou identidade |
| `owasp-security`  | Autenticação, autorização, sessão, API, ou funcionalidade com agente/IA               |
| `security-review` | Revisão de segurança **do diff**, antes do PR                                         |
| `audit-codebase`  | Auditoria do projeto **inteiro**, periódica; não é etapa de PR                        |

Fora do fluxo do PR há o agente **`auditor-de-padroes`**: mede a distância entre o código existente e as boas práticas num escopo dado e devolve um plano de migração em ondas. Use ao começar refatoração ou decidir por onde atacar dívida, não como gate de PR (isso é o `reviewer`).

`docs/boas-praticas.md` traz as 10 regras obrigatórias. Toda alteração segue essas regras à risca.

Ordem de prioridade que resolve conflito: **preservar 100% das regras de negócio → não alterar comportamento sem pedido explícito → segurança → correção → testes → reduzir complexidade → logs de progresso → manutenção → performance → UX**.

**Nenhuma melhoria estética, arquitetural ou estrutural tem prioridade sobre preservar o comportamento.** Se a alteração muda resultado, fluxo, condição, retorno ou efeito colateral, ela não é refatoração: é mudança funcional e precisa ser pedida. O objetivo não é produzir mais código, é produzir a menor alteração segura, correta, testável e sustentável.

Regras que valem sempre: nenhuma mudança silenciosa de comportamento; provar antes de chamar algo de bug; condição aparentemente redundante só sai depois de verificar se não é regra de negócio, compatibilidade ou cenário legado; menor alteração possível; reusar antes de criar; duplicação é o alvo, e ao achar cópias compará-las entre si, porque a divergência costuma ser bug; código morto só sai com prova por busca cruzada; log de progresso onde há etapas, nunca com dado sensível; relatar o resultado real dos testes, inclusive falha.

## Projeto

Site oficial e portal do FavelaWare. SPA React 19 + TypeScript + Vite + Tailwind + Framer Motion, com Supabase (Postgres com RLS, Auth, Edge Functions) e entregas no Google Drive via Apps Script. Detalhes no `README.md`.

## Comandos

```bash
npm run dev           # localhost:5173
npm run build         # build de produção
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run format:check  # Prettier
npm test              # Vitest
```

Antes de dar algo por pronto: `lint`, `typecheck`, `format:check`, `test` e `build` verdes. É o mesmo que o CI roda.
As Edge Functions são conferidas com `npx --yes deno@2.9.6 check <função>/index.ts` dentro de `supabase/functions`.

## Convenções

- **Regras de código:** `docs/boas-praticas.md`. Domínio em português; termos técnicos da linguagem e das bibliotecas em inglês.
- **Camadas:** página coordena; serviço em `src/lib/` (classe + instância) tem a regra e fala com o banco; `src/utils/` só com 2+ consumidores; configuração em `src/config.ts`; conteúdo do site em `src/data/`.
- **UI:** skill `favelaware-padrao-visual`. Cores `favela-*` do `tailwind.config.js`, roxo institucional `#2d2a5f`.
- **Acesso:** a `RotaProtegida` só organiza a navegação. Quem protege dado é a RLS. Toda tabela nova nasce com RLS e teste em `supabase/testes/`.
- **Config:** valores que mudam por ambiente vêm de `import.meta.env` (`VITE_*`). Segredo nunca vai para o front nem para o repositório.
- **Dados pessoais:** planilhas de presença, PDFs do RPA e `.env*` ficam fora do git (ver `.gitignore`).
- **Git:** branch a partir de `develop` com prefixo de tipo; PR para `develop`; release por `release/vX.Y.Z` para `main`. Commit curto, uma linha, em Conventional Commits, sem coautor. Um commit por entrega concreta, não um por arquivo.
- **Proteção:** rulesets em `.github/rulesets/`, aplicados por `.github/scripts/provisionar-governanca.sh`. Main e develop só recebem PR com aprovação do code owner; bypass só do time `mantenedores-site`.
