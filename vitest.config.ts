import { defineConfig } from 'vitest/config';

// Testes das regras puras e dos serviços (com o cliente Supabase substituído por um falso)
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'chave-de-teste',
    },
  },
});
