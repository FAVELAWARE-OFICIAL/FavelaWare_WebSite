import { motion } from 'framer-motion';

const Footer = () => {
  const socialLinks = [
    {
      name: 'Instagram',
      icon: '📷',
      href: '#',
      color: 'from-favela-green-500 to-favela-blue-500',
    },
    {
      name: 'Email',
      icon: '📧',
      href: 'mailto:contato@favelaware.com',
      color: 'from-favela-blue-500 to-favela-green-500',
    },
  ];

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-favela-green-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-favela-blue-500/20 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Code pattern background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)
          `,
          backgroundSize: '40px 40px'
        }} />
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
            <motion.h3
              className="text-3xl font-black"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-gradient from-favela-green-500 via-favela-blue-500 to-favela-green-500">
                FavelaWare
              </span>
            </motion.h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Uma iniciativa voltada para a formação de jovens programadores vindos de comunidades de Belo Horizonte/MG,
              focada na capacitação de hard skills e soft skills.
            </p>

            {/* Social Links */}
            <div className="flex gap-4 pt-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  className={`group relative w-12 h-12 bg-gradient-to-br ${social.color} rounded-full flex items-center justify-center shadow-lg`}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: 'spring' }}
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="text-2xl">{social.icon}</span>

                  {/* Glow effect */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${social.color} rounded-full blur-lg opacity-0 group-hover:opacity-70 transition-opacity`}
                  />
                </motion.a>
              ))}
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
              {['Sobre', 'Aulas', 'Material', 'Galeria', 'Contato'].map((link, index) => (
                <motion.a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className="block text-gray-300 hover:text-favela-green-400 transition-colors group"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ x: 10 }}
                >
                  <span className="flex items-center gap-2">
                    <motion.span
                      className="w-0 h-0.5 bg-favela-green-400 group-hover:w-4 transition-all duration-300"
                    />
                    {link}
                  </span>
                </motion.a>
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
            <div className="space-y-3 text-gray-300 text-sm">
              <motion.div
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ x: 5 }}
              >
                <span className="text-xl">📍</span>
                <div>
                  <p className="font-semibold text-white">Localização</p>
                  <p>Belo Horizonte/MG</p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ x: 5 }}
              >
                <span className="text-xl">✉️</span>
                <div>
                  <p className="font-semibold text-white">Email</p>
                  <a href="mailto:contato@favelaware.com" className="hover:text-favela-green-400 transition-colors">
                    contato@favelaware.com
                  </a>
                </div>
              </motion.div>
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
          className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.p
            whileHover={{ scale: 1.05 }}
          >
            © 2024 FavelaWare. Todos os direitos reservados.
          </motion.p>

          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <span>Feito com</span>
            <motion.span
              className="text-red-500 text-lg"
              animate={{
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              ❤️
            </motion.span>
            <span>para as comunidades</span>
          </motion.div>
        </motion.div>

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-favela-green-500/30 rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
