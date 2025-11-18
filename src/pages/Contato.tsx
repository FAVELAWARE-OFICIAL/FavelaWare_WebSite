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
import type { ContatoInfo } from '../types';

/**
 * COMPONENTE CONTATO
 * Exibe todas as formas de contato do projeto
 */
const Contato: React.FC = () => {
  // ============================================
  // DADOS DE CONTATO
  // ============================================

  const informacoesContato: ContatoInfo[] = [
    {
      tipo: 'email',
      titulo: 'Email',
      valor: 'favelaware@gmail.com',
      link: 'mailto:favelaware@gmail.com',
      icone: '✉️',
    },
    {
      tipo: 'telefone',
      titulo: 'Telefone',
      valor: '(31) 2517-1450',
      link: 'tel:+553125171450',
      icone: '📞',
    },
    {
      tipo: 'endereco',
      titulo: 'Endereço',
      valor: 'R. Dias de Toledo, 99 - Concórdia, Belo Horizonte - MG, 31110-060',
      link: 'https://maps.app.goo.gl/your-maps-link', // Substituir pelo link real
      icone: '📍',
    },
  ];

  // Coordenadas para o mapa (Obras Pavonianas)
  const endereco = 'R. Dias de Toledo, 99 - Concórdia, Belo Horizonte - MG';
  const mapaSrc = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3751.234567890123!2d-43.123456!3d-19.876543!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDUyJzM1LjYiUyA0M8KwMDcnMjQuNCJX!5e0!3m2!1spt-BR!2sbr!4v1234567890123!5m2!1spt-BR!2sbr`;
  // NOTA: Substituir pelo embed code real do Google Maps

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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              CONTATO
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Entre em contato conosco
            </p>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ============================================
            SEÇÃO 1: INFORMAÇÕES DE CONTATO
            ============================================ */}
        <motion.section
          {...fadeInUp}
          className="mb-16"
        >
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
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {info.titulo}
                </h3>
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
        <motion.section
          {...fadeInUp}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              OBRAS PAVONIANAS
            </h2>
            <p className="text-lg text-gray-600">
              Instituição parceira do projeto FavelaWare
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-gradient-to-br from-favela-blue-50 to-favela-green-50 rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Telefone
              </h3>
              <a
                href="tel:+553125171450"
                className="text-2xl text-favela-green-600 hover:text-favela-green-700 font-bold transition-colors"
              >
                (31) 2517-1450
              </a>
            </div>
          </div>
        </motion.section>

        {/* ============================================
            SEÇÃO 3: ENDEREÇO E MAPA
            ============================================ */}
        <motion.section
          {...fadeInUp}
          transition={{ delay: 0.4 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              📍 ENDEREÇO
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              {endereco}
            </p>
          </div>

          {/* Mapa do Google Maps */}
          <div className="max-w-5xl mx-auto">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white"
            >
              {/* Placeholder do Mapa - Substituir pelo iframe real do Google Maps */}
              <div className="w-full h-96 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🗺️</div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-2">
                    Mapa do Google Maps
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Para adicionar o mapa real, obtenha o código de incorporação no Google Maps:
                  </p>
                  <ol className="text-left text-sm text-gray-600 max-w-md mx-auto space-y-2">
                    <li>1. Abra o Google Maps</li>
                    <li>2. Busque pelo endereço</li>
                    <li>3. Clique em "Compartilhar" → "Incorporar mapa"</li>
                    <li>4. Copie o código HTML</li>
                    <li>5. Substitua o placeholder abaixo</li>
                  </ol>
                </div>
              </div>

              {/* CÓDIGO COMENTADO: Descomentar e substituir src quando tiver o embed do Google Maps
              <iframe
                src={mapaSrc}
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização - Obras Pavonianas"
              />
              */}
            </motion.div>

            {/* Link para abrir no Google Maps */}
            <div className="text-center mt-6">
              <motion.a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-favela-green-600 to-favela-blue-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                <span>🗺️</span>
                <span>Abrir no Google Maps</span>
                <span>→</span>
              </motion.a>
            </div>
          </div>
        </motion.section>

        {/* ============================================
            SEÇÃO 4: REDES SOCIAIS (OPCIONAL)
            ============================================ */}
        <motion.section
          {...fadeInUp}
          transition={{ delay: 0.6 }}
          className="mt-20"
        >
          <div className="text-center max-w-3xl mx-auto bg-gradient-to-r from-favela-purple-100 to-favela-pink-100 rounded-2xl shadow-xl p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              💬 Siga-nos nas Redes Sociais
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Fique por dentro das novidades e acompanhe nosso trabalho
            </p>

            <div className="flex justify-center space-x-6">
              {/* Links das redes sociais - Ajustar conforme necessário */}
              <motion.a
                href="https://instagram.com/favelaware"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="text-5xl hover:opacity-80 transition-opacity"
                title="Instagram"
              >
                📷
              </motion.a>

              <motion.a
                href="mailto:favelaware@gmail.com"
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                className="text-5xl hover:opacity-80 transition-opacity"
                title="Email"
              >
                ✉️
              </motion.a>
            </div>
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
};

export default Contato;
