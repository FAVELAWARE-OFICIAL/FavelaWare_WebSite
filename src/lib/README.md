# Lib: serviços

Camada de serviços (regras 1, 6 e 8 de `docs/boas-praticas.md`). Cada arquivo cuida de um assunto e
exporta uma classe e a instância que as páginas usam, por exemplo `servicoPonto.registrar(...)`.
Tipos, constantes e funções puras do assunto ficam no mesmo arquivo, fora da classe.

| Arquivo | Serviço | Assunto |
| --- | --- | --- |
| `supabase.ts` | — | cliente Supabase único (infraestrutura) |
| `banco.ts` | — | mensagens de erro do banco e das Edge Functions, próxima ordem |
| `cache.ts` | `servicoCache` | cache das áreas restritas |
| `sessao.ts` | `servicoSessao` | entrar, sair, perfil e área de cada papel |
| `senha.ts` | `servicoSenha` | troca de senha, primeiro acesso e convite |
| `perfil.ts` | `servicoPerfil` | tela "Meu perfil" |
| `edicoes.ts` | `servicoEdicoes` | edições do curso |
| `turmas.ts` | `servicoTurmas` | turmas e cadastro |
| `alunos.ts` | `servicoAlunos` | cadastro de alunos e fotos |
| `chamada.ts` | `servicoChamada` | chamada do professor e correção do gestor |
| `ponto.ts` | `servicoPonto` | ponto dos instrutores |
| `equipe.ts` | `servicoEquipe` | instrutores e vínculo com turmas |
| `acessos.ts` | `servicoAcessos` | login dos alunos (Edge Function) |
| `solicitacoes.ts` | `servicoSolicitacoes` | pedidos dos alunos |
| `material.ts` | `servicoMaterial` | trilhas e links do portal |
| `atividades.ts` | `servicoAtividades` | atividades e correção |
| `entregas.ts` | `servicoEntregas` | regras e envio das entregas |
| `painel.ts` | `servicoPainel` | dados e contas do painel do gestor |
| `dadosInstrutor.ts` | `servicoDadosInstrutor` | dados do RPA |
| `fotosDoSite.ts` | `servicoFotosDoSite` | fotos dos alunos no site público |

Método de serviço passado como callback perde o `this`: use sempre uma arrow,
`useDadosEmCache(CHAVE, () => servicoX.carregar())`.
