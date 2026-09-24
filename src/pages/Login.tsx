/**
 * ============================================
 * PÁGINA LOGIN
 * ============================================
 *
 * Tela de acesso à área restrita do FavelaWare.
 *
 * Estrutura (split screen):
 * - Lado esquerdo (só em telas grandes): painel verde da marca com logo e boas-vindas
 * - Lado direito: formulário de email e senha
 *
 * O login usa o Supabase Auth (email + senha), pelo serviço de sessão em src/lib/sessao.ts.
 *
 * Conceitos importantes:
 * - useState: guarda informações que mudam na tela (o que foi digitado, se está carregando)
 * - Formulário controlado: o valor do input vem do estado do React, não do HTML
 * - Link do React Router: navega sem recarregar a página
 */

// Importa o hook de estado do React
import { useEffect, useState } from 'react';

// Importa ferramentas de animação do Framer Motion
import { motion } from 'framer-motion';

// Importa o Link para voltar ao site sem recarregar a página
import { Link, useNavigate } from 'react-router-dom';

// E-mail oficial (fonte única em src/data/contato.ts)
import { email } from '../data/contato';

import { classeBotaoDeAcesso, classeCampoDeAcesso } from '../components/estilosDeAcesso';

// Sessão (entrar e descobrir a área de cada papel)
import { servicoSessao } from '../lib/sessao';
import { TAMANHO_MINIMO_SENHA } from '../lib/senha';
import { StatusProcessamento } from '../types';
import { FUNDO_DA_MARCA, LOGO } from '../data/imagens';

/**
 * COMPONENTE LOGIN
 * Exibe o formulário de acesso do usuário
 */
