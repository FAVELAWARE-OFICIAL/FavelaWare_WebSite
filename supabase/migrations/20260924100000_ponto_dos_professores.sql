-- Ponto dos professores: o professor marca o próprio dia como presente (P),
-- falta (F) ou justificada (J). Sem localização: os professores são de confiança.
-- O gestor vê e corrige o ponto de todos.
--
-- Professor do site é conta em perfis (não participante), então o ponto tem
-- tabela própria. A presença histórica de 2022 (participantes + aulas) não muda.

create table public.pontos_professores (
  id            bigint generated always as identity primary key,
  professor_id  uuid not null references public.perfis (id) on delete cascade,
  data          date not null,
  situacao      text not null check (situacao in ('presente', 'ausente', 'justificada')),
  registrado_em timestamptz not null default now(),
  -- Quem marcou por último (o próprio professor ou o gestor corrigindo)
  alterado_por  uuid references public.perfis (id) on delete set null,
  unique (professor_id, data)
);
create index pontos_professores_data_idx on public.pontos_professores (data);
create index pontos_professores_alterado_por_idx on public.pontos_professores (alterado_por);

alter table public.pontos_professores enable row level security;
revoke all on public.pontos_professores from anon, authenticated;
grant select, delete on public.pontos_professores to authenticated;
grant insert (professor_id, data, situacao, alterado_por) on public.pontos_professores to authenticated;
grant update (situacao, registrado_em, alterado_por) on public.pontos_professores to authenticated;

-- Professor só no próprio ponto (e só enquanto for professor); gestor em todos
create function private.pode_marcar_ponto(p_professor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.eh_gestor()
    or (
      p_professor = (select auth.uid())
      and exists (select 1 from public.perfis where id = p_professor and papel = 'professor')
    );
$$;
revoke execute on function private.pode_marcar_ponto(uuid) from public, anon;
grant execute on function private.pode_marcar_ponto(uuid) to authenticated;

create policy "le ponto" on public.pontos_professores for select to authenticated
  using ((select private.eh_gestor()) or professor_id = (select auth.uid()));
create policy "marca ponto" on public.pontos_professores for insert to authenticated
  with check ((select private.pode_marcar_ponto(professor_id)));
create policy "corrige ponto" on public.pontos_professores for update to authenticated
  using ((select private.pode_marcar_ponto(professor_id)))
  with check ((select private.pode_marcar_ponto(professor_id)));
create policy "desmarca ponto" on public.pontos_professores for delete to authenticated
  using ((select private.pode_marcar_ponto(professor_id)));

-- ============================================
-- Marcar o ponto de um dia (security invoker: as políticas acima valem aqui dentro)
-- p_professor nulo = o próprio; só o gestor passa outro professor.
-- p_situacao nula = desmarca (apaga o ponto do dia).
-- ============================================
create function public.registrar_ponto(p_data date, p_situacao text, p_professor uuid default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_professor uuid := coalesce(p_professor, (select auth.uid()));
begin
  if p_data is null or p_data > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Data do ponto inválida' using errcode = '22023';
  end if;
  if p_situacao is not null and p_situacao not in ('presente', 'ausente', 'justificada') then
    raise exception 'Situação inválida' using errcode = '22023';
  end if;
  if not private.pode_marcar_ponto(v_professor) then
    raise exception 'Sem permissão para marcar este ponto' using errcode = '42501';
  end if;

  if p_situacao is null then
    delete from public.pontos_professores where professor_id = v_professor and data = p_data;
    return;
  end if;

  insert into public.pontos_professores (professor_id, data, situacao, alterado_por)
  values (v_professor, p_data, p_situacao, (select auth.uid()))
  on conflict (professor_id, data) do update
    set situacao = excluded.situacao,
        registrado_em = now(),
        alterado_por = excluded.alterado_por;
end;
$$;

revoke execute on function public.registrar_ponto(date, text, uuid) from public, anon;
grant execute on function public.registrar_ponto(date, text, uuid) to authenticated;
