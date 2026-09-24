/**
 * ============================================
 * COMPONENTE FOOTER (RODAPÉ)
 * ============================================
 *
 * Rodapé do site com informações de contato e links.
 *
 * Funcionalidades:
 * - Links para redes sociais
 * - Menu de navegação rápida
 * - Informações de contato
 * - Animações ao aparecer na tela
 */

// memo: o rodapé não recebe props, então não precisa re-renderizar junto com a página
import { memo } from 'react';

// Importa ferramentas de animação
import { motion } from 'framer-motion';

// E-mail oficial (fonte única em src/data/contato.ts)
import { email } from '../data/contato';

// Link do React Router que aceita animações do Framer Motion
import { MotionLink } from './MotionLink';

// Botões do Instagram e do e-mail
import { LinksRedesSociais } from './RedesSociais';

// Links rápidos: nome exibido e rota da página (mesmas rotas da Navbar)
const linksRapidos = [
  { nome: 'Sobre', rota: '/sobre' },
  { nome: 'Como fazemos', rota: '/como-fazemos' },
  { nome: 'Galeria', rota: '/galeria' },
  { nome: 'Contato', rota: '/contato' },
];

// Anel de foco para quem navega pelo teclado (Tab)
const anelDeFoco = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8bc53f] rounded';

const Footer = () => {
  return (
    <footer className="relative bg-[#2d2a5f] border-t-4 border-[#8bc53f] overflow-hidden">
      {/* Code pattern background */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)
          `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h3 className="text-3xl font-black">
              <span className="text-gradient from-favela-green-500 via-favela-blue-500 to-favela-green-500">
                FavelaWare
              </span>
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Uma iniciativa voltada para a formação de jovens programadores vindos de comunidades de Belo Horizonte/MG,
              focada na capacitação de hard skills e soft skills.
            </p>

            {/* Social Links */}
            <div className="pt-4">
              <LinksRedesSociais fundo="roxo" />
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-4"
          >
            <h4 className="text-xl font-bold text-white mb-6 relative inline-block">
              Links Rápidos
              <motion.span
                className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-favela-green-500 to-transparent rounded-full"
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </h4>
            <nav className="space-y-2">
              {linksRapidos.map((link, index) => (
                <MotionLink
                  key={link.nome}
                  to={link.rota}
                  className={`block text-white/80 hover:text-favela-green-400 transition-colors group ${anelDeFoco}`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ x: 10 }}
                >
                  <span className="flex items-center gap-2">
                    <motion.span className="w-0 h-0.5 bg-favela-green-400 group-hover:w-4 transition-all duration-300" />
                    {link.nome}
                  </span>
                </MotionLink>
              ))}
            </nav>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            <h4 className="text-xl font-bold text-white mb-6 relative inline-block">
              Contato
              <motion.span
                className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-favela-blue-500 to-transparent rounded-full"
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.4 }}
              />
            </h4>
            <div className="space-y-3 text-white/80 text-sm">
              {/* Cards só informativos: sem efeito de hover, para não parecerem
                  clicáveis. Quem reage ao mouse é o link do e-mail. */}
              <div className="flex items-start gap-3 p-3">
                <span className="text-xl">📍</span>
                <div>
                  <p className="font-semibold text-white">Localização</p>
                  <p>Belo Horizonte/MG</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3">
                <span className="text-xl">✉️</span>
                <div>
                  <p className="font-semibold text-white">Email</p>
                  <a href={`mailto:${email}`} className={`hover:text-favela-green-400 transition-colors ${anelDeFoco}`}>
                    {email}
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <motion.div
          className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-8"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        />

        {/* Bottom Bar */}
        <motion.div
          className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/80"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p>© 2024 FavelaWare. Todos os direitos reservados.</p>

          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <span>Feito com</span>
            <span className="text-red-500 text-lg">❤️</span>
            <span>para as comunidades</span>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
};

export default memo(Footer);
