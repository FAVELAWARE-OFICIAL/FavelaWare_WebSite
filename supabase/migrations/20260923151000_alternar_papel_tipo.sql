-- Correção: a coluna perfis.papel é do tipo papel_usuario; o texto recebido
-- precisa ser convertido antes de gravar.
create or replace function public.alternar_papel(p_papel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edicao bigint;
begin
  if p_papel not in ('gestor', 'professor', 'aluno') then
    raise exception 'Papel inválido' using errcode = '22023';
  end if;

  if not exists (select 1 from public.perfis where id = (select auth.uid()) and pode_alternar_papel) then
    raise exception 'Esta conta não pode alternar papéis' using errcode = '42501';
  end if;

  update public.perfis
  set papel = p_papel::public.papel_usuario, precisa_trocar_senha = false
  where id = (select auth.uid());

  -- Professor sem turma não vê nada: vincula às turmas da edição mais recente
  if p_papel = 'professor'
     and not exists (select 1 from public.professores_turmas where professor_id = (select auth.uid())) then
    select id into v_edicao from public.edicoes order by ordem desc limit 1;
    insert into public.professores_turmas (professor_id, turma_id)
    select (select auth.uid()), t.id from public.turmas t where t.edicao_id = v_edicao
    on conflict do nothing;
  end if;
end;
$$;
