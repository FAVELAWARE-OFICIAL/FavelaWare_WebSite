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
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// lazy + Suspense: a página só é baixada quando alguém abre a rota
import { lazy, Suspense, useEffect } from 'react';

// Carregamento com a logo (usado enquanto a área restrita baixa)
import Carregamento from './components/admin/Carregamento';

// MotionConfig: configuração global das animações do Framer Motion
import { MotionConfig } from 'framer-motion';

// Volta a rolagem ao topo sempre que a página (rota) muda
import RolarAoTopo from './components/RolarAoTopo';
import LimiteDeErro from './components/LimiteDeErro';

// Página inicial: carrega junto, porque é a porta de entrada do site
import Home from './pages/Home';

// As demais páginas são baixadas só quando alguém abre a rota (lazy).
// Assim a primeira visita baixa bem menos JavaScript e a Home abre mais rápido.
const ComoFazemos = lazy(() => import('./pages/ComoFazemos')); // Trilhas de ensino
const Sobre = lazy(() => import('./pages/Sobre')); // Sobre o projeto
const HallDaFama = lazy(() => import('./pages/HallDaFama')); // Equipes anteriores
const Reconhecimentos = lazy(() => import('./pages/Reconhecimentos')); // Prêmios
const Contato = lazy(() => import('./pages/Contato')); // Contato
const Login = lazy(() => import('./pages/Login')); // Login (traz o Supabase)
const Turmas = lazy(() => import('./pages/Turmas')); // Lista de turmas
const TurmaDetalhe = lazy(() => import('./pages/TurmaDetalhe')); // Alunos de uma turma (/turmas/:slug)
const Galeria = lazy(() => import('./pages/Galeria')); // Galeria de fotos
const DefinirSenha = lazy(() => import('./pages/DefinirSenha')); // Destino do convite do professor
const PrimeiroAcesso = lazy(() => import('./pages/PrimeiroAcesso')); // Aluno troca a senha padrão
const DadosDoInstrutor = lazy(() => import('./pages/DadosDoInstrutor')); // Dados do RPA, logo após o login
const Perfil = lazy(() => import('./pages/Perfil')); // Meu perfil (foto na barra superior)

// Área administrativa (/dashboard): carregada sob demanda, porque traz a biblioteca
// de gráficos e só interessa a quem faz login como gestor
const LayoutAdmin = lazy(() => import('./pages/admin/LayoutAdmin'));
const VisaoGeral = lazy(() => import('./pages/admin/VisaoGeral'));
const AdminAlunos = lazy(() => import('./pages/admin/Alunos'));
const AdminChamada = lazy(() => import('./pages/admin/Chamada'));
const AdminTurmas = lazy(() => import('./pages/admin/Turmas'));
const AdminEquipe = lazy(() => import('./pages/admin/Equipe'));
const AdminSolicitacoes = lazy(() => import('./pages/admin/Solicitacoes'));
const AdminPresencaProfessores = lazy(() => import('./pages/admin/PresencaProfessores'));

// Material: a mesma página de cadastro serve ao gestor e ao professor
const TrilhasEquipe = lazy(() => import('./pages/equipe/TrilhasEquipe')); // Materiais e atividades, por trilha

// Área do aluno (/aluno)
const LayoutAluno = lazy(() => import('./pages/aluno/LayoutAluno'));
const TrilhasAluno = lazy(() => import('./pages/aluno/TrilhasAluno')); // Materiais e atividades, por trilha

// Área do professor (/professor): também carregada sob demanda
const LayoutProfessor = lazy(() => import('./pages/professor/LayoutProfessor'));
const FazerChamada = lazy(() => import('./pages/professor/FazerChamada'));
const MeuPonto = lazy(() => import('./pages/professor/MeuPonto'));

// Enquanto uma página pública baixa: espaço do tamanho da tela (não faz o rodapé "pular").
// As páginas públicas são baixadas em segundo plano logo depois da primeira visita
// (ver useEffect abaixo), então na prática isto quase nunca aparece.
const carregandoPagina = <div className="min-h-screen" role="status" aria-label="Carregando" />;

// Enquanto a área restrita baixa: o carregamento com a logo, em tela cheia, que
// emenda com o da área (a pintura continua de onde estava, sem tela em branco)
const carregandoArea = (
  <div className="flex min-h-screen bg-gray-100">
    <Carregamento texto="Abrindo a área restrita" />
  </div>
);

