/**
 * ============================================
 * COMPONENTE PARTNERS (IDEALIZADORES)
 * ============================================
 *
 * Exibe os parceiros e idealizadores do projeto.
 *
 * Funcionalidades:
 * - Grid de logos dos parceiros
 * - Animações escalonadas (aparecem um de cada vez)
 * - Efeito hover em cada card
 * - Fallback para emojis caso a imagem não carregue
 */

// Importa ferramentas de animação
import { motion, type Variants } from 'framer-motion';
// Importa tipos customizados
import type { Partner } from '../types';

/**
 * COMPONENTE PARTNERS (TypeScript)
 * React.FC indica que é um Functional Component
 */
const Partners: React.FC = () => {
  // Logos dos parceiros - array tipado com interface Partner
  const partners: Partner[] = [
    { name: 'Mundiale', logo: '🌍', image: '/imgs/partners/Mundiale.webp' },
    { name: 'Ânima Lab', logo: '🎨', image: '/imgs/partners/ânima.webp' },
    { name: 'AOPA', logo: '👥', image: '/imgs/partners/AOPA.webp' },
    { name: 'Rede Transformar', logo: '🔄', image: '/imgs/partners/Rede Transformar.webp' },
    { name: 'Ecossistema Ânima', logo: '🌱', image: '/imgs/partners/ecossistema ânima.webp' },
    { name: 'UNA Cristiano Machado', logo: '🎓', image: '/imgs/partners/Una Cristiano Machado.webp' },
  ].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })); // sempre em ordem alfabética

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.5, rotate: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
      },
    },
  };

  return (
    <section
      id="reconhecimentos"
      className="relative py-20 bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-72 h-72 bg-favela-green-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-favela-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-favela-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.h2
            className="text-5xl md:text-6xl font-black mb-6"
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-gradient from-favela-green-500 via-favela-blue-500 to-favela-green-500">
              IDEALIZADORES
            </span>
          </motion.h2>
          <motion.div
            className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 mx-auto rounded-full"
            initial={{ width: 0 }}
            whileInView={{ width: 96 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
          <motion.p
            className="mt-6 text-xl text-gray-700 max-w-3xl mx-auto font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Parceiros que acreditam e apoiam nossa missão de transformar vidas através da tecnologia
          </motion.p>
        </motion.div>

        {/* Partners Grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {partners.map((partner, index) => (
            <motion.div key={index} variants={itemVariants} className="group relative">
              {/* Card */}
              <div className="relative aspect-square bg-white rounded-3xl p-6 flex flex-col items-center justify-center shadow-lg border-2 border-gray-200 group-hover:border-favela-green-500 transition-all duration-300">
                {/* Logo */}
                <div className="relative z-10 w-20 h-20 mb-4 flex items-center justify-center">
                  {partner.image ? (
                    <img
                      src={partner.image}
                      alt={partner.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Se a imagem não carregar, mostra o emoji
                        const imagem = e.currentTarget;
                        const moldura = imagem.parentElement;
                        imagem.style.display = 'none';
                        if (!moldura) return;
                        moldura.classList.add('text-6xl');
                        moldura.innerHTML = partner.logo;
                      }}
                    />
                  ) : (
                    <span className="text-6xl">{partner.logo}</span>
                  )}
                </div>

                {/* Name */}
                <p className="relative z-10 text-sm font-bold text-gray-800 text-center group-hover:text-favela-green-600 transition-colors duration-300">
                  {partner.name}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Partners;
