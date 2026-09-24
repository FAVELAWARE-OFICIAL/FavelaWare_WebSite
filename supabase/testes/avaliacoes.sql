-- Teste das avaliações do fim da edição (migrations 20261001100000 a 108000).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/avaliacoes.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_prof uuid := gen_random_uuid();
  v_prof2 uuid := gen_random_uuid();
  v_outro uuid := gen_random_uuid();
  v_gestor uuid := gen_random_uuid();
  v_edicao bigint;
  v_turma bigint;
  v_outra_turma bigint;
  v_a1 bigint;
  v_a2 bigint;
  v_de_fora bigint;
  v_novato bigint;
  v_aluno_conta uuid := gen_random_uuid();
  v_externo uuid := gen_random_uuid();
  v_curioso uuid := gen_random_uuid();
  v_n bigint;
  v_txt text;
  v_json jsonb;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_prof, 'aval-prof@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_prof2, 'aval-prof2@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_outro, 'aval-outro@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_gestor, 'aval-gestor@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_externo, 'aval-banca@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_curioso, 'aval-curioso@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_aluno_conta, 'aval-aluno@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'professor' where id in (v_prof, v_prof2, v_outro);
  update public.perfis set papel = 'gestor', nome = 'Rafaela' where id = v_gestor;
  -- Membro externo da banca (o convite marca a conta como "banca")
  update public.perfis set papel = 'banca', nome = 'Luiz' where id in (v_externo, v_curioso);

  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste avaliação', 9901, 'teste') returning id into v_edicao;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 1') returning id into v_turma;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 2') returning id into v_outra_turma;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (v_edicao, v_turma, 'aluno', 'Ana Maria Souza')
    returning id into v_a1;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (v_edicao, v_turma, 'aluno', 'Bruno Lima')
    returning id into v_a2;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (v_edicao, v_outra_turma, 'aluno', 'Caio Dias')
    returning id into v_de_fora;
  insert into public.professores_turmas (professor_id, turma_id) values (v_prof, v_turma), (v_prof2, v_turma), (v_outro, v_outra_turma);

  -- ===== Instrutor, antes da data =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.minhas_avaliacoes_pendentes() where turma_id = v_turma;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - sem data do gestor, a avaliação não aparece';
  begin
    perform public.salvar_avaliacao_da_turma(v_turma, '[]'::jsonb);
    r := r || E'\nFALHOU - salvou antes de liberar';
  exception when sqlstate '22023' then r := r || E'\nok - não salva antes de a coordenação liberar';
  end;
  reset role;

  -- ===== Gestor libera (hoje) =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.edicoes
  set avaliacao_instrutores_em = (now() at time zone 'America/Sao_Paulo')::date - 10,
      avaliacao_instrutores_ate = (now() at time zone 'America/Sao_Paulo')::date - 1
  where id = v_edicao;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.minhas_avaliacoes_pendentes() where turma_id = v_turma;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - prazo já acabou: a avaliação nem aparece';
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.edicoes
  set avaliacao_instrutores_em = (now() at time zone 'America/Sao_Paulo')::date,
      avaliacao_instrutores_ate = (now() at time zone 'America/Sao_Paulo')::date + 7
  where id = v_edicao;
  begin
    update public.edicoes set avaliacao_instrutores_ate = avaliacao_instrutores_em - 1 where id = v_edicao;
    r := r || E'\nFALHOU - aceitou fim antes do início';
  exception when check_violation then r := r || E'\nok - o fim do prazo não vem antes do início';
  end;
  begin
    perform public.salvar_avaliacao_da_turma(v_turma, '[]'::jsonb);
    r := r || E'\nFALHOU - gestor avaliou como instrutor';
  exception when insufficient_privilege then r := r || E'\nok - gestor não avalia como instrutor';
  end;
  reset role;

  -- ===== Instrutor avalia =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.minhas_avaliacoes_pendentes() where turma_id = v_turma;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - liberada, a turma aparece para avaliar';
  begin
    perform public.salvar_avaliacao_da_turma(v_outra_turma, '[]'::jsonb);
    r := r || E'\nFALHOU - avaliou turma de outro';
  exception when insufficient_privilege then r := r || E'\nok - não avalia turma de outro instrutor';
  end;
  begin
    perform public.salvar_avaliacao_da_turma(v_turma, jsonb_build_array(
      jsonb_build_object('participante_id', v_a1, 'participacao', 4, 'entrega', 5, 'comportamento', 5)));
    r := r || E'\nFALHOU - salvou com aluno faltando';
  exception when sqlstate '22023' then r := r || E'\nok - precisa avaliar todos os alunos da turma';
  end;
  begin
    perform public.salvar_avaliacao_da_turma(v_turma, jsonb_build_array(
      jsonb_build_object('participante_id', v_a1, 'participacao', 4, 'entrega', 5, 'comportamento', 5),
      jsonb_build_object('participante_id', v_de_fora, 'participacao', 4, 'entrega', 5, 'comportamento', 5)));
    r := r || E'\nFALHOU - salvou aluno de outra turma';
  exception when sqlstate '22023' then r := r || E'\nok - não aceita aluno de outra turma';
  end;
  begin
    perform public.salvar_avaliacao_da_turma(v_turma, jsonb_build_array(
      jsonb_build_object('participante_id', v_a1, 'participacao', 6, 'entrega', 5, 'comportamento', 5),
      jsonb_build_object('participante_id', v_a2, 'participacao', 5, 'entrega', 5, 'comportamento', 5)));
    r := r || E'\nFALHOU - aceitou nota 6 do instrutor';
  exception when check_violation then r := r || E'\nok - nota do instrutor fora de 0 a 5 é recusada';
  end;
  perform public.salvar_avaliacao_da_turma(v_turma, jsonb_build_array(
    jsonb_build_object('participante_id', v_a1, 'participacao', 4, 'entrega', 5, 'comportamento', 5, 'observacao', 'Proativa'),
    jsonb_build_object('participante_id', v_a2, 'participacao', 3, 'entrega', 3, 'comportamento', 3)));
  r := r || E'\nok - salva a turma inteira';
  begin
    perform public.salvar_avaliacao_da_turma(v_turma, jsonb_build_array(
      jsonb_build_object('participante_id', v_a1, 'participacao', 5, 'entrega', 5, 'comportamento', 5),
      jsonb_build_object('participante_id', v_a2, 'participacao', 5, 'entrega', 5, 'comportamento', 5)));
    r := r || E'\nFALHOU - salvou de novo';
  exception when sqlstate '22023' then r := r || E'\nok - depois de salvar não edita';
  end;
  select count(*) into v_n from public.avaliacoes_instrutor;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - instrutor não vê a avaliação depois de salvar';
  select count(*) into v_n from public.minhas_avaliacoes_pendentes() where turma_id = v_turma;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - a turma some da lista dele';
  begin
    insert into public.avaliacoes_instrutor (professor_id, participante_id, turma_id, participacao, entrega, comportamento)
    values (v_prof, v_a1, v_turma, 5, 5, 5);
    r := r || E'\nFALHOU - gravou direto na tabela';
  exception when insufficient_privilege then r := r || E'\nok - ninguém grava direto na tabela';
  end;
  reset role;

  -- Segundo instrutor da turma
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.salvar_avaliacao_da_turma(v_turma, jsonb_build_array(
    jsonb_build_object('participante_id', v_a1, 'participacao', 5, 'entrega', 5, 'comportamento', 5),
    jsonb_build_object('participante_id', v_a2, 'participacao', 2, 'entrega', 2, 'comportamento', 2)));
  reset role;

  -- ===== Gestor cadastra a banca: um externo e a própria gestora =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.cadastrar_membro_banca(v_edicao, v_externo, 'Luiz', 'Mundiale');
  perform public.cadastrar_membro_banca(v_edicao, v_gestor, 'Rafaela', 'Ânima');
  begin
    perform public.cadastrar_membro_banca(v_edicao, v_externo, 'Luiz', 'Mundiale');
    r := r || E'\nFALHOU - mesma pessoa entrou duas vezes na banca';
  exception when sqlstate '22023' then r := r || E'\nok - a mesma pessoa não entra duas vezes na banca';
  end;
  select email into v_txt from public.membros_banca where perfil_id = v_externo;
  r := r || E'\n' || case when v_txt = 'aval-banca@exemplo.invalid' then 'ok' else 'FALHOU' end
    || ' - o e-mail do membro vem da conta';
  reset role;
  update public.perfis set participante_id = v_a2 where id = v_aluno_conta;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.cadastrar_membro_banca(v_edicao, v_aluno_conta, 'Bruno', 'Aluno');
    r := r || E'\nFALHOU - conta de aluno entrou na banca';
  exception when sqlstate '22023' then r := r || E'\nok - conta de aluno não entra na banca';
  end;
  reset role;

  -- Instrutor não mexe na banca nem vê o resultado
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.cadastrar_membro_banca(v_edicao, v_prof, 'Intruso', 'X');
    r := r || E'\nFALHOU - instrutor cadastrou banca';
  exception when insufficient_privilege then r := r || E'\nok - só o gestor cadastra a banca';
  end;
  begin
    perform public.resultado_das_avaliacoes(v_edicao);
    r := r || E'\nFALHOU - instrutor viu o resultado';
  exception when insufficient_privilege then r := r || E'\nok - só o gestor vê o resultado';
  end;
  reset role;

  -- ===== Conta "banca" que não está na banca: não vê nada =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_curioso, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.avaliacao_da_banca();
    r := r || E'\nFALHOU - conta fora da banca abriu a avaliação';
  exception when insufficient_privilege then r := r || E'\nok - quem não está na banca não abre a avaliação';
  end;
  reset role;

  -- ===== Membro externo =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_externo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.salvar_nota_da_banca(v_a1, 3::smallint, 3::smallint, 3::smallint);
    r := r || E'\nFALHOU - banca avaliou sem ser o dia';
  exception when sqlstate '22023' then r := r || E'\nok - fora do dia da banca não dá para dar nota';
  end;
  reset role;
  update public.edicoes set banca_em = (now() at time zone 'America/Sao_Paulo')::date where id = v_edicao;
  perform set_config('request.jwt.claims', json_build_object('sub', v_externo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_json := public.avaliacao_da_banca();
  r := r || E'\n' || case when (v_json->>'hoje_e_o_dia')::boolean then 'ok' else 'FALHOU' end || ' - no dia marcado a banca avalia';
  r := r || E'\n' || case when public.sou_da_banca() then 'ok' else 'FALHOU' end || ' - o membro sabe que é da banca';
  select count(*) into v_n from public.participantes;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - conta banca não lê a tabela de alunos';
  select count(*) into v_n from public.notas_banca;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - conta banca não lê a tabela de notas';
  select count(*) into v_n from public.perfis where id <> v_externo;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - conta banca não lê o perfil dos outros';

  perform public.salvar_nota_da_banca(v_a1, 3::smallint, 4::smallint, 3::smallint);
  perform public.salvar_nota_da_banca(v_a1, 4::smallint, 4::smallint, 3::smallint); -- corrige antes de concluir
  reset role;

  -- A gestora na banca dá a nota dela
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.salvar_nota_da_banca(v_a1, 5::smallint, 5::smallint, 5::smallint);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', v_externo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_json := public.avaliacao_da_banca();
  select (a->>'inovacao') || '|' || coalesce(a->>'apresentacao', '') into v_txt
  from jsonb_array_elements(v_json->'alunos') a where (a->>'id')::bigint = v_a1;
  r := r || E'\n' || case when v_txt = '4|4' then 'ok' else 'FALHOU (' || coalesce(v_txt, '-') || ')' end
    || ' - membro vê só a própria nota (corrigida), nunca a do outro';
  select a->>'nome' into v_txt from jsonb_array_elements(v_json->'alunos') a where (a->>'id')::bigint = v_a1;
  r := r || E'\n' || case when v_txt = 'Ana Souza' then 'ok' else 'FALHOU' end || ' - banca vê o nome curto';

  begin
    perform public.salvar_nota_da_banca(v_a2, 6::smallint, 4::smallint, 3::smallint);
    r := r || E'\nFALHOU - aceitou nota 6 da banca';
  exception when check_violation then r := r || E'\nok - nota da banca fora de 0 a 5 é recusada';
  end;
  begin
    perform public.concluir_avaliacao_da_banca();
    r := r || E'\nFALHOU - concluiu faltando aluno';
  exception when sqlstate '22023' then r := r || E'\nok - não conclui sem avaliar todos';
  end;
  perform public.salvar_nota_da_banca(v_a2, 2::smallint, 2::smallint, 2::smallint);
  perform public.salvar_nota_da_banca(v_de_fora, 1::smallint, 1::smallint, 1::smallint);
  perform public.concluir_avaliacao_da_banca();
  begin
    perform public.salvar_nota_da_banca(v_a2, 5::smallint, 5::smallint, 5::smallint);
    r := r || E'\nFALHOU - mudou nota depois de concluir';
  exception when sqlstate '22023' then r := r || E'\nok - depois de concluir a nota não muda';
  end;
  v_json := public.avaliacao_da_banca();
  r := r || E'\n' || case when (v_json->>'completa')::boolean is false and v_json ? 'alunos' then 'ok' else 'FALHOU' end
    || ' - sem todos concluírem, não aparece a lista final';
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.salvar_nota_da_banca(v_a2, 3::smallint, 3::smallint, 3::smallint);
  perform public.salvar_nota_da_banca(v_de_fora, 1::smallint, 1::smallint, 1::smallint);
  perform public.concluir_avaliacao_da_banca();
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', v_externo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_json := public.avaliacao_da_banca();
  select string_agg((x->>'nome') || '=' || (x->>'total'), ',' order by ord) into v_txt
  from jsonb_array_elements(v_json->'ranking') with ordinality as t(x, ord);
  r := r || E'\n' || case when (v_json->>'completa')::boolean and v_txt = 'Ana Souza=26,Bruno Lima=15,Caio Dias=6'
    and not (v_json->'ranking'->0 ? 'id') then 'ok' else 'FALHOU (' || coalesce(v_txt, '-') || ')' end
    || ' - todos concluíram: lista final com o total da banca, sem ids';
  reset role;

  -- ===== Gestor: resultado =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- Ana: instrutores (14 e 15) média 14.5 + banca (11 + 15) 26 = 40.5; Bruno: (9 e 6) 7.5 + (6 + 9) 15 = 22.5
  select string_agg(nome || '=' || total::text, ',' order by total desc, nome) into v_txt
  from public.resultado_das_avaliacoes(v_edicao);
  r := r || E'\n' || case when v_txt = 'Ana Maria Souza=40.50,Bruno Lima=22.50,Caio Dias=6.00' then 'ok'
    else 'FALHOU (' || coalesce(v_txt, '-') || ')' end || ' - resultado: média dos instrutores + soma da banca, do maior para o menor';
  reset role;

  -- Anônimo não chega em nada
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin
    perform public.avaliacao_da_banca();
    r := r || E'\nFALHOU - anônimo abriu a avaliação da banca';
  exception when insufficient_privilege then r := r || E'\nok - sem login não abre a avaliação da banca';
  end;
  reset role;

  -- ===== Aluno que entra depois =====
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (v_edicao, v_turma, 'aluno', 'Davi Novo')
    returning id into v_novato;

  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select string_agg(nome, ',') into v_txt from public.alunos_para_avaliar(v_turma);
  r := r || E'\n' || case when v_txt = 'Davi Novo' then 'ok' else 'FALHOU (' || coalesce(v_txt, '-') || ')' end
    || ' - instrutor avalia só o aluno que entrou depois';
  perform public.salvar_avaliacao_da_turma(v_turma, jsonb_build_array(
    jsonb_build_object('participante_id', v_novato, 'participacao', 3, 'entrega', 3, 'comportamento', 3)));
  select count(*) into v_n from public.minhas_avaliacoes_pendentes() where turma_id = v_turma;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - avaliado o que faltava, a turma some de novo';
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', v_externo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_json := public.avaliacao_da_banca();
  r := r || E'\n' || case when (v_json->>'completa')::boolean is false then 'ok' else 'FALHOU' end
    || ' - aluno novo sem nota: a lista final espera';
  perform public.salvar_nota_da_banca(v_novato, 2::smallint, 2::smallint, 2::smallint);
  r := r || E'\nok - quem já concluiu dá nota ao aluno que entrou depois';
  begin
    perform public.salvar_nota_da_banca(v_novato, 5::smallint, 5::smallint, 5::smallint);
    r := r || E'\nFALHOU - mudou a nota do aluno novo depois de dar';
  exception when sqlstate '22023' then r := r || E'\nok - e essa nota também trava';
  end;
  reset role;

  -- ===== Edição encerrada: nada muda =====
  update public.edicoes set encerrada = true where id = v_edicao;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.cadastrar_membro_banca(v_edicao, v_curioso, 'Tarde', 'X');
    r := r || E'\nFALHOU - cadastrou banca em edição encerrada';
  exception when sqlstate '22023' then r := r || E'\nok - edição encerrada não muda a banca';
  end;
  reset role;

  raise exception '%', r;
end;
$$;
