-- Regras de entrega por atividade: o professor define o que a atividade exige.
-- - exige_texto: comentário/resposta obrigatório;
-- - exige_link + tipo_link: link obrigatório e de qual tipo (qualquer, GitHub ou Google Drive);
--   o tipo vale também quando o link é opcional (se vier, tem de ser daquele tipo);
-- - exige_arquivo + formatos: arquivo obrigatório e quais formatos (vazio = qualquer aceito).
-- O padrão é tudo opcional: as atividades que já existem continuam como estavam.
-- Quem confere é o banco (trigger de envio e reserva de arquivo), não só a tela.

alter table public.atividades
  add column exige_texto   boolean not null default false,
  add column exige_link    boolean not null default false,
  add column tipo_link     text    not null default 'qualquer' check (tipo_link in ('qualquer', 'github', 'drive')),
  add column exige_arquivo boolean not null default false,
  add column formatos      text[]  not null default '{}'
    check (formatos <@ array['pdf', 'imagem', 'zip', 'office', 'txt']::text[]);

grant insert (exige_texto, exige_link, tipo_link, exige_arquivo, formatos) on public.atividades to authenticated;
grant update (exige_texto, exige_link, tipo_link, exige_arquivo, formatos) on public.atividades to authenticated;

-- Formato (grupo) de cada tipo de arquivo aceito
create function private.formato_do_mime(p_mime text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_mime = 'application/pdf' then 'pdf'
    when p_mime in ('image/png', 'image/jpeg', 'image/webp') then 'imagem'
    when p_mime in ('application/zip', 'application/x-zip-compressed') then 'zip'
    when p_mime like 'application/vnd.openxmlformats-officedocument.%' then 'office'
    when p_mime = 'text/plain' then 'txt'
  end;
$$;
revoke execute on function private.formato_do_mime(text) from public, anon;
grant execute on function private.formato_do_mime(text) to authenticated;

-- O link combina com o tipo pedido?
create function private.link_do_tipo(p_link text, p_tipo text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_tipo
    when 'github' then p_link ~* '^https://(www\.)?github\.com/[^[:space:]]+$'
    when 'drive' then p_link ~* '^https://(drive|docs)\.google\.com/[^[:space:]]+$'
    else true
  end;
$$;
revoke execute on function private.link_do_tipo(text, text) from public, anon;
grant execute on function private.link_do_tipo(text, text) to authenticated;

-- ============================================
-- Envio: além da regra de sempre, confere as exigências da atividade
-- (o resto é igual a 20260926113000_reserva_de_envio.sql)
-- ============================================
create or replace function private.tentativas_ao_enviar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ativ record;
  v_ultima record;
  v_mime text;
begin
  -- Um envio por vez para o mesmo aluno e atividade (evita duas "1ª tentativa")
  perform pg_advisory_xact_lock(hashtextextended(new.atividade_id::text || ':' || new.participante_id::text, 0));

  select prazo, exige_texto, exige_link, tipo_link, exige_arquivo, formatos into v_ativ
  from public.atividades where id = new.atividade_id;

  select numero, status into v_ultima
  from public.tentativas
  where atividade_id = new.atividade_id and participante_id = new.participante_id
  order by numero desc
  limit 1;

  if v_ultima.numero is not null and v_ultima.status <> 'refazer' then
    raise exception 'Já existe um envio aguardando correção ou concluído' using errcode = '22023';
  end if;
  -- O prazo vale para o primeiro envio; o "Refazer" do professor reabre o envio
  if v_ultima.numero is null and now() > v_ativ.prazo then
    raise exception 'O envio das tarefas não está mais disponível' using errcode = '22023';
  end if;

  -- Exigências da atividade
  if v_ativ.exige_texto and coalesce(trim(new.comentario), '') = '' then
    raise exception 'Esta atividade pede um comentário ou resposta' using errcode = '22023';
  end if;
  if v_ativ.exige_link and new.link is null then
    raise exception '%', case v_ativ.tipo_link
      when 'github' then 'Esta atividade pede o link do GitHub'
      when 'drive' then 'Esta atividade pede o link do Google Drive'
      else 'Esta atividade pede um link' end
      using errcode = '22023';
  end if;
  if new.link is not null and not private.link_do_tipo(new.link, v_ativ.tipo_link) then
    raise exception '%', case v_ativ.tipo_link
      when 'github' then 'O link precisa ser do GitHub (https://github.com/...)'
      else 'O link precisa ser do Google Drive (https://drive.google.com/...)' end
      using errcode = '22023';
  end if;
  if v_ativ.exige_arquivo and new.arquivo_id is null and new.arquivo_caminho is null then
    raise exception 'Esta atividade pede um arquivo' using errcode = '22023';
  end if;

  if new.arquivo_caminho is not null then
    if not starts_with(new.arquivo_caminho, new.atividade_id::text || '/' || new.participante_id::text || '/') then
      raise exception 'Arquivo fora da pasta da entrega' using errcode = '42501';
    end if;
    if not private.entrega_existe(new.arquivo_caminho) then
      raise exception 'Arquivo não encontrado' using errcode = '22023';
    end if;
  end if;

  if new.arquivo_id is not null then
    select a.mime into v_mime
    from public.arquivos_entrega a
    where a.id = new.arquivo_id and a.atividade_id = new.atividade_id and a.participante_id = new.participante_id
      and a.descartado_em is null and a.drive_id is not null;
    if v_mime is null then
      raise exception 'Arquivo não encontrado' using errcode = '42501';
    end if;
    if cardinality(v_ativ.formatos) > 0 and not (private.formato_do_mime(v_mime) = any (v_ativ.formatos)) then
      raise exception 'Formato de arquivo não aceito nesta atividade' using errcode = '22023';
    end if;
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

-- ============================================
-- Reserva do arquivo: formato errado é recusado ANTES do upload para o Drive
-- (o resto é igual a 20260926113000_reserva_de_envio.sql)
-- ============================================
create or replace function public.reservar_arquivo(p_atividade bigint, p_nome text, p_mime text, p_tamanho integer)
returns table (arquivo_id uuid, participante_id bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participante bigint := private.meu_participante();
  v_prazo timestamptz;
  v_formatos text[];
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
  select prazo, formatos into v_prazo, v_formatos from public.atividades where id = p_atividade;
  select status into v_status
  from public.tentativas
  where atividade_id = p_atividade and tentativas.participante_id = v_participante
  order by numero desc limit 1;
  if (v_status is null and now() > v_prazo) or (v_status is not null and v_status <> 'refazer') then
    raise exception 'O envio das tarefas não está mais disponível' using errcode = '22023';
  end if;

  if cardinality(v_formatos) > 0 and not (coalesce(private.formato_do_mime(p_mime), '') = any (v_formatos)) then
    raise exception 'Formato de arquivo não aceito nesta atividade' using errcode = '22023';
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
