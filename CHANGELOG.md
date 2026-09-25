# Changelog

Mudanças relevantes do projeto. Versão semântica, calculada pelo workflow `versionamento` a partir
dos commits (Conventional Commits) ou da label `version:*` no PR de release.

Enquanto o site está em desenvolvimento, as versões ficam em 0.x (pré-lançamento). A 1.0.0 é o lançamento.

## [0.2.0] - 2026-09-25

### Adicionado

- Papel colaborador, para a equipe interna do projeto (design e desenvolvimento). Ele lê a Visão geral, Alunos e chamadas e Turmas sem nenhum botão de cadastro. Cria, edita e apaga trilhas, materiais e atividades, sem ver entregas nem notas dos alunos. Responde e conclui solicitações, e na conversa aparece como "Coordenação". Não vê Instrutores, Equipe nem Avaliações, não cadastra ninguém e não entra na banca. O gestor dá a função pela tela Equipe, e o "Ver como" ganhou a opção Colaborador.
- Página Membros: o gestor adiciona pessoas à equipe por convite e remove quem saiu. Remover apaga a conta no Supabase.
- Templates dos e-mails do Auth com a identidade do FavelaWare (convite, link de acesso, redefinir senha, confirmar cadastro, troca de e-mail e código de reautenticação), em `supabase/templates/`. O envio passa pelo SMTP próprio, sem o limite de 2 e-mails por hora do servidor padrão.
- Foto do perfil: o botão "Trocar foto" virou um lápis na borda da foto. Antes de salvar, abre a janela "Ajustar foto", com zoom e posição (arrastando a prévia ou pelos controles), "Centralizar" e "Voltar ao padrão".

### Corrigido

- Quem não lê as entregas (o colaborador) via toda atividade como "sem entregas" e conseguiria apagar uma atividade com entrega de aluno. Agora a conferência é feita por uma função que enxerga todas.

## [0.1.0] - 2026-09-24

Código no padrão das 10 regras de `docs/boas-praticas.md`.

### Adicionado

- Política de senha: no mínimo 8 caracteres, com letra maiúscula, letra minúscula, número e caractere especial, com a lista de requisitos marcando enquanto a pessoa digita (primeiro acesso, convite, "Meu perfil" e senha padrão dos alunos). O login passa a exigir 8 caracteres.
- Edições encerradas: as edições 1, 2 e 3 ficam só para consulta, e o banco recusa qualquer mudança de presença ou aula nelas. O gestor encerra as próximas pelo botão "Encerrar edição"; reabrir só pelo SQL do Supabase.
- Tela de dados da bolsa do instrutor refeita: ocupa a tela inteira, sem rolagem, em 4 etapas com painel da marca.
- Justificativa na falta (J): na chamada dos alunos e no ponto do instrutor abre uma janela para o motivo e o atestado opcional, guardado no Drive em `<Nome>/atestado`. Só o gestor abre o atestado.
- Entregas de atividade no Drive vão para a pasta do aluno, em `<Nome>/atividade`.
- Solicitações viram conversa no estilo WhatsApp: o aluno abre o pedido pela área dele (tipo escrito por ele) e troca mensagens com a coordenação, cada balão com a foto e o nome de quem escreveu. O gestor atende pela conversa: "Iniciar atendimento" (ou já responder, que inicia no próprio banco), e para concluir escreve a devolutiva e clica em Aprovar ou Recusar. Para mudar uma devolutiva, reabre (ela volta na caixa para ajustar) e conclui de novo; também dá para voltar para aberto. A lista e o quadro Aberto, Em andamento e Concluído (no lugar da aba "Mudança de horário") juntam todas as edições. O gestor não registra mais pedido, e quem concluiu é carimbado pelo banco.
- Papel parceiro: só leitura da Visão geral (todas as edições), dos Alunos e da Chamada, sem dado pessoal (login, observação, justificativa, atestado e o registro original da planilha ficam de fora). Parceiro não vê nem responde solicitações. "Ver como" ganhou a opção Parceiro e agora recarrega a área ao trocar de papel.
- Foto padronizada: a foto de aluno ou instrutor tem o fundo tirado no navegador e entra no círculo verde do site. Sem foto, aparece `sem-foto.webp`.
- Site público mostra a edição nova direto do banco: turmas e alunos cadastrados em Turmas, e os instrutores da edição aberta em "Equipe" na página Sobre.
- Perfil refeito: cartão com foto, nome, papel e acesso, e as áreas "Meus dados" e "Segurança" usando a tela toda, no tema claro e no escuro. O medidor de senha ficou com as cores do design system.
- `public/.htaccess` para hospedar em Apache/LiteSpeed (Hostinger): endereços da SPA, cache dos arquivos e cabeçalhos básicos de segurança.
- Avaliação final da edição: o instrutor dá nota de 0 a 5 em Participação em sala, Entrega das atividades e Comportamento (com soma e observação) para cada aluno, no período que o gestor define (de uma data até outra). O item do menu só aparece com o prazo aberto; depois de salvar não dá para editar e a avaliação some da tela do instrutor.
- Banca avaliadora: o gestor cadastra o membro (nome, e-mail e organização) e marca o dia da banca. Membro externo recebe convite e entra direto na tela de avaliação, a única que ele vê, sem criar senha (volta pelo link de acesso no e-mail); quem já tem conta no portal só é vinculado. Notas de 0 a 5 em Inovação/Funcionalidade, Qualidade da apresentação e Aplicabilidade, só no dia marcado, e um membro não vê a nota do outro. O resultado (instrutor + banca) sai do maior para o menor.
- Login por link no e-mail, sem senha, para conta que já existe.
- Página Membros: lista toda a equipe, e o gestor troca a função das pessoas. O papel com todas as personas ("Líder discente") é um só, e só ele muda o próprio papel; o banco garante as duas regras.
- Primeiro acesso por papel: todos definem a senha; o aluno também confirma nome completo, data de nascimento e Gmail, e o instrutor preenche os dados da bolsa. Parceiro vai direto para a Visão geral.
- Redes no perfil (LinkedIn, GitHub e Gmail) com ícones; só o LinkedIn aparece no site (página da turma e equipe da página Sobre).
- Capa do perfil verde no tema claro e azul no escuro.
- Foto no "Meu perfil": qualquer pessoa adiciona ou troca a própria foto (no padrão do círculo verde). A do aluno substitui a da ficha e aparece na chamada e na página da turma; a da equipe aparece na página Sobre.
- Vínculo (Mundiale, AOPA, Ânima ou outro) e cargo da equipe, preenchidos pelo gestor no convite do instrutor e na página Membros.
- A página Sobre mostra a equipe da edição aberta com instrutores, coordenação, parceiros e a líder discente (esses três só com cargo), com cargo, vínculo e o nome curto.
- Hall da Fama automático: ao encerrar a edição, a equipe dela entra no Hall da Fama como estava naquele dia. As edições 1 a 3 continuam do arquivo. Foto usada no Hall não sai do Storage.
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
- Instrutor só é vinculado a turma de edição aberta; turma encerrada aparece marcada e só dá para desvincular.
- Na área do instrutor, as turmas de edição encerrada saem da chamada. O histórico continua com o gestor.
- O aviso de edição encerrada saiu da Chamada do gestor. A presença continua travada.
- Caixas de texto do portal não mudam mais de tamanho ao arrastar o canto.
- Edge Functions `convidar-professor` e `acessos-alunos` respondem com CORS e status mesmo em erro inesperado.
- Foto com endereço de outro site nunca apaga arquivo do nosso Storage.
- Lista de turmas do site ordena as edições pelo número (a 10ª depois da 9ª).
- Tamanho do atestado aparece com vírgula ("1,5 MB"), como na entrega.
- "Ver como Instrutor" não quebra mais quando a edição mais recente está encerrada (vincula à aberta mais recente).
- A conta do "Ver como" não aparece na equipe da página Sobre.
- O site público recebe do banco só o nome curto dos alunos ("Maria Lima"), sem o id; antes o nome completo saía para qualquer visitante.
- Avatar sem nome mostra "?" em vez de um círculo vazio.
- Se o papel da conta não puder ser conferido, a área do gestor abre só com o mínimo (menu de parceiro) em vez do menu completo; o banco protege os dados de qualquer jeito.
- Convite da banca nunca muda o papel de uma conta que já existe (antes, um membro da banca podia virar instrutor).
- Edge Functions respondem 400 ("Pedido inválido") para corpo JSON que não é objeto, em vez de 500.

