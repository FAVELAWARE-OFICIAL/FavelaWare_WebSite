-- Arquivos das entregas no Google Drive (via Google Apps Script), não mais no
-- Storage do Supabase (espaço limitado).
--
-- Fluxo (Edge Function "entregas-drive"):
-- 1. confere com o JWT do aluno se ele pode enviar (posso_enviar_arquivo);
-- 2. manda o arquivo ao Apps Script (assinado com HMAC) e recebe o id no Drive;
-- 3. registra o arquivo em arquivos_entrega (só o servidor grava);
-- 4. registra a entrega em tentativas com o JWT do aluno (triggers carimbam quem e quando).
-- O Drive guarda os arquivos na conta da ONG, em pastas só com ids (sem nomes de
-- aluno). Ninguém recebe link do Drive: o download passa pelo portal, com a mesma
-- regra de quem pode ver a entrega.

-- ============================================
-- Arquivos no Drive
-- ============================================
create table public.arquivos_entrega (
  id              uuid primary key default gen_random_uuid(),
  atividade_id    bigint not null references public.atividades (id) on delete cascade,
  participante_id bigint not null references public.participantes (id) on delete cascade,
  drive_id        text not null unique check (drive_id ~ '^[A-Za-z0-9_-]{10,200}$'),
  nome            text not null check (length(nome) between 1 and 200),
  mime            text not null check (mime in (
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain',
    'application/zip', 'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )),
  tamanho         integer not null check (tamanho between 1 and 10485760),
  criado_em       timestamptz not null default now()
);
create index arquivos_entrega_atividade_participante_idx on public.arquivos_entrega (atividade_id, participante_id);
create index arquivos_entrega_participante_idx on public.arquivos_entrega (participante_id);

alter table public.arquivos_entrega enable row level security;
revoke all on public.arquivos_entrega from anon, authenticated;
-- Só leitura pela API; quem grava é o servidor (service role), depois de conferir a permissão
grant select on public.arquivos_entrega to authenticated;
create policy "le arquivos de entrega" on public.arquivos_entrega for select to authenticated
  using (
    (select private.eh_gestor())
    or participante_id = (select private.meu_participante())
    or atividade_id in (select private.minhas_atividades())
  );

-- ============================================
-- Tentativa aponta para o arquivo no Drive
-- ============================================
alter table public.tentativas
  add column arquivo_id uuid unique references public.arquivos_entrega (id) on delete restrict;
create index tentativas_arquivo_id_idx on public.tentativas (arquivo_id);
grant insert (arquivo_id) on public.tentativas to authenticated;

-- Pelo menos um: texto, link ou arquivo (agora também o do Drive)
alter table public.tentativas drop constraint tentativas_check;
alter table public.tentativas add constraint tentativas_tem_conteudo check (
  coalesce(trim(comentario), '') <> '' or link is not null or arquivo_caminho is not null or arquivo_id is not null
);
-- Um arquivo por entrega: ou o antigo (Storage) ou o do Drive
alter table public.tentativas add constraint tentativas_um_arquivo check (arquivo_caminho is null or arquivo_id is null);

-- ============================================
-- Pode enviar arquivo agora? (chamada pela Edge Function com o JWT do aluno)
-- Mesma regra do envio: aluno da turma, envio aberto (1º envio até o prazo, ou
-- última tentativa em "refazer") e no máximo 3 arquivos soltos (sem entrega).
-- Devolve o participante do aluno; recusa com erro claro.
-- ============================================
create function public.posso_enviar_arquivo(p_atividade bigint)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_participante bigint := private.meu_participante();
  v_prazo timestamptz;
  v_status text;
  v_soltos int;
begin
  if v_participante is null or not private.pode_enviar(p_atividade, v_participante) then
    raise exception 'Você não pode enviar arquivo para esta atividade' using errcode = '42501';
  end if;

  select prazo into v_prazo from public.atividades where id = p_atividade;
  select status into v_status
  from public.tentativas
  where atividade_id = p_atividade and participante_id = v_participante
  order by numero desc limit 1;

  if (v_status is null and now() > v_prazo) or (v_status is not null and v_status <> 'refazer') then
    raise exception 'O envio das tarefas não está mais disponível' using errcode = '22023';
  end if;

  select count(*) into v_soltos
  from public.arquivos_entrega a
  where a.atividade_id = p_atividade and a.participante_id = v_participante
    and not exists (select 1 from public.tentativas t where t.arquivo_id = a.id);
  if v_soltos >= 3 then
    raise exception 'Muitos arquivos enviados sem concluir a entrega. Tente mais tarde.' using errcode = '22023';
  end if;

  return v_participante;
end;
$$;
revoke execute on function public.posso_enviar_arquivo(bigint) from public, anon;
grant execute on function public.posso_enviar_arquivo(bigint) to authenticated;

-- ============================================
-- Envio: o arquivo do Drive precisa ser da mesma atividade e do mesmo aluno
-- (senão um aluno citaria o arquivo de outro). O resto da regra continua igual.
-- ============================================
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

-- ============================================
-- Storage: o envio direto de arquivo para o bucket para. (O bucket fica, vazio,
-- até a entrega pelo Drive se provar; o download antigo continua valendo.)
-- ============================================
drop policy "envia entrega" on storage.objects;