// Baixa as páginas públicas quando o navegador está ocioso: trocar de página
// no site fica instantâneo (sem espera nem tela em branco)
const preCarregarSitePublico = () => {
  for (const pagina of [
    () => import('./pages/ComoFazemos'),
    () => import('./pages/Sobre'),
    () => import('./pages/HallDaFama'),
    () => import('./pages/Reconhecimentos'),
    () => import('./pages/Contato'),
    () => import('./pages/Turmas'),
    () => import('./pages/TurmaDetalhe'),
    () => import('./pages/Galeria'),
    () => import('./pages/Login'),
  ])
    pagina();
};

/**
 * COMPONENTE APP
 *
 * Função principal que retorna a estrutura de rotas do site.
 * Em React, componentes são funções que retornam código HTML/JSX.
 *
 * TypeScript: Usamos React.FC (Functional Component) para tipar o componente
 */
const App: React.FC = () => {
  useEffect(() => {
    const ocioso = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1500));
    ocioso(preCarregarSitePublico);
  }, []);

  return (
    // MotionConfig reducedMotion="user": se a pessoa ativou "reduzir movimento"
    // no sistema, o Framer Motion corta os deslocamentos das animações do site
    <MotionConfig reducedMotion="user">
      {/* Router: ativa o sistema de rotas na aplicação */}
      <Router>
        {/* Toda troca de página começa do topo */}
        <RolarAoTopo />

        {/* Suspense: mostra a tela vazia enquanto a página (lazy) é baixada */}
        {/* Página que quebra ao carregar vira uma tela com saída, não uma tela branca */}
        <LimiteDeErro>
          <Suspense fallback={carregandoPagina}>
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

              {/* Material saiu do site: agora é acessado pelo dashboard (depois do login) */}
              <Route path="/material" element={<Navigate to="/login" replace />} />

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

              {/* O cronograma das aulas agora fica dentro de Como Fazemos (endereço antigo) */}
              <Route path="/aulas" element={<Navigate to="/como-fazemos" replace />} />

              {/* Área administrativa (/dashboard) - só gestor. O LayoutAdmin desenha o menu
              lateral e cada rota filha aparece dentro dele, no lugar do <Outlet>. */}
              <Route
                path="/dashboard"
                element={
                  <Suspense fallback={carregandoArea}>
                    <LayoutAdmin />
                  </Suspense>
                }
              >
                <Route index element={<VisaoGeral />} />
                <Route path="alunos" element={<AdminAlunos />} />
                <Route path="chamada" element={<AdminChamada />} />
                <Route path="turmas" element={<AdminTurmas />} />
                <Route path="equipe" element={<AdminEquipe />} />
                <Route path="solicitacoes" element={<AdminSolicitacoes />} />
                <Route path="presenca-professores" element={<AdminPresencaProfessores />} />
                <Route path="trilhas" element={<TrilhasEquipe />} />
                {/* Endereços antigos: material e atividades agora ficam nas trilhas */}
                <Route path="material" element={<Navigate to="/dashboard/trilhas" replace />} />
                <Route path="atividades" element={<Navigate to="/dashboard/trilhas" replace />} />
                <Route path="perfil" element={<Perfil />} />
              </Route>

              {/* Área do professor (/professor) - professor faz a chamada das turmas dele.
              O gestor também entra, para cobrir um professor se precisar. */}
              <Route
                path="/professor"
                element={
                  <Suspense fallback={carregandoArea}>
                    <LayoutProfessor />
                  </Suspense>
                }
              >
                <Route index element={<FazerChamada />} />
                <Route path="ponto" element={<MeuPonto />} />
                <Route path="trilhas" element={<TrilhasEquipe />} />
                {/* Endereços antigos: material e atividades agora ficam nas trilhas */}
                <Route path="atividades" element={<Navigate to="/professor/trilhas" replace />} />
                <Route path="material" element={<Navigate to="/professor/trilhas" replace />} />
                <Route path="perfil" element={<Perfil />} />
              </Route>

              {/* Área do aluno (/aluno) - material das aulas, por trilha */}
              <Route
                path="/aluno"
                element={
                  <Suspense fallback={carregandoArea}>
                    <LayoutAluno />
                  </Suspense>
                }
              >
                <Route index element={<TrilhasAluno />} />
                {/* Endereço antigo: as atividades agora ficam nas trilhas */}
                <Route path="atividades" element={<Navigate to="/aluno" replace />} />
                <Route path="perfil" element={<Perfil />} />
              </Route>

              {/* Primeiro acesso do aluno: troca a senha padrão e completa os dados */}
              <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />
              <Route path="/dados-do-instrutor" element={<DadosDoInstrutor />} />

              {/* Link do convite do professor: ele cria a senha aqui */}
              <Route path="/definir-senha" element={<DefinirSenha />} />
            </Routes>
          </Suspense>
        </LimiteDeErro>
      </Router>
    </MotionConfig>
  );
};

// Exporta o componente para ser usado em outros arquivos
export default App;
