-- Teste do "Ver como" (alternar_papel, migrations 20260930108000 e 20260930110000).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/ver_como.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_conta uuid := gen_random_uuid();
  v_comum uuid := gen_random_uuid();
  v_aberta bigint;
  v_encerrada bigint;
  v_n bigint;
  v_txt text;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_conta, 'ver-como@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_comum, 'ver-como-comum@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'gestor', nome = 'Conta Ver Como', pode_alternar_papel = true where id = v_conta;
  update public.perfis set papel = 'gestor' where id = v_comum;

  -- A edição mais recente está encerrada; a aberta mais recente vem antes dela
  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste ver como aberta', 9701, 'teste') returning id into v_aberta;
  insert into public.turmas (edicao_id, nome) values (v_aberta, 'Turma 1');
  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste ver como encerrada', 9702, 'teste') returning id into v_encerrada;
  insert into public.turmas (edicao_id, nome) values (v_encerrada, 'Turma 1');
  update public.edicoes set encerrada = true where id = v_encerrada;

  -- ===== Conta que alterna papéis =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_conta, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.alternar_papel('parceiro');
  select papel::text into v_txt from public.perfis where id = v_conta;
  r := r || E'\n' || case when v_txt = 'parceiro' then 'ok' else 'FALHOU' end || ' - vira parceiro';

  perform public.alternar_papel('professor');
  select papel::text into v_txt from public.perfis where id = v_conta;
  select count(*) into v_n from public.professores_turmas pt join public.turmas t on t.id = pt.turma_id
  where pt.professor_id = v_conta and t.edicao_id = v_aberta;
  r := r || E'\n' || case when v_txt = 'professor' and v_n = 1 then 'ok' else 'FALHOU' end
    || ' - vira instrutor mesmo com a edição mais recente encerrada (vincula à aberta)';

  perform public.alternar_papel('gestor');
  reset role;

  -- A conta do "Ver como" nunca aparece na equipe do site
  update public.edicoes set encerrada = true where ordem between 1 and 9700 and not demonstracao and not encerrada;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into v_n from public.equipe_da_edicao_atual() where nome in ('Conta Ver Como', 'Conta Como');
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - conta do Ver como fica fora da equipe do site';
  reset role;

  -- ===== Conta comum não alterna =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_comum, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.alternar_papel('parceiro');
    r := r || E'\nFALHOU - conta comum alternou papel';
  exception when insufficient_privilege then r := r || E'\nok - conta comum não alterna papel';
  end;
  reset role;

  raise exception '%', r;
end;
$$;
