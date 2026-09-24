# Boas práticas de desenvolvimento

As 10 regras abaixo valem para todo código deste repositório, sem exceção.

## Como as camadas aparecem aqui

| Camada da regra 8 | Neste projeto |
| --- | --- |
| controllers | páginas em `src/pages/` e o `Deno.serve` de cada Edge Function: recebem o evento e coordenam |
| services | uma classe por assunto em `src/lib/`, com a instância exportada (`servicoPonto`, `servicoSessao`...) |
| utils | `src/utils/`: só função usada por 2+ módulos |
| config | `src/config.ts` (lê o `.env.local`) no front; secrets do Supabase nas functions |
| repositories | as consultas ao Supabase dentro dos serviços de `src/lib/` |
| models | `src/types.ts`, os tipos de cada serviço e o conteúdo do site em `src/data/` |
| hooks | `src/hooks/`: ligam a interface aos serviços, sem regra de negócio |

Os exemplos das regras estão em Python. Em TypeScript vale o mesmo: `servicoPonto.registrar(...)` no lugar
de funções soltas. Método de serviço passado como callback vai numa arrow (`() => servicoX.carregar()`),
senão perde o `this`.

**Os 5 status (regra 3) aqui:** `StatusProcessamento` e `ResultadoOperacao` em `src/types.ts` (e em
`supabase/functions/_shared/http.ts`). Toda operação que pode falhar por regra de negócio ou por falha
técnica devolve o status: login, senha, convite, acessos dos alunos, envio de entrega e as respostas das
Edge Functions (4xx = exceção de negócio, 5xx = de sistema). Estados de domínio gravados no banco
(solicitação pendente/aprovada, tentativa aguardando/concluída, presença) não são status de
processamento e ficam como estão.

---

## 1. Instanciação de serviços

Serviços devem ser instanciados antes do uso, principalmente quando houver mais de um método relacionado à mesma responsabilidade.

Preferir:

```python
servico = ServicoRelatorio()

servico.gerar()
servico.enviar()
```

Evitar:

```python
ServicoRelatorio.gerar()
ServicoRelatorio.enviar()
```

Exceção: métodos realmente estáticos, sem dependência de estado, contexto ou instância.

---

## 2. Responsabilidade dos controladores

Controladores devem permanecer pequenos e responsáveis principalmente pela ordem de execução e coordenação das operações.

O controlador deve:

* receber a requisição ou evento;
* validar o fluxo necessário;
* coordenar a execução dos serviços;
* retornar ou finalizar a operação.

Quando o fluxo possuir poucos serviços e baixa complexidade, a orquestração pode permanecer no próprio controlador.

Quando o controlador começar a concentrar muitos serviços, responsabilidades ou fluxos distintos, deve ser dividido.

Como referência, controladores com menos de aproximadamente 10 serviços envolvidos tendem a permanecer administráveis, desde que continuem coesos.

Se houver muitos fluxos diferentes, criar mais de um controlador em vez de transformar um único controlador em um ponto central de toda a aplicação.

---

## 3. Padronização de status

Sempre que houver controle de status de processamento, utilizar a seguinte padronização:

```text
1 - Em execução
2 - Exceção de negócio
3 - Exceção de sistema
4 - Sucesso
5 - Cancelado
```

Significado:

* `Em execução`: processamento iniciado e ainda não finalizado.
* `Exceção de negócio`: falha causada por regra de negócio ou condição esperada.
* `Exceção de sistema`: falha técnica inesperada.
* `Sucesso`: processamento concluído corretamente.
* `Cancelado`: operação interrompida ou cancelada.

Evitar criar novos códigos ou significados diferentes sem necessidade.

---

## 4. Idioma do código

Todo código deve utilizar português para elementos pertencentes ao domínio da aplicação.

Utilizar português para:

* classes;
* métodos;
* funções;
* variáveis;
* constantes;
* enums;
* mensagens internas;
* regras de negócio;
* nomes de serviços.

Exemplo:

```python
class ServicoNotificacao:
    def enviar_relatorio(self):
        pass
```

Manter em inglês apenas aquilo que pertence ao padrão da linguagem, framework, biblioteca, protocolo ou tecnologia utilizada.

Exemplos:

```python
__init__
getenv
request
response
middleware
Dockerfile
README
```

Não traduzir artificialmente conceitos técnicos padronizados.

---

## 5. Localização de funções

