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
import CabecalhoDaPagina from '../components/CabecalhoDaPagina';
import CartaoDePessoa from '../components/CartaoDePessoa';
import { cascata } from '../components/animacoes';
import { useTurmasDoSite } from '../hooks/useTurmasDoSite';

const TurmaDetalhe: React.FC = () => {
  // Pega o slug da URL e procura a turma correspondente
  const { slug } = useParams<{ slug: string }>();
  // As do arquivo (com a foto atual do dashboard) e as das edições novas, do banco
  const { turmas, carregandoDoBanco } = useTurmasDoSite();
  const turma = turmas.find((t) => t.slug === slug);

  // Turma de edição nova ainda chegando do banco: espera antes de desistir do link
  if (!turma && carregandoDoBanco) return <div className="min-h-screen bg-white" aria-busy="true" />;
  // Slug inválido (link antigo, erro de digitação): volta para a lista
  if (!turma) return <Navigate to="/turmas" replace />;

  // Turmas vizinhas, para navegar sem voltar ao índice
  const posicao = turmas.findIndex((t) => t.slug === turma.slug);
  const anterior = turmas[posicao - 1];
  const proxima = turmas[posicao + 1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <CabecalhoDaPagina
        titulo={turma.nome.toUpperCase()}
        subtitulo={`${turma.edicao} · ${turma.periodo} · ${turma.alunos.length} alunos`}
        classeSubtitulo="text-xl text-white/80"
        selo={turma.atual ? 'EM ANDAMENTO' : undefined}
      />

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
          variants={cascata(0.05)}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8"
        >
          {turma.alunos.map((aluno, i) => (
            <CartaoDePessoa key={aluno.participanteId ?? `${aluno.nome}-${i}`} nome={aluno.nome} foto={aluno.foto} />
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
