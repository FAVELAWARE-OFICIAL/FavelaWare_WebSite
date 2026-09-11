/**
 * ============================================
 * COMPONENTE PRINCIPAL DA APLICAÇÃO (App.jsx)
 * ============================================
 *
 * Este é o componente raiz que organiza toda a estrutura do site.
 * Ele define as rotas (URLs) e qual página mostrar para cada rota.
 *
 * Conceitos importantes:
 * - Router: Sistema de navegação entre páginas sem recarregar o site
 * - Routes: Container que agrupa todas as rotas
 * - Route: Define uma rota específica (URL) e qual componente exibir
 */

// Importa ferramentas de roteamento do React Router
// Router: permite navegação entre páginas
// Routes: agrupa as rotas
// Route: define uma rota específica
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// MotionConfig: configuração global das animações do Framer Motion
import { MotionConfig } from 'framer-motion';

// Volta a rolagem ao topo sempre que a página (rota) muda
import RolarAoTopo from './components/RolarAoTopo';

// Importa as páginas do site
import Home from './pages/Home';               // Página inicial
import ComoFazemos from './pages/ComoFazemos'; // Página que explica as trilhas de ensino
import Sobre from './pages/Sobre';             // Página sobre o projeto
import HallDaFama from './pages/HallDaFama';   // Página com equipes anteriores
import Material from './pages/Material';       // Página de materiais e entrega de atividades
import Reconhecimentos from './pages/Reconhecimentos'; // Página de reconhecimentos e prêmios
import Contato from './pages/Contato';         // Página de contato
import Login from './pages/Login';             // Página de login (acesso à área restrita)
import Turmas from './pages/Turmas';           // Lista de todas as turmas
import TurmaDetalhe from './pages/TurmaDetalhe'; // Alunos de uma turma (/turmas/:slug)
import Galeria from './pages/Galeria';         // Galeria de fotos
import Aulas from './pages/Aulas';             // Cronograma das aulas (datas e instrutores)

/**
 * COMPONENTE APP
 *
 * Função principal que retorna a estrutura de rotas do site.
 * Em React, componentes são funções que retornam código HTML/JSX.
 *
 * TypeScript: Usamos React.FC (Functional Component) para tipar o componente
 */
const App: React.FC = () => {
  return (
    // MotionConfig reducedMotion="user": se a pessoa ativou "reduzir movimento"
    // no sistema, o Framer Motion corta os deslocamentos das animações do site
    <MotionConfig reducedMotion="user">
      {/* Router: ativa o sistema de rotas na aplicação */}
      <Router>
        {/* Toda troca de página começa do topo */}
        <RolarAoTopo />

        {/* Routes: container de todas as rotas */}
        <Routes>
          {/*
            Cada Route define:
            - path: URL da página (ex: "/" é a página inicial)
            - element: qual componente será exibido nessa URL
          */}

          {/* Rota da página inicial (/) */}
          <Route path="/" element={<Home />} />

          {/* Rota da página Como Fazemos (/como-fazemos) */}
          <Route path="/como-fazemos" element={<ComoFazemos />} />

          {/* Rota da página Sobre (/sobre) */}
          <Route path="/sobre" element={<Sobre />} />

          {/* Rota da página Hall da Fama (/hall-da-fama) */}
          <Route path="/hall-da-fama" element={<HallDaFama />} />

          {/* Rota da página Material (/material) */}
          <Route path="/material" element={<Material />} />

          {/* Rota da página Reconhecimentos (/reconhecimentos) */}
          <Route path="/reconhecimentos" element={<Reconhecimentos />} />

          {/* Rota da página Contato (/contato) */}
          <Route path="/contato" element={<Contato />} />

          {/* Rota da página Login (/login) - tela sem navbar e sem rodapé */}
          <Route path="/login" element={<Login />} />

          {/* Rota da lista de turmas (/turmas) */}
          <Route path="/turmas" element={<Turmas />} />

          {/* Rota de uma turma específica (/turmas/turma-2025, por exemplo).
              O ":slug" é a parte que muda: TurmaDetalhe lê esse valor da URL. */}
          <Route path="/turmas/:slug" element={<TurmaDetalhe />} />

          {/* Rota da galeria de fotos (/galeria) */}
          <Route path="/galeria" element={<Galeria />} />

          {/* Rota do cronograma das aulas (/aulas) */}
          <Route path="/aulas" element={<Aulas />} />
        </Routes>
      </Router>
    </MotionConfig>
  );
};

// Exporta o componente para ser usado em outros arquivos
export default App;
