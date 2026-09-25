-- Teste da equipe no site, do vínculo e cargo e do Hall da Fama automático
-- (migrations 20261001114000 e 115000).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/hall_da_fama.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_gestor uuid := gen_random_uuid();
  v_prof uuid := gen_random_uuid();
  v_solto uuid := gen_random_uuid();
  v_parceiro uuid := gen_random_uuid();
  v_parceiro_sem uuid := gen_random_uuid();
  v_banca uuid := gen_random_uuid();
  v_lider uuid := gen_random_uuid();
  v_colab uuid := gen_random_uuid();
  v_colab_sem uuid := gen_random_uuid();
  v_edicao bigint;
  v_demo bigint;
  v_turma bigint;
  v_n bigint;
  v_txt text;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_gestor, 'hall-gestor@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_prof, 'hall-prof@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_solto, 'hall-solto@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_parceiro, 'hall-parceiro@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_parceiro_sem, 'hall-parceiro2@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_banca, 'hall-banca@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_lider, 'hall-lider@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_colab, 'hall-colab@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_colab_sem, 'hall-colab2@exemplo.invalid', 'authenticated', 'authenticated');
  -- Só as contas do teste têm cargo (o resto da equipe real não entra na conta)
  update public.perfis set cargo = null where cargo is not null;
  update public.edicoes set encerrada = true where not demonstracao and not encerrada;
  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Edição 99 (2099)', 9990, 'teste') returning id into v_edicao;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 1') returning id into v_turma;
  update public.perfis set papel = 'gestor', nome = 'Gestora Maria da Silva' where id = v_gestor;
  update public.perfis set papel = 'professor', nome = 'Instrutor João Pereira' where id = v_prof;
  update public.perfis set papel = 'professor', nome = 'Instrutor Sem Turma' where id = v_solto;
  update public.perfis set papel = 'parceiro', nome = 'Parceira Ana Souza' where id = v_parceiro;
  update public.perfis set papel = 'parceiro', nome = 'Parceiro Sem Cargo' where id = v_parceiro_sem;
  update public.perfis set papel = 'banca', nome = 'Banca Carla Dias', cargo = 'Jurada' where id = v_banca;
  update public.perfis set papel = 'gestor', nome = 'Lider Discente Teste', pode_alternar_papel = true where id = v_lider;
  update public.perfis set papel = 'colaborador', nome = 'Colaboradora Rita Lima' where id = v_colab;
  update public.perfis set papel = 'colaborador', nome = 'Colaborador Sem Cargo' where id = v_colab_sem;
  insert into public.professores_turmas (professor_id, turma_id) values (v_prof, v_turma);

  -- ===== Gestor preenche vínculo e cargo =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.perfis set cargo = 'Coordenadora', organizacao = 'Mundiale' where id = v_gestor;
  update public.perfis set cargo = 'Psicóloga', organizacao = 'AOPA' where id = v_parceiro;
  update public.perfis set cargo = 'Líder Discente', organizacao = 'Ânima' where id = v_lider;
  update public.perfis set cargo = 'Designer', organizacao = 'Ânima' where id = v_colab;
  update public.perfis set organizacao = 'Ânima' where id = v_prof;
  select organizacao into v_txt from public.perfis where id = v_prof;
  r := r || E'\n' || case when v_txt = 'Ânima' then 'ok' else 'FALHOU' end || ' - gestor grava o vínculo';
  begin
    update public.perfis set cargo = repeat('a', 61) where id = v_prof;
    r := r || E'\nFALHOU - aceitou cargo com 61 letras';
  exception when check_violation then r := r || E'\nok - cargo tem no máximo 60 letras';
  end;
  begin
    update public.perfis set organizacao = '<b>Ânima</b>' where id = v_prof;
    r := r || E'\nFALHOU - aceitou vínculo com < >';
  exception when check_violation then r := r || E'\nok - vínculo sem < >';
  end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.perfis set cargo = 'Diretor' where id = v_prof;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - instrutor não muda o próprio cargo';
  reset role;

  -- ===== Página Sobre (visitante) =====
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select string_agg(nome || '|' || cargo, ',' order by nome) into v_txt from public.equipe_da_edicao_atual();
  r := r || E'\n' || case when v_txt = 'Colaboradora Lima|Designer,Gestora Silva|Coordenadora,Instrutor Pereira|Instrutor(a),Lider Teste|Líder Discente,Parceira Souza|Psicóloga'
    then 'ok' else 'FALHOU (' || coalesce(v_txt, 'nada') || ')' end
    || ' - Sobre: instrutor da edição, gestor, colaborador, parceiro e líder com cargo, nome curto (sem banca, sem cargo e sem turma ficam de fora)';
  select organizacao into v_txt from public.equipe_da_edicao_atual() where nome = 'Parceira Souza';
  r := r || E'\n' || case when v_txt = 'AOPA' then 'ok' else 'FALHOU' end || ' - Sobre mostra o vínculo';
  begin
    perform count(*) from public.hall_da_fama;
    r := r || E'\nFALHOU - visitante leu a tabela do hall direto';
  exception when insufficient_privilege then r := r || E'\nok - tabela do hall só pela função do site';
  end;
  reset role;

  -- Edição mais nova ainda sem turma não vira a atual: o Sobre segue com a anterior
  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Edição 100 (2100)', 9991, 'teste');
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select string_agg(distinct edicao_nome, ',') into v_txt from public.equipe_da_edicao_atual();
  r := r || E'\n' || case when v_txt = 'Edição 99 (2099)' then 'ok' else 'FALHOU (' || coalesce(v_txt, 'nada') || ')' end
    || ' - edição nova sem turma não é a atual (fica a anterior)';
  reset role;

  -- ===== Encerrar a edição leva a equipe para o hall =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.edicoes set encerrada = true where id = v_edicao;
  reset role;
  select count(*) into v_n from public.hall_da_fama where edicao_id = v_edicao;
  r := r || E'\n' || case when v_n = 5 then 'ok' else 'FALHOU (' || v_n || ')' end || ' - ao encerrar, a equipe vai para o hall';
  -- Encerrada a 99, a única aberta (100) não tem turma: nada (o site mostra a equipe anterior)
  select count(*) into v_n from public.equipe_da_edicao_atual();
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end
    || ' - sem edição aberta com turma, a função não devolve equipe';

  -- Depois do retrato, a pessoa muda: o hall não muda
  update public.perfis set cargo = 'Outro cargo', papel = 'aluno' where id = v_parceiro;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select cargo into v_txt from public.hall_da_fama_do_site() where nome = 'Parceira Souza' and edicao_ordem = 9990;
  r := r || E'\n' || case when v_txt = 'Psicóloga' then 'ok' else 'FALHOU' end || ' - o hall guarda o retrato do encerramento';
  reset role;

  -- Reabrir (só pelo SQL Editor) e encerrar de novo não duplica
  perform set_config('request.jwt.claims', '', true);
  update public.edicoes set encerrada = false where id = v_edicao;
  update public.edicoes set encerrada = true where id = v_edicao;
  select count(*) into v_n from public.hall_da_fama where edicao_id = v_edicao;
  r := r || E'\n' || case when v_n = 5 then 'ok' else 'FALHOU (' || v_n || ')' end || ' - encerrar de novo não duplica';

  -- Demonstração nunca vai para o hall
  select id into v_demo from public.edicoes where demonstracao;
  update public.edicoes set encerrada = false where id = v_demo;
  update public.edicoes set encerrada = true where id = v_demo;
  select count(*) into v_n from public.hall_da_fama where edicao_id = v_demo;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - demonstração não vai para o hall';

  -- Foto do hall fica protegida
  insert into public.hall_da_fama (edicao_id, nome, foto)
  values (v_edicao, 'Foto Teste', 'https://x.supabase.co/storage/v1/object/public/fotos-alunos/perfis/abc_1.webp');
  r := r || E'\n' || case when private.foto_no_hall('perfis/abc_1.webp') and not private.foto_no_hall('perfis/abcx1.webp')
    then 'ok' else 'FALHOU' end || ' - foto do hall é reconhecida pelo nome exato (sem curinga)';

  raise exception '%', r;
end;
$$;
