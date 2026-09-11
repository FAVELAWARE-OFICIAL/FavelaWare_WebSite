---
name: ccma
description: Fluxo principal de desenvolvimento em cinco etapas — Planner, Coder, Tester, Reviewer e Security Auditor. Use ao implementar qualquer alteração relevante de código, corrigir bug, refatorar, criar funcionalidade ou preparar PR. Também quando pedirem "usa o CCMA", "segue o fluxo", "faz direito", "nível sênior" ou revisão com segurança.
---

# CCMA

Cinco etapas. Nenhuma alteração relevante é considerada concluída antes de passar pelas obrigatórias.

```
Planner → Coder → Tester → Reviewer → Security Auditor
```

Cada etapa tem um subagente dedicado (`planner`, `coder`, `tester`, `reviewer`, `security-auditor`). **Planner, Reviewer e Security Auditor não têm permissão de escrita de propósito**: quem escreve não aprova.

## Antes de qualquer etapa: carregue `boas-praticas`

**Obrigatório, não opcional.** A skill `boas-praticas` traz as diretrizes de código da Elkys — preservação de regras de negócio, redução de complexidade sem alterar comportamento, logs de progresso, instanciação de serviços, os 5 status canônicos, idioma e separação de camadas. Ela vale em **todas** as cinco etapas, não só na do Coder:

- **Planner** desenha a menor alteração que preserva 100% do comportamento.
- **Coder** implementa dentro das diretrizes.
- **Tester** cobre a regra de negócio que existia antes, não só o caminho novo.
- **Reviewer** rejeita o que violar as diretrizes.
- **Security Auditor** trata log de dado sensível e secret no fonte como achado.

Se o projeto tiver documento próprio (`docs/boas-praticas.md` ou equivalente), ele manda no detalhe do stack.

## Ordem de prioridade (resolve todo conflito)

1. **preservar 100% das regras de negócio**
2. **não alterar comportamento sem solicitação explícita**
3. segurança
4. correção / corrigir bugs
5. testes
6. reduzir complexidade
7. logs claros de progresso
8. manutenção e organização
9. performance
10. qualidade visual e experiência

**Nenhuma melhoria estética, arquitetural ou estrutural tem prioridade sobre preservar o comportamento da aplicação.** Se a alteração muda resultado, fluxo, condição, retorno ou efeito colateral, ela não é refatoração: é mudança funcional, e precisa ser pedida e declarada como tal.

O objetivo **não é produzir mais código**. É produzir a menor alteração segura, correta, testável e sustentável possível.

## Quando cada etapa é obrigatória

| Tipo de alteração                                                                                                                  | Planner | Coder | Tester | Reviewer | Security Auditor             |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------- | ----- | ------ | -------- | ---------------------------- |
| Correção de typo, texto, comentário                                                                                                | —       | ✅    | —      | —        | —                            |
| Ajuste visual sem lógica                                                                                                           | —       | ✅    | —      | opcional | —                            |
| Correção de bug                                                                                                                    | ✅      | ✅    | ✅     | ✅       | se tocar superfície sensível |
| Funcionalidade nova                                                                                                                | ✅      | ✅    | ✅     | ✅       | ✅                           |
| Refatoração                                                                                                                        | ✅      | ✅    | ✅     | ✅       | se tocar superfície sensível |
| Auth, permissão, RLS, entrada de usuário, upload, arquivo, rede, segredo, renderização de HTML, dependência, configuração de infra | ✅      | ✅    | ✅     | ✅       | ✅ **sempre**                |
| Migration / mudança de schema                                                                                                      | ✅      | ✅    | ✅     | ✅       | ✅                           |

Na dúvida sobre "é relevante?", trate como relevante.

## Como executar

Rode as etapas em **sequência** — cada uma consome a saída da anterior. Não paralelize Reviewer com Coder: revisar código que ainda está mudando é desperdício.

1. **Planner** — entrega plano com comportamento atual, alcance, riscos, mudanças de comportamento declaradas e como validar. Leia o plano antes de seguir. Se estiver errado, corrija o plano, não improvise depois.
2. **Coder** — implementa **o plano**. Se o plano se mostrar inviável, volta para o Planner em vez de inventar outro caminho.
3. **Tester** — roda o que existe, cobre o que mudou, escreve o teste de regressão que falha no código antigo.
4. **Reviewer** — revisão adversarial e independente. Bloqueante rejeita.
5. **Security Auditor** — checklist completo. Crítica bloqueia.

Achado bloqueante volta para o Coder e **as etapas seguintes rodam de novo**. Revisão feita sobre código que mudou depois não vale.

## Regras que valem em todas as etapas

- **Nenhuma mudança silenciosa.** Toda diferença de comportamento precisa ser intencional e escrita — no commit e na documentação, não só num comentário que ninguém vai abrir.
- **Provar antes de chamar de bug.** Comportamento estranho costuma ser regra de negócio esquecida. Reproduza antes de "corrigir".
- **Condição aparentemente redundante não se remove no impulso.** Verifique antes se ela é regra de negócio, compatibilidade, exceção operacional ou cenário legado ainda válido. A condição "sobrando" costuma ser a regra que ninguém lembra.
- **Menor alteração possível.** Refatoração de carona sai do escopo e vira item separado.
- **Reusar antes de criar.** Buscar no projeto antes de escrever helper novo.
- **Duplicação é o alvo, não o código movido.** Extrair serviço só compensa quando mata cópia. Ao achar cópias, **compare-as entre si**: a divergência entre elas costuma ser bug latente e é o achado mais valioso.
- **Código morto só sai com prova.** Export sem consumidor não basta — ferramenta de análise erra em arquivo fora do grafo de módulos. Confirme com busca cruzada.
- **Log de progresso onde o fluxo tem etapas**, e nunca com senha, token, secret, credencial ou dado pessoal desnecessário.
- **Relatar o resultado real.** Se o teste falhou, diga com a saída. Se algo ficou de fora, diga o quê e por quê.

## Skills de apoio

`boas-praticas` é **obrigatória e vem antes** (ver topo). As demais, invoque conforme o risco da alteração, não por protocolo:

- `ponytail` — antes de escrever: isto precisa existir?
- `code-security` — durante a escrita, em qualquer código que toque entrada, banco, arquivo, rede, saída ou identidade.
- `owasp-security` — quando a mudança envolve autenticação, autorização, sessão, API ou agente/IA.
- `security-review` — revisão de segurança **do diff**, antes do PR.
- `audit-codebase` — auditoria do projeto **inteiro**, periódica; não é etapa de PR.

## Ferramenta externa

Não rode ferramenta só para constar. Use análise estática adicional (Semgrep/OpenGrep, scanner de dependência, scanner de segredo) quando o risco da alteração justificar — e leia o resultado com ceticismo: scanner produz falso positivo, e reportar ruído custa credibilidade.

Antes de adotar skill ou plugin de terceiro, verifique origem, manutenção recente, licença, e principalmente **o que ele executa**: scripts, hooks instalados, downloads, permissões pedidas e qualquer envio de dado para fora. Nunca instale código de terceiro sem revisar o conteúdo relevante.
