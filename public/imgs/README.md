# Imagens

Esta pasta contém todas as imagens do projeto organizadas por categoria.

## Estrutura

- `backgrounds/` — imagens de fundo (`fundo.webp` é o banner oficial; `capa-verde.webp` e `capa-azul.webp` são as capas #programandomudanças do perfil, clara e escura)
  - `fundo.webp` — **banner oficial do FavelaWare** (foto da comunidade + código binário).
    É o fundo do Hero da home e do painel da tela de login. Original tem apenas
    642×361, então esticado em tela cheia fica levemente borrado; se aparecer uma
    versão em alta, é só substituir o arquivo.
- `gallery/` — 67 fotos de eventos, turmas e premiações
  - `edicao-1-01..09.jpg` — 1ª Edição (2022): convites e evento de abertura
  - `turma-1-2022-2.webp` — foto da Turma 1 — 2022.2 (a turma não tem página própria)
  - `edicao-2-01..25.jpg` — 2ª Edição (2023): entrega de certificados
  - `aula-apresentacao.webp` e `turma-formatura.webp` são duplicatas de outras
    fotos; ficam na pasta, mas a Galeria não usa
- `logo/` — `logo.png` (1000×635, fundo transparente), `logo-fundo-claro.png`, `icone.webp` (48×48)
- `partners/` — logos dos parceiros
- `team/` — 19 retratos da equipe (fundo verde já embutido na imagem)
- `graficos/` — peças gráficas (cronograma, camiseta, ilustrações)
- `turmas/<slug>/` — 88 retratos de alunos, uma pasta por turma
  - `foto-turma.webp` — foto da turma inteira (em 5 das 6 pastas; a Turma 2025
    usa `gallery/turma-sala-03.webp`)
- `turmas/sem-foto.webp` — avatar genérico (silhueta sobre o verde) dos alunos
  sem retrato; é a mesma imagem que o hall usa para Karla, Pedro Assunção e
  Rodrigo Queiroz
- `hall-da-fama/` — 39 retratos das equipes de todas as edições (72 entradas no
  hall: quem participou de dois anos reaproveita a mesma foto, e a equipe da
  Edição III, em 2025 e 2026, usa os retratos de `team/`;
  `emily-lamas-2022.webp` é a foto de 2022 da Emily, diferente da de 2025)

## Quem é quem em `team/`

Nomes e cargos conforme a página SOBRE do site oficial:

| Arquivo | Nome | Cargo | Organização |
| --- | --- | --- | --- |
| `gustavo.webp` | Gustavo Pena | Idealizador | Mundiale |
| `cristiane.webp` | Cristiane de Ávila | Idealizadora | Mundiale |
| `diomar.webp` | Diomar | Idealizador | AOPA |
| `rafaela.webp` | Rafaela Moreira | Idealizadora e Orientadora | Ânima |
| `samara.webp` | Samara Leal | Idealizadora | Ânima |
| `joyce.webp` | Joyce | Coordenadora | Mundiale |
| `nathalia.webp` | Nathalia Mazziero | Comunicação | Mundiale |
| `ivan.webp` | Ivan Santos | Coordenador | AOPA |
| `alinne.webp` | Alinne Viegas | Psicóloga | AOPA |
| `leticia.webp` | Letícia Sales | Assistente | AOPA |
| `raquel.webp` | Raquel de Matos | Curadoria de Material | Ânima |
| `gabriel.webp` | Gabriel Evaristo | Curadoria de Material | Ânima |
| `gabrielle.webp` | Gabrielle Soares | Editora de Conteúdo | Ânima |
| `lorraine.webp` | Lorraine Fernandes | Designer gráfico | Ânima |
| `lucelho.webp` | Lucelho Silva | Líder Discente | Ânima |
| `diego.webp` | Diego Manini | Instrutor Discente | Ânima |
| `pedro.webp` | Pedro Soares | Instrutor Discente | Ânima |
| `miguel.webp` | Miguel Alchaar | Instrutor Discente | Ânima |
| `leandro.webp` | Leandro Cavalcante | Instrutor Discente | Ânima |

As 19 pessoas aparecem no `Sobre.tsx`: os 5 idealizadores na seção IDEALIZADORES
e os outros 14 na seção EQUIPE — EDIÇÃO III.

## Nomes dos alunos e do hall da fama

Não estão aqui: ficam em `src/data/turmas.ts` e `src/data/hallDaFama.ts`, onde
cada pessoa tem nome, cargo e o caminho da foto. Para corrigir um nome ou trocar
uma foto, edite aquele arquivo — nada regera esses dados automaticamente.

## Origem

As imagens vieram do site oficial (https://favelaware.animahub.com.br) e foram
otimizadas para web: fotos com no máximo 1600px (JPEG qualidade 82), retratos da
equipe com 800px e retratos de aluno com 400px.

As fotos da 1ª e da 2ª Edição (`gallery/edicao-*`, `gallery/turma-1-2022-2.webp`),
as `turmas/*/foto-turma.webp` e os retratos
`turmas/turma-1-2022-1/emanuelle-goncalves-ferreira-de-oliveira.webp` e
`hall-da-fama/emily-lamas-2022.webp` saíram de uma cópia local das imagens do
site oficial (`WebSite_Official/downloads/favelaware-photos/`, fora deste
projeto), com o mesmo tratamento acima.

**Atenção se for buscar mais imagens de lá:** o Google Sites assina as URLs das
imagens e elas expiram em poucos minutos. Guardar a URL para baixar depois
devolve HTTP 403 — a leitura da página e o download precisam acontecer na mesma
execução.

## Formato recomendado

- PNG para logos e imagens com transparência
- JPG para fotos
- Sempre redimensionar antes de commitar: nada acima de 1600px no lado maior
