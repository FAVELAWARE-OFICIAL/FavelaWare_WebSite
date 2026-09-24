-- Papel fixo: só a dona do portal (a conta com pode_alternar_papel, a mesma do
-- "Ver como") troca o papel de alguém (instrutor é instrutor, parceiro é
-- parceiro...). Os outros gestores não trocam, nem dão a si mesmos essa permissão.
-- Continuam valendo, porque rodam no servidor (sem usuário logado): o convite
-- (marca o papel só de conta NOVA) e a criação de acessos dos alunos.
create function private.papel_so_pelo_dono()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.papel is distinct from old.papel or new.pode_alternar_papel is distinct from old.pode_alternar_papel)
     and (select auth.uid()) is not null
     and not exists (select 1 from public.perfis where id = (select auth.uid()) and pode_alternar_papel) then
    raise exception 'Só a responsável pelo portal troca o papel (o vínculo) de alguém.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function private.papel_so_pelo_dono() from public, anon, authenticated;

create trigger perfis_papel_so_pelo_dono
  before update of papel, pode_alternar_papel on public.perfis
  for each row execute function private.papel_so_pelo_dono();
