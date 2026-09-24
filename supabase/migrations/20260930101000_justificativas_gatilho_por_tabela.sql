-- Correção da 20260930100000: o gatilho conferir_justificativa lia new.participante_id
-- numa condição que o PL/pgSQL avalia inteira, e pontos_professores não tem essa
-- coluna (erro 42703 ao marcar J com atestado no ponto). Agora cada tabela confere
-- só as próprias colunas, num bloco separado.
create or replace function private.conferir_justificativa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dono_ok boolean;
begin
  if new.situacao <> 'justificada' then
    new.justificativa := null;
    new.atestado_id := null;
    return new;
  end if;
  new.justificativa := nullif(trim(new.justificativa), '');
  if new.atestado_id is null then
    return new;
  end if;

  -- O atestado precisa ser da MESMA pessoa (não dá para ligar o de outra)
  if tg_table_name = 'presencas' then
    select exists (
      select 1 from public.atestados a
      where a.id = new.atestado_id and a.participante_id = (to_jsonb(new) ->> 'participante_id')::bigint
    ) into v_dono_ok;
  else
    select exists (
      select 1 from public.atestados a
      where a.id = new.atestado_id and a.professor_id = (to_jsonb(new) ->> 'professor_id')::uuid
    ) into v_dono_ok;
  end if;
  if not v_dono_ok then
    raise exception 'Atestado de outra pessoa' using errcode = '42501';
  end if;
  return new;
end;
$$;
