-- Atividades (modelo "Entrega: Exercício"):
-- - professor da turma e gestor criam a atividade para uma TURMA, dentro de uma
--   TRILHA do material, com PRAZO;
-- - o aluno da turma entrega com link, texto e/ou arquivo;
-- - o professor responde com feedback, nota (0 a 100) e "Concluída" ou "Refazer";
--   no "Refazer" o aluno envia de novo (2ª tentativa...). O histórico fica guardado.
--
-- Cada linha de "tentativas" é um envio + a resposta a ele. Quem enviou, quem
-- avaliou e quando são carimbados pelo banco (triggers), nunca pelo navegador.

-- ============================================
-- Tabelas
-- ============================================
create table public.atividades (
  id            bigint generated always as identity primary key,
  turma_id      bigint not null references public.turmas (id) on delete cascade,
  trilha_id     bigint not null references public.trilhas (id) on delete restrict,
  titulo        text not null check (length(trim(titulo)) between 1 and 120),
  enunciado     text not null check (length(trim(enunciado)) between 1 and 10000),
  prazo         timestamptz not null,
  criada_por    uuid references public.perfis (id) on delete set null,
  criada_em     timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index atividades_turma_trilha_idx on public.atividades (turma_id, trilha_id);
create index atividades_trilha_id_idx on public.atividades (trilha_id);
create index atividades_criada_por_idx on public.atividades (criada_por);

create table public.tentativas (
  id              bigint generated always as identity primary key,
  atividade_id    bigint not null references public.atividades (id) on delete cascade,
  participante_id bigint not null references public.participantes (id) on delete cascade,
  numero          smallint not null,
  -- Envio do aluno
  comentario      text check (length(comentario) <= 10000),
  link            text check (length(link) <= 2000 and link ~* '^https://[^[:space:]]+$'),
  arquivo_caminho text check (length(arquivo_caminho) <= 300),
  arquivo_nome    text check (length(arquivo_nome) <= 200),
  enviada_em      timestamptz not null default now(),
  enviada_por     uuid references public.perfis (id) on delete set null,
  -- Resposta do professor
  status          text not null default 'aguardando' check (status in ('aguardando', 'concluida', 'refazer')),
  feedback        text check (length(feedback) <= 10000),
  nota            smallint check (nota between 0 and 100),
  avaliada_em     timestamptz,
  avaliada_por    uuid references public.perfis (id) on delete set null,
  -- O aluno não lê o perfil do professor: o nome fica guardado junto da resposta
  avaliada_por_nome text,

  unique (atividade_id, participante_id, numero),
  check (coalesce(trim(comentario), '') <> '' or link is not null or arquivo_caminho is not null),
  check ((arquivo_caminho is null) = (arquivo_nome is null)),
  check (status = 'aguardando' or (coalesce(trim(feedback), '') <> '' and avaliada_em is not null)),
  check (status <> 'concluida' or nota is not null)
);
create index tentativas_participante_id_idx on public.tentativas (participante_id);
create index tentativas_enviada_por_idx on public.tentativas (enviada_por);
create index tentativas_avaliada_por_idx on public.tentativas (avaliada_por);
create index tentativas_aguardando_idx on public.tentativas (atividade_id) where status = 'aguardando';

-- ============================================
-- Funções de permissão
-- ============================================
-- Turma do aluno logado (nula para quem não é aluno de turma)
create function private.minha_turma_de_aluno()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select pa.turma_id
  from public.perfis pf
  join public.participantes pa on pa.id = pf.participante_id
  where pf.id = (select auth.uid()) and pf.papel = 'aluno';
$$;

-- Atividades das turmas do professor logado
create function private.minhas_atividades()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select a.id from public.atividades a where a.turma_id in (select private.minhas_turmas());
$$;

-- O aluno logado pode entregar esta atividade em nome deste participante?
-- (é ele mesmo, e a atividade é da turma dele)
create function private.pode_enviar(p_atividade bigint, p_participante bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_participante is not null
    and p_participante = private.meu_participante()
    and exists (
      select 1
      from public.atividades a
      join public.participantes pa on pa.id = p_participante and pa.turma_id = a.turma_id
      where a.id = p_atividade
    )
    and exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'aluno');
$$;

-- Arquivo de entrega: caminho "<atividade>/<participante>/<arquivo>".
-- Devolve a atividade e o participante, ou nulos se o caminho for inválido.
create function private.partes_do_caminho(p_nome text, out atividade bigint, out participante bigint)
language sql
immutable
set search_path = ''
as $$
  select case when p_nome ~ '^[0-9]{1,18}/[0-9]{1,18}/[^/]+$' then split_part(p_nome, '/', 1)::bigint end,
         case when p_nome ~ '^[0-9]{1,18}/[0-9]{1,18}/[^/]+$' then split_part(p_nome, '/', 2)::bigint end;
$$;

-- Quem pode baixar o arquivo: o próprio aluno, o gestor e o professor da turma
create function private.pode_ler_entrega(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when c.atividade is null then false
    else c.participante = private.meu_participante()
      or private.eh_gestor()
      or c.atividade in (select private.minhas_atividades())
  end
  from private.partes_do_caminho(p_nome) c;
$$;

-- O aluno envia arquivo só na própria pasta, e só em atividade da turma dele
create function private.pode_enviar_entrega(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.pode_enviar(c.atividade, c.participante), false)
  from private.partes_do_caminho(p_nome) c;
$$;

-- O arquivo citado na tentativa existe mesmo no Storage
create function private.entrega_existe(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from storage.objects where bucket_id = 'entregas' and name = p_nome);
$$;

-- O arquivo já está numa tentativa (não pode mais ser apagado)
create function private.entrega_em_uso(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.tentativas where arquivo_caminho = p_nome);
$$;

revoke execute on function
  private.minha_turma_de_aluno(), private.minhas_atividades(), private.pode_enviar(bigint, bigint),
  private.partes_do_caminho(text), private.pode_ler_entrega(text), private.pode_enviar_entrega(text),
  private.entrega_existe(text), private.entrega_em_uso(text)
from public, anon;
grant execute on function
  private.minha_turma_de_aluno(), private.minhas_atividades(), private.pode_enviar(bigint, bigint),
  private.partes_do_caminho(text), private.pode_ler_entrega(text), private.pode_enviar_entrega(text),
  private.entrega_existe(text), private.entrega_em_uso(text)
to authenticated;

-- ============================================
-- Atividades: RLS
-- ============================================
alter table public.atividades enable row level security;
revoke all on public.atividades from anon, authenticated;
grant select, delete on public.atividades to authenticated;
grant insert (turma_id, trilha_id, titulo, enunciado, prazo) on public.atividades to authenticated;
-- Sem turma_id: mudar a turma levaria as entregas junto
grant update (trilha_id, titulo, enunciado, prazo) on public.atividades to authenticated;

create policy "le atividades" on public.atividades for select to authenticated
  using (
    (select private.eh_gestor())
    or turma_id in (select private.minhas_turmas())
    or turma_id = (select private.minha_turma_de_aluno())
  );
create policy "cria atividade" on public.atividades for insert to authenticated
  with check ((select private.pode_fazer_chamada(turma_id)));
create policy "edita atividade" on public.atividades for update to authenticated
  using ((select private.pode_fazer_chamada(turma_id)))
  with check ((select private.pode_fazer_chamada(turma_id)));
-- Só apaga atividade sem entregas (como turma vazia)
create policy "apaga atividade" on public.atividades for delete to authenticated
  using (
    (select private.pode_fazer_chamada(turma_id))
    and not exists (select 1 from public.tentativas t where t.atividade_id = atividades.id)
  );

create function private.atividades_carimbar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.prazo <= now() then
      raise exception 'O prazo precisa ser depois de agora' using errcode = '22023';
    end if;
    new.criada_por := (select auth.uid());
    new.criada_em := now();
  end if;
  new.atualizada_em := now();
  return new;
end;
$$;
revoke all on function private.atividades_carimbar() from public, anon, authenticated;

create trigger carimbar_atividade
  before insert or update on public.atividades
  for each row execute function private.atividades_carimbar();

-- ============================================
-- Tentativas: RLS
-- ============================================
alter table public.tentativas enable row level security;
revoke all on public.tentativas from anon, authenticated;
grant select on public.tentativas to authenticated;
grant insert (atividade_id, participante_id, comentario, link, arquivo_caminho, arquivo_nome) on public.tentativas to authenticated;
grant update (status, feedback, nota) on public.tentativas to authenticated;
-- Sem delete: o histórico não se apaga (só some junto da atividade ou do aluno)

create policy "le tentativas" on public.tentativas for select to authenticated
  using (
    (select private.eh_gestor())
    or participante_id = (select private.meu_participante())
    or atividade_id in (select private.minhas_atividades())
  );
create policy "aluno envia" on public.tentativas for insert to authenticated
  with check ((select private.pode_enviar(atividade_id, participante_id)));
create policy "equipe avalia" on public.tentativas for update to authenticated
  using ((select private.eh_gestor()) or atividade_id in (select private.minhas_atividades()))
  with check ((select private.eh_gestor()) or atividade_id in (select private.minhas_atividades()));

-- Envio: numera a tentativa, confere prazo e a tentativa anterior, e carimba.
-- Tudo o que vem do navegador em status/nota/feedback é ignorado.
create function private.tentativas_ao_enviar()
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
revoke all on function private.tentativas_ao_enviar() from public, anon, authenticated;

create trigger ao_enviar_tentativa
  before insert on public.tentativas
  for each row execute function private.tentativas_ao_enviar();

-- Avaliação: só a última tentativa, só gestor ou professor da turma; carimba quem e quando
create function private.tentativas_ao_avaliar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (private.eh_gestor() or new.atividade_id in (select private.minhas_atividades())) then
    raise exception 'Sem permissão para avaliar' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.tentativas t
    where t.atividade_id = new.atividade_id and t.participante_id = new.participante_id and t.numero > new.numero
  ) then
    raise exception 'Só a última tentativa pode ser avaliada' using errcode = '22023';
  end if;
  if new.status = 'aguardando' then
    raise exception 'Escolha Concluída ou Refazer' using errcode = '22023';
  end if;

  new.avaliada_em := now();
  new.avaliada_por := (select auth.uid());
  new.avaliada_por_nome := (select nome from public.perfis where id = (select auth.uid()));
  return new;
end;
$$;
revoke all on function private.tentativas_ao_avaliar() from public, anon, authenticated;

create trigger ao_avaliar_tentativa
  before update on public.tentativas
  for each row execute function private.tentativas_ao_avaliar();

-- ============================================
-- Arquivos das entregas (Storage): privado, até 10 MB.
-- Nada de SVG/HTML/JS (evita página maliciosa aberta pelo link do arquivo).
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('entregas', 'entregas', false, 10485760, array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain',
  'application/zip', 'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])
on conflict (id) do nothing;

create policy "le entrega" on storage.objects for select to authenticated
  using (bucket_id = 'entregas' and (select private.pode_ler_entrega(name)));
create policy "envia entrega" on storage.objects for insert to authenticated
  with check (bucket_id = 'entregas' and (select private.pode_enviar_entrega(name)));
-- Limpeza: o aluno apaga o próprio arquivo que não chegou a virar entrega
create policy "apaga entrega nao usada" on storage.objects for delete to authenticated
  using (
    bucket_id = 'entregas'
    and (select private.pode_enviar_entrega(name))
    and not (select private.entrega_em_uso(name))
  );
