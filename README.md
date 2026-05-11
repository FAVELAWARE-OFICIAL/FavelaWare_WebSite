# FavelaWare: Site Oficial

Site oficial do projeto FavelaWare, uma iniciativa de formação de jovens programadores vindos de comunidades de Belo Horizonte/MG.

## Sobre o Projeto

O FavelaWare é focado na formação técnica e de soft skills de jovens de 15 a 24 anos, com aulas de lógica básica, low code, back end e front end, além de desenvolvimento pessoal e trabalho em equipe.

## Stack

HTML5, CSS3 e JavaScript puros, sem build, sem bundler.

- **HTML estático**, uma página por rota (`index.html`, `sobre.html`, ...).
- **CSS** organizado em `css/base.css` (tokens, reset), `css/components.css` (navbar/footer/botões/cards) e `css/pages/*.css` (estilo específico de cada página).
- **JavaScript** com Custom Elements (`<site-navbar>`, `<site-footer>`) para evitar duplicação de navbar/footer entre páginas.
- **AOS** (Animate On Scroll) via CDN para animações de entrada.
- **Google Fonts (Inter)** via CDN.

## Estrutura

```
.
├── index.html              (Home)
├── sobre.html
├── como-fazemos.html
├── material.html
├── reconhecimentos.html
├── hall-da-fama.html
├── contato.html
├── css/
│   ├── base.css            tokens (variáveis), reset, tipografia
│   ├── components.css      navbar, footer, page-header, botões, cards
│   └── pages/
│       ├── home.css
│       ├── sobre.css
│       ├── como-fazemos.css
│       ├── material.css
│       ├── reconhecimentos.css
│       ├── hall-da-fama.css
│       └── contato.css
├── js/
│   ├── components.js       Web Components <site-navbar>, <site-footer>
│   ├── main.js             bootstrap (inicializa AOS)
│   └── pages/
│       ├── material.js     validação do formulário de entrega
│       └── reconhecimentos.js  modal de imagem ampliada
├── imgs/                   logos, galeria, parceiros, backgrounds
└── fonts/
```

## Como rodar localmente

Como não há build, basta servir os arquivos estáticos. Algumas opções:

**VS Code:** extensão *Live Server* → botão "Go Live".

**Python:**
```bash
python -m http.server 8000
```

**Node.js (npx):**
```bash
npx serve .
```

Abra `http://localhost:8000` (ou a porta indicada).

> Importante: abrir os HTMLs com duplo clique (`file://`) também funciona, mas alguns recursos (web fonts via CDN, fetch futuros) podem ser bloqueados pelo browser. Prefira servir via HTTP local.

## Convenções

- **Cores e dimensões** ficam em `css/base.css` como variáveis (`:root`). Para mudar a paleta, edite apenas esse arquivo.
- **Componentes compartilhados** (navbar, footer, botões reutilizáveis) ficam em `css/components.css`.
- **Estilo específico de uma página** mora em `css/pages/<pagina>.css` e é o único CSS importado além de `base.css` e `components.css`.
- **Markup repetido entre páginas** (navbar, footer) é injetado via `<site-navbar>` / `<site-footer>`, definidos em `js/components.js`.

## Paleta de cores

- **Verde** `#8bc53f`: primária.
- **Roxo** `#2d2a5f`: header, navbar e títulos.
- **Rosa** `#ec4899`: destaques.
- **Azul** `#3b82f6`: secundária.

## Contato

- Email: favelaware@gmail.com
- Localização: Belo Horizonte/MG

---

Iniciativa da Mundiale, Ecossistema Ânima Educação (UNA Cristiano Machado) e Obras Pavonianas com a Rede Transformar.
