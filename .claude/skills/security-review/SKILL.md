---
name: security-review
description: Revisão de segurança do diff antes do PR ou merge — diferencial, focada no que mudou e no que o que mudou alcança. Use antes de abrir PR, antes de entrega importante, e sempre que a alteração tocar endpoint, autenticação, autorização, renderização, upload, arquivo, rede, dependência ou configuração.
---

# Revisão de segurança da alteração

Revisão **diferencial**: o alvo é o que mudou. Mas o risco não para no diff — uma linha nova pode ser insegura por causa de algo que já existia.

## 1. Delimitar o que mudou

```
git diff <base>...HEAD --stat
git diff <base>...HEAD
```

Classifique cada arquivo pelo risco: rota e endpoint · autenticação e permissão · consulta ao banco e migration · entrada de usuário e formulário · renderização de HTML · arquivo e upload · chamada de rede · configuração, CI e infra · dependência.

Arquivo que não cai em nenhuma categoria dificilmente carrega vulnerabilidade — não gaste a revisão nele.

## 2. Seguir o dado, não o arquivo

Para cada entrada nova ou alterada, percorra o caminho inteiro:

**onde entra → como é validada → por onde passa → onde é usada (SQL? shell? caminho? HTML? URL?) → o que volta para o usuário**

A vulnerabilidade quase sempre está numa ponta que o diff não mostra: o parâmetro é adicionado num arquivo e usado em outro. Busque os consumidores do que mudou.

## 3. Perguntas que pegam a maior parte

- Esta rota nova está protegida? Qual papel alcança?
- Este id vem do usuário? O que impede de trocar pelo id de outro dono?
- Esta consulta concatena algo?
- Este dado renderizado veio de onde? Passa por `innerHTML` ou equivalente?
- Esta URL é montada com entrada do usuário?
- Este caminho de arquivo é montado com entrada do usuário?
- Este `catch`: em caso de falha, libera ou nega?
- Esta resposta devolve mais campo do que a tela usa?
- Este log registra algo sensível?
- A permissão foi verificada no servidor ou só escondida na UI?
- Esta dependência nova: quem mantém, tem vulnerabilidade aberta, o que ela puxa junto?
- Esta configuração afrouxou algo (CORS, CSP, verificação de token, política de acesso)?

## 4. Mudanças que merecem atenção redobrada

- **Verificação removida ou afrouxada** — mesmo "porque nunca acontece".
- **Escopo de erro alterado** — algo que derrubava a operação e agora só avisa, ou vice-versa.
- **Unificação de dois caminhos parecidos** — se um era mais restritivo, a unificação pode ter afrouxado em silêncio.
- **Campo novo aceito no payload** — pode ser mass assignment em permissão, preço ou dono.
- **Alteração em migration ou política de acesso** — o efeito é global e não aparece no comportamento da tela.

## 5. Antes de reportar, tente derrubar o achado

Para cada suspeita: existe validação antes no caminho? O framework já protege? O dado é realmente controlado pelo atacante? Há autenticação obrigatória na frente? O caminho é alcançável na prática?

Achado que não sobrevive a essa checagem **não deve ser reportado**. Ruído custa credibilidade e faz o achado real ser ignorado.

## 6. Entrega

Para cada achado confirmado:

```
arquivo:linha · Severidade
O que está errado (uma frase)
Exploração: quem é o atacante, o que envia, o que consegue
Correção recomendada
```

Severidade: **Crítica** (bloqueia o merge) · **Alta** · **Média** · **Baixa** · **Informativa**.

Termine com **APROVADO** ou **BLOQUEADO** e a lista do que foi verificado e estava correto — sem isso, ninguém sabe a cobertura real da revisão.

Se rodar ferramenta (análise estática, scanner de dependência ou de segredo), use quando o risco justificar e **leia o resultado com ceticismo**: scanner produz falso positivo. Ferramenta rodada sem interpretação não é revisão.
