-- Banca avaliadora com conta (no lugar do link com código):
-- - o gestor cadastra o membro com nome, e-mail e organização. Quem já tem conta
--   (ex.: uma gestora) só é vinculado; quem é de fora recebe o convite por e-mail
--   (Edge Function convidar-professor com papel "banca"), cria a senha e entra;
-- - a conta "banca" só enxerga a avaliação dela e, no fim, a lista completa;
-- - cada membro só vê as próprias notas (as regras não mudam).
-- O link com código (token) sai: ninguém mais avalia sem login.

-- ============================================
-- Sai o acesso por código
-- ============================================
drop function public.avaliacao_da_banca(text);
drop function public.salvar_nota_da_banca(text, bigint, smallint, smallint, smallint);
drop function public.concluir_avaliacao_da_banca(text);
drop function public.cadastrar_membro_banca(bigint, text, text);
drop function public.gerar_link_banca(bigint);
drop function public.desativar_link_banca(bigint);
drop function private.membro_do_token(text);
drop function private.novo_token_da_banca();

alter table public.membros_banca drop column link_ativo;
alter table public.membros_banca drop column token_hash;

-- Cada membro é uma conta (a mesma pessoa não entra duas vezes na banca da edição)
delete from public.membros_banca;  -- cadastros de teste do modelo antigo, sem conta
alter table public.membros_banca
  add column perfil_id uuid not null references public.perfis (id) on delete cascade,
  add column email text not null check (length(trim(email)) between 3 and 200);
alter table public.membros_banca add constraint membros_banca_pessoa_unica unique (edicao_id, perfil_id);
create index membros_banca_perfil_idx on public.membros_banca (perfil_id);

grant select (perfil_id, email) on public.membros_banca to authenticated;

-- ============================================
-- Gestor
-- ============================================

/** Vincula a conta (já existente ou recém-convidada) à banca da edição */
create function public.cadastrar_membro_banca(p_edicao bigint, p_perfil uuid, p_nome text, p_email text, p_organizacao text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not (select private.eh_gestor()) then
    raise exception 'Só o gestor cadastra a banca.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.perfis where id = p_perfil) then
    raise exception 'Conta não encontrada.' using errcode = '22023';
  end if;
  insert into public.membros_banca (edicao_id, perfil_id, nome, email, organizacao)
  values (p_edicao, p_perfil, trim(p_nome), lower(trim(p_email)), trim(p_organizacao))
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Esta pessoa já está na banca desta edição.' using errcode = '22023';
end;
$$;

revoke execute on function public.cadastrar_membro_banca(bigint, uuid, text, text, text) from public, anon;
grant execute on function public.cadastrar_membro_banca(bigint, uuid, text, text, text) to authenticated;

-- ============================================
-- Membro da banca (logado)
-- ============================================

/** Minha participação na banca: a da edição mais recente em que estou */
create function private.meu_membro_da_banca()
returns public.membros_banca
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_membro public.membros_banca;
begin
  select m.* into v_membro
  from public.membros_banca m
  join public.edicoes e on e.id = m.edicao_id
  where m.perfil_id = (select auth.uid())
  order by e.ordem desc
  limit 1;
  if v_membro.id is null then
    raise exception 'Você não está na banca avaliadora de nenhuma edição.' using errcode = '42501';
  end if;
  return v_membro;
end;
$$;

revoke execute on function private.meu_membro_da_banca() from public, anon, authenticated;

/** Está em alguma banca? (a área decide se mostra o item "Banca avaliadora") */
create function public.sou_da_banca()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.membros_banca where perfil_id = (select auth.uid()));
$$;

/**
 * O que o membro vê: enquanto a banca avalia, os alunos da edição e SÓ as notas
 * dele; com a banca completa, só a lista final (sem ids).
 */
create function public.avaliacao_da_banca()
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
create function public.concluir_avaliacao_da_banca()
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

revoke execute on function public.sou_da_banca(), public.avaliacao_da_banca(),
  public.salvar_nota_da_banca(bigint, smallint, smallint, smallint), public.concluir_avaliacao_da_banca()
  from public, anon;
grant execute on function public.sou_da_banca(), public.avaliacao_da_banca(),
  public.salvar_nota_da_banca(bigint, smallint, smallint, smallint), public.concluir_avaliacao_da_banca()
  to authenticated;
