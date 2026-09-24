-- Conversa das solicitações, segunda revisão:
-- 1. Mensagem da coordenação num pedido ABERTO inicia o atendimento no próprio
--    banco (antes o navegador mudava o status depois, e uma lista velha podia
--    desfazer a conclusão feita por outro gestor).
-- 2. O aluno aparece com uma foto só na conversa inteira: a da ficha da turma
--    (a mesma do balão do pedido); a do perfil só se a ficha não tiver.
-- 3. A lista do gestor diz também QUEM concluiu (id), para a conversa mostrar
--    "Você" só na devolutiva que a própria pessoa escreveu.

-- ============================================
-- 1 e 2. Preparar a mensagem e iniciar o atendimento
-- ============================================
create or replace function private.preparar_mensagem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Foto: a da ficha do aluno; sem ficha (equipe) ou sem foto nela, a do perfil
  select pf.papel, nullif(trim(pf.nome), ''), coalesce(pa.foto, pf.foto)
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

create function private.iniciar_atendimento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Só sai de "aberta": pedido já em andamento ou concluído não muda
  if new.autor_papel = 'gestor' then
    update public.solicitacoes set status = 'em_andamento'
    where id = new.solicitacao_id and status = 'pendente';
  end if;
  return null;
end;
$$;

revoke execute on function private.iniciar_atendimento() from public, anon, authenticated;

create trigger mensagens_solicitacao_iniciar_atendimento
  after insert on public.mensagens_solicitacao
  for each row execute function private.iniciar_atendimento();

-- ============================================
-- 3. Lista do gestor com o id de quem concluiu
-- ============================================
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
  where (select private.eh_gestor())
  order by s.criada_em desc;
$$;

revoke execute on function public.solicitacoes_da_equipe() from public, anon;
grant execute on function public.solicitacoes_da_equipe() to authenticated;
