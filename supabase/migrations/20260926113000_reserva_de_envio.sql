-- Correção da auditoria de segurança: envios em paralelo furavam o limite
-- (a checagem contava só arquivos já gravados, e eles só entravam depois do upload).
--
-- Agora a vaga é RESERVADA antes do upload, com a mesma trava do envio:
-- reservar_arquivo confere a regra, o limite e a cota, e já cria a linha em
-- arquivos_entrega (sem drive_id). Pedidos simultâneos passam um por vez e cada
-- reserva conta. Depois do upload o servidor preenche o drive_id.
--
-- Limites por aluno:
-- - até 5 arquivos sem entrega por atividade nas últimas 24 horas (descartados contam);
-- - até 50 MB por dia, somando todas as atividades.

alter table public.arquivos_entrega alter column drive_id drop not null;

create function public.reservar_arquivo(p_atividade bigint, p_nome text, p_mime text, p_tamanho integer)
returns table (arquivo_id uuid, participante_id bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participante bigint := private.meu_participante();
  v_prazo timestamptz;
  v_status text;
  v_soltos int;
  v_bytes bigint;
  v_id uuid;
begin
  if v_participante is null or not private.pode_enviar(p_atividade, v_participante) then
    raise exception 'Você não pode enviar arquivo para esta atividade' using errcode = '42501';
  end if;

  -- Mesma trava do trigger de envio: um pedido por vez para este aluno e atividade
  perform pg_advisory_xact_lock(hashtextextended(p_atividade::text || ':' || v_participante::text, 0));

  -- Mesma regra do trigger tentativas_ao_enviar (1º envio até o prazo; "refazer" reabre).
  -- Se mudar lá, mude aqui.
  select prazo into v_prazo from public.atividades where id = p_atividade;
  select status into v_status
  from public.tentativas
  where atividade_id = p_atividade and tentativas.participante_id = v_participante
  order by numero desc limit 1;
  if (v_status is null and now() > v_prazo) or (v_status is not null and v_status <> 'refazer') then
    raise exception 'O envio das tarefas não está mais disponível' using errcode = '22023';
  end if;

  select count(*) into v_soltos
  from public.arquivos_entrega a
  where a.atividade_id = p_atividade and a.participante_id = v_participante
    and a.criado_em > now() - interval '24 hours'
    and not exists (select 1 from public.tentativas t where t.arquivo_id = a.id);
  if v_soltos >= 5 then
    raise exception 'Muitos arquivos enviados sem concluir a entrega. Tente de novo amanhã.' using errcode = '22023';
  end if;

  -- Cota diária do aluno (todas as atividades): a trava acima é por atividade,
  -- então esta conta é aproximada entre atividades diferentes ao mesmo tempo
  select coalesce(sum(tamanho), 0) into v_bytes
  from public.arquivos_entrega a
  where a.participante_id = v_participante and a.criado_em > now() - interval '24 hours';
  if v_bytes + p_tamanho > 50 * 1024 * 1024 then
    raise exception 'Você atingiu o limite de 50 MB de arquivos por dia. Tente de novo amanhã.' using errcode = '22023';
  end if;

  insert into public.arquivos_entrega (atividade_id, participante_id, nome, mime, tamanho)
  values (p_atividade, v_participante, p_nome, p_mime, p_tamanho)
  returning id into v_id;

  return query select v_id, v_participante;
end;
$$;
revoke execute on function public.reservar_arquivo(bigint, text, text, integer) from public, anon;
grant execute on function public.reservar_arquivo(bigint, text, text, integer) to authenticated;

-- A checagem antiga (sem reserva) sai
drop function public.posso_enviar_arquivo(bigint);

-- Entrega só com arquivo que chegou ao Drive e não foi descartado
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
      and a.descartado_em is null and a.drive_id is not null
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

-- Arquivo descartado (ou ainda sem upload) não aparece para ninguém
drop policy "le arquivos de entrega" on public.arquivos_entrega;
create policy "le arquivos de entrega" on public.arquivos_entrega for select to authenticated
  using (
    descartado_em is null and drive_id is not null
    and (
      (select private.eh_gestor())
      or participante_id = (select private.meu_participante())
      or atividade_id in (select private.minhas_atividades())
    )
  );
