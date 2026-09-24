-- Avaliações: correções da revisão
-- 1. Aluno que entra na turma depois: o instrutor avalia SÓ os que faltam (quem
--    já avaliou continua travado); a turma volta a aparecer para ele.
-- 2. Aluno que entra depois da banca concluir: o membro dá nota só a quem ainda
--    não tem (as notas já dadas continuam travadas). A lista final aparece quando
--    todos tiverem nota de todos.
-- 3. Conta de aluno não entra na banca (daria nota a si mesmo e aos colegas).
-- 4. Membro de mais de uma edição: vale a banca da edição aberta (e real) mais recente.
-- 5. Resultado: "instrutores da turma" conta só quem avalia de verdade (sem a conta do Ver como).

-- ============================================
-- 1. Instrutor: só os alunos que faltam
-- ============================================

/** Alunos da turma que o instrutor ainda não avaliou */
create function private.alunos_sem_minha_nota(p_turma bigint)
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.participantes p
  where p.turma_id = p_turma and p.funcao = 'aluno'
    and not exists (
      select 1 from public.avaliacoes_instrutor a
      where a.participante_id = p.id and a.professor_id = (select auth.uid())
    );
$$;

revoke execute on function private.alunos_sem_minha_nota(bigint) from public, anon, authenticated;

