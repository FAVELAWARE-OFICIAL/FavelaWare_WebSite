---
name: boas-praticas
description: Boas práticas de código — regras de negócio preservadas acima de tudo, complexidade menor sem mudar comportamento, serviços, controlador, os 5 status, logs de progresso, idioma do código, configuração e camadas. Use ao escrever, refatorar ou corrigir lógica de aplicação, ao decidir onde uma responsabilidade mora, ao criar serviço/utilitário/camada nova, ou quando pedirem "segue o padrão", "boas práticas" ou "padronizar o código".
---

# Boas práticas

Valem para qualquer projeto e qualquer linguagem.

## A regra que vem antes de todas

**Toda alteração preserva 100% das regras de negócio existentes.**

Nenhuma melhoria estrutural — extrair serviço, reorganizar arquivo, reduzir
código, trocar arquitetura, corrigir técnica — pode mudar o comportamento
esperado sem que isso tenha sido **explicitamente pedido**.

```text
Refatoração ≠ alteração de comportamento
```

Se a alteração muda resultado, fluxo, condição, retorno ou efeito colateral,
ela não é refatoração: é mudança funcional, e precisa ser tratada e declarada
como tal.

**Na dúvida, preserve o comportamento.**

Antes de tocar no código, identifique: quais regras estão sendo executadas,
quais condições determinam o fluxo, quais entradas e saídas são esperadas,
quais efeitos colaterais existem, quais integrações dependem daquilo, e quais
exceções fazem parte do fluxo atual.

Compare com o código anterior, não com a memória. Toda diferença precisa ser
intencional e escrita no commit.

## Prioridade quando as regras conflitam

```text
1. Preservar 100% das regras de negócio
2. Não alterar comportamento sem solicitação explícita
3. Corrigir bugs
4. Reduzir complexidade
5. Manter logs claros de progresso
6. Melhorar organização e arquitetura
7. Criar abstrações somente quando necessárias
```

Nenhuma melhoria estética, arquitetural ou estrutural tem prioridade sobre
preservar o comportamento.

## Reduzir complexidade, mantendo o comportamento

O foco é extremo em: simplificar fluxos, reduzir duplicações, remover
complexidade desnecessária, melhorar legibilidade, corrigir bugs, eliminar
código morto **comprovadamente** seguro, melhorar nomes, reduzir acoplamento
e facilitar testes.

```text
Código mais simples + Mesmo comportamento + Mesmas regras de negócio
```

Evite refatoração que introduza abstração, padrão ou dependência sem
benefício concreto.

**Antes de remover condição aparentemente redundante**, verifique se ela é
regra de negócio, compatibilidade, exceção operacional ou cenário legado
ainda válido. Condição "sobrando" costuma ser a regra que ninguém lembra.

**O ganho real quase nunca é mover código.** Extrair serviço só compensa
quando mata duplicação. Antes de mover, procure a mesma lógica copiada em
outros pontos — e compare as cópias entre si. A divergência entre elas é o
achado mais valioso, e costuma ser bug.

**"Comprovadamente seguro" é literal.** Export sem consumidor não é prova:
ferramenta de análise erra em arquivo fora do grafo de módulos. Confirme com
busca cruzada antes de remover.

## A pergunta que decide onde a coisa mora

```text
Preserva 100% das regras de negócio?        Não → não faça
Mantém o comportamento esperado?            Não → é mudança funcional
Reduz complexidade ou corrige problema?     Não → avalie se é necessária
O fluxo precisa de acompanhamento?          Sim → logs claros
Responsabilidade exclusiva de um serviço?   → mantém no serviço
Reutilizada por 2+ serviços?                → estrutura compartilhada
Vários métodos da mesma responsabilidade?   → encapsula em serviço
Valor que muda sem mudar código?            → configuração / env
Só coordenação de fluxo?                    → controlador
Regra de negócio?                           → serviço
```

## Logs de progresso

Processo relevante precisa de log que permita acompanhar o fluxo **sem abrir
o código**: início, etapa atual, identificador, quantidade quando aplicável,
conclusão, falha de negócio e falha de sistema.

```python
logger.info("Iniciando processamento das propostas")
logger.info("Processando proposta %s de %s", indice, total)
logger.info("Proposta %s processada com sucesso", proposta_id)
```

Nada de `"entrou aqui"`, `"teste"`, `"ok"`.

**Nunca logue** senha, token, secret, credencial, dado pessoal desnecessário
ou conteúdo confidencial.

O log de **progresso** é do controlador (ele conhece a ordem). O **detalhe
técnico** da falha é do serviço. Um erro não pode sumir da UI e do console ao
mesmo tempo: se a mensagem ao usuário é genérica — e deve ser —, alguém
precisa estar logando o detalhe.

## Serviço iniciado antes

Fluxo que chama **2+ métodos** do mesmo serviço inicia o serviço **uma vez**.

```python
servico = ServicoRelatorio()   # ✅
servico.gerar()
servico.enviar()

ServicoRelatorio.gerar()       # ❌
ServicoRelatorio.enviar()
```

Exceção: método realmente estático. Dependência que **expira** não se congela
em tela de vida longa — resolva por chamada e escreva o motivo no cabeçalho.

