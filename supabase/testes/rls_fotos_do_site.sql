-- Teste da função pública fotos_das_turmas (fotos do dashboard no site).
-- Termina com um erro proposital que carrega o relatório e desfaz tudo.
--
--   npx supabase db query --linked -f supabase/testes/rls_fotos_do_site.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_turma bigint;
  v_edicao bigint;
  v_demo_turma bigint;
  v_demo_edicao bigint;
  v_aluno bigint;
  v_prof bigint;
  v_demo bigint;
  v_fora bigint;
  v_n bigint;
  v_txt text;
  r text := 'RELATORIO';
begin
  select t.id, t.edicao_id into v_turma, v_edicao
    from public.turmas t join public.edicoes e on e.id = t.edicao_id where e.no_site and not e.demonstracao limit 1;
  select t.id, t.edicao_id into v_demo_turma, v_demo_edicao
    from public.turmas t join public.edicoes e on e.id = t.edicao_id where e.demonstracao limit 1;
  insert into public.participantes (edicao_id, turma_id, funcao, nome, foto)
    values (v_edicao, v_turma, 'aluno', 'Aluno Foto Teste', '/imgs/teste-aluno.webp') returning id into v_aluno;
  update public.participantes set no_site = true where id = v_aluno;
  insert into public.participantes (edicao_id, turma_id, funcao, nome, foto)
    values (v_edicao, v_turma, 'aluno', 'Aluno Fora do Site', '/imgs/teste-fora.webp') returning id into v_fora;
  insert into public.participantes (edicao_id, turma_id, funcao, nome, foto)
    values (v_edicao, null, 'professor', 'Instrutor Foto Teste', '/imgs/teste-prof.webp') returning id into v_prof;
  update public.participantes set no_site = true where id = v_prof;
  if v_demo_turma is not null then
    insert into public.participantes (edicao_id, turma_id, funcao, nome, foto)
      values (v_demo_edicao, v_demo_turma, 'aluno', 'Demo Foto Teste', '/imgs/teste-demo.webp') returning id into v_demo;
    update public.participantes set no_site = true where id = v_demo;
  end if;

  -- ===== Visitante do site (anônimo) =====
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;

  select foto into v_txt from public.fotos_das_turmas() where id = v_aluno;
  r := r || E'\n' || case when v_txt = '/imgs/teste-aluno.webp' then 'ok' else 'FALHOU' end || ' - anônimo vê a foto do aluno';

  select count(*) into v_n from public.fotos_das_turmas() where id = v_prof;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - foto de quem não é aluno fica de fora';

  select count(*) into v_n from public.fotos_das_turmas() where id = v_demo;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - edição de demonstração fica de fora';

  -- Edição que ainda não está no site: a foto não sai
  reset role;
  update public.edicoes set no_site = false where id = v_edicao;
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;
  select count(*) into v_n from public.fotos_das_turmas() where id = v_aluno;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - edição fora do site não publica foto';
  reset role;
  update public.edicoes set no_site = true where id = v_edicao;
  set local role anon;

  select count(*) into v_n from public.fotos_das_turmas() where id = v_fora;
  r := r || E'
' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - aluno que não está no site fica de fora';

  -- Foto apagada no dashboard: continua na lista, sem foto (o site tira a foto)
  reset role;
  update public.participantes set foto = null where id = v_aluno;
  set local role anon;
  select count(*) into v_n from public.fotos_das_turmas() where id = v_aluno and foto is null;
  r := r || E'
' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - foto apagada chega como sem foto';

  begin
    select count(*) into v_n from public.participantes;
    r := r || E'\n' || 'FALHOU - anônimo lê a tabela de participantes';
  exception when insufficient_privilege then
    r := r || E'\n' || 'ok - anônimo continua sem ler participantes (nome, login...)';
  end;

  reset role;
  raise exception '%', r;
end $$;
