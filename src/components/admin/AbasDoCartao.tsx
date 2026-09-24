/**
 * ============================================
 * ABAS DENTRO DE UM CARTÃO
 * ============================================
 *
 * Abas que trocam o conteúdo de um cartão sem mudar de página (ex.: Materiais e
 * Atividades de uma trilha). Diferente de AbasDeRota, aqui cada aba não tem endereço.
 * - Padrão de acessibilidade de abas: tablist/tab/tabpanel, setas trocam de aba.
 * - Os painéis existem sempre (o inativo fica escondido), para cada aba apontar
 *   para o seu painel.
 * - Cada aba mostra a contagem e, se houver, um ponto de alerta (ex.: para entregar).
 */
import { foco, selo } from './designSystem';

export interface AbaDoCartao<T extends string> {
  valor: T;
  rotulo: string;
  /** Contagem da aba; sem número (ainda carregando), a contagem não aparece */
  total?: number;
  /** Texto do ponto de alerta (ex.: "2 para corrigir"); sem texto, sem ponto */
  alerta?: string;
  painel: React.ReactNode;
}

interface Props<T extends string> {
  /** Prefixo único dos ids (ex.: "trilha-3") */
  id: string;
  rotulo: string;
  abas: AbaDoCartao<T>[];
  ativa: T;
  aoTrocar: (aba: T) => void;
}

function AbasDoCartao<T extends string>({ id, rotulo, abas, ativa, aoTrocar }: Props<T>) {
  const idAba = (v: T) => `${id}-aba-${v}`;
  const idPainel = (v: T) => `${id}-painel-${v}`;

  // Setas esquerda/direita andam entre as abas (e dão a volta)
  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const atual = abas.findIndex((a) => a.valor === ativa);
    const passo = e.key === 'ArrowRight' ? 1 : -1;
    const proxima = abas[(atual + passo + abas.length) % abas.length]!.valor;
    aoTrocar(proxima);
    document.getElementById(idAba(proxima))?.focus();
  };

  return (
    <>
      <div
        role="tablist"
        aria-label={rotulo}
        onKeyDown={aoTeclar}
        className="-mt-2 mb-3 flex gap-1 border-b border-gray-200"
      >
        {abas.map((a) => {
          const selecionada = a.valor === ativa;
          return (
            <button
              key={a.valor}
              id={idAba(a.valor)}
              type="button"
              role="tab"
              aria-selected={selecionada}
              aria-controls={idPainel(a.valor)}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => aoTrocar(a.valor)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${foco} ${
                selecionada
                  ? 'border-favela-green-600 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {a.rotulo}
              {a.total !== undefined && (
                <span className={`${selo.base} ${selecionada ? selo.marca : selo.neutro}`}>{a.total}</span>
              )}
              {a.alerta && <span className="h-2 w-2 rounded-full bg-amber-500" role="img" aria-label={a.alerta} />}
            </button>
          );
        })}
      </div>

      {/* tabIndex: o Tab para no painel mesmo quando ele só tem texto */}
      {abas.map((a) => (
        <div
          key={a.valor}
          role="tabpanel"
          id={idPainel(a.valor)}
          aria-labelledby={idAba(a.valor)}
          hidden={a.valor !== ativa}
          tabIndex={0}
          className={`rounded-lg ${foco}`}
        >
          {a.painel}
        </div>
      ))}
    </>
  );
}

export default AbasDoCartao;
