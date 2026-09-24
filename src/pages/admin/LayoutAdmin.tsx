/**
 * ============================================
 * LAYOUT DA ÁREA DO GESTOR
 * ============================================
 *
 * Todas as páginas de /dashboard ficam dentro desta moldura (menu lateral +
 * barra superior com o seletor de edição).
 *
 * É aqui que a edição escolhida é carregada do Supabase. As páginas filhas
 * (renderizadas no <Outlet>) recebem dados, contas, filtros e funções de
 * recarregar pelo useAdmin() — ver contexto.ts.
 */
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import RotaProtegida from '../../components/RotaProtegida';
import Moldura, { Carregando, gravarPreferencia, lerPreferencia } from '../../components/admin/Moldura';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import type { ItemMenu } from '../../components/admin/MenuLateral';
import AbasDeRota, { ABAS_ALUNOS_E_CHAMADAS, ABAS_PROFESSORES } from '../../components/admin/AbasDeRota';
import {
  IconeAlunos,
  IconeEquipe,
  IconeMaterial,
  IconeSolicitacoes,
  IconeVisaoGeral,
} from '../../components/admin/Icones';
import {
  carregarDadosDaEdicao,
  carregarEdicoes,
  montarPainel,
  FILTROS_INICIAIS,
  type DadosDaEdicao,
  type Edicao,
  type Filtros,
  type Presenca,
} from '../../lib/dashboard';
import { buscarComCache, esquecerCache } from '../../lib/cache';
import { carregarSolicitacoes, carregarTurmasDaEdicao, chaveSolicitacoes, chaveTurmas } from '../../lib/gestao';
import { carregarEquipe, CHAVE_EQUIPE } from '../../lib/equipe';
import { carregarTrilhas, CHAVE_MATERIAL } from '../../lib/material';
import { carregarAcessos, CHAVE_ACESSOS } from '../../lib/acessos';
import type { ContextoAdmin } from './contexto';

const ITENS_MENU: ItemMenu[] = [
  { caminho: '/dashboard', rotulo: 'Visão geral', Icone: IconeVisaoGeral },
  {
    caminho: '/dashboard/alunos',
    rotulo: 'Alunos e chamadas',
    Icone: IconeAlunos,
    ativoEm: ['/dashboard/chamada', '/dashboard/turmas'], // abas da página
  },
  {
    caminho: '/dashboard/equipe',
    rotulo: 'Instrutores',
    Icone: IconeEquipe,
    ativoEm: ['/dashboard/presenca-professores'], // abas da página
  },
  { caminho: '/dashboard/solicitacoes', rotulo: 'Solicitações', Icone: IconeSolicitacoes },
  // Materiais e atividades juntos, em abas dentro de cada trilha
  { caminho: '/dashboard/trilhas', rotulo: 'Trilhas', Icone: IconeMaterial },
];

// A guarda fica aqui (e não no App.tsx) para o site público não baixar o
// Supabase: este arquivo só é carregado quando alguém abre /dashboard.
// Páginas que têm abas: as abas ficam fixas acima do conteúdo (fora da transição)
const SECOES_COM_ABAS = [
  { rotulo: 'Alunos e chamadas', abas: ABAS_ALUNOS_E_CHAMADAS },
  { rotulo: 'Instrutores', abas: ABAS_PROFESSORES },
];

// Transição entre páginas: o conteúdo entra subindo de leve e sai suave.
// Com "reduzir movimento" no sistema, o MotionConfig do App tira o deslocamento.
const TRANSICAO = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } }, // a antiga sai rápido
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
} as const;

// Código de todas as páginas do menu: baixado junto com os dados, durante a
// pintura do carregamento. Trocar de página nunca espera arquivo (nem fica em branco).
const preCarregarPaginas = () =>
  Promise.all([
    import('./VisaoGeral'),
    import('./Alunos'),
    import('./Chamada'),
    import('./Turmas'),
    import('./Equipe'),
    import('./Solicitacoes'),
    import('./PresencaProfessores'),
    import('../equipe/TrilhasEquipe'),
    import('../Perfil'),
  ]);

/**
 * Tudo que as páginas da edição vão mostrar, de uma vez: os dados da edição e,
 * no cache, as turmas com contagem, as solicitações e a equipe. Quando a pintura
 * do carregamento termina, qualquer página abre pronta.
 */
async function carregarTudo(edicaoId: number): Promise<DadosDaEdicao> {
  const [dados] = await Promise.all([
    carregarDadosDaEdicao(edicaoId),
    preCarregarPaginas(),
    buscarComCache(chaveTurmas(edicaoId), () => carregarTurmasDaEdicao(edicaoId), true),
    buscarComCache(chaveSolicitacoes(edicaoId), () => carregarSolicitacoes(edicaoId), true),
    buscarComCache(CHAVE_EQUIPE, carregarEquipe),
    buscarComCache(CHAVE_MATERIAL, carregarTrilhas),
    buscarComCache(CHAVE_ACESSOS, carregarAcessos, true),
  ]);
  return dados;
}

const LayoutAdmin: React.FC = () => (
  <RotaProtegida papeis={['gestor']}>
    <AreaDoGestor />
  </RotaProtegida>
);

