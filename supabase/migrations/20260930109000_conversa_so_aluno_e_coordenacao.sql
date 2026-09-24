-- A conversa das solicitações fica só entre o aluno e a coordenação:
-- - parceiro nunca responde solicitação: sai o encaminhamento e a mensagem
--   interna (o parceiro continua só com a leitura da Visão geral, Alunos e Chamada);
-- - cada mensagem guarda a foto de quem escreveu (conversa no estilo WhatsApp);
-- - a lista do aluno traz a foto dele.

-- ============================================
-- Conversa: sem mensagem interna
-- ============================================
drop policy "le a conversa" on public.mensagens_solicitacao;
drop policy "escreve na conversa" on public.mensagens_solicitacao;
drop function private.pode_ver_conversa(bigint, boolean);
drop function private.pode_escrever_na_conversa(bigint, boolean);

-- Mensagens internas eram só da equipe: saem antes da coluna, para nunca ficarem visíveis ao aluno
delete from public.mensagens_solicitacao where interna;
alter table public.mensagens_solicitacao drop column interna;
-- A permissão de insert por coluna continua (solicitacao_id, texto): a de "interna" some com a coluna

alter table public.mensagens_solicitacao add column autor_foto text;

/** Quem vê: o gestor, e o aluno na conversa dele */
create function private.pode_ver_conversa(p_solicitacao bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.eh_gestor())
    or exists (
      select 1 from public.solicitacoes s
      where s.id = p_solicitacao and s.participante_id = (select private.meu_participante())
    );
$$;

/** Quem escreve: o gestor sempre; o aluno na dele, enquanto está aberta ou em andamento */
create function private.pode_escrever_na_conversa(p_solicitacao bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.eh_gestor())
    or exists (
      select 1 from public.solicitacoes s
      where s.id = p_solicitacao
        and s.status in ('pendente', 'em_andamento')
        and s.participante_id = (select private.meu_participante())
    );
$$;

revoke execute on function private.pode_ver_conversa(bigint), private.pode_escrever_na_conversa(bigint)
  from public, anon;
grant execute on function private.pode_ver_conversa(bigint), private.pode_escrever_na_conversa(bigint)
  to authenticated;

create policy "le a conversa" on public.mensagens_solicitacao for select to authenticated
  using ((select private.pode_ver_conversa(solicitacao_id)));
create policy "escreve na conversa" on public.mensagens_solicitacao for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and (select private.pode_escrever_na_conversa(solicitacao_id))
  );

/** Carimba papel, nome e foto de quem escreve; edição encerrada não recebe mensagem */
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

-- ============================================
-- Sem encaminhamento
-- ============================================
drop trigger solicitacoes_encaminhamento on public.solicitacoes;
drop function private.conferir_encaminhamento();
drop function public.solicitacoes_da_equipe();
alter table public.solicitacoes drop column encaminhada_para;

-- Lista do gestor: todas as edições, com o aluno, a foto, a edição e quem respondeu
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
         g.nome, p.nome, p.foto, e.nome
  from public.solicitacoes s
  join public.participantes p on p.id = s.participante_id
  join public.edicoes e on e.id = p.edicao_id
  left join public.perfis g on g.id = s.resolvida_por
  where (select private.eh_gestor())
  order by s.criada_em desc;
$$;

revoke execute on function public.solicitacoes_da_equipe() from public, anon;
grant execute on function public.solicitacoes_da_equipe() to authenticated;

-- Do aluno: as próprias, com a foto dele (a primeira fala da conversa) e quem respondeu
drop function public.minhas_solicitacoes();
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
  respondida_por text,
  aluno text,
  foto text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.participante_id, s.tipo, s.descricao, s.status, s.resposta, s.criada_em, s.resolvida_em,
         g.nome, p.nome, p.foto
  from public.solicitacoes s
  join public.participantes p on p.id = s.participante_id
  left join public.perfis g on g.id = s.resolvida_por
  where s.participante_id = (select private.meu_participante())
  order by s.criada_em desc;
$$;

revoke execute on function public.minhas_solicitacoes() from public, anon;
grant execute on function public.minhas_solicitacoes() to authenticated;
