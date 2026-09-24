-- Limpeza de arquivo que não virou entrega: o aluno dono apaga mesmo com o envio
-- já fechado (ex.: o arquivo subiu no último segundo e o prazo venceu antes do
-- registro). Continua proibido apagar arquivo que já está numa entrega.
create function private.e_dono_da_entrega(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.pode_enviar(c.atividade, c.participante), false)
  from private.partes_do_caminho(p_nome) c;
$$;

revoke execute on function private.e_dono_da_entrega(text) from public, anon;
grant execute on function private.e_dono_da_entrega(text) to authenticated;

drop policy "apaga entrega nao usada" on storage.objects;
create policy "apaga entrega nao usada" on storage.objects for delete to authenticated
  using (
    bucket_id = 'entregas'
    and (select private.e_dono_da_entrega(name))
    and not (select private.entrega_em_uso(name))
  );
