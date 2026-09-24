-- Teste das regras da tela "Meu perfil".
-- Termina com um erro proposital que carrega o relatório e desfaz tudo.
--
--   npx supabase db query --linked -f supabase/testes/rls_perfil.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_prof uuid := gen_random_uuid();
  v_aluno uuid := gen_random_uuid();
  v_turma bigint;
  v_edicao bigint;
  v_part bigint;
  v_n bigint;
  v_txt text;
  v_flag boolean;
  r text := 'RELATORIO';
begin
  insert into auth.users (id, email, aud, role) values
    (v_prof, 'perfil-prof@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_aluno, 'perfil-aluno@exemplo.invalid', 'authenticated', 'authenticated');
  select id, edicao_id into v_turma, v_edicao from public.turmas limit 1;
  insert into public.participantes (edicao_id, turma_id, funcao, nome) values (v_edicao, v_turma, 'aluno', 'Aluno Teste Perfil') returning id into v_part;
  update public.perfis set papel = 'professor', nome = 'Prof Antigo' where id = v_prof;
  update public.perfis set papel = 'aluno', participante_id = v_part, precisa_trocar_senha = true where id = v_aluno;

  -- ===== Professor =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.atualizar_meu_perfil('  Prof Novo  ');
  select nome into v_txt from public.perfis where id = v_prof;
  r := r || E'\n' || case when v_txt = 'Prof Novo' then 'ok' else 'FALHOU' end || ' - professor muda o próprio nome';

  update public.perfis set papel = 'gestor' where id = v_prof;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - professor não vira gestor';

  begin
    update public.perfis set pode_alternar_papel = true where id = v_prof;
    r := r || E'\nFALHOU - professor mexeu em pode_alternar_papel';
  exception when insufficient_privilege then
    r := r || E'\nok - professor não mexe em pode_alternar_papel';
  end;

  begin
    perform public.atualizar_meu_perfil('x');
    r := r || E'\nFALHOU - aceitou nome curto';
  exception when invalid_parameter_value then
    r := r || E'\nok - recusa nome curto';
  end;

  begin
    perform public.atualizar_meus_dados_de_aluno('2000-01-01', 'a@b.com');
    r := r || E'\nFALHOU - professor usou a função do aluno';
  exception when insufficient_privilege then
    r := r || E'\nok - professor não usa a função do aluno';
  end;

  -- ===== Aluno =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_aluno, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.atualizar_meus_dados_de_aluno('2005-05-10', '  Aluno@Exemplo.COM ');
  reset role;
  select email into v_txt from public.participantes where id = v_part;
  select precisa_trocar_senha into v_flag from public.perfis where id = v_aluno;
  set local role authenticated;
  r := r || E'\n' || case when v_txt = 'aluno@exemplo.com' then 'ok' else 'FALHOU' end || ' - aluno grava nascimento e e-mail';
  r := r || E'\n' || case when v_flag then 'ok' else 'FALHOU' end || ' - não libera o primeiro acesso por aqui';

  begin
    perform public.atualizar_meus_dados_de_aluno(null, '   ');
    r := r || E'\nFALHOU - apagou nascimento e e-mail';
  exception when invalid_parameter_value then
    r := r || E'\nok - não apaga nascimento e e-mail (obrigatórios)';
  end;

  begin
    perform public.atualizar_meus_dados_de_aluno('2005-05-10', 'sem-arroba');
    r := r || E'\nFALHOU - aceitou e-mail inválido';
  exception when check_violation then
    r := r || E'\nok - recusa e-mail inválido';
  end;

  begin
    perform public.atualizar_meus_dados_de_aluno(current_date + 10, 'a@b.com');
    r := r || E'\nFALHOU - aceitou nascimento no futuro';
  exception when check_violation then
    r := r || E'\nok - recusa nascimento no futuro';
  end;

  begin
    perform public.atualizar_meu_perfil('Outro Nome');
    r := r || E'\nFALHOU - aluno mudou o nome oficial';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não muda o nome oficial';
  end;

  update public.perfis set papel = 'gestor' where id = v_aluno;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não altera o próprio perfil direto';

  begin
    update public.participantes set nome = 'Hack' where id = v_part;
    get diagnostics v_n = row_count;
    r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não altera a ficha direto';
  exception when insufficient_privilege then
    r := r || E'\nok - aluno não altera a ficha direto';
  end;

  -- ===== Gestor não dá o modo "ver como" para ninguém =====
  reset role;
  update public.perfis set papel = 'gestor' where id = v_prof;
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.perfis set pode_alternar_papel = true where id = v_aluno;
    r := r || E'\nFALHOU - gestor deu pode_alternar_papel a outra conta';
  exception when insufficient_privilege then
    r := r || E'\nok - nem o gestor dá pode_alternar_papel';
  end;

  -- ===== Visitante =====
  reset role;
  set local role anon;
  begin
    perform public.atualizar_meu_perfil('Anon');
    r := r || E'\nFALHOU - visitante chamou atualizar_meu_perfil';
  exception when insufficient_privilege then
    r := r || E'\nok - visitante não chama as funções';
  end;

  reset role;
  raise exception '%', r;
end $$;
