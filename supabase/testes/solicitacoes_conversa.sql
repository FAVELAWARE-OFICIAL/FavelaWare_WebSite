-- Teste da conversa das solicitações: aluno e coordenação
-- (migrations 20260930107000, 20260930108000 e 20260930109000).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/solicitacoes_conversa.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_aluno_conta uuid := gen_random_uuid();
  v_colega_conta uuid := gen_random_uuid();
  v_gestor uuid := gen_random_uuid();
  v_parceiro uuid := gen_random_uuid();
  v_edicao bigint;
  v_turma bigint;
  v_aluno bigint;
  v_colega bigint;
  v_sol bigint;
  v_sol_colega bigint;
  v_n bigint;
  v_txt text;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_aluno_conta, 'conv-aluno@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_colega_conta, 'conv-colega@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_gestor, 'conv-gestor@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_parceiro, 'conv-parceiro@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'gestor', nome = 'Coordenadora Ana', foto = '/imgs/team/ana.webp' where id = v_gestor;
  update public.perfis set papel = 'parceiro', nome = 'Parceiro Beto' where id = v_parceiro;

  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste conversa', 9401, 'teste') returning id into v_edicao;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 1') returning id into v_turma;
  insert into public.participantes (edicao_id, turma_id, funcao, nome, foto)
  values (v_edicao, v_turma, 'aluno', 'Aluno conversa', '/imgs/turmas/aluno.webp') returning id into v_aluno;
  insert into public.participantes (edicao_id, turma_id, funcao, nome)
  values (v_edicao, v_turma, 'aluno', 'Colega conversa') returning id into v_colega;
  update public.perfis set participante_id = v_aluno where id = v_aluno_conta;
  update public.perfis set participante_id = v_colega where id = v_colega_conta;
  insert into public.solicitacoes (participante_id, tipo, descricao) values (v_aluno, 'Mudança de turno', 'Preciso ir para a tarde')
    returning id into v_sol;
  insert into public.solicitacoes (participante_id, tipo, descricao) values (v_colega, 'Outro assunto', 'Pedido do colega')
    returning id into v_sol_colega;

  -- ===== Gestor =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    insert into public.solicitacoes (participante_id, tipo, descricao) values (v_aluno, 'Outro', 'Registrado pelo gestor');
    r := r || E'\nFALHOU - gestor registrou solicitação';
  exception when insufficient_privilege then r := r || E'\nok - gestor não registra solicitação (só responde)';
  end;

  insert into public.mensagens_solicitacao (solicitacao_id, texto) values (v_sol, 'Qual horário você prefere?');
  reset role;
  select status into v_txt from public.solicitacoes where id = v_sol;
  r := r || E'\n' || case when v_txt = 'em_andamento' then 'ok' else 'FALHOU' end
    || ' - mensagem da coordenação num pedido aberto inicia o atendimento';
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select autor_papel::text || '|' || coalesce(autor_nome, '') || '|' || coalesce(autor_foto, '') into v_txt
  from public.mensagens_solicitacao where solicitacao_id = v_sol;
  r := r || E'\n' || case when v_txt = 'gestor|Coordenadora Ana|/imgs/team/ana.webp' then 'ok' else 'FALHOU' end
    || ' - mensagem carimba papel, nome e foto de quem escreveu';

  begin
    insert into public.mensagens_solicitacao (solicitacao_id, texto, autor_id) values (v_sol, 'Falso', v_aluno_conta);
    r := r || E'\nFALHOU - cliente escolheu o autor';
  exception when insufficient_privilege then r := r || E'\nok - ninguém escolhe o autor da mensagem';
  end;

  select count(*) into v_n from public.solicitacoes_da_equipe() where id in (v_sol, v_sol_colega);
  r := r || E'\n' || case when v_n = 2 then 'ok' else 'FALHOU' end || ' - gestor vê todas pela lista da equipe';
  reset role;

  -- ===== Parceiro: não participa das solicitações =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_parceiro, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.solicitacoes_da_equipe();
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - parceiro não vê solicitações';
  select count(*) into v_n from public.mensagens_solicitacao;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - parceiro não lê conversa';
  begin
    insert into public.mensagens_solicitacao (solicitacao_id, texto) values (v_sol, 'Intromissão');
    r := r || E'\nFALHOU - parceiro escreveu na conversa';
  exception when insufficient_privilege then r := r || E'\nok - parceiro não escreve na conversa';
  end;
  reset role;

  -- ===== Aluno =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_aluno_conta, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_n from public.mensagens_solicitacao where solicitacao_id = v_sol;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - aluno lê a própria conversa';
  insert into public.mensagens_solicitacao (solicitacao_id, texto) values (v_sol, 'Prefiro 13h.');
  select coalesce(autor_foto, '') into v_txt from public.mensagens_solicitacao where texto = 'Prefiro 13h.';
  r := r || E'\n' || case when v_txt = '/imgs/turmas/aluno.webp' then 'ok' else 'FALHOU' end
    || ' - aluno responde, com a foto da ficha dele';
  begin
    insert into public.mensagens_solicitacao (solicitacao_id, texto) values (v_sol_colega, 'Na do colega');
    r := r || E'\nFALHOU - aluno escreveu na conversa do colega';
  exception when insufficient_privilege then r := r || E'\nok - aluno não escreve na conversa do colega';
  end;
  select count(*) into v_n from public.mensagens_solicitacao where solicitacao_id = v_sol_colega;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não lê a conversa do colega';
  select count(*) || '|' || max(foto) into v_txt from public.minhas_solicitacoes();
  r := r || E'\n' || case when v_txt = '1|/imgs/turmas/aluno.webp' then 'ok' else 'FALHOU' end
    || ' - aluno lista só as próprias, com a foto dele';
  begin
    insert into public.solicitacoes (participante_id, tipo, descricao) values (v_aluno, '   ', 'Sem tipo');
    r := r || E'\nFALHOU - aceitou tipo vazio';
  exception when check_violation then r := r || E'\nok - tipo vazio é recusado';
  end;
  reset role;

  -- ===== Gestor conclui; depois disso o aluno não escreve =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.solicitacoes set status = 'aprovada', resposta = 'Pode ir às 13h' where id = v_sol;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', v_aluno_conta, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select respondida_por into v_txt from public.minhas_solicitacoes() where id = v_sol;
  r := r || E'\n' || case when v_txt = 'Coordenadora Ana' then 'ok' else 'FALHOU' end || ' - aluno vê quem respondeu';
  begin
    insert into public.mensagens_solicitacao (solicitacao_id, texto) values (v_sol, 'Depois de concluída');
    r := r || E'\nFALHOU - aluno escreveu em solicitação concluída';
  exception when insufficient_privilege then r := r || E'\nok - aluno não escreve em solicitação concluída';
  end;
  reset role;

  -- ===== Edição encerrada: ninguém escreve =====
  update public.edicoes set encerrada = true where id = v_edicao;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.mensagens_solicitacao (solicitacao_id, texto) values (v_sol_colega, 'Depois do fim');
    r := r || E'\nFALHOU - mensagem em edição encerrada';
  exception when sqlstate '22023' then r := r || E'\nok - edição encerrada não recebe mensagem';
  end;
  reset role;

  raise exception '%', r;
end;
$$;
