// Conventional Commits: o mesmo padrão que o workflow validate-merge-source
// exige no título do PR. Validado localmente pelo hook .husky/commit-msg.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Mensagens em português usam maiúscula em nome próprio e sigla
    // (RLS, Supabase, FavelaWare); a regra padrão reprovaria isso.
    'subject-case': [0],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
