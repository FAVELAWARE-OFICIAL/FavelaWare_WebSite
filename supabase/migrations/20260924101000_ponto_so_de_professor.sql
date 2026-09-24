-- Correção da revisão: o ponto só pode ser de quem TEM papel de professor.
-- Antes, o gestor passava direto (eh_gestor) e conseguia gravar ponto para si
-- mesmo ou para um aluno. Agora: o alvo precisa ser professor; e quem marca é
-- o próprio professor ou o gestor.
create or replace function private.pode_marcar_ponto(p_professor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = p_professor and papel = 'professor')
    and (private.eh_gestor() or p_professor = (select auth.uid()));
$$;
