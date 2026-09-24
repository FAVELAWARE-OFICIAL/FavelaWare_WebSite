-- Gestão pelo site (4ª edição em diante): o gestor cadastra edições, turmas e
-- alunos, e recebe solicitações dos alunos. Os nomes de turma ficam padronizados.

-- ============================================
-- Nomes de turma padronizados: "Turma 1", "Turma 2"... ou "Turma A", "Turma B"...
-- e "Turma Única" quando a edição tem uma turma só.
-- ============================================
update public.turmas set nome = case nome
  when 'TURMA 1 - QUASAB' then 'Turma 1'
  when 'TURMA 2 - QUASEX' then 'Turma 2'
  when 'TURMA A'          then 'Turma A'
  when 'TURMA B'          then 'Turma B'
  when 'TURMA'            then 'Turma Única'
  else nome
end;

alter table public.turmas
  add constraint turmas_nome_padrao check (nome ~ '^Turma (Única|[0-9]{1,2}|[A-Z])$');

-- ============================================
-- Aluno precisa estar numa turma da MESMA edição (agora o gestor cadastra pelo site)
-- ============================================
alter table public.participantes
  add constraint participantes_turma_da_mesma_edicao
  foreign key (turma_id, edicao_id) references public.turmas (id, edicao_id) on delete cascade;

-- ============================================
-- Foto no perfil (mostrada na barra superior das áreas restritas)
-- ============================================
alter table public.perfis add column foto text;

-- ============================================
-- Escrita do gestor: edições, turmas e alunos
-- ============================================
grant insert (nome, ordem) on public.edicoes to authenticated;
grant update (nome) on public.edicoes to authenticated;
create policy "gestor cria edicao" on public.edicoes
  for insert to authenticated with check ((select private.eh_gestor()));
create policy "gestor edita edicao" on public.edicoes
  for update to authenticated using ((select private.eh_gestor())) with check ((select private.eh_gestor()));

grant insert (edicao_id, nome) on public.turmas to authenticated;
grant update (nome) on public.turmas to authenticated;
grant delete on public.turmas to authenticated;
create policy "gestor cria turma" on public.turmas
  for insert to authenticated with check ((select private.eh_gestor()));
create policy "gestor edita turma" on public.turmas
  for update to authenticated using ((select private.eh_gestor())) with check ((select private.eh_gestor()));
-- Só apaga turma vazia: apagar turma com alunos levaria junto o histórico de presença
create policy "gestor apaga turma vazia" on public.turmas
  for delete to authenticated
  using (
    (select private.eh_gestor())
    and not exists (select 1 from public.participantes p where p.turma_id = turmas.id)
    and not exists (select 1 from public.aulas a where a.turma_id = turmas.id)
  );

grant insert (edicao_id, turma_id, funcao, nome, login, observacao, foto) on public.participantes to authenticated;
grant update (turma_id, nome, login, observacao, foto) on public.participantes to authenticated;
grant delete on public.participantes to authenticated;
create policy "gestor cadastra aluno" on public.participantes
  for insert to authenticated with check ((select private.eh_gestor()) and funcao = 'aluno');
create policy "gestor edita aluno" on public.participantes
  for update to authenticated using ((select private.eh_gestor())) with check ((select private.eh_gestor()));
create policy "gestor remove aluno" on public.participantes
  for delete to authenticated using ((select private.eh_gestor()) and funcao = 'aluno');

-- Gestor edita papel, nome e foto dos perfis (a política "gestor altera perfis" já existe)
grant update (papel, nome, foto) on public.perfis to authenticated;

-- ============================================
-- Solicitações dos alunos (mudança de turno, de turma...)
-- Por enquanto o gestor registra o que recebe; quando existir a área do aluno,
-- o próprio aluno envia por lá.
-- ============================================
create table public.solicitacoes (
  id              bigint generated always as identity primary key,
  participante_id bigint not null references public.participantes (id) on delete cascade,
  tipo            text not null check (tipo in ('mudanca_turno', 'mudanca_turma', 'outro')),
  descricao       text not null check (length(trim(descricao)) between 1 and 2000),
  status          text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  resposta        text check (length(resposta) <= 2000),
  criada_em       timestamptz not null default now(),
  resolvida_em    timestamptz,
  resolvida_por   uuid references public.perfis (id) on delete set null
);
create index solicitacoes_participante_id_idx on public.solicitacoes (participante_id);
create index solicitacoes_resolvida_por_idx on public.solicitacoes (resolvida_por);
create index solicitacoes_pendentes_idx on public.solicitacoes (criada_em) where status = 'pendente';

alter table public.solicitacoes enable row level security;
revoke all on public.solicitacoes from anon, authenticated;
grant select, delete on public.solicitacoes to authenticated;
grant insert (participante_id, tipo, descricao) on public.solicitacoes to authenticated;
grant update (status, resposta, resolvida_em, resolvida_por) on public.solicitacoes to authenticated;
create policy "gestor gerencia solicitacoes" on public.solicitacoes
  for all to authenticated using ((select private.eh_gestor())) with check ((select private.eh_gestor()));

-- ============================================
-- Fotos dos alunos (Storage): leitura pública, como as do site; só gestor envia
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-alunos', 'fotos-alunos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Enviar com substituição (upsert) também precisa de leitura
create policy "gestor le fotos de aluno" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-alunos' and (select private.eh_gestor()));
create policy "gestor envia foto de aluno" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-alunos' and (select private.eh_gestor()));
create policy "gestor troca foto de aluno" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos-alunos' and (select private.eh_gestor()));
create policy "gestor apaga foto de aluno" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-alunos' and (select private.eh_gestor()));
