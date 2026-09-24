/**
 * ============================================
 * PÁGINA CONTATO
 * ============================================
 *
 * Esta página exibe informações de contato do projeto:
 * 1. Email
 * 2. Telefone (Obras Pavonianas)
 * 3. Endereço com mapa integrado
 *
 * Estrutura:
 * - Header com título
 * - Cards de informações de contato
 * - Mapa do Google Maps embedado
 *
 * Conceitos importantes:
 * - iframe: permite incorporar conteúdo externo (Google Maps)
 * - Links mailto: e tel: para abrir apps de email e telefone
 * - Grid responsivo para organizar informações
 */

import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { LinksRedesSociais } from '../components/RedesSociais';
import type { ContatoInfo } from '../types';
// E-mail, telefone e endereço vêm da fonte única (src/data/contato.ts)
import { email, endereco, telefoneExibicao, telefoneLink } from '../data/contato';

/**
 * COMPONENTE CONTATO
 * Exibe todas as formas de contato do projeto
 */
const Contato: React.FC = () => {
  // ============================================
  // DADOS DE CONTATO
  // ============================================

  // Busca no Google Maps (abre o app/site do Maps)
  const linkMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
  // Versão do mapa para incorporar na página (iframe)
  const mapaSrc = `https://www.google.com/maps?q=${encodeURIComponent(endereco)}&z=16&output=embed`;

  const informacoesContato: ContatoInfo[] = [
    {
      tipo: 'email',
      titulo: 'Email',
      valor: email,
      link: `mailto:${email}`,
      icone: '✉️',
    },
    {
      tipo: 'telefone',
      titulo: 'Telefone',
      valor: telefoneExibicao,
      link: telefoneLink,
      icone: '📞',
    },
    {
      tipo: 'endereco',
      titulo: 'Endereço',
      valor: endereco,
      link: linkMapa,
      icone: '📍',
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">CONTATO</h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">Entre em contato conosco</p>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* ============================================
            SEÇÃO 1: INFORMAÇÕES DE CONTATO
            ============================================ */}
        <motion.section {...fadeInUp} className="mb-16">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {informacoesContato.map((info, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white rounded-xl shadow-lg p-8 text-center border-2 border-transparent hover:border-favela-green-500 transition-all duration-300"
              >
                <div className="text-5xl mb-4">{info.icone}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{info.titulo}</h3>
                {info.link ? (
                  <a
                    href={info.link}
                    target={info.tipo === 'endereco' ? '_blank' : undefined}
                    rel={info.tipo === 'endereco' ? 'noopener noreferrer' : undefined}
                    className="text-favela-green-600 hover:text-favela-green-700 font-medium transition-colors"
                  >
                    {info.valor}
                  </a>
                ) : (
                  <p className="text-gray-700">{info.valor}</p>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ============================================
            SEÇÃO 2: OBRAS PAVONIANAS
            ============================================ */}
        <motion.section {...fadeInUp} transition={{ delay: 0.2 }} className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">OBRAS PAVONIANAS</h2>
            <p className="text-lg text-gray-600">Instituição parceira do projeto FavelaWare</p>
          </div>

          <div className="max-w-3xl mx-auto bg-gradient-to-br from-favela-green-50 to-gray-50 rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Telefone</h3>
              <a
                href={telefoneLink}
                className="text-2xl text-favela-green-600 hover:text-favela-green-700 font-bold transition-colors"
              >
                {telefoneExibicao}
              </a>
            </div>
          </div>
        </motion.section>

        {/* ============================================
            SEÇÃO 3: ENDEREÇO E MAPA
            ============================================ */}
        <motion.section {...fadeInUp} transition={{ delay: 0.4 }}>
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">📍 ENDEREÇO</h2>
            <p className="text-lg text-gray-600 mb-2">{endereco}</p>
          </div>

          {/* Mapa do Google Maps */}
          <div className="max-w-5xl mx-auto">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white"
            >
              {/* loading="lazy": o mapa só carrega quando a pessoa rola até ele */}
              <iframe
                src={mapaSrc}
                title="Localização - Obras Pavonianas"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-96"
                style={{ border: 0 }}
              />
            </motion.div>

            {/* Link para abrir no Google Maps */}
            <div className="text-center mt-6">
              <motion.a
                href={linkMapa}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-favela-green-600 to-favela-blue-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                <span>🗺️</span>
                <span>Abrir no Google Maps</span>
              </motion.a>
            </div>
          </div>
        </motion.section>

        {/* ============================================
            SEÇÃO 4: REDES SOCIAIS (OPCIONAL)
            ============================================ */}
        <motion.section {...fadeInUp} transition={{ delay: 0.6 }} className="mt-20">
          <div className="text-center max-w-3xl mx-auto bg-gradient-to-r from-favela-green-50 to-gray-50 rounded-2xl shadow-xl p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">💬 Siga-nos nas Redes Sociais</h2>
            <p className="text-lg text-gray-700 mb-6">Fique por dentro das novidades e acompanhe nosso trabalho</p>

            {/* Mesmos botões do rodapé, na versão para fundo claro */}
            <div className="flex justify-center">
              <LinksRedesSociais fundo="claro" />
            </div>
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
};

export default Contato;
