-- Teste das regras do ponto dos professores.
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/rls_ponto.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_prof uuid := gen_random_uuid();
  v_outro uuid := gen_random_uuid();
  v_aluno uuid := gen_random_uuid();
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_n bigint;
  v_txt text;
  r text := 'RELATORIO';
begin
  insert into auth.users (id, email, aud, role) values
    (v_prof, 'ponto-prof@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_outro, 'ponto-outro@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_aluno, 'ponto-aluno@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'professor' where id in (v_prof, v_outro);

  -- ===== Professor =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.registrar_ponto(v_hoje, 'presente');
  select situacao into v_txt from public.pontos_professores where professor_id = v_prof and data = v_hoje;
  r := r || E'\n' || case when v_txt = 'presente' then 'ok' else 'FALHOU' end || ' - professor marca P no próprio dia';

  perform public.registrar_ponto(v_hoje, 'justificada');
  select count(*), max(situacao) into v_n, v_txt from public.pontos_professores where professor_id = v_prof and data = v_hoje;
  r := r || E'\n' || case when v_n = 1 and v_txt = 'justificada' then 'ok' else 'FALHOU' end || ' - corrige o mesmo dia sem duplicar';

  perform public.registrar_ponto(v_hoje - 3, 'ausente');
  select count(*) into v_n from public.pontos_professores where professor_id = v_prof;
  r := r || E'\n' || case when v_n = 2 then 'ok' else 'FALHOU' end || ' - marca um dia anterior (F)';

  perform public.registrar_ponto(v_hoje - 3, null);
  select count(*) into v_n from public.pontos_professores where professor_id = v_prof;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - desmarca um dia';

  begin
    perform public.registrar_ponto(v_hoje + 1, 'presente');
    r := r || E'\nFALHOU - aceitou dia no futuro';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa dia no futuro';
  end;

  begin
    perform public.registrar_ponto(v_hoje, 'folga');
    r := r || E'\nFALHOU - aceitou situação inválida';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa situação inválida';
  end;

  begin
    perform public.registrar_ponto(v_hoje, 'presente', v_outro);
    r := r || E'\nFALHOU - professor marcou o ponto de outro';
  exception when insufficient_privilege then
    r := r || E'\nok - professor não marca o ponto de outro';
  end;

  begin
    insert into public.pontos_professores (professor_id, data, situacao) values (v_outro, v_hoje, 'presente');
    r := r || E'\nFALHOU - gravou direto o ponto de outro';
  exception when insufficient_privilege then
    r := r || E'\nok - nem gravando direto na tabela';
  end;

  begin
    insert into public.pontos_professores (professor_id, data, situacao) values (v_prof, v_hoje + 5, 'presente');
    r := r || E'\nFALHOU - insert direto aceitou dia no futuro';
  exception when invalid_parameter_value then
    r := r || E'\nok - nem o insert direto aceita dia no futuro';
  end;

  update public.pontos_professores
     set situacao = 'presente', alterado_por = v_outro, registrado_em = '2020-01-01'
   where professor_id = v_prof and data = v_hoje;
  select count(*) into v_n from public.pontos_professores
   where professor_id = v_prof and data = v_hoje and alterado_por = v_prof and registrado_em > now() - interval '1 minute';
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - não falsifica quem alterou nem quando';

  -- Ponto do outro professor (gravado como admin) não aparece para este
  reset role;
  insert into public.pontos_professores (professor_id, data, situacao) values (v_outro, v_hoje, 'ausente');
  set local role authenticated;
  select count(*) into v_n from public.pontos_professores where professor_id = v_outro;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - professor não vê o ponto dos outros';

  update public.pontos_professores set situacao = 'presente' where professor_id = v_outro;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - professor não altera o ponto dos outros';

  -- ===== Aluno =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_aluno, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.registrar_ponto(v_hoje, 'presente');
    r := r || E'\nFALHOU - aluno bateu ponto';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não bate ponto';
  end;
  select count(*) into v_n from public.pontos_professores;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não vê pontos';

  -- ===== Ex-professor perde o acesso =====
  reset role;
  update public.perfis set papel = 'aluno' where id = v_prof;
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.registrar_ponto(v_hoje, 'presente');
    r := r || E'\nFALHOU - ex-professor bateu ponto';
  exception when insufficient_privilege then
    r := r || E'\nok - ex-professor não bate mais ponto';
  end;

  -- ===== Gestor corrige qualquer um =====
  reset role;
  update public.perfis set papel = 'gestor' where id = v_aluno;
  perform set_config('request.jwt.claims', json_build_object('sub', v_aluno, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.registrar_ponto(v_hoje, 'presente', v_outro);
  select situacao into v_txt from public.pontos_professores where professor_id = v_outro and data = v_hoje;
  r := r || E'\n' || case when v_txt = 'presente' then 'ok' else 'FALHOU' end || ' - gestor corrige o ponto de um professor';
  select count(*) into v_n from public.pontos_professores;
  r := r || E'\n' || case when v_n >= 2 then 'ok' else 'FALHOU' end || ' - gestor vê os pontos de todos';

  -- O ponto só existe para quem é professor, mesmo quando é o gestor que marca
  begin
    perform public.registrar_ponto(v_hoje, 'presente');
    r := r || E'\nFALHOU - gestor gravou ponto para si mesmo';
  exception when insufficient_privilege then
    r := r || E'\nok - gestor não grava ponto para si mesmo';
  end;
  begin
    perform public.registrar_ponto(v_hoje, 'presente', v_prof); -- v_prof virou aluno acima
    r := r || E'\nFALHOU - gestor gravou ponto para quem não é professor';
  exception when insufficient_privilege then
    r := r || E'\nok - gestor não grava ponto para quem não é professor';
  end;

  -- ===== Visitante sem login =====
  reset role;
  set local role anon;
  begin
    perform public.registrar_ponto(v_hoje, 'presente');
    r := r || E'\nFALHOU - visitante bateu ponto';
  exception when insufficient_privilege then
    r := r || E'\nok - visitante não bate ponto';
  end;

  reset role;
  raise exception '%', r; -- desfaz tudo e mostra o relatório
end $$;
