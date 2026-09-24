/**
 * ============================================
 * LAYOUT DA ÁREA DO PROFESSOR
 * ============================================
 *
 * Mesma moldura da área do gestor (menu lateral + barra superior), com os
 * itens do professor. As páginas aparecem no <Outlet>.
 *
 * O código das páginas (chamada e material) e o material são baixados aqui,
 * durante o carregamento: a página só aparece quando está pronta (nunca tela
 * em branco) e entra suave.
 */
import { useEffect, useState } from 'react';
import { useOutlet } from 'react-router-dom';

import RotaProtegida from '../../components/RotaProtegida';
import Moldura, { TransicaoDaArea } from '../../components/admin/Moldura';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import type { ItemMenu } from '../../components/admin/MenuLateral';
import { IconeChamada, IconeMaterial, IconePonto } from '../../components/admin/Icones';
import { servicoCache } from '../../lib/cache';
import { CHAVE_MATERIAL, servicoMaterial } from '../../lib/material';
import { CHAVE_MEUS_PONTOS, servicoPonto } from '../../lib/ponto';

const ITEM_CHAMADA: ItemMenu = { caminho: '/professor', rotulo: 'Fazer chamada', Icone: IconeChamada };
const ITENS_COMUNS: ItemMenu[] = [
  // Materiais e atividades juntos, em abas dentro de cada trilha
  { caminho: '/professor/trilhas', rotulo: 'Trilhas', Icone: IconeMaterial },
];
const ITENS_MENU: ItemMenu[] = [ITEM_CHAMADA, ...ITENS_COMUNS];
// "Meu ponto" só aparece para quem é professor (o gestor entra na área, mas não bate ponto)
const ITENS_MENU_PROFESSOR: ItemMenu[] = [
  ITEM_CHAMADA,
  { caminho: '/professor/ponto', rotulo: 'Meu ponto', Icone: IconePonto },
  ...ITENS_COMUNS,
];

const AreaDoProfessor: React.FC = () => {
  const pagina = useOutlet();
  const [pronta, setPronta] = useState(false);
  const [souProfessor, setSouProfessor] = useState(false);
  const mostrarCarregando = useCarregamentoCompleto(!pronta, 0);

  useEffect(() => {
    // Código das páginas + material, juntos, durante a pintura do carregamento
    Promise.all([
      import('./FazerChamada'),
      import('./MeuPonto'),
      import('../equipe/TrilhasEquipe'),
      import('../Perfil'),
      servicoCache.buscar(CHAVE_MATERIAL, () => servicoMaterial.carregarTrilhas()),
      servicoCache
        .buscar(CHAVE_MEUS_PONTOS, () => servicoPonto.carregarMeus(), true)
        .then((m) => setSouProfessor(m.souProfessor)),
    ])
      .catch(() => undefined) // a página mostra o erro, se houver
      .finally(() => setPronta(true));
  }, []);

  return (
    <Moldura itens={souProfessor ? ITENS_MENU_PROFESSOR : ITENS_MENU} subtitulo="Área do instrutor">
      <TransicaoDaArea carregando={mostrarCarregando || !pronta} pronta texto="Abrindo a chamada" pagina={pagina} />
    </Moldura>
  );
};

// O gestor também entra, para cobrir um professor se precisar
const LayoutProfessor: React.FC = () => (
  <RotaProtegida papeis={['professor', 'gestor']}>
    <AreaDoProfessor />
  </RotaProtegida>
);

export default LayoutProfessor;
