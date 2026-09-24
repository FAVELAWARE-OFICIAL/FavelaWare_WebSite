-- Entrega não pode usar arquivo descartado (o que ficou de um envio que falhou e
-- já foi para a lixeira do Drive): o trigger de envio passa a conferir isso.
-- O resto da função é igual à de 20260926110000_entregas_no_drive.sql.
create or replace function private.tentativas_ao_enviar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_prazo timestamptz;
  v_ultima record;
begin
  -- Um envio por vez para o mesmo aluno e atividade (evita duas "1ª tentativa")
  perform pg_advisory_xact_lock(hashtextextended(new.atividade_id::text || ':' || new.participante_id::text, 0));

  select prazo into v_prazo from public.atividades where id = new.atividade_id;

  select numero, status into v_ultima
  from public.tentativas
  where atividade_id = new.atividade_id and participante_id = new.participante_id
  order by numero desc
  limit 1;

  if v_ultima.numero is not null and v_ultima.status <> 'refazer' then
    raise exception 'Já existe um envio aguardando correção ou concluído' using errcode = '22023';
  end if;
  -- O prazo vale para o primeiro envio; o "Refazer" do professor reabre o envio
  if v_ultima.numero is null and now() > v_prazo then
    raise exception 'O envio das tarefas não está mais disponível' using errcode = '22023';
  end if;

  if new.arquivo_caminho is not null then
    if not starts_with(new.arquivo_caminho, new.atividade_id::text || '/' || new.participante_id::text || '/') then
      raise exception 'Arquivo fora da pasta da entrega' using errcode = '42501';
    end if;
    if not private.entrega_existe(new.arquivo_caminho) then
      raise exception 'Arquivo não encontrado' using errcode = '22023';
    end if;
  end if;

  if new.arquivo_id is not null and not exists (
    select 1 from public.arquivos_entrega a
    where a.id = new.arquivo_id and a.atividade_id = new.atividade_id and a.participante_id = new.participante_id
      and a.descartado_em is null
  ) then
    raise exception 'Arquivo não encontrado' using errcode = '42501';
  end if;

  new.numero := coalesce(v_ultima.numero, 0) + 1;
  new.enviada_em := now();
  new.enviada_por := (select auth.uid());
  new.status := 'aguardando';
  new.feedback := null;
  new.nota := null;
  new.avaliada_em := null;
  new.avaliada_por := null;
  new.avaliada_por_nome := null;
  return new;
end;
$$;
