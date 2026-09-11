/**
 * ============================================
 * ROLAR AO TOPO
 * ============================================
 *
 * Num site de uma página só (SPA) trocar de rota não recarrega a página,
 * então a rolagem fica onde estava: um link no rodapé abria a página
 * seguinte já no meio ou no fim. Este componente volta ao topo sempre
 * que o caminho da URL muda.
 *
 * Observa só o pathname: mudar apenas o #hash não rola ao topo.
 * Não desenha nada na tela (retorna null).
 */

import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RolarAoTopo: React.FC = () => {
  const { pathname } = useLocation();

  // useLayoutEffect roda antes da pintura: com useEffect a página nova
  // chegava a aparecer por um quadro ainda na rolagem antiga
  useLayoutEffect(() => {
    // 'instant' ignora o scroll-smooth do html (index.css): sem ele a página
    // nova apareceria rolando de onde a anterior parou até o topo
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

export default RolarAoTopo;
