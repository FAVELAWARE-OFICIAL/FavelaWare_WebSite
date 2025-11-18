/**
 * ============================================
 * COMPONENTE NAVBAR (BARRA DE NAVEGAÇÃO)
 * ============================================
 *
 * Este componente cria a barra de navegação do topo do site.
 *
 * Funcionalidades:
 * - Menu responsivo (adapta para desktop e mobile)
 * - Mudança de cor ao rolar a página
 * - Animações suaves ao aparecer
 * - Menu hambúrguer para dispositivos móveis
 *
 * Estados (informações que mudam):
 * - isMobileMenuOpen: controla se o menu mobile está aberto/fechado
 * - isScrolled: detecta se a página foi rolada (para mudar cor do navbar)
 *
 * Hooks do React usados:
 * - useState: cria variáveis que podem mudar e atualizar a tela
 * - useEffect: executa código quando o componente aparece na tela
 * - useLocation: detecta em qual página estamos
 */

// Importa ferramentas do React para criar estados e efeitos
import { useState, useEffect } from 'react';

// Importa ferramentas de animação do Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Importa ferramentas de navegação do React Router
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determina a cor de fundo baseado na rota e scroll
  const getNavbarBg = () => {
    if (location.pathname === '/') {
      // Na home: começa com o fundo verde do hero, muda para roxo ao scroll
      return isScrolled
        ? 'bg-[#2d2a5f] shadow-lg'
        : 'bg-transparent';
    } else if (location.pathname === '/como-fazemos' || location.pathname === '/sobre' || location.pathname === '/hall-da-fama') {
      // Em como fazemos, sobre e hall da fama: sempre roxo para fazer parte do header
      return 'bg-[#2d2a5f]';
    }
    // Default: roxo
    return 'bg-[#2d2a5f] shadow-lg';
  };

  const menuItems = [
    { name: 'HOME', href: '/', type: 'route' },
    { name: 'COMO FAZEMOS', href: '/como-fazemos', type: 'route' },
    { name: 'SOBRE', href: '/sobre', type: 'route' },
    { name: 'AULAS', href: '#aulas', type: 'anchor' },
    { name: 'MATERIAL', href: '#material', type: 'anchor' },
    { name: 'TURMAS', href: '#turmas', type: 'anchor' },
    { name: 'GALERIA', href: '#galeria', type: 'anchor' },
    { name: 'RECONHECIMENTOS', href: '#reconhecimentos', type: 'anchor' },
    { name: 'CONTATO', href: '#contato', type: 'anchor' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${getNavbarBg()}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/">
            <motion.div
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-2xl font-bold text-white">
                FavelaWare
              </div>
            </motion.div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-1">
            {menuItems.map((item, index) => (
              item.type === 'route' ? (
                <Link key={item.name} to={item.href}>
                  <motion.div
                    className="relative px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors group"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {item.name}
                    <motion.span
                      className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 group-hover:w-full transition-all duration-300"
                    />
                  </motion.div>
                </Link>
              ) : (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className="relative px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors group"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.name}
                  <motion.span
                    className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 group-hover:w-full transition-all duration-300"
                  />
                </motion.a>
              )
            ))}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="lg:hidden relative w-10 h-10 text-white focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
          >
            <div className="absolute inset-0 flex flex-col justify-center items-center space-y-1.5">
              <motion.span
                className="block w-6 h-0.5 bg-white rounded-full"
                animate={isMobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              />
              <motion.span
                className="block w-6 h-0.5 bg-white rounded-full"
                animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
              />
              <motion.span
                className="block w-6 h-0.5 bg-white rounded-full"
                animate={isMobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              />
            </div>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#2d2a5f]/98 backdrop-blur-lg border-t border-white/10"
          >
            <div className="px-4 py-6 space-y-3">
              {menuItems.map((item, index) => (
                item.type === 'route' ? (
                  <Link key={item.name} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <motion.div
                      className="block px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 10 }}
                    >
                      {item.name}
                    </motion.div>
                  </Link>
                ) : (
                  <motion.a
                    key={item.name}
                    href={item.href}
                    className="block px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    whileHover={{ x: 10 }}
                  >
                    {item.name}
                  </motion.a>
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
