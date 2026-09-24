-- Parceiro: SOMENTE LEITURA da Visão geral, dos Alunos e da Chamada, em todas as edições.
-- - Lê direto só o que não tem dado pessoal: edições, turmas e aulas.
-- - Alunos e presenças vêm por duas funções que devolvem só as colunas do painel,
--   sem dado sensível: sem e-mail, nascimento, login, observação, justificativa,
--   atestado nem o registro original da planilha (tem texto como "Luto").
--   A permissão por coluna vale para o papel authenticated inteiro, por isso não
--   dá para esconder coluna do parceiro só com política: daí as funções.
-- - Nenhuma política de insert, update ou delete inclui o parceiro, e eh_equipe()
--   continua sem ele (trilhas, materiais, atividades e atestados ficam fechados).
-- - A única escrita dele é nas solicitações encaminhadas a ele (20260930107000).
-- Como criar um parceiro: convite pelo painel do Supabase (Authentication > Invite
-- user) e depois, no SQL Editor:
--   update public.perfis set papel = 'parceiro', nome = '...', email = '...'
--   where id = (select id from auth.users where email = '...');

create function private.eh_parceiro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'parceiro'
  );
$$;

revoke execute on function private.eh_parceiro() from public, anon;
grant execute on function private.eh_parceiro() to authenticated;

-- Leitura direta: as mesmas condições de antes, mais o parceiro
drop policy "le edicoes" on public.edicoes;
create policy "le edicoes" on public.edicoes for select to authenticated
  using (
    (select private.eh_gestor())
    or (select private.eh_parceiro())
    or id in (select private.minhas_edicoes())
    or (select private.visualiza_como_aluno())
  );

drop policy "le turmas" on public.turmas;
create policy "le turmas" on public.turmas for select to authenticated
  using (
    (select private.eh_gestor())
    or (select private.eh_parceiro())
    or id in (select private.minhas_turmas())
    or (select private.visualiza_como_aluno())
  );

drop policy "le aulas" on public.aulas;
create policy "le aulas" on public.aulas for select to authenticated
  using (
    (select private.eh_gestor())
    or (select private.eh_parceiro())
    or turma_id in (select private.minhas_turmas())
  );

-- Alunos e equipe da edição, só com as colunas do painel (login e observação vazios)
create function public.participantes_do_parceiro(p_edicao_id bigint)
returns table (id bigint, turma_id bigint, funcao text, nome text, login text, observacao text, foto text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.turma_id, p.funcao, p.nome, null::text, null::text, p.foto
  from public.participantes p
  where p.edicao_id = p_edicao_id and (select private.eh_parceiro())
  order by p.nome, p.id;
$$;

-- Presenças da edição, sem justificativa, atestado nem o registro original
create function public.presencas_do_parceiro(p_edicao_id bigint)
returns table (participante_id bigint, aula_id bigint, situacao text, registro_original text)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.participante_id, pr.aula_id, pr.situacao, ''::text
  from public.presencas pr
  join public.aulas a on a.id = pr.aula_id
  where a.edicao_id = p_edicao_id and (select private.eh_parceiro())
  order by pr.aula_id, pr.participante_id;
$$;

revoke execute on function public.participantes_do_parceiro(bigint), public.presencas_do_parceiro(bigint)
  from public, anon;
grant execute on function public.participantes_do_parceiro(bigint), public.presencas_do_parceiro(bigint)
  to authenticated;
