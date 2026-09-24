-- Equipe no site e Hall da Fama automático.
--
-- A equipe de uma edição é uma regra só (private.equipe_da_edicao), usada pela
-- página Sobre (edição aberta) e pelo retrato do Hall da Fama (no encerramento):
--   - instrutores ligados a uma turma da edição (cargo "Instrutor(a)" se o gestor
--     não preencheu outro);
--   - gestores, parceiros e a Líder discente, desde que o gestor tenha preenchido
--     o cargo (sem cargo, não saem no site).
-- Banca e aluno ficam de fora (aluno aparece na página Turmas). No site sai só o
-- nome curto, a foto, o cargo, o vínculo e o LinkedIn.
--
-- Ao encerrar a edição, a equipe é copiada para hall_da_fama: o hall não muda se
-- a pessoa sair ou trocar de cargo depois. Pedido de remoção (LGPD) é manual,
-- pelo SQL Editor: delete from public.hall_da_fama where ...

create function private.equipe_da_edicao(p_edicao bigint)
returns table (perfil_id uuid, nome text, foto text, cargo text, organizacao text, linkedin text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (p.id)
    p.id,
    private.nome_curto(coalesce(nullif(trim(p.nome), ''), 'Instrutor')),
    p.foto,
    coalesce(p.cargo, 'Instrutor(a)'),
    p.organizacao,
    coalesce(p.linkedin, di.linkedin)
  from public.perfis p
  left join public.dados_instrutores di on di.perfil_id = p.id
  where (
      p.papel = 'professor' and not p.pode_alternar_papel
      and exists (
        select 1
        from public.professores_turmas pt
        join public.turmas t on t.id = pt.turma_id
        where pt.professor_id = p.id and t.edicao_id = p_edicao
      )
    )
    or ((p.papel in ('gestor', 'parceiro') or p.pode_alternar_papel) and p.cargo is not null)
  order by p.id;
$$;

revoke execute on function private.equipe_da_edicao(bigint) from public, anon, authenticated;

-- Página Sobre: a equipe da edição aberta mais recente (fora a demonstração)
drop function public.equipe_da_edicao_atual();
create function public.equipe_da_edicao_atual()
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
    select id, ordem, nome from public.edicoes
    where not demonstracao and not encerrada
    order by ordem desc
    limit 1
  )
  select a.ordem, a.nome, q.nome, q.foto, q.cargo, q.organizacao, q.linkedin
  from atual a
  cross join lateral private.equipe_da_edicao(a.id) q;
$$;

revoke execute on function public.equipe_da_edicao_atual() from public;
grant execute on function public.equipe_da_edicao_atual() to anon, authenticated;

-- Retrato da equipe de cada edição encerrada (só leitura pela função do site)
create table public.hall_da_fama (
  id bigint generated always as identity primary key,
  edicao_id bigint not null references public.edicoes (id) on delete cascade,
  perfil_id uuid references public.perfis (id) on delete set null,
  nome text not null,
  foto text,
  cargo text,
  organizacao text,
  linkedin text,
  criado_em timestamptz not null default now(),
  unique (edicao_id, perfil_id)
);

alter table public.hall_da_fama enable row level security;
revoke all on public.hall_da_fama from anon, authenticated;

-- Encerrou a edição: a equipe dela vai para o hall (encerrar de novo não duplica)
create function private.retratar_equipe_no_hall()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.hall_da_fama (edicao_id, perfil_id, nome, foto, cargo, organizacao, linkedin)
  select new.id, e.perfil_id, e.nome, e.foto, e.cargo, e.organizacao, e.linkedin
  from private.equipe_da_edicao(new.id) e
  on conflict (edicao_id, perfil_id) do nothing;
  return null;
end;
$$;

revoke execute on function private.retratar_equipe_no_hall() from public, anon, authenticated;

create trigger retratar_equipe_no_hall
  after update of encerrada on public.edicoes
  for each row
  when (new.encerrada and not old.encerrada and not new.demonstracao and not new.no_site)
  execute function private.retratar_equipe_no_hall();

-- Hall da Fama do site: as edições encerradas do banco (as antigas ficam no arquivo do site)
create function public.hall_da_fama_do_site()
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
  select e.ordem, e.nome, h.nome, h.foto, h.cargo, h.organizacao, h.linkedin
  from public.hall_da_fama h
  join public.edicoes e on e.id = h.edicao_id
  where e.encerrada and not e.demonstracao and not e.no_site
  order by e.ordem desc, h.nome;
$$;

revoke execute on function public.hall_da_fama_do_site() from public;
grant execute on function public.hall_da_fama_do_site() to anon, authenticated;

-- Foto que está no hall não sai do Storage (nem pelo gestor): o hall guarda a URL.
-- Compara pelo fim exato da URL (sem LIKE: o "_" viraria curinga).
create function private.foto_no_hall(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.hall_da_fama h
    where h.foto is not null
      and right(h.foto, char_length(p_nome) + 14) = '/fotos-alunos/' || p_nome
  );
$$;

revoke execute on function private.foto_no_hall(text) from public, anon;
grant execute on function private.foto_no_hall(text) to authenticated;

drop policy "gestor apaga foto de aluno" on storage.objects;
create policy "gestor apaga foto de aluno" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-alunos' and (select private.eh_gestor()) and not (select private.foto_no_hall(name)));
