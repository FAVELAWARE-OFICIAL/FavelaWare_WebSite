-- Ajustes da revisão das entregas no Drive.

-- 1. Arquivo que não virou entrega NÃO é mais apagado do registro: fica marcado
--    como descartado. Assim o limite de envios não zera a cada falha forçada
--    (o Drive guarda a lixeira por 30 dias e isso conta no espaço da ONG).
alter table public.arquivos_entrega add column descartado_em timestamptz;

-- Limite: até 5 arquivos sem entrega por aluno e atividade nas últimas 24 horas
-- (inclui os descartados). A mesma regra de envio de sempre continua valendo.
create or replace function public.posso_enviar_arquivo(p_atividade bigint)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_participante bigint := private.meu_participante();
  v_prazo timestamptz;
  v_status text;
  v_soltos int;
begin
  if v_participante is null or not private.pode_enviar(p_atividade, v_participante) then
    raise exception 'Você não pode enviar arquivo para esta atividade' using errcode = '42501';
  end if;

  -- Mesma regra do trigger tentativas_ao_enviar (1º envio até o prazo; "refazer" reabre).
  -- Se mudar lá, mude aqui.
  select prazo into v_prazo from public.atividades where id = p_atividade;
  select status into v_status
  from public.tentativas
  where atividade_id = p_atividade and participante_id = v_participante
  order by numero desc limit 1;

  if (v_status is null and now() > v_prazo) or (v_status is not null and v_status <> 'refazer') then
    raise exception 'O envio das tarefas não está mais disponível' using errcode = '22023';
  end if;

  select count(*) into v_soltos
  from public.arquivos_entrega a
  where a.atividade_id = p_atividade and a.participante_id = v_participante
    and a.criado_em > now() - interval '24 hours'
    and not exists (select 1 from public.tentativas t where t.arquivo_id = a.id);
  if v_soltos >= 5 then
    raise exception 'Muitos arquivos enviados sem concluir a entrega. Tente de novo amanhã.' using errcode = '22023';
  end if;

  return v_participante;
end;
$$;

-- 2. Apagar aluno ou turma com entrega no Drive: a checagem da referência fica
--    para o fim do comando (as duas cascatas terminam antes)
alter table public.tentativas drop constraint tentativas_arquivo_id_fkey;
alter table public.tentativas add constraint tentativas_arquivo_id_fkey
  foreign key (arquivo_id) references public.arquivos_entrega (id) on delete no action;

-- 3. Índice duplicado (o unique já indexa arquivo_id)
drop index public.tentativas_arquivo_id_idx;

-- 4. Sem uso desde que o envio direto ao Storage acabou
drop function private.pode_enviar_entrega(text);
