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
 *
 * O parceiro usa esta mesma área, só para ver (somenteLeitura): Visão geral
 * (todas as edições), Alunos e Chamada. Solicitações não são com ele.
 * O colaborador também: lê a Visão geral, Alunos, Chamada e Turmas
 * (somenteLeitura) e trabalha nas Solicitações e nas Trilhas. Não vê Instrutores,
 * Equipe nem Avaliações.
 * O menu e as abas mostram só as páginas de cada um (lista positiva em
 * servicoSessao.podeAbrir); o resto volta para a Visão geral. Quem garante o que cada um
 * lê e grava é o banco (RLS).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useOutlet } from 'react-router-dom';

import RotaProtegida from '../../components/RotaProtegida';
import Moldura, { TransicaoDaArea } from '../../components/admin/Moldura';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import type { ItemMenu } from '../../components/admin/MenuLateral';
import AbasDeRota, { ABAS_ALUNOS_E_CHAMADAS, ABAS_PROFESSORES } from '../../components/admin/AbasDeRota';
import {
  IconeAlunos,
  IconeAvaliacao,
  IconeEquipe,
  IconeMaterial,
  IconeMembros,
  IconeSolicitacoes,
  IconeVisaoGeral,
} from '../../components/admin/Icones';
import {
  montarPainel,
  servicoPainel,
  FILTROS_INICIAIS,
  type DadosDaEdicao,
  type Filtros,
  type Presenca,
} from '../../lib/painel';
import { servicoEdicoes, type Edicao } from '../../lib/edicoes';
import { servicoCache } from '../../lib/cache';
import { chaveTurmas, servicoTurmas } from '../../lib/turmas';
import { CHAVE_SOLICITACOES, servicoSolicitacoes } from '../../lib/solicitacoes';
import { servicoSessao, type AcessoDaArea as Acesso } from '../../lib/sessao';
import { servicoAvaliacoes } from '../../lib/avaliacoes';
import { ITEM_BANCA } from '../../components/admin/itensDeMenu';
import { CHAVE_EQUIPE, servicoEquipe } from '../../lib/equipe';
import { CHAVE_MATERIAL, servicoMaterial } from '../../lib/material';
import { CHAVE_ACESSOS, servicoAcessos } from '../../lib/acessos';
import { gravarPreferencia, lerPreferencia } from '../../utils/preferencias';
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
  { caminho: '/dashboard/membros', rotulo: 'Equipe', Icone: IconeMembros },
  { caminho: '/dashboard/solicitacoes', rotulo: 'Solicitações', Icone: IconeSolicitacoes },
  { caminho: '/dashboard/avaliacoes', rotulo: 'Avaliações', Icone: IconeAvaliacao },
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

/** O alcance de cada um vem do serviço de sessão (lista positiva de endereços) */
const podeAbrir = (acesso: Acesso, caminho: string) => servicoSessao.podeAbrir(acesso, caminho);

const SUBTITULO_DO_ACESSO: Record<Acesso, string> = {
  gestor: 'Área do gestor',
  parceiro: 'Área do parceiro',
  colaborador: 'Área do colaborador',
};

const menuDo = (acesso: Acesso): ItemMenu[] =>
  ITENS_MENU.filter((i) => podeAbrir(acesso, i.caminho)).map((i) => ({
    ...i,
    ativoEm: i.ativoEm?.filter((c) => podeAbrir(acesso, c)),
  }));

const secoesDo = (acesso: Acesso) =>
  SECOES_COM_ABAS.map((s) => ({
    ...s,
    abas: s.abas.filter((a) => podeAbrir(acesso, a.caminho)),
  })).filter((s) => s.abas.length > 1);

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
    import('./Avaliacoes'),
    import('./Membros'),
    import('../equipe/TrilhasEquipe'),
    import('../Perfil'),
  ]);

/**
 * Tudo que as páginas da edição vão mostrar, de uma vez: os dados da edição e,
 * no cache, as turmas com contagem, as solicitações e a equipe. Quando a pintura
 * do carregamento termina, qualquer página abre pronta. Parceiro e colaborador só
 * carregam o que veem (e o banco não entregaria o resto).
 */
async function carregarTudo(edicaoId: number, acesso: Acesso): Promise<DadosDaEdicao> {
  const doColaborador = () => [
    servicoCache.buscar(CHAVE_SOLICITACOES, () => servicoSolicitacoes.carregar(), true),
    servicoCache.buscar(chaveTurmas(edicaoId), () => servicoTurmas.carregarDaEdicao(edicaoId), true),
    servicoCache.buscar(CHAVE_MATERIAL, () => servicoMaterial.carregarTrilhas()),
  ];
  const doGestor = () => [
    ...doColaborador(),
    servicoCache.buscar(CHAVE_EQUIPE, () => servicoEquipe.carregar()),
    servicoCache.buscar(CHAVE_ACESSOS, () => servicoAcessos.carregar(), true),
  ];
  const [dados] = await Promise.all([
    servicoPainel.carregarDadosDaEdicao(edicaoId, acesso !== 'gestor'),
    preCarregarPaginas(),
    ...(acesso === 'gestor' ? doGestor() : acesso === 'colaborador' ? doColaborador() : []),
  ]);
  return dados;
}

