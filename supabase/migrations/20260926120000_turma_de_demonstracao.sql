-- Turma de demonstração: a conta que alterna papéis ("Ver como") testa o portal de
-- verdade — entregar como aluno, corrigir como professor — sem mexer nas turmas
-- reais (chamada, contagens e gráficos das edições reais não mudam).
--
-- - Uma edição marcada como demonstração (ordem 0: nunca é a edição padrão do painel,
--   que abre na de ordem mais alta), com uma turma e um aluno fictício.
-- - Ao trocar para "aluno", a conta passa a ser esse aluno; ao trocar para outro
--   papel, deixa de ser. Ao trocar para "professor", também leciona na turma demo.
-- - A turma demo recebe cópias das atividades da edição mais recente (prazo longo).
--   ATENÇÃO: é uma cópia feita uma vez, com prazo de 90 dias a partir desta migration.
--   Depois disso, a entrega de teste fica "encerrada": o gestor edita o prazo (ou cria
--   atividades novas) na turma "Turma Única · Edição de demonstração", em Trilhas.

alter table public.edicoes add column demonstracao boolean not null default false;
create unique index edicoes_uma_demonstracao on public.edicoes (demonstracao) where demonstracao;

do $$
declare
  v_edicao bigint;
  v_turma bigint;
  v_turma_real bigint;
begin
  insert into public.edicoes (nome, ordem, arquivo_origem, demonstracao)
  values ('Edição de demonstração', 0, 'demonstracao', true)
  on conflict (nome) do nothing;
  select id into v_edicao from public.edicoes where demonstracao;

  if not exists (select 1 from public.turmas where edicao_id = v_edicao) then
    insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma Única') returning id into v_turma;
    insert into public.participantes (edicao_id, turma_id, funcao, nome, login)
    values (v_edicao, v_turma, 'aluno', 'Aluno Demonstração', 'aluno.demonstracao');

    -- Cópia das atividades da turma mais recente (edição de maior ordem), com prazo longo
    select t.id into v_turma_real
    from public.turmas t join public.edicoes e on e.id = t.edicao_id
    where not e.demonstracao
    order by e.ordem desc, t.id
    limit 1;
    insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo)
    select v_turma, trilha_id, titulo, enunciado, now() + interval '90 days'
    from public.atividades
    where turma_id = v_turma_real;
  end if;
end $$;

-- O aluno fictício da demonstração
create function private.aluno_de_demonstracao()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.participantes p
  join public.edicoes e on e.id = p.edicao_id
  where e.demonstracao and p.funcao = 'aluno'
  order by p.id
  limit 1;
$$;
revoke execute on function private.aluno_de_demonstracao() from public, anon, authenticated;

create or replace function public.alternar_papel(p_papel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edicao bigint;
  v_aluno bigint;
begin
  if p_papel not in ('gestor', 'professor', 'aluno') then
    raise exception 'Papel inválido' using errcode = '22023';
  end if;

  if not exists (select 1 from public.perfis where id = (select auth.uid()) and pode_alternar_papel) then
    raise exception 'Esta conta não pode alternar papéis' using errcode = '42501';
  end if;

  -- Como aluno, a conta passa a ser o aluno da turma de demonstração (entrega de
  -- verdade, só na turma demo); em outro papel, deixa de ser
  v_aluno := case when p_papel = 'aluno' then private.aluno_de_demonstracao() end;
  if v_aluno is not null and exists (
    select 1 from public.perfis where participante_id = v_aluno and id <> (select auth.uid())
  ) then
    raise exception 'O aluno de demonstração já está em uso por outra conta' using errcode = '22023';
  end if;

  update public.perfis
  set papel = p_papel::public.papel_usuario, precisa_trocar_senha = false, participante_id = v_aluno
  where id = (select auth.uid());

  if p_papel = 'professor' then
    -- Professor sem turma não vê nada: vincula às turmas da edição mais recente
    if not exists (select 1 from public.professores_turmas where professor_id = (select auth.uid())) then
      select id into v_edicao from public.edicoes where not demonstracao order by ordem desc limit 1;
      insert into public.professores_turmas (professor_id, turma_id)
      select (select auth.uid()), t.id from public.turmas t where t.edicao_id = v_edicao
      on conflict do nothing;
    end if;
    -- E sempre na turma de demonstração (para corrigir as entregas de teste)
    insert into public.professores_turmas (professor_id, turma_id)
    select (select auth.uid()), t.id
    from public.turmas t join public.edicoes e on e.id = t.edicao_id
    where e.demonstracao
    on conflict do nothing;
  end if;
end;
$$;
