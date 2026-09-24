/**
 * ============================================
 * PÁGINA GALERIA
 * ============================================
 *
 * Mostra as fotos dos eventos, aulas e premiações do FavelaWare,
 * separadas por edição (da mais recente para a mais antiga).
 *
 * Clicar numa foto abre ela em tela cheia (componente Lightbox).
 *
 * Conceitos importantes:
 * - useState: guarda qual foto está aberta em tela cheia (null = nenhuma)
 */

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Lightbox, { type FotoLightbox } from '../components/Lightbox';

import { edicaoAtual, primeiraEdicao, segundaEdicao, type FotoDaGaleria } from '../data/galeria';

const Galeria: React.FC = () => {
  // ============================================
  // ESTADO DO LIGHTBOX
  // ============================================

  // Foto aberta em tela cheia. null significa "nenhuma aberta".
  const [fotoAberta, setFotoAberta] = useState<FotoLightbox | null>(null);

  // useCallback mantém a mesma função entre renders: o Lightbox usa aoFechar
  // como dependência do useEffect da tecla Esc
  const fecharFoto = useCallback(() => setFotoAberta(null), []);

  // ============================================
  // ANIMAÇÕES
  // ============================================

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.05 } },
  };

  /** Desenha uma grade de fotos clicáveis. */
  const grade = (fotos: FotoDaGaleria[]) => (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {fotos.map((foto) => (
        <motion.button
          key={foto.arquivo}
          variants={fadeInUp}
          whileHover={{ scale: 1.03, y: -5 }}
          onClick={() => setFotoAberta({ src: `/imgs/gallery/${foto.arquivo}`, legenda: foto.legenda })}
          className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg focus:outline-none focus:ring-4 focus:ring-favela-green-500"
        >
          <img
            src={`/imgs/gallery/${foto.arquivo}`}
            alt={foto.legenda}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />

          {/* Legenda: sempre visível no celular (não há mouse); do md para cima aparece no hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2d2a5f]/90 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <span className="text-white font-bold text-left">{foto.legenda}</span>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      {/* Header da página */}
      <div className="bg-[#2d2a5f] pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">GALERIA</h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">Momentos especiais do FavelaWare</p>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.section {...fadeInUp} className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">3ª Edição</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 rounded-full mb-8" />
          {grade(edicaoAtual)}
        </motion.section>

        <motion.section {...fadeInUp} className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">2ª Edição</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 rounded-full mb-8" />
          {grade(segundaEdicao)}
        </motion.section>

        <motion.section {...fadeInUp} className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">1ª Edição</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 rounded-full mb-8" />
          {grade(primeiraEdicao)}
        </motion.section>
      </div>

      {/* Lightbox: a foto em tela cheia */}
      <Lightbox foto={fotoAberta} aoFechar={fecharFoto} />

      <Footer />
    </div>
  );
};

export default Galeria;
