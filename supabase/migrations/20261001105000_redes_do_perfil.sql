-- Redes e contato no "Meu perfil": LinkedIn, GitHub e e-mail de contato (Gmail).
-- - Qualquer conta preenche as próprias (função atualizar_minhas_redes).
-- - O site público mostra SÓ o LinkedIn: dos alunos na página da turma e dos
--   instrutores na equipe da página Sobre. GitHub e e-mail ficam no portal.
-- - Instrutor: o LinkedIn do perfil vale primeiro; sem ele, o dos dados do RPA.

alter table public.perfis
  add column linkedin text check (linkedin is null or (char_length(linkedin) <= 200
    and linkedin ~ '^https://([a-z]{2,3}\.)?linkedin\.com/in/[A-Za-z0-9%_-]{2,100}/?$')),
  add column github text check (github is null or (char_length(github) <= 100
    and github ~ '^https://github\.com/[A-Za-z0-9](-?[A-Za-z0-9]){0,38}/?$')),
  add column email_contato text check (email_contato is null or (char_length(email_contato) <= 200
    and email_contato ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

/** A própria pessoa grava as redes dela (vazio = tira). Só essas três colunas. */
create function public.atualizar_minhas_redes(p_linkedin text, p_github text, p_email_contato text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfis
  set linkedin = nullif(trim(p_linkedin), ''),
      github = nullif(trim(p_github), ''),
      email_contato = nullif(lower(trim(p_email_contato)), '')
  where id = (select auth.uid());
  if not found then
    raise exception 'Faça login novamente.' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.atualizar_minhas_redes(text, text, text) from public, anon;
grant execute on function public.atualizar_minhas_redes(text, text, text) to authenticated;

-- ============================================
-- Site público: o LinkedIn junto da foto
-- ============================================

-- Alunos das edições do arquivo (1 a 3): foto e LinkedIn da conta do aluno
drop function public.fotos_das_turmas();
create function public.fotos_das_turmas()
returns table (id bigint, foto text, linkedin text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.foto, pf.linkedin
  from public.participantes p
  join public.edicoes e on e.id = p.edicao_id
  left join public.perfis pf on pf.participante_id = p.id
  where p.funcao = 'aluno'
    and p.no_site
    and e.no_site
    and not e.demonstracao;
$$;

revoke execute on function public.fotos_das_turmas() from public;
grant execute on function public.fotos_das_turmas() to anon, authenticated;

-- Alunos das edições novas: nome curto, foto e LinkedIn
drop function public.turmas_do_site();
create function public.turmas_do_site()
returns table (
  edicao_ordem integer,
  edicao_nome text,
  encerrada boolean,
  turma_id bigint,
  turma_nome text,
  aluno_nome text,
  foto text,
  linkedin text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.ordem, e.nome, e.encerrada, t.id, t.nome, private.nome_curto(p.nome), p.foto, pf.linkedin
  from public.edicoes e
  join public.turmas t on t.edicao_id = e.id
  left join public.participantes p on p.turma_id = t.id and p.funcao = 'aluno'
  left join public.perfis pf on pf.participante_id = p.id
  where not e.demonstracao and not e.no_site
  order by e.ordem desc, t.nome, p.nome;
$$;

revoke execute on function public.turmas_do_site() from public;
grant execute on function public.turmas_do_site() to anon, authenticated;

-- Equipe da edição atual: LinkedIn do perfil, ou o dos dados do RPA
create or replace function public.equipe_da_edicao_atual()
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
    a.ordem, a.nome, coalesce(nullif(trim(p.nome), ''), 'Instrutor'), p.foto, coalesce(p.linkedin, di.linkedin)
  from atual a
  join public.turmas t on t.edicao_id = a.id
  join public.professores_turmas pt on pt.turma_id = t.id
  join public.perfis p on p.id = pt.professor_id and p.papel = 'professor' and not p.pode_alternar_papel
  left join public.dados_instrutores di on di.perfil_id = p.id
  order by p.id;
$$;
