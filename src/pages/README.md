# Pages

Páginas da aplicação. Cada página é o controlador da tela: recebe o evento, chama os serviços de
`src/lib/` e decide o que mostrar. Regra de negócio e acesso ao banco ficam nos serviços.

- Site público: `Home`, `ComoFazemos`, `Sobre`, `HallDaFama`, `Turmas`, `TurmaDetalhe`, `Galeria`, `Reconhecimentos`, `Contato`
- Acesso: `Login`, `PrimeiroAcesso`, `DefinirSenha`, `DadosDoInstrutor`, `Perfil`
- `admin/`: área do gestor (`/dashboard`)
- `professor/`: área do instrutor (`/professor`)
- `aluno/`: área do aluno (`/aluno`)
- `equipe/`: páginas comuns a gestor e instrutor
