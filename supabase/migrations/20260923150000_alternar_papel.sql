-- Alternar papel: uma conta autorizada (a do gestor principal) pode "ver como"
-- gestor, professor ou aluno, para testar e apresentar cada área.
--
-- Trocar de papel muda o papel da conta DE VERDADE: como professor ou aluno ela
-- enxerga exatamente o que eles enxergam (mesmas regras RLS). Voltar a ser gestor
-- sempre funciona, porque a troca é feita pela função abaixo, que confere a
-- permissão de alternar — não o papel atual.

alter table public.perfis add column pode_alternar_papel boolean not null default false;
-- (sem grant de update nesta coluna: ninguém se dá essa permissão pela API)

update public.perfis set pode_alternar_papel = true
where email = 'lucelhocristiano28@gmail.com';

-- Aluno "de verdade" precisa estar ligado a um aluno da turma; a conta que alterna
-- papéis vê a área do aluno sem ser ligada a nenhum aluno real
create or replace function private.eh_aluno_matriculado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid())
      and papel = 'aluno'
      and (participante_id is not null or pode_alternar_papel)
  );
$$;

create function public.alternar_papel(p_papel text)
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

  update public.perfis set papel = p_papel, precisa_trocar_senha = false where id = (select auth.uid());

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

revoke execute on function public.alternar_papel(text) from public, anon;
grant execute on function public.alternar_papel(text) to authenticated;
