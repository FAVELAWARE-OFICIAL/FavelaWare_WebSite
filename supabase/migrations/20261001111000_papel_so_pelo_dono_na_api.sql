-- Ajuste do gatilho "papel só pela dona" (20261001110000): a trava vale para quem
-- chega pela API como usuário (papel de banco authenticated/anon). Tarefas do
-- servidor (Edge Functions com a chave de serviço) e manutenção direta no banco
-- continuam podendo, como antes. Quem mexe pela API só troca papel se for a dona.
create or replace function private.papel_so_pelo_dono()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.papel is distinct from old.papel or new.pode_alternar_papel is distinct from old.pode_alternar_papel)
     and current_setting('role', true) in ('authenticated', 'anon')
     and not exists (select 1 from public.perfis where id = (select auth.uid()) and pode_alternar_papel) then
    raise exception 'Só a responsável pelo portal troca o papel (o vínculo) de alguém.' using errcode = '42501';
  end if;
  return new;
end;
$$;
