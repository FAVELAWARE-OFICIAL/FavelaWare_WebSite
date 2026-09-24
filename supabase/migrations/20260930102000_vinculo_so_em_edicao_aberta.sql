-- Instrutor só é vinculado a turma de edição aberta: edição encerrada já
-- acabou e não recebe instrutor novo. Tirar um vínculo antigo continua valendo.
-- A edição de demonstração continua aceitando: o "Ver como professor" vincula a
-- conta de teste a ela (a tela do gestor só não a oferece).
create function private.vinculo_so_em_edicao_aberta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.turmas t
    join public.edicoes e on e.id = t.edicao_id
    where t.id = new.turma_id and e.encerrada
  ) then
    raise exception 'Só dá para vincular instrutor a turma de edição aberta.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke execute on function private.vinculo_so_em_edicao_aberta() from public, anon, authenticated;

create trigger professores_turmas_edicao_aberta
  before insert or update on public.professores_turmas
  for each row execute function private.vinculo_so_em_edicao_aberta();