A localização de uma função deve ser definida pelo seu nível real de reutilização.

### Uso exclusivo

Se uma função for utilizada somente dentro de um serviço, ela deve permanecer dentro daquele serviço ou módulo.

Exemplo:

```python
class ServicoRelatorio:

    def _calcular_total_departamento(self):
        pass
```

Não criar utilitários globais para lógica usada somente em um ponto.

### Uso compartilhado

Se uma função for utilizada por mais de um serviço ou módulo, ela pode ser movida para uma estrutura compartilhada, como `utils`.

Exemplo:

```text
utils/
    datas.py
    formatacao.py
```

Regra:

```text
1 consumidor  → permanece local
2+ consumidores → considerar utils
```

A reutilização deve existir de fato. Não mover funções para `utils` apenas por possibilidade futura.

`utils` não deve se tornar um depósito genérico de funções sem contexto.

---

## 6. Funções relacionadas devem pertencer a um serviço

Quando houver várias funções relacionadas à mesma responsabilidade, preferir encapsulá-las em um serviço e trabalhar com uma instância.

Preferir:

```python
servico = ServicoArquivo()

servico.validar()
servico.processar()
servico.salvar()
```

Evitar:

```python
validar_arquivo()
processar_arquivo()
salvar_arquivo()
```

quando todas essas funções representam etapas da mesma responsabilidade.

Funções puramente utilitárias, sem estado e sem responsabilidade de negócio própria, não precisam obrigatoriamente virar classes.

---

## 7. Variáveis de ambiente e configurações

Valores que possam variar entre ambientes, instalações ou execuções devem ser tratados como configuração.

Utilizar variáveis de ambiente, preferencialmente por meio de `getenv` ou mecanismo equivalente da linguagem.

Exemplo:

```python
from os import getenv

URL_API = getenv("URL_API")
EMAIL_DESTINATARIO = getenv("EMAIL_DESTINATARIO")
TEMPO_LIMITE = getenv("TEMPO_LIMITE", "30")
```

São candidatos a configuração:

* URLs;
* endpoints;
* credenciais;
* tokens;
* e-mails;
* caminhos;
* portas;
* nomes de filas;
* timeouts;
* quantidade máxima de tentativas;
* parâmetros operacionais;
* feature flags;
* identificadores externos;
* qualquer valor que possa precisar ser alterado sem modificar o código.

Não utilizar variável de ambiente para:

* valores calculados em tempo de execução;
* resultados derivados;
* regras internas que não variam por ambiente;
* constantes intrínsecas ao domínio.

Regra geral:

```text
Pode precisar mudar sem alterar o código?
    Sim → configuração / variável de ambiente
    Não → avaliar se deve permanecer no código
```

Nunca armazenar credenciais ou secrets diretamente no código-fonte.

---

## 8. Separação de responsabilidades

Manter uma divisão clara entre responsabilidades.

```text
controllers/
    coordenação e ordem de execução

services/
    regras de negócio e comportamentos

utils/
    funcionalidades genéricas realmente reutilizadas

config/
    configurações e parâmetros externos

repositories/
    acesso e persistência de dados

models/
    representação das entidades e estruturas do domínio
```

A estrutura exata pode variar conforme framework ou arquitetura, mas a responsabilidade de cada camada deve permanecer clara.

---

## 9. Princípio de menor complexidade

Não criar abstrações antecipadamente.

Antes de criar:

* novo serviço;
* nova classe;
* novo utilitário;
* nova camada;
* nova interface;
* nova dependência;

verificar se a complexidade realmente exige essa estrutura.

Preferir inicialmente a solução mais simples que:

* seja legível;
* seja testável;
* seja segura;
* preserve separação de responsabilidades;
* permita manutenção adequada.

Generalizar somente quando existir necessidade concreta.

---

## 10. Regra geral

Antes de decidir onde colocar uma responsabilidade, aplicar esta sequência:

```text
É responsabilidade exclusiva de um serviço?
    → manter no serviço

É reutilizada por mais de um serviço?
    → mover para estrutura compartilhada

Existem vários métodos relacionados à mesma responsabilidade?
    → encapsular em serviço e instanciar

É um valor que pode variar sem mudança de código?
    → configuração / variável de ambiente

É apenas coordenação de fluxo?
    → controlador

É regra de negócio?
    → serviço
```

O objetivo é manter o código simples, previsível, reutilizável quando necessário e sem abstrações desnecessárias.
