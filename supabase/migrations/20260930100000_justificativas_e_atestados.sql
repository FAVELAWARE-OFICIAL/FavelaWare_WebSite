-- Justificativa e atestado das faltas justificadas (J).
--
-- - Chamada dos alunos e ponto dos instrutores: marcar J pede uma justificativa
--   (texto) e aceita um atestado (arquivo, opcional).
-- - O atestado é dado de saúde (sensível pela LGPD): o arquivo vai para o Google
--   Drive da ONG pela Edge Function "atestados" (a única que grava esta tabela,
--   com a chave de serviço) e SÓ o gestor lê a referência e baixa o arquivo.
-- - A justificativa e o atestado só valem com a situação "justificada": trocar
--   para P ou F apaga os dois (o gatilho abaixo cuida disso).

create table public.atestados (
  id              uuid primary key default gen_random_uuid(),
  -- De quem é: um aluno (chamada) OU um instrutor (ponto)
  participante_id bigint references public.participantes (id) on delete cascade,
  professor_id    uuid references public.perfis (id) on delete cascade,
  drive_id        text,
  nome            text not null check (length(nome) between 1 and 200),
  mime            text not null check (mime in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')),
  tamanho         integer not null check (tamanho between 1 and 10485760),
  enviado_por     uuid references public.perfis (id) on delete set null,
  enviado_em      timestamptz not null default now(),
  check ((participante_id is null) <> (professor_id is null))
);
create index atestados_participante_id_idx on public.atestados (participante_id);
create index atestados_professor_id_idx on public.atestados (professor_id);
create index atestados_enviado_por_idx on public.atestados (enviado_por);

alter table public.atestados enable row level security;
revoke all on public.atestados from anon, authenticated;
grant select on public.atestados to authenticated;
create policy "gestor le atestados" on public.atestados for select to authenticated
  using ((select private.eh_gestor()));

-- ============================================
-- Justificativa e atestado na presença do aluno e no ponto do instrutor
-- ============================================
alter table public.presencas
  add column justificativa text check (length(justificativa) <= 1000),
  add column atestado_id uuid references public.atestados (id) on delete set null;
create index presencas_atestado_id_idx on public.presencas (atestado_id);
grant insert (justificativa, atestado_id), update (justificativa, atestado_id) on public.presencas to authenticated;

alter table public.pontos_professores
  add column justificativa text check (length(justificativa) <= 1000),
  add column atestado_id uuid references public.atestados (id) on delete set null;
create index pontos_professores_atestado_id_idx on public.pontos_professores (atestado_id);
grant insert (justificativa, atestado_id), update (justificativa, atestado_id) on public.pontos_professores to authenticated;

-- Só com J; o atestado precisa ser da MESMA pessoa (não dá para ligar o de outro)
create function private.conferir_justificativa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao <> 'justificada' then
    new.justificativa := null;
    new.atestado_id := null;
    return new;
  end if;
  new.justificativa := nullif(trim(new.justificativa), '');
  if new.atestado_id is not null then
    if tg_table_name = 'presencas' and not exists (
      select 1 from public.atestados a where a.id = new.atestado_id and a.participante_id = new.participante_id
    ) then
      raise exception 'Atestado de outra pessoa' using errcode = '42501';
    end if;
    if tg_table_name = 'pontos_professores' and not exists (
      select 1 from public.atestados a where a.id = new.atestado_id and a.professor_id = new.professor_id
    ) then
      raise exception 'Atestado de outra pessoa' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.conferir_justificativa() from public, anon, authenticated;

create trigger presencas_justificativa
  before insert or update on public.presencas
  for each row execute function private.conferir_justificativa();

create trigger pontos_justificativa
  before insert or update on public.pontos_professores
  for each row execute function private.conferir_justificativa();

-- ============================================
-- Chamada: cada registro pode trazer justificativa e atestado
-- p_registros: [{"participante_id": 1, "situacao": "justificada", "justificativa": "...", "atestado_id": "uuid"}, ...]
-- ============================================
create or replace function public.registrar_chamada(p_turma_id bigint, p_data date, p_registros jsonb)
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

  insert into public.presencas (participante_id, aula_id, situacao, registro_original, justificativa, atestado_id)
  select
    r.participante_id,
    v_aula_id,
    r.situacao,
    case r.situacao when 'presente' then 'P' when 'ausente' then 'A' else 'J' end,
    r.justificativa,
    r.atestado_id
  from jsonb_to_recordset(p_registros) r(participante_id bigint, situacao text, justificativa text, atestado_id uuid)
  where r.situacao is not null
  on conflict (participante_id, aula_id) do update
    set situacao = excluded.situacao,
        registro_original = excluded.registro_original,
        justificativa = excluded.justificativa,
        atestado_id = excluded.atestado_id;

  return v_aula_id;
end;
$$;

-- ============================================
-- Ponto: J com justificativa e atestado (os dois opcionais para o gestor corrigindo)
-- ============================================
drop function public.registrar_ponto(date, text, uuid);

create function public.registrar_ponto(
  p_data date,
  p_situacao text,
  p_professor uuid default null,
  p_justificativa text default null,
  p_atestado uuid default null
)
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

  insert into public.pontos_professores (professor_id, data, situacao, alterado_por, justificativa, atestado_id)
  values (v_professor, p_data, p_situacao, (select auth.uid()), p_justificativa, p_atestado)
  on conflict (professor_id, data) do update
    set situacao = excluded.situacao,
        registrado_em = now(),
        alterado_por = excluded.alterado_por,
        justificativa = excluded.justificativa,
        atestado_id = excluded.atestado_id;
end;
$$;

revoke execute on function public.registrar_ponto(date, text, uuid, text, uuid) from public, anon;
grant execute on function public.registrar_ponto(date, text, uuid, text, uuid) to authenticated;
