-- Teste da trava de edição encerrada (migration 20260929100000_edicoes_encerradas.sql).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/edicoes_encerradas.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_gestor uuid := gen_random_uuid();
  v_fechada bigint;
  v_aberta bigint;
  v_turma_fechada bigint;
  v_turma_aberta bigint;
  v_aluno_fechada bigint;
  v_aluno_aberta bigint;
  v_aula bigint;
  v_n bigint;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login): as duas edições nascem abertas =====
  insert into auth.users (id, email, aud, role)
  values (v_gestor, 'encerrada-gestor@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'gestor' where id = v_gestor;

  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste fechada', 9001, 'teste') returning id into v_fechada;
  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste aberta', 9002, 'teste') returning id into v_aberta;
  insert into public.turmas (edicao_id, nome) values (v_fechada, 'Turma 1') returning id into v_turma_fechada;
  insert into public.turmas (edicao_id, nome) values (v_aberta, 'Turma 1') returning id into v_turma_aberta;
  insert into public.participantes (edicao_id, turma_id, funcao, nome)
  values (v_fechada, v_turma_fechada, 'aluno', 'Aluno fechada') returning id into v_aluno_fechada;
  insert into public.participantes (edicao_id, turma_id, funcao, nome)
  values (v_aberta, v_turma_aberta, 'aluno', 'Aluno aberta') returning id into v_aluno_aberta;
  insert into public.aulas (edicao_id, turma_id, data, ordem)
  values (v_fechada, v_turma_fechada, current_date - 10, 1) returning id into v_aula;
  insert into public.presencas (participante_id, aula_id, situacao, registro_original)
  values (v_aluno_fechada, v_aula, 'presente', 'P');

  -- Encerrar (sem login) é o que a migration faz com as edições 1 a 3
  update public.edicoes set encerrada = true where id = v_fechada;

  -- ===== Gestor logado =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    update public.presencas set situacao = 'ausente', registro_original = 'A'
    where aula_id = v_aula and participante_id = v_aluno_fechada;
    r := r || E'\nFALHOU - gestor corrigiu presença de edição encerrada';
  exception when invalid_parameter_value then
    r := r || E'\nok - gestor não corrige presença de edição encerrada';
  end;

  begin
    delete from public.presencas where aula_id = v_aula;
    r := r || E'\nFALHOU - gestor apagou presença de edição encerrada';
  exception when invalid_parameter_value then
    r := r || E'\nok - gestor não apaga presença de edição encerrada';
  end;

  begin
    insert into public.presencas (participante_id, aula_id, situacao, registro_original)
    values (v_aluno_fechada, v_aula, 'ausente', 'A')
    on conflict do nothing;
    r := r || E'\nFALHOU - gestor inseriu presença em edição encerrada';
  exception when invalid_parameter_value then
    r := r || E'\nok - gestor não insere presença em edição encerrada';
  end;

  begin
    perform public.registrar_chamada(v_turma_fechada, current_date,
      jsonb_build_array(jsonb_build_object('participante_id', v_aluno_fechada, 'situacao', 'presente')));
    r := r || E'\nFALHOU - chamada gravada em edição encerrada';
  exception when invalid_parameter_value then
    -- 22023 também é "data inválida" na função: confere que o motivo é a edição encerrada
    r := r || E'\n' || case when sqlerrm like '%encerrada%' then 'ok' else 'FALHOU (' || sqlerrm || ')' end
      || ' - chamada não grava em edição encerrada';
  end;

  perform public.registrar_chamada(v_turma_aberta, current_date,
    jsonb_build_array(jsonb_build_object('participante_id', v_aluno_aberta, 'situacao', 'presente')));
  select count(*) into v_n from public.presencas p join public.aulas a on a.id = p.aula_id where a.edicao_id = v_aberta;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - edição aberta continua recebendo chamada';

  update public.edicoes set encerrada = true where id = v_aberta;
  select count(*) into v_n from public.edicoes where id = v_aberta and encerrada;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - gestor encerra a edição pelo site';

  begin
    update public.edicoes set encerrada = false where id = v_fechada;
    r := r || E'\nFALHOU - gestor reabriu edição pelo site';
  exception when insufficient_privilege then
    r := r || E'\nok - edição encerrada não reabre pelo site';
  end;

  reset role;
  select count(*) into v_n from public.presencas where aula_id = v_aula and situacao = 'presente';
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - presença original intacta';

  raise exception '%', r;
end;
$$;
