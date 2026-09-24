/**
 * ============================================
 * TABELA DE CLASSIFICAÇÃO
 * ============================================
 *
 * Lista da maior para a menor nota: posição, foto, nome, turma e total. A mesma
 * peça no resultado do gestor e na lista final que a banca vê. Os três
 * primeiros ganham destaque; `detalhe` mostra como a nota foi composta.
 */
import Avatar from './Avatar';
import { selo, superficie, texto } from './designSystem';

export interface LinhaDaClassificacao {
  chave: string | number;
  nome: string;
  foto: string | null;
  turma: string | null;
  total: number;
  detalhe?: string;
}

const MEDALHAS = ['🥇', '🥈', '🥉'];

const TabelaDeClassificacao: React.FC<{ linhas: LinhaDaClassificacao[]; rotuloDoTotal?: string }> = ({
  linhas,
  rotuloDoTotal = 'Total',
}) => (
  <ol className={`${superficie.cartao} divide-y divide-gray-100`} aria-label="Classificação">
    {linhas.map((l, i) => (
      <li key={l.chave} className="flex items-center gap-3 px-4 py-3">
        <span className="w-8 shrink-0 text-center text-lg font-semibold tabular-nums text-gray-500">
          <span aria-hidden="true">{MEDALHAS[i] ?? `${i + 1}º`}</span>
          <span className="sr-only">{i + 1}º lugar</span>
        </span>
        <Avatar foto={l.foto} nome={l.nome} tamanho={i < 3 ? 'md' : 'sm'} />
        <div className="min-w-0 flex-1">
          <p className={`truncate ${texto.destaque}`}>{l.nome}</p>
          <p className={`truncate ${texto.apoio}`}>{[l.turma, l.detalhe].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={`${selo.base} ${i < 3 ? selo.marca : selo.neutro} tabular-nums`}>
          {rotuloDoTotal} {l.total.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
        </span>
      </li>
    ))}
  </ol>
);

export default TabelaDeClassificacao;
