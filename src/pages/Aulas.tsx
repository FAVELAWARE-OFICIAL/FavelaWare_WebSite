/**
 * ============================================
 * PÁGINA AULAS (CRONOGRAMA DAS AULAS)
 * ============================================
 *
 * Calendário completo da Edição III, na mesma organização da página AULAS
 * do site oficial: cada trilha numa faixa verde, os módulos em rosa e, dentro
 * deles, as aulas com data, tema e instrutores.
 *
 * Os dados ficam em src/data/aulas.ts: para mudar uma aula, edite só lá.
 *
 * Conceitos importantes:
 * - map(): percorre trilhas → módulos → aulas para montar a página
 * - Títulos em ordem (h1 → h2 → h3): o leitor de tela entende a hierarquia
 */

import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { trilhasAulas, type Aula } from '../data/aulas';

/** Uma aula: "data - tema" em negrito e, embaixo, instrutores e observações. */
const ItemAula: React.FC<{ aula: Aula }> = ({ aula }) => (
  <li>
    <p className="font-bold text-[#2d2a5f]">
      {aula.data} - {aula.titulo}
    </p>
    <ul className="mt-2 ml-10 list-[square] space-y-1 text-[#2d2a5f]">
      {aula.detalhes.map((detalhe) => (
        <li key={detalhe}>{detalhe}</li>
      ))}
    </ul>
  </li>
);

const Aulas: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Header da página */}
      <div className="bg-[#2d2a5f] pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-white text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            CRONOGRAMA DAS AULAS
          </motion.h1>
        </div>
      </div>

      {trilhasAulas.map((trilha) => (
        <section key={trilha.titulo} className="pb-16">
          {/* Faixa verde com o nome da trilha, de ponta a ponta como no original */}
          <div className="bg-gradient-to-r from-[#8bc53f] to-[#7ab52f] px-4 py-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#2d2a5f] text-center">
              {trilha.titulo}
            </h2>
          </div>

          <motion.div
            className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {trilha.modulos.map((modulo, indiceModulo) => (
              <div key={indiceModulo}>
                {/* Oficinas e Intervenção Psicológica não têm módulos: vão direto às aulas */}
                {modulo.nome && (
                  <h3 className="text-xl font-bold text-pink-500 mb-4">{modulo.nome}</h3>
                )}
                <ul className="space-y-4 md:ml-5">
                  {/* A lista é fixa e há aulas iguais (ex.: "2026 - Intervenção..."):
                      o índice é a chave estável */}
                  {modulo.aulas.map((aula, indiceAula) => (
                    <ItemAula key={indiceAula} aula={aula} />
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        </section>
      ))}

      <Footer />
    </div>
  );
};

export default Aulas;
