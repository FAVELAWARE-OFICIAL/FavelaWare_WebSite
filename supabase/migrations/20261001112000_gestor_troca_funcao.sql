-- Função (papel) de cada pessoa:
-- - qualquer GESTOR troca a função dos outros (tela Equipe);
-- - só a dona do portal tem TODAS as personas (pode_alternar_papel, o "Ver como"):
--   ninguém mais ganha essa permissão, e o papel da dona só ela muda;
-- - pela API, quem não é gestor nem dona não troca papel nenhum.
-- Tarefas do servidor (convite, acessos dos alunos) e manutenção direta seguem como antes.
create or replace function private.papel_so_pelo_dono()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quem_e_dona boolean;
  v_quem_e_gestor boolean;
begin
  if current_setting('role', true) not in ('authenticated', 'anon') then
    return new;
  end if;
  select coalesce(bool_or(pode_alternar_papel), false), coalesce(bool_or(papel = 'gestor'), false)
  into v_quem_e_dona, v_quem_e_gestor
  from public.perfis where id = (select auth.uid());

  -- Todas as personas: só a dona tem, e ninguém dá nem tira
  if new.pode_alternar_papel is distinct from old.pode_alternar_papel and not v_quem_e_dona then
    raise exception 'Só a responsável pelo portal tem todas as personas.' using errcode = '42501';
  end if;

  if new.papel is distinct from old.papel then
    -- O papel da dona só ela muda (é o "Ver como")
    if old.pode_alternar_papel and old.id <> (select auth.uid()) then
      raise exception 'O papel da responsável pelo portal só ela muda.' using errcode = '42501';
    end if;
    if not (v_quem_e_dona or v_quem_e_gestor) then
      raise exception 'Só o gestor troca a função de alguém.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
