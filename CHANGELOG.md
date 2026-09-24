# Changelog

Mudanças relevantes do projeto. Versão semântica, calculada pelo workflow `versionamento` a partir
dos commits (Conventional Commits) ou da label `version:*` no PR de release.

## [Não lançado]

Código no padrão das 10 regras de `docs/boas-praticas.md`.

### Adicionado

- Política de senha: no mínimo 8 caracteres, com letra maiúscula, letra minúscula, número e caractere especial, com a lista de requisitos marcando enquanto a pessoa digita (primeiro acesso, convite, "Meu perfil" e senha padrão dos alunos). O login passa a exigir 8 caracteres.
- Edições encerradas: as edições 1, 2 e 3 ficam só para consulta, e o banco recusa qualquer mudança de presença ou aula nelas. O gestor encerra as próximas pelo botão "Encerrar edição"; reabrir só pelo SQL do Supabase.
- Tela de dados da bolsa do instrutor refeita: ocupa a tela inteira, sem rolagem, em 4 etapas com painel da marca.
- Tela explicando o que falta quando uma página não abre (por exemplo, `.env.local` sem as chaves do Supabase), no lugar da tela branca.

### Corrigido

- Redefinir a senha de um aluno marca a troca obrigatória antes de voltar para a senha padrão; se falhar, o gestor vê o aviso em vez de "redefinido".
- Criar acesso de aluno avisa quando o login gerado não foi salvo na ficha, e falha na leitura das contas já ligadas deixa de virar "ninguém tem acesso".
- "Presença por aula" no painel conta numerador e denominador no mesmo recorte (sem aulas sem data e sem outras turmas).
- Turma sem aula no período aparece como "sem dados" no gráfico por turma, e não como 0%.
- Criar edição, trilha ou material não mostra mais "já existe um cadastro com esse nome" quando a falha foi outra.
- Meu Ponto confere no banco o dia escolhido quando ele é mais antigo que o histórico carregado.
- Foto de aluno enviada e não salva (trocada, tirada ou formulário fechado) é apagada do Storage.
- Primeiro acesso usa a data local no limite da data de nascimento, como o "Meu perfil".

### Alterado

- `src/lib/` virou serviços instanciados por assunto; `gestao.ts` e `dashboard.ts` foram divididos (turmas, edições, alunos, solicitações, painel).
- Status padronizado (1 a 5) nas operações de login, senha, convite, acessos, envio de entrega e nas respostas das Edge Functions.
- Nenhuma página fala direto com o Supabase: login, senha e sessão passam pelos serviços.
- `src/utils/` (datas, texto, preferências), `src/hooks/`, `src/config.ts` e `src/data/` (galeria, parceiros, sobre) no lugar das cópias espalhadas.
- Nomes de domínio em português (Parceiros, GaleriaInicial, campos dos formulários).
- Edge Functions com CORS configurável (`ORIGEM_PERMITIDA`), tempo limite do Drive configurável e validado (`DRIVE_TEMPO_LIMITE_MS`) e código comum em `_shared`.
- Parceiros com uma lista só (`src/data/parceiros.ts`): na página inicial, "Ecossistema Ânima" passou a "Ecossistema Ânima Educação"; na página Sobre, o texto alternativo das logos passou a "UNA Cristiano Machado" e "Rede Transformar".

### Removido

- 13 tipos, 5 funções e componentes sem uso (incluindo `MacroTimeline` e o gráfico de contagem).

### Adicionado

- Testes com Vitest das correções e das regras dos serviços, no CI junto com a checagem de tipos das Edge Functions.

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
