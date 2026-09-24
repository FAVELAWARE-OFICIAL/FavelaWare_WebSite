/**
 * ============================================
 * TELA EM ETAPAS (primeiro acesso e dados da bolsa)
 * ============================================
 *
 * Ocupa a janela inteira, sem rolagem da página: painel da marca à esquerda
 * (título, índice das etapas e aviso de privacidade) e, à direita, uma etapa
 * do formulário por vez, com o progresso em cima e Voltar/Próximo embaixo.
 * A mesma peça no primeiro acesso do aluno e nos dados da bolsa do instrutor:
 * cada página só diz as etapas, os campos e o que fazer ao enviar.
 */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { FUNDO_DA_MARCA, LOGO } from '../data/imagens';

export interface EtapaDaTela {
  titulo: string;
  descricao: string;
  icone: string;
}

interface Props {
  /** Título grande no painel da marca (caixa alta) e o curto do celular */
  titulo: string;
  tituloCurto: string;
  descricao: string;
  /** Aviso de privacidade (painel e topo do celular) */
  privacidade: string;
  privacidadeCurta: string;
  etapas: EtapaDaTela[];
  etapa: number;
  /** Até qual etapa dá para voltar pelo índice */
  liberadaAte: number;
  concluida: (indice: number) => boolean;
  aoIrPara: (indice: number) => void;
  /** Link "voltar sem salvar" (quando a página abre para atualizar) */
  voltar?: { para: string; rotulo: string };
  /** Problema do envio ou da etapa (caixa vermelha acima dos campos) */
  erro?: string | null;
  /** Outro aviso acima dos campos (ex.: não carregou os dados salvos) */
  aviso?: React.ReactNode;
  ocupado: boolean;
  bloqueado?: boolean;
  rotuloFinal: string;
  rotuloOcupado?: string;
  formulario: React.RefObject<HTMLFormElement | null>;
  aoEnviar: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Os campos da etapa atual (numa grade de 2 colunas no celular e 6 no computador) */
  children: React.ReactNode;
}

