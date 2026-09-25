-- Equipe do Sobre: a da edição aberta mais recente que JÁ TEM turma cadastrada.
-- Edição nova sem turma ainda não é a atual: o site continua mostrando a equipe
-- anterior (a Edição III, fixa no site) até a primeira turma da nova entrar.
-- Sem edição assim, a função não devolve nada e o site cai na equipe anterior.
create or replace function public.equipe_da_edicao_atual()
returns table (
  edicao_ordem integer,
  edicao_nome text,
  nome text,
  foto text,
  cargo text,
  organizacao text,
  linkedin text
)
language sql
stable
security definer
set search_path = ''
as $$
  with atual as (
    select e.id, e.ordem, e.nome from public.edicoes e
    where not e.demonstracao and not e.encerrada
      and exists (select 1 from public.turmas t where t.edicao_id = e.id)
    order by e.ordem desc
    limit 1
  )
  select a.ordem, a.nome, q.nome, q.foto, q.cargo, q.organizacao, q.linkedin
  from atual a
  cross join lateral private.equipe_da_edicao(a.id) q;
$$;
