/**
 * ============================================
 * PÁGINA DE UMA TURMA (/turmas/:slug)
 * ============================================
 *
 * Mostra as fotos e os nomes dos alunos de uma turma.
 * O trecho ":slug" da URL diz qual turma exibir — por exemplo,
 * /turmas/turma-2025 carrega a Turma 2025.
 *
 * Conceitos importantes:
 * - useParams: lê o pedaço variável da URL (o slug)
 * - Navigate: redireciona quando o slug não existe, em vez de quebrar a tela
 */

import { motion } from 'framer-motion';
import { Link, Navigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { acharTurma, turmas } from '../data/turmas';
import { useAlunosComFotoAtual } from '../hooks/useAlunosComFotoAtual';

// Avatar genérico (silhueta branca sobre o verde) para aluno sem foto —
// o mesmo que o site oficial usa para quem não tem retrato
const FOTO_PADRAO = '/imgs/turmas/sem-foto.webp';

const TurmaDetalhe: React.FC = () => {
  // Pega o slug da URL e procura a turma correspondente
  const { slug } = useParams<{ slug: string }>();
  const turmaDoArquivo = acharTurma(slug);
  // Fotos atuais do dashboard por cima das do arquivo
  const [turma] = useAlunosComFotoAtual(turmaDoArquivo ? [turmaDoArquivo] : []);

  // Slug inválido (link antigo, erro de digitação): volta para a lista
  if (!turma) return <Navigate to="/turmas" replace />;

  // Turmas vizinhas, para navegar sem voltar ao índice
  const posicao = turmas.findIndex((t) => t.slug === turma.slug);
  const anterior = turmas[posicao - 1];
  const proxima = turmas[posicao + 1];

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
            {turma.atual && (
              <span className="inline-block mb-4 px-4 py-1.5 bg-[#8bc53f] text-[#2d2a5f] text-sm font-bold rounded-full">
                EM ANDAMENTO
              </span>
            )}

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{turma.nome.toUpperCase()}</h1>
            <p className="text-xl text-white/80">
              {turma.edicao} · {turma.periodo} · {turma.alunos.length} alunos
            </p>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Volta para a lista de turmas */}
        <Link
          to="/turmas"
          className="inline-flex items-center gap-2 mb-12 text-gray-600 hover:text-favela-green-600 font-medium transition-all"
        >
          <span aria-hidden="true">‹</span> Todas as turmas
        </Link>

        {/* Foto da turma (nem toda turma tem) */}
        {turma.fotoTurma && (
          <img
            src={turma.fotoTurma}
            alt={`Foto da ${turma.nome} (${turma.periodo})`}
            loading="lazy"
            decoding="async"
            className="w-full aspect-[3/2] object-cover rounded-2xl shadow-lg mb-12"
          />
        )}

        {/* Grade de alunos */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8"
        >
          {turma.alunos.map((aluno) => (
            <motion.div
              key={aluno.nome}
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className="flex flex-col items-center text-center"
            >
              {/* O verde do container aparece nas bordas do recorte circular,
                  combinando com o fundo verde das próprias fotos. Aluno sem
                  foto ganha o avatar padrão */}
              <div className="w-28 h-28 md:w-32 md:h-32 bg-[#8bc53f] rounded-full overflow-hidden mb-4 shadow-lg ring-4 ring-white">
                <img
                  src={aluno.foto ?? FOTO_PADRAO}
                  alt={`Foto de ${aluno.nome}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-base font-bold text-[#2d2a5f] leading-tight">{aluno.nome}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Navegação entre turmas */}
        <div className="flex flex-wrap justify-between gap-4 mt-16 pt-8 border-t border-gray-200">
          {anterior ? (
            <Link
              to={`/turmas/${anterior.slug}`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-favela-green-600 font-medium transition-all"
            >
              <span aria-hidden="true">‹</span> {anterior.nome} · {anterior.periodo}
            </Link>
          ) : (
            <span />
          )}

          {proxima && (
            <Link
              to={`/turmas/${proxima.slug}`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-favela-green-600 font-medium transition-all"
            >
              {proxima.nome} · {proxima.periodo} <span aria-hidden="true">›</span>
            </Link>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TurmaDetalhe;