const LayoutAdmin: React.FC = () => (
  <RotaProtegida papeis={['gestor', 'parceiro', 'colaborador']}>
    <AreaDoGestor />
  </RotaProtegida>
);

const AreaDoGestor: React.FC = () => {
  // Gestor ou parceiro posto na banca avaliadora: item para a avaliação da banca
  const [souDaBanca, setSouDaBanca] = useState(false);
  useEffect(() => {
    servicoAvaliacoes
      .souDaBanca()
      .then(setSouDaBanca)
      .catch((e) => {
        console.error('[menu] não conferiu a banca', e?.code ?? e?.message);
        setSouDaBanca(false);
      });
  }, []);

  // Gestor, parceiro ou colaborador? (o perfil já está em cache: a guarda da rota acabou de ler)
  const [acesso, setAcesso] = useState<Acesso | null>(null);
  useEffect(() => {
    servicoSessao
      .contaLogada()
      // Sem sessão ou sem saber o papel, mostra o mínimo (antes caía na tela do
      // gestor; a guarda da rota já barrava, e o banco protege os dados)
      .then((l) => setAcesso(l ? servicoSessao.acessoNaAreaDoGestor(l.perfil) : 'parceiro'))
      .catch((e) => {
        console.error('[área do gestor] não leu o perfil', e?.code ?? e?.message);
        setAcesso('parceiro');
      });
  }, []);
  const somenteLeitura = acesso === null ? null : acesso !== 'gestor';

  const [edicoes, setEdicoes] = useState<Edicao[]>([]);
  const [edicaoId, setEdicaoId] = useState<number | null>(null);
  const [dados, setDados] = useState<DadosDaEdicao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);

  // Lista de edições. Na primeira vez, abre a última usada neste navegador (ou a mais recente)
  const recarregarEdicoes = useCallback(async (selecionar?: number) => {
    try {
      const lista = await servicoEdicoes.carregar();
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
    if (edicaoId === null || acesso === null) return;
    let ativo = true;
    setCarregando(true);
    setErro(null);
    setFiltros(FILTROS_INICIAIS);
    gravarPreferencia('admin:edicao', String(edicaoId));
    carregarTudo(edicaoId, acesso)
      .then((d) => ativo && setDados(d))
      .catch(() => ativo && setErro('Não foi possível carregar os dados desta edição.'))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [edicaoId, acesso]);

  // Depois de cadastrar/corrigir algo: busca de novo sem piscar a tela de carregamento
  const recarregarDados = useCallback(async () => {
    if (edicaoId === null) return;
    // Alunos mudaram: as contagens da aba Edições e turmas também (atualiza por trás)
    servicoCache.esquecer(chaveTurmas(edicaoId));
    setDados(await servicoPainel.carregarDadosDaEdicao(edicaoId, Boolean(somenteLeitura)));
  }, [edicaoId, somenteLeitura]);

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
    edicao && dados && painel && somenteLeitura !== null
      ? {
          somenteLeitura,
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
  const secao = (acesso ? secoesDo(acesso) : []).find((s) => s.abas.some((a) => a.caminho === pathname));
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
            {e.encerrada ? ' (encerrada)' : ''}
          </option>
        ))}
      </select>
    </>
  );

  // Endereço que não é desta conta: volta para a Visão geral
  if (acesso && !podeAbrir(acesso, pathname)) return <Navigate to="/dashboard" replace />;

  return (
    <Moldura
      itens={[...menuDo(acesso ?? 'parceiro'), ...(souDaBanca ? [ITEM_BANCA] : [])]}
      subtitulo={acesso ? SUBTITULO_DO_ACESSO[acesso] : ''}
      acoesTopo={seletorDeEdicao}
    >
      {erro && (
        <div role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {erro}
        </div>
      )}

      {/* Abas da seção (paradas: só o conteúdo de baixo faz a transição) */}
      {secao && !mostrarCarregando && !carregando && <AbasDeRota abas={secao.abas} rotulo={secao.rotulo} />}

      <TransicaoDaArea
        carregando={mostrarCarregando}
        pronta={!carregando && contexto !== null}
        texto="Carregando dados da edição"
        pagina={pagina}
      />
    </Moldura>
  );
};

export default LayoutAdmin;
