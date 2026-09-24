-- Ajustes da revisão das regras de entrega (o resto do trigger é igual a
-- 20260927100000_regras_de_entrega.sql):
-- - "exige comentário": texto só com espaços, tabs ou quebras de linha conta como vazio;
-- - formato não reconhecido é recusado (coalesce), igual à reserva de arquivo.
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
  if v_ativ.exige_texto and coalesce(btrim(new.comentario, E' \t\r\n'), '') = '' then
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
    if cardinality(v_ativ.formatos) > 0 and not (coalesce(private.formato_do_mime(v_mime), '') = any (v_ativ.formatos)) then
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
