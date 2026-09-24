-- Limites da foto do próprio perfil (revisão de segurança da 20261001116000):
-- - o envio só aceita o formato que a RPC aceita (perfis/<uuid>.webp) e no
--   máximo 20 fotos por conta (as trocadas saem do Storage; ficam as do hall),
--   para o bucket público não virar hospedagem de qualquer arquivo;
-- - a foto que está no Hall da Fama também não é substituída nem movida pelo
--   gestor (antes só o apagar estava barrado).

create function private.fotos_de_perfil_enviadas()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from storage.objects
  where bucket_id = 'fotos-alunos' and name like 'perfis/%' and owner_id = (select auth.uid())::text;
$$;

revoke execute on function private.fotos_de_perfil_enviadas() from public, anon;
grant execute on function private.fotos_de_perfil_enviadas() to authenticated;

drop policy "cada um envia a propria foto" on storage.objects;
create policy "cada um envia a propria foto" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos-alunos'
    and name ~ '^perfis/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
    and (select private.fotos_de_perfil_enviadas()) < 20
  );

drop policy "gestor troca foto de aluno" on storage.objects;
create policy "gestor troca foto de aluno" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos-alunos' and (select private.eh_gestor()) and not (select private.foto_no_hall(name)));
