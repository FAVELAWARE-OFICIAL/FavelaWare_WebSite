/**
 * ============================================
 * LAYOUT DA ÁREA DA BANCA AVALIADORA
 * ============================================
 *
 * A mesma moldura das outras áreas, com um item só: a avaliação. A conta
 * "banca" (membro de fora, convidado) só enxerga isto e o próprio perfil (para
 * trocar a senha). Quem é da equipe e foi posto na banca também entra aqui
 * (pelo botão "Avaliar como banca"); o banco confere se a pessoa é da banca.
 */
import { useEffect, useState } from 'react';
import { useOutlet } from 'react-router-dom';

import RotaProtegida from '../../components/RotaProtegida';
import Moldura, { TransicaoDaArea } from '../../components/admin/Moldura';
import type { ItemMenu } from '../../components/admin/MenuLateral';
import { IconeVisaoGeral } from '../../components/admin/Icones';
import { ITEM_BANCA } from '../../components/admin/itensDeMenu';
import { servicoSessao } from '../../lib/sessao';

const AreaDaBanca: React.FC = () => {
  const pagina = useOutlet();
  // Quem é da equipe e está na banca volta para a própria área por aqui
  const [voltar, setVoltar] = useState<ItemMenu | null>(null);
  useEffect(() => {
    servicoSessao
      .contaLogada()
      .then((l) => {
        const area = l ? servicoSessao.destinoDoPerfil(l.perfil) : null;
        if (area && area !== '/banca')
          setVoltar({ caminho: area, rotulo: 'Voltar para a minha área', Icone: IconeVisaoGeral });
      })
      .catch((e) => console.error('[banca] não conferiu a conta', e?.message));
  }, []);

  return (
    <Moldura itens={voltar ? [ITEM_BANCA, voltar] : [ITEM_BANCA]} subtitulo="Banca avaliadora">
      <TransicaoDaArea carregando={false} pronta texto="Abrindo a avaliação" pagina={pagina} />
    </Moldura>
  );
};

const LayoutBanca: React.FC = () => (
  <RotaProtegida papeis={['banca', 'gestor', 'professor', 'parceiro']}>
    <AreaDaBanca />
  </RotaProtegida>
);

export default LayoutBanca;
