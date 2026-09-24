-- Teste da justificativa e do atestado (migration 20260930100000_justificativas_e_atestados.sql).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/justificativas.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_prof uuid := gen_random_uuid();
  v_outro uuid := gen_random_uuid();
  v_gestor uuid := gen_random_uuid();
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_edicao bigint;
  v_turma bigint;
  v_aluno bigint;
  v_atestado_prof uuid;
  v_atestado_outro uuid;
  v_atestado_aluno uuid;
  v_txt text;
  v_id uuid;
  v_n bigint;
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_prof, 'just-prof@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_outro, 'just-outro@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_gestor, 'just-gestor@exemplo.invalid', 'authenticated', 'authenticated');
  update public.perfis set papel = 'professor' where id in (v_prof, v_outro);
  update public.perfis set papel = 'gestor' where id = v_gestor;

  insert into public.edicoes (nome, ordem, arquivo_origem) values ('Teste justificativa', 9101, 'teste') returning id into v_edicao;
  insert into public.turmas (edicao_id, nome) values (v_edicao, 'Turma 1') returning id into v_turma;
  insert into public.participantes (edicao_id, turma_id, funcao, nome)
  values (v_edicao, v_turma, 'aluno', 'Aluno justificativa') returning id into v_aluno;

  -- Atestados já guardados (a Edge Function grava com a chave de serviço)
  insert into public.atestados (professor_id, nome, mime, tamanho, drive_id)
  values (v_prof, 'atestado.pdf', 'application/pdf', 100, 'drive-prof') returning id into v_atestado_prof;
  insert into public.atestados (professor_id, nome, mime, tamanho, drive_id)
  values (v_outro, 'atestado.pdf', 'application/pdf', 100, 'drive-outro') returning id into v_atestado_outro;
  insert into public.atestados (participante_id, nome, mime, tamanho, drive_id)
  values (v_aluno, 'atestado.pdf', 'application/pdf', 100, 'drive-aluno') returning id into v_atestado_aluno;

  -- ===== Instrutor, no próprio ponto =====
  perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.registrar_ponto(v_hoje, 'justificada', null, 'Consulta médica', v_atestado_prof);
  select justificativa, atestado_id into v_txt, v_id from public.pontos_professores where professor_id = v_prof and data = v_hoje;
  r := r || E'\n' || case when v_txt = 'Consulta médica' and v_id = v_atestado_prof then 'ok' else 'FALHOU' end
    || ' - J grava justificativa e atestado do ponto';

  begin
    perform public.registrar_ponto(v_hoje, 'justificada', null, 'Outro', v_atestado_outro);
    r := r || E'\nFALHOU - ponto aceitou atestado de outro instrutor';
  exception when insufficient_privilege then
    r := r || E'\nok - ponto recusa atestado de outro instrutor';
  end;

  select count(*) into v_n from public.atestados;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - instrutor não lê a tabela de atestados';

  perform public.registrar_ponto(v_hoje, 'presente');
  select justificativa, atestado_id into v_txt, v_id from public.pontos_professores where professor_id = v_prof and data = v_hoje;
  r := r || E'\n' || case when v_txt is null and v_id is null then 'ok' else 'FALHOU' end
    || ' - trocar para P apaga justificativa e atestado';

  -- ===== Gestor, na chamada do aluno =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.registrar_chamada(v_turma, v_hoje, jsonb_build_array(jsonb_build_object(
    'participante_id', v_aluno, 'situacao', 'justificada', 'justificativa', 'Doente', 'atestado_id', v_atestado_aluno)));
  select p.justificativa, p.atestado_id into v_txt, v_id
  from public.presencas p join public.aulas a on a.id = p.aula_id
  where p.participante_id = v_aluno and a.data = v_hoje;
  r := r || E'\n' || case when v_txt = 'Doente' and v_id = v_atestado_aluno then 'ok' else 'FALHOU' end
    || ' - chamada grava justificativa e atestado do aluno';

  select count(*) into v_n from public.atestados where id = v_atestado_aluno;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - gestor lê o atestado';

  begin
    perform public.registrar_chamada(v_turma, v_hoje, jsonb_build_array(jsonb_build_object(
      'participante_id', v_aluno, 'situacao', 'justificada', 'justificativa', 'x', 'atestado_id', v_atestado_prof)));
    r := r || E'\nFALHOU - chamada aceitou atestado de outra pessoa';
  exception when insufficient_privilege then
    r := r || E'\nok - chamada recusa atestado de outra pessoa';
  end;

  perform public.registrar_chamada(v_turma, v_hoje, jsonb_build_array(jsonb_build_object(
    'participante_id', v_aluno, 'situacao', 'presente')));
  select p.justificativa into v_txt
  from public.presencas p join public.aulas a on a.id = p.aula_id
  where p.participante_id = v_aluno and a.data = v_hoje;
  r := r || E'\n' || case when v_txt is null then 'ok' else 'FALHOU' end || ' - chamada com P apaga a justificativa';

  raise exception '%', r;
end;
$$;
