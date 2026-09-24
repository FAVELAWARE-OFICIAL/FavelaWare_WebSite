-- Funções das avaliações do fim da edição (tabelas em 20261001100000).
-- Todas security definer com search_path vazio; cada uma confere quem chama.

-- ============================================
-- Instrutor
-- ============================================

/**
 * A conta do "Ver como" (pode_alternar_papel) só avalia na edição de
 * demonstração: nunca entra na nota de aluno de verdade.
 */
create function private.avalia_de_verdade(p_edicao bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select e.demonstracao from public.edicoes e where e.id = p_edicao), false)
    or not coalesce((select pf.pode_alternar_papel from public.perfis pf where pf.id = (select auth.uid())), false);
$$;

/** Turmas que o instrutor ainda precisa avaliar (a data chegou e ele não salvou) */
create function public.minhas_avaliacoes_pendentes()
returns table (turma_id bigint, turma_nome text, edicao_nome text, alunos integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.nome, e.nome,
         (select count(*)::integer from public.participantes p where p.turma_id = t.id and p.funcao = 'aluno')
  from public.turmas t
  join public.edicoes e on e.id = t.edicao_id
  where t.id in (select private.minhas_turmas())
    and not e.encerrada
    and e.avaliacao_instrutores_em is not null
    and e.avaliacao_instrutores_em <= (select private.hoje())
    and private.avalia_de_verdade(e.id)
    and not exists (
      select 1 from public.avaliacoes_instrutor a
      where a.turma_id = t.id and a.professor_id = (select auth.uid())
    )
  order by e.ordem desc, t.nome;
$$;

/**
 * Grava a avaliação da turma inteira, de uma vez e para sempre.
 * p_notas: [{participante_id, participacao, entrega, comportamento, observacao}]
 * com exatamente os alunos da turma.
 */
create function public.salvar_avaliacao_da_turma(p_turma_id bigint, p_notas jsonb)
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
  if exists (select 1 from public.avaliacoes_instrutor a where a.turma_id = p_turma_id and a.professor_id = v_eu) then
    raise exception 'Você já avaliou esta turma. A avaliação não pode ser editada.' using errcode = '22023';
  end if;

  -- Exatamente os alunos da turma, cada um uma vez
  if jsonb_typeof(p_notas) is distinct from 'array' then
    raise exception 'Avaliação inválida.' using errcode = '22023';
  end if;
  select count(*) into v_esperados from public.participantes p where p.turma_id = p_turma_id and p.funcao = 'aluno';
  select count(*), count(distinct r.participante_id) filter (
           where r.participante_id in (select p.id from public.participantes p where p.turma_id = p_turma_id and p.funcao = 'aluno'))
  into v_recebidos, v_certos
  from jsonb_to_recordset(p_notas) r(participante_id bigint);
  if v_esperados = 0 or v_recebidos <> v_esperados or v_certos <> v_esperados then
    raise exception 'Avalie todos os alunos da turma (uma vez cada) antes de salvar.' using errcode = '22023';
  end if;

  insert into public.avaliacoes_instrutor (professor_id, participante_id, turma_id, participacao, entrega, comportamento, observacao)
  select v_eu, r.participante_id, p_turma_id, r.participacao, r.entrega, r.comportamento, nullif(trim(r.observacao), '')
  from jsonb_to_recordset(p_notas) r(participante_id bigint, participacao smallint, entrega smallint,
                                     comportamento smallint, observacao text);
end;
$$;

revoke execute on function private.avalia_de_verdade(bigint) from public, anon;
grant execute on function private.avalia_de_verdade(bigint) to authenticated;
revoke execute on function public.minhas_avaliacoes_pendentes(), public.salvar_avaliacao_da_turma(bigint, jsonb)
  from public, anon;
grant execute on function public.minhas_avaliacoes_pendentes(), public.salvar_avaliacao_da_turma(bigint, jsonb)
  to authenticated;

-- ============================================
-- Gestor: banca
-- ============================================

/** Token novo (64 hex) e o hash que fica no banco */
create function private.novo_token_da_banca(out token text, out hash bytea)
language sql
volatile
set search_path = ''
as $$
  select t, sha256(convert_to(t, 'UTF8'))
  from (select encode(extensions.gen_random_bytes(32), 'hex') as t) x;
$$;

revoke execute on function private.novo_token_da_banca() from public, anon, authenticated;

/** Cadastra o membro e devolve o token do link (só aparece esta vez) */
create function public.cadastrar_membro_banca(p_edicao bigint, p_nome text, p_organizacao text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo record;
begin
  if not (select private.eh_gestor()) then
    raise exception 'Só o gestor cadastra a banca.' using errcode = '42501';
  end if;
  select * into v_novo from private.novo_token_da_banca();
  insert into public.membros_banca (edicao_id, nome, organizacao, token_hash)
  values (p_edicao, trim(p_nome), trim(p_organizacao), v_novo.hash);
  return v_novo.token;
end;
$$;

/** Novo link para o membro (o anterior para de funcionar) */
create function public.gerar_link_banca(p_membro bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo record;
begin
  if not (select private.eh_gestor()) then
    raise exception 'Só o gestor gera o link da banca.' using errcode = '42501';
  end if;
  select * into v_novo from private.novo_token_da_banca();
  update public.membros_banca set token_hash = v_novo.hash where id = p_membro;
  if not found then
    raise exception 'Membro da banca não encontrado.' using errcode = '22023';
  end if;
  return v_novo.token;
end;
$$;

/** Desativa o link do membro */
create function public.desativar_link_banca(p_membro bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.eh_gestor()) then
    raise exception 'Só o gestor desativa o link da banca.' using errcode = '42501';
  end if;
  update public.membros_banca set token_hash = null where id = p_membro;
end;
$$;

revoke execute on function public.cadastrar_membro_banca(bigint, text, text), public.gerar_link_banca(bigint),
  public.desativar_link_banca(bigint) from public, anon;
grant execute on function public.cadastrar_membro_banca(bigint, text, text), public.gerar_link_banca(bigint),
  public.desativar_link_banca(bigint) to authenticated;

-- ============================================
-- Resultado
-- ============================================

/** Total da banca por aluno: soma das três notas de todos os membros (como a planilha) */
create function private.total_da_banca(p_edicao bigint)
returns table (participante_id bigint, total integer, membros integer)
language sql
stable
security definer
set search_path = ''
as $$
  select n.participante_id, sum(n.inovacao + n.apresentacao + n.aplicabilidade)::integer, count(*)::integer
  from public.notas_banca n
  join public.membros_banca m on m.id = n.membro_id
  where m.edicao_id = p_edicao
  group by n.participante_id;
$$;

/** Banca completa: tem membro, todos concluíram e todos deram nota a todos os alunos da edição */
create function private.banca_completa(p_edicao bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.membros_banca m where m.edicao_id = p_edicao)
    and not exists (
      select 1 from public.membros_banca m
      where m.edicao_id = p_edicao
        and (m.concluida_em is null
             or exists (
               select 1 from public.participantes p
               where p.edicao_id = p_edicao and p.funcao = 'aluno'
                 and not exists (select 1 from public.notas_banca n where n.membro_id = m.id and n.participante_id = p.id)
             ))
    );
$$;

revoke execute on function private.total_da_banca(bigint), private.banca_completa(bigint) from public, anon, authenticated;

/**
 * Gestor: resultado da edição. Nota dos instrutores = média das SOMAS de quem
 * avaliou (0 a 30); nota da banca = soma de todos os membros; total = as duas.
 */
create function public.resultado_das_avaliacoes(p_edicao bigint)
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
         (select count(*)::integer from public.professores_turmas pt where pt.turma_id = p.turma_id),
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

revoke execute on function public.resultado_das_avaliacoes(bigint) from public, anon;
grant execute on function public.resultado_das_avaliacoes(bigint) to authenticated;

-- ============================================
-- Banca (link pessoal, sem conta)
-- ============================================

/** Membro dono do token; token inválido ou desativado dá sempre o mesmo erro */
create function private.membro_do_token(p_token text)
returns public.membros_banca
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_membro public.membros_banca;
begin
  if p_token is not null and p_token ~ '^[0-9a-f]{64}$' then
    select * into v_membro from public.membros_banca where token_hash = sha256(convert_to(p_token, 'UTF8'));
  end if;
  if v_membro.id is null then
    raise exception 'Link inválido ou desativado. Peça um novo à coordenação.' using errcode = '42501';
  end if;
  return v_membro;
end;
$$;

revoke execute on function private.membro_do_token(text) from public, anon, authenticated;

/**
 * O que o link mostra: enquanto a banca avalia, os alunos da edição e SÓ as
 * notas deste membro; com a banca completa, só a lista final (sem ids).
 */
create function public.avaliacao_da_banca(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_membro public.membros_banca := private.membro_do_token(p_token);
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

/** Grava (ou corrige) a nota do membro para um aluno, até ele concluir */
create function public.salvar_nota_da_banca(
  p_token text,
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
  v_membro public.membros_banca := private.membro_do_token(p_token);
begin
  if v_membro.concluida_em is not null then
    raise exception 'Você já concluiu a avaliação: as notas não mudam mais.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.participantes p
    where p.id = p_participante and p.edicao_id = v_membro.edicao_id and p.funcao = 'aluno'
  ) then
    raise exception 'Este aluno não é desta edição.' using errcode = '22023';
  end if;
  insert into public.notas_banca (membro_id, participante_id, inovacao, apresentacao, aplicabilidade)
  values (v_membro.id, p_participante, p_inovacao, p_apresentacao, p_aplicabilidade)
  on conflict (membro_id, participante_id) do update
    set inovacao = excluded.inovacao, apresentacao = excluded.apresentacao,
        aplicabilidade = excluded.aplicabilidade, atualizado_em = now();
end;
$$;

/** Concluir: exige nota em todos os alunos; depois disso nada muda */
create function public.concluir_avaliacao_da_banca(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membro public.membros_banca := private.membro_do_token(p_token);
begin
  if v_membro.concluida_em is not null then
    return;
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

revoke execute on function public.avaliacao_da_banca(text), public.salvar_nota_da_banca(text, bigint, smallint, smallint, smallint),
  public.concluir_avaliacao_da_banca(text) from public;
grant execute on function public.avaliacao_da_banca(text), public.salvar_nota_da_banca(text, bigint, smallint, smallint, smallint),
  public.concluir_avaliacao_da_banca(text) to anon, authenticated;
