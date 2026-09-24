-- Solicitações pelo portal do aluno e o quadro (kanban) do gestor.
-- - O aluno envia a própria solicitação e acompanha a resposta.
-- - O gestor movimenta cada uma: aberta (pendente) -> em andamento -> concluída
--   (aprovada ou recusada), respondendo ao aluno.

alter table public.solicitacoes drop constraint solicitacoes_status_check;
alter table public.solicitacoes add constraint solicitacoes_status_check
  check (status in ('pendente', 'em_andamento', 'aprovada', 'recusada'));

-- O aluno lê só as próprias solicitações
create policy "aluno le as proprias solicitacoes" on public.solicitacoes
  for select to authenticated
  using (participante_id = (select private.meu_participante()));

-- O aluno envia em nome dele mesmo; nasce sempre "pendente" (a coluna status não
-- está entre as liberadas para insert) e ele não responde nem muda o status
create policy "aluno envia solicitacao" on public.solicitacoes
  for insert to authenticated
  with check (participante_id = (select private.meu_participante()));

-- Edição encerrada não recebe solicitação nova
create function private.solicitacao_em_edicao_aberta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.participantes p join public.edicoes e on e.id = p.edicao_id
    where p.id = new.participante_id and e.encerrada
  ) then
    raise exception 'Esta edição foi encerrada: não recebe solicitações novas.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke execute on function private.solicitacao_em_edicao_aberta() from public, anon, authenticated;

create trigger solicitacoes_edicao_aberta
  before insert on public.solicitacoes
  for each row execute function private.solicitacao_em_edicao_aberta();

create index solicitacoes_em_andamento_idx on public.solicitacoes (criada_em) where status = 'em_andamento';
