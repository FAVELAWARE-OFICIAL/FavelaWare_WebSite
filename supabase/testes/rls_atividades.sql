-- Teste das regras das atividades (criar, entregar, avaliar, arquivos).
-- Termina com um erro proposital que carrega o relatório e desfaz tudo.
--
--   npx supabase db query --linked -f supabase/testes/rls_atividades.sql
--
-- Cenário: turmas T1 e T2; alunos A1 e A2 em T1, B1 em T2; professor P1 em T1,
-- P2 em T2; um gestor. Esperado: todas as linhas dizem "ok".
do $$
declare
  u_a1 uuid := gen_random_uuid(); u_a2 uuid := gen_random_uuid(); u_b1 uuid := gen_random_uuid();
  u_p1 uuid := gen_random_uuid(); u_p2 uuid := gen_random_uuid(); u_g uuid := gen_random_uuid();
  t1 bigint; t2 bigint; e1 bigint; e2 bigint;
  pa1 bigint; pa2 bigint; pb1 bigint;
  v_trilha bigint; v_ativ bigint; v_ativ_vencida bigint; v_ativ_t2 bigint;
  v_tent bigint;
  v_arq1 uuid; v_arq2 uuid; v_desc uuid;
  v_regras bigint; v_pdf uuid; v_png uuid;
  v_opc bigint; v_png2 uuid;
  v_n bigint; v_txt text; v_num int;
  r text := 'RELATORIO';

