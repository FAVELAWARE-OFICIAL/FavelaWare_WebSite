-- Prazos das avaliações
-- 1. Instrutores: a avaliação tem início E fim (o gestor define os dois). Fora do
--    prazo ela nem aparece para o instrutor.
-- 2. Banca: acontece num dia determinado (apresentação final / formatura). Só
--    nesse dia a banca dá nota; antes ela vê o aviso do dia, depois fica só leitura.
-- 3. Conserto: quem foi posto na banca pela Edge Function antiga virou "professor"
--    sem turma e sem dados da bolsa. Volta a ser "banca".

-- ============================================
-- 1 e 2. Datas na edição (a política "gestor edita edicao" limita ao gestor)
-- ============================================
alter table public.edicoes
  add column avaliacao_instrutores_ate date,
  add column banca_em date,
  add constraint edicoes_prazo_da_avaliacao check (
    avaliacao_instrutores_ate is null or avaliacao_instrutores_em is null
    or avaliacao_instrutores_ate >= avaliacao_instrutores_em
  );
grant update (avaliacao_instrutores_ate, banca_em) on public.edicoes to authenticated;

/** Avaliação dos instrutores aberta hoje nesta edição (início e fim, horário de Brasília) */
create function private.avaliacao_dos_instrutores_aberta(p_edicao bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select not e.encerrada
      and e.avaliacao_instrutores_em is not null
      and e.avaliacao_instrutores_em <= (select private.hoje())
      and (e.avaliacao_instrutores_ate is null or e.avaliacao_instrutores_ate >= (select private.hoje()))
    from public.edicoes e where e.id = p_edicao
  ), false);
$$;

/** Hoje é o dia da banca nesta edição? */
create function private.dia_da_banca(p_edicao bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select not e.encerrada and e.banca_em = (select private.hoje()) from public.edicoes e where e.id = p_edicao
  ), false);
$$;

revoke execute on function private.avaliacao_dos_instrutores_aberta(bigint), private.dia_da_banca(bigint)
  from public, anon, authenticated;

-- ============================================
-- Instrutor: só dentro do prazo
-- ============================================
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
    and private.avaliacao_dos_instrutores_aberta(e.id)
    and private.avalia_de_verdade(e.id)
    and exists (select 1 from private.alunos_sem_minha_nota(t.id))
  order by e.ordem desc, t.nome;
$$;

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
  if not private.avaliacao_dos_instrutores_aberta(v_edicao.id) then
    raise exception 'A avaliação desta turma está fora do prazo definido pela coordenação.' using errcode = '22023';
  end if;
  if not private.avalia_de_verdade(v_edicao.id) then
    raise exception 'A conta de demonstração só avalia a turma de demonstração.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('avaliacao:' || v_eu::text || ':' || p_turma_id::text));

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
-- Banca: só no dia
-- ============================================
create or replace function public.avaliacao_da_banca()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_membro public.membros_banca := private.meu_membro_da_banca();
  v_edicao public.edicoes;
begin
  select * into v_edicao from public.edicoes where id = v_membro.edicao_id;

  if private.banca_completa(v_membro.edicao_id) then
    return jsonb_build_object(
      'membro', jsonb_build_object('nome', v_membro.nome, 'organizacao', v_membro.organizacao),
      'edicao', v_edicao.nome,
      'completa', true,
      'ranking', coalesce((
        select jsonb_agg(jsonb_build_object('nome', private.nome_curto(p.nome), 'turma', t.nome, 'foto', p.foto,
                                            'total', b.total)
                         order by b.total desc, p.nome)
        from private.total_da_banca(v_membro.edicao_id) b
        join public.participantes p on p.id = b.participante_id
        left join public.turmas t on t.id = p.turma_id
      ), '[]'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'membro', jsonb_build_object('nome', v_membro.nome, 'organizacao', v_membro.organizacao),
    'edicao', v_edicao.nome,
    'encerrada', v_edicao.encerrada,
    'concluida', v_membro.concluida_em is not null,
    'completa', false,
    'dia', v_edicao.banca_em,
    'hoje_e_o_dia', private.dia_da_banca(v_edicao.id),
    'alunos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'nome', private.nome_curto(p.nome), 'turma', t.nome, 'foto', p.foto,
               'inovacao', n.inovacao, 'apresentacao', n.apresentacao, 'aplicabilidade', n.aplicabilidade)
             order by t.nome, p.nome)
      from public.participantes p
      left join public.turmas t on t.id = p.turma_id
      left join public.notas_banca n on n.participante_id = p.id and n.membro_id = v_membro.id
      where p.edicao_id = v_membro.edicao_id and p.funcao = 'aluno'
    ), '[]'::jsonb)
  );
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
  if not private.dia_da_banca(v_membro.edicao_id) then
    raise exception 'A banca só avalia no dia da apresentação final definido pela coordenação.' using errcode = '22023';
  end if;
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

create or replace function public.concluir_avaliacao_da_banca()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membro public.membros_banca := private.meu_membro_da_banca();
begin
  if v_membro.concluida_em is not null then
    return;
  end if;
  if not private.dia_da_banca(v_membro.edicao_id) then
    raise exception 'A banca só avalia no dia da apresentação final definido pela coordenação.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.participantes p
    where p.edicao_id = v_membro.edicao_id and p.funcao = 'aluno'
      and not exists (select 1 from public.notas_banca n where n.membro_id = v_membro.id and n.participante_id = p.id)
  ) then
    raise exception 'Dê nota a todos os alunos antes de concluir.' using errcode = '22023';
  end if;
  update public.membros_banca set concluida_em = now() where id = v_membro.id;
end;
$$;

-- ============================================
-- 3. Conserto: banca convidada como instrutor (Edge Function antiga)
-- ============================================
update public.perfis pf
set papel = 'banca'
where pf.papel = 'professor'
  and not pf.pode_alternar_papel
  and exists (select 1 from public.membros_banca m where m.perfil_id = pf.id)
  and not exists (select 1 from public.professores_turmas pt where pt.professor_id = pf.id)
  and not exists (select 1 from public.dados_instrutores di where di.perfil_id = pf.id);
