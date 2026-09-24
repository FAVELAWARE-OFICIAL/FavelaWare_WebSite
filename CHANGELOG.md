# Changelog

Mudanças relevantes do projeto. Versão semântica, calculada pelo workflow `versionamento` a partir
dos commits (Conventional Commits) ou da label `version:*` no PR de release.

## [1.0.0] - não lançada

Primeira versão no padrão institucional.

### Adicionado

- Áreas restritas do gestor, do instrutor e do aluno, com chamada, ponto, trilhas e entregas no Drive.
- Páginas públicas: Home, Como Fazemos, Sobre, Hall da Fama, Turmas, Galeria, Reconhecimentos e Contato.
- Git-flow com validação de origem do PR, CI (gitleaks, ESLint, TypeScript, Prettier, build),
  auditoria de dependências, versionamento automático e back-merge da `main` na `develop`.
- Hooks do Husky: lint-staged, commitlint e nome de branch.
- `docs/boas-praticas.md` com as 10 regras de código.

### Corrigido

- 18 vulnerabilidades do `npm audit` (vite, react-router, postcss, rollup e transitivas).
- Aviso de script de instalação do esbuild não aprovado.
- Erros de TypeScript que o build não acusava.
