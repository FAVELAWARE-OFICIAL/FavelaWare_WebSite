/**
 * ============================================
 * COMPONENTE GALLERY (GALERIA DE FOTOS)
 * ============================================
 *
 * Exibe uma galeria de fotos do projeto FavelaWare.
 *
 * Funcionalidades:
 * - Grid de fotos responsivo
 * - Informações aparecem ao passar o mouse
 * - Animações de entrada
 * - Categorização das imagens
 */

// Importa ferramentas de animação
import { motion } from 'framer-motion';
// Link do React Router que aceita animações do Framer Motion
import { MotionLink } from './MotionLink';
// Importa tipos customizados
import type { Photo } from '../types';

/**
 * COMPONENTE GALLERY (TypeScript)
 * React.FC indica que é um Functional Component
 */
const Gallery: React.FC = () => {
  // Galeria de fotos - array tipado com interface Photo
  const photos: Photo[] = [
    {
      id: 1,
      title: 'Abertura do Projeto 2022',
      description: 'Abertura do projeto com a professora Samara, Rafaela, Tatiana e Iracema, os parceiros da Mundiale, das Obras Pavonianas e alunos',
      category: 'Evento',
      image: '/imgs/gallery/AberturaDoProjeto2022.jpg',
    },
    {
      id: 2,
      title: 'Formatura 2022',
      description: 'Formatura do projeto FavelaWare na Mundiale - 2022',
      category: 'Formatura',
      image: '/imgs/gallery/Formatura2022.jpg',
    },
  ];

  return (
    <section id="galeria" className="relative py-20 bg-gradient-to-br from-white via-gray-50 to-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-favela-green-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-favela-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-gradient from-favela-green-500 via-favela-blue-500 to-favela-green-500 text-4xl md:text-6xl font-black mb-4">
            Galeria
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Momentos especiais do <span className="font-bold text-favela-green-500">FavelaWare</span>
          </p>
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {photos.map((photo) => (
            <motion.div
              key={photo.id}
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {/* Card Container - SEM ANIMAÇÕES */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white border-2 border-gray-200 group-hover:border-favela-green-500 transition-colors duration-300 shadow-lg">
                {/* Imagem da galeria - SEM ANIMAÇÕES */}
                <img
                  src={photo.image}
                  alt={photo.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Overlay com informações.
                    No celular não existe hover, então a legenda fica sempre visível;
                    a partir do md ela só aparece ao passar o mouse. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 flex flex-col justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                  {/* Category Badge */}
                  <span className="inline-block w-fit px-3 py-1 mb-3 text-xs font-bold bg-favela-green-500 text-white rounded-full">
                    {photo.category}
                  </span>

                  <h3 className="text-xl font-bold text-white mb-2">
                    {photo.title}
                  </h3>

                  <p className="text-sm text-gray-300">
                    {photo.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <MotionLink
            to="/galeria"
            className="group relative inline-block px-8 py-4 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 text-white font-bold text-lg rounded-full overflow-hidden shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10 flex items-center gap-2">
              Ver Mais Fotos
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </MotionLink>
        </motion.div>
      </div>
    </section>
  );
};

export default Gallery;
