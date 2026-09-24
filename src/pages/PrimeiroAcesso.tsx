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
import CamposDeNovaSenha from '../components/CamposDeNovaSenha';
import CartaoDeAcesso, { AlertaDeAcesso } from '../components/CartaoDeAcesso';
import { classeBotaoDeAcesso, classeCampoDeAcesso } from '../components/estilosDeAcesso';
import { useCampos } from '../hooks/useCampos';
import { servicoSenha } from '../lib/senha';
import { servicoSessao, type MeuPerfil } from '../lib/sessao';
import { StatusProcessamento } from '../types';
import { hoje as hojeLocal } from '../utils/datas';
import { emailValido } from '../utils/texto';

const PrimeiroAcesso: React.FC = () => {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<MeuPerfil | null | undefined>(undefined); // undefined = verificando
  const { campos, aoAlterarCampo } = useCampos({ senha: '', confirmacao: '', dataNascimento: '', email: '' });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  // Só aluno ligado a uma turma, e que ainda não fez o primeiro acesso
  useEffect(() => {
    servicoSessao.contaLogada().then((logada) => setPerfil(logada?.perfil ?? null));
  }, []);

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensagem(null);

    const problemaNaSenha = servicoSenha.validarNova(campos.senha, campos.confirmacao, 'A nova senha');
    if (problemaNaSenha) return setMensagem(problemaNaSenha);
    if (!campos.dataNascimento) return setMensagem('Informe sua data de nascimento.');
    if (!emailValido(campos.email)) return setMensagem('Informe um e-mail válido.');

    setSalvando(true);
    const resultado = await servicoSenha.concluirPrimeiroAcesso(campos.senha, campos.dataNascimento, campos.email);
    if (resultado.status !== StatusProcessamento.Sucesso) {
      setSalvando(false);
      return setMensagem(resultado.mensagem);
    }
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

  // Data local (a mesma regra do "Meu perfil"): em UTC, depois das 21h já seria amanhã
  const hoje = hojeLocal();

  return (
    <CartaoDeAcesso>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo(a)!</h1>
      <p className="text-gray-600 mb-6">
        Este é o seu primeiro acesso. Crie uma senha só sua e complete seus dados para ver o material das aulas.
      </p>

      <AlertaDeAcesso mensagem={mensagem} />

      <form onSubmit={aoEnviar} className="space-y-6">
        <CamposDeNovaSenha
          senha={campos.senha}
          confirmacao={campos.confirmacao}
          aoAlterar={aoAlterarCampo}
          rotuloDaConfirmacao="Repita a nova senha *"
          dica={<p className="mt-1 text-xs text-gray-500">Diferente da senha padrão, e com:</p>}
        />
        <div>
          <label htmlFor="dataNascimento" className="block text-sm font-medium text-gray-700 mb-2">
            Data de nascimento *
          </label>
          <input
            id="dataNascimento"
            name="dataNascimento"
            type="date"
            required
            max={hoje}
            autoComplete="bday"
            value={campos.dataNascimento}
            onChange={aoAlterarCampo}
            className={classeCampoDeAcesso}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Seu e-mail *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={campos.email}
            onChange={aoAlterarCampo}
            className={classeCampoDeAcesso}
            placeholder="Ex: maria@email.com"
          />
        </div>
        <button type="submit" disabled={salvando} className={classeBotaoDeAcesso(salvando)}>
          {salvando ? 'Salvando...' : 'SALVAR E ENTRAR'}
        </button>
      </form>
    </CartaoDeAcesso>
  );
};

export default PrimeiroAcesso;
