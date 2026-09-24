-- Tela "Meu perfil": cada pessoa atualiza os próprios dados.
--
-- Não há política de UPDATE "na própria linha" em perfis de propósito: o grant de
-- coluna (papel, nome, foto) vale para todo authenticated, e uma política assim
-- deixaria a pessoa trocar o próprio papel. Por isso as alterações passam por
-- funções que mexem só na coluna certa, como concluir_primeiro_acesso.
--
-- A senha é trocada pelo próprio Supabase Auth, no front.

-- Gestor e professor: nome de exibição.
-- (O nome do aluno é o nome oficial da chamada, mantido pelo gestor.)
create function public.atualizar_meu_perfil(p_nome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.perfis where id = (select auth.uid()) and papel in ('gestor', 'professor')
  ) then
    raise exception 'Só gestor e professor alteram o nome por aqui' using errcode = '42501';
  end if;

  if p_nome is null or length(trim(p_nome)) not between 2 and 80 then
    raise exception 'O nome precisa ter entre 2 e 80 letras' using errcode = '22023';
  end if;

  update public.perfis set nome = trim(p_nome) where id = (select auth.uid());
end;
$$;

-- Aluno: data de nascimento e e-mail de contato (os mesmos campos do primeiro
-- acesso), sem mexer em precisa_trocar_senha.
create function public.atualizar_meus_dados_de_aluno(p_data_nascimento date, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participante bigint;
begin
  select participante_id into v_participante
  from public.perfis
  where id = (select auth.uid()) and papel = 'aluno' and participante_id is not null;

  if v_participante is null then
    raise exception 'Conta sem aluno ligado' using errcode = '42501';
  end if;

  -- Formato do e-mail e data válida: os checks das colunas de participantes
  update public.participantes
  set data_nascimento = p_data_nascimento,
      email = nullif(lower(trim(p_email)), '')
  where id = v_participante;
end;
$$;

revoke execute on function public.atualizar_meu_perfil(text) from public, anon;
revoke execute on function public.atualizar_meus_dados_de_aluno(date, text) from public, anon;
grant execute on function public.atualizar_meu_perfil(text) to authenticated;
grant execute on function public.atualizar_meus_dados_de_aluno(date, text) to authenticated;
