-- ============================================
-- Fotos no site: só dos alunos que o site mostra
-- ============================================
-- A revisão apontou que filtrar por edição ainda publicaria a foto de um
-- aluno novo da edição atual que não está na página de turmas. Agora cada
-- aluno precisa estar marcado com no_site: são os 98 que src/data/turmas.ts
-- liga pelo participanteId (quem entrar no site depois é marcado junto).
--
-- A função também devolve quem está no site SEM foto: assim, apagar a foto
-- no dashboard tira a foto do site (antes voltava a do arquivo).
alter table public.participantes add column no_site boolean not null default false;
update public.participantes set no_site = true where id in (73,75,76,77,78,79,80,81,82,83,84,85,86,87,89,88,91,90,92,93,94,95,96,97,98,99,100,101,102,42,43,44,45,60,46,47,49,50,51,52,53,54,55,57,58,59,56,48,61,62,63,64,65,66,67,68,70,71,69,72,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,19,35,36,37,38,39,40,41);

drop function public.fotos_das_turmas();
create function public.fotos_das_turmas()
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
    and p.no_site
    and e.no_site
    and not e.demonstracao;
$$;

revoke execute on function public.fotos_das_turmas() from public;
grant execute on function public.fotos_das_turmas() to anon, authenticated;
