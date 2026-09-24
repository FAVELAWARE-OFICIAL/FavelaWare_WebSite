/**
 * ============================================
 * VÍNCULO E CARGO
 * ============================================
 *
 * Os dois campos que o gestor preenche para o cartão da pessoa na página Sobre
 * e no Hall da Fama: vínculo (sugere Mundiale, AOPA e Ânima, mas aceita outro)
 * e cargo. Usado no convite do instrutor e na página Membros.
 */
import { ORDEM_DAS_ORGANIZACOES } from '../../data/hallDaFama';
import { classeCampo, classeRotulo } from './Ui';

export interface VinculoECargo {
  organizacao: string;
  cargo: string;
}

const CamposDeVinculo: React.FC<{
  /** Prefixo dos ids (dois formulários na mesma página não repetem id) */
  id: string;
  valor: VinculoECargo;
  aoMudar: (valor: VinculoECargo) => void;
  desabilitado?: boolean;
}> = ({ id, valor, aoMudar, desabilitado }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div>
      <label htmlFor={`${id}-organizacao`} className={classeRotulo}>
        Vínculo
      </label>
      <input
        id={`${id}-organizacao`}
        list={`${id}-organizacoes`}
        value={valor.organizacao}
        onChange={(e) => aoMudar({ ...valor, organizacao: e.target.value })}
        maxLength={60}
        disabled={desabilitado}
        autoComplete="off"
        placeholder="Ex: Ânima"
        className={classeCampo}
      />
      <datalist id={`${id}-organizacoes`}>
        {ORDEM_DAS_ORGANIZACOES.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
    <div>
      <label htmlFor={`${id}-cargo`} className={classeRotulo}>
        Cargo
      </label>
      <input
        id={`${id}-cargo`}
        value={valor.cargo}
        onChange={(e) => aoMudar({ ...valor, cargo: e.target.value })}
        maxLength={60}
        disabled={desabilitado}
        autoComplete="off"
        placeholder="Ex: Instrutor Discente"
        className={classeCampo}
      />
    </div>
  </div>
);

export default CamposDeVinculo;
