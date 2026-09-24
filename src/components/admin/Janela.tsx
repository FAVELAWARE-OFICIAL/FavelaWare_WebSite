/**
 * ============================================
 * JANELA (DIÁLOGO) DAS ÁREAS RESTRITAS
 * ============================================
 *
 * Janela por cima da página para formulários (novo aluno, nova turma...).
 * - Esc ou clique fora fecham; o foco vai para o primeiro campo ao abrir
 *   e volta para quem abriu ao fechar.
 * - No celular ocupa a largura toda e sobe do pé da tela (com o "puxador" no
 *   topo); no computador fica centralizada. Conteúdo comprido rola por dentro.
 * - Visual da marca: véu roxo com leve desfoque, faixa verde → azul no topo e
 *   entrada suave (o App desliga o movimento com "reduzir movimento").
 */
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

import { IconeFechar } from './Icones';
import { foco } from './designSystem';

interface Props {
  titulo: string;
  /** Linha de apoio abaixo do título (ex.: turma, aluno) */
  subtitulo?: string;
  aberta: boolean;
  onFechar: () => void;
  children: React.ReactNode;
  /** Mais larga no computador (ex.: histórico de uma entrega) */
  larga?: boolean;
  /** Faixa fixa logo abaixo do título (não rola junto com o conteúdo) */
  topo?: React.ReactNode;
  /** Rodapé fixo (ex.: botão de enviar sempre à vista) */
  rodape?: React.ReactNode;
  /**
   * Onde o foco começa: no primeiro campo (padrão) ou no botão Fechar — para
   * janelas de leitura, em que o campo fica lá embaixo e a janela não deve pular.
   */
  focoInicial?: 'campo' | 'fechar';
}

const Janela: React.FC<Props> = ({
  titulo,
  subtitulo,
  aberta,
  onFechar,
  children,
  larga = false,
  topo,
  rodape,
  focoInicial = 'campo',
}) => {
  const caixaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberta) return;
    const quemAbriu = document.activeElement as HTMLElement | null;
    // Foco no primeiro campo da janela; sem campo, no primeiro botão
    const caixa = caixaRef.current;
    if (focoInicial === 'fechar') caixa?.querySelector<HTMLElement>('button[data-fechar]')?.focus();
    else
      (
        caixa?.querySelector<HTMLElement>('input:not([type="file"]), select, textarea') ??
        caixa?.querySelector<HTMLElement>('button:not([data-fechar])')
      )?.focus();

    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    document.addEventListener('keydown', aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      quemAbriu?.focus();
    };
  }, [aberta, onFechar, focoInicial]);

  if (!aberta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      {/* Véu no roxo da marca, com leve desfoque do que está atrás */}
      <motion.div
        className="absolute inset-0 bg-[#2d2a5f]/45 backdrop-blur-[2px]"
        onClick={onFechar}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      />
      <motion.div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-janela"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={`relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:max-h-[90vh] sm:rounded-2xl ${
          larga ? 'sm:max-w-4xl' : 'sm:max-w-2xl'
        }`}
      >
        {/* Faixa da marca */}
        <div
          className="h-1.5 shrink-0 bg-gradient-to-r from-favela-green-500 via-favela-green-600 to-favela-blue-600"
          aria-hidden="true"
        />
        {/* Puxador (celular) */}
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-gray-300 sm:hidden" aria-hidden="true" />

        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-4 sm:pt-5">
          <div className="min-w-0">
            <h2 id="titulo-janela" className="text-lg font-semibold leading-snug text-gray-900">
              {titulo}
            </h2>
            {subtitulo && <p className="mt-0.5 text-sm text-gray-500">{subtitulo}</p>}
          </div>
          <button
            type="button"
            data-fechar
            onClick={onFechar}
            aria-label="Fechar"
            className={`-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 ${foco}`}
          >
            <IconeFechar className="h-4 w-4" />
          </button>
        </div>

        {topo && <div className="shrink-0 border-y border-gray-100 bg-gray-50/70 px-6 py-3">{topo}</div>}
        <div className={`overflow-y-auto px-6 py-6 ${topo ? '' : 'border-t border-gray-100'}`}>{children}</div>
        {rodape && <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-4">{rodape}</div>}
      </motion.div>
    </div>
  );
};

export default Janela;
