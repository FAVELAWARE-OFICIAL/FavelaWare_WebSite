/**
 * ============================================
 * CARTÃO DAS TELAS DE ACESSO
 * ============================================
 *
 * Casca das telas de primeiro acesso e de definir senha: fundo claro,
 * cartão branco centralizado com a logo no topo. `AlertaDeAcesso` é a
 * faixa vermelha de erro dessas telas.
 */
import { LOGO } from '../data/imagens';

const CartaoDeAcesso: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10">
      <img src={LOGO} alt="Logo FavelaWare" className="w-40 object-contain mx-auto mb-6" />
      {children}
    </div>
  </div>
);

/** Não mostra nada sem mensagem */
export const AlertaDeAcesso: React.FC<{ mensagem: string | null }> = ({ mensagem }) =>
  mensagem ? (
    <div role="alert" className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 border border-red-300">
      {mensagem}
    </div>
  ) : null;

export default CartaoDeAcesso;
