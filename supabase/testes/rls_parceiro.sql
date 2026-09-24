-- Teste do parceiro somente leitura (migrations 20260930105000 e 20260930106000).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/rls_parceiro.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_parceiro uuid := gen_random_uuid();
  v_aluno_conta uuid := gen_random_uuid();
  v_edicao bigint;
  v_turma bigint;
  v_aula bigint;
  v_aluno bigint;
  v_n bigint;
  v_txt text;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_parceiro, 'parceiro@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_aluno_conta, 'parc-aluno@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'parceiro' where id = v_parceiro;

  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste parceiro', 9301, 'teste') returning id into v_edicao;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 1') returning id into v_turma;
  insert into public.participantes (edicao_id, turma_id, funcao, nome, login, observacao, email)
  values (v_edicao, v_turma, 'aluno', 'Aluno parceiro', 'aluno.parceiro', 'Observação sigilosa', 'a@exemplo.invalid')
  returning id into v_aluno;
  update public.perfis set participante_id = v_aluno where id = v_aluno_conta;
  insert into public.aulas (edicao_id, turma_id, data, ordem) values (v_edicao, v_turma, '2026-01-10', 1) returning id into v_aula;
  insert into public.presencas (participante_id, aula_id, situacao, registro_original, justificativa)
  values (v_aluno, v_aula, 'justificada', 'Luto', 'Falecimento na família');

  -- ===== Parceiro =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_parceiro, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_n from public.edicoes where id = v_edicao;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - parceiro lê as edições';
  select count(*) into v_n from public.turmas where id = v_turma;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - parceiro lê as turmas';
  select count(*) into v_n from public.aulas where id = v_aula;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - parceiro lê as aulas';

  select coalesce(login, '') || '|' || coalesce(observacao, '') || '|' || nome into v_txt
  from public.participantes_do_parceiro(v_edicao) where id = v_aluno;
  r := r || E'\n' || case when v_txt = '||Aluno parceiro' then 'ok' else 'FALHOU' end
    || ' - alunos pela função, sem login e sem observação';

  select situacao || '|' || registro_original into v_txt from public.presencas_do_parceiro(v_edicao) where participante_id = v_aluno;
  r := r || E'\n' || case when v_txt = 'justificada|' then 'ok' else 'FALHOU' end
    || ' - presenças pela função, sem o registro original';

  select count(*) into v_n from public.participantes where id = v_aluno;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê a tabela de alunos direto';
  select count(*) into v_n from public.presencas where participante_id = v_aluno;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê as presenças direto (justificativa)';
  select count(*) into v_n from public.atestados;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê atestados';
  select count(*) into v_n from public.dados_instrutores;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê dados dos instrutores';
  select count(*) into v_n from public.perfis where id <> v_parceiro;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê o perfil dos outros';
  select count(*) into v_n from public.solicitacoes;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê solicitações direto';

  -- Escrita: nada passa
  begin
    insert into public.edicoes (nome, ordem, arquivo_origem) values ('Invasão', 9302, 'x');
    r := r || E'\nFALHOU - parceiro criou edição';
  exception when insufficient_privilege then r := r || E'\nok - não cria edição';
  end;
  begin
    insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma X');
    r := r || E'\nFALHOU - parceiro criou turma';
  exception when insufficient_privilege then r := r || E'\nok - não cria turma';
  end;
  begin
    insert into public.participantes (edicao_id, turma_id, funcao, nome) values (v_edicao, v_turma, 'aluno', 'Intruso');
    r := r || E'\nFALHOU - parceiro criou aluno';
  exception when insufficient_privilege then r := r || E'\nok - não cria aluno';
  end;
  begin
    perform public.registrar_chamada(v_turma, '2026-01-11'::date, jsonb_build_array(jsonb_build_object(
      'participante_id', v_aluno, 'situacao', 'presente')));
    r := r || E'\nFALHOU - parceiro fez chamada';
  exception when others then r := r || E'\nok - não faz chamada';
  end;
  update public.edicoes set nome = 'Mudado' where id = v_edicao;
  update public.turmas set nome = 'Mudada' where id = v_turma;
  update public.perfis set papel = 'gestor' where id = v_parceiro;
  begin
    delete from public.aulas where id = v_aula;
  exception when insufficient_privilege then null; -- recusa direta também vale
  end;
  reset role;

  select e.nome || '|' || t.nome into v_txt from public.edicoes e join public.turmas t on t.edicao_id = e.id where t.id = v_turma;
  r := r || E'\n' || case when v_txt = 'Teste parceiro|Turma 1' then 'ok' else 'FALHOU' end || ' - não altera edição nem turma';
  select papel::text into v_txt from public.perfis where id = v_parceiro;
  r := r || E'\n' || case when v_txt = 'parceiro' then 'ok' else 'FALHOU' end || ' - não vira gestor';
  select count(*) into v_n from public.aulas where id = v_aula;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - não apaga aula';

  -- ===== Outros papéis não usam as funções do parceiro =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_aluno_conta, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.participantes_do_parceiro(v_edicao);
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não usa a função de alunos do parceiro';
  select count(*) into v_n from public.presencas_do_parceiro(v_edicao);
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não usa a função de presenças do parceiro';
  reset role;

  raise exception '%', r;
end;
$$;
