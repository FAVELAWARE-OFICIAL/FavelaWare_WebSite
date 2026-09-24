/**
 * ============================================
 * LIMITE DE ERRO DAS PÁGINAS
 * ============================================
 *
 * Se uma página quebrar ao carregar, mostra uma tela com saída (recarregar ou
 * voltar ao site) em vez da tela branca. Quando o motivo é o .env.local sem as
 * chaves do Supabase (comum ao rodar o projeto pela primeira vez), explica
 * como resolver.
 *
 * Precisa ser classe: o React só captura erro de renderização com
 * componentDidCatch / getDerivedStateFromError.
 */
import { Component, type ReactNode } from 'react';

import { ErroDeConfiguracao } from '../config';
import { LOGO } from '../data/imagens';

interface Estado {
  erro: Error | null;
}

class LimiteDeErro extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error) {
    console.error('[página] falha ao abrir', erro.message);
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;
    const faltaConfiguracao = erro instanceof ErroDeConfiguracao;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
        <div role="alert" className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl md:p-10">
          <img src={LOGO} alt="Logo FavelaWare" className="mx-auto mb-6 w-40 object-contain" />
          {faltaConfiguracao ? (
            <>
              <h1 className="mb-3 text-2xl font-bold text-gray-900">Falta configurar o Supabase</h1>
              <p className="mb-4 text-gray-600">
                Crie o arquivo <code className="rounded bg-gray-100 px-1.5 py-0.5">.env.local</code> na raiz do projeto
                (copie o <code className="rounded bg-gray-100 px-1.5 py-0.5">.env.example</code>) com a URL e a chave
                publicável do Supabase, e reinicie o{' '}
                <code className="rounded bg-gray-100 px-1.5 py-0.5">npm run dev</code>.
              </p>
              <p className="mb-6 text-sm text-gray-500">
                As duas ficam no painel do Supabase, em Project Settings › API Keys.
              </p>
            </>
          ) : (
            <>
              <h1 className="mb-3 text-2xl font-bold text-gray-900">Não foi possível abrir esta página</h1>
              <p className="mb-6 text-gray-600">Recarregue a página. Se continuar, volte ao início e tente de novo.</p>
            </>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#8bc53f] px-6 py-3 font-bold text-[#2d2a5f] shadow-md transition-colors hover:bg-[#7ab52f] focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 focus-visible:ring-offset-2"
            >
              Recarregar
            </button>
            <a
              href="/"
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500"
            >
              Voltar ao site
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default LimiteDeErro;
