/**
 * ============================================
 * CABEÇALHO DA PÁGINA
 * ============================================
 *
 * Faixa roxa do topo das páginas internas do site: título, subtítulo e,
 * se a página pedir, um selo acima do título e conteúdo extra abaixo
 * (children). O pt-32 compensa a navbar fixa de h-20.
 */

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  titulo: string;
  subtitulo: ReactNode;
  /** Etiqueta verde acima do título (ex.: "EM ANDAMENTO") */
  selo?: string;
  /** Tamanho da fonte do título; troque só quando o título não couber no celular */
  classeTamanhoTitulo?: string;
  classeSubtitulo?: string;
  children?: ReactNode;
}

const CabecalhoDaPagina: React.FC<Props> = ({
  titulo,
  subtitulo,
  selo,
  classeTamanhoTitulo = 'text-4xl md:text-5xl',
  classeSubtitulo = 'text-xl text-white/80 max-w-3xl mx-auto',
  children,
}) => (
  <div className="bg-[#2d2a5f] pt-32 pb-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        {selo && (
          <span className="inline-block mb-4 px-4 py-1.5 bg-[#8bc53f] text-[#2d2a5f] text-sm font-bold rounded-full">
            {selo}
          </span>
        )}

        <h1 className={`${classeTamanhoTitulo} font-bold text-white mb-4`}>{titulo}</h1>
        <p className={classeSubtitulo}>{subtitulo}</p>

        {children}
      </motion.div>
    </div>
  </div>
);

export default CabecalhoDaPagina;
