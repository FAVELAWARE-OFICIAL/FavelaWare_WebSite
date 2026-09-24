/**
 * ============================================
 * CONTEXTO DA ÁREA ADMINISTRATIVA
 * ============================================
 *
 * O LayoutAdmin carrega a edição escolhida uma vez e entrega para as páginas
 * filhas pelo <Outlet context>. Assim, trocar de página no menu não busca
 * tudo de novo, e os filtros continuam valendo entre as páginas.
 */
import { useOutletContext } from 'react-router-dom';
import type { DadosDaEdicao, Edicao, Filtros, Painel, Presenca } from '../../lib/dashboard';

export interface ContextoAdmin {
  edicao: Edicao;
  edicoes: Edicao[];
  dados: DadosDaEdicao;
  painel: Painel;
  filtros: Filtros;
  setFiltros: React.Dispatch<React.SetStateAction<Filtros>>;
  /** Busca de novo a lista de edições (depois de criar/renomear uma) */
  recarregarEdicoes: (selecionar?: number) => Promise<void>;
  /** Busca de novo os dados da edição aberta (depois de cadastrar/corrigir algo) */
  recarregarDados: () => Promise<void>;
  /** Troca uma presença só na tela, sem buscar tudo de novo (depois de gravar no banco) */
  atualizarPresencaNaTela: (aulaId: number, participanteId: number, presenca: Presenca | null) => void;
}

export const useAdmin = () => useOutletContext<ContextoAdmin>();
