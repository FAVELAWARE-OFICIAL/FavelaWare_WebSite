-- Área do aluno: login com o "login" da planilha (nome.sobrenome) + senha padrão,
-- troca obrigatória no primeiro acesso (com data de nascimento e e-mail), e
-- material organizado em trilhas (links), mantido por gestor e professores.
--
-- Como o Supabase Auth exige e-mail, a conta do aluno usa um e-mail interno
-- <login>@aluno.favelaware.invalid (".invalid" é reservado: nunca recebe mensagem).
-- As contas são criadas pela Edge Function "acessos-alunos" (só gestor).

-- ============================================
-- Aluno ligado à conta de login
-- ============================================
alter table public.perfis
  add column participante_id bigint unique references public.participantes (id) on delete set null,
  add column precisa_trocar_senha boolean not null default false;

-- Dados que o aluno preenche no primeiro acesso
alter table public.participantes
  add column data_nascimento date check (data_nascimento between '1900-01-01' and current_date),
  add column email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- ============================================
-- Funções de permissão
-- ============================================
-- Aluno com conta ligada a um aluno da turma (quem se cadastra sozinho não entra)
create function private.eh_aluno_matriculado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'aluno' and participante_id is not null
  );
$$;

-- Gestor ou professor
create function private.eh_equipe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel in ('gestor', 'professor')
  );
$$;

-- O aluno ligado à conta de quem está logado (nulo se não for aluno)
create function private.meu_participante()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select participante_id from public.perfis where id = (select auth.uid());
$$;

revoke execute on function private.eh_aluno_matriculado(), private.eh_equipe(), private.meu_participante() from public, anon;
grant execute on function private.eh_aluno_matriculado(), private.eh_equipe(), private.meu_participante() to authenticated;

-- O aluno lê a própria ficha (nome, turma, dados do primeiro acesso)
drop policy "le participantes" on public.participantes;
create policy "le participantes" on public.participantes for select to authenticated
  using (
    (select private.eh_gestor())
    or turma_id in (select private.minhas_turmas())
    or id = (select private.meu_participante())
  );

-- ============================================
-- Primeiro acesso: o aluno grava data de nascimento e e-mail e libera a conta.
-- (A senha nova é trocada antes, pelo próprio Supabase Auth.)
-- ============================================
create function public.concluir_primeiro_acesso(p_data_nascimento date, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participante bigint;
begin
  select participante_id into v_participante
  from public.perfis
  where id = (select auth.uid()) and papel = 'aluno' and participante_id is not null;

  if v_participante is null then
    raise exception 'Conta sem aluno ligado' using errcode = '42501';
  end if;

  update public.participantes
  set data_nascimento = p_data_nascimento, email = lower(trim(p_email))
  where id = v_participante;

  update public.perfis set precisa_trocar_senha = false where id = (select auth.uid());
end;
$$;

revoke execute on function public.concluir_primeiro_acesso(date, text) from public, anon;
grant execute on function public.concluir_primeiro_acesso(date, text) to authenticated;

-- ============================================
-- Trilhas e materiais
-- ============================================
create table public.trilhas (
  id        bigint generated always as identity primary key,
  nome      text not null unique check (length(trim(nome)) between 1 and 80),
  descricao text check (length(descricao) <= 300),
  ordem     integer not null default 0,
  criado_em timestamptz not null default now()
);

create table public.materiais (
  id        bigint generated always as identity primary key,
  trilha_id bigint not null references public.trilhas (id) on delete cascade,
  titulo    text not null check (length(trim(titulo)) between 1 and 120),
  descricao text check (length(descricao) <= 300),
  -- Só link seguro (https): evita javascript: e afins
  url       text not null check (url ~* '^https://[^\s]+$' and length(url) <= 2000),
  ordem     integer not null default 0,
  criado_em timestamptz not null default now()
);
create index materiais_trilha_id_idx on public.materiais (trilha_id);

alter table public.trilhas enable row level security;
alter table public.materiais enable row level security;
revoke all on public.trilhas, public.materiais from anon, authenticated;
grant select, delete on public.trilhas, public.materiais to authenticated;
grant insert (nome, descricao, ordem), update (nome, descricao, ordem) on public.trilhas to authenticated;
grant insert (trilha_id, titulo, descricao, url, ordem), update (trilha_id, titulo, descricao, url, ordem) on public.materiais to authenticated;

-- Leitura: equipe e alunos matriculados. Escrita: equipe (gestor e professores).
create policy "le trilhas" on public.trilhas for select to authenticated
  using ((select private.eh_equipe()) or (select private.eh_aluno_matriculado()));
create policy "equipe cria trilha" on public.trilhas for insert to authenticated with check ((select private.eh_equipe()));
create policy "equipe edita trilha" on public.trilhas for update to authenticated
  using ((select private.eh_equipe())) with check ((select private.eh_equipe()));
create policy "equipe apaga trilha" on public.trilhas for delete to authenticated using ((select private.eh_equipe()));

create policy "le materiais" on public.materiais for select to authenticated
  using ((select private.eh_equipe()) or (select private.eh_aluno_matriculado()));
create policy "equipe cria material" on public.materiais for insert to authenticated with check ((select private.eh_equipe()));
create policy "equipe edita material" on public.materiais for update to authenticated
  using ((select private.eh_equipe())) with check ((select private.eh_equipe()));
create policy "equipe apaga material" on public.materiais for delete to authenticated using ((select private.eh_equipe()));

-- Trilhas iniciais (os conteúdos do curso) e os links que hoje estão no site
insert into public.trilhas (nome, ordem) values
  ('Materiais gerais', 1),
  ('Carreira Tech', 2),
  ('Mídias Digitais', 3),
  ('Inclusão: Mundo Digital', 4),
  ('Pensamento Lógico', 5),
  ('Lógica Básica', 6),
  ('Low Code', 7),
  ('App Inventor e Bubble.io', 8),
  ('Git e GitHub', 9),
  ('Desenvolvimento de Projeto', 10);

insert into public.materiais (trilha_id, titulo, descricao, url, ordem)
select id, 'FavelaWare - 3ª Edição', 'Materiais completos da terceira edição do curso (Google Drive)',
       'https://drive.google.com/drive/folders/1S4jR80qAN6IAeQv-HlzOxzyv1_-FA4hs?usp=sharing', 1
from public.trilhas where nome = 'Materiais gerais'
union all
select id, 'Documentação GitBook', 'Documentação técnica e tutoriais interativos',
       'https://favelaware.gitbook.io/favelaware/', 2
from public.trilhas where nome = 'Materiais gerais';
