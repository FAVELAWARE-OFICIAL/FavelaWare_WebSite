/**
 * ============================================
 * CAMPO DE NOTA (0 a 5)
 * ============================================
 *
 * Seis botões (0, 1, 2, 3, 4, 5): só dá para escolher uma nota válida, nunca
 * digitar 6 ou 10. A mesma peça na avaliação dos instrutores e na da banca.
 * Clicar de novo na nota escolhida tira a nota (volta a "sem nota").
 * Acessível: é um grupo de rádio (setas do teclado trocam a nota).
 */
import { foco } from './designSystem';

interface Props {
  id: string;
  /** Lido pelo leitor de tela (o rótulo visível fica ao lado) */
  rotulo: string;
  valor: number | null;
  maximo: number;
  aoMudar: (valor: number | null) => void;
  desabilitado?: boolean;
}

const CampoDeNota: React.FC<Props> = ({ id, rotulo, valor, maximo, aoMudar, desabilitado }) => {
  const notas = Array.from({ length: maximo + 1 }, (_, i) => i);

  // Setas: anda entre as notas, como num grupo de rádio
  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const atual = valor ?? (e.key === 'ArrowRight' ? -1 : maximo + 1);
    const proxima = Math.min(maximo, Math.max(0, atual + (e.key === 'ArrowRight' ? 1 : -1)));
    aoMudar(proxima);
    document.getElementById(`${id}-${proxima}`)?.focus();
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={`${rotulo} (0 a ${maximo})`}
      onKeyDown={aoTeclar}
      className="inline-flex shrink-0 overflow-hidden rounded-lg border border-gray-300 bg-white"
    >
      {notas.map((n) => {
        const escolhida = valor === n;
        return (
          <button
            key={n}
            id={`${id}-${n}`}
            type="button"
            role="radio"
            aria-checked={escolhida}
            aria-label={`Nota ${n}`}
            tabIndex={escolhida || (valor === null && n === 0) ? 0 : -1}
            disabled={desabilitado}
            onClick={() => aoMudar(escolhida ? null : n)}
            className={`h-8 w-8 border-l border-gray-200 text-sm font-semibold tabular-nums transition-colors first:border-l-0 disabled:cursor-not-allowed disabled:opacity-60 ${foco} ${
              escolhida ? 'bg-favela-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
};

export default CampoDeNota;
