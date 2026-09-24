-- "Ver como aluno": a conta que alterna papéis (sem aluno real ligado) vê as
-- atividades de qualquer turma, como o aluno vê, só para leitura.
-- Não envia nada: o envio exige um aluno de verdade (pode_enviar usa meu_participante).

create function private.visualiza_como_aluno()
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
      and pode_alternar_papel
      and participante_id is null
  );
$$;

revoke execute on function private.visualiza_como_aluno() from public, anon;
grant execute on function private.visualiza_como_aluno() to authenticated;

-- Atividades: + visualização
drop policy "le atividades" on public.atividades;
create policy "le atividades" on public.atividades for select to authenticated
  using (
    (select private.eh_gestor())
    or turma_id in (select private.minhas_turmas())
    or turma_id = (select private.minha_turma_de_aluno())
    or (select private.visualiza_como_aluno())
  );

-- Turmas (para escolher qual visualizar): + visualização
drop policy "le turmas" on public.turmas;
create policy "le turmas" on public.turmas for select to authenticated
  using (
    (select private.eh_gestor())
    or id in (select private.minhas_turmas())
    or (select private.visualiza_como_aluno())
  );

-- Edições (nome no seletor de turma, ex.: "Turma 1 · Edição 2"): + visualização
drop policy "le edicoes" on public.edicoes;
create policy "le edicoes" on public.edicoes for select to authenticated
  using (
    (select private.eh_gestor())
    or id in (select private.minhas_edicoes())
    or (select private.visualiza_como_aluno())
  );
