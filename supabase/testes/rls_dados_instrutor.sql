-- Teste das regras dos dados do instrutor (RPA).
-- Termina com um erro proposital que carrega o relatório e desfaz tudo.
--
--   npx supabase db query --linked -f supabase/testes/rls_dados_instrutor.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
-- CPF e PIS abaixo são números de exemplo (dígitos válidos), não de ninguém.
do $$
declare
  v_prof uuid := gen_random_uuid();
  v_prof2 uuid := gen_random_uuid();
  v_gestor uuid := gen_random_uuid();
  v_aluno uuid := gen_random_uuid();
  v_n bigint;
  v_txt text;
  r text := 'RELATORIO';
begin
  insert into auth.users (id, email, aud, role) values
    (v_prof, 'rpa-prof@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_prof2, 'rpa-prof2@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_gestor, 'rpa-gestor@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_aluno, 'rpa-aluno@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'professor' where id in (v_prof, v_prof2);
  update public.perfis set papel = 'gestor' where id = v_gestor;
  update public.perfis set papel = 'aluno' where id = v_aluno;

  r := r || E'\n' || case when private.cpf_valido('52998224725') and not private.cpf_valido('52998224726')
    and not private.cpf_valido('11111111111') then 'ok' else 'FALHOU' end || ' - dígitos do CPF';
  r := r || E'\n' || case when private.pis_valido('12345678900') and not private.pis_valido('12345678901')
    then 'ok' else 'FALHOU' end || ' - dígitos do PIS';

  -- ===== Instrutor =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.dados_instrutores (perfil_id, nome_completo, cpf, identidade, pis, data_nascimento, telefone, email,
    cep, logradouro, numero, complemento, bairro, cidade, uf, estado_civil, cor_raca, grau_instrucao)
  values (v_prof, '  Maria   de  Souza ', '52998224725', 'MG-00.000.000', '12345678900', date '1990-05-10', '31999990000',
    ' Maria@Exemplo.COM ', '30000000', 'Rua Exemplo', '10', '  ', 'Centro', 'Belo Horizonte', 'mg', 'solteiro', 'parda', 'superior_cursando');
  select nome_completo || '|' || email || '|' || uf || '|' || coalesce(complemento, '-') into v_txt
    from public.dados_instrutores where perfil_id = v_prof;
  r := r || E'\n' || case when v_txt = 'Maria de Souza|maria@exemplo.com|MG|-' then 'ok' else 'FALHOU ' || coalesce(v_txt, 'null') end
    || ' - instrutor grava os próprios dados (normalizados)';

  begin
    insert into public.dados_instrutores (perfil_id, nome_completo, cpf, identidade, pis, data_nascimento, telefone, email,
      cep, logradouro, numero, bairro, cidade, uf, estado_civil, cor_raca, grau_instrucao)
    values (v_prof2, 'Outro Nome', '52998224725', 'MG-1', '12345678900', date '1990-05-10', '31999990000',
      'a@b.com', '30000000', 'Rua', '1', 'Centro', 'BH', 'MG', 'solteiro', 'parda', 'medio_completo');
    r := r || E'\n' || 'FALHOU - instrutor grava dados de outro';
  exception when insufficient_privilege then
    r := r || E'\n' || 'ok - instrutor não grava dados de outro';
  end;

  begin
    update public.dados_instrutores set cpf = '52998224726' where perfil_id = v_prof;
    r := r || E'\n' || 'FALHOU - CPF com dígito errado aceito';
  exception when check_violation then
    r := r || E'\n' || 'ok - CPF com dígito errado recusado';
  end;

  begin
    update public.dados_instrutores set pis = '12345678901' where perfil_id = v_prof;
    r := r || E'\n' || 'FALHOU - PIS com dígito errado aceito';
  exception when check_violation then
    r := r || E'\n' || 'ok - PIS com dígito errado recusado';
  end;

  begin
    update public.dados_instrutores set data_nascimento = current_date where perfil_id = v_prof;
    r := r || E'\n' || 'FALHOU - nascimento de hoje aceito';
  exception when check_violation then
    r := r || E'\n' || 'ok - nascimento impossível recusado';
  end;

  begin
    update public.dados_instrutores set cor_raca = 'outra' where perfil_id = v_prof;
    r := r || E'\n' || 'FALHOU - cor/raça fora da lista aceita';
  exception when check_violation then
    r := r || E'\n' || 'ok - cor/raça fora da lista recusada';
  end;

  -- O caminho que o app usa: upsert (insert ... on conflict do update)
  insert into public.dados_instrutores (perfil_id, nome_completo, cpf, identidade, pis, data_nascimento, telefone, email,
    cep, logradouro, numero, bairro, cidade, uf, estado_civil, cor_raca, grau_instrucao)
  values (v_prof, 'Maria de Souza', '52998224725', 'MG-00.000.000', '12345678900', date '1990-05-10', '31999990000',
    'maria@exemplo.com', '30000000', 'Rua Exemplo', '20', 'Centro', 'Belo Horizonte', 'MG', 'casado', 'parda', 'superior_completo')
  on conflict (perfil_id) do update set numero = excluded.numero, estado_civil = excluded.estado_civil, grau_instrucao = excluded.grau_instrucao;
  select numero || '|' || estado_civil into v_txt from public.dados_instrutores where perfil_id = v_prof;
  r := r || E'\n' || case when v_txt = '20|casado' then 'ok' else 'FALHOU ' || coalesce(v_txt, 'null') end || ' - instrutor atualiza pelo upsert';

  update public.dados_instrutores set linkedin = 'https://www.linkedin.com/in/maria-souza/' where perfil_id = v_prof;
  r := r || E'\n' || 'ok - LinkedIn de perfil aceito';
  begin
    update public.dados_instrutores set linkedin = 'javascript:alert(1)//linkedin.com/in/x' where perfil_id = v_prof;
    r := r || E'\n' || 'FALHOU - LinkedIn fora do padrão aceito';
  exception when check_violation then
    r := r || E'\n' || 'ok - LinkedIn fora do padrão recusado';
  end;
  begin
    update public.dados_instrutores set linkedin = 'https://evil.com/?linkedin.com/in/x' where perfil_id = v_prof;
    r := r || E'\n' || 'FALHOU - outro site aceito como LinkedIn';
  exception when check_violation then
    r := r || E'\n' || 'ok - outro site recusado como LinkedIn';
  end;

  update public.dados_instrutores set perfil_id = v_prof2, cidade = 'Contagem' where perfil_id = v_prof;
  select count(*) into v_n from public.dados_instrutores where perfil_id = v_prof and cidade = 'Contagem';
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - dono da linha não muda no update';

  begin
    delete from public.dados_instrutores where perfil_id = v_prof;
    r := r || E'\n' || 'FALHOU - instrutor apaga';
  exception when insufficient_privilege then
    r := r || E'\n' || 'ok - instrutor não apaga';
  end;

  -- ===== Outro instrutor =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.dados_instrutores where perfil_id = v_prof;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - outro instrutor não lê';
  update public.dados_instrutores set cidade = 'X' where perfil_id = v_prof;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - outro instrutor não altera';

  -- ===== Aluno =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_aluno, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.dados_instrutores;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno não lê';
  begin
    insert into public.dados_instrutores (perfil_id, nome_completo, cpf, identidade, pis, data_nascimento, telefone, email,
      cep, logradouro, numero, bairro, cidade, uf, estado_civil, cor_raca, grau_instrucao)
    values (v_aluno, 'Aluno Nome', '52998224725', 'MG-1', '12345678900', date '1990-05-10', '31999990000',
      'a@b.com', '30000000', 'Rua', '1', 'Centro', 'BH', 'MG', 'solteiro', 'parda', 'medio_completo');
    r := r || E'\n' || 'FALHOU - aluno grava dados de RPA';
  exception when insufficient_privilege then
    r := r || E'\n' || 'ok - aluno não grava dados de RPA';
  end;

  -- ===== Gestor =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.dados_instrutores where perfil_id = v_prof;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - gestor lê';
  update public.dados_instrutores set cidade = 'Y' where perfil_id = v_prof;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - gestor não altera';
  begin
    insert into public.dados_instrutores (perfil_id, nome_completo, cpf, identidade, pis, data_nascimento, telefone, email,
      cep, logradouro, numero, bairro, cidade, uf, estado_civil, cor_raca, grau_instrucao)
    values (v_gestor, 'Gestor Nome', '52998224725', 'MG-1', '12345678900', date '1990-05-10', '31999990000',
      'a@b.com', '30000000', 'Rua', '1', 'Centro', 'BH', 'MG', 'solteiro', 'parda', 'medio_completo');
    r := r || E'\n' || 'FALHOU - gestor grava a própria linha';
  exception when insufficient_privilege then
    r := r || E'\n' || 'ok - gestor não grava';
  end;

  -- ===== Anônimo =====
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;
  begin
    select count(*) into v_n from public.dados_instrutores;
    r := r || E'\n' || 'FALHOU - anônimo consulta a tabela';
  exception when insufficient_privilege then
    r := r || E'\n' || 'ok - anônimo sem acesso';
  end;

  -- ===== Removido da equipe: lê, mas não altera =====
  reset role;
  update public.perfis set papel = 'aluno' where id = v_prof;
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.dados_instrutores set cidade = 'Z' where perfil_id = v_prof;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - ex-instrutor não altera';

  reset role;
  raise exception '%', r;
end $$;
