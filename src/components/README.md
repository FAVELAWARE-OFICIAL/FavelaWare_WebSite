# Components

Componentes React reutilizáveis.

- Site público: `Navbar`, `Hero`, `GaleriaInicial`, `Parceiros`, `Footer`, `Lightbox`, `RedesSociais`, `RolarAoTopo`, `MotionLink`
- Acesso: `RotaProtegida` (guarda de rota por papel) e `estilosDeAcesso.ts`
- `admin/`: interface das áreas restritas (moldura, menu, janelas, gráficos, formulários)
- `atividades/`: janela da atividade e formulários de atividade e correção
- `trilhas/`: cartão, entregas e formulário da página de trilhas da equipe

Componente não fala com o banco: chama um serviço de `src/lib/`.
