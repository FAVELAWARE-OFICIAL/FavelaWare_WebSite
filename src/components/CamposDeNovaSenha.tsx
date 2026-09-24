/**
 * ============================================
 * CAMPOS DE NOVA SENHA (TELAS DE ACESSO)
 * ============================================
 *
 * Nova senha + confirmação + medidor de requisitos: telas de primeiro acesso,
 * de definir senha e "Meu perfil". Os inputs usam name "senha" e "confirmacao":
 * o `aoAlterar` é o do useCampos da página. `dica` aparece entre o campo
 * da senha e os requisitos.
 * - `estilo`: as telas de acesso usam o padrão delas; o perfil, o das áreas;
 * - `prefixoDoId`: separa os ids quando há outro campo de senha na página.
 */
import { classeCampoDeAcesso } from './estilosDeAcesso';
import RequisitosDaSenha from './RequisitosDaSenha';
import { TAMANHO_MINIMO_SENHA } from '../lib/senha';

/** Padrão das telas de acesso */
const ESTILO_DE_ACESSO = { campo: classeCampoDeAcesso, rotulo: 'block text-sm font-medium text-gray-700 mb-2' };

const CamposDeNovaSenha: React.FC<{
  senha: string;
  confirmacao: string;
  aoAlterar: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rotuloDaConfirmacao: string;
  rotuloDaSenha?: string;
  dica?: React.ReactNode;
  estilo?: { campo: string; rotulo: string };
  prefixoDoId?: string;
  desabilitado?: boolean;
}> = ({
  senha,
  confirmacao,
  aoAlterar,
  rotuloDaConfirmacao,
  rotuloDaSenha = 'Nova senha *',
  dica,
  estilo = ESTILO_DE_ACESSO,
  prefixoDoId = '',
  desabilitado,
}) => (
  <>
    <div>
      <label htmlFor={`${prefixoDoId}senha`} className={estilo.rotulo}>
        {rotuloDaSenha}
      </label>
      <input
        id={`${prefixoDoId}senha`}
        name="senha"
        aria-describedby={`requisitos-${prefixoDoId}senha`}
        type="password"
        autoComplete="new-password"
        required
        minLength={TAMANHO_MINIMO_SENHA}
        value={senha}
        onChange={aoAlterar}
        disabled={desabilitado}
        className={estilo.campo}
      />
      {dica}
      <RequisitosDaSenha senha={senha} id={`requisitos-${prefixoDoId}senha`} />
    </div>
    <div>
      <label htmlFor={`${prefixoDoId}confirmacao`} className={estilo.rotulo}>
        {rotuloDaConfirmacao}
      </label>
      <input
        id={`${prefixoDoId}confirmacao`}
        name="confirmacao"
        type="password"
        autoComplete="new-password"
        required
        value={confirmacao}
        onChange={aoAlterar}
        disabled={desabilitado}
        className={estilo.campo}
      />
    </div>
  </>
);

export default CamposDeNovaSenha;