### Alterado

- `src/lib/` virou serviços instanciados por assunto; `gestao.ts` e `dashboard.ts` foram divididos (turmas, edições, alunos, solicitações, painel).
- Status padronizado (1 a 5) nas operações de login, senha, convite, acessos, envio de entrega e nas respostas das Edge Functions.
- Nenhuma página fala direto com o Supabase: login, senha e sessão passam pelos serviços.
- `src/utils/` (datas, texto, preferências), `src/hooks/`, `src/config.ts` e `src/data/` (galeria, parceiros, sobre) no lugar das cópias espalhadas.
- Nomes de domínio em português (Parceiros, GaleriaInicial, campos dos formulários).
- Edge Functions com CORS configurável (`ORIGEM_PERMITIDA`), tempo limite do Drive configurável e validado (`DRIVE_TEMPO_LIMITE_MS`) e código comum em `_shared`.
- "Todas as personas" passou a se chamar "Líder discente".
- Dados de teste da edição de demonstração (chamada, entregas, avaliações e banca) apagados; a edição, a turma, o aluno e as atividades continuam.
- Parceiros com uma lista só (`src/data/parceiros.ts`): na página inicial, "Ecossistema Ânima" passou a "Ecossistema Ânima Educação"; na página Sobre, o texto alternativo das logos passou a "UNA Cristiano Machado" e "Rede Transformar".

### Removido

- Encaminhamento de solicitação a parceiro e mensagem interna: ficaram poucas horas no banco (migrations 20260930107000 e 108000, sem uso real) e saíram na 20260930109000, que apaga as mensagens internas.
- 13 tipos, 5 funções e componentes sem uso (incluindo `MacroTimeline` e o gráfico de contagem).
- Código repetido em dois ou mais lugares virou peça única: erros das Edge Functions, limites e tipos de arquivo, imagens da marca, iniciais, LinkedIn, formulários (`useCampos`, `EscolherFoto`, `CamposDeNovaSenha`), telas de acesso, transição das áreas, cabeçalho e cartão de pessoa do site, leitura de arquivo e roteamento das Edge Functions, gravação no Drive do Apps Script.

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
