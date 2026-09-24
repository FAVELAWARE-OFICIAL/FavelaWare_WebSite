/**
 * ============================================
 * COMPONENTE HERO (SEÇÃO PRINCIPAL DA HOME)
 * ============================================
 *
 * Este é o primeiro conteúdo que aparece na página inicial.
 * Contém o logo, título, descrição e botão principal do projeto.
 *
 * Funcionalidades:
 * - Animações de entrada dos elementos
 * - Logo com animação de flutuação
 * - Botão com efeito hover interativo
 * - Estatísticas do projeto (alunos, turmas, edições)
 */

// Importa ferramentas de animação
import { motion } from 'framer-motion';

// Link do React Router que aceita animações do Framer Motion
import { MotionLink } from './MotionLink';

const Hero = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#8bc53f]"
      style={{
        // Banner oficial do FavelaWare (foto da comunidade + código binário).
        // Sem blend com gradiente: o blend "overlay" lavava a imagem e sumia com a textura.
        backgroundImage: "url('/imgs/backgrounds/fundo.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Véu escuro por cima do banner.
          O texto do hero é branco e o banner tem trechos bem claros; sem este
          véu o título fica ilegível. Escurece o suficiente para o contraste
          sem apagar a foto e o código binário. */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d2a5f]/45 via-[#2d2a5f]/25 to-[#2d2a5f]/50" />

      {/* Padrão de código no fundo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Gradiente animado de borda */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-gradient-x" />

      {/* Conteúdo Principal */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Logo e Animação */}
          <motion.div
            className="flex justify-center lg:justify-start"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="relative"
              animate={{
                y: [0, -20, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Logo do FavelaWare */}
              <motion.img
                src="/imgs/logo/logo.png"
                alt="FavelaWare Logo"
                className="w-80 h-80 object-contain"
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </motion.div>
          </motion.div>

          {/* Texto e CTA */}
          <div className="text-center lg:text-left space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.h1
                className="text-5xl md:text-7xl font-black text-white mb-4 leading-tight"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                CONHEÇA NOSSO
                <br />
                <span className="text-[#2d2a5f]">PROJETO</span>
              </motion.h1>
            </motion.div>

            <motion.p
              className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto lg:mx-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Formação de jovens programadores vindos de comunidades de Belo Horizonte/MG.
              <span className="block mt-2 font-semibold">
                Capacitação em hard skills e soft skills através da tecnologia.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              {/* Hover por variants, sem useState: re-renderizar o Hero no hover
                  dá um ref novo ao Link e o Framer Motion perde o hover.
                  O link repassa "repouso"/"hover" para a faixa colorida. */}
              <MotionLink
                to="/sobre"
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-[#2d2a5f] text-white font-bold text-lg rounded-full overflow-hidden shadow-2xl"
                initial="repouso"
                animate="repouso"
                whileHover="hover"
                whileTap={{ scale: 0.95 }}
                variants={{ repouso: { scale: 1 }, hover: { scale: 1.05 } }}
              >
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-[#ec4899] via-[#d946ef] to-[#ec4899]"
                  variants={{ repouso: { x: '-100%' }, hover: { x: '0%' } }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
                <span className="relative z-10">SAIBA MAIS</span>
                <svg
                  className="relative z-10 w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </MotionLink>
            </motion.div>

            {/* Stats com animação */}
            <motion.div
              className="grid grid-cols-3 gap-4 pt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              {[
                { number: '150+', label: 'Alunos' },
                { number: '5+', label: 'Turmas' },
                { number: '3', label: 'Edições' },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20"
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0)' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + index * 0.1 }}
                >
                  <div className="text-3xl md:text-4xl font-black text-white">{stat.number}</div>
                  <div className="text-sm md:text-base text-white/80 font-semibold">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
