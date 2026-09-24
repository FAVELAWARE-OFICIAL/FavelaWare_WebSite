/**
 * ============================================
 * PÁGINA HALL DA FAMA
 * ============================================
 *
 * Reúne todas as pessoas que já formaram a equipe do FavelaWare,
 * agrupadas pela edição em que participaram.
 *
 * As edições 1 a 3 vêm de src/data/hallDaFama.ts; as novas entram sozinhas
 * quando o gestor encerra a edição (hook useHallDaFama).
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
import { contarPessoas } from '../data/hallDaFama';
import { useHallDaFama } from '../hooks/useHallDaFama';
import CabecalhoDaPagina from '../components/CabecalhoDaPagina';
import CartaoDePessoa from '../components/CartaoDePessoa';
import { cascata, surgirDeBaixo } from '../components/animacoes';
import { classeBotaoDestaque } from '../components/estilosDoSite';

const HallDaFama: React.FC = () => {
  // 'todos' mostra a linha do tempo inteira; uma edição filtra só ela
  const [edicaoSelecionada, setEdicaoSelecionada] = useState<string>('todos');
  const edicoes = useHallDaFama();

  // Quais edições desenhar: todas, ou só a escolhida
  const edicoesVisiveis = edicaoSelecionada === 'todos' ? edicoes : edicoes.filter((e) => e.id === edicaoSelecionada);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <CabecalhoDaPagina
        titulo="HALL DA FAMA"
        subtitulo={`${contarPessoas(edicoes)} pessoas que construíram o FavelaWare ao longo das edições`}
      />

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
              <motion.section key={edicao.id} {...surgirDeBaixo} className="mb-16">
                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {edicao.nome} <span className="text-xl font-semibold text-gray-500">({edicao.periodo})</span>
                  </h2>
                  <span className="px-3 py-1 bg-favela-green-100 text-favela-green-700 text-sm font-bold rounded-full">
                    {edicao.membros.length} pessoas
                  </span>
                  <div className="flex-1 h-1 bg-gradient-to-r from-favela-green-500 to-transparent rounded-full" />
                </div>

                <motion.div
                  variants={cascata(0.05)}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8"
                >
                  {/* LinkedIn só aparece para quem tem o perfil cadastrado (arquivo ou "Meu perfil") */}
                  {edicao.membros.map((pessoa, indice) => (
                    <CartaoDePessoa
                      key={`${edicao.id}-${indice}`}
                      nome={pessoa.nome}
                      foto={pessoa.foto}
                      cargo={pessoa.cargo}
                      organizacao={pessoa.organizacao}
                      linkedin={pessoa.linkedin}
                    />
                  ))}
                </motion.div>
              </motion.section>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Atalho para as turmas */}
        <motion.section {...surgirDeBaixo} className="text-center">
          <div className="bg-gradient-to-br from-favela-green-50 to-gray-50 rounded-2xl shadow-xl p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">E os alunos?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Todas as turmas que já passaram pelo projeto estão na página de turmas.
            </p>
            <Link to="/turmas" className={classeBotaoDestaque}>
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
