/**
 * ============================================
 * CONFIGURAÇÃO DO TAILWIND CSS
 * ============================================
 *
 * Este arquivo configura o Tailwind CSS, um framework de CSS
 * que permite estilizar elementos usando classes pré-definidas.
 *
 * Conceitos importantes:
 * - Tailwind usa classes utilitárias (ex: "bg-blue-500", "text-white")
 * - Podemos personalizar cores, animações e estilos
 * - Este arquivo define as customizações do projeto FavelaWare
 */

/** @type {import('tailwindcss').Config} */
export default {
  // Define onde o Tailwind deve procurar por classes CSS
  content: [
    "./index.html",              // Arquivo HTML principal
    "./src/**/*.{js,ts,jsx,tsx}", // Todos os arquivos dentro de src
  ],

  // Configurações de tema (cores, fontes, animações, etc)
  theme: {
    extend: {
      // Cores customizadas do projeto FavelaWare
      colors: {
        // Paleta de verdes (cor principal do projeto)
        'favela-green': {
          50: '#f0fdf4',    // Verde muito claro
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#8bc53f',   // Verde principal (usado no logo)
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',   // Verde escuro
        },
        // Paleta de azuis (cor secundária)
        'favela-blue': {
          500: '#3b82f6',   // Azul padrão
          600: '#2563eb',   // Azul médio
          700: '#1e3a8a',   // Azul escuro
        },
        // Paleta de roxos (cor do navbar e headers)
        'favela-purple': {
          500: '#8b5cf6',   // Roxo claro
          600: '#7c3aed',   // Roxo médio
        },
        // Paleta de rosas (cor de destaque)
        'favela-pink': {
          500: '#ec4899',   // Rosa vibrante
          600: '#db2777',   // Rosa escuro
        },
      },

      // Animações customizadas
      animation: {
        // Animação de flutuação (movimento para cima e baixo)
        'float': 'float 3s ease-in-out infinite',

        // Pulsação lenta (usado em elementos de fundo)
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',

        // Gradiente animado (usado em fundos com cores)
        'gradient': 'gradient 8s linear infinite',
      },

      // Define como as animações funcionam
      keyframes: {
        // Animação de flutuação: move o elemento para cima e volta
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },    // Posição inicial e final
          '50%': { transform: 'translateY(-20px)' },       // Posição no meio (20px acima)
        },
        // Animação de gradiente: move a posição do fundo
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },    // Posição inicial e final
          '50%': { backgroundPosition: '100% 50%' },       // Posição no meio
        },
      },
    },
  },

  // Plugins adicionais (nenhum usado neste projeto)
  plugins: [],
}