begin
  -- ===== Montagem (como admin) =====
  select id, edicao_id into t1, e1 from public.turmas order by id limit 1;
  select id, edicao_id into t2, e2 from public.turmas where id <> t1 order by id limit 1;
  insert into auth.users (id, email, aud, role) values
    (u_a1, 'atv-a1@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_a2, 'atv-a2@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_b1, 'atv-b1@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_p1, 'atv-p1@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_p2, 'atv-p2@exemplo.invalid', 'authenticated', 'authenticated'),
    (u_g,  'atv-g@exemplo.invalid',  'authenticated', 'authenticated');
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (e1, t1, 'aluno', 'A1 teste') returning id into pa1;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (e1, t1, 'aluno', 'A2 teste') returning id into pa2;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (e2, t2, 'aluno', 'B1 teste') returning id into pb1;
  update public.perfis set papel = 'aluno', participante_id = pa1 where id = u_a1;
  update public.perfis set papel = 'aluno', participante_id = pa2 where id = u_a2;
  update public.perfis set papel = 'aluno', participante_id = pb1 where id = u_b1;
  update public.perfis set papel = 'professor', nome = 'Prof Um' where id = u_p1;
  update public.perfis set papel = 'professor' where id = u_p2;
  update public.perfis set papel = 'gestor' where id = u_g;
  insert into public.professores_turmas (professor_id, turma_id) values (u_p1, t1), (u_p2, t2);
  insert into public.trilhas (nome) values ('Trilha teste atividades ' || gen_random_uuid()) returning id into v_trilha;

  -- ===== P1 cria =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo)
  values (t1, v_trilha, 'Exercício 1', 'Crie um repositório', now() + interval '7 days') returning id, criada_por::text into v_ativ, v_txt;
  r := r || E'\n' || case when v_ativ is not null and v_txt = u_p1::text then 'ok' else 'FALHOU' end || ' - professor cria atividade na turma dele (autor carimbado)';

  begin
    insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo) values (t2, v_trilha, 'x', 'x', now() + interval '1 day');
    r := r || E'\nFALHOU - professor criou atividade em outra turma';
  exception when insufficient_privilege then
    r := r || E'\nok - professor não cria atividade em outra turma';
  end;

  begin
    insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo) values (t1, v_trilha, 'x', 'x', now() - interval '1 day');
    r := r || E'\nFALHOU - aceitou prazo no passado';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa prazo no passado';
  end;

  -- Atividade vencida e atividade da T2 (montadas como admin)
  reset role;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo) values (t1, v_trilha, 'Vencida', 'x', now() + interval '1 day') returning id into v_ativ_vencida;
  update public.atividades set prazo = now() - interval '1 hour' where id = v_ativ_vencida;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo) values (t2, v_trilha, 'Da T2', 'x', now() + interval '1 day') returning id into v_ativ_t2;

  -- ===== P2 não vê a da T1 =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_p2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.atividades where id = v_ativ;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - professor de outra turma não vê a atividade';

  -- ===== Alunos leem =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_b1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.atividades where id = v_ativ;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno de outra turma não vê a atividade';
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_ativ, pb1, 'oi');
    r := r || E'\nFALHOU - aluno de outra turma entregou';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno de outra turma não entrega';
  end;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.atividades where id = v_ativ;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - aluno da turma vê a atividade';

  -- ===== A1 entrega (tentando forjar nota e status) =====
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario, status, nota)
    values (v_ativ, pa1, 'forjado', 'concluida', 100);
    r := r || E'\nFALHOU - aluno gravou status/nota no envio';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não grava status nem nota no envio';
  end;

  begin
    insert into public.tentativas (atividade_id, participante_id, link) values (v_ativ, pa1, 'javascript:alert(1)');
    r := r || E'\nFALHOU - aceitou link que não é https';
  exception when check_violation then
    r := r || E'\nok - só aceita link https';
  end;

  insert into public.tentativas (atividade_id, participante_id, link) values (v_ativ, pa1, 'https://github.com/aluno/repo')
  returning id, numero, status into v_tent, v_num, v_txt;
  r := r || E'\n' || case when v_num = 1 and v_txt = 'aguardando' then 'ok' else 'FALHOU' end || ' - aluno entrega (1ª tentativa, aguardando)';

  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_ativ, pa1, 'de novo');
    r := r || E'\nFALHOU - enviou de novo enquanto aguardava';
  exception when invalid_parameter_value then
    r := r || E'\nok - não envia de novo enquanto aguarda correção';
  end;

  update public.tentativas set status = 'concluida', nota = 100, feedback = 'eu mesmo' where id = v_tent;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não se dá nota';

  begin
    delete from public.tentativas where id = v_tent;
    r := r || E'\nFALHOU - aluno apagou a entrega';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não apaga a entrega';
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('entregas', v_ativ || '/' || pa1 || '/44444444-4444-4444-4444-444444444444.pdf');
    r := r || E'\nFALHOU - subiu arquivo com a entrega aguardando correção';
  exception when insufficient_privilege then
    r := r || E'\nok - não sobe arquivo com o envio fechado (aguardando)';
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('entregas', v_ativ_vencida || '/' || pa1 || '/55555555-5555-5555-5555-555555555555.pdf');
    r := r || E'\nFALHOU - subiu arquivo depois do prazo';
  exception when insufficient_privilege then
    r := r || E'\nok - não sobe arquivo depois do prazo';
  end;

  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_ativ_vencida, pa1, 'atrasado');
    r := r || E'\nFALHOU - entregou depois do prazo';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa entrega depois do prazo';
  end;

  -- ===== IDOR entre alunos =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where participante_id = pa1;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não vê a entrega do colega';
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_ativ, pa1, 'em nome do colega');
    r := r || E'\nFALHOU - aluno entregou em nome do colega';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não entrega em nome do colega';
  end;

  -- ===== Arquivos no Google Drive =====
  -- (A2 logado) O envio direto ao Storage do Supabase acabou
  begin
    insert into storage.objects (bucket_id, name) values ('entregas', v_ativ || '/' || pa2 || '/11111111-1111-1111-1111-111111111111.pdf');
    r := r || E'\nFALHOU - envio direto ao Storage ainda aceito';
  exception when insufficient_privilege then
    r := r || E'\nok - envio direto ao Storage desligado';
  end;
  -- Só o servidor registra arquivo do Drive
  begin
    insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho)
    values (v_ativ, pa2, 'driveFalsoDoAluno123', 'x.pdf', 'application/pdf', 10);
    r := r || E'\nFALHOU - aluno registrou arquivo do Drive sozinho';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não registra arquivo do Drive (só o servidor)';
  end;
  select participante_id into v_n from public.reservar_arquivo(v_ativ, 'r.pdf', 'application/pdf', 100);
  r := r || E'\n' || case when v_n = pa2 then 'ok' else 'FALHOU' end || ' - aluno da turma pode enviar arquivo';

  -- A reserva (ainda sem drive_id) não aparece nem para o dono
  select count(*) into v_n from public.arquivos_entrega where drive_id is null;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - reserva sem upload não aparece';

  -- (como o servidor) registra 1 arquivo de A1 e mais soltos de A2 (limite: 5 em 24 horas; a reserva acima conta)
  reset role;
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho)
  values (v_ativ, pa1, 'driveArquivoDoA1xyz', 'a1.pdf', 'application/pdf', 100) returning id into v_arq1;
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho)
  values (v_ativ, pa2, 'driveArquivoDoA2xyz', 'meu.pdf', 'application/pdf', 100) returning id into v_arq2;
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho) values
    (v_ativ, pa2, 'driveSoltoDoA2numero2', 's2.pdf', 'application/pdf', 100),
    (v_ativ, pa2, 'driveSoltoDoA2numero3', 's3.pdf', 'application/pdf', 100),
    (v_ativ, pa2, 'driveSoltoDoA2numero4', 's4.pdf', 'application/pdf', 100);
  -- Descartado (a entrega falhou) continua contando: a limpeza não zera o limite
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho, descartado_em)
  values (v_ativ, pa2, 'driveDescartadoDoA2x', 'd.pdf', 'application/pdf', 100, now()) returning id into v_desc;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a2, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    perform * from public.reservar_arquivo(v_ativ, 'r.pdf', 'application/pdf', 100);
    r := r || E'\nFALHOU - aceitou o 6º arquivo solto';
  exception when invalid_parameter_value then
    r := r || E'\nok - no máximo 5 arquivos soltos em 24h (descartados contam)';
  end;
  begin
    insert into public.tentativas (atividade_id, participante_id, arquivo_id) values (v_ativ, pa2, v_desc);
    r := r || E'