const TelaDeEtapas: React.FC<Props> = ({
  titulo,
  tituloCurto,
  descricao,
  privacidade,
  privacidadeCurta,
  etapas,
  etapa,
  liberadaAte,
  concluida,
  aoIrPara,
  voltar,
  erro,
  aviso,
  ocupado,
  bloqueado,
  rotuloFinal,
  rotuloOcupado = 'Salvando...',
  formulario,
  aoEnviar,
  children,
}) => {
  const atual = etapas[etapa];
  const ultima = etapa === etapas.length - 1;
  const travado = ocupado || Boolean(bloqueado);

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      {/* ============ PAINEL DA MARCA (tela grande): etapas e privacidade ============ */}
      <aside
        className="relative hidden w-[36%] max-w-xl flex-col justify-between overflow-hidden bg-[#8bc53f] p-10 lg:flex xl:p-12"
        style={{ backgroundImage: `url('${FUNDO_DA_MARCA}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Véu roxo: o texto branco precisa de contraste sobre a foto */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2d2a5f]/90 via-[#2d2a5f]/70 to-[#2d2a5f]/85" />

        <div className="relative z-10">
          <img src={LOGO} alt="Logo FavelaWare" className="mb-8 w-44 object-contain drop-shadow-2xl" />
          <h1 className="mb-3 text-3xl font-bold leading-tight text-white drop-shadow-lg xl:text-4xl">{titulo}</h1>
          <p className="max-w-sm text-white/85">{descricao}</p>
        </div>

        {/* Índice das etapas: dá para voltar a qualquer etapa já liberada */}
        <nav aria-label="Etapas do formulário" className="relative z-10">
          <ol className="space-y-2">
            {etapas.map((e, i) => {
              const feita = i !== etapa && i <= liberadaAte && concluida(i);
              const liberada = i <= liberadaAte;
              return (
                <li key={e.titulo}>
                  <button
                    type="button"
                    disabled={!liberada || ocupado}
                    onClick={() => aoIrPara(i)}
                    aria-current={i === etapa ? 'step' : undefined}
                    className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      i === etapa ? 'bg-white/15' : liberada ? 'hover:bg-white/10' : 'cursor-default opacity-60'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        i === etapa
                          ? 'bg-[#8bc53f] text-[#2d2a5f]'
                          : feita
                            ? 'bg-white text-[#2d2a5f]'
                            : 'border-2 border-white/60 text-white'
                      }`}
                    >
                      {feita ? '✓' : i + 1}
                    </span>
                    <span>
                      <span className="block font-semibold text-white">{e.titulo}</span>
                      <span className="block text-sm text-white/75">{e.descricao}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <p className="relative z-10 flex items-start gap-2 text-sm text-white/85">
          <span aria-hidden="true">🔒</span>
          {privacidade}
        </p>
      </aside>

      {/* ============ FORMULÁRIO (uma etapa por vez) ============ */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Topo: progresso. No celular (sem o painel da marca), também o título e a privacidade */}
        <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-2.5 sm:px-8 lg:px-12 lg:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src={LOGO} alt="Logo FavelaWare" className="w-14 shrink-0 object-contain lg:hidden" />
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-gray-900 lg:hidden">{tituloCurto}</h1>
                <p className="truncate text-sm font-medium text-gray-500">
                  Etapa {etapa + 1} de {etapas.length}
                  <span className="lg:hidden"> · {atual.titulo}</span>
                </p>
              </div>
            </div>
            {voltar && (
              <Link
                to={voltar.para}
                className="shrink-0 rounded text-sm font-medium text-gray-600 underline hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500"
              >
                {voltar.rotulo}
              </Link>
            )}
          </div>
          <p className="mt-1.5 text-xs text-gray-600 lg:hidden">
            <span aria-hidden="true">🔒 </span>
            {privacidadeCurta}
          </p>
          <div
            className="mt-2.5 grid gap-2 lg:mt-3"
            style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
            aria-hidden="true"
          >
            {etapas.map((e, i) => (
              <span
                key={e.titulo}
                className={`h-1.5 rounded-full transition-colors duration-300 ${
                  i <= etapa ? 'bg-gradient-to-r from-favela-green-500 to-favela-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </header>

        <form ref={formulario} onSubmit={aoEnviar} noValidate className="flex min-h-0 flex-1 flex-col">
          {/* Meio: a etapa ocupa o espaço que sobra, centralizada na altura */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-8 lg:px-12 lg:py-8">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center">
              {aviso}
              {erro && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-800"
                >
                  {erro}
                </motion.div>
              )}
              {/* key: cada etapa monta de novo e entra deslizando */}
              <motion.fieldset
                key={etapa}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                <legend className="mb-0.5 flex items-center gap-2 text-xl font-bold text-gray-900 lg:mb-1 lg:text-3xl">
                  <span aria-hidden="true">{atual.icone}</span>
                  {atual.titulo}
                </legend>
                <p className="mb-3 text-sm text-gray-600 lg:mb-8 lg:text-base">{atual.descricao}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-6 lg:gap-x-6 lg:gap-y-6">{children}</div>
              </motion.fieldset>
            </div>
          </div>

          {/* Pé: navegação entre as etapas (sempre à vista) */}
          <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-8 lg:px-12 lg:py-4">
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => aoIrPara(etapa - 1)}
                disabled={etapa === 0 || ocupado}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 disabled:invisible lg:py-3"
              >
                ‹ Voltar
              </button>
              <motion.button
                type="submit"
                disabled={travado}
                whileHover={travado ? undefined : { scale: 1.02 }}
                whileTap={travado ? undefined : { scale: 0.98 }}
                className={`flex-1 rounded-lg px-6 py-2.5 font-bold text-white shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 focus-visible:ring-offset-2 sm:flex-none sm:px-10 lg:py-3 ${
                  travado
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-gradient-to-r from-favela-green-600 to-favela-blue-600 hover:shadow-xl'
                }`}
              >
                {ocupado ? rotuloOcupado : !ultima ? 'Próximo ›' : rotuloFinal}
              </motion.button>
            </div>
          </footer>
        </form>
      </main>
    </div>
  );
};

export default TelaDeEtapas;
