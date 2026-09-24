/**
 * ============================================
 * RESUMO DE UMA SOLICITAÇÃO
 * ============================================
 *
 * O mesmo cartão para o aluno, o gestor e o parceiro: o pedido, o status, a
 * devolutiva e quem respondeu (nome, não só a data).
 * - `cabecalho`: o que vem antes do selo (a equipe mostra o aluno; o aluno, nada);
 * - `acoes`: botões à direita (abrir a conversa, atender...).
 */
import type { Solicitacao, StatusSolicitacao } from '../../lib/solicitacoes';
import { formatarDia } from '../../utils/datas';
import { selo, texto } from './designSystem';

export const STATUS_DA_SOLICITACAO: Record<StatusSolicitacao, { rotulo: string; cor: string }> = {
  pendente: { rotulo: 'Aberta', cor: selo.atencao },
  em_andamento: { rotulo: 'Em andamento', cor: selo.informacao },
  aprovada: { rotulo: 'Aprovada', cor: selo.sucesso },
  recusada: { rotulo: 'Recusada', cor: selo.neutro },
};

export const SeloDaSolicitacao: React.FC<{ status: StatusSolicitacao }> = ({ status }) => (
  <span className={`${selo.base} ${STATUS_DA_SOLICITACAO[status].cor}`}>{STATUS_DA_SOLICITACAO[status].rotulo}</span>
);

interface Props {
  solicitacao: Solicitacao;
  cabecalho?: React.ReactNode;
  acoes?: React.ReactNode;
}

const ResumoDaSolicitacao: React.FC<Props> = ({ solicitacao: s, cabecalho, acoes }) => (
  <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {cabecalho}
          <SeloDaSolicitacao status={s.status} />
        </div>
        <p className={texto.apoio}>
          {s.tipo} · enviada em {formatarDia(s.criada_em)}
          {s.resolvida_em
            ? ` · respondida em ${formatarDia(s.resolvida_em)}${s.respondida_por ? ` por ${s.respondida_por}` : ''}`
            : ''}
        </p>
        <p className="mt-2 whitespace-pre-line text-sm text-gray-800">{s.descricao}</p>
        {s.resposta && (
          <p className="mt-2 whitespace-pre-line rounded-md bg-gray-50 p-2 text-sm text-gray-700">
            <strong>Resposta{s.respondida_por ? ` de ${s.respondida_por}` : ''}:</strong> {s.resposta}
          </p>
        )}
      </div>
      {acoes}
    </div>
  </li>
);

export default ResumoDaSolicitacao;
