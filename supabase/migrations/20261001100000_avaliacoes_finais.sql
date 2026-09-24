-- Avaliações do fim da edição
-- A) Instrutores: nota em Participação em sala, Entrega das atividades e
--    Comportamento, com observação. O gestor define a data a partir da qual
--    avaliam. Cada instrutor avalia a turma inteira de uma vez; salvou, travou:
--    ele não edita nem vê mais (só o gestor vê).
-- B) Banca avaliadora (apresentação final): o gestor cadastra os membros. Cada
--    membro dá 0 a 5 em Inovação/Funcionalidade, Qualidade da apresentação e
--    Aplicabilidade; um membro não vê a nota dos outros; quando todos concluem,
--    aparece só a lista final. (O acesso por link com código, criado aqui, foi
--    trocado por conta convidada em 20261001103000; a nota do instrutor passou a
--    ser de 0 a 5 em 20261001104000.)
-- C) Resultado (só gestor): média das SOMAS dos instrutores + soma das
--    notas de todos os membros da banca (como a planilha), da maior para a menor.
--

-- ============================================
-- Apoio
-- ============================================

/** "Maria Eduarda Souza Lima" -> "Maria Lima" (o formato curto do site e da banca) */
create function private.nome_curto(p_nome text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when cardinality(p) > 1 then p[1] || ' ' || p[cardinality(p)] else p[1] end
  from (select regexp_split_to_array(trim(p_nome), '\s+') as p) x;
$$;

/** Hoje no horário de Brasília */
create function private.hoje()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

revoke execute on function private.nome_curto(text), private.hoje() from public, anon;
grant execute on function private.nome_curto(text), private.hoje() to authenticated;

-- turmas_do_site passa a usar a mesma regra de nome curto (saída igual)
create or replace function public.turmas_do_site()
returns table (
  edicao_ordem integer,
  edicao_nome text,
  encerrada boolean,
  turma_id bigint,
  turma_nome text,
  aluno_nome text,
  foto text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.ordem, e.nome, e.encerrada, t.id, t.nome, private.nome_curto(p.nome), p.foto
  from public.edicoes e
  join public.turmas t on t.edicao_id = e.id
  left join public.participantes p on p.turma_id = t.id and p.funcao = 'aluno'
  where not e.demonstracao and not e.no_site
  order by e.ordem desc, t.nome, p.nome;
$$;

-- ============================================
-- A) Avaliação dos instrutores
-- ============================================

-- A partir de quando os instrutores avaliam (a política "gestor edita edicao" limita ao gestor)
alter table public.edicoes add column avaliacao_instrutores_em date;
grant update (avaliacao_instrutores_em) on public.edicoes to authenticated;

create table public.avaliacoes_instrutor (
  professor_id    uuid not null references public.perfis (id) on delete cascade,
  participante_id bigint not null references public.participantes (id) on delete cascade,
  turma_id        bigint not null references public.turmas (id) on delete cascade,
  participacao    smallint not null check (participacao between 0 and 10),
  entrega         smallint not null check (entrega between 0 and 10),
  comportamento   smallint not null check (comportamento between 0 and 10),
  soma            smallint generated always as (participacao + entrega + comportamento) stored,
  observacao      text check (length(observacao) <= 1000),
  avaliado_em     timestamptz not null default now(),
  primary key (professor_id, participante_id)
);
create index avaliacoes_instrutor_turma_idx on public.avaliacoes_instrutor (turma_id);
create index avaliacoes_instrutor_participante_idx on public.avaliacoes_instrutor (participante_id);

alter table public.avaliacoes_instrutor enable row level security;
revoke all on public.avaliacoes_instrutor from anon, authenticated;
grant select on public.avaliacoes_instrutor to authenticated;
-- Só o gestor lê. Ninguém grava direto: só a função salvar_avaliacao_da_turma
create policy "gestor le avaliacoes dos instrutores" on public.avaliacoes_instrutor
  for select to authenticated using ((select private.eh_gestor()));

-- ============================================
-- B) Banca avaliadora
-- ============================================
create table public.membros_banca (
  id           bigint generated always as identity primary key,
  edicao_id    bigint not null references public.edicoes (id) on delete cascade,
  nome         text not null check (length(trim(nome)) between 1 and 120),
  organizacao  text not null check (length(trim(organizacao)) between 1 and 120),
  -- sha256 do token do link; null = link desativado
  token_hash   bytea unique,
  link_ativo   boolean generated always as (token_hash is not null) stored,
  concluida_em timestamptz,
  criado_em    timestamptz not null default now()
);
create index membros_banca_edicao_idx on public.membros_banca (edicao_id);

