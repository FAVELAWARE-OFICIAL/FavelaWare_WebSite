-- Correções da revisão do perfil e das atividades.

-- 1. "Meu perfil" do aluno: data de nascimento e e-mail continuam obrigatórios,
--    como no primeiro acesso (antes dava para apagar os dois).
create or replace function public.atualizar_meus_dados_de_aluno(p_data_nascimento date, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participante bigint;
begin
  select participante_id into v_participante
  from public.perfis
  where id = (select auth.uid()) and papel = 'aluno' and participante_id is not null;

  if v_participante is null then
    raise exception 'Conta sem aluno ligado' using errcode = '42501';
  end if;

  if p_data_nascimento is null or nullif(trim(p_email), '') is null then
    raise exception 'Informe a data de nascimento e o e-mail' using errcode = '22023';
  end if;

  -- Formato do e-mail e data válida: os checks das colunas de participantes
  update public.participantes
  set data_nascimento = p_data_nascimento,
      email = lower(trim(p_email))
  where id = v_participante;
end;
$$;

-- 2. Arquivo de entrega só sobe com o envio aberto (mesma regra do trigger de
--    envio): sem tentativa e antes do prazo, ou com a última tentativa em
--    "refazer". Antes o aluno podia encher o Storage com o envio já fechado.
create or replace function private.pode_enviar_entrega(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.pode_enviar(c.atividade, c.participante)
    and (
      select case
        when u.status is null then now() <= a.prazo
        else u.status = 'refazer'
      end
      from public.atividades a
      left join lateral (
        select t.status from public.tentativas t
        where t.atividade_id = a.id and t.participante_id = c.participante
        order by t.numero desc limit 1
      ) u on true
      where a.id = c.atividade
    ),
    false
  )
  from private.partes_do_caminho(p_nome) c;
$$;

-- 3. Avaliar e reenviar ao mesmo tempo: a avaliação pega a mesma trava do envio,
--    então nunca fica "1ª concluída + 2ª aguardando".
create or replace function private.tentativas_ao_avaliar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (private.eh_gestor() or new.atividade_id in (select private.minhas_atividades())) then
    raise exception 'Sem permissão para avaliar' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.atividade_id::text || ':' || new.participante_id::text, 0));

  if exists (
    select 1 from public.tentativas t
    where t.atividade_id = new.atividade_id and t.participante_id = new.participante_id and t.numero > new.numero
  ) then
    raise exception 'Só a última tentativa pode ser avaliada' using errcode = '22023';
  end if;
  if new.status = 'aguardando' then
    raise exception 'Escolha Concluída ou Refazer' using errcode = '22023';
  end if;

  new.avaliada_em := now();
  new.avaliada_por := (select auth.uid());
  new.avaliada_por_nome := (select nome from public.perfis where id = (select auth.uid()));
  return new;
end;
$$;
