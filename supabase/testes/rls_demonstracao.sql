-- Teste da turma de demonstração ("Ver como" com entrega de verdade).
-- Termina com um erro proposital que carrega o relatório e desfaz tudo.
--
--   npx supabase db query --linked -f supabase/testes/rls_demonstracao.sql
do $$
declare
  u_demo uuid := gen_random_uuid();
  u_comum uuid := gen_random_uuid();
  u_outro uuid := gen_random_uuid();
  v_aluno bigint;
  v_turma bigint;
  v_n bigint;
  v_part bigint;
  v_ativ bigint;
  r text := 'RELATORIO';
begin
  select p.id, p.turma_id into v_aluno, v_turma
  from public.participantes p join public.edicoes e on e.id = p.edicao_id
  where e.demonstracao and p.funcao = 'aluno';
  r := r || E'\n' || case when v_aluno is not null then 'ok' else 'FALHOU' end || ' - existe o aluno de demonstração';
  select count(*) into v_n from public.atividades where turma_id = v_turma and prazo > now() + interval '30 days';
  r := r || E'\n' || case when v_n > 0 then 'ok' else 'FALHOU' end || ' - turma demo tem atividades com prazo longo';
  select count(*) into v_n from public.edicoes where ordem > (select ordem from public.edicoes where demonstracao);
  r := r || E'\n' || case when v_n > 0 then 'ok' else 'FALHOU' end || ' - edição demo não é a padrão (há edições de ordem maior)';

  insert into auth.users (id, email, aud, role) values
    (u_demo, 'demo-alterna@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_comum, 'demo-comum@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_outro, 'demo-outro@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'gestor', pode_alternar_papel = true where id = u_demo;
  -- Atividade só deste teste (as da turma demo podem já ter entregas de teste reais)
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo)
  select v_turma, (select id from public.trilhas order by ordem limit 1), 'Teste automatico', 'x', now() + interval '1 day'
  returning id into v_ativ;
  -- Se a conta real já estiver usando o aluno demo, libera só dentro deste teste
  update public.perfis set participante_id = null where participante_id = v_aluno;

  -- ===== Conta que alterna =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_demo, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.alternar_papel('aluno');
  reset role;
  select participante_id into v_part from public.perfis where id = u_demo;
  set local role authenticated;
  r := r || E'\n' || case when v_part = v_aluno then 'ok' else 'FALHOU' end || ' - como aluno, vira o aluno de demonstração';
  select count(*) into v_n from public.atividades where turma_id = v_turma;
  r := r || E'\n' || case when v_n > 0 then 'ok' else 'FALHOU' end || ' - como aluno, vê as atividades da turma demo';
  select count(*) into v_n from public.atividades where turma_id <> v_turma;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - como aluno, não vê atividades das turmas reais';
  insert into public.tentativas (atividade_id, participante_id, comentario) values (v_ativ, v_aluno, 'teste de entrega');
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - como aluno, entrega de verdade na turma demo';

  perform public.alternar_papel('professor');
  reset role;
  select participante_id into v_part from public.perfis where id = u_demo;
  select count(*) into v_n from public.professores_turmas where professor_id = u_demo and turma_id = v_turma;
  set local role authenticated;
  r := r || E'\n' || case when v_part is null then 'ok' else 'FALHOU' end || ' - como professor, deixa de ser o aluno';
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - como professor, leciona na turma demo';
  select count(*) into v_n from public.tentativas t join public.atividades a on a.id = t.atividade_id where a.turma_id = v_turma;
  r := r || E'\n' || case when v_n >= 1 then 'ok' else 'FALHOU' end || ' - como professor, vê a entrega de teste para corrigir';

  perform public.alternar_papel('gestor');
  reset role;
  select participante_id into v_part from public.perfis where id = u_demo;
  r := r || E'\n' || case when v_part is null then 'ok' else 'FALHOU' end || ' - como gestor, deixa de ser o aluno';

  -- ===== Aluno demo já em uso por outra conta: recusa com mensagem clara =====
  update public.perfis set papel = 'aluno', participante_id = v_aluno where id = u_outro;
  perform set_config('request.jwt.claims', json_build_object('sub', u_demo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.alternar_papel('aluno');
    r := r || E'\nFALHOU - duas contas com o mesmo aluno demo';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa se o aluno demo já estiver em uso';
  end;
  reset role;

  -- ===== Conta comum não alterna =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_comum, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.alternar_papel('aluno');
    r := r || E'\nFALHOU - conta comum virou o aluno de demonstração';
  exception when insufficient_privilege then
    r := r || E'\nok - conta comum não usa a demonstração';
  end;

  reset role;
  raise exception '%', r;
end $$;
