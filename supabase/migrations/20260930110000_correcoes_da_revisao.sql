-- Correções da revisão de código e da auditoria de segurança:
-- 1. "Ver como Instrutor" quebrava com a edição mais recente encerrada (o vínculo
--    automático caía no gatilho de edição encerrada): vincula à mais recente ABERTA.
-- 2. A conta do "Ver como" não entra na equipe do site público.
-- 3. Site público: o banco manda só o nome curto (primeiro e último) dos alunos,
--    sem o id; antes o nome completo saía para qualquer visitante.
-- 4. Quem concluiu a solicitação é carimbado pelo banco (o cliente não escolhe).
-- 5. O aluno lê as solicitações só pela função minhas_solicitacoes (a tabela tem
--    a conta de quem respondeu).
-- 6. Os gatilhos de edição encerrada usam private.edicao_encerrada (uma regra só).

-- ============================================
-- 1. alternar_papel: vínculo na edição aberta mais recente
-- ============================================
create or replace function public.alternar_papel(p_papel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edicao bigint;
  v_aluno bigint;
begin
  if p_papel not in ('gestor', 'professor', 'aluno', 'parceiro') then
    raise exception 'Papel inválido' using errcode = '22023';
  end if;

  if not exists (select 1 from public.perfis where id = (select auth.uid()) and pode_alternar_papel) then
    raise exception 'Esta conta não pode alternar papéis' using errcode = '42501';
  end if;

  -- Como aluno, a conta passa a ser o aluno da turma de demonstração (entrega de
  -- verdade, só na turma demo); em outro papel, deixa de ser
  v_aluno := case when p_papel = 'aluno' then private.aluno_de_demonstracao() end;
  if v_aluno is not null and exists (
    select 1 from public.perfis where participante_id = v_aluno and id <> (select auth.uid())
  ) then
    raise exception 'O aluno de demonstração já está em uso por outra conta' using errcode = '22023';
  end if;

  update public.perfis
  set papel = p_papel::public.papel_usuario, precisa_trocar_senha = false, participante_id = v_aluno
  where id = (select auth.uid());

  if p_papel = 'professor' then
    -- Professor sem turma não vê nada: vincula às turmas da edição aberta mais
    -- recente (edição encerrada não recebe instrutor)
    if not exists (select 1 from public.professores_turmas where professor_id = (select auth.uid())) then
      select id into v_edicao from public.edicoes
      where not demonstracao and not encerrada
      order by ordem desc limit 1;
      insert into public.professores_turmas (professor_id, turma_id)
      select (select auth.uid()), t.id from public.turmas t where t.edicao_id = v_edicao
      on conflict do nothing;
    end if;
    -- E sempre na turma de demonstração (para corrigir as entregas de teste)
    insert into public.professores_turmas (professor_id, turma_id)
    select (select auth.uid()), t.id
    from public.turmas t join public.edicoes e on e.id = t.edicao_id
    where e.demonstracao
    on conflict do nothing;
  end if;
end;
$$;

-- ============================================
-- 2. Equipe do site sem a conta do "Ver como"
-- ============================================
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
    a.ordem, a.nome, coalesce(nullif(trim(p.nome), ''), 'Instrutor'), p.foto, di.linkedin
  from atual a
  join public.turmas t on t.edicao_id = a.id
  join public.professores_turmas pt on pt.turma_id = t.id
  join public.perfis p on p.id = pt.professor_id and p.papel = 'professor' and not p.pode_alternar_papel
  left join public.dados_instrutores di on di.perfil_id = p.id
  order by p.id;
$$;

-- ============================================
-- 3. Turmas do site: só o nome curto, sem id do aluno
-- ============================================
drop function public.turmas_do_site();
create function public.turmas_do_site()
returns table (
  edicao_ordem integer,
  edicao_nome text,
  encerrada boolean,
  turma_id bigint,
  turma_nome text,
  aluno_nome text,
  foto text
)
language sql
stable
security definer
set search_path = ''
as $$
  -- "Maria Eduarda Souza Lima" -> "Maria Lima" (o mesmo formato do site)
  select e.ordem, e.nome, e.encerrada, t.id, t.nome,
         case when cardinality(n.partes) > 1 then n.partes[1] || ' ' || n.partes[cardinality(n.partes)]
              else n.partes[1] end,
         p.foto
  from public.edicoes e
  join public.turmas t on t.edicao_id = e.id
  left join public.participantes p on p.turma_id = t.id and p.funcao = 'aluno'
  left join lateral (select regexp_split_to_array(trim(p.nome), '\s+') as partes) n on p.id is not null
  where not e.demonstracao and not e.no_site
  order by e.ordem desc, t.nome, p.nome;
$$;

revoke execute on function public.turmas_do_site() from public;
grant execute on function public.turmas_do_site() to anon, authenticated;

-- ============================================
-- 4. Quem concluiu: carimbado pelo banco
-- ============================================
create function private.carimbar_conclusao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('aprovada', 'recusada') then
    if old.status in ('aprovada', 'recusada') then
      -- Já estava concluída: quem e quando não mudam
      new.resolvida_em := old.resolvida_em;
      new.resolvida_por := old.resolvida_por;
    else
      new.resolvida_em := now();
      new.resolvida_por := (select auth.uid());
    end if;
  else
    new.resolvida_em := null;
    new.resolvida_por := null;
  end if;
  return new;
end;
$$;

revoke execute on function private.carimbar_conclusao() from public, anon, authenticated;

create trigger solicitacoes_carimbar_conclusao
  before update on public.solicitacoes
  for each row execute function private.carimbar_conclusao();

revoke update (resolvida_em, resolvida_por) on public.solicitacoes from authenticated;

-- ============================================
-- 5. Aluno lê só pela função
-- ============================================
drop policy "aluno le as proprias solicitacoes" on public.solicitacoes;

-- ============================================
-- 6. Edição encerrada: a mesma regra nos três gatilhos
-- ============================================
create or replace function private.vinculo_so_em_edicao_aberta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.edicao_encerrada((select t.edicao_id from public.turmas t where t.id = new.turma_id)) then
    raise exception 'Só dá para vincular instrutor a turma de edição aberta.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function private.solicitacao_em_edicao_aberta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.edicao_encerrada((select p.edicao_id from public.participantes p where p.id = new.participante_id)) then
    raise exception 'Esta edição foi encerrada: não recebe solicitações novas.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function private.preparar_mensagem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Foto: a do perfil; do aluno sem foto no perfil, a da ficha dele
  select pf.papel, nullif(trim(pf.nome), ''), coalesce(pf.foto, pa.foto)
  into new.autor_papel, new.autor_nome, new.autor_foto
  from public.perfis pf
  left join public.participantes pa on pa.id = pf.participante_id
  where pf.id = new.autor_id;
  if new.autor_papel is null then
    raise exception 'Faça login novamente.' using errcode = '42501';
  end if;
  if private.edicao_encerrada((
    select p.edicao_id
    from public.solicitacoes s
    join public.participantes p on p.id = s.participante_id
    where s.id = new.solicitacao_id
  )) then
    raise exception 'Esta edição foi encerrada: a conversa fica só para consulta.' using errcode = '22023';
  end if;
  return new;
end;
$$;
