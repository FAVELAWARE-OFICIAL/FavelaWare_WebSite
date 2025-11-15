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
 * 3. Gallery - Galeria de fotos
 * 4. Partners - Parceiros e idealizadores
 * 5. Footer - Rodapé com informações de contato
 */

// Importa todos os componentes que formam a página inicial
import Navbar from '../components/Navbar';   // Barra de navegação
import Hero from '../components/Hero';       // Seção principal/banner
import Gallery from '../components/Gallery'; // Galeria de imagens
import Partners from '../components/Partners'; // Parceiros do projeto
import Footer from '../components/Footer';   // Rodapé

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Gallery />
      <Partners />
      <Footer />
    </div>
  );
};

export default Home;
