-- Endurece o acesso a "perfis" (apontado pelo "supabase db advisors"):
-- 1. As funções security definer estavam no schema public, que a API expõe como
--    /rest/v1/rpc/<funcao>. Elas vão para o schema "private", que a API não expõe.
-- 2. Privilégio mínimo na tabela: anon não toca em nada; authenticated só lê e
--    altera nome/papel (nunca o id). A RLS continua decidindo QUAIS linhas.

create schema if not exists private;

-- authenticated precisa enxergar o schema para as políticas chamarem eh_gestor()
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- As políticas e o gatilho apontam para a função, não para o nome: seguem funcionando
alter function public.eh_gestor() set schema private;
alter function public.criar_perfil_para_novo_usuario() set schema private;

-- eh_gestor: só usuário logado (as políticas rodam com o papel de quem consulta)
revoke execute on function private.eh_gestor() from public, anon;
grant execute on function private.eh_gestor() to authenticated;

-- Função do gatilho: ninguém chama direto, só o próprio gatilho em auth.users
revoke execute on function private.criar_perfil_para_novo_usuario() from public, anon, authenticated;

revoke all on table public.perfis from anon, authenticated;
grant select on table public.perfis to authenticated;
grant update (nome, papel) on table public.perfis to authenticated;
