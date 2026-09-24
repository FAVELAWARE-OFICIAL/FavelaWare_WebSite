/**
 * ============================================
 * PÁGINA HOME (PÁGINA INICIAL)
 * ============================================
 *
 * Esta é a página principal do site FavelaWare.
 * Combina vários componentes para criar a experiência inicial.
 *
 * Estrutura da página (de cima para baixo):
 * 1. Navbar - Barra de navegação
 * 2. Hero - Seção principal com logo e título
 * 3. GaleriaInicial - Galeria de fotos
 * 4. Parceiros - Parceiros e idealizadores
 * 5. Footer - Rodapé com informações de contato
 */

// Importa todos os componentes que formam a página inicial
import Navbar from '../components/Navbar'; // Barra de navegação
import Hero from '../components/Hero'; // Seção principal/banner
import GaleriaInicial from '../components/GaleriaInicial'; // Galeria de imagens
import Parceiros from '../components/Parceiros'; // Parceiros do projeto
import Footer from '../components/Footer'; // Rodapé

/**
 * COMPONENTE HOME (TypeScript)
 * React.FC indica que é um Functional Component
 * Não recebe props, então não precisamos definir interface
 */
const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <GaleriaInicial />
      <Parceiros />
      <Footer />
    </div>
  );
};

export default Home;
