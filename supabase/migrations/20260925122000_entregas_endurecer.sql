-- Correções da auditoria de segurança das entregas.

-- 1. Caminho do arquivo com formato fixo: "<atividade>/<participante>/<uuid>.<ext>",
--    sem zero à esquerda e só com as extensões aceitas. Qualquer outro nome não
--    passa nas políticas do Storage.
create or replace function private.partes_do_caminho(p_nome text, out atividade bigint, out participante bigint)
language sql
immutable
set search_path = ''
as $$
  select case when p_nome ~ '^[1-9][0-9]{0,17}/[1-9][0-9]{0,17}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|webp|txt|zip|docx|xlsx|pptx)$'
              then split_part(p_nome, '/', 1)::bigint end,
         case when p_nome ~ '^[1-9][0-9]{0,17}/[1-9][0-9]{0,17}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|webp|txt|zip|docx|xlsx|pptx)$'
              then split_part(p_nome, '/', 2)::bigint end;
$$;

-- 2. Envio aberto + no máximo 3 arquivos soltos (ainda sem entrega) por pasta:
--    impede encher o Storage com uploads repetidos.
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
    )
    and (
      select count(*) from storage.objects o
      where o.bucket_id = 'entregas'
        and o.name like c.atividade::text || '/' || c.participante::text || '/%'
        and not exists (select 1 from public.tentativas t where t.arquivo_caminho = o.name)
    ) < 3,
    false
  )
  from private.partes_do_caminho(p_nome) c;
$$;

-- 3. O nome do download precisa ter a mesma extensão do arquivo guardado
--    (senão um PDF poderia ser baixado como "trabalho.html").
alter table public.tentativas add constraint tentativas_nome_com_extensao_do_arquivo
  check (
    arquivo_caminho is null
    or lower(arquivo_nome) like '%.' || substring(arquivo_caminho from '\.([a-z]+)$')
  );
