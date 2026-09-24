/**
 * ============================================
 * PÁGINA GALERIA
 * ============================================
 *
 * Mostra as fotos dos eventos, aulas e premiações do FavelaWare,
 * separadas por edição (da mais recente para a mais antiga).
 *
 * Clicar numa foto abre ela em tela cheia (componente Lightbox).
 *
 * Conceitos importantes:
 * - useState: guarda qual foto está aberta em tela cheia (null = nenhuma)
 */

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Lightbox, { type FotoLightbox } from '../components/Lightbox';

interface Foto {
  arquivo: string;
  legenda: string;
}

const Galeria: React.FC = () => {
  // ============================================
  // DADOS DAS FOTOS
  // ============================================

  const edicaoAtual: Foto[] = [
    { arquivo: 'break-the-pattern-01.webp', legenda: 'Women Techmakers — Break the Pattern' },
    { arquivo: 'break-the-pattern-02.webp', legenda: 'Plateia do Break the Pattern' },
    { arquivo: 'break-the-pattern-03.webp', legenda: 'Turma no Break the Pattern' },
    { arquivo: 'break-the-pattern-04.webp', legenda: 'Alunas no evento' },
    { arquivo: 'break-the-pattern-05.webp', legenda: 'Lembrança do evento' },
    { arquivo: 'break-the-pattern-06.webp', legenda: 'Palco do Break the Pattern' },
    { arquivo: 'palestra-01.webp', legenda: 'Palestra' },
    { arquivo: 'palestra-02.webp', legenda: 'Palestrante no palco' },
    { arquivo: 'palestra-03.webp', legenda: 'Auditório durante a palestra' },
    { arquivo: 'palestra-04.webp', legenda: 'Mesa de debate' },
    { arquivo: 'devfest-01.webp', legenda: 'DevFest Belo Horizonte' },
    { arquivo: 'devfest-02.webp', legenda: 'Crachás do DevFest' },
    { arquivo: 'devfest-03.webp', legenda: 'Turma no DevOpsDays' },
    { arquivo: 'devfest-04.webp', legenda: 'Participantes do DevOpsDays' },
    { arquivo: 'devfest-05.webp', legenda: 'Equipe no DevOpsDays' },
    { arquivo: 'devfest-06.webp', legenda: 'Google Developer Group BH' },
    { arquivo: 'devfest-07.webp', legenda: 'Alunos no GDG Meet' },
    { arquivo: 'evento-01.jpg', legenda: 'Espaço do evento' },
    { arquivo: 'evento-02.webp', legenda: 'Decoração do evento' },
    { arquivo: 'evento-03.jpg', legenda: 'Estande' },
    { arquivo: 'evento-04.webp', legenda: 'Conversa no estande' },
    { arquivo: 'evento-05.webp', legenda: 'Atividade em grupo' },
    { arquivo: 'turma-sala-01.webp', legenda: 'Primeiro dia de aula' },
    { arquivo: 'turma-sala-02.webp', legenda: 'Primeiro dia de aula' },
    { arquivo: 'turma-sala-03.webp', legenda: 'Turma 2025' },
  ];

  const segundaEdicao: Foto[] = [
    { arquivo: 'premiacao-01.webp', legenda: 'Prêmio Ser Humano' },
    { arquivo: 'premiacao-02.webp', legenda: 'Entrega do troféu' },
    { arquivo: 'premiacao-03.webp', legenda: 'Equipe premiada' },
    { arquivo: 'edicao-2-01.webp', legenda: 'Turma com os certificados na Mundiale' },
    { arquivo: 'edicao-2-02.webp', legenda: 'Turma com os certificados na Mundiale' },
    { arquivo: 'edicao-2-03.webp', legenda: 'Turma com os certificados na Mundiale' },
    { arquivo: 'edicao-2-04.webp', legenda: 'Turma com os certificados na Mundiale' },
    { arquivo: 'edicao-2-05.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-06.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-07.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-08.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-09.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-10.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-11.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-12.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-13.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-14.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-15.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-16.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-17.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-18.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-19.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-20.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-21.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-22.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-23.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-24.webp', legenda: 'Entrega de certificados' },
    { arquivo: 'edicao-2-25.webp', legenda: 'Entrega de certificados' },
  ];

  const primeiraEdicao: Foto[] = [
    { arquivo: 'AberturaDoProjeto2022.webp', legenda: 'Abertura do projeto — 2022' },
    { arquivo: 'Formatura2022.webp', legenda: 'Formatura — 2022' },
    { arquivo: 'turma-1-2022-2.webp', legenda: 'Turma 1 — 2022.2' },
    { arquivo: 'edicao-1-01.webp', legenda: 'Convite do evento de abertura' },
    { arquivo: 'edicao-1-02.webp', legenda: 'Convite do encerramento da trilha Cultura e Encantamento' },
    { arquivo: 'edicao-1-03.webp', legenda: 'Turma reunida na abertura' },
    { arquivo: 'edicao-1-04.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
    { arquivo: 'edicao-1-05.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
    { arquivo: 'edicao-1-06.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
    { arquivo: 'edicao-1-07.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
    { arquivo: 'edicao-1-08.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
    { arquivo: 'edicao-1-09.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
  ];

  // ============================================
  // ESTADO DO LIGHTBOX
  // ============================================

  // Foto aberta em tela cheia. null significa "nenhuma aberta".
  const [fotoAberta, setFotoAberta] = useState<FotoLightbox | null>(null);

  // useCallback mantém a mesma função entre renders: o Lightbox usa aoFechar
  // como dependência do useEffect da tecla Esc
  const fecharFoto = useCallback(() => setFotoAberta(null), []);

  // ============================================
  // ANIMAÇÕES
  // ============================================

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.05 } },
  };

  /** Desenha uma grade de fotos clicáveis. */
  const grade = (fotos: Foto[]) => (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {fotos.map((foto) => (
        <motion.button
          key={foto.arquivo}
          variants={fadeInUp}
          whileHover={{ scale: 1.03, y: -5 }}
          onClick={() => setFotoAberta({ src: `/imgs/gallery/${foto.arquivo}`, legenda: foto.legenda })}
          className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg focus:outline-none focus:ring-4 focus:ring-favela-green-500"
        >
          <img
            src={`/imgs/gallery/${foto.arquivo}`}
            alt={foto.legenda}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />

          {/* Legenda: sempre visível no celular (não há mouse); do md para cima aparece no hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2d2a5f]/90 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <span className="text-white font-bold text-left">{foto.legenda}</span>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      {/* Header da página */}
      <div className="bg-[#2d2a5f] pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">GALERIA</h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">Momentos especiais do FavelaWare</p>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.section {...fadeInUp} className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">3ª Edição</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 rounded-full mb-8" />
          {grade(edicaoAtual)}
        </motion.section>

        <motion.section {...fadeInUp} className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">2ª Edição</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 rounded-full mb-8" />
          {grade(segundaEdicao)}
        </motion.section>

        <motion.section {...fadeInUp} className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">1ª Edição</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 rounded-full mb-8" />
          {grade(primeiraEdicao)}
        </motion.section>
      </div>

      {/* Lightbox: a foto em tela cheia */}
      <Lightbox foto={fotoAberta} aoFechar={fecharFoto} />

      <Footer />
    </div>
  );
};

export default Galeria;
