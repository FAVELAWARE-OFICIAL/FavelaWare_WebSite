-- Teste das solicitações do aluno (migration 20260930104000_solicitacoes_do_aluno.sql).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/solicitacoes.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_conta uuid := gen_random_uuid();
  v_gestor uuid := gen_random_uuid();
  v_edicao bigint;
  v_turma bigint;
  v_aluno bigint;
  v_colega bigint;
  v_minha bigint;
  v_txt text;
  v_n bigint;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_conta, 'sol-aluno@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_gestor, 'sol-gestor@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'gestor' where id = v_gestor;

  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste solicitações', 9201, 'teste') returning id into v_edicao;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 1') returning id into v_turma;
  insert into public.participantes (edicao_id, turma_id, funcao, nome)
  values (v_edicao, v_turma, 'aluno', 'Aluno solicitação') returning id into v_aluno;
  insert into public.participantes (edicao_id, turma_id, funcao, nome)
  values (v_edicao, v_turma, 'aluno', 'Colega') returning id into v_colega;
  update public.perfis set participante_id = v_aluno where id = v_conta;
  insert into public.solicitacoes (participante_id, tipo, descricao) values (v_colega, 'outro', 'Pedido do colega');

  -- ===== Aluno =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_conta, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Sem "returning": o aluno não lê a tabela direto (o portal grava sem pedir a linha de volta)
  insert into public.solicitacoes (participante_id, tipo, descricao)
  values (v_aluno, 'Mudança de turno', 'Quero ir para a tarde');
  select id, status into v_minha, v_txt from public.minhas_solicitacoes();
  r := r || E'\n' || case when v_txt = 'pendente' then 'ok' else 'FALHOU' end || ' - aluno envia e o pedido nasce aberto';

  begin
    insert into public.solicitacoes (participante_id, tipo, descricao) values (v_colega, 'outro', 'Em nome do colega');
    r := r || E'\nFALHOU - aluno enviou em nome de outro aluno';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não envia em nome de outro aluno';
  end;

  begin
    insert into public.solicitacoes (participante_id, tipo, descricao, status) values (v_aluno, 'outro', 'Já aprovado', 'aprovada');
    r := r || E'\nFALHOU - aluno escolheu o status ao enviar';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não escolhe o status';
  end;

  select count(*) into v_n from public.minhas_solicitacoes();
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - aluno lê só as próprias solicitações';
  select count(*) into v_n from public.solicitacoes;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não lê a tabela direto (só pela função)';

  update public.solicitacoes set status = 'aprovada', resposta = 'eu mesmo' where id = v_minha;
  reset role;
  select status into v_txt from public.solicitacoes where id = v_minha;
  r := r || E'\n' || case when v_txt = 'pendente' then 'ok' else 'FALHOU' end || ' - aluno não responde o próprio pedido';

  -- ===== Gestor, no quadro =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.solicitacoes set status = 'em_andamento' where id = v_minha;
  update public.solicitacoes set status = 'aprovada', resposta = 'Pode ir' where id = v_minha;
  -- Continua aprovada (só a resposta muda): quem e quando não mudam
  update public.solicitacoes set resposta = 'Pode ir, a partir de segunda' where id = v_minha;
  begin
    update public.solicitacoes set resolvida_por = v_conta where id = v_minha;
    r := r || E'
FALHOU - cliente escolheu quem concluiu';
  exception when insufficient_privilege then r := r || E'
ok - ninguém escolhe quem concluiu';
  end;
  reset role;
  select status || '|' || (resolvida_por = v_gestor and resolvida_em is not null)::text into v_txt
  from public.solicitacoes where id = v_minha;
  r := r || E'\n' || case when v_txt = 'aprovada|true' then 'ok' else 'FALHOU' end
    || ' - gestor move para em andamento e conclui (o banco carimba quem e quando)';

  -- Reabrir guarda a devolutiva e limpa quem e quando
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.solicitacoes set status = 'pendente' where id = v_minha;
  reset role;
  select resposta || '|' || (resolvida_por is null and resolvida_em is null)::text into v_txt
  from public.solicitacoes where id = v_minha;
  r := r || E'\n' || case when v_txt = 'Pode ir, a partir de segunda|true' then 'ok' else 'FALHOU' end
    || ' - reabrir guarda a devolutiva e limpa quem concluiu';

  -- ===== Edição encerrada =====
  update public.edicoes set encerrada = true where id = v_edicao;
  perform set_config('request.jwt.claims', json_build_object('sub', v_conta, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.solicitacoes (participante_id, tipo, descricao) values (v_aluno, 'outro', 'Depois do fim');
    r := r || E'\nFALHOU - edição encerrada recebeu solicitação';
  exception when sqlstate '22023' then
    r := r || E'\nok - edição encerrada não recebe solicitação';
  end;
  reset role;

  raise exception '%', r;
end;
$$;