const AreaDoGestor: React.FC = () => {
  const [edicoes, setEdicoes] = useState<Edicao[]>([]);
  const [edicaoId, setEdicaoId] = useState<number | null>(null);
  const [dados, setDados] = useState<DadosDaEdicao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);

  // Lista de edições. Na primeira vez, abre a última usada neste navegador (ou a mais recente)
  const recarregarEdicoes = useCallback(async (selecionar?: number) => {
    try {
      const lista = await carregarEdicoes();
      setEdicoes(lista);
      setEdicaoId((atual) => {
        const desejada = selecionar ?? atual ?? Number(lerPreferencia('admin:edicao'));
        return (lista.find((e) => e.id === desejada) ?? lista[lista.length - 1])?.id ?? null;
      });
      if (!lista.length) setCarregando(false);
    } catch {
      setErro('Não foi possível carregar as edições. Tente recarregar a página.');
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregarEdicoes();
  }, [recarregarEdicoes]);

  // A pintura do carregamento sempre vai até o fim (atraso 0: aparece já na abertura)
  const mostrarCarregando = useCarregamentoCompleto(carregando, 0);

  // Dados da edição escolhida: recarrega ao trocar e limpa os filtros
  useEffect(() => {
    if (edicaoId === null) return;
    let ativo = true;
    setCarregando(true);
    setErro(null);
    setFiltros(FILTROS_INICIAIS);
    gravarPreferencia('admin:edicao', String(edicaoId));
    carregarTudo(edicaoId)
      .then((d) => ativo && setDados(d))
      .catch(() => ativo && setErro('Não foi possível carregar os dados desta edição.'))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [edicaoId]);

  // Depois de cadastrar/corrigir algo: busca de novo sem piscar a tela de carregamento
  const recarregarDados = useCallback(async () => {
    if (edicaoId === null) return;
    // Alunos mudaram: as contagens da aba Edições e turmas também (atualiza por trás)
    esquecerCache(chaveTurmas(edicaoId));
    setDados(await carregarDadosDaEdicao(edicaoId));
  }, [edicaoId]);

  // Correção de uma célula: troca só aquela presença, e as contas são refeitas na hora
  const atualizarPresencaNaTela = useCallback((aulaId: number, participanteId: number, presenca: Presenca | null) => {
    setDados((atual) => {
      if (!atual) return atual;
      const outras = atual.presencas.filter((p) => !(p.aula_id === aulaId && p.participante_id === participanteId));
      return { ...atual, presencas: presenca ? [...outras, presenca] : outras };
    });
  }, []);

  const painel = useMemo(() => (dados ? montarPainel(dados, filtros) : null), [dados, filtros]);
  const edicao = edicoes.find((e) => e.id === edicaoId);
  const contexto: ContextoAdmin | null =
    edicao && dados && painel
      ? {
          edicao,
          edicoes,
          dados,
          painel,
          filtros,
          setFiltros,
          recarregarEdicoes,
          recarregarDados,
          atualizarPresencaNaTela,
        }
      : null;

  const { pathname } = useLocation();
  const secao = SECOES_COM_ABAS.find((s) => s.abas.some((a) => a.caminho === pathname));
  // useOutlet guarda a página em uma variável: na saída, a página antiga continua
  // na tela enquanto some (senão ela trocaria pela nova antes de terminar a transição)
  const pagina = useOutlet(contexto);

  const seletorDeEdicao = (
    <>
      <label htmlFor="edicao" className="sr-only">
        Edição
      </label>
      <select
        id="edicao"
        value={edicaoId ?? ''}
        onChange={(e) => setEdicaoId(Number(e.target.value))}
        className="w-36 truncate rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium focus:border-transparent focus:ring-2 focus:ring-favela-green-500 sm:w-auto"
      >
        {edicoes.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nome}
          </option>
        ))}
      </select>
    </>
  );

  return (
    <Moldura itens={ITENS_MENU} subtitulo="Área do gestor" acoesTopo={seletorDeEdicao}>
      {erro && (
        <div role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {erro}
        </div>
      )}

      {/* Abas da seção (paradas: só o conteúdo de baixo faz a transição) */}
      {secao && !mostrarCarregando && !carregando && <AbasDeRota abas={secao.abas} rotulo={secao.rotulo} />}

      {/* Carregamento sai em fade e a página entra; trocar de página também é suave.
          flex-1: o carregamento ocupa a área toda e fica no centro exato. */}
      <AnimatePresence mode="wait" initial={false}>
        {mostrarCarregando ? (
          <motion.div
            key="carregando"
            className="flex flex-1 flex-col"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Carregando texto="Carregando dados da edição" />
          </motion.div>
        ) : !carregando && contexto ? (
          <motion.div key={pathname} className="flex flex-1 flex-col" {...TRANSICAO}>
            {/* As páginas já foram pré-carregadas: a espera do Suspense é imperceptível */}
            <Suspense fallback={<Carregando texto="Abrindo página" />}>{pagina}</Suspense>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Moldura>
  );
};

export default LayoutAdmin;
