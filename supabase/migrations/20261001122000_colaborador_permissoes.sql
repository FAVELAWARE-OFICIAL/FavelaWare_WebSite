-- Colaborador: equipe interna do projeto, na área do gestor com acesso parcial.
-- - SOMENTE LEITURA da Visão geral, dos Alunos, da Chamada e das Turmas, como o
--   parceiro: lê direto edições, turmas e aulas; alunos e presenças vêm pelas
--   funções do parceiro, sem dado sensível (20260930106000).
-- - ESCREVE nas Trilhas (trilhas, materiais e atividades) e responde as
--   Solicitações (lê, conversa, conclui). Não apaga solicitação.
-- - NÃO VÊ Avaliações, Equipe (membros), Instrutores, ponto, atestados, entregas
--   e notas dos alunos, nem perfis de outras pessoas.
-- - NÃO CADASTRA NINGUÉM: toda escrita em participantes, perfis, professores e
--   banca continua só do gestor (eh_gestor não muda), e as Edge Functions de
--   cadastro recusam quem não é gestor.
-- - Não entra na banca avaliadora.
-- O gestor torna alguém colaborador pela tela Equipe (troca de função).

create function private.eh_colaborador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'colaborador'
  );
$$;

revoke execute on function private.eh_colaborador() from public, anon;
grant execute on function private.eh_colaborador() to authenticated;

-- ============================================
-- Trilhas e materiais: eh_equipe passa a incluir o colaborador
-- ============================================
-- Usada só pelas políticas de trilhas e materiais (20260923140000). Quem usar esta
-- função em outra tabela dá acesso ao colaborador junto.
create or replace function private.eh_equipe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel in ('gestor', 'professor', 'colaborador')
  );
$$;

-- ============================================
-- Leitura da edição: as mesmas condições de antes, mais o colaborador
-- ============================================
drop policy "le edicoes" on public.edicoes;
create policy "le edicoes" on public.edicoes for select to authenticated
  using (
    (select private.eh_gestor())
    or (select private.eh_parceiro())
    or (select private.eh_colaborador())
    or id in (select private.minhas_edicoes())
    or (select private.visualiza_como_aluno())
  );

drop policy "le turmas" on public.turmas;
create policy "le turmas" on public.turmas for select to authenticated
  using (
    (select private.eh_gestor())
    or (select private.eh_parceiro())
    or (select private.eh_colaborador())
    or id in (select private.minhas_turmas())
    or (select private.visualiza_como_aluno())
  );

drop policy "le aulas" on public.aulas;
create policy "le aulas" on public.aulas for select to authenticated
  using (
    (select private.eh_gestor())
    or (select private.eh_parceiro())
    or (select private.eh_colaborador())
    or turma_id in (select private.minhas_turmas())
  );

