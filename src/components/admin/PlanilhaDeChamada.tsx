/**
 * ============================================
 * PLANILHA DE CHAMADA
 * ============================================
 *
 * Mostra a lista de presença como na planilha original: uma linha por pessoa,
 * uma coluna por aula, e cada célula colorida pela situação.
 *
 * A tabela rola na horizontal dentro do próprio card (são mais de 100 aulas
 * em algumas edições) e a coluna do nome fica fixa à esquerda.
 */
import type { Aula, Presenca, Situacao } from '../../lib/dashboard';
import { formatarData } from '../../lib/dashboard';

// Cor e letra de cada situação. A letra garante leitura sem depender só da cor.
export const ESTILO_SITUACAO: Record<Situacao, { letra: string; rotulo: string; classe: string }> = {
  presente: { letra: 'P', rotulo: 'Presente', classe: 'bg-favela-green-500 text-[#2d2a5f]' },
  ausente: { letra: 'A', rotulo: 'Ausente', classe: 'bg-red-600 text-white' },
  justificada: { letra: 'J', rotulo: 'Falta justificada', classe: 'bg-amber-400 text-gray-900' },
  folga: { letra: 'F', rotulo: 'Folga', classe: 'bg-favela-blue-600 text-white' },
};

export const LegendaSituacoes: React.FC<{ situacoes: Situacao[] }> = ({ situacoes }) => (
  <ul className="flex flex-wrap gap-4 text-sm text-gray-700">
    {situacoes.map((s) => (
      <li key={s} className="flex items-center gap-2">
        <span className={`inline-flex w-6 h-6 items-center justify-center rounded text-xs font-bold ${ESTILO_SITUACAO[s].classe}`}>
          {ESTILO_SITUACAO[s].letra}
        </span>
        {ESTILO_SITUACAO[s].rotulo}
      </li>
    ))}
    <li className="flex items-center gap-2">
      <span className="inline-block w-6 h-6 rounded bg-gray-100 border border-gray-200" />
      Sem registro
    </li>
  </ul>
);

const PlanilhaDeChamada: React.FC<{
  titulo: string;
  pessoas: { id: number; nome: string }[];
  aulas: Aula[];
  /** Presença de cada pessoa por aula: chave `${pessoa}-${aula}` */
  celulas: Map<string, Presenca>;
  /** Se vier, as células viram botões (o gestor corrige a presença) */
  aoClicarCelula?: (pessoa: { id: number; nome: string }, aula: Aula, presenca: Presenca | undefined) => void;
}> = ({ titulo, pessoas, aulas, celulas, aoClicarCelula }) => {
  if (!pessoas.length || !aulas.length) {
    return <p className="text-gray-500 text-sm">{titulo}: nenhum dado com os filtros atuais.</p>;
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="text-xs border-collapse">
        <caption className="sr-only">{titulo}</caption>
        <thead>
          <tr className="bg-gray-50">
            <th scope="col" className="sticky left-0 z-10 w-32 min-w-[8rem] bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 sm:w-auto sm:min-w-[12rem]">
              Nome
            </th>
            {aulas.map((a) => (
              <th
                key={a.id}
                scope="col"
                title={a.descricao ?? formatarData(a.data)}
                className="px-1 py-2 font-medium text-gray-500 whitespace-nowrap [writing-mode:vertical-rl] rotate-180 h-20"
              >
                {a.data ? formatarData(a.data).slice(0, 5) : 's/ data'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pessoas.map((p) => (
            <tr key={p.id} className="border-t border-gray-100">
              <th scope="row" className="sticky left-0 z-10 max-w-[8rem] truncate whitespace-nowrap bg-white px-3 py-1 text-left font-medium text-gray-800 sm:max-w-none" title={p.nome}>
                {p.nome}
              </th>
              {aulas.map((a) => {
                const presenca = celulas.get(`${p.id}-${a.id}`);
                const estilo = presenca ? ESTILO_SITUACAO[presenca.situacao] : null;
                const descricao = `${p.nome} · ${formatarData(a.data)} · ${estilo ? `${estilo.rotulo} (${presenca!.registro_original})` : 'sem registro'}`;
                const classe = `flex h-6 w-6 items-center justify-center rounded font-bold ${estilo ? estilo.classe : 'bg-gray-100'}`;
                return (
                  <td key={a.id} className="p-0.5">
                    {aoClicarCelula ? (
                      <button
                        type="button"
                        onClick={() => aoClicarCelula(p, a, presenca)}
                        title={`${descricao} — clique para corrigir`}
                        aria-label={`Corrigir: ${descricao}`}
                        className={`${classe} hover:ring-2 hover:ring-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900`}
                      >
                        {estilo?.letra}
                      </button>
                    ) : (
                      <span title={descricao} className={classe}>{estilo?.letra}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlanilhaDeChamada;
