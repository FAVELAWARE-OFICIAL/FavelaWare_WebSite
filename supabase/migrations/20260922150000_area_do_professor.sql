-- Área do professor: chamada feita pelo site.
--
-- Regras:
--   * O gestor cadastra o professor (Edge Function convidar-professor) e o vincula
--     às turmas em professores_turmas.
--   * O professor vê e registra chamada só nas turmas dele; pode corrigir qualquer
--     chamada dessas turmas, de qualquer data. O gestor pode tudo.
--   * A chamada é gravada pela função registrar_chamada (security invoker: roda com
--     as permissões de quem chama, então as políticas RLS abaixo continuam valendo).

-- ============================================
-- Foto do aluno (caminho em /public, casado pelo importador com src/data/turmas.ts)
-- ============================================
alter table public.participantes add column foto text;

-- ============================================
-- E-mail no perfil, para o gestor identificar cada conta
-- ============================================
alter table public.perfis add column email text;

update public.perfis p
set email = u.email
from auth.users u
where u.id = p.id;

create or replace function private.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- O papel NUNCA vem dos metadados do cadastro (o usuário controla esses dados)
  insert into public.perfis (id, nome, email)
  values (new.id, new.raw_user_meta_data ->> 'nome', new.email);
  return new;
end;
$$;

-- ============================================
-- Vínculo professor <-> turma (mantido pelo gestor)
-- ============================================
create table public.professores_turmas (
  professor_id uuid not null references public.perfis (id) on delete cascade,
  turma_id     bigint not null references public.turmas (id) on delete cascade,
  criado_em    timestamptz not null default now(),
  primary key (professor_id, turma_id)
);
create index professores_turmas_turma_id_idx on public.professores_turmas (turma_id);

-- ============================================
-- Quem registrou a aula pelo site (nulo = veio da planilha)
-- ============================================
alter table public.aulas
  add column registrada_por uuid references public.perfis (id) on delete set null,
  add column registrada_em  timestamptz;
create index aulas_registrada_por_idx on public.aulas (registrada_por);

-- A aula precisa ser da mesma edição da turma (agora que professores inserem aulas)
alter table public.turmas add constraint turmas_id_edicao_unica unique (id, edicao_id);
alter table public.aulas
  add constraint aulas_turma_da_mesma_edicao
  foreign key (turma_id, edicao_id) references public.turmas (id, edicao_id) on delete cascade;

-- ============================================
-- Funções de permissão (security definer: leem as tabelas sem cair na RLS delas)
-- ============================================
create function private.leciona_na_turma(p_turma_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.professores_turmas pt
    join public.perfis pf on pf.id = pt.professor_id
    where pt.professor_id = (select auth.uid())
      and pt.turma_id = p_turma_id
      and pf.papel = 'professor'  -- deixou de ser professor, perde o acesso
  );
$$;

create function private.leciona_na_edicao(p_edicao_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.turmas t
    where t.edicao_id = p_edicao_id and private.leciona_na_turma(t.id)
  );
$$;

