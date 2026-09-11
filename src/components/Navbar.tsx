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
    } else if (location.pathname !== '/') {
      // Em todas as páginas internas: sempre roxo para fazer parte do header
      return 'bg-[#2d2a5f]';
    }
    // Default: roxo
    return 'bg-[#2d2a5f] shadow-lg';
  };

  const menuItems = [
    { name: 'HOME', href: '/', type: 'route' },
    { name: 'COMO FAZEMOS', href: '/como-fazemos', type: 'route' },
    { name: 'SOBRE', href: '/sobre', type: 'route' },
    { name: 'AULAS', href: '/aulas', type: 'route' },
    { name: 'MATERIAL', href: '/material', type: 'route' },
    { name: 'TURMAS', href: '/turmas', type: 'route' },
    { name: 'GALERIA', href: '/galeria', type: 'route' },
    { name: 'RECONHECIMENTOS', href: '/reconhecimentos', type: 'route' },
    { name: 'CONTATO', href: '/contato', type: 'route' },
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
              // Quem recebe o foco é o Link. Sem tabIndex, o framer-motion põe
              // tabindex=0 em quem tem whileTap e o link vira duas paradas de Tab.
              tabIndex={-1}
            >
              <div className="text-2xl font-bold text-white">
                FavelaWare
              </div>
            </motion.div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden xl:flex items-center space-x-1">
            {menuItems.map((item, index) => (
              item.type === 'route' ? (
                <Link key={item.name} to={item.href} className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2d2a5f]">
                  <motion.div
                    className="relative px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors group"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    tabIndex={-1} // o foco fica no Link (ver o comentário do logo)
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

            {/* Botão de acesso à área restrita.
                Fica destacado (e não como mais um item da lista) porque é uma
                ação, não uma página de conteúdo do site.
                Na home sem rolagem a barra é transparente sobre o hero verde:
                ali o botão fica roxo para não sumir no fundo; com a barra roxa,
                verde. */}
            <Link to="/login" aria-label="Entrar na área restrita" className="ml-4 group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2d2a5f]">
              <motion.div
                className={`w-11 h-11 flex items-center justify-center rounded-full shadow-lg ring-2 ring-white/30 group-hover:ring-white transition-all ${
                  location.pathname === '/' && !isScrolled
                    ? 'bg-[#2d2a5f] text-white'
                    : 'bg-[#8bc53f] text-[#2d2a5f] group-hover:bg-[#7ab52f]'
                }`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: menuItems.length * 0.05, type: 'spring', stiffness: 260, damping: 18 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                tabIndex={-1} // o foco fica no Link (ver o comentário do logo)
              >
                {/* Ícone de pessoa: é o símbolo usual de "sua conta" */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </motion.div>

              {/* Rótulo que aparece ao passar o mouse, para o ícone não virar adivinhação */}
              <span className="pointer-events-none absolute top-full right-0 mt-2 px-3 py-1.5 rounded-lg bg-[#2d2a5f] text-white text-xs font-bold whitespace-nowrap shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                LOGIN
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="xl:hidden relative w-10 h-10 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2d2a5f] rounded-lg"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            // O botão só tem ícone: o rótulo e o estado aberto/fechado são
            // o que o leitor de tela anuncia
            aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="menu-mobile"
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
            id="menu-mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden bg-[#2d2a5f]/95 backdrop-blur-lg border-t border-white/10"
          >
            <div className="px-4 py-6">
              {menuItems.map((item, index) => (
                item.type === 'route' ? (
                  <Link key={item.name} to={item.href} onClick={() => setIsMobileMenuOpen(false)} className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2d2a5f]">
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

              {/* Mesmo acesso à área restrita, agora no menu do celular */}
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <motion.div
                  className="block mt-2 px-4 py-3 bg-[#8bc53f] hover:bg-[#7ab52f] text-[#2d2a5f] font-bold text-center rounded-lg transition-all"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: menuItems.length * 0.05 }}
                >
                  LOGIN
                </motion.div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
