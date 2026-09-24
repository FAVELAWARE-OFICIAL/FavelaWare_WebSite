-- ============================================
-- Fotos no site: só das edições que já estão no site
-- ============================================
-- A função fotos_das_turmas é pública. Sem este filtro, a foto de um aluno de
-- uma edição nova (ainda não divulgada no site) ficaria acessível a qualquer
-- visitante assim que o gestor a pusesse no dashboard. Agora a edição precisa
-- estar marcada como no_site; hoje são as três que o site já mostra.
alter table public.edicoes add column no_site boolean not null default false;
update public.edicoes set no_site = true where ordem between 1 and 3 and not demonstracao;

create or replace function public.fotos_das_turmas()
returns table (id bigint, foto text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.foto
  from public.participantes p
  join public.edicoes e on e.id = p.edicao_id
  where p.funcao = 'aluno'
    and p.foto is not null
    and e.no_site
    and not e.demonstracao;
$$;

-- Higiene: a função do gatilho dos dados do RPA não precisa ser executável por ninguém
revoke execute on function private.dados_instrutores_arrumar() from public, anon, authenticated;
