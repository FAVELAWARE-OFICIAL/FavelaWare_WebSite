/**
 * ============================================
 * PÁGINA COMO FAZEMOS (TRILHAS E CRONOGRAMA)
 * ============================================
 *
 * Mostra as trilhas de ensino da edição atual e, dentro de cada módulo, o
 * que se aprende e as aulas (data, tema e instrutores). Antes isso ficava em
 * duas páginas (Como Fazemos e Aulas) que repetiam o mesmo conteúdo; agora é
 * uma só, compacta: todo módulo começa fechado e abre com um clique.
 *
 * Os dados ficam em src/data/trilhas.ts: para mudar uma aula, edite só lá.
 *
 * Conceitos importantes:
 * - useState com Set: guarda quais módulos estão abertos
 * - aria-expanded / aria-controls: o leitor de tela sabe que o botão abre
 *   o painel logo abaixo
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { edicoesAnteriores, trilhasAtuais, type Modulo, type Trilha } from '../data/trilhas';

/** Seta que gira quando o módulo abre (decorativa) */
const Seta: React.FC<{ aberta: boolean }> = ({ aberta }) => (
  <svg
    className={`h-5 w-5 shrink-0 text-[#2d2a5f] transition-transform duration-200 ${aberta ? 'rotate-180' : ''}`}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
);

