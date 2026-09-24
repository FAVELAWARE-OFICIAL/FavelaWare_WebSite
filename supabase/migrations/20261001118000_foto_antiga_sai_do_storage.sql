-- A foto trocada em "Meu perfil" sai do Storage (revisão da 20261001116000).
--
-- Na primeira troca, a foto antiga costuma ter sido enviada pelo gestor (ficha do
-- aluno na raiz do bucket, instrutor em equipe/): a pessoa não é a dona do arquivo
-- e ele ficava público, sem uso. Agora atualizar_minha_foto anota a foto que saiu,
-- e a pessoa pode apagar exatamente esse arquivo (se não estiver no Hall da Fama
-- nem em uso por ninguém). O navegador apaga logo depois de gravar a nova.
--
-- O endereço aceito vem do "iss" do login, que é o mesmo VITE_SUPABASE_URL do
-- projeto. No Supabase local, use no .env o mesmo host do iss (127.0.0.1).

create table private.fotos_trocadas (
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  nome text not null,
  primary key (perfil_id, nome)
);

-- Pode apagar: foto que a própria pessoa trocou, fora do hall e sem uso
create function private.posso_apagar_foto_trocada(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from private.fotos_trocadas f
      where f.perfil_id = (select auth.uid()) and f.nome = p_nome
    )
    and not private.foto_no_hall(p_nome)
    and not exists (
      select 1 from public.perfis p
      where right(p.foto, char_length(p_nome) + 14) = '/fotos-alunos/' || p_nome
    )
    and not exists (
      select 1 from public.participantes pa
      where right(pa.foto, char_length(p_nome) + 14) = '/fotos-alunos/' || p_nome
    );
$$;

revoke execute on function private.posso_apagar_foto_trocada(text) from public, anon;
grant execute on function private.posso_apagar_foto_trocada(text) to authenticated;

create policy "cada um apaga a foto que trocou" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-alunos' and (select private.posso_apagar_foto_trocada(name)));

create or replace function public.atualizar_minha_foto(p_foto text)
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
  v_papel public.papel_usuario;
  v_participante bigint;
  v_todas boolean;
  v_antiga text;
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

  select papel, participante_id, pode_alternar_papel into v_papel, v_participante, v_todas
  from public.perfis where id = v_uid;

  if v_papel = 'aluno' and v_participante is not null and not v_todas then
    select foto into v_antiga from public.participantes where id = v_participante;
    update public.participantes set foto = p_foto where id = v_participante;
  else
    select foto into v_antiga from public.perfis where id = v_uid;
    update public.perfis set foto = p_foto where id = v_uid;
  end if;

  -- A que saiu (se era do nosso bucket) fica liberada para a pessoa apagar
  if v_antiga is not null and left(v_antiga, char_length(v_prefixo)) = v_prefixo and v_antiga <> p_foto then
    insert into private.fotos_trocadas (perfil_id, nome)
    values (v_uid, substr(v_antiga, char_length(v_prefixo) + 1))
    on conflict do nothing;
  end if;
end;
$$;
