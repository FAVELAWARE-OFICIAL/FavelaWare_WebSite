-- Teste de quem troca a função (papel) de quem (migrations 20261001110000 a 112000).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/funcao_da_equipe.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_lider uuid := gen_random_uuid();
  v_gestor uuid := gen_random_uuid();
  v_prof uuid := gen_random_uuid();
  v_parceiro uuid := gen_random_uuid();
  v_txt text;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_lider, 'func-lider@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_gestor, 'func-gestor@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_prof, 'func-prof@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_parceiro, 'func-parceiro@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'gestor', pode_alternar_papel = true where id = v_lider;
  update public.perfis set papel = 'gestor' where id = v_gestor;
  update public.perfis set papel = 'professor' where id = v_prof;
  update public.perfis set papel = 'parceiro' where id = v_parceiro;

  -- ===== Gestor =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.perfis set papel = 'banca' where id = v_parceiro;
  select papel::text into v_txt from public.perfis where id = v_parceiro;
  r := r || E'\n' || case when v_txt = 'banca' then 'ok' else 'FALHOU' end || ' - gestor troca a função de outra pessoa';
  begin
    update public.perfis set papel = 'professor' where id = v_lider;
    r := r || E'\nFALHOU - gestor mudou o papel da líder discente';
  exception when insufficient_privilege then r := r || E'\nok - o papel da líder discente só ela muda';
  end;
  begin
    update public.perfis set pode_alternar_papel = true where id = v_gestor;
    r := r || E'\nFALHOU - gestor se deu todas as personas';
  exception when insufficient_privilege then r := r || E'\nok - ninguém mais ganha todas as personas';
  end;
  reset role;

  -- ===== Instrutor não troca função de ninguém =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.perfis set papel = 'gestor' where id = v_prof;
    reset role;
    select papel::text into v_txt from public.perfis where id = v_prof;
    r := r || E'\n' || case when v_txt = 'professor' then 'ok' else 'FALHOU' end || ' - instrutor não vira gestor';
  exception when insufficient_privilege then r := r || E'\nok - instrutor não vira gestor';
  end;
  reset role;

  -- ===== Líder discente: todas as personas ("Ver como") =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_lider, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.alternar_papel('parceiro');
  select papel::text into v_txt from public.perfis where id = v_lider;
  r := r || E'\n' || case when v_txt = 'parceiro' then 'ok' else 'FALHOU' end || ' - a líder discente troca a própria persona';
  perform public.alternar_papel('gestor');
  update public.perfis set papel = 'parceiro' where id = v_prof;
  reset role;
  select papel::text into v_txt from public.perfis where id = v_prof;
  r := r || E'
' || case when v_txt = 'parceiro' then 'ok' else 'FALHOU' end || ' - a líder discente troca a função de outra pessoa';

  raise exception '%', r;
end;
$$;
