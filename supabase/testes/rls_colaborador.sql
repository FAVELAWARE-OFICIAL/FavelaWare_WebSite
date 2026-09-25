-- Teste do colaborador (migrations 20261001121000 e 20261001122000).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/rls_colaborador.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_colab uuid := gen_random_uuid();
  v_gestor uuid := gen_random_uuid();
  v_novo uuid := gen_random_uuid();
  v_prof uuid := gen_random_uuid();
  v_parc uuid := gen_random_uuid();
  v_aluno_conta uuid := gen_random_uuid();
  v_edicao bigint;
  v_turma bigint;
  v_aula bigint;
  v_aluno bigint;
  v_trilha bigint;
  v_trilha_nova bigint;
  v_material bigint;
  v_ativ_livre bigint;
  v_ativ_entregue bigint;
  v_tentativa bigint;
  v_sol bigint;
  v_n bigint;
  v_txt text;
  v_sim boolean;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_colab, 'colab@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_gestor, 'colab-gestor@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_novo, 'colab-novo@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_prof, 'colab-prof@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_parc, 'colab-parc@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_aluno_conta, 'colab-aluno@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'colaborador', nome = 'Colaboradora Lia' where id = v_colab;
  update public.perfis set papel = 'gestor', nome = 'Gestora Ana' where id = v_gestor;
  update public.perfis set papel = 'professor', nome = 'Pessoa Nova' where id = v_novo;
  update public.perfis set papel = 'professor', nome = 'Instrutor Beto' where id = v_prof;
  update public.perfis set papel = 'parceiro', nome = 'Parceiro Caio' where id = v_parc;

  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste colaborador', 9501, 'teste') returning id into v_edicao;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 1') returning id into v_turma;
  insert into public.participantes (edicao_id, turma_id, funcao, nome, login, observacao, email)
  values (v_edicao, v_turma, 'aluno', 'Aluno colab', 'aluno.colab', 'Observação sigilosa', 'a@exemplo.invalid')
  returning id into v_aluno;
  update public.perfis set participante_id = v_aluno where id = v_aluno_conta;
  insert into public.aulas (edicao_id, turma_id, data, ordem) values (v_edicao, v_turma, '2026-01-10', 1) returning id into v_aula;
  insert into public.presencas (participante_id, aula_id, situacao, registro_original, justificativa)
  values (v_aluno, v_aula, 'justificada', 'Luto', 'Falecimento na família');
  insert into public.trilhas (nome) values ('Trilha colab ' || gen_random_uuid()) returning id into v_trilha;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo)
  values (v_turma, v_trilha, 'Com entrega', 'x', now() + interval '1 day') returning id into v_ativ_entregue;
  insert into public.solicitacoes (participante_id, tipo, descricao) values (v_aluno, 'Mudança de turno', 'Preciso ir para a tarde')
    returning id into v_sol;
  -- Estava na banca antes de virar colaborador (a banca agora não vale para ele)
  insert into public.membros_banca (edicao_id, perfil_id, nome, email, organizacao)
  values (v_edicao, v_colab, 'Colaboradora Lia', 'colab@exemplo.invalid', 'FavelaWare');

  -- O aluno entrega (a entrega é dele, com login)
  perform set_config('request.jwt.claims', json_build_object('sub', v_aluno_conta, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.tentativas (atividade_id, participante_id, comentario) values (v_ativ_entregue, v_aluno, 'Minha entrega')
    returning id into v_tentativa;
  reset role;

  -- ===== Colaborador: leitura da edição =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_colab, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_n from public.edicoes where id = v_edicao;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - lê as edições';
  select count(*) into v_n from public.turmas where id = v_turma;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - lê as turmas';
  select count(*) into v_n from public.aulas where id = v_aula;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - lê as aulas';

  select coalesce(login, '') || '|' || coalesce(observacao, '') || '|' || nome into v_txt
  from public.participantes_do_parceiro(v_edicao) where id = v_aluno;
  r := r || E'\n' || case when v_txt = '||Aluno colab' then 'ok' else 'FALHOU' end
    || ' - alunos pela função, sem login e sem observação';
  select situacao || '|' || registro_original into v_txt from public.presencas_do_parceiro(v_edicao) where participante_id = v_aluno;
  r := r || E'\n' || case when v_txt = 'justificada|' then 'ok' else 'FALHOU' end
    || ' - presenças pela função, sem o registro original';

  -- ===== Colaborador: o que não vê =====
  select count(*) into v_n from public.participantes where id = v_aluno;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê a tabela de alunos direto';
  select count(*) into v_n from public.presencas where participante_id = v_aluno;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê as presenças direto';
  select count(*) into v_n from public.tentativas where id = v_tentativa;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê as entregas';
  select count(*) into v_n from public.arquivos_entrega;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê os arquivos das entregas';
  select count(*) into v_n from public.atestados;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê atestados';
  select count(*) into v_n from public.dados_instrutores;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê dados dos instrutores';
  select count(*) into v_n from public.pontos_professores;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê o ponto dos instrutores';
  select count(*) into v_n from public.avaliacoes_instrutor;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê as avaliações dos instrutores';
  select count(*) into v_n from public.membros_banca;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê a banca';
  select count(*) into v_n from public.notas_banca;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê as notas da banca';
  select count(*) into v_n from public.perfis where id <> v_colab;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - não lê o perfil dos outros';

  -- Estava na banca, mas como colaborador não vê o item nem avalia
  v_sim := public.sou_da_banca();
  r := r || E'\n' || case when not v_sim then 'ok' else 'FALHOU' end || ' - não vê o item da banca';
  begin
    perform public.avaliacao_da_banca();
    r := r || E'\nFALHOU - colaborador abriu a avaliação da banca';
  exception when insufficient_privilege then r := r || E'\nok - não abre a avaliação da banca';
  end;

  -- ===== Colaborador: trilhas, materiais e atividades =====
  insert into public.trilhas (nome) values ('Trilha nova colab ' || gen_random_uuid()) returning id into v_trilha_nova;
  update public.trilhas set nome = 'Trilha renomeada ' || v_trilha_nova where id = v_trilha_nova;
  select count(*) into v_n from public.trilhas where id = v_trilha_nova and nome like 'Trilha renomeada %';
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - cria e edita trilha';
  delete from public.trilhas where id = v_trilha_nova;
  select count(*) into v_n from public.trilhas where id = v_trilha_nova;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - apaga trilha';

  insert into public.materiais (trilha_id, titulo, url) values (v_trilha, 'Link', 'https://exemplo.com')
    returning id into v_material;
  update public.materiais set titulo = 'Link editado' where id = v_material;
  select titulo into v_txt from public.materiais where id = v_material;
  r := r || E'\n' || case when v_txt = 'Link editado' then 'ok' else 'FALHOU' end || ' - cria e edita material';
  delete from public.materiais where id = v_material;
  select count(*) into v_n from public.materiais where id = v_material;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - apaga material';

  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo)
  values (v_turma, v_trilha, 'Nova', 'x', now() + interval '2 days') returning id into v_ativ_livre;
  update public.atividades set titulo = 'Nova editada' where id = v_ativ_livre;
  select titulo into v_txt from public.atividades where id = v_ativ_livre;
  r := r || E'\n' || case when v_txt = 'Nova editada' then 'ok' else 'FALHOU' end || ' - cria e edita atividade';
  delete from public.atividades where id = v_ativ_livre;
  select count(*) into v_n from public.atividades where id = v_ativ_livre;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - apaga atividade sem entregas';

  delete from public.atividades where id = v_ativ_entregue;
  begin
    update public.tentativas set status = 'concluida', feedback = 'Nota dada pelo colaborador', nota = 5
    where id = v_tentativa;
  exception when insufficient_privilege then null; -- recusa direta também vale
  end;
  reset role;
  select count(*) into v_n from public.atividades where id = v_ativ_entregue;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - NÃO apaga atividade com entrega';
  select count(*) into v_n from public.tentativas where id = v_tentativa and nota is null and feedback is null;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - não corrige entrega';

  -- ===== Colaborador: solicitações =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_colab, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.solicitacoes_da_equipe() where id = v_sol;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - vê as solicitações';
  insert into public.mensagens_solicitacao (solicitacao_id, texto) values (v_sol, 'Qual horário você prefere?');
  select autor_papel::text || '|' || coalesce(autor_nome, '') into v_txt
  from public.mensagens_solicitacao where solicitacao_id = v_sol;
  r := r || E'\n' || case when v_txt = 'colaborador|Colaboradora Lia' then 'ok' else 'FALHOU' end
    || ' - escreve e lê a conversa (carimbada como colaborador)';
  reset role;
  select status into v_txt from public.solicitacoes where id = v_sol;
  r := r || E'\n' || case when v_txt = 'em_andamento' then 'ok' else 'FALHOU' end
    || ' - mensagem dele num pedido aberto inicia o atendimento';

  perform set_config('request.jwt.claims', json_build_object('sub', v_colab, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.solicitacoes set status = 'aprovada', resposta = 'Mudado para a tarde' where id = v_sol;
  reset role;
  select count(*) into v_n from public.solicitacoes where id = v_sol and status = 'aprovada' and resolvida_por = v_colab;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - conclui a solicitação (carimbada com ele)';

  perform set_config('request.jwt.claims', json_build_object('sub', v_colab, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.solicitacoes where id = v_sol;
  reset role;
  select count(*) into v_n from public.solicitacoes where id = v_sol;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - não apaga solicitação';

  -- ===== Colaborador: não cadastra ninguém nem troca papel =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_colab, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.participantes (edicao_id, turma_id, funcao, nome) values (v_edicao, v_turma, 'aluno', 'Intruso');
    r := r || E'\nFALHOU - colaborador criou aluno';
  exception when insufficient_privilege then r := r || E'\nok - não cria aluno';
  end;
  begin
    insert into public.edicoes (nome, ordem, arquivo_origem) values ('Invasão', 9502, 'x');
    r := r || E'\nFALHOU - colaborador criou edição';
  exception when insufficient_privilege then r := r || E'\nok - não cria edição';
  end;
  begin
    insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma X');
    r := r || E'\nFALHOU - colaborador criou turma';
  exception when insufficient_privilege then r := r || E'\nok - não cria turma';
  end;
  begin
    perform public.registrar_chamada(v_turma, '2026-01-11'::date, jsonb_build_array(jsonb_build_object(
      'participante_id', v_aluno, 'situacao', 'presente')));
    r := r || E'\nFALHOU - colaborador fez chamada';
  exception when insufficient_privilege then r := r || E'\nok - não faz chamada';
  end;
  begin
    perform public.alternar_papel('gestor');
    r := r || E'\nFALHOU - colaborador alternou papel';
  exception when insufficient_privilege then r := r || E'\nok - não usa o "ver como"';
  end;
  begin
    perform public.cadastrar_membro_banca(v_edicao, v_novo, 'Pessoa Nova', 'FavelaWare');
    r := r || E'\nFALHOU - colaborador cadastrou banca';
  exception when insufficient_privilege then r := r || E'\nok - não cadastra a banca';
  end;
  -- Colunas fora da permissão: o pedido não muda de aluno, ninguém forja quem
  -- concluiu, e a atividade não muda de turma (as entregas iriam junto)
  begin
    update public.solicitacoes set participante_id = v_aluno where id = v_sol;
    r := r || E'\nFALHOU - colaborador mudou o aluno do pedido';
  exception when insufficient_privilege then r := r || E'\nok - não muda o aluno do pedido';
  end;
  begin
    update public.solicitacoes set resolvida_por = v_gestor where id = v_sol;
    r := r || E'\nFALHOU - colaborador escolheu quem concluiu';
  exception when insufficient_privilege then r := r || E'\nok - não escolhe quem concluiu o pedido';
  end;
  begin
    update public.atividades set turma_id = v_turma where id = v_ativ_entregue;
    r := r || E'\nFALHOU - colaborador mudou a turma da atividade';
  exception when insufficient_privilege then r := r || E'\nok - não muda a turma da atividade';
  end;
  begin
    update public.perfis set papel = 'gestor' where id = v_colab;
  exception when insufficient_privilege then null; -- recusa direta também vale
  end;
  begin
    update public.perfis set papel = 'colaborador' where id = v_novo;
  exception when insufficient_privilege then null;
  end;
  update public.edicoes set nome = 'Mudado' where id = v_edicao;
  update public.turmas set nome = 'Mudada' where id = v_turma;
  reset role;

  select papel::text into v_txt from public.perfis where id = v_colab;
  r := r || E'\n' || case when v_txt = 'colaborador' then 'ok' else 'FALHOU' end || ' - não vira gestor';
  select papel::text into v_txt from public.perfis where id = v_novo;
  r := r || E'\n' || case when v_txt = 'professor' then 'ok' else 'FALHOU' end || ' - não troca o papel de outra pessoa';
  select e.nome || '|' || t.nome into v_txt from public.edicoes e join public.turmas t on t.edicao_id = e.id where t.id = v_turma;
  r := r || E'\n' || case when v_txt = 'Teste colaborador|Turma 1' then 'ok' else 'FALHOU' end || ' - não altera edição nem turma';

  -- ===== Gestor: torna alguém colaborador; colaborador não entra na banca =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.perfis set papel = 'colaborador' where id = v_novo;
  begin
    perform public.cadastrar_membro_banca(v_edicao, v_novo, 'Pessoa Nova', 'FavelaWare');
    r := r || E'\nFALHOU - colaborador entrou na banca';
  exception when invalid_parameter_value then r := r || E'\nok - colaborador não entra na banca';
  end;
  -- O gestor continua vendo as entregas (a regra nova não mexeu nele)
  select count(*) into v_n from public.tentativas where id = v_tentativa;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - gestor continua lendo as entregas';
  reset role;
  select papel::text into v_txt from public.perfis where id = v_novo;
  r := r || E'\n' || case when v_txt = 'colaborador' then 'ok' else 'FALHOU' end || ' - gestor torna alguém colaborador';

  -- ===== Outros papéis não ganharam nada =====
  -- Instrutor: continua cuidando das trilhas, mas não vê as solicitações
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.trilhas (nome) values ('Trilha do instrutor ' || gen_random_uuid()) returning id into v_trilha_nova;
  select count(*) into v_n from public.trilhas where id = v_trilha_nova;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - instrutor continua criando trilha';
  select count(*) into v_n from public.solicitacoes_da_equipe();
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - instrutor não usa a lista de solicitações';
  select count(*) into v_n from public.solicitacoes;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - instrutor não lê as solicitações';
  reset role;

  -- Parceiro: continua só lendo
  perform set_config('request.jwt.claims', json_build_object('sub', v_parc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.trilhas (nome) values ('Trilha do parceiro');
    r := r || E'\nFALHOU - parceiro criou trilha';
  exception when insufficient_privilege then r := r || E'\nok - parceiro não cria trilha';
  end;
  begin
    insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo)
    values (v_turma, v_trilha, 'Do parceiro', 'x', now() + interval '1 day');
    r := r || E'\nFALHOU - parceiro criou atividade';
  exception when insufficient_privilege then r := r || E'\nok - parceiro não cria atividade';
  end;
  select count(*) into v_n from public.solicitacoes_da_equipe();
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - parceiro não usa a lista de solicitações';
  reset role;

  -- Aluno
  perform set_config('request.jwt.claims', json_build_object('sub', v_aluno_conta, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.solicitacoes_da_equipe();
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não usa a lista de solicitações';
  select count(*) into v_n from public.participantes_do_parceiro(v_edicao);
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não usa a função de alunos';
  begin
    insert into public.trilhas (nome) values ('Trilha do aluno');
    r := r || E'\nFALHOU - aluno criou trilha';
  exception when insufficient_privilege then r := r || E'\nok - aluno não cria trilha';
  end;
  reset role;

  raise exception '%', r;
end;
$$;
