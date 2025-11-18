# FavelaWare - Site Oficial

Site oficial do projeto FavelaWare, uma iniciativa de formação de jovens programadores vindos de comunidades de Belo Horizonte/MG.

## Sobre o Projeto

O FavelaWare é focado na formação técnica e de soft skills de jovens de 15 a 24 anos, com aulas de lógica básica, low code, back end e front end, além de desenvolvimento pessoal e trabalho em equipe.

## Tecnologias Utilizadas

Este projeto foi desenvolvido com tecnologias modernas de desenvolvimento web:

- **TypeScript** - Superset do JavaScript com tipagem estática
- **React.js** - Biblioteca JavaScript para criar interfaces de usuário
- **Vite** - Ferramenta de build rápida e moderna
- **Tailwind CSS** - Framework CSS utilitário para estilização
- **Framer Motion** - Biblioteca de animações para React
- **React Router** - Gerenciamento de rotas/navegação

## Estrutura do Projeto

```
src/
├── components/         # Componentes reutilizáveis
│   ├── Navbar.tsx     # Barra de navegação
│   ├── Hero.tsx       # Seção principal da home
│   ├── Footer.tsx     # Rodapé
│   ├── Gallery.tsx    # Galeria de fotos
│   ├── Partners.tsx   # Parceiros e idealizadores
│   └── MacroTimeline.tsx  # Cronograma visual
├── pages/             # Páginas do site
│   ├── Home.tsx       # Página inicial
│   ├── ComoFazemos.tsx  # Trilhas de ensino
│   ├── Sobre.tsx      # Informações do projeto
│   └── HallDaFama.tsx # Equipes anteriores
├── App.tsx            # Componente principal com rotas
├── main.tsx           # Ponto de entrada da aplicação
├── types.ts           # Definições de tipos TypeScript
└── index.css          # Estilos globais
```

## Conceitos Importantes (para iniciantes)

### O que é React?
React é uma ferramenta que permite criar sites de forma organizada, dividindo tudo em "componentes" (pedaços reutilizáveis de código). Pense em componentes como peças de LEGO que você pode combinar para construir algo maior.

### O que é Tailwind CSS?
Ao invés de escrever CSS tradicional, o Tailwind permite estilizar elementos usando classes prontas. Por exemplo:
- `bg-blue-500` = fundo azul
- `text-white` = texto branco
- `p-4` = padding (espaçamento interno)

### O que são Rotas?
Rotas permitem ter várias "páginas" no site sem precisar recarregar. Quando você clica em um link, o React Router muda apenas o conteúdo, mantendo o resto igual.

### O que é TypeScript?
TypeScript é como JavaScript, mas com "superpoderes". Ele adiciona tipos aos dados, ajudando a prevenir erros antes mesmo de executar o código. Por exemplo:
- `const nome: string = "FavelaWare"` - garante que nome é sempre texto
- `const idade: number = 4` - garante que idade é sempre número
- Interfaces definem a estrutura de objetos complexos
- O editor mostra erros em tempo real

## Como Executar o Projeto

### Pré-requisitos
- Node.js instalado (versão 16 ou superior)
- npm ou yarn (gerenciadores de pacotes)

### Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITORIO]
cd WebSite_Official
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o projeto em modo desenvolvimento:
```bash
npm run dev
```

4. Abra o navegador em `http://localhost:5173`

### Outros Comandos

```bash
npm run build    # Gera versão de produção
npm run preview  # Visualiza a versão de produção
npm run lint     # Verifica problemas no código
```

## Estrutura de Páginas

### Home (/)
- Hero com logo e título principal
- Galeria de fotos do projeto
- Parceiros e idealizadores
- Rodapé com informações de contato

### Como Fazemos (/como-fazemos)
- Detalhamento das trilhas de ensino
- Conteúdo programático completo
- Edições anteriores do projeto

### Sobre (/sobre)
- Informações sobre o projeto
- Cronograma macro
- Idealizadores e equipe
- Propósitos (acadêmico, social, carreira)
- Detalhes sobre cada parceiro

### Hall da Fama (/hall-da-fama)
- Equipes de todas as edições (2022, 2023, 2024)
- Membros e suas funções

## Personalização de Cores

As cores do projeto estão definidas em `tailwind.config.js`:

- **Verde** (`favela-green`): Cor principal (#8bc53f)
- **Azul** (`favela-blue`): Cor secundária
- **Roxo** (`favela-purple`): Headers e navbar (#2d2a5f)
- **Rosa** (`favela-pink`): Destaques

## Animações

O projeto utiliza Framer Motion para animações suaves:
- Animações de entrada (fade in, slide)
- Hover effects (efeitos ao passar o mouse)
- Transições entre páginas
- Partículas flutuantes

## Responsividade

O site é totalmente responsivo, adaptando-se a:
- Desktop (telas grandes)
- Tablet (telas médias)
- Mobile (celulares)

Classes Tailwind responsivas usadas:
- `md:` - A partir de tablets
- `lg:` - A partir de desktops
- `sm:` - A partir de celulares grandes

## Contribuindo

Para contribuir com o projeto:

1. Leia todo o código documentado para entender a estrutura
2. Crie uma branch para sua feature
3. Mantenha o padrão de documentação
4. Teste em diferentes dispositivos
5. Submeta um pull request

## Documentação do Código

Todo o código está documentado em português com:
- Explicações sobre o que cada arquivo faz
- Comentários em funções importantes
- Descrição de conceitos para iniciantes
- Exemplos práticos

## Licença

Este projeto é parte do FavelaWare, uma iniciativa da Mundiale, Ecossistema Ânima Educação (UNA Cristiano Machado) e Obras Pavonianas com a Rede Transformar.

## Contato

- Email: contato@favelaware.com
- Localização: Belo Horizonte/MG

---

Desenvolvido com dedicação para as comunidades de Belo Horizonte
