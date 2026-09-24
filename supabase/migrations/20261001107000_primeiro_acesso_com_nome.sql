-- Primeiro acesso do aluno: além de nascimento e e-mail (Gmail), ele confirma o
-- NOME COMPLETO (vem preenchido com o nome da turma; ele corrige se precisar).
-- Substitui a versão de 20260923140000 (só nascimento e e-mail).
drop function public.concluir_primeiro_acesso(date, text);

create function public.concluir_primeiro_acesso(p_nome text, p_data_nascimento date, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participante bigint;
  v_nome text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
begin
  select participante_id into v_participante
  from public.perfis
  where id = (select auth.uid()) and papel = 'aluno' and participante_id is not null;

  if v_participante is null then
    raise exception 'Conta sem aluno ligado' using errcode = '42501';
  end if;
  if length(v_nome) not between 3 and 120 or v_nome !~ '\s' then
    raise exception 'Informe o nome completo (nome e sobrenome).' using errcode = '22023';
  end if;

  update public.participantes
  set nome = v_nome, data_nascimento = p_data_nascimento, email = lower(trim(p_email))
  where id = v_participante;

  update public.perfis set nome = v_nome, precisa_trocar_senha = false where id = (select auth.uid());
end;
$$;

revoke execute on function public.concluir_primeiro_acesso(text, date, text) from public, anon;
grant execute on function public.concluir_primeiro_acesso(text, date, text) to authenticated;
