/**
 * ============================================
 * PÁGINA RECONHECIMENTOS
 * ============================================
 *
 * Esta página exibe os reconhecimentos do projeto:
 * 1. Artigos Científicos publicados
 * 2. Prêmios e reconhecimentos recebidos
 *
 * Estrutura:
 * - Header com título
 * - Seção de artigos científicos
 * - Seção de prêmios com galeria de fotos
 *
 * Conceitos importantes:
 * - map(): percorre arrays para criar elementos
 * - Framer Motion: animações de entrada
 * - Grid responsivo: adapta layout para mobile/desktop
 */

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Lightbox, { type FotoLightbox } from '../components/Lightbox';
import type { ArtigoCientifico, Premio } from '../types';

/**
 * COMPONENTE RECONHECIMENTOS
 * Mostra artigos científicos e prêmios do projeto
 */
const Reconhecimentos: React.FC = () => {
  // ============================================
  // ESTADOS DO COMPONENTE
  // ============================================

  // Estado para controlar qual imagem está ampliada (lightbox)
  const [imagemAmpliada, setImagemAmpliada] = useState<FotoLightbox | null>(null);

  // useCallback mantém a mesma função entre renders: o Lightbox usa aoFechar
  // como dependência do useEffect da tecla Esc
  const fecharImagem = useCallback(() => setImagemAmpliada(null), []);

  // ============================================
  // DADOS DOS ARTIGOS CIENTÍFICOS
  // ============================================

  const artigos: ArtigoCientifico[] = [
    {
      id: 1,
      titulo:
        'Extension Project Based on Flipped Classroom to the Development of Hard and Soft Skills in Brazilian Outskirts: Case studies',
      descricao:
        'Artigo científico sobre o projeto de extensão baseado em sala de aula invertida para o desenvolvimento de habilidades técnicas e comportamentais em comunidades brasileiras.',
      doi: 'https://doi.org/10.33422/ijsfle.v2i2.464',
      ano: '2024',
      icone: '📄',
    },
  ];

  // ============================================
  // DADOS DOS PRÊMIOS
  // ============================================

  const premios: Premio[] = [
    {
      id: 1,
      titulo: 'Prêmio Ser Humano 2023',
      descricao:
        'Reconhecimento pela ABRH-Brasil pelo impacto social e desenvolvimento humano através da capacitação de jovens programadores em comunidades de Belo Horizonte/MG.',
      ano: '2023',
      link: 'https://www.abrhbrasil.org.br/psh/',
      imagens: [
        '/imgs/gallery/premiacao-01.webp',
        '/imgs/gallery/premiacao-02.webp',
        '/imgs/gallery/premiacao-03.webp',
      ],
      icone: '🏆',
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
        staggerChildren: 0.15,
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
            {/* text-3xl no celular: "RECONHECIMENTOS" é uma palavra só e, em
                text-4xl, passava da largura da tela (rolagem lateral) */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">RECONHECIMENTOS</h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Artigos científicos e prêmios que destacam nosso impacto social
            </p>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* ============================================
            SEÇÃO 1: ARTIGOS CIENTÍFICOS
            ============================================ */}
        <motion.section {...fadeInUp} className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">📚 Artigo Científico</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Publicações acadêmicas sobre nossa metodologia e resultados
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 gap-8 max-w-4xl mx-auto"
          >
            {artigos.map((artigo) => (
              <motion.div
                key={artigo.id}
                variants={fadeInUp}
                whileHover={{ scale: 1.02, y: -5 }}
                className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-favela-green-500 transition-all duration-300"
              >
                <div className="flex items-start space-x-6">
                  {/* Ícone ilustrativo */}
                  <div className="hidden md:block">
                    <div className="w-32 h-32 bg-gradient-to-br from-favela-green-100 to-gray-100 rounded-xl flex items-center justify-center text-6xl">
                      {artigo.icone}
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {artigo.ano}
                      </span>
                      <span className="md:hidden text-3xl">{artigo.icone}</span>
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-4">{artigo.titulo}</h3>

                    <p className="text-gray-600 mb-6 leading-relaxed">{artigo.descricao}</p>

                    <motion.a
                      href={artigo.doi}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-favela-green-600 to-favela-blue-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      <span>Acessar Artigo</span>
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ============================================
            SEÇÃO 2: PRÊMIOS
            ============================================ */}
        <motion.section {...fadeInUp} transition={{ delay: 0.3 }}>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">🏆 Prêmio Ser Humano 2023</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Reconhecimentos que validam nosso compromisso social
            </p>
          </div>

          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-12">
            {premios.map((premio) => (
              <motion.div
                key={premio.id}
                variants={fadeInUp}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-xl p-8 md:p-12"
              >
                {/* Informações do Prêmio */}
                <div className="mb-8">
                  <div className="flex items-center space-x-4 mb-4">
                    <span className="text-6xl">{premio.icone}</span>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">{premio.titulo}</h3>
                      <span className="px-4 py-1 bg-orange-200 text-orange-800 rounded-full text-sm font-bold">
                        {premio.ano}
                      </span>
                    </div>
                  </div>

                  <p className="text-lg text-gray-700 leading-relaxed mb-6">{premio.descricao}</p>

                  {premio.link && (
                    <motion.a
                      href={premio.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      <span>Saiba Mais</span>
                    </motion.a>
                  )}
                </div>

                {/* Galeria de Fotos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {premio.imagens.map((imagem, index) => (
                    <motion.button
                      key={index}
                      type="button"
                      aria-label={`Ampliar foto ${index + 1} do ${premio.titulo}`}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-lg cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 focus-visible:ring-offset-2"
                      onClick={() =>
                        setImagemAmpliada({ src: imagem, legenda: `${premio.titulo} - Foto ${index + 1}` })
                      }
                    >
                      <img
                        src={imagem}
                        alt={`${premio.titulo} - Foto ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />

                      {/* Overlay ao passar o mouse */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg font-bold">
                          🔍 Ver ampliado
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </div>

      {/* ============================================
          MODAL DE IMAGEM AMPLIADA
          ============================================ */}
      <Lightbox foto={imagemAmpliada} aoFechar={fecharImagem} />

      <Footer />
    </div>
  );
};

export default Reconhecimentos;
