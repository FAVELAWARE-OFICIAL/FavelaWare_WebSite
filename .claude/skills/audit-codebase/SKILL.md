---
name: audit-codebase
description: Auditoria de segurança do projeto inteiro, por superfície e não arquivo por arquivo — segredos expostos, SQL Injection, SSRF, race conditions, controle de acesso, configurações perigosas e dependências. Use para auditoria periódica, ao assumir um projeto novo, antes de uma entrega grande, ou quando pedirem "audita o projeto" ou "varre tudo".
---

# Auditoria do projeto

Não é revisão de PR. Aqui o alvo é o sistema inteiro, e revisar arquivo por arquivo não escala. **Audite por superfície**: escolha uma classe de risco e varra o projeto inteiro por ela, depois passe para a próxima. Cada passada usa um raciocínio só, e por isso é rápida e completa.

## 0. Contexto antes de procurar

Sem isso, a auditoria vira lista de suspeitas genéricas.

- Qual é a stack, o framework e o que ele já protege por padrão?
- Onde estão as bordas: rotas públicas, endpoints autenticados, webhooks, funções serverless, jobs agendados, uploads?
- Quem são os papéis de usuário e o que cada um deveria alcançar?
- O que é o dado mais valioso aqui (dinheiro, dado pessoal, credencial, documento)?
- Onde mora a autorização: middleware, política no banco (RLS), verificação na aplicação, ou espalhado?

Anote as áreas críticas. É nelas que o esforço se concentra.

## Passadas, em ordem de retorno

### 1. Segredos expostos

Chave, token, senha e credencial no código, no histórico do git, em `.env` versionado, em arquivo de configuração, no bundle do cliente, em log ou em CI. Atenção especial à diferença entre chave publicável e chave de serviço — a segunda no cliente é comprometimento total.
**Segredo encontrado se rotaciona.** Remover do histórico ou adicionar à allowlist do scanner não resolve.

### 2. Controle de acesso

Liste **todas** as rotas e endpoints e marque quem alcança cada um. Procure: rota sem proteção, verificação só na UI, objeto acessado por id sem prova de pertencimento (IDOR), permissão vinda do payload, papel administrativo alcançável, política de banco permissiva demais.
Esta passada costuma render mais que todas as outras juntas.

### 3. Injeção

Varra por concatenação em SQL, uso de shell, montagem de caminho de arquivo com entrada externa, e renderização sem escape (`innerHTML`, `dangerouslySetInnerHTML`, `eval`, template cru).

### 4. Fail-open

Procure `catch` vazio, erro retornado e não verificado, valor padrão permissivo, e verificação que, ao falhar, deixa o fluxo seguir. Pergunte de cada checagem: **se isto quebrar, o sistema libera ou nega?**
Inclui o caso silencioso: função que devolve erro em vez de lançar, chamada sem desestruturar o erro, dentro de um `try` que nunca dispara.

### 5. SSRF e saída de rede

Todo lugar onde a aplicação faz requisição com URL influenciada por entrada. Verifique allowlist, bloqueio de rede interna e de metadados de nuvem, e tratamento de redirect.

### 6. Race conditions

Onde duas requisições simultâneas quebram invariante: saldo, estoque, cupom, limite de uso, criação com unicidade, upsert sem restrição no banco, leitura seguida de escrita sem transação ou trava. Procure o padrão _verifica e depois grava_ sem atomicidade.

### 7. Exposição de dado

Endpoint que devolve mais campo do que a tela usa, `select *`, serialização de objeto inteiro, erro com stack, listagem sem filtro por dono, exportação sem verificação de permissão.

### 8. Configuração

Debug em produção, CORS aberto, cabeçalhos de segurança ausentes, cookie sem flag, verificação de token desativada, bucket ou storage público, permissão ampla em CI, workflow que roda código de PR externo com segredo.

### 9. Dependências e supply chain

Vulnerabilidade aberta, pacote sem manutenção, nome suspeito, lockfile ausente, script de instalação, e quem tem permissão de publicar ou de alterar o pipeline.

### 10. Criptografia e senha

Algoritmo obsoleto, hash rápido para senha, primitiva artesanal, gerador não criptográfico, nonce reutilizado, comparação de segredo sem tempo constante.

## Ferramentas

Use scanner de segredo, análise estática e auditoria de dependência para **ampliar a varredura**, não para substituir o raciocínio. Toda saída passa por verificação manual antes de virar achado: scanner erra para os dois lados — cria falso positivo e não vê o que depende de entender a regra de negócio.

## Entrega

Priorize por **risco real**, não por quantidade. Dez achados verificados valem mais que cem suspeitas.

```
## Resumo
(postura geral, o que está sólido, onde está o risco concentrado)

## Achados por severidade
Crítica → Alta → Média → Baixa
  arquivo:linha · o que é · exploração concreta · correção

## Superfícies verificadas e limpas
(o que foi auditado e não tinha problema — define a cobertura)

## Não coberto
(o que ficou de fora e por quê)
```

Diga sempre o que **não** foi auditado. Auditoria que não declara o próprio limite é lida como "está tudo seguro", e isso é pior que não auditar.