FALHOU - entrega usou arquivo descartado';
  exception when insufficient_privilege then
    r := r || E'
ok - entrega não usa arquivo descartado';
  end;
  begin
    insert into public.tentativas (atividade_id, participante_id, arquivo_id) values (v_ativ, pa2, v_arq1);
    r := r || E'\nFALHOU - entrega usou o arquivo do colega';
  exception when insufficient_privilege then
    r := r || E'\nok - entrega não usa o arquivo do colega';
  end;
  insert into public.tentativas (atividade_id, participante_id, arquivo_id) values (v_ativ, pa2, v_arq2)
  returning numero into v_num;
  r := r || E'\n' || case when v_num = 1 then 'ok' else 'FALHOU' end || ' - aluno entrega com arquivo do Drive';

  -- Quem vê o arquivo: o dono, o gestor e o professor da turma
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.arquivos_entrega where id = v_arq2;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não vê o arquivo do colega';
  begin
    perform * from public.reservar_arquivo(v_ativ, 'r.pdf', 'application/pdf', 100); -- A1 tem entrega aguardando
    r := r || E'\nFALHOU - enviou arquivo com a entrega aguardando';
  exception when invalid_parameter_value then
    r := r || E'\nok - não envia arquivo com a entrega aguardando';
  end;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.arquivos_entrega where id = v_arq2;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - professor de outra turma não vê o arquivo';
  begin
    perform * from public.reservar_arquivo(v_ativ, 'r.pdf', 'application/pdf', 100);
    r := r || E'\nFALHOU - professor enviou arquivo como aluno';
  exception when insufficient_privilege then
    r := r || E'\nok - professor não envia arquivo de entrega';
  end;
  update public.tentativas set status = 'refazer', feedback = 'x' where id = v_tent;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - professor de outra turma não avalia';

  -- ===== P1 avalia =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.arquivos_entrega where id = v_arq2;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - professor da turma vê o arquivo';

  begin
    update public.tentativas set avaliada_por = u_g where id = v_tent;
    r := r || E'\nFALHOU - professor forjou quem avaliou';
  exception when insufficient_privilege then
    r := r || E'\nok - não dá para forjar quem avaliou';
  end;

  update public.tentativas set status = 'refazer', feedback = 'Falta o arquivo nome.txt' where id = v_tent;
  select avaliada_por::text || '|' || avaliada_por_nome into v_txt from public.tentativas where id = v_tent;
  r := r || E'\n' || case when v_txt = u_p1::text || '|Prof Um' then 'ok' else 'FALHOU' end || ' - professor pede para refazer (autor carimbado)';

  begin
    update public.tentativas set status = 'concluida', feedback = 'ok' where id = v_tent;
    r := r || E'\nFALHOU - concluiu sem nota';
  exception when check_violation then
    r := r || E'\nok - concluída exige nota';
  end;

  -- ===== A1 reenvia (mesmo que o prazo tivesse passado, o Refazer reabre) =====
  reset role;
  update public.atividades set prazo = now() - interval '1 hour' where id = v_ativ;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.tentativas (atividade_id, participante_id, comentario) values (v_ativ, pa1, 'Agora com o arquivo')
  returning numero into v_num;
  r := r || E'\n' || case when v_num = 2 then 'ok' else 'FALHOU' end || ' - aluno reenvia após Refazer (2ª tentativa, mesmo após o prazo)';

  -- ===== P1 não reescreve a 1ª; conclui a 2ª =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_p1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.tentativas set status = 'concluida', nota = 50, feedback = 'x' where id = v_tent;
    r := r || E'\nFALHOU - reescreveu a avaliação de uma tentativa antiga';
  exception when invalid_parameter_value then
    r := r || E'\nok - tentativa antiga não é reavaliada';
  end;
  update public.tentativas set status = 'concluida', nota = 100, feedback = 'Parabéns!'
  where atividade_id = v_ativ and participante_id = pa1 and numero = 2;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - professor conclui com 100';

  begin
    delete from public.atividades where id = v_ativ;
    get diagnostics v_n = row_count;
    r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - atividade com entregas não é apagada';
  end;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_ativ, pa1, 'terceira');
    r := r || E'\nFALHOU - enviou depois de concluída';
  exception when invalid_parameter_value then
    r := r || E'\nok - não envia depois de concluída';
  end;
  select count(*) into v_n from public.tentativas where participante_id = pa1;
  r := r || E'\n' || case when v_n = 2 then 'ok' else 'FALHOU' end || ' - aluno vê o próprio histórico (2 tentativas)';

  -- ===== Gestor vê tudo; trilha com atividade não é apagada =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_g, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.tentativas where atividade_id = v_ativ;
  r := r || E'\n' || case when v_n = 3 then 'ok' else 'FALHOU' end || ' - gestor vê todas as entregas';
  begin
    delete from public.trilhas where id = v_trilha;
    r := r || E'\nFALHOU - apagou trilha com atividades';
  exception when foreign_key_violation then
    r := r || E'\nok - trilha com atividades não é apagada';
  end;

  -- ===== "Ver como aluno" (conta que alterna papéis, sem aluno ligado) =====
  reset role;
  update public.perfis set papel = 'aluno', pode_alternar_papel = true where id = u_g;
  set local role authenticated;
  select count(*) into v_n from public.atividades where id in (v_ativ, v_ativ_t2);
  r := r || E'\n' || case when v_n = 2 then 'ok' else 'FALHOU' end || ' - ver como aluno lê atividades de qualquer turma';
  select count(*) into v_n from public.turmas where id in (t1, t2);
  r := r || E'\n' || case when v_n = 2 then 'ok' else 'FALHOU' end || ' - ver como aluno lê as turmas (para escolher)';
  select count(*) into v_n from public.edicoes where id in (e1, e2);
  r := r || E'\n' || case when v_n = (case when e1 = e2 then 1 else 2 end) then 'ok' else 'FALHOU' end || ' - ver como aluno lê as edições (nome no seletor)';
  select count(*) into v_n from public.tentativas;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - ver como aluno não vê entregas de ninguém';
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario) values (v_ativ_t2, pb1, 'x');
    r := r || E'\nFALHOU - ver como aluno enviou';
  exception when insufficient_privilege then
    r := r || E'\nok - ver como aluno não envia';
  end;
  -- Aluno sem aluno ligado e SEM permissão de alternar: não vê nada
  reset role;
  update public.perfis set pode_alternar_papel = false where id = u_g;
  set local role authenticated;
  select count(*) into v_n from public.atividades;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno sem turma e sem permissão não vê atividades';
  select count(*) into v_n from public.turmas;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno sem turma e sem permissão não vê turmas';
  select count(*) into v_n from public.edicoes;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno sem turma e sem permissão não vê edições';

  -- ===== Cota diária de 50 MB por aluno =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_b1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform * from public.reservar_arquivo(v_ativ_t2, 'g.pdf', 'application/pdf', 52428801);
    r := r || E'\nFALHOU - passou da cota diária de 50 MB';
  exception when invalid_parameter_value then
    r := r || E'\nok - respeita a cota diária de 50 MB';
  end;

  -- ===== Visitante =====
  reset role;
  set local role anon;
  begin
    select count(*) into v_n from public.atividades;
    r := r || E'\nFALHOU - visitante leu atividades';
  exception when insufficient_privilege then
    r := r || E'\nok - visitante não lê atividades';
  end;

  -- ===== Regras de entrega da atividade =====
  reset role;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo, exige_texto, exige_link, tipo_link, exige_arquivo, formatos)
  values (t1, v_trilha, 'Com regras', 'x', now() + interval '1 day', true, true, 'github', true, array['pdf'])
  returning id into v_regras;
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho)
  values (v_regras, pa1, 'drivePdfDoA1regras', 'a.pdf', 'application/pdf', 10) returning id into v_pdf;
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho)
  values (v_regras, pa1, 'drivePngDoA1regras', 'a.png', 'image/png', 10) returning id into v_png;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario, link, arquivo_id) values (v_regras, pa1, null, 'https://github.com/a/b', v_pdf);
    r := r || E'\nFALHOU - recusa sem o comentário exigido';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa sem o comentário exigido';
  end;
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario, link, arquivo_id) values (v_regras, pa1, 'oi', null, v_pdf);
    r := r || E'\nFALHOU - recusa sem o link exigido';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa sem o link exigido';
  end;
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario, link, arquivo_id) values (v_regras, pa1, 'oi', 'https://drive.google.com/x', v_pdf);
    r := r || E'\nFALHOU - recusa link que não é do GitHub';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa link que não é do GitHub';
  end;
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario, link, arquivo_id) values (v_regras, pa1, 'oi', 'https://github.com/a/b', null);
    r := r || E'\nFALHOU - recusa sem o arquivo exigido';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa sem o arquivo exigido';
  end;
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario, link, arquivo_id) values (v_regras, pa1, 'oi', 'https://github.com/a/b', v_png);
    r := r || E'\nFALHOU - recusa arquivo fora do formato (PNG em atividade de PDF)';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa arquivo fora do formato (PNG em atividade de PDF)';
  end;
  begin
    perform * from public.reservar_arquivo(v_regras, 'x.png', 'image/png', 10);
    r := r || E'\nFALHOU - reserva recusa formato errado antes do upload';
  exception when invalid_parameter_value then
    r := r || E'\nok - reserva recusa formato errado antes do upload';
  end;
  -- Comentário só com espaços, tab e quebra de linha não conta como texto
  -- (antes do envio que dá certo, e conferindo a mensagem: é a regra do comentário que recusa)
  begin
    insert into public.tentativas (atividade_id, participante_id, comentario, link, arquivo_id) values (v_regras, pa1, E' \t\n ', 'https://github.com/a/b', v_pdf);
    r := r || E'\nFALHOU - comentário em branco não cumpre a exigência de comentário';
  exception when invalid_parameter_value then
    r := r || E'\n' || case when sqlerrm like 'Esta atividade pede um comentário%' then 'ok' else 'FALHOU' end
      || ' - comentário em branco não cumpre a exigência de comentário';
  end;
  insert into public.tentativas (atividade_id, participante_id, comentario, link, arquivo_id)
  values (v_regras, pa1, 'Segue', 'https://github.com/aluno/projeto', v_pdf) returning numero into v_num;
  r := r || E'\n' || case when v_num = 1 then 'ok' else 'FALHOU' end || ' - aceita quando cumpre todas as regras';
  -- Aluno não muda as regras da atividade
  update public.atividades set exige_texto = false where id = v_regras;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não muda as regras da atividade';

  -- Regras opcionais: tipo de link vale mesmo sem exigir link; formatos vazios aceitam qualquer um
  reset role;
  insert into public.atividades (turma_id, trilha_id, titulo, enunciado, prazo, tipo_link)
  values (t1, v_trilha, 'Link opcional do GitHub', 'x', now() + interval '1 day', 'github') returning id into v_opc;
  insert into public.arquivos_entrega (atividade_id, participante_id, drive_id, nome, mime, tamanho)
  values (v_opc, pa1, 'drivePngDoA1opcional', 'b.png', 'image/png', 10) returning id into v_png2;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.tentativas (atividade_id, participante_id, link) values (v_opc, pa1, 'https://drive.google.com/x');
    r := r || E'\nFALHOU - link opcional ainda precisa ser do tipo pedido';
  exception when invalid_parameter_value then
    r := r || E'\nok - link opcional ainda precisa ser do tipo pedido';
  end;
  insert into public.tentativas (atividade_id, participante_id, comentario, arquivo_id) values (v_opc, pa1, 'só texto e imagem', v_png2)
  returning numero into v_num;
  r := r || E'\n' || case when v_num = 1 then 'ok' else 'FALHOU' end || ' - sem regras de formato, aceita PNG e texto';
  reset role;

  -- ===== Apagar aluno com entrega no Drive (as cascatas não travam) =====
  reset role;
  begin
    delete from public.participantes where id = pa2;
    r := r || E'\nok - apaga aluno com entrega no Drive';
  exception when others then
    r := r || E'\nFALHOU - não apagou aluno com entrega no Drive: ' || sqlerrm;
  end;

  reset role;
  raise exception '%', r;
end $$;
