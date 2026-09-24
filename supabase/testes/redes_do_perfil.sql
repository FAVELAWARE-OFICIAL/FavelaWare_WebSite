-- Teste das redes do perfil (migration 20261001105000).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/redes_do_perfil.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_conta uuid := gen_random_uuid();
  v_outra uuid := gen_random_uuid();
  v_edicao bigint;
  v_turma bigint;
  v_aluno bigint;
  v_txt text;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login): aluno de uma edição nova, com conta =====
  insert into auth.users (id, email, aud, role) values
    (v_conta, 'redes-aluno@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_outra, 'redes-outra@exemplo.invalid', 'authenticated', 'authenticated');
  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste redes (2031)', 9951, 'teste') returning id into v_edicao;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 1') returning id into v_turma;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (v_edicao, v_turma, 'aluno', 'Maria Redes Silva')
    returning id into v_aluno;
  update public.perfis set participante_id = v_aluno where id = v_conta;

  -- ===== A pessoa grava as próprias redes =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_conta, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.atualizar_minhas_redes('https://www.linkedin.com/in/maria-silva', 'https://github.com/maria-dev', ' Maria@Gmail.com ');
  select linkedin || '|' || github || '|' || email_contato into v_txt from public.perfis where id = v_conta;
  r := r || E'\n' || case when v_txt = 'https://www.linkedin.com/in/maria-silva|https://github.com/maria-dev|maria@gmail.com'
    then 'ok' else 'FALHOU (' || coalesce(v_txt, '-') || ')' end || ' - grava LinkedIn, GitHub e Gmail';
  begin
    perform public.atualizar_minhas_redes('https://site-estranho.com/maria', '', '');
    r := r || E'\nFALHOU - aceitou LinkedIn que não é perfil';
  exception when check_violation then r := r || E'\nok - LinkedIn fora do formato é recusado';
  end;
  begin
    update public.perfis set linkedin = null where id = v_outra;
    r := r || E'\nok - update direto no perfil de outro não passa pela RLS (0 linhas)';
  exception when insufficient_privilege then r := r || E'\nok - não mexe direto no perfil (só pela função)';
  end;
  reset role;

  -- ===== Site público: só o LinkedIn =====
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;
  select linkedin into v_txt from public.turmas_do_site() where turma_id = v_turma;
  r := r || E'\n' || case when v_txt = 'https://www.linkedin.com/in/maria-silva' then 'ok' else 'FALHOU' end
    || ' - o LinkedIn do aluno aparece no site da turma';
  begin
    select count(*)::text into v_txt from public.perfis;
    r := r || case when v_txt = '0' then E'\nok - anônimo não lê perfis (GitHub e Gmail não saem)' else E'\nFALHOU - anônimo leu perfis' end;
  exception when insufficient_privilege then r := r || E'\nok - anônimo não lê perfis (GitHub e Gmail não saem)';
  end;
  reset role;

  raise exception '%', r;
end;
$$;
