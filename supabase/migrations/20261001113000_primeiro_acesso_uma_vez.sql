-- O primeiro acesso vale uma vez só: depois dele o aluno não troca mais o nome
-- oficial por aqui (o nome da turma sai no site; quem corrige é a coordenação).
create or replace function public.concluir_primeiro_acesso(p_nome text, p_data_nascimento date, p_email text)
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
  where id = (select auth.uid()) and papel = 'aluno' and participante_id is not null
    and precisa_trocar_senha;

  if v_participante is null then
    raise exception 'Conta sem aluno ligado ou primeiro acesso já concluído' using errcode = '42501';
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
