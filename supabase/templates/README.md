# Templates de e-mail do Auth

Modelos dos e-mails que o Supabase Auth envia, com a identidade do FavelaWare. O envio é do próprio Supabase (SMTP personalizado do Gmail), sem Edge Function.

Para aplicar: **Authentication → Emails → Modelos**, abra cada tipo, cole o assunto e o HTML do arquivo e salve.

| Tipo no painel        | Arquivo                   | Assunto                           | Quem dispara                                         |
| --------------------- | ------------------------- | --------------------------------- | ---------------------------------------------------- |
| Invite user           | `convite.html`            | Seu convite para o FavelaWare     | `convidar-professor` (`inviteUserByEmail`)           |
| Magic link            | `link-magico.html`        | Seu link de acesso ao FavelaWare  | Login por link (`signInWithOtp` em `src/lib/sessao.ts`) |
| Reset password        | `redefinir-senha.html`    | Redefina sua senha do FavelaWare  | Pedido de redefinição de senha                       |
| Confirm signup        | `confirmar-cadastro.html` | Confirme seu e-mail no FavelaWare | Cadastro com confirmação de e-mail                   |
| Change email address  | `trocar-email.html`       | Confirme seu novo e-mail          | Troca de e-mail da conta                             |
| Reauthentication      | `reautenticacao.html`     | Seu código de confirmação         | Ação sensível que pede reautenticação (código, sem link) |

## Variáveis usadas

- `{{ .ConfirmationURL }}`: o link de ação (botão e link de reserva).
- `{{ .Data.nome }}`: nome gravado no metadado da conta (o convite grava). Sem nome, a saudação fica "Olá.".
- `{{ .Email }}` e `{{ .NewEmail }}`: só no de troca de e-mail.
- `{{ .Token }}`: só no de reautenticação, que mostra o código de 6 dígitos no lugar do botão.

A logo vem com endereço fixo do site de teste na Hostinger (`https://lightgrey-goldfish-807416.hostingersite.com/imgs/logo/logo.png`). Quando o site ganhar domínio próprio, troque esse endereço nos seis arquivos.

Os seis arquivos compartilham o mesmo esqueleto. Ao mudar cabeçalho, rodapé ou cores, mude em todos.
