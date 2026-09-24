/**
 * ============================================
 * MENU LATERAL DAS ÁREAS RESTRITAS
 * ============================================
 *
 * Usado na área do gestor e na área do professor. Dois comportamentos:
 * - Computador (lg+): fixo à esquerda. O botão no TOPO do menu recolhe/expande
 *   (recolhido fica só com os ícones; o nome aparece num balão ao passar o
 *   mouse ou focar pelo teclado).
 * - Celular/tablet: gaveta que desliza por cima da tela. Fecha com Esc,
 *   clicando fora ou ao escolher um item.
 *
 * O botão Sair fica no rodapé do menu.
 * Cores escuras e neutras de propósito: é área de trabalho, não o site institucional.
 */
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconeFechar, IconeMenu, IconeSair } from './Icones';
import { foco } from './designSystem';

export interface ItemMenu {
  caminho: string;
  rotulo: string;
  Icone: React.FC<{ className?: string }>;
  /** Outros endereços em que o item também fica marcado (as abas da página) */
  ativoEm?: string[];
}

/** O item fica marcado no próprio endereço e nos das abas dele */
export const itemEstaAtivo = (item: ItemMenu, pathname: string) =>
  pathname === item.caminho || !!item.ativoEm?.includes(pathname);

interface Props {
  itens: ItemMenu[];
  subtitulo: string;
  recolhido: boolean;
  onAlternarRecolhido: () => void;
  abertoNoCelular: boolean;
  onFecharNoCelular: () => void;
  onSair: () => void;
  /** Conteúdo extra no rodapé do menu, acima do Sair (ex.: "Ver como") */
  rodape?: React.ReactNode;
}

const classeItem = (recolhido: boolean) =>
  `relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${foco} ${
    recolhido ? 'justify-center' : ''
  }`;

/** Balão com o nome do item quando o menu está recolhido (o nome já está em sr-only) */
const Balao: React.FC<{ texto: string }> = ({ texto }) => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
  >
    {texto}
  </span>
);