const Login: React.FC = () => {
  // Leva para a área certa depois do login
  const navigate = useNavigate();

  // ============================================
  // ESTADOS DA TELA
  // ============================================

  // Guarda o que o usuário digitou nos campos
  const [campos, setCampos] = useState({
    email: '',
    senha: '',
    lembrarDeMim: false,
  });

  // Controla se a senha aparece como texto (olho aberto) ou escondida
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Fica true enquanto o "login" está sendo processado (trava o botão)
  const [carregando, setCarregando] = useState(false);
  const [enviandoLink, setEnviandoLink] = useState(false);

  // Mensagem de retorno mostrada acima do formulário
  const [mensagem, setMensagem] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  // ============================================
  // FUNÇÕES
  // ============================================

  /**
   * Atualiza o estado sempre que o usuário digita ou marca o checkbox.
   * Usa event.target.name para saber QUAL campo mudou, assim uma função
   * só atende todos os campos do formulário.
   */
  const aoAlterarCampo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setCampos((anterior) => ({
      ...anterior, // mantém os outros campos como estavam
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /** Link de acesso por e-mail (sem senha): a banca avaliadora entra assim */
  const enviarLink = async () => {
    setMensagem(null);
    setEnviandoLink(true);
    const resultado = await servicoSessao.enviarLinkDeAcesso(campos.email);
    setEnviandoLink(false);
    setMensagem(
      resultado.status === StatusProcessamento.Sucesso
        ? { tipo: 'sucesso', texto: 'Se houver uma conta com esse e-mail, o link de acesso chega em instantes.' }
        : { tipo: 'erro', texto: resultado.mensagem ?? 'Não foi possível enviar o link.' },
    );
  };

  // Voltou pelo link do e-mail (ou já estava logado): vai direto para a própria área
  useEffect(() => {
    const irParaArea = () =>
      servicoSessao
        .contaLogada()
        .then((l) => {
          const destino = l ? servicoSessao.destinoDoPerfil(l.perfil) : null;
          if (destino) navigate(destino, { replace: true });
        })
        .catch((e) => console.error('[login] sessão do link', e?.message));
    irParaArea();
    return servicoSessao.aoIniciar(irParaArea);
  }, [navigate]);

  /**
   * Envia o formulário.
   * event.preventDefault() impede o navegador de recarregar a página.
   */
  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensagem(null);

    // Validação simples antes de "enviar"
    if (!campos.email.trim() || !campos.senha.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o e-mail (ou login) e a senha para continuar.' });
      return;
    }

    // Só o tamanho: a política completa vale ao criar a senha (o servidor confere a senha em si)
    if (campos.senha.length < TAMANHO_MINIMO_SENHA) {
      setMensagem({
        tipo: 'erro',
        texto: `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`,
      });
      return;
    }

    setCarregando(true);

    // Aluno digita o login (nome.sobrenome); a equipe, o e-mail
    const { resultado, destino } = await servicoSessao.entrar(campos.email, campos.senha, campos.lembrarDeMim);

    if (resultado.status !== StatusProcessamento.Sucesso) {
      setCarregando(false);
      setMensagem({ tipo: 'erro', texto: resultado.mensagem! });
      return;
    }

    // Cada papel tem sua área (gestor, professor, aluno — ou o primeiro acesso do aluno)
    if (destino) {
      navigate(destino, { replace: true });
      return;
    }

    setCarregando(false);
    setMensagem({
      tipo: 'sucesso',
      texto: 'Login feito, mas esta conta ainda não está ligada a uma turma. Fale com a coordenação.',
    });
  };

  // ============================================
  // ANIMAÇÕES
  // ============================================

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  // ============================================
  // RENDERIZAÇÃO DO COMPONENTE
  // ============================================

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ============================================
          LADO ESQUERDO: PAINEL DA MARCA
          Escondido no celular (hidden) para sobrar espaço ao formulário
          ============================================ */}
      {/* O verde sólido do bg- é só cor de reserva, caso a imagem não carregue */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#8bc53f]"
        style={{
          // Banner oficial do FavelaWare: foto da comunidade com código binário.
          // É o mesmo fundo do Hero da home, usado aqui em opacidade cheia.
          backgroundImage: `url('${FUNDO_DA_MARCA}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Véu escuro suave: escurece a base da imagem para o texto branco
            ter contraste suficiente por cima da foto (WCAG) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2d2a5f]/70 via-[#2d2a5f]/20 to-transparent" />

        {/* Conteúdo do painel (z-10 deixa por cima da textura) */}
        <div className="relative z-10 flex flex-col justify-center items-start p-12 xl:p-16 w-full">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <img src={LOGO} alt="Logo FavelaWare" className="w-64 object-contain mb-8 drop-shadow-2xl" />

            {/* Texto branco com sombra: o painel agora é uma foto, então a sombra
                garante contraste independente do trecho da imagem que ficar atrás */}
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
              BEM-VINDO DE VOLTA
            </h1>

            <p className="text-lg text-white max-w-md mb-10 drop-shadow-md">
              Acesse sua conta para ver os materiais das aulas e acompanhar suas atividades.
            </p>

            {/* Caminho de volta para o site público */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-white/95 text-[#2d2a5f] font-bold px-5 py-3 rounded-xl shadow-lg hover:bg-white hover:gap-3 transition-all"
            >
              <span aria-hidden="true">‹</span> Voltar ao site
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ============================================
          LADO DIREITO: FORMULÁRIO
          ============================================ */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 sm:px-6 py-12">
        <motion.div {...fadeInUp} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10">
          {/* Logo pequeno: aparece só no celular, já que o painel verde está escondido */}
          <div className="lg:hidden text-center mb-6">
            <img src={LOGO} alt="Logo FavelaWare" className="w-40 object-contain mx-auto" />
          </div>

          {/* Título do card */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Entrar</h2>
            <p className="text-gray-600">Use o email e a senha da sua conta FavelaWare.</p>
            <div className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 rounded-full mt-4" />
          </div>

          {/* Mensagem de feedback (erro ou sucesso) */}
          {mensagem && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className={`mb-6 p-4 rounded-lg ${
                mensagem.tipo === 'sucesso'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {mensagem.texto}
            </motion.div>
          )}

          {/* Formulário */}
          <form onSubmit={aoEnviar} className="space-y-6">
            {/* Campo: e-mail (gestor e professor) ou login da turma (aluno: nome.sobrenome) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mail ou login *
              </label>
              <input
                type="text"
                id="email"
                name="email"
                value={campos.email}
                onChange={aoAlterarCampo}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                className={classeCampoDeAcesso}
                placeholder="Ex: maria.silva ou maria@email.com"
              />
            </div>

            {/* Campo: Senha (com botão para mostrar/ocultar) */}
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                Senha *
              </label>
              <div className="relative">
                <input
                  // O type muda conforme o estado: "text" mostra a senha, "password" esconde
                  type={mostrarSenha ? 'text' : 'password'}
                  id="senha"
                  name="senha"
                  value={campos.senha}
                  onChange={aoAlterarCampo}
                  autoComplete="current-password"
                  required
                  className={`${classeCampoDeAcesso} pr-14`}
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center rounded-lg text-xl hover:bg-gray-100 focus:ring-2 focus:ring-favela-green-500 transition-all"
                >
                  <span aria-hidden="true">{mostrarSenha ? '🙈' : '👁️'}</span>
                </button>
              </div>
            </div>

            {/* Linha: lembrar de mim + esqueci a senha */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="lembrarDeMim" className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  id="lembrarDeMim"
                  name="lembrarDeMim"
                  checked={campos.lembrarDeMim}
                  onChange={aoAlterarCampo}
                  className="w-4 h-4 rounded border-gray-300 text-favela-green-500 focus:ring-2 focus:ring-favela-green-500"
                />
                Lembrar de mim
              </label>

              {/* Sem backend ainda: abre um e-mail para a equipe pedir a recuperação da senha */}
              <a
                href={`mailto:${email}?subject=Recupera%C3%A7%C3%A3o%20de%20senha`}
                className="text-sm font-medium text-favela-green-600 hover:text-favela-green-700 hover:underline transition-all"
              >
                Esqueci minha senha
              </a>
            </div>

            {/* Botão de envio */}
            <motion.button
              type="submit"
              disabled={carregando}
              whileHover={{ scale: carregando ? 1 : 1.02 }}
              whileTap={{ scale: carregando ? 1 : 0.98 }}
              className={classeBotaoDeAcesso(carregando)}
            >
              {carregando ? (
                <span className="flex items-center justify-center">
                  {/* Spinner: círculo girando enquanto processa */}
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Entrando...
                </span>
              ) : (
                'ENTRAR'
              )}
            </motion.button>
          </form>

          {/* Banca avaliadora (e quem preferir): entra por um link no e-mail, sem senha */}
          <div className="mt-6 text-center">
            <button
              type="button"
              disabled={enviandoLink}
              onClick={enviarLink}
              className="rounded text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 disabled:opacity-60"
            >
              {enviandoLink ? 'Enviando o link…' : 'Receber um link de acesso no e-mail (sem senha)'}
            </button>
          </div>

          {/* Caminho de volta no celular (no desktop ele fica no painel verde) */}
          <div className="lg:hidden text-center mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-favela-green-600 transition-all"
            >
              <span aria-hidden="true">‹</span> Voltar ao site
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Exporta o componente para ser usado nas rotas (App.tsx)
export default Login;
