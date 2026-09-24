/**
 * ============================================
 * PÁGINA HALL DA FAMA
 * ============================================
 *
 * Reúne todas as pessoas que já formaram a equipe do FavelaWare,
 * agrupadas pela edição em que participaram.
 *
 * Os dados vêm de src/data/hallDaFama.ts.
 *
 * Conceitos importantes:
 * - useState: guarda qual edição está selecionada nos botões de filtro
 * - Filtro: mostra só as pessoas da edição escolhida (ou todas)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { edicoes, membrosDaEdicao, totalDePessoas } from '../data/hallDaFama';
import { LinkLinkedin } from '../components/RedesSociais';

const HallDaFama: React.FC = () => {
  // 'todos' mostra a linha do tempo inteira; uma edição filtra só ela
  const [edicaoSelecionada, setEdicaoSelecionada] = useState<string>('todos');

  // Quais edições desenhar: todas, ou só a escolhida
  const edicoesVisiveis = edicaoSelecionada === 'todos' ? edicoes : edicoes.filter((e) => e.id === edicaoSelecionada);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.05 } },
  };

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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">HALL DA FAMA</h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              {totalDePessoas} pessoas que construíram o FavelaWare ao longo das edições
            </p>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Filtro por edição */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          <button
            onClick={() => setEdicaoSelecionada('todos')}
            aria-pressed={edicaoSelecionada === 'todos'}
            className={`min-h-[44px] px-6 rounded-xl font-bold transition-all ${
              edicaoSelecionada === 'todos'
                ? 'bg-[#2d2a5f] text-white shadow-lg'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-favela-green-500'
            }`}
          >
            Todos
          </button>

          {edicoes.map((edicao) => (
            <button
              key={edicao.id}
              onClick={() => setEdicaoSelecionada(edicao.id)}
              aria-pressed={edicaoSelecionada === edicao.id}
              className={`min-h-[44px] px-6 rounded-xl font-bold transition-all ${
                edicaoSelecionada === edicao.id
                  ? 'bg-[#2d2a5f] text-white shadow-lg'
                  : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-favela-green-500'
              }`}
            >
              {edicao.nome}
            </button>
          ))}
        </div>

        {/* Um bloco por edição */}
        <AnimatePresence mode="wait">
          <motion.div key={edicaoSelecionada} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {edicoesVisiveis.map((edicao) => (
              <motion.section key={edicao.id} {...fadeInUp} className="mb-16">
                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {edicao.nome} <span className="text-xl font-semibold text-gray-500">({edicao.periodo})</span>
                  </h2>
                  <span className="px-3 py-1 bg-favela-green-100 text-favela-green-700 text-sm font-bold rounded-full">
                    {membrosDaEdicao(edicao).length} pessoas
                  </span>
                  <div className="flex-1 h-1 bg-gradient-to-r from-favela-green-500 to-transparent rounded-full" />
                </div>

                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8"
                >
                  {membrosDaEdicao(edicao).map((pessoa) => (
                    <motion.div
                      key={`${edicao.id}-${pessoa.nome}`}
                      variants={fadeInUp}
                      whileHover={{ y: -8 }}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="w-28 h-28 md:w-32 md:h-32 bg-[#8bc53f] rounded-full overflow-hidden mb-4 shadow-lg ring-4 ring-white">
                        <img
                          src={pessoa.foto}
                          alt={`Foto de ${pessoa.nome}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {pessoa.cargo && (
                        <p className="text-sm font-bold text-[#8bc53f] mb-1">{pessoa.cargo}</p>
                      )}
                      <p className="text-base font-bold text-[#2d2a5f] leading-tight">{pessoa.nome}</p>
                      {pessoa.organizacao && (
                        <p className="text-sm text-pink-500 font-semibold">{pessoa.organizacao}</p>
                      )}
                      {/* LinkedIn só aparece para quem tem o perfil cadastrado em data/hallDaFama.ts */}
                      {pessoa.linkedin && <LinkLinkedin nome={pessoa.nome} url={pessoa.linkedin} />}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Atalho para as turmas */}
        <motion.section {...fadeInUp} className="text-center">
          <div className="bg-gradient-to-br from-favela-green-50 to-gray-50 rounded-2xl shadow-xl p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">E os alunos?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Todas as turmas que já passaram pelo projeto estão na página de turmas.
            </p>
            <Link
              to="/turmas"
              className="inline-block bg-[#8bc53f] hover:bg-[#7ab52f] text-[#2d2a5f] font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl"
            >
              VER AS TURMAS
            </Link>
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
};

export default HallDaFama;
