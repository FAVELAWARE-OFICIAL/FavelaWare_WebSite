-- Leitura mais rápida: cada tabela tinha DUAS políticas de leitura (gestor e
-- professor), e o Postgres avalia as duas. A do professor em presencas chamava
-- uma função para CADA linha, até quando quem lia era o gestor (~3 mil chamadas
-- por edição). Agora há uma política por tabela, e o acesso do professor vira
-- um conjunto calculado uma vez por consulta (turma_id in (...)).

-- Turmas e aulas do professor logado (vazio se não for professor)
create function private.minhas_turmas()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select pt.turma_id
  from public.professores_turmas pt
  join public.perfis pf on pf.id = pt.professor_id
  where pt.professor_id = (select auth.uid()) and pf.papel = 'professor';
$$;

create function private.minhas_aulas()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select a.id from public.aulas a where a.turma_id in (select private.minhas_turmas());
$$;

create function private.minhas_edicoes()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select t.edicao_id from public.turmas t where t.id in (select private.minhas_turmas());
$$;

revoke execute on function private.minhas_turmas(), private.minhas_aulas(), private.minhas_edicoes() from public, anon;
grant execute on function private.minhas_turmas(), private.minhas_aulas(), private.minhas_edicoes() to authenticated;

-- ============================================
-- Uma política de leitura por tabela: gestor lê tudo; professor, o que é dele
-- ============================================
drop policy "gestor le" on public.edicoes;
drop policy "professor le as edicoes dele" on public.edicoes;
create policy "le edicoes" on public.edicoes for select to authenticated
  using ((select private.eh_gestor()) or id in (select private.minhas_edicoes()));

drop policy "gestor le" on public.turmas;
drop policy "professor le as turmas dele" on public.turmas;
create policy "le turmas" on public.turmas for select to authenticated
  using ((select private.eh_gestor()) or id in (select private.minhas_turmas()));

drop policy "gestor le" on public.participantes;
drop policy "professor le os alunos das turmas dele" on public.participantes;
create policy "le participantes" on public.participantes for select to authenticated
  using ((select private.eh_gestor()) or turma_id in (select private.minhas_turmas()));

drop policy "gestor le" on public.aulas;
drop policy "professor le as aulas das turmas dele" on public.aulas;
create policy "le aulas" on public.aulas for select to authenticated
  using ((select private.eh_gestor()) or turma_id in (select private.minhas_turmas()));

drop policy "gestor le" on public.presencas;
drop policy "professor le as presencas das turmas dele" on public.presencas;
create policy "le presencas" on public.presencas for select to authenticated
  using ((select private.eh_gestor()) or aula_id in (select private.minhas_aulas()));

-- Vínculos: a política "para tudo" do gestor também valia para leitura e somava
-- com a do professor. Fica: uma de leitura + escrita só do gestor.
drop policy "gestor mantem vinculos" on public.professores_turmas;
drop policy "professor le os proprios vinculos" on public.professores_turmas;
create policy "le vinculos" on public.professores_turmas for select to authenticated
  using ((select private.eh_gestor()) or professor_id = (select auth.uid()));
create policy "gestor cria vinculo" on public.professores_turmas for insert to authenticated
  with check ((select private.eh_gestor()));
create policy "gestor apaga vinculo" on public.professores_turmas for delete to authenticated
  using ((select private.eh_gestor()));
