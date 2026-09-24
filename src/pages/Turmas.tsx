/**
 * ============================================
 * PÁGINA TURMAS (ÍNDICE)
 * ============================================
 *
 * Lista todas as turmas do FavelaWare, agrupadas por edição.
 * Cada card leva para a página da turma (/turmas/<slug>), onde aparecem
 * as fotos e os nomes dos alunos.
 *
 * Os dados vêm de src/data/turmas.ts — para acrescentar uma turma nova,
 * basta editar aquele arquivo; esta página se ajusta sozinha.
 *
 * Conceitos importantes:
 * - reduce: agrupa a lista de turmas por edição
 * - Link: navega para a página da turma sem recarregar o site
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { turmas as turmasDoArquivo, type Aluno, type Turma } from '../data/turmas';
import { useAlunosComFotoAtual } from '../lib/fotosDoSite';

/** Prévia do card: até 5 fotos sobrepostas e o "+N" de quem ficou de fora. */
const PreviaAlunos: React.FC<{ alunos: Aluno[] }> = ({ alunos }) => {
  // Só quem tem foto entra na miniatura: círculo vazio não mostra ninguém
  const comFoto = alunos.filter((aluno) => aluno.foto).slice(0, 5);
  const restantes = alunos.length - comFoto.length;

  return (
    <div className="flex items-center mb-6">
      {comFoto.map((aluno, i) => (
        <img
          key={aluno.nome}
          src={aluno.foto}
          alt=""
          loading="lazy"
          className="w-12 h-12 rounded-full object-cover bg-[#8bc53f] border-2 border-white"
          style={{ marginLeft: i === 0 ? 0 : '-14px' }}
        />
      ))}
      {restantes > 0 && <span className="ml-3 text-sm font-bold text-gray-500">+{restantes}</span>}
    </div>
  );
};

const Turmas: React.FC = () => {
  // Fotos atuais do dashboard por cima das do arquivo
  const turmas = useAlunosComFotoAtual(turmasDoArquivo);

  // ============================================
  // AGRUPAMENTO POR EDIÇÃO
  // ============================================

  // Transforma a lista plana em { "3ª Edição": [...], "2ª Edição": [...] }
  const porEdicao = turmas.reduce<Record<string, Turma[]>>((acumulado, turma) => {
    (acumulado[turma.edicao] ||= []).push(turma);
    return acumulado;
  }, {});

  // Edições da mais recente para a mais antiga
  const edicoes = Object.keys(porEdicao).sort().reverse();

  // Soma de alunos de todas as turmas, para o número do topo
  const totalAlunos = turmas.reduce((soma, t) => soma + t.alunos.length, 0);

  // ============================================
  // ANIMAÇÕES
  // ============================================

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.15 } },
  };

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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">TURMAS</h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">Conheça as turmas que já passaram pelo FavelaWare</p>

            {/* Números do projeto */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <div className="text-center px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <div className="text-3xl font-black text-[#8bc53f]">{totalAlunos}</div>
                <div className="text-sm text-white/80">Alunos</div>
              </div>
              <div className="text-center px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <div className="text-3xl font-black text-[#8bc53f]">{turmas.length}</div>
                <div className="text-sm text-white/80">Turmas</div>
              </div>
              <div className="text-center px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <div className="text-3xl font-black text-[#8bc53f]">{edicoes.length}</div>
                <div className="text-sm text-white/80">Edições</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {edicoes.map((edicao) => (
          <motion.section key={edicao} {...fadeInUp} className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{edicao}</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 rounded-full mb-8" />

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {porEdicao[edicao].map((turma) => (
                <motion.div key={turma.slug} variants={fadeInUp}>
                  <Link to={`/turmas/${turma.slug}`} className="block h-full">
                    <motion.div
                      whileHover={{ scale: 1.03, y: -5 }}
                      className="h-full bg-white rounded-2xl shadow-lg p-8 border-2 border-transparent hover:border-favela-green-500 transition-all duration-300"
                    >
                      {/* Selo de turma em andamento */}
                      {turma.atual && (
                        <span className="inline-block mb-4 px-3 py-1 bg-favela-green-100 text-favela-green-700 text-xs font-bold rounded-full">
                          EM ANDAMENTO
                        </span>
                      )}

                      <h3 className="text-2xl font-bold text-[#2d2a5f] mb-1">{turma.nome}</h3>
                      <p className="text-gray-600 mb-6">{turma.periodo}</p>

                      <PreviaAlunos alunos={turma.alunos} />

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-500">{turma.alunos.length} alunos</span>
                        <span className="inline-flex items-center gap-2 text-[#8bc53f] font-bold group-hover:gap-3 transition-all">
                          Conheça a turma
                          <span aria-hidden="true">›</span>
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        ))}

        {/* Atalho para o hall da fama da equipe */}
        <motion.section {...fadeInUp} className="text-center">
          <div className="bg-[#2d2a5f] rounded-2xl shadow-xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">E quem ensinou todo mundo?</h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              O Hall da Fama reúne as equipes de todas as edições do projeto.
            </p>
            <Link
              to="/hall-da-fama"
              className="inline-block bg-[#8bc53f] hover:bg-[#7ab52f] text-[#2d2a5f] font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl"
            >
              VER O HALL DA FAMA
            </Link>
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
};

export default Turmas;
