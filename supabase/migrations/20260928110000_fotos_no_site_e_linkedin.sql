-- ============================================
-- 1. Fotos dos alunos no site institucional
-- ============================================
-- A foto que o gestor põe no dashboard (participantes.foto) passa a aparecer
-- também nas páginas de turmas do site. O site é público (sem login), então
-- esta função devolve SÓ o id e a foto: nada de nome, login, e-mail ou
-- presença. As fotos já são públicas (bucket fotos-alunos, como as do site).
-- A edição de demonstração fica de fora.
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
    and p.foto is not null
    and not e.demonstracao;
$$;

revoke execute on function public.fotos_das_turmas() from public;
grant execute on function public.fotos_das_turmas() to anon, authenticated;

-- ============================================
-- 2. LinkedIn do instrutor (opcional) e guarda dos dados do RPA
-- ============================================
alter table public.dados_instrutores
  add column linkedin text
  check (linkedin is null or (char_length(linkedin) <= 200
    and linkedin ~ '^https://([a-z]{2,3}\.)?linkedin\.com/in/[A-Za-z0-9%_-]{2,100}/?$'));

-- Decisão do projeto: os dados do RPA ficam guardados mesmo depois que o
-- instrutor sai da equipe (o RPA é documento fiscal); o gestor continua lendo.
comment on table public.dados_instrutores is
  'Dados do instrutor para o RPA. Dado pessoal (cor/raça é sensível): só o dono e o gestor leem. '
  'Guardados mesmo depois que o instrutor sai da equipe (documento fiscal), por decisão do projeto.';
