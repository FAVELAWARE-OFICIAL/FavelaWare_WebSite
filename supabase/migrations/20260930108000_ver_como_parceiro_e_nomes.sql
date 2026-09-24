-- 1. "Ver como parceiro": a conta que alterna papéis também vira parceiro.
-- 2. Encaminhar: vale para parceiro e para a conta que alterna papéis (assim o
--    "Ver como parceiro" recebe o pedido de teste).
-- 3. Conversa menos impessoal: cada mensagem guarda o nome de quem escreveu, e a
--    solicitação mostra quem respondeu (o aluno e o parceiro não leem o perfil dos
--    outros, então o nome vem pronto do banco).

-- ============================================
-- 1. alternar_papel com o parceiro (o resto igual a 20260926120000)
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
    -- Professor sem turma não vê nada: vincula às turmas da edição mais recente
    if not exists (select 1 from public.professores_turmas where professor_id = (select auth.uid())) then
      select id into v_edicao from public.edicoes where not demonstracao order by ordem desc limit 1;
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
-- 2. Encaminhar a parceiro ou à conta do "Ver como"
-- ============================================
create or replace function private.conferir_encaminhamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.encaminhada_para is not null and not exists (
    select 1 from public.perfis
    where id = new.encaminhada_para and (papel = 'parceiro' or pode_alternar_papel)
  ) then
    raise exception 'Só dá para encaminhar a um parceiro.' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- ============================================
-- 3. Nomes na conversa e em quem respondeu
-- ============================================
alter table public.mensagens_solicitacao add column autor_nome text;

create or replace function private.preparar_mensagem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select papel, coalesce(nullif(trim(nome), ''), null) into new.autor_papel, new.autor_nome
  from public.perfis where id = new.autor_id;
  if new.autor_papel is null then
    raise exception 'Faça login novamente.' using errcode = '42501';
  end if;
  if exists (
    select 1
    from public.solicitacoes s
    join public.participantes p on p.id = s.participante_id
    join public.edicoes e on e.id = p.edicao_id
    where s.id = new.solicitacao_id and e.encerrada
  ) then
    raise exception 'Esta edição foi encerrada: a conversa fica só para consulta.' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- Lista da equipe com o nome de quem respondeu
drop function public.solicitacoes_da_equipe();
create function public.solicitacoes_da_equipe()
returns table (
  id bigint,
  participante_id bigint,
  tipo text,
  descricao text,
  status text,
  resposta text,
  criada_em timestamptz,
  resolvida_em timestamptz,
  respondida_por text,
  encaminhada_para uuid,
  parceiro text,
  aluno text,
  foto text,
  edicao text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.participante_id, s.tipo, s.descricao, s.status, s.resposta, s.criada_em, s.resolvida_em,
         g.nome, s.encaminhada_para, pf.nome, p.nome, p.foto, e.nome
  from public.solicitacoes s
  join public.participantes p on p.id = s.participante_id
  join public.edicoes e on e.id = p.edicao_id
  left join public.perfis pf on pf.id = s.encaminhada_para
  left join public.perfis g on g.id = s.resolvida_por
  where (select private.eh_gestor())
     or ((select private.eh_parceiro()) and s.encaminhada_para = (select auth.uid()))
  order by s.criada_em desc;
$$;

revoke execute on function public.solicitacoes_da_equipe() from public, anon;
grant execute on function public.solicitacoes_da_equipe() to authenticated;

-- Do aluno: as próprias solicitações, com o nome de quem respondeu (sem o encaminhamento)
create function public.minhas_solicitacoes()
returns table (
  id bigint,
  participante_id bigint,
  tipo text,
  descricao text,
  status text,
  resposta text,
  criada_em timestamptz,
  resolvida_em timestamptz,
  respondida_por text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.participante_id, s.tipo, s.descricao, s.status, s.resposta, s.criada_em, s.resolvida_em, g.nome
  from public.solicitacoes s
  left join public.perfis g on g.id = s.resolvida_por
  where s.participante_id = (select private.meu_participante())
  order by s.criada_em desc;
$$;

revoke execute on function public.minhas_solicitacoes() from public, anon;
grant execute on function public.minhas_solicitacoes() to authenticated;
