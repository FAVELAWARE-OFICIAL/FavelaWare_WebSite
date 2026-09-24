-- Teste das regras de acesso da área do professor.
-- Roda tudo numa transação e termina com um erro proposital que carrega o
-- relatório: o erro desfaz tudo, então nada fica gravado no banco.
--
--   npx supabase db query --linked -f supabase/testes/rls_professor.sql
--
-- Resultado esperado: a mensagem de erro começa com "RELATORIO" e todas as
-- linhas dizem "ok".
do $$
declare
  v_prof uuid := gen_random_uuid();
  v_turma_dele bigint;
  v_outra_turma bigint;
  v_aluno_dele bigint;
  v_aluno_outro bigint;
  v_aula bigint;
  v_n bigint;
  v_edicao bigint;
  r text := 'RELATORIO';
begin
  -- Dados próprios numa edição aberta (as edições reais podem estar encerradas
  -- ou sem alunos): a turma do professor e uma outra, com um aluno cada
  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste professor', 9501, 'teste') returning id into v_edicao;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 1') returning id into v_turma_dele;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 2') returning id into v_outra_turma;
  insert into public.participantes (edicao_id, turma_id, funcao, nome)
  values (v_edicao, v_turma_dele, 'aluno', 'Aluno dele') returning id into v_aluno_dele;
  insert into public.participantes (edicao_id, turma_id, funcao, nome)
  values (v_edicao, v_outra_turma, 'aluno', 'Aluno de outro') returning id into v_aluno_outro;

  -- Professor de mentira (o gatilho cria o perfil como aluno)
  insert into auth.users (id, email, aud, role) values (v_prof, 'teste-rls@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'professor' where id = v_prof;
  insert into public.professores_turmas (professor_id, turma_id) values (v_prof, v_turma_dele);

  -- A partir daqui, tudo roda como o professor logado
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_n from public.turmas;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - vê só a própria turma (' || v_n || ')';

  select count(*) into v_n from public.participantes where turma_id <> v_turma_dele or turma_id is null;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não vê alunos de outras turmas (' || v_n || ')';

  select count(*) into v_n from public.duplas;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não vê duplas (' || v_n || ')';

  select count(*) into v_n from public.perfis where id <> v_prof;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não vê perfis de outras pessoas (' || v_n || ')';

  -- Chamada na própria turma: deve funcionar
  v_aula := public.registrar_chamada(v_turma_dele, current_date,
    jsonb_build_array(jsonb_build_object('participante_id', v_aluno_dele, 'situacao', 'justificada')));
  select count(*) into v_n from public.presencas where aula_id = v_aula and participante_id = v_aluno_dele and registro_original = 'J';
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - registra chamada na própria turma (J)';

  -- Corrigir a mesma chamada: mesma aula, marcação trocada.
  -- A conferência vem num comando separado: uma consulta não enxerga o que a
  -- função gravou durante ela mesma.
  v_n := public.registrar_chamada(v_turma_dele, current_date,
    jsonb_build_array(jsonb_build_object('participante_id', v_aluno_dele, 'situacao', 'presente')));
  if v_n = v_aula
     and exists (select 1 from public.presencas where aula_id = v_aula and participante_id = v_aluno_dele and situacao = 'presente')
     and (select count(*) from public.aulas where turma_id = v_turma_dele and data = current_date) = 1 then
    r := r || E'\nok - corrige a chamada sem duplicar a aula';
  else
    r := r || E'\nFALHOU - corrige a chamada sem duplicar a aula';
  end if;

  -- Chamada em turma de outro professor: deve ser recusada
  begin
    perform public.registrar_chamada(v_outra_turma, current_date,
      jsonb_build_array(jsonb_build_object('participante_id', v_aluno_outro, 'situacao', 'presente')));
    r := r || E'\nFALHOU - fez chamada em turma que não é dele';
  exception when insufficient_privilege then
    r := r || E'\nok - recusa chamada em turma que não é dele';
  end;

  -- Aluno de outra turma enfiado na chamada da turma dele: deve ser recusado
  begin
    perform public.registrar_chamada(v_turma_dele, current_date,
      jsonb_build_array(jsonb_build_object('participante_id', v_aluno_outro, 'situacao', 'presente')));
    r := r || E'\nFALHOU - aceitou aluno de outra turma';
  exception when insufficient_privilege or check_violation then
    r := r || E'\nok - recusa aluno de outra turma';
  end;

  -- Situação fora das três opções (ex.: folga)
  begin
    perform public.registrar_chamada(v_turma_dele, current_date,
      jsonb_build_array(jsonb_build_object('participante_id', v_aluno_dele, 'situacao', 'folga')));
    r := r || E'\nFALHOU - aceitou situação inválida';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa situação inválida';
  end;

  -- Data no futuro
  begin
    perform public.registrar_chamada(v_turma_dele, current_date + 1, '[]'::jsonb);
    r := r || E'\nFALHOU - aceitou data no futuro';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa data no futuro';
  end;

  -- Professor não pode se vincular a outra turma
  begin
    insert into public.professores_turmas (professor_id, turma_id) values (v_prof, v_outra_turma);
    r := r || E'\nFALHOU - se vinculou sozinho a outra turma';
  exception when insufficient_privilege then
    r := r || E'\nok - não se vincula sozinho a outra turma';
  end;

  -- Professor não pode se promover a gestor
  update public.perfis set papel = 'gestor' where id = v_prof;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não se promove a gestor';

  -- Cadastros são só do gestor: professor não cria edição, turma, aluno nem solicitação
  begin
    insert into public.edicoes (nome, ordem) values ('Edição teste', 999);
    r := r || E'\nFALHOU - professor criou edição';
  exception when insufficient_privilege then
    r := r || E'\nok - professor não cria edição';
  end;
  begin
    insert into public.turmas (edicao_id, nome) select edicao_id, 'Turma Z' from public.turmas where id = v_turma_dele;
    r := r || E'\nFALHOU - professor criou turma';
  exception when insufficient_privilege then
    r := r || E'\nok - professor não cria turma';
  end;
  begin
    insert into public.participantes (edicao_id, turma_id, funcao, nome)
      select edicao_id, id, 'aluno', 'Aluno teste' from public.turmas where id = v_turma_dele;
    r := r || E'\nFALHOU - professor cadastrou aluno';
  exception when insufficient_privilege then
    r := r || E'\nok - professor não cadastra aluno';
  end;
  update public.participantes set nome = 'Invadido' where id = v_aluno_dele;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - professor não edita aluno';
  begin
    insert into public.solicitacoes (participante_id, tipo, descricao) values (v_aluno_dele, 'outro', 'teste');
    r := r || E'\nFALHOU - professor registrou solicitação';
  exception when insufficient_privilege then
    r := r || E'\nok - professor não registra solicitação';
  end;

  -- Gestor: cria edição e turma no padrão, e o banco recusa nome fora do padrão
  reset role;
  update public.perfis set papel = 'gestor' where id = v_prof;
  set local role authenticated;
  insert into public.edicoes (nome, ordem) values ('Edição teste', 999);
  insert into public.turmas (edicao_id, nome) select id, 'Turma Única' from public.edicoes where ordem = 999;
  r := r || E'\nok - gestor cria edição e Turma Única';
  begin
    insert into public.turmas (edicao_id, nome) select id, 'TURMA X - QUASAB' from public.edicoes where ordem = 999;
    r := r || E'\nFALHOU - aceitou nome de turma fora do padrão';
  exception when check_violation then
    r := r || E'\nok - recusa nome de turma fora do padrão';
  end;
  -- Turma com alunos não pode ser apagada (levaria o histórico junto)
  delete from public.turmas where id = v_turma_dele;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - gestor não apaga turma com alunos';
  reset role;
  update public.perfis set papel = 'professor' where id = v_prof;
  set local role authenticated;

  -- Sem papel de professor, perde o acesso mesmo com o vínculo
  reset role;
  update public.perfis set papel = 'aluno' where id = v_prof;
  set local role authenticated;
  select count(*) into v_n from public.turmas;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - ex-professor não vê mais a turma (' || v_n || ')';

  -- Visitante sem login não chama a função
  reset role;
  set local role anon;
  begin
    perform public.registrar_chamada(v_turma_dele, current_date, '[]'::jsonb);
    r := r || E'\nFALHOU - visitante chamou registrar_chamada';
  exception when insufficient_privilege then
    r := r || E'\nok - visitante não chama registrar_chamada';
  end;

  reset role;
  raise exception '%', r;  -- desfaz tudo e mostra o relatório
end $$;
