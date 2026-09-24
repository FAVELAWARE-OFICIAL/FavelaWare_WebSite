/**
 * Justificativa de uma falta (J) na tela do gestor, com o botão para baixar o
 * atestado. Só o gestor consegue o link do atestado (dado de saúde).
 */
import { useState } from 'react';

import { servicoAtestados } from '../../lib/atestados';
import { baixarPorLink } from '../../utils/arquivos';
import { foco, texto } from './designSystem';

const DetalheDaJustificativa: React.FC<{ justificativa: string | null; atestadoId: string | null }> = ({
  justificativa,
  atestadoId,
}) => {
  const [estado, setEstado] = useState<'parado' | 'baixando' | 'erro'>('parado');

  const baixar = async () => {
    if (!atestadoId) return;
    setEstado('baixando');
    try {
      await baixarPorLink(await servicoAtestados.linkParaBaixar(atestadoId), 'atestado');
      setEstado('parado');
    } catch (e) {
      console.error('[atestados] falha ao baixar', e);
      setEstado('erro');
    }
  };

  if (!justificativa && !atestadoId) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Justificativa</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-amber-950">{justificativa || 'Sem texto.'}</p>
      {atestadoId && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={baixar}
            disabled={estado === 'baixando'}
            className={`inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:cursor-wait ${foco}`}
          >
            <span aria-hidden="true">📄</span>
            {estado === 'baixando' ? 'Baixando…' : 'Baixar atestado'}
          </button>
          {estado === 'erro' && (
            <span role="alert" className={`${texto.apoio} text-red-700`}>
              Não foi possível baixar. Tente de novo.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DetalheDaJustificativa;