-- Alunos e presenças: as funções do parceiro (sem dado sensível) servem ao colaborador
create or replace function public.participantes_do_parceiro(p_edicao_id bigint)
returns table (id bigint, turma_id bigint, funcao text, nome text, login text, observacao text, foto text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.turma_id, p.funcao, p.nome, null::text, null::text, p.foto
  from public.participantes p
  where p.edicao_id = p_edicao_id
    and ((select private.eh_parceiro()) or (select private.eh_colaborador()))
  order by p.nome, p.id;
$$;

create or replace function public.presencas_do_parceiro(p_edicao_id bigint)
returns table (participante_id bigint, aula_id bigint, situacao text, registro_original text)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.participante_id, pr.aula_id, pr.situacao, ''::text
  from public.presencas pr
  join public.aulas a on a.id = pr.aula_id
  where a.edicao_id = p_edicao_id
    and ((select private.eh_parceiro()) or (select private.eh_colaborador()))
  order by pr.aula_id, pr.participante_id;
$$;

-- ============================================
-- Atividades: lê, cria, edita e apaga (sem ver as entregas)
-- ============================================
drop policy "le atividades" on public.atividades;
create policy "le atividades" on public.atividades for select to authenticated
  using (
    (select private.eh_gestor())
    or (select private.eh_colaborador())
    or turma_id in (select private.minhas_turmas())
    or turma_id = (select private.minha_turma_de_aluno())
    or (select private.visualiza_como_aluno())
  );

-- Políticas próprias: pode_fazer_chamada não muda (senão o colaborador faria chamada)
create policy "colaborador cria atividade" on public.atividades for insert to authenticated
  with check ((select private.eh_colaborador()));
create policy "colaborador edita atividade" on public.atividades for update to authenticated
  using ((select private.eh_colaborador()))
  with check ((select private.eh_colaborador()));

-- O colaborador não lê tentativas: um "not exists" na política rodaria com a RLS
-- dele e toda atividade pareceria sem entregas (e as entregas iriam junto no
-- cascade). A contagem é feita por esta função, que enxerga todas.
create function private.atividade_tem_entregas(p_atividade bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.tentativas t where t.atividade_id = p_atividade);
$$;

revoke execute on function private.atividade_tem_entregas(bigint) from public, anon;
grant execute on function private.atividade_tem_entregas(bigint) to authenticated;

create policy "colaborador apaga atividade" on public.atividades for delete to authenticated
  using ((select private.eh_colaborador()) and not private.atividade_tem_entregas(id));

-- ============================================
-- Solicitações: lê e atende (apagar continua só do gestor)
-- ============================================
create policy "colaborador le solicitacoes" on public.solicitacoes
  for select to authenticated using ((select private.eh_colaborador()));
create policy "colaborador atende solicitacoes" on public.solicitacoes
  for update to authenticated
  using ((select private.eh_colaborador()))
  with check ((select private.eh_colaborador()));

/** Quem vê: a coordenação (gestor e colaborador), e o aluno na conversa dele */
create or replace function private.pode_ver_conversa(p_solicitacao bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.eh_gestor())
    or (select private.eh_colaborador())
    or exists (
      select 1 from public.solicitacoes s
      where s.id = p_solicitacao and s.participante_id = (select private.meu_participante())
    );
$$;

/** Quem escreve: a coordenação sempre; o aluno na dele, enquanto está aberta ou em andamento */
create or replace function private.pode_escrever_na_conversa(p_solicitacao bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.eh_gestor())
    or (select private.eh_colaborador())
    or exists (
      select 1 from public.solicitacoes s
      where s.id = p_solicitacao
        and s.status in ('pendente', 'em_andamento')
        and s.participante_id = (select private.meu_participante())
    );
$$;

-- Mensagem da coordenação num pedido aberto inicia o atendimento
create or replace function private.iniciar_atendimento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Só sai de "aberta": pedido já em andamento ou concluído não muda
  if new.autor_papel in ('gestor', 'colaborador') then
    update public.solicitacoes set status = 'em_andamento'
    where id = new.solicitacao_id and status = 'pendente';
  end if;
  return null;
end;
$$;

create or replace function public.solicitacoes_da_equipe()
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
  respondida_por_id uuid,
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
         g.nome, s.resolvida_por, p.nome, p.foto, e.nome
  from public.solicitacoes s
  join public.participantes p on p.id = s.participante_id
  join public.edicoes e on e.id = p.edicao_id
  left join public.perfis g on g.id = s.resolvida_por
  where (select private.eh_gestor()) or (select private.eh_colaborador())
  order by s.criada_em desc;
$$;

-- ============================================
-- Banca avaliadora: colaborador não entra (como o aluno)
-- ============================================
create or replace function public.cadastrar_membro_banca(p_edicao bigint, p_perfil uuid, p_nome text, p_organizacao text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_papel public.papel_usuario;
  v_email text;
begin
  if not (select private.eh_gestor()) then
    raise exception 'Só o gestor cadastra a banca.' using errcode = '42501';
  end if;
  select pf.papel, u.email into v_papel, v_email
  from public.perfis pf join auth.users u on u.id = pf.id
  where pf.id = p_perfil;
  if v_papel is null then
    raise exception 'Conta não encontrada.' using errcode = '22023';
  end if;
  if v_papel = 'aluno' then
    raise exception 'Conta de aluno não entra na banca avaliadora.' using errcode = '22023';
  end if;
  if v_papel = 'colaborador' then
    raise exception 'Conta de colaborador não entra na banca avaliadora.' using errcode = '22023';
  end if;
  insert into public.membros_banca (edicao_id, perfil_id, nome, email, organizacao)
  values (p_edicao, p_perfil, trim(p_nome), lower(v_email), trim(p_organizacao))
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Esta pessoa já está na banca desta edição.' using errcode = '22023';
end;
$$;

-- Conta que virou colaborador depois de entrar na banca não avalia mais
create or replace function private.meu_membro_da_banca()
returns public.membros_banca
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_membro public.membros_banca;
begin
  -- Aberta antes de encerrada, real antes de demonstração, mais recente primeiro
  select m.* into v_membro
  from public.membros_banca m
  join public.edicoes e on e.id = m.edicao_id
  join public.perfis pf on pf.id = m.perfil_id
  where m.perfil_id = (select auth.uid()) and pf.papel not in ('aluno', 'colaborador')
  order by e.encerrada, e.demonstracao, e.ordem desc
  limit 1;
  if v_membro.id is null then
    raise exception 'Você não está na banca avaliadora de nenhuma edição.' using errcode = '42501';
  end if;
  return v_membro;
end;
$$;

-- O item "Banca avaliadora" do menu segue a mesma regra: quem virou aluno ou
-- colaborador depois de entrar na banca não vê mais o item (a área recusaria)
create or replace function public.sou_da_banca()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros_banca m
    join public.perfis pf on pf.id = m.perfil_id
    where m.perfil_id = (select auth.uid()) and pf.papel not in ('aluno', 'colaborador')
  );
$$;

-- ============================================
-- "Ver como colaborador" para a conta autorizada
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
  if p_papel not in ('gestor', 'professor', 'aluno', 'parceiro', 'colaborador') then
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
