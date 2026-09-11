/**
 * ============================================
 * LIGHTBOX
 * ============================================
 *
 * Mostra uma foto em tela cheia, por cima da página.
 * Fecha com Esc, com o botão × ou clicando fora da foto.
 *
 * Quem usa guarda a foto aberta num useState e passa aqui:
 * null significa "nenhuma aberta".
 *
 * Conceitos importantes:
 * - useEffect: liga a tecla Esc para fechar, e trava o scroll do fundo
 * - useRef: guarda quem tinha o foco, para devolvê-lo quando o lightbox fecha
 * - AnimatePresence: anima a saída de um elemento que some da tela
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FotoLightbox {
  src: string;
  legenda: string;
}

interface LightboxProps {
  foto: FotoLightbox | null;
  aoFechar: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ foto, aoFechar }) => {
  const botaoFecharRef = useRef<HTMLButtonElement>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);

  // Foco do teclado: ao abrir vai para o botão Fechar; ao fechar volta para
  // quem abriu (a miniatura), se ela ainda estiver na página
  useEffect(() => {
    if (!foto) return;

    const ativo = document.activeElement;
    focoAnteriorRef.current = ativo instanceof HTMLElement ? ativo : null;
    botaoFecharRef.current?.focus();

    return () => {
      const anterior = focoAnteriorRef.current;
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, [foto]);

  // Enquanto o lightbox está aberto: Esc fecha e o fundo não rola
  useEffect(() => {
    if (!foto) return;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';

    // Limpeza: desfaz as duas coisas quando o lightbox fecha
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
    };
  }, [foto, aoFechar]);

  return (
    <AnimatePresence>
      {foto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={aoFechar}
          role="dialog"
          aria-modal="true"
          aria-label={foto.legenda}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            ref={botaoFecharRef}
            onClick={aoFechar}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl transition-all"
          >
            <span aria-hidden="true">×</span>
          </button>

          <motion.figure
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            // Impede que o clique na própria foto feche o lightbox
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full"
          >
            <img
              src={foto.src}
              alt={foto.legenda}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            <figcaption className="text-center text-white/90 font-medium mt-4">
              {foto.legenda}
            </figcaption>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Lightbox;
