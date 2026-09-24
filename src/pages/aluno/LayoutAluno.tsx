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
import { useEffect, useState } from 'react';
import { useOutlet } from 'react-router-dom';

import RotaProtegida from '../../components/RotaProtegida';
import Moldura, { TransicaoDaArea } from '../../components/admin/Moldura';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import type { ItemMenu } from '../../components/admin/MenuLateral';
import { IconeMaterial, IconeSolicitacoes } from '../../components/admin/Icones';
import { CHAVE_ATIVIDADES_ALUNO, servicoAtividades } from '../../lib/atividades';
import { servicoCache } from '../../lib/cache';
import { CHAVE_MATERIAL, servicoMaterial } from '../../lib/material';

const ITENS_MENU: ItemMenu[] = [
  // Materiais e atividades juntos, em abas dentro de cada trilha
  { caminho: '/aluno', rotulo: 'Trilhas', Icone: IconeMaterial },
  { caminho: '/aluno/solicitacoes', rotulo: 'Solicitações', Icone: IconeSolicitacoes },
];

const AreaDoAluno: React.FC = () => {
  const pagina = useOutlet();
  const [pronta, setPronta] = useState(false);
  const mostrarCarregando = useCarregamentoCompleto(!pronta, 0);

  // Código da página + material, juntos, durante a pintura do carregamento
  useEffect(() => {
    Promise.all([
      import('./TrilhasAluno'),
      import('./SolicitacoesAluno'),
      import('../Perfil'),
      servicoCache.buscar(CHAVE_MATERIAL, () => servicoMaterial.carregarTrilhas(), true),
      servicoCache.buscar(CHAVE_ATIVIDADES_ALUNO, () => servicoAtividades.carregarDoAluno(), true),
    ])
      .catch(() => undefined) // a página mostra o erro, se houver
      .finally(() => setPronta(true));
  }, []);

  return (
    <Moldura itens={ITENS_MENU} subtitulo="Área do aluno">
      <TransicaoDaArea carregando={mostrarCarregando || !pronta} pronta texto="Abrindo as trilhas" pagina={pagina} />
    </Moldura>
  );
};

const LayoutAluno: React.FC = () => (
  <RotaProtegida papeis={['aluno']}>
    <AreaDoAluno />
  </RotaProtegida>
);

export default LayoutAluno;
