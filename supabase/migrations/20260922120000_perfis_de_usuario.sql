-- Perfis de usuário: cada conta do Supabase Auth tem um papel no FavelaWare.
--   aluno     -> padrão de toda conta nova
--   professor -> dá aula
--   gestor    -> administra o projeto (único que muda papel de alguém)

create type public.papel_usuario as enum ('aluno', 'professor', 'gestor');

create table public.perfis (
  id        uuid primary key references auth.users (id) on delete cascade,
  nome      text,
  papel     public.papel_usuario not null default 'aluno',
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

-- Diz se quem está logado é gestor. security definer para ler "perfis" sem
-- cair de novo na RLS da própria tabela (evita recursão infinita nas políticas).
create function public.eh_gestor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'gestor'
  );
$$;

revoke execute on function public.eh_gestor() from public, anon;
grant execute on function public.eh_gestor() to authenticated;

-- Cada um lê o próprio perfil; gestor lê todos
create policy "ler o proprio perfil ou gestor le todos"
  on public.perfis for select to authenticated
  using (id = (select auth.uid()) or (select public.eh_gestor()));

-- Só gestor altera perfis (inclusive o papel). Sem política de insert/delete:
-- quem cria o perfil é o gatilho abaixo, e quem apaga é o on delete cascade.
create policy "gestor altera perfis"
  on public.perfis for update to authenticated
  using ((select public.eh_gestor()))
  with check ((select public.eh_gestor()));

-- Toda conta nova ganha um perfil de aluno. O papel NUNCA vem dos metadados
-- do cadastro: esses o próprio usuário controla, e daria para se autopromover.
create function public.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, new.raw_user_meta_data ->> 'nome');
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_para_novo_usuario();

-- Contas que já existiam antes desta migration também ganham perfil
insert into public.perfis (id)
select id from auth.users
on conflict (id) do nothing;