## Controlador pequeno

Ordem de execução e decisão por status. Nada de infraestrutura direta.
Validação de entrada antes de tocar em serviço. Referência: menos de ~10
serviços. Passou disso, fragmente — nunca deixe um controlador virar o ponto
central da aplicação.

## Os cinco status

```text
1 Em execução   2 Exceção de negócio   3 Exceção de sistema
4 Sucesso       5 Cancelado
```

Exceção de **negócio** é culpa do dado: mensagem para o usuário final.
Exceção de **sistema** é falha técnica: log; usuário vê genérico.

**Serviço nunca lança para o controlador** — converte em resultado. O
controlador decide **por status**, nunca inspecionando string de mensagem.

Efeito secundário por decisão de produto (o e-mail que falha não desfaz o
pagamento) vira aviso acumulado, mostrado num ponto único.

## Código em português

Domínio em português: classes, métodos, funções, variáveis, constantes,
enums, mensagens, logs, regras e nomes de serviço.

**O banco também é em português**: tabela, coluna, view, função, tipo, valor
de enum, índice, constraint, política e chave de jsonb. Grafia `snake_case`,
só ASCII, sem acento nem cedilha (`cobrancas`, `data_vencimento`), porque
identificador com acento obriga aspas em toda consulta.

Inglês só no padrão da linguagem/framework/protocolo (`__init__`, `getenv`,
`request`, `middleware`, `useState`, `className`), no que a plataforma
gerencia (os esquemas `auth` e `storage` do Supabase, por exemplo) e em API
externa. Não traduza conceito técnico padronizado (`id`, `url`, `email`,
`payload`, `token`, `hash`).

**Nome gravado só muda junto com a migration que o renomeia.** Enquanto o
banco devolver `due_date`, o código lê `due_date`: traduzir no código um nome
que ainda viaja pela rede ou está gravado em disco quebra o contrato. Banco
legado em inglês se traduz por migração planejada, não por renomeação no
código.

Ao renomear em massa: substitua **do mais específico para o mais genérico**,
senão a regra curta corrompe a longa. E não renomeie acesso a propriedade,
prop de componente nem chave de objeto — são contrato de outro.

## Onde a função mora

```text
1 consumidor    → fica local
2+ consumidores → considerar utils/compartilhado
```

A reutilização precisa existir **de fato**. `utils` não é depósito.

## Configuração vs. código

```text
Pode mudar sem alterar o código?  Sim → env    Não → avaliar manter no código
```

Configuração: URL, endpoint, credencial, token, e-mail, caminho, porta, fila,
timeout, número de tentativas, feature flag, identificador externo.

Não: valor calculado em runtime, resultado derivado, regra que não varia por
ambiente, constante do domínio.

**Credencial e secret nunca no código-fonte.**

## Camadas

```text
controllers/  coordenação   services/  regras de negócio
utils/        genérico      config/    parâmetros externos
repositories/ persistência  models/    entidades
```

A estrutura muda com o framework; a responsabilidade, não.

## Menor complexidade

Não crie abstração antecipada. Antes de novo serviço, classe, utilitário,
camada, interface ou dependência, verifique se a complexidade **exige**.
Generalize só com necessidade concreta.

## Fluxo multi-passo

- **Feedback visual**: lista de passos com status de cada um, sem botão de
  fechar — senão o usuário abandona a compensação pela metade. Fluxo de 1-2
  passos não precisa.
- **Compensação**: passo que falha depois de efeito colateral desfaz os
  anteriores. Compensação que falha vira **log, nunca exceção** — mas precisa
  ser **detectada**: devolver sucesso sem checar o desfazer é pior que não
  compensar, porque o chamador acredita que o estado foi limpo.

## Consultas

- **Cada consulta declara suas colunas.** `SELECT *`, `select("*")` e
  equivalentes do ORM são proibidos.
- Ao trocar `*` por colunas, **estreite o tipo local junto** — é o compilador
  com tipo estreito que pega campo esquecido.
- Ao auditar, busque também as variantes que escapam da busca exata. Exemplo
  no supabase-js: `select("*` **sem fechar aspas** (a variante com join) e
  `.select()` **sem argumento**, que é `select("*")` funcional.
- **A regra vale para a assinatura**, não só para a query: método que exige a
  linha inteira obriga o chamador a carregar coluna que não usa — e é assim
  que nasce uma cópia do fluxo em quem só tem um recorte.

## Armadilhas recorrentes

- Comportamento e infraestrutura migram em PRs separados.
- Toast/modal é do controlador; o serviço só devolve status.
- Todo `catch` vira exceção de sistema (log + status); nenhum engole o erro.
- Estado de URL fica na página que hospeda as abas, não no componente
  renderizado como aba.
- Cliente que **devolve** o erro em vez de lançar (ex.: supabase-js) exige ler
  o erro retornado: `try/catch` em volta dele nunca dispara e a falha fica
  invisível.

---

Se o projeto tiver documento próprio (`docs/boas-praticas.md` ou equivalente)
ou skill própria, ele manda no detalhe do stack; esta skill vale quando o
projeto não diz nada.
