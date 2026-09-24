-- Correção da auditoria de segurança: o rastro do ponto é gravado pelo banco.
-- 1. Quem alterou e quando: sempre auth.uid() e now(), mesmo gravando direto na
--    tabela (antes o professor podia escrever o id do gestor e um horário falso).
-- 2. Dia no futuro: recusado também no insert direto (antes só a RPC checava).
-- Não age dentro de outro gatilho (ex.: apagar um perfil zera alterado_por pela
-- chave estrangeira, e isso não pode ser desfeito aqui).
create or replace function private.pontos_professores_carimbar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if tg_op = 'INSERT' and new.data > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Não dá para marcar o ponto de um dia que ainda não chegou' using errcode = '22023';
  end if;
  new.alterado_por := (select auth.uid());
  new.registrado_em := now();
  return new;
end;
$$;

revoke all on function private.pontos_professores_carimbar() from public, anon, authenticated;

create trigger carimbar_ponto
  before insert or update on public.pontos_professores
  for each row execute function private.pontos_professores_carimbar();
