/**
 * ============================================
 * ABAS QUE SÃO ROTAS
 * ============================================
 *
 * Abas no topo de uma página em que cada aba tem o seu endereço
 * (/dashboard/alunos, /dashboard/chamada...). Assim dá para favoritar uma aba
 * e o botão "voltar" do navegador funciona entre elas.
 *
 * Quem desenha as abas é o LayoutAdmin, FORA da área animada: ao trocar de aba
 * só o conteúdo de baixo faz a transição; as abas ficam paradas.
 * No celular, a fileira de abas rola para o lado em vez de quebrar a tela.
 */
import { NavLink } from 'react-router-dom';
import { espaco, foco } from './designSystem';

export interface Aba {
  caminho: string;
  rotulo: string;
}

/** As três abas de "Alunos e chamadas" */
export const ABAS_ALUNOS_E_CHAMADAS: Aba[] = [
  { caminho: '/dashboard/alunos', rotulo: 'Alunos' },
  { caminho: '/dashboard/chamada', rotulo: 'Chamada' },
  { caminho: '/dashboard/turmas', rotulo: 'Edições e turmas' },
];

/** As duas abas de "Professores" */
export const ABAS_PROFESSORES: Aba[] = [
  { caminho: '/dashboard/equipe', rotulo: 'Equipe' },
  { caminho: '/dashboard/presenca-professores', rotulo: 'Presença dos instrutores' },
];

const AbasDeRota: React.FC<{ abas: Aba[]; rotulo: string }> = ({ abas, rotulo }) => (
  // overflow-x-auto sozinho faz o navegador rolar também na vertical (o sublinhado
  // da aba passa 1px) e aparecem as setinhas de rolagem: trava o vertical e
  // esconde a barra. No celular a fileira continua rolando para o lado com o dedo.
  <nav
    aria-label={rotulo}
    className={`${espaco.entreBlocos} flex gap-1 overflow-x-auto overflow-y-hidden border-b border-gray-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
  >
    {abas.map((aba) => (
      <NavLink
        key={aba.caminho}
        to={aba.caminho}
        end
        className={({ isActive }) =>
          `-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${foco} ${
            isActive ? 'border-favela-green-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`
        }
      >
        {aba.rotulo}
      </NavLink>
    ))}
  </nav>
);

export default AbasDeRota;