create function private.pode_fazer_chamada(p_turma_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.eh_gestor() or private.leciona_na_turma(p_turma_id);
$$;

-- A presença só pode ser de aluno da MESMA turma da aula
create function private.pode_registrar_presenca(p_aula_id bigint, p_participante_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.aulas a
    join public.participantes p on p.turma_id = a.turma_id
    where a.id = p_aula_id
      and p.id = p_participante_id
      and p.funcao = 'aluno'
      and private.pode_fazer_chamada(a.turma_id)
  );
$$;

revoke execute on function
  private.leciona_na_turma(bigint), private.leciona_na_edicao(bigint),
  private.pode_fazer_chamada(bigint), private.pode_registrar_presenca(bigint, bigint)
  from public, anon;
grant execute on function
  private.leciona_na_turma(bigint), private.leciona_na_edicao(bigint),
  private.pode_fazer_chamada(bigint), private.pode_registrar_presenca(bigint, bigint)
  to authenticated;

-- ============================================
-- RLS: leitura do professor (o gestor já lê tudo pela política "gestor le")
-- ============================================
create policy "professor le as edicoes dele" on public.edicoes
  for select to authenticated using ((select private.leciona_na_edicao(id)));

create policy "professor le as turmas dele" on public.turmas
  for select to authenticated using ((select private.leciona_na_turma(id)));

create policy "professor le os alunos das turmas dele" on public.participantes
  for select to authenticated using (turma_id is not null and (select private.leciona_na_turma(turma_id)));

create policy "professor le as aulas das turmas dele" on public.aulas
  for select to authenticated using (turma_id is not null and (select private.leciona_na_turma(turma_id)));

create policy "professor le as presencas das turmas dele" on public.presencas
  for select to authenticated using ((select private.pode_registrar_presenca(aula_id, participante_id)));

-- ============================================
-- RLS: escrita da chamada (professor da turma ou gestor)
-- ============================================
create policy "registra aula da turma" on public.aulas
  for insert to authenticated
  with check (
    turma_id is not null
    and registrada_por = (select auth.uid())
    and (select private.pode_fazer_chamada(turma_id))
  );

create policy "atualiza aula da turma" on public.aulas
  for update to authenticated
  using (turma_id is not null and (select private.pode_fazer_chamada(turma_id)))
  with check (registrada_por = (select auth.uid()));

create policy "registra presenca" on public.presencas
  for insert to authenticated
  with check ((select private.pode_registrar_presenca(aula_id, participante_id)));

create policy "corrige presenca" on public.presencas
  for update to authenticated
  using ((select private.pode_registrar_presenca(aula_id, participante_id)))
  with check ((select private.pode_registrar_presenca(aula_id, participante_id)));

create policy "apaga presenca" on public.presencas
  for delete to authenticated
  using ((select private.pode_registrar_presenca(aula_id, participante_id)));

grant insert (edicao_id, turma_id, data, ordem, registrada_por, registrada_em) on public.aulas to authenticated;
grant update (registrada_por, registrada_em) on public.aulas to authenticated;
grant insert, delete on public.presencas to authenticated;
grant update (situacao, registro_original) on public.presencas to authenticated;

-- ============================================
-- RLS: vínculos (gestor mantém; professor vê os próprios)
-- ============================================
alter table public.professores_turmas enable row level security;
revoke all on public.professores_turmas from anon, authenticated;
grant select, insert, delete on public.professores_turmas to authenticated;

create policy "gestor mantem vinculos" on public.professores_turmas
  for all to authenticated
  using ((select private.eh_gestor()))
  with check ((select private.eh_gestor()));

create policy "professor le os proprios vinculos" on public.professores_turmas
  for select to authenticated using (professor_id = (select auth.uid()));

-- ============================================
-- Gravar a chamada de um dia, de uma vez
-- ============================================
-- p_registros: [{"participante_id": 1, "situacao": "presente"|"ausente"|"justificada"|null}, ...]
-- situacao null apaga o registro daquele aluno (volta a "sem registro").
create function public.registrar_chamada(p_turma_id bigint, p_data date, p_registros jsonb)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_edicao_id bigint;
  v_aula_id   bigint;
begin
  if not private.pode_fazer_chamada(p_turma_id) then
    raise exception 'Sem permissão para fazer a chamada desta turma' using errcode = '42501';
  end if;

  if p_data is null or p_data > current_date then
    raise exception 'Data da chamada inválida' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_registros) r(participante_id bigint, situacao text)
    where r.situacao is not null and r.situacao not in ('presente', 'ausente', 'justificada')
  ) then
    raise exception 'Situação inválida na chamada' using errcode = '22023';
  end if;

  select edicao_id into v_edicao_id from public.turmas where id = p_turma_id;

  -- Dois professores salvando a mesma turma ao mesmo tempo não criam aula duplicada
  perform pg_advisory_xact_lock(p_turma_id);

  select id into v_aula_id
  from public.aulas
  where turma_id = p_turma_id and data = p_data
  order by ordem
  limit 1;

  if v_aula_id is null then
    insert into public.aulas (edicao_id, turma_id, data, ordem, registrada_por, registrada_em)
    values (
      v_edicao_id, p_turma_id, p_data,
      coalesce((select max(ordem) from public.aulas where turma_id = p_turma_id), 0) + 1,
      (select auth.uid()), now()
    )
    returning id into v_aula_id;
  else
    update public.aulas
    set registrada_por = (select auth.uid()), registrada_em = now()
    where id = v_aula_id;
  end if;

  delete from public.presencas pr
  using jsonb_to_recordset(p_registros) r(participante_id bigint, situacao text)
  where pr.aula_id = v_aula_id
    and pr.participante_id = r.participante_id
    and r.situacao is null;

  insert into public.presencas (participante_id, aula_id, situacao, registro_original)
  select
    r.participante_id,
    v_aula_id,
    r.situacao,
    case r.situacao when 'presente' then 'P' when 'ausente' then 'A' else 'J' end
  from jsonb_to_recordset(p_registros) r(participante_id bigint, situacao text)
  where r.situacao is not null
  on conflict (participante_id, aula_id) do update
    set situacao = excluded.situacao,
        registro_original = excluded.registro_original;

  return v_aula_id;
end;
$$;

revoke execute on function public.registrar_chamada(bigint, date, jsonb) from public, anon;
grant execute on function public.registrar_chamada(bigint, date, jsonb) to authenticated;
