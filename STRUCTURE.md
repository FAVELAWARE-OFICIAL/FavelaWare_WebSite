# Estrutura do Projeto FavelaWare

## 📁 Estrutura de Pastas

```
Favela Ware/
├── public/
│   ├── fonts/              # Fontes customizadas
│   └── imgs/               # Imagens estáticas
│       ├── backgrounds/    # Imagens de fundo
│       ├── gallery/        # Fotos da galeria
│       ├── logo/          # Logo do FavelaWare
│       └── partners/      # Logos dos parceiros
│
├── src/
│   ├── components/        # Componentes React reutilizáveis
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── Gallery.jsx
│   │   ├── Partners.jsx
│   │   └── Footer.jsx
│   │
│   ├── pages/            # Páginas completas
│   │   └── Home.jsx
│   │
│   ├── hooks/            # Custom hooks React
│   ├── lib/              # Bibliotecas e configurações
│   ├── utils/            # Funções utilitárias
│   │
│   ├── App.jsx           # Componente principal
│   ├── main.jsx          # Entry point
│   └── index.css         # Estilos globais
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🎨 Tecnologias

- **React.js** - Biblioteca UI
- **Vite** - Build tool
- **Tailwind CSS** - Framework CSS
- **Framer Motion** - Animações

## 🎯 Padrão de Cores

- **Verde Principal**: `#8bc53f`
- **Azul**: `#3b82f6`
- **Rosa (Hover)**: `#ec4899`, `#d946ef`

## 📝 Convenções

- Componentes em PascalCase
- Arquivos de componentes com extensão `.jsx`
- Hooks customizados começam com `use`
- Utilitários em camelCase
