/**
 * ============================================
 * ARQUIVO DE ENTRADA DA APLICAÇÃO (main.jsx)
 * ============================================
 *
 * Este é o primeiro arquivo JavaScript executado quando o site carrega.
 * Ele "conecta" nossa aplicação React ao HTML.
 *
 * O que acontece aqui:
 * 1. Importamos as ferramentas do React
 * 2. Importamos nossos estilos CSS
 * 3. Importamos o componente principal (App)
 * 4. Renderizamos tudo na página
 */

// Importa o StrictMode do React (ajuda a detectar problemas durante o desenvolvimento)
import { StrictMode } from 'react';

// Importa a função que permite renderizar componentes React no HTML
import { createRoot } from 'react-dom/client';

// Importa os estilos globais da aplicação (Tailwind CSS)
import './index.css';

// Importa o componente principal da aplicação
import App from './App.jsx';

/**
 * RENDERIZAÇÃO DA APLICAÇÃO
 *
 * createRoot: cria um ponto de entrada para o React no HTML
 * - Procura o elemento com id="root" no index.html
 * - Esse elemento será o "container" de toda a aplicação
 *
 * StrictMode: modo de desenvolvimento do React
 * - Ativa verificações extras e avisos
 * - Ajuda a encontrar problemas no código
 * - Não afeta a aplicação em produção
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