/** Conteúdo de um módulo aberto: o que se aprende e as aulas */
const DetalheDoModulo: React.FC<{ modulo: Modulo }> = ({ modulo }) => {
  const temTopicos = modulo.topicos.length > 0;
  const temAulas = (modulo.aulas?.length ?? 0) > 0;
  return (
    <div className={`grid grid-cols-1 gap-6 px-4 pb-5 pt-1 md:px-6 ${temTopicos && temAulas ? 'lg:grid-cols-2' : ''}`}>
      {temTopicos && (
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[#8bc53f]">O que se aprende</p>
          <ul className="ml-5 space-y-1.5">
            {modulo.topicos.map((topico) => (
              <li
                key={topico}
                className="relative text-[#2d2a5f] before:absolute before:left-[-16px] before:top-[9px] before:h-2 before:w-2 before:rounded-full before:bg-[#8bc53f] before:content-['']"
              >
                {topico}
              </li>
            ))}
          </ul>
        </div>
      )}
      {temAulas && (
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-pink-500">Aulas</p>
          <ol className="space-y-2">
            {/* Há aulas iguais (ex.: "2026 - Intervenção..."): o índice é a chave estável */}
            {modulo.aulas!.map((aula, i) => (
              <li key={i} className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="font-semibold text-[#2d2a5f]">
                  <span className="mr-2 whitespace-nowrap text-sm font-bold text-pink-500">{aula.data}</span>
                  {aula.titulo}
                </p>
                {aula.detalhes.map((detalhe) => (
                  <p key={detalhe} className="text-sm text-gray-600">{detalhe}</p>
                ))}
              </li>
            ))}
          </ol>
        </div>
      )}
      {modulo.nota && <p className="text-sm italic text-gray-600">{modulo.nota}</p>}
      {!temTopicos && !temAulas && !modulo.nota && <p className="text-sm text-gray-600">Sem detalhes cadastrados.</p>}
    </div>
  );
};

const ComoFazemos = () => {
  // Módulos abertos ("trilha:modulo"); começa tudo fechado, para a página ficar compacta
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
  // Qual edição anterior está aberta no acordeão (null = nenhuma)
  const [edicaoAberta, setEdicaoAberta] = useState<string | null>(null);

  const alternar = (chave: string) =>
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });

  // Cartão de uma trilha: faixa verde com o título e, abaixo, um botão por módulo.
  // NivelTitulo: h2 nas trilhas atuais; h3 dentro de "Edições Anteriores" (que já é h2).
  // NivelModulo: o botão de cada módulo fica dentro de um título (padrão de acordeão),
  // para o leitor de tela navegar pelos módulos com a tecla H.
  const renderTrilha = (trilha: Trilha, prefixo: string, NivelTitulo: 'h2' | 'h3' = 'h2') => {
    const NivelModulo = NivelTitulo === 'h2' ? 'h3' : 'h4';
    return (
    <>
      {/* px-4 no celular: com px-8 o título mais longo não cabia a 375px */}
      <div className="rounded-t-2xl bg-gradient-to-r from-[#8bc53f] to-[#7ab52f] px-4 py-5 md:px-8">
        <NivelTitulo className="text-center text-xl font-black text-[#2d2a5f] md:text-2xl">
          {trilha.titulo}{trilha.horas ? ` - ${trilha.horas}` : ''}
        </NivelTitulo>
      </div>

      <ul className="divide-y divide-gray-200 rounded-b-2xl border-2 border-t-0 border-gray-200 bg-white">
        {trilha.modulos.map((modulo) => {
          const chave = `${prefixo}:${trilha.id}:${modulo.nome}`;
          const aberto = abertos.has(chave);
          const idPainel = `painel-${chave.replace(/[^a-zA-Z0-9]+/g, '-')}`;
          const totalAulas = modulo.aulas?.length ?? 0;
          return (
            <li key={chave}>
              <NivelModulo>
              <button
                type="button"
                onClick={() => alternar(chave)}
                aria-expanded={aberto}
                aria-controls={idPainel}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-favela-green-500 md:px-6"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-[#2d2a5f] md:text-lg">{modulo.nome}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-gray-600">
                    {modulo.duracao && <span className="font-semibold text-[#6aa520]">{modulo.duracao}</span>}
                    {totalAulas > 0 && <span>{totalAulas} {totalAulas === 1 ? 'aula' : 'aulas'}</span>}
                  </span>
                </span>
                <Seta aberta={aberto} />
              </button>
              </NivelModulo>
              {/* Fica no HTML mesmo fechado (hidden) para o aria-controls sempre apontar para ele */}
              <div id={idPainel} hidden={!aberto}>
                {aberto && <DetalheDoModulo modulo={modulo} />}
              </div>
            </li>
          );
        })}
      </ul>
    </>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section id="como-fazemos" className="min-h-screen bg-white pb-16">
        {/* Header - integrado com navbar */}
        <motion.div
          className="mb-12 bg-[#2d2a5f] pb-16 pt-32 text-white"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">COMO FAZEMOS</h1>
            <p className="mx-auto max-w-3xl text-xl text-white/80">
              As trilhas da 3ª Edição e o cronograma das aulas. Clique num módulo para ver o conteúdo e as aulas.
            </p>
          </div>
        </motion.div>

        <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
          {trilhasAtuais.map((trilha, index) => (
            <motion.div
              key={trilha.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: Math.min(index, 3) * 0.1 }}
            >
              {renderTrilha(trilha, 'atual')}
            </motion.div>
          ))}

          {/* Edições Anteriores */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-16"
          >
            <div className="rounded-t-2xl bg-gradient-to-r from-[#8bc53f] to-[#7ab52f] px-8 py-6">
              <h2 className="text-center text-2xl font-black text-[#2d2a5f] md:text-3xl">EDIÇÕES ANTERIORES</h2>
            </div>

            <div className="space-y-4 rounded-b-2xl border-2 border-gray-200 bg-white p-4 md:p-8">
              {edicoesAnteriores.map((edicao) => {
                const aberta = edicaoAberta === edicao.id;
                const idPainel = `painel-${edicao.id}`;

                return (
                  <div key={edicao.id}>
                    <motion.button
                      type="button"
                      className="w-full rounded-xl bg-[#8bc53f] px-8 py-4 font-bold text-[#2d2a5f] shadow-md transition-all duration-300 hover:bg-[#7ab52f] hover:shadow-xl"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setEdicaoAberta(aberta ? null : edicao.id)}
                      aria-expanded={aberta}
                      aria-controls={idPainel}
                    >
                      {edicao.nome}
                    </motion.button>

                    <div id={idPainel} hidden={!aberta} className="mt-6 space-y-8">
                      {edicao.trilhas.map((trilha) => (
                        <div key={trilha.id}>{renderTrilha(trilha, edicao.id, 'h3')}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default ComoFazemos;
