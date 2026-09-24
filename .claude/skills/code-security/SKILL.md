---
name: code-security
description: Escrever código seguro por construção — SQL Injection, XSS, SSRF, command injection, path traversal, autenticação, autorização, IDOR, uploads, APIs, sessões, cookies, CORS, CSRF, senhas, tokens, criptografia, secrets, logging e rate limiting. Use ao escrever ou alterar qualquer código que toque entrada de usuário, banco de dados, arquivo, rede, renderização ou identidade.
---

# Código seguro

Segurança durante a escrita, não só na auditoria final. O custo de corrigir cresce a cada etapa.

**Regra que resolve a maioria dos casos: quando a linguagem ou o framework oferece a solução segura consolidada, use a dele.** Criptografia, hash de senha, CSRF, escape de template e parametrização de query são exatamente onde código artesanal vira vulnerabilidade. Proteção manual onde já existe solução pronta é, por si só, um defeito.

## Injeção

**SQL/NoSQL** — sempre consulta parametrizada ou query builder. Nunca concatene ou interpole dado externo em SQL. Nome de tabela e de coluna não são parametrizáveis: se precisarem ser dinâmicos, valide contra **allowlist fixa no código**, nunca contra o que veio da requisição.

**Command injection** — evite shell. Se for inevitável, passe argumentos como array (sem shell), nunca uma string montada. Nada de `shell=True`, `exec` com interpolação, ou `|` com dado do usuário.

**Path traversal** — nunca monte caminho concatenando entrada. Normalize (`resolve`) e **confirme que o resultado começa dentro do diretório permitido**. Rejeite `..`, caminho absoluto e byte nulo. Prefira id que mapeia para um caminho conhecido, em vez de aceitar o caminho.

**XSS** — encoding correto **para o contexto** (HTML, atributo, URL, JavaScript, CSS): escapar para HTML não protege dentro de um atributo `href` ou de um bloco `<script>`.

- Evite `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `eval`, `new Function`.
- Quando HTML rico for requisito, sanitize com biblioteca madura e allowlist de tags/atributos. Nunca com regex própria.
- URL vinda do usuário: valide o esquema. `javascript:` e `data:` em `href`/`src` executam.
- Ative CSP; sem `unsafe-inline` se possível.

## Identidade e acesso

**Autenticação** — use o mecanismo do framework. Sessão com expiração e renovação. Logout invalida de verdade no servidor. Proteja login e recuperação de senha com rate limiting e resposta genérica (não revele se o e-mail existe).

**Autorização** — **deny-by-default**: o padrão é negar, e o acesso é concedido explicitamente.

- Verifique **no servidor**. Esconder o botão não é controle de acesso.
- Toda rota nova nasce protegida; a exceção é que precisa ser justificada.
- Onde houver RLS ou equivalente, ela é a última linha, não a única: valide também na aplicação.

**IDOR** — todo objeto acessado por identificador precisa provar pertencimento. Pergunte sempre: _se eu trocar esse id pelo de outro usuário, o que acontece?_ Isso vale para leitura, escrita, exclusão, download e exportação. Id sequencial agrava; id imprevisível **não** substitui a verificação.

**Escalada de privilégio** — usuário não pode alterar o próprio papel, plano ou limites. Campo de permissão nunca vem do payload do cliente.

## Dados

**Segredos** — nunca no código, no repositório, no bundle do cliente ou em log. Use variável de ambiente ou cofre. Saiba distinguir chave pública/publicável de chave de serviço: a segunda no cliente é vazamento total. Segredo commitado se **rotaciona**; não basta remover do histórico nem adicionar à allowlist do scanner.

**Senhas** — algoritmo de hash lento e com salt (bcrypt, scrypt, Argon2). Nunca MD5, SHA-1 ou SHA-256 puro. Nunca criptografia reversível.

**Tokens** — entropia suficiente, gerador criptográfico (nunca `Math.random`), expiração, escopo mínimo, revogação possível. Comparação de segredo em tempo constante.

**Criptografia** — biblioteca do framework, algoritmo atual, modo autenticado (AES-GCM). Nunca implemente primitiva própria, nunca reuse nonce/IV.

**Exposição** — devolva só os campos que a tela usa. `select *` e serialização do objeto inteiro vazam hash, id interno, flag administrativa e dado pessoal. Trate erro sem revelar stack, versão, caminho ou SQL.

## Bordas

**Validação de entrada** — na borda do servidor, com schema: tipo, tamanho, formato, faixa, e rejeição de campo desconhecido. Validação no cliente é experiência de uso, não segurança. Allowlist vence blocklist.

**Uploads** — limite de tamanho; tipo verificado pelo **conteúdo**, não pela extensão nem pelo `Content-Type`; nome gerado pelo servidor; armazenamento fora da raiz servida ou sem permissão de execução; imagem reprocessada quando possível.

**SSRF** — URL vinda do usuário é SSRF até prova em contrário. Allowlist de destino; bloqueie IP privado, loopback, link-local e o endpoint de metadados da nuvem; resolva o DNS e valide o IP resolvido; não siga redirect cegamente; timeout sempre.

**Redirect** — destino vindo do usuário só para caminho relativo interno ou allowlist. Caso contrário é open redirect e vira isca de phishing.

**API externa** — resposta de terceiro é dado não confiável: valide antes de usar, renderizar ou gravar. Timeout e tratamento de falha sempre.

**Cookies e CORS** — cookie de sessão com `HttpOnly`, `Secure` e `SameSite`. CORS com origem explícita; nunca `*` junto de credenciais; nunca refletir o `Origin` recebido. CSRF quando a sessão é por cookie.

**Rate limiting** — login, recuperação de senha, envio de e-mail/SMS, endpoint caro e qualquer coisa que gere custo.

## Comportamento

**Fail-closed** — quando a verificação falha ou o serviço de autorização cai, **negue**. `catch` que segue o fluxo depois de uma checagem de permissão transforma indisponibilidade em acesso livre. Este é o defeito mais comum e o mais silencioso.

**Erro e log** — mensagem genérica para o usuário, detalhe técnico no log do servidor. **Nunca logue** senha, token, cookie, documento, cartão ou dado pessoal. E nunca engula o erro em silêncio: falha que some da tela e do log ao mesmo tempo é impossível de diagnosticar.

**Dependências** — pacote conhecido e mantido; confira nome (typosquatting), vulnerabilidade aberta e o que ele puxa junto. Lockfile versionado.

**Configuração** — debug desligado em produção, verificação de JWT ligada, cabeçalhos de segurança presentes, storage/bucket não público por engano, CORS fechado.
