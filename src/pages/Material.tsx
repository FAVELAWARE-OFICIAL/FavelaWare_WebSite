/**
 * ============================================
 * PÁGINA MATERIAL
 * ============================================
 *
 * Esta página dá acesso aos materiais educacionais do curso
 * (Google Drive e GitBook).
 *
 * Conceitos importantes:
 * - map(): percorre a lista de materiais e cria um card para cada um
 * - Links externos abrem em nova aba com rel="noopener noreferrer"
 */

import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import type { Material } from '../types';

/**
 * COMPONENTE MATERIAL
 * Página com os materiais do curso
 */
const Material: React.FC = () => {
  // ============================================
  // DADOS DOS MATERIAIS DISPONÍVEIS
  // ============================================

  const materiais: Material[] = [
    {
      id: 1,
      titulo: 'FavelaWare - 3ª Edição',
      descricao: 'Materiais completos da terceira edição do curso',
      plataforma: 'drive',
      link: 'https://drive.google.com/drive/folders/1S4jR80qAN6IAeQv-HlzOxzyv1_-FA4hs?usp=sharing',
      icone: '📁',
    },
    {
      id: 2,
      titulo: 'Documentação GitBook',
      descricao: 'Documentação técnica e tutoriais interativos',
      plataforma: 'gitbook',
      link: 'https://favelaware.gitbook.io/favelaware/',
      icone: '📚',
    },
  ];

  // ============================================
  // ANIMAÇÕES
  // ============================================

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  // ============================================
  // RENDERIZAÇÃO DO COMPONENTE
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      {/* Header da Página */}
      <div className="bg-[#2d2a5f] pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              MATERIAIS
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Acesse os materiais do curso
            </p>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ============================================
            MATERIAIS DISPONÍVEIS
            ============================================ */}
        <motion.section {...fadeInUp}>
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            📚 Materiais Disponíveis
          </h2>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          >
            {materiais.map((material) => (
              <motion.a
                key={material.id}
                href={material.link}
                target="_blank"
                rel="noopener noreferrer"
                variants={fadeInUp}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-favela-green-500 transition-all duration-300"
              >
                <div className="flex items-start space-x-4">
                  <div className="text-5xl">{material.icone}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {material.titulo}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {material.descricao}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        material.plataforma === 'drive'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {material.plataforma === 'drive' ? 'Google Drive' : 'GitBook'}
                      </span>
                      <span className="text-favela-green-600 font-medium">
                        Acessar
                      </span>
                    </div>
                  </div>
                </div>
              </motion.a>
            ))}
          </motion.div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
};

export default Material;