/** Itens + botão Sair (igual no computador e na gaveta do celular) */
const ConteudoMenu: React.FC<{
  itens: ItemMenu[];
  recolhido: boolean;
  onSair: () => void;
  aoEscolher?: () => void;
  rodape?: React.ReactNode;
}> = ({ itens, recolhido, onSair, aoEscolher, rodape }) => {
  const { pathname } = useLocation();
  return (
  <>
    <nav aria-label="Menu" className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
      <ul className="space-y-1">
        {itens.map((item) => {
          const { caminho, rotulo, Icone } = item;
          const ativo = itemEstaAtivo(item, pathname);
          return (
            <li key={caminho} className="group relative">
              <Link
                to={caminho}
                onClick={aoEscolher}
                aria-current={ativo ? 'page' : undefined}
                className={`${classeItem(recolhido)} ${ativo ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
              >
                {/* Barrinha verde marca a página atual */}
                {ativo && <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r bg-favela-green-500" aria-hidden="true" />}
                <Icone />
                <span className={recolhido ? 'sr-only' : 'truncate'}>{rotulo}</span>
              </Link>
              {recolhido && <Balao texto={rotulo} />}

            </li>
          );
        })}
      </ul>
    </nav>

    {/* Extra do rodapé: só com o menu aberto (recolhido não cabe) */}
    {rodape && !recolhido && <div className="border-t border-white/10 px-3 pt-4">{rodape}</div>}

    <div className="group relative border-t border-white/10 px-3 py-4">
      <button type="button" onClick={onSair} className={`${classeItem(recolhido)} text-white/75 hover:bg-red-500/15 hover:text-red-200`}>
        <IconeSair />
        <span className={recolhido ? 'sr-only' : ''}>Sair</span>
      </button>
      {recolhido && <Balao texto="Sair" />}
    </div>
  </>
  );
};

const Marca: React.FC<{ subtitulo: string }> = ({ subtitulo }) => (
  <div className="flex min-w-0 items-center gap-3">
    {/* O logo não é quadrado: dimensiona só pela largura */}
    <img src="/imgs/logo/logo.png" alt="FavelaWare" className="w-24 object-contain" />
    <span className="text-[11px] font-semibold uppercase leading-tight tracking-wider text-white/70">{subtitulo}</span>
  </div>
);

const classeBotaoTopo =
  `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white ${foco}`;

/**
 * Fundo do menu: o mesmo banner da tela de login (foto da comunidade com código
 * binário), com o véu no azul do "WARE" do logo (#007fc1), mais escuro no rodapé
 * para o texto branco ter contraste; a cor de reserva é esse azul, se a imagem não carregar.
 */
const FUNDO_DO_MENU: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to bottom, rgba(0, 70, 115, 0.96), rgba(0, 127, 193, 0.85) 12%, rgba(0, 127, 193, 0.8) 50%, rgba(0, 96, 150, 0.92)), url('/imgs/backgrounds/fundo.webp')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const MenuLateral: React.FC<Props> = ({
  itens, subtitulo, recolhido, onAlternarRecolhido, abertoNoCelular, onFecharNoCelular, onSair, rodape,
}) => {
  const botaoFecharRef = useRef<HTMLButtonElement>(null);

  // Gaveta aberta: foco no botão de fechar, Esc fecha e a página de trás não rola
  useEffect(() => {
    if (!abertoNoCelular) return;
    botaoFecharRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onFecharNoCelular();
    document.addEventListener('keydown', aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [abertoNoCelular, onFecharNoCelular]);

  return (
    <>
      {/* ============ COMPUTADOR: fixo à esquerda ============ */}
      <aside
        style={FUNDO_DO_MENU}
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/5 bg-[#007fc1] transition-[width] duration-200 lg:flex ${
          recolhido ? 'w-[4.5rem]' : 'w-64'
        }`}
      >
        {/* Topo: botão de recolher (e o logo, quando há espaço) */}
        <div className={`flex h-16 items-center border-b border-white/10 ${recolhido ? 'justify-center px-2' : 'justify-between gap-2 pl-4 pr-3'}`}>
          {!recolhido && <Marca subtitulo={subtitulo} />}
          <button
            type="button"
            onClick={onAlternarRecolhido}
            aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!recolhido}
            title={recolhido ? 'Expandir menu' : 'Recolher menu'}
            className={classeBotaoTopo}
          >
            <IconeMenu />
          </button>
        </div>
        <ConteudoMenu itens={itens} recolhido={recolhido} onSair={onSair} rodape={rodape} />
      </aside>

      {/* ============ CELULAR: gaveta por cima da tela ============ */}
      <div className={`fixed inset-0 z-40 lg:hidden ${abertoNoCelular ? '' : 'pointer-events-none'}`} aria-hidden={!abertoNoCelular}>
        {/* Fundo escuro: clicar fora fecha */}
        <div
          className={`absolute inset-0 bg-gray-950/60 transition-opacity duration-200 ${abertoNoCelular ? 'opacity-100' : 'opacity-0'}`}
          onClick={onFecharNoCelular}
        />
        <aside
          id="menu-celular"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          inert={!abertoNoCelular}
          style={FUNDO_DO_MENU}
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[#007fc1] transition-transform duration-200 ${
            // Sombra só com a gaveta aberta (fechada, ela vazava na borda da tela)
            abertoNoCelular ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-white/10 pl-4 pr-3">
            <Marca subtitulo={subtitulo} />
            <button ref={botaoFecharRef} type="button" onClick={onFecharNoCelular} aria-label="Fechar menu" className={classeBotaoTopo}>
              <IconeFechar />
            </button>
          </div>
          <ConteudoMenu itens={itens} recolhido={false} onSair={onSair} aoEscolher={onFecharNoCelular} rodape={rodape} />
        </aside>
      </div>
    </>
  );
};

export default MenuLateral;
