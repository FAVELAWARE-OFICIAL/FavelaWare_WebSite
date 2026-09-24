-- Cada pessoa troca a própria foto em "Meu perfil" (todos os papéis).
--
-- O navegador padroniza a foto e envia para fotos-alunos/perfis/<uuid>.webp
-- (o uuid é aleatório: o id da conta não vai para a URL pública). Depois chama
-- atualizar_minha_foto, que não confia na URL: ela precisa ser do nosso
-- Storage (o mesmo endereço que assinou o login), da pasta perfis, e o arquivo
-- precisa ter sido enviado pela própria pessoa.
--
-- Aluno ligado a uma turma grava na ficha (participantes.foto), que é a que sai
-- na chamada e na página da turma; os outros gravam no perfil (equipe do site).
-- A Líder discente, mesmo "vendo como aluno", grava no próprio perfil.

create policy "cada um envia a propria foto" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-alunos' and (storage.foldername(name))[1] = 'perfis');
create policy "cada um le a propria foto" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fotos-alunos' and (storage.foldername(name))[1] = 'perfis'
    and owner_id = (select auth.uid())::text
  );
create policy "cada um apaga a propria foto" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fotos-alunos' and (storage.foldername(name))[1] = 'perfis'
    and owner_id = (select auth.uid())::text
    and not (select private.foto_no_hall(name))
  );

create function public.atualizar_minha_foto(p_foto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_prefixo text := substring((select auth.jwt()) ->> 'iss' from '^(https?://[^/]+)')
    || '/storage/v1/object/public/fotos-alunos/';
  v_nome text;
  v_perfil public.perfis;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para trocar a foto.' using errcode = '42501';
  end if;
  if v_prefixo is null or p_foto is null or left(p_foto, char_length(v_prefixo)) <> v_prefixo then
    raise exception 'Foto inválida.' using errcode = '22023';
  end if;

  v_nome := substr(p_foto, char_length(v_prefixo) + 1);
  if v_nome !~ '^perfis/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
    or not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'fotos-alunos' and o.name = v_nome and o.owner_id = v_uid::text
    ) then
    raise exception 'Foto inválida.' using errcode = '22023';
  end if;

  select * into v_perfil from public.perfis where id = v_uid;
  if v_perfil.papel = 'aluno' and v_perfil.participante_id is not null and not v_perfil.pode_alternar_papel then
    update public.participantes set foto = p_foto where id = v_perfil.participante_id;
  else
    update public.perfis set foto = p_foto where id = v_uid;
  end if;
end;
$$;

revoke execute on function public.atualizar_minha_foto(text) from public, anon;
grant execute on function public.atualizar_minha_foto(text) to authenticated;
