-- Edições encerradas: depois que a edição acaba, a presença não muda mais.
--
-- - As edições 1, 2 e 3 já acabaram e nascem encerradas.
-- - O gestor encerra a edição pela tela "Edições e turmas" quando ela termina.
-- - Numa edição encerrada, ninguém (gestor, professor, função, script) cria aula,
--   marca, corrige ou apaga presença: os gatilhos abaixo valem para todo mundo.
-- - Reabrir não é pela API (nem com a chave de serviço): só pelo SQL Editor do
--   Supabase, que roda sem JWT (update public.edicoes set encerrada = false where id = ...).

alter table public.edicoes add column encerrada boolean not null default false;

update public.edicoes set encerrada = true where ordem between 1 and 3 and not demonstracao;

-- A política "gestor edita edicao" já restringe a escrita ao gestor
grant update (nome, encerrada) on public.edicoes to authenticated;

create function private.edicao_encerrada(p_edicao_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select e.encerrada from public.edicoes e where e.id = p_edicao_id), false)
$$;

revoke execute on function private.edicao_encerrada(bigint) from public, anon, authenticated;

-- ============================================
-- Presenças de edição encerrada: nada entra, muda ou sai
-- ============================================
create function private.proteger_presenca_de_edicao_encerrada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aulas bigint[];
begin
  v_aulas := case tg_op
    when 'INSERT' then array[new.aula_id]
    when 'DELETE' then array[old.aula_id]
    else array[new.aula_id, old.aula_id]
  end;
  if exists (
    select 1 from public.aulas a
    where a.id = any (v_aulas) and private.edicao_encerrada(a.edicao_id)
  ) then
    raise exception 'Esta edição foi encerrada: a presença não pode mais ser alterada.' using errcode = '22023';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger presencas_edicao_encerrada
  before insert or update or delete on public.presencas
  for each row execute function private.proteger_presenca_de_edicao_encerrada();

-- ============================================
-- Aulas de edição encerrada: a chamada não cria nem muda aula
-- ============================================
create function private.proteger_aula_de_edicao_encerrada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op <> 'INSERT' and private.edicao_encerrada(old.edicao_id))
     or (tg_op <> 'DELETE' and private.edicao_encerrada(new.edicao_id)) then
    raise exception 'Esta edição foi encerrada: a chamada não pode mais ser alterada.' using errcode = '22023';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger aulas_edicao_encerrada
  before insert or update or delete on public.aulas
  for each row execute function private.proteger_aula_de_edicao_encerrada();

-- ============================================
-- Pela API (qualquer papel com JWT), edição encerrada não reabre
-- ============================================
create function private.impedir_reabrir_edicao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.encerrada and not new.encerrada and (select auth.role()) is not null then
    raise exception 'Edição encerrada não pode ser reaberta pelo site.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger edicoes_nao_reabre
  before update of encerrada on public.edicoes
  for each row execute function private.impedir_reabrir_edicao();
