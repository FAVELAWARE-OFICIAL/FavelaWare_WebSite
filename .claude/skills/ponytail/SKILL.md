---
name: ponytail
description: Menos código significa menos bugs, e menos bugs significa menos vulnerabilidade. Use antes de implementar qualquer coisa, ao revisar solução que parece grande demais, ao avaliar dependência nova, ou quando pedirem para simplificar, reduzir complexidade ou remover código morto.
---

# Ponytail

Toda linha escrita é uma linha para manter, revisar, testar e defender. A melhor mudança costuma ser a que não acontece.

## Os cinco filtros, antes de escrever

Passe por eles **em ordem**. O primeiro que resolver encerra a questão.

### 1. Isto precisa existir?

Qual problema real resolve, para quem, agora? Requisito imaginado ("um dia vamos precisar") não passa. Código especulativo é dívida contratada para um futuro que costuma não chegar.

### 2. Já existe no projeto?

Busque antes de criar — por nome, por comportamento, por texto parecido. Reimplementar um helper que já existe é o erro mais comum e o mais caro: passa a haver duas verdades que divergem em silêncio.

### 3. A linguagem ou o framework já resolve?

Recurso nativo vence código próprio. Ele é testado por milhões, documentado, e não é seu para manter.

### 4. Dá para usar dependência que já está no projeto?

Antes de somar uma nova. Cada dependência é superfície de ataque, atualização obrigatória e risco de supply chain.

### 5. Qual é a menor implementação que resolve de verdade?

"De verdade" é a parte que importa. Menor não é a que parece menor omitindo casos.

## O sexto filtro é inegociável

**Nunca simplifique segurança, validação, tratamento de erro ou acessibilidade.**

Menos código deve significar **menor superfície de manutenção**, jamais menor qualidade. Se a "simplificação" removeu uma checagem de permissão, uma validação de entrada, um tratamento de falha ou um `aria-label`, isso não é Ponytail — é regressão com outro nome.

Contas que **não** valem a pena: remover a verificação de nulo porque "nunca vem nulo"; trocar consulta parametrizada por concatenação porque "é mais curto"; engolir erro em `catch` vazio porque "não acontece"; remover o estado de erro da tela porque "quase nunca falha".

## Ao revisar

Pergunte de cada bloco novo: **o que quebra se eu apagar isto?** Se a resposta for "nada", apague.

Procure especificamente:

- abstração com um único uso — geralmente é cedo demais;
- camada que só repassa a chamada adiante sem decidir nada;
- opção de configuração que ninguém nunca mudou;
- código morto: função não referenciada, tipo que sobrou de migração, `import` órfão, branch inalcançável;
- duplicação real — a mesma regra escrita em dois lugares, que já divergiu ou vai divergir.

Duplicar duas vezes é melhor que a abstração errada. Na terceira, abstraia — aí o padrão já se revelou.

## Ao remover

Antes de apagar, **verifique quem consome**. Busca por referências, não intuição. E remova de uma vez: código comentado "por segurança" é o pior dos mundos, porque não roda e ainda precisa ser lido.