create or replace function public.minhas_avaliacoes_pendentes()
returns table (turma_id bigint, turma_nome text, edicao_nome text, alunos integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.nome, e.nome, (select count(*)::integer from private.alunos_sem_minha_nota(t.id))
  from public.turmas t
  join public.edicoes e on e.id = t.edicao_id
  where t.id in (select private.minhas_turmas())
    and not e.encerrada
    and e.avaliacao_instrutores_em is not null
    and e.avaliacao_instrutores_em <= (select private.hoje())
    and private.avalia_de_verdade(e.id)
    and exists (select 1 from private.alunos_sem_minha_nota(t.id))
  order by e.ordem desc, t.nome;
$$;

/** Os alunos que o instrutor ainda avalia nesta turma (nome e foto) */
create function public.alunos_para_avaliar(p_turma_id bigint)
returns table (id bigint, nome text, foto text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nome, p.foto
  from public.participantes p
  where p_turma_id in (select private.minhas_turmas())
    and p.id in (select private.alunos_sem_minha_nota(p_turma_id))
  order by p.nome;
$$;

revoke execute on function public.alunos_para_avaliar(bigint) from public, anon;
grant execute on function public.alunos_para_avaliar(bigint) to authenticated;

create or replace function public.salvar_avaliacao_da_turma(p_turma_id bigint, p_notas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edicao public.edicoes;
  v_eu uuid := (select auth.uid());
  v_esperados bigint;
  v_recebidos bigint;
  v_certos bigint;
begin
  if p_turma_id is null or not exists (select 1 from private.minhas_turmas() m where m = p_turma_id) then
    raise exception 'Você não avalia esta turma.' using errcode = '42501';
  end if;

  select e.* into v_edicao from public.edicoes e join public.turmas t on t.edicao_id = e.id where t.id = p_turma_id;
  if v_edicao.encerrada then
    raise exception 'Esta edição foi encerrada: a avaliação não pode mais ser feita.' using errcode = '22023';
  end if;
  if v_edicao.avaliacao_instrutores_em is null or v_edicao.avaliacao_instrutores_em > (select private.hoje()) then
    raise exception 'A avaliação desta turma ainda não foi liberada pela coordenação.' using errcode = '22023';
  end if;
  if not private.avalia_de_verdade(v_edicao.id) then
    raise exception 'A conta de demonstração só avalia a turma de demonstração.' using errcode = '22023';
  end if;

  -- Dois cliques ao mesmo tempo: um espera o outro
  perform pg_advisory_xact_lock(hashtext('avaliacao:' || v_eu::text || ':' || p_turma_id::text));

  -- Exatamente os alunos que ainda faltam, cada um uma vez (quem já foi avaliado não muda)
  if jsonb_typeof(p_notas) is distinct from 'array' then
    raise exception 'Avaliação inválida.' using errcode = '22023';
  end if;
  select count(*) into v_esperados from private.alunos_sem_minha_nota(p_turma_id);
  if v_esperados = 0 then
    raise exception 'Você já avaliou todos os alunos desta turma. A avaliação não pode ser editada.' using errcode = '22023';
  end if;
  select count(*), count(distinct r.participante_id) filter (
           where r.participante_id in (select private.alunos_sem_minha_nota(p_turma_id)))
  into v_recebidos, v_certos
  from jsonb_to_recordset(p_notas) r(participante_id bigint);
  if v_recebidos <> v_esperados or v_certos <> v_esperados then
    raise exception 'Avalie todos os alunos da turma (uma vez cada) antes de salvar.' using errcode = '22023';
  end if;

  insert into public.avaliacoes_instrutor (professor_id, participante_id, turma_id, participacao, entrega, comportamento, observacao)
  select v_eu, r.participante_id, p_turma_id, r.participacao, r.entrega, r.comportamento, nullif(trim(r.observacao), '')
  from jsonb_to_recordset(p_notas) r(participante_id bigint, participacao smallint, entrega smallint,
                                     comportamento smallint, observacao text);
end;
$$;

-- ============================================
-- 2 e 4. Banca: aluno novo depois de concluir; edição certa
-- ============================================
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
  where m.perfil_id = (select auth.uid())
  order by e.encerrada, e.demonstracao, e.ordem desc
  limit 1;
  if v_membro.id is null then
    raise exception 'Você não está na banca avaliadora de nenhuma edição.' using errcode = '42501';
  end if;
  return v_membro;
end;
$$;

create or replace function public.salvar_nota_da_banca(
  p_participante bigint,
  p_inovacao smallint,
  p_apresentacao smallint,
  p_aplicabilidade smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membro public.membros_banca := private.meu_membro_da_banca();
begin
  if not exists (
    select 1 from public.participantes p
    where p.id = p_participante and p.edicao_id = v_membro.edicao_id and p.funcao = 'aluno'
  ) then
    raise exception 'Este aluno não é desta edição.' using errcode = '22023';
  end if;
  -- Depois de concluir, só dá nota a quem ainda não tem (aluno que entrou depois)
  if v_membro.concluida_em is not null and exists (
    select 1 from public.notas_banca n where n.membro_id = v_membro.id and n.participante_id = p_participante
  ) then
    raise exception 'Você já concluiu a avaliação: as notas não mudam mais.' using errcode = '22023';
  end if;
  insert into public.notas_banca (membro_id, participante_id, inovacao, apresentacao, aplicabilidade)
  values (v_membro.id, p_participante, p_inovacao, p_apresentacao, p_aplicabilidade)
  on conflict (membro_id, participante_id) do update
    set inovacao = excluded.inovacao, apresentacao = excluded.apresentacao,
        aplicabilidade = excluded.aplicabilidade, atualizado_em = now();
end;
$$;

-- ============================================
-- 3. Aluno não entra na banca; o e-mail vem da conta (não do que foi digitado)
-- ============================================
drop function public.cadastrar_membro_banca(bigint, uuid, text, text, text);
create function public.cadastrar_membro_banca(p_edicao bigint, p_perfil uuid, p_nome text, p_organizacao text)
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
  insert into public.membros_banca (edicao_id, perfil_id, nome, email, organizacao)
  values (p_edicao, p_perfil, trim(p_nome), lower(v_email), trim(p_organizacao))
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Esta pessoa já está na banca desta edição.' using errcode = '22023';
end;
$$;

revoke execute on function public.cadastrar_membro_banca(bigint, uuid, text, text) from public, anon;
grant execute on function public.cadastrar_membro_banca(bigint, uuid, text, text) to authenticated;

-- ============================================
-- 5. Resultado: instrutores que avaliam de verdade
-- ============================================
create or replace function public.resultado_das_avaliacoes(p_edicao bigint)
returns table (
  participante_id bigint,
  nome text,
  foto text,
  turma text,
  nota_instrutores numeric,
  instrutores_que_avaliaram integer,
  instrutores_da_turma integer,
  nota_banca integer,
  membros_que_avaliaram integer,
  total numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.eh_gestor()) then
    raise exception 'Só o gestor vê o resultado.' using errcode = '42501';
  end if;
  return query
  select p.id, p.nome, p.foto, t.nome,
         round(ai.media, 2), coalesce(ai.quantos, 0)::integer,
         (select count(*)::integer
          from public.professores_turmas pt
          join public.perfis pf on pf.id = pt.professor_id
          join public.edicoes e on e.id = p_edicao
          where pt.turma_id = p.turma_id and pf.papel = 'professor'
            and (not pf.pode_alternar_papel or e.demonstracao)),
         b.total, coalesce(b.membros, 0)::integer,
         round(coalesce(ai.media, 0) + coalesce(b.total, 0), 2)
  from public.participantes p
  left join public.turmas t on t.id = p.turma_id
  left join lateral (
    select avg(a.soma) as media, count(*) as quantos from public.avaliacoes_instrutor a where a.participante_id = p.id
  ) ai on true
  left join private.total_da_banca(p_edicao) b on b.participante_id = p.id
  where p.edicao_id = p_edicao and p.funcao = 'aluno'
  order by 10 desc, p.nome;
end;
$$;
