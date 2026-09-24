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
import CamposDeNovaSenha from '../components/CamposDeNovaSenha';
import CartaoDeAcesso, { AlertaDeAcesso } from '../components/CartaoDeAcesso';
import { classeBotaoDeAcesso } from '../components/estilosDeAcesso';
import { useCampos } from '../hooks/useCampos';
import { servicoSenha } from '../lib/senha';
import { servicoSessao } from '../lib/sessao';
import { StatusProcessamento } from '../types';

const DefinirSenha: React.FC = () => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<'verificando' | 'pronto' | 'sem-convite'>('verificando');
  const { campos, aoAlterarCampo } = useCampos({ senha: '', confirmacao: '' });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  // O cliente do Supabase troca o link do e-mail por uma sessão logo ao carregar
  useEffect(() => {
    let ativo = true;
    servicoSessao.contaAtual().then((conta) => {
      if (ativo) setEstado(conta ? 'pronto' : 'sem-convite');
    });
    const pararDeOuvir = servicoSessao.aoIniciar(() => ativo && setEstado('pronto'));
    return () => {
      ativo = false;
      pararDeOuvir();
    };
  }, []);

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensagem(null);

    const problema = servicoSenha.validarNova(campos.senha, campos.confirmacao);
    if (problema) {
      setMensagem(problema);
      return;
    }

    setSalvando(true);
    const { resultado, destino } = await servicoSenha.definirPeloConvite(campos.senha);
    if (resultado.status !== StatusProcessamento.Sucesso) {
      setSalvando(false);
      setMensagem(resultado.mensagem);
      return;
    }
    navigate(destino, { replace: true });
  };

  return (
    <CartaoDeAcesso>
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

          <AlertaDeAcesso mensagem={mensagem} />

          <form onSubmit={aoEnviar} className="space-y-6">
            <CamposDeNovaSenha
              senha={campos.senha}
              confirmacao={campos.confirmacao}
              aoAlterar={aoAlterarCampo}
              rotuloDaConfirmacao="Repita a senha *"
            />
            <button type="submit" disabled={salvando} className={classeBotaoDeAcesso(salvando)}>
              {salvando ? 'Salvando...' : 'SALVAR SENHA E ENTRAR'}
            </button>
          </form>
        </>
      )}
    </CartaoDeAcesso>
  );
};

export default DefinirSenha;
