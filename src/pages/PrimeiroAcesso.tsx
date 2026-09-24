/**
 * ============================================
 * PÁGINA PRIMEIRO ACESSO (ALUNO)
 * ============================================
 *
 * O aluno entra com o login da turma e a senha padrão; antes de ver a área
 * dele, precisa:
 * 1. trocar a senha padrão por uma só dele;
 * 2. informar data de nascimento e e-mail.
 *
 * Sem isso a guarda de rota não deixa entrar em /aluno. A senha é trocada no
 * Supabase Auth; os dados vão pela função concluir_primeiro_acesso do banco,
 * que também libera a conta.
 */
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import Carregamento from '../components/admin/Carregamento';
import { supabase, carregarPerfil, esquecerPerfil, type MeuPerfil } from '../lib/supabase';

const TAMANHO_MINIMO = 8;

const classeCampo =
  'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-favela-green-500 focus:border-transparent transition-all';

const PrimeiroAcesso: React.FC = () => {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<MeuPerfil | null | undefined>(undefined); // undefined = verificando
  const [formData, setFormData] = useState({ senha: '', confirmacao: '', dataNascimento: '', email: '' });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  // Só aluno ligado a uma turma, e que ainda não fez o primeiro acesso
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setPerfil(data.session ? await carregarPerfil(data.session.user.id) : null);
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((anterior) => ({ ...anterior, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensagem(null);

    if (formData.senha.length < TAMANHO_MINIMO) {
      return setMensagem(`A nova senha precisa ter pelo menos ${TAMANHO_MINIMO} caracteres.`);
    }
    if (formData.senha !== formData.confirmacao) return setMensagem('As duas senhas não são iguais.');
    if (!formData.dataNascimento) return setMensagem('Informe sua data de nascimento.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email.trim())) return setMensagem('Informe um e-mail válido.');

    setSalvando(true);
    const troca = await supabase.auth.updateUser({ password: formData.senha });
    if (troca.error) {
      setSalvando(false);
      return setMensagem(
        troca.error.code === 'same_password'
          ? 'A nova senha precisa ser diferente da senha padrão.'
          : troca.error.code === 'weak_password'
            ? 'Senha fraca ou já vazada em outros sites. Escolha outra.'
            : 'Não foi possível trocar a senha. Tente de novo.',
      );
    }

    const { error } = await supabase.rpc('concluir_primeiro_acesso', {
      p_data_nascimento: formData.dataNascimento,
      p_email: formData.email.trim(),
    });
    if (error) {
      setSalvando(false);
      return setMensagem('A senha foi trocada, mas não foi possível salvar seus dados. Tente de novo.');
    }

    esquecerPerfil(); // o perfil mudou (não precisa mais trocar a senha)
    navigate('/aluno', { replace: true });
  };

  if (perfil === undefined) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Carregamento texto="Verificando acesso" />
      </div>
    );
  }
  if (!perfil || perfil.papel !== 'aluno' || !perfil.participanteId) return <Navigate to="/login" replace />;
  if (!perfil.precisaTrocarSenha) return <Navigate to="/aluno" replace />;

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10">
        <img src="/imgs/logo/logo.png" alt="Logo FavelaWare" className="w-40 object-contain mx-auto mb-6" />

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo(a)!</h1>
        <p className="text-gray-600 mb-6">
          Este é o seu primeiro acesso. Crie uma senha só sua e complete seus dados para ver o material das aulas.
        </p>

        {mensagem && (
          <div role="alert" className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 border border-red-300">{mensagem}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">Nova senha *</label>
            <input id="senha" name="senha" type="password" autoComplete="new-password" required minLength={TAMANHO_MINIMO}
              value={formData.senha} onChange={handleInputChange} className={classeCampo} />
            <p className="mt-1 text-xs text-gray-500">Pelo menos {TAMANHO_MINIMO} caracteres, diferente da senha padrão.</p>
          </div>
          <div>
            <label htmlFor="confirmacao" className="block text-sm font-medium text-gray-700 mb-2">Repita a nova senha *</label>
            <input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required
              value={formData.confirmacao} onChange={handleInputChange} className={classeCampo} />
          </div>
          <div>
            <label htmlFor="dataNascimento" className="block text-sm font-medium text-gray-700 mb-2">Data de nascimento *</label>
            <input id="dataNascimento" name="dataNascimento" type="date" required max={hoje} autoComplete="bday"
              value={formData.dataNascimento} onChange={handleInputChange} className={classeCampo} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Seu e-mail *</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              value={formData.email} onChange={handleInputChange} className={classeCampo} placeholder="Ex: maria@email.com" />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg shadow-lg transition-all ${
              salvando ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-favela-green-600 to-favela-blue-600 hover:shadow-xl'
            }`}
          >
            {salvando ? 'Salvando...' : 'SALVAR E ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PrimeiroAcesso;
