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
import { Suspense, useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import RotaProtegida from '../../components/RotaProtegida';
import Moldura, { Carregando } from '../../components/admin/Moldura';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import type { ItemMenu } from '../../components/admin/MenuLateral';
import { IconeChamada, IconeMaterial, IconePonto } from '../../components/admin/Icones';
import { buscarComCache } from '../../lib/cache';
import { carregarTrilhas, CHAVE_MATERIAL } from '../../lib/material';
import { carregarMeusPontos, CHAVE_MEUS_PONTOS } from '../../lib/ponto';

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
  const { pathname } = useLocation();
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
      buscarComCache(CHAVE_MATERIAL, carregarTrilhas),
      buscarComCache(CHAVE_MEUS_PONTOS, carregarMeusPontos, true).then((m) => setSouProfessor(m.souProfessor)),
    ])
      .catch(() => undefined) // a página mostra o erro, se houver
      .finally(() => setPronta(true));
  }, []);

  return (
    <Moldura itens={souProfessor ? ITENS_MENU_PROFESSOR : ITENS_MENU} subtitulo="Área do instrutor">
      <AnimatePresence mode="wait" initial={false}>
        {mostrarCarregando || !pronta ? (
          <motion.div
            key="carregando"
            className="flex flex-1 flex-col"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Carregando texto="Abrindo a chamada" />
          </motion.div>
        ) : (
          <motion.div
            key={pathname}
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<Carregando texto="Abrindo a chamada" />}>{pagina}</Suspense>
          </motion.div>
        )}
      </AnimatePresence>
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