alter table public.membros_banca enable row level security;
revoke all on public.membros_banca from anon, authenticated;
-- O hash nunca sai do banco (fica fora da permissão de leitura)
grant select (id, edicao_id, nome, organizacao, link_ativo, concluida_em, criado_em)
  on public.membros_banca to authenticated;
grant update (nome, organizacao) on public.membros_banca to authenticated;
grant delete on public.membros_banca to authenticated;
create policy "gestor le a banca" on public.membros_banca
  for select to authenticated using ((select private.eh_gestor()));
create policy "gestor edita a banca" on public.membros_banca
  for update to authenticated using ((select private.eh_gestor())) with check ((select private.eh_gestor()));
create policy "gestor apaga da banca" on public.membros_banca
  for delete to authenticated using ((select private.eh_gestor()));

create table public.notas_banca (
  membro_id       bigint not null references public.membros_banca (id) on delete cascade,
  participante_id bigint not null references public.participantes (id) on delete cascade,
  inovacao        smallint not null check (inovacao between 0 and 5),
  apresentacao    smallint not null check (apresentacao between 0 and 5),
  aplicabilidade  smallint not null check (aplicabilidade between 0 and 5),
  atualizado_em   timestamptz not null default now(),
  primary key (membro_id, participante_id)
);
create index notas_banca_participante_idx on public.notas_banca (participante_id);

alter table public.notas_banca enable row level security;
revoke all on public.notas_banca from anon, authenticated;
grant select on public.notas_banca to authenticated;
create policy "gestor le as notas da banca" on public.notas_banca
  for select to authenticated using ((select private.eh_gestor()));

-- ============================================
-- Edição encerrada: avaliação não muda (vale para todo mundo, como a presença)
-- ============================================
create function private.proteger_avaliacao_de_edicao_encerrada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edicao bigint;
begin
  if tg_table_name = 'avaliacoes_instrutor' then
    v_edicao := (select t.edicao_id from public.turmas t
                 where t.id = case when tg_op = 'DELETE' then old.turma_id else new.turma_id end);
  elsif tg_table_name = 'membros_banca' then
    v_edicao := case when tg_op = 'DELETE' then old.edicao_id else new.edicao_id end;
  else
    v_edicao := (select m.edicao_id from public.membros_banca m
                 where m.id = case when tg_op = 'DELETE' then old.membro_id else new.membro_id end);
  end if;
  if private.edicao_encerrada(v_edicao) then
    raise exception 'Esta edição foi encerrada: a avaliação não pode mais ser alterada.' using errcode = '22023';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.proteger_avaliacao_de_edicao_encerrada() from public, anon, authenticated;

create trigger avaliacoes_instrutor_edicao_aberta
  before insert or update or delete on public.avaliacoes_instrutor
  for each row execute function private.proteger_avaliacao_de_edicao_encerrada();
create trigger membros_banca_edicao_aberta
  before insert or update or delete on public.membros_banca
  for each row execute function private.proteger_avaliacao_de_edicao_encerrada();
create trigger notas_banca_edicao_aberta
  before insert or update or delete on public.notas_banca
  for each row execute function private.proteger_avaliacao_de_edicao_encerrada();
