-- Solicitações viram uma conversa:
-- - o aluno pede e troca mensagens com a coordenação até a devolutiva;
-- - o gestor pode pedir mais informação, encaminhar a um parceiro e concluir;
-- - o parceiro encaminhado conversa só com a coordenação (mensagem interna,
--   o aluno não vê); a coordenação repassa a devolutiva ao aluno.
-- Também: o tipo do pedido vira texto livre, o gestor deixa de registrar pedido
-- (só responde) e a lista da equipe junta todas as edições.

-- ============================================
-- Tipo livre (o aluno escreve). Os três tipos antigos viram texto legível.
-- ============================================
alter table public.solicitacoes drop constraint solicitacoes_tipo_check;
update public.solicitacoes set tipo = case tipo
  when 'mudanca_turno' then 'Mudança de turno'
  when 'mudanca_turma' then 'Mudança de turma'
  when 'outro' then 'Outro assunto'
  else tipo
end;
alter table public.solicitacoes add constraint solicitacoes_tipo_check
  check (length(trim(tipo)) between 1 and 80);

-- ============================================
-- Gestor só responde: lê, atualiza e apaga, mas não cria pedido
-- ============================================
drop policy "gestor gerencia solicitacoes" on public.solicitacoes;
create policy "gestor le solicitacoes" on public.solicitacoes
  for select to authenticated using ((select private.eh_gestor()));
create policy "gestor atende solicitacoes" on public.solicitacoes
  for update to authenticated using ((select private.eh_gestor())) with check ((select private.eh_gestor()));
create policy "gestor apaga solicitacoes" on public.solicitacoes
  for delete to authenticated using ((select private.eh_gestor()));

-- ============================================
-- Encaminhar a um parceiro (um por vez)
-- ============================================
alter table public.solicitacoes
  add column encaminhada_para uuid references public.perfis (id) on delete set null;
create index solicitacoes_encaminhada_para_idx on public.solicitacoes (encaminhada_para);
-- A política "gestor atende solicitacoes" já limita o update ao gestor
grant update (encaminhada_para) on public.solicitacoes to authenticated;

create function private.conferir_encaminhamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.encaminhada_para is not null and not exists (
    select 1 from public.perfis where id = new.encaminhada_para and papel = 'parceiro'
  ) then
    raise exception 'Só dá para encaminhar a um parceiro.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke execute on function private.conferir_encaminhamento() from public, anon, authenticated;

create trigger solicitacoes_encaminhamento
  before insert or update of encaminhada_para on public.solicitacoes
  for each row execute function private.conferir_encaminhamento();

-- ============================================
-- Mensagens da conversa (imutáveis: sem update nem delete)
-- ============================================
create table public.mensagens_solicitacao (
  id             bigint generated always as identity primary key,
  solicitacao_id bigint not null references public.solicitacoes (id) on delete cascade,
  -- Sempre quem está logado (o cliente não tem permissão de escrever esta coluna)
  autor_id       uuid default auth.uid() references public.perfis (id) on delete set null,
  -- Preenchido pelo gatilho: o aluno e o parceiro não leem o perfil dos outros
  autor_papel    public.papel_usuario not null,
  texto          text not null check (length(trim(texto)) between 1 and 2000),
  -- Interna: só a coordenação e o parceiro encaminhado veem
  interna        boolean not null default false,
  criada_em      timestamptz not null default now()
);
create index mensagens_solicitacao_conversa_idx on public.mensagens_solicitacao (solicitacao_id, criada_em);
create index mensagens_solicitacao_autor_idx on public.mensagens_solicitacao (autor_id);

alter table public.mensagens_solicitacao enable row level security;
revoke all on public.mensagens_solicitacao from anon, authenticated;
grant select on public.mensagens_solicitacao to authenticated;
grant insert (solicitacao_id, texto, interna) on public.mensagens_solicitacao to authenticated;

/** Quem vê a mensagem: gestor tudo; parceiro a conversa encaminhada a ele; aluno a dele, sem as internas */
create function private.pode_ver_conversa(p_solicitacao bigint, p_interna boolean)
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
        and (
          ((select private.eh_parceiro()) and s.encaminhada_para = (select auth.uid()))
          or (not p_interna and s.participante_id = (select private.meu_participante()))
        )
    );
$$;

/**
 * Quem escreve: gestor sempre (inclusive interna); parceiro só interna e só na
 * encaminhada a ele; aluno só não interna e só na dele. Parceiro e aluno só
 * enquanto a solicitação está aberta ou em andamento.
 */
create function private.pode_escrever_na_conversa(p_solicitacao bigint, p_interna boolean)
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
        and (
          ((select private.eh_parceiro()) and p_interna and s.encaminhada_para = (select auth.uid()))
          or (not p_interna and s.participante_id = (select private.meu_participante()))
        )
    );
$$;

revoke execute on function private.pode_ver_conversa(bigint, boolean), private.pode_escrever_na_conversa(bigint, boolean)
  from public, anon;
grant execute on function private.pode_ver_conversa(bigint, boolean), private.pode_escrever_na_conversa(bigint, boolean)
  to authenticated;

create policy "le a conversa" on public.mensagens_solicitacao for select to authenticated
  using ((select private.pode_ver_conversa(solicitacao_id, interna)));
create policy "escreve na conversa" on public.mensagens_solicitacao for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and (select private.pode_escrever_na_conversa(solicitacao_id, interna))
  );

/** Carimba o papel de quem escreve e recusa mensagem nova em edição encerrada */
create function private.preparar_mensagem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select papel into new.autor_papel from public.perfis where id = new.autor_id;
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

revoke execute on function private.preparar_mensagem() from public, anon, authenticated;

create trigger mensagens_solicitacao_preparar
  before insert on public.mensagens_solicitacao
  for each row execute function private.preparar_mensagem();

-- ============================================
-- Lista da equipe: todas as edições, com o aluno e a edição de cada pedido.
-- Gestor vê tudo; parceiro só o que foi encaminhado a ele (ele não lê a tabela
-- solicitacoes nem participantes direto).
-- ============================================
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
         s.encaminhada_para, pf.nome, p.nome, p.foto, e.nome
  from public.solicitacoes s
  join public.participantes p on p.id = s.participante_id
  join public.edicoes e on e.id = p.edicao_id
  left join public.perfis pf on pf.id = s.encaminhada_para
  where (select private.eh_gestor())
     or ((select private.eh_parceiro()) and s.encaminhada_para = (select auth.uid()))
  order by s.criada_em desc;
$$;

revoke execute on function public.solicitacoes_da_equipe() from public, anon;
grant execute on function public.solicitacoes_da_equipe() to authenticated;
