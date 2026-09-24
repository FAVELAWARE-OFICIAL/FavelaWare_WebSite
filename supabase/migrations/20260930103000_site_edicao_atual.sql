-- O site público mostra a edição nova direto do banco:
-- - página Sobre: a equipe (instrutores) da edição atual, com foto e LinkedIn;
-- - página Turmas: as turmas e os alunos das edições que não estão escritas à
--   mão em src/data/turmas.ts (as marcadas com no_site são as do arquivo).
-- O site é público (sem login): as funções devolvem SÓ o que o site mostra
-- (nome, foto, LinkedIn). Nada de e-mail, login, presença ou dado do RPA.
-- A edição de demonstração fica de fora.

-- Equipe da edição atual: a edição aberta mais recente
create function public.equipe_da_edicao_atual()
returns table (edicao_ordem integer, edicao_nome text, nome text, foto text, linkedin text)
language sql
stable
security definer
set search_path = ''
as $$
  with atual as (
    select id, ordem, nome from public.edicoes
    where not demonstracao and not encerrada
    order by ordem desc
    limit 1
  )
  select distinct on (p.id)
    a.ordem, a.nome, coalesce(nullif(trim(p.nome), ''), 'Instrutor'), p.foto, di.linkedin
  from atual a
  join public.turmas t on t.edicao_id = a.id
  join public.professores_turmas pt on pt.turma_id = t.id
  join public.perfis p on p.id = pt.professor_id and p.papel = 'professor'
  left join public.dados_instrutores di on di.perfil_id = p.id
  order by p.id;
$$;

revoke execute on function public.equipe_da_edicao_atual() from public;
grant execute on function public.equipe_da_edicao_atual() to anon, authenticated;

-- Turmas e alunos das edições que o site mostra direto do banco
create function public.turmas_do_site()
returns table (
  edicao_ordem integer,
  edicao_nome text,
  encerrada boolean,
  turma_id bigint,
  turma_nome text,
  aluno_id bigint,
  aluno_nome text,
  foto text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.ordem, e.nome, e.encerrada, t.id, t.nome, p.id, p.nome, p.foto
  from public.edicoes e
  join public.turmas t on t.edicao_id = e.id
  left join public.participantes p on p.turma_id = t.id and p.funcao = 'aluno'
  where not e.demonstracao and not e.no_site
  order by e.ordem desc, t.nome, p.nome;
$$;

revoke execute on function public.turmas_do_site() from public;
grant execute on function public.turmas_do_site() to anon, authenticated;
