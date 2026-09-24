/**
 * ============================================
 * PÁGINA DEFINIR SENHA
 * ============================================
 *
 * Destino do link do convite que o professor recebe por e-mail.
 * O link traz um acesso temporário (o cliente do Supabase lê sozinho da URL);
 * aqui a pessoa escolhe a senha e segue para a área dela.
 *
 * Sem acesso válido na URL (link velho ou já usado), mostra o aviso e o
 * caminho para o login.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, carregarPerfil, destinoDoPerfil, esquecerPerfil } from '../lib/supabase';

const TAMANHO_MINIMO = 8;

const DefinirSenha: React.FC = () => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<'verificando' | 'pronto' | 'sem-convite'>('verificando');
  const [formData, setFormData] = useState({ senha: '', confirmacao: '' });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  // O cliente do Supabase troca o link do e-mail por uma sessão logo ao carregar
  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setEstado(data.session ? 'pronto' : 'sem-convite');
    });
    const { data: ouvinte } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (ativo && sessao) setEstado('pronto');
    });
    return () => {
      ativo = false;
      ouvinte.subscription.unsubscribe();
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((anterior) => ({ ...anterior, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensagem(null);

    if (formData.senha.length < TAMANHO_MINIMO) {
      setMensagem(`A senha precisa ter pelo menos ${TAMANHO_MINIMO} caracteres.`);
      return;
    }
    if (formData.senha !== formData.confirmacao) {
      setMensagem('As duas senhas não são iguais.');
      return;
    }

    setSalvando(true);
    const { data, error } = await supabase.auth.updateUser({ password: formData.senha });
    if (error || !data.user) {
      setSalvando(false);
      setMensagem(
        error?.code === 'weak_password'
          ? 'Senha fraca ou já vazada em outros sites. Escolha outra.'
          : 'Não foi possível salvar a senha. Tente de novo.',
      );
      return;
    }

    esquecerPerfil();
    navigate(destinoDoPerfil(await carregarPerfil(data.user.id)) ?? '/', { replace: true });
  };

  const classeCampo =
    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-favela-green-500 focus:border-transparent transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10">
        <img src="/imgs/logo/logo.png" alt="Logo FavelaWare" className="w-40 object-contain mx-auto mb-6" />

        {estado === 'verificando' && (
          <p className="text-center text-gray-600" role="status">
            Verificando o convite...
          </p>
        )}

        {estado === 'sem-convite' && (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Link inválido ou expirado</h1>
            <p className="text-gray-600 mb-6">
              Este link de convite já foi usado ou venceu. Peça ao gestor para enviar outro, ou entre com sua senha.
            </p>
            <Link to="/login" className="font-medium text-favela-green-600 hover:text-favela-green-700 hover:underline">
              Ir para o login
            </Link>
          </div>
        )}

        {estado === 'pronto' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Crie sua senha</h1>
            <p className="text-gray-600 mb-6">Você vai usar esta senha, com o seu e-mail, para entrar no FavelaWare.</p>

            {mensagem && (
              <div role="alert" className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 border border-red-300">
                {mensagem}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                  Nova senha *
                </label>
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={TAMANHO_MINIMO}
                  value={formData.senha}
                  onChange={handleInputChange}
                  className={classeCampo}
                />
                <p className="mt-1 text-xs text-gray-500">Pelo menos {TAMANHO_MINIMO} caracteres.</p>
              </div>
              <div>
                <label htmlFor="confirmacao" className="block text-sm font-medium text-gray-700 mb-2">
                  Repita a senha *
                </label>
                <input
                  id="confirmacao"
                  name="confirmacao"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmacao}
                  onChange={handleInputChange}
                  className={classeCampo}
                />
              </div>
              <button
                type="submit"
                disabled={salvando}
                className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg shadow-lg transition-all ${
                  salvando
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-favela-green-600 to-favela-blue-600 hover:shadow-xl'
                }`}
              >
                {salvando ? 'Salvando...' : 'SALVAR SENHA E ENTRAR'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default DefinirSenha;
