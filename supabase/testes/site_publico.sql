-- Teste das turmas do site público (turmas_do_site, migration 20260930110000).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/site_publico.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_edicao bigint;
  v_turma bigint;
  v_n bigint;
  v_txt text;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login): edição nova, fora do arquivo do site =====
  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste site (2030)', 9801, 'teste') returning id into v_edicao;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 1') returning id into v_turma;
  insert into public.participantes (edicao_id, turma_id, funcao, nome)
  values (v_edicao, v_turma, 'aluno', '  Maria Eduarda Souza Lima '), (v_edicao, v_turma, 'aluno', 'Joana'),
         (v_edicao, v_turma, 'professor', 'Instrutor Escondido');

  -- ===== Visitante do site (anônimo) =====
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;

  select string_agg(aluno_nome, '|' order by aluno_nome) into v_txt from public.turmas_do_site() where turma_id = v_turma;
  r := r || E'\n' || case when v_txt = 'Joana|Maria Lima' then 'ok' else 'FALHOU (' || coalesce(v_txt, 'nada') || ')' end
    || ' - só o nome curto dos alunos (primeiro e último), sem a equipe';

  select count(*) into v_n from public.turmas_do_site() where edicao_ordem = 9801;
  r := r || E'\n' || case when v_n = 2 then 'ok' else 'FALHOU' end || ' - uma linha por aluno da edição nova';
  reset role;

  raise exception '%', r;
end;
$$;
