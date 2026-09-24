/**
 * ============================================
 * LAYOUT DA ÁREA DO ALUNO
 * ============================================
 *
 * Mesma moldura das áreas do gestor e do professor (menu lateral + barra
 * superior), com os itens do aluno. Só entra aluno com a conta ligada a uma
 * turma e que já fez o primeiro acesso (a guarda de rota confere).
 *
 * O material e as atividades são carregados aqui, durante o carregamento: a
 * página das trilhas abre pronta.
 */
import { Suspense, useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import RotaProtegida from '../../components/RotaProtegida';
import Moldura, { Carregando } from '../../components/admin/Moldura';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import type { ItemMenu } from '../../components/admin/MenuLateral';
import { IconeMaterial } from '../../components/admin/Icones';
import { carregarAtividadesDoAluno, CHAVE_ATIVIDADES_ALUNO } from '../../lib/atividades';
import { buscarComCache } from '../../lib/cache';
import { carregarTrilhas, CHAVE_MATERIAL } from '../../lib/material';

const ITENS_MENU: ItemMenu[] = [
  // Materiais e atividades juntos, em abas dentro de cada trilha
  { caminho: '/aluno', rotulo: 'Trilhas', Icone: IconeMaterial },
];

const AreaDoAluno: React.FC = () => {
  const { pathname } = useLocation();
  const pagina = useOutlet();
  const [pronta, setPronta] = useState(false);
  const mostrarCarregando = useCarregamentoCompleto(!pronta, 0);

  // Código da página + material, juntos, durante a pintura do carregamento
  useEffect(() => {
    Promise.all([
      import('./TrilhasAluno'),
      import('../Perfil'),
      buscarComCache(CHAVE_MATERIAL, carregarTrilhas, true),
      buscarComCache(CHAVE_ATIVIDADES_ALUNO, carregarAtividadesDoAluno, true),
    ])
      .catch(() => undefined) // a página mostra o erro, se houver
      .finally(() => setPronta(true));
  }, []);

  return (
    <Moldura itens={ITENS_MENU} subtitulo="Área do aluno">
      <AnimatePresence mode="wait" initial={false}>
        {mostrarCarregando || !pronta ? (
          <motion.div
            key="carregando"
            className="flex flex-1 flex-col"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Carregando texto="Abrindo as trilhas" />
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
            <Suspense fallback={<Carregando texto="Abrindo as trilhas" />}>{pagina}</Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </Moldura>
  );
};

const LayoutAluno: React.FC = () => (
  <RotaProtegida papeis={['aluno']}>
    <AreaDoAluno />
  </RotaProtegida>
);

export default LayoutAluno;
