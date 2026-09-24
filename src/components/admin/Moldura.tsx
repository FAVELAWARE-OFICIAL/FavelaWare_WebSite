/**
 * ============================================
 * MOLDURA DAS ÁREAS RESTRITAS
 * ============================================
 *
 * Menu lateral + barra superior + área de conteúdo. Usada pela área do gestor
 * (/dashboard) e pela área do professor (/professor); cada uma passa seus itens
 * de menu e o que quiser mostrar na barra superior (ex.: seletor de edição).
 *
 * Não usa a Navbar nem o Footer do site: é área de trabalho.
 */
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import MenuLateral, { itemEstaAtivo, type ItemMenu } from './MenuLateral';
import { IconeMenu } from './Icones';
import { supabase, alternarPapel, carregarPerfil, type Papel } from '../../lib/supabase';
import { esquecerCache } from '../../lib/cache';
import { EVENTO_PERFIL_ALTERADO } from '../../lib/perfil';
import Carregamento from './Carregamento';
import { foco } from './designSystem';
import './tema-escuro.css';

type Tema = 'claro' | 'escuro';

/** Tema salvo neste navegador; na primeira vez, o do sistema */
function temaInicial(): Tema {
  const salvo = lerPreferencia('restrita:tema');
  if (salvo === 'claro' || salvo === 'escuro') return salvo;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

// Preferências deste navegador. localStorage pode falhar (aba anônima,
// bloqueio): nesse caso só não lembra.
export const lerPreferencia = (chave: string) => {
  try { return localStorage.getItem(chave); } catch { return null; }
};
export const gravarPreferencia = (chave: string, valor: string) => {
  try { localStorage.setItem(chave, valor); } catch { /* sem memória, sem problema */ }
};

interface Props {
  itens: ItemMenu[];
  subtitulo: string;
  acoesTopo?: React.ReactNode;
  children: React.ReactNode;
}

const Moldura: React.FC<Props> = ({ itens, subtitulo, acoesTopo, children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [recolhido, setRecolhido] = useState(() => lerPreferencia('restrita:menu-recolhido') === '1');
  const [tema, setTema] = useState<Tema>(temaInicial);
  const alternarTema = () =>
    setTema((atual) => {
      const novo = atual === 'escuro' ? 'claro' : 'escuro';
      gravarPreferencia('restrita:tema', novo);
      return novo;
    });
  const [menuCelularAberto, setMenuCelularAberto] = useState(false);
  const [usuario, setUsuario] = useState<{
    nome: string;
    foto: string | null;
    papel: Papel | null;
    podeAlternarPapel: boolean;
  } | null>(null);
  const [trocandoPapel, setTrocandoPapel] = useState(false);
  const [erroTroca, setErroTroca] = useState<string | null>(null);

  // Quem está logado (foto na barra superior). getSession lê a sessão guardada
  // no navegador, sem ir ao servidor; o perfil vem do cache (já buscado pela guarda).
  // Relê quando a pessoa muda o nome na tela "Meu perfil".
  useEffect(() => {
    const ler = () =>
      supabase.auth.getSession().then(async ({ data }) => {
        const conta = data.session?.user;
        if (!conta) return;
        const perfil = await carregarPerfil(conta.id);
        setUsuario({
          nome: perfil.nome || (conta.email ?? '').split('@')[0],
          foto: perfil.foto,
          papel: perfil.papel,
          podeAlternarPapel: perfil.podeAlternarPapel,
        });
      });
    ler();
    window.addEventListener(EVENTO_PERFIL_ALTERADO, ler);
    return () => window.removeEventListener(EVENTO_PERFIL_ALTERADO, ler);
  }, []);

  // "Meu perfil" fica dentro da área atual (/dashboard, /professor ou /aluno)
  const caminhoPerfil = `/${pathname.split('/')[1]}/perfil`;
  const paginaAtual =
    pathname === caminhoPerfil ? 'Meu perfil' : (itens.find((i) => itemEstaAtivo(i, pathname))?.rotulo ?? subtitulo);

  // Título da aba do navegador acompanha a página
  useEffect(() => {
    document.title = `${paginaAtual} · ${subtitulo} · FavelaWare`;
  }, [paginaAtual, subtitulo]);

  const alternarRecolhido = () => {
    setRecolhido((atual) => {
      gravarPreferencia('restrita:menu-recolhido', atual ? '0' : '1');
      return !atual;
    });
  };

  // useCallback: o menu usa esta função num efeito e não pode recriá-lo a cada render
  const fecharMenuCelular = useCallback(() => setMenuCelularAberto(false), []);

  // "Ver como": troca o papel da conta autorizada e vai para a área escolhida
  const verComo = async (papel: Papel) => {
    setTrocandoPapel(true);
    setErroTroca(null);
    try {
      const destino = await alternarPapel(papel);
      esquecerCache(); // dados guardados eram do papel anterior
      navigate(destino, { replace: true });
    } catch (e) {
      console.error('[ver como] falha ao trocar de papel', e);
      const texto = (e as { message?: string } | null)?.message;
      setErroTroca(texto && /demonstra/i.test(texto) ? texto : 'Não foi possível trocar de papel. Tente de novo.');
      setTrocandoPapel(false);
    }
  };

  const sair = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`min-h-screen ${tema === 'escuro' ? 'tema-escuro bg-[#0b1220] text-[#e5e9f2]' : 'bg-gray-100 text-gray-900'}`}>
      <MenuLateral
        itens={itens}
        subtitulo={subtitulo}
        recolhido={recolhido}
        onAlternarRecolhido={alternarRecolhido}
        abertoNoCelular={menuCelularAberto}
        onFecharNoCelular={fecharMenuCelular}
        onSair={sair}
        rodape={
          usuario?.podeAlternarPapel && usuario.papel ? (
            <div className="px-1">
              <label htmlFor="ver-como" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/60">
                Ver como
              </label>
              <select
                id="ver-como"
                value={usuario.papel}
                disabled={trocandoPapel}
                onChange={(e) => verComo(e.target.value as Papel)}
                className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pl-3 pr-8 text-sm font-medium text-white focus:border-transparent focus:ring-2 focus:ring-favela-green-500 disabled:opacity-50 [&>option]:text-gray-900"
              >
                <option value="gestor">Gestor</option>
                <option value="professor">Instrutor</option>
                <option value="aluno">Aluno</option>
              </select>
              {erroTroca && <p role="alert" className="mt-1 text-xs text-red-300">{erroTroca}</p>}
            </div>
          ) : undefined
        }
      />

      {/* O conteúdo abre espaço para o menu fixo (largura muda quando recolhe) */}
      <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${recolhido ? 'lg:pl-[4.5rem]' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
          {/* Só no celular: abre a gaveta (no computador o botão fica no topo do menu) */}
          <button
            type="button"
            onClick={() => setMenuCelularAberto(true)}
            aria-label="Abrir menu"
            aria-controls="menu-celular"
            aria-expanded={menuCelularAberto}
            className={`-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 ${foco} lg:hidden`}
          >
            <IconeMenu />
          </button>

          <h1 className="truncate text-lg font-semibold">{paginaAtual}</h1>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            {acoesTopo}
            <button
              type="button"
              onClick={alternarTema}
              aria-pressed={tema === 'escuro'}
              aria-label="Tema escuro"
              title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 ${foco}`}
            >
              {tema === 'escuro' ? <IconeSol /> : <IconeLua />}
            </button>
            {usuario && (
              <Link to={caminhoPerfil} aria-label="Meu perfil" title="Meu perfil"
                className={`rounded-full ${foco} focus-visible:ring-offset-2`}>
                <FotoDoUsuario nome={usuario.nome} foto={usuario.foto} />
              </Link>
            )}
          </div>
        </header>

        {/* Coluna flexível que ocupa toda a altura abaixo da barra: o carregamento
            usa flex-1 e fica no centro exato, em qualquer tamanho de tela */}
        <main className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">{children}</main>

        {/* Rodapé fixo das páginas (ex.: "Salvar chamada"): fica FORA da animação
            de troca de página, sempre no pé da tela, sem subir e descer com o conteúdo */}
        <div id={ID_RODAPE_FIXO} className="sticky bottom-0 z-10 empty:hidden" />
      </div>
    </div>
  );
};

const ID_RODAPE_FIXO = 'rodape-fixo-da-pagina';

/** Põe o conteúdo no rodapé fixo da Moldura (barra de ações presa no pé da tela) */
export const RodapeFixo: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null);
  useEffect(() => setAlvo(document.getElementById(ID_RODAPE_FIXO)), []);
  return alvo ? createPortal(children, alvo) : null;
};

/**
 * Foto de quem está logado; sem foto, as iniciais do nome num círculo.
 * As fotos da equipe já vêm recortadas em círculo com margem branca: a imagem é
 * ampliada dentro do círculo (a partir do rosto) para a margem não aparecer.
 */
const FotoDoUsuario: React.FC<{ nome: string; foto: string | null }> = ({ nome, foto }) => {
  const [falhou, setFalhou] = useState(false);
  if (foto && !falhou) {
    return (
      <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-favela-green-500" title={nome}>
        <img src={foto} alt={nome} onError={() => setFalhou(true)}
          className="h-full w-full origin-[50%_30%] scale-[1.35] object-cover" />
      </span>
    );
  }
  const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
  return (
    <span aria-label={nome} role="img"
      title={nome} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2d2a5f] text-xs font-bold text-white">
      {iniciais}
    </span>
  );
};

/** Ícones do botão de tema (SVG no traço dos outros ícones) */
const IconeSol: React.FC = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const IconeLua: React.FC = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

/** Carregamento das áreas restritas (com a cara do FavelaWare) */
export const Carregando: React.FC<{ texto: string }> = ({ texto }) => <Carregamento texto={texto} />;

export default Moldura;
