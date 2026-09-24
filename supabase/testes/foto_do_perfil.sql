-- Teste da foto trocada pela própria pessoa em "Meu perfil" (migration 20261001116000).
-- Roda numa transação e termina com um erro proposital que carrega o relatório:
-- o erro desfaz tudo, então nada fica gravado.
--
--   npx supabase db query --linked -f supabase/testes/foto_do_perfil.sql
--
-- Esperado: a mensagem começa com "RELATORIO" e todas as linhas dizem "ok".
do $$
declare
  v_prof uuid := gen_random_uuid();
  v_aluno uuid := gen_random_uuid();
  v_lider uuid := gen_random_uuid();
  v_turma bigint;
  v_edicao bigint;
  v_part bigint;
  v_part_lider bigint;
  v_n bigint;
  v_txt text;
  v_base text := 'https://teste.supabase.co/storage/v1/object/public/fotos-alunos/';
  v_foto_prof text := 'perfis/11111111-1111-4111-8111-111111111111.webp';
  v_foto_aluno text := 'perfis/22222222-2222-4222-8222-222222222222.webp';
  v_foto_lider text := 'perfis/33333333-3333-4333-8333-333333333333.webp';
  r text := 'RELATORIO';
begin
  -- ===== Montagem (sem login) =====
  insert into auth.users (id, email, aud, role) values
    (v_prof, 'foto-prof@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_aluno, 'foto-aluno@exemplo.invalid', 'authenticated', 'authenticated'),
    (v_lider, 'foto-lider@exemplo.invalid', 'authenticated', 'authenticated');
  select id, edicao_id into v_turma, v_edicao from public.turmas limit 1;
  insert into public.participantes (edicao_id, turma_id, funcao, nome, foto)
  values (v_edicao, v_turma, 'aluno', 'Aluno Foto Teste', 'https://antiga.invalid/a.webp') returning id into v_part;
  insert into public.participantes (edicao_id, turma_id, funcao, nome)
  values (v_edicao, v_turma, 'aluno', 'Aluno Demo Foto') returning id into v_part_lider;
  update public.perfis set papel = 'professor' where id = v_prof;
  update public.perfis set papel = 'aluno', participante_id = v_part where id = v_aluno;
  update public.perfis set papel = 'aluno', participante_id = v_part_lider, pode_alternar_papel = true where id = v_lider;
  insert into storage.objects (bucket_id, name, owner_id) values
    ('fotos-alunos', v_foto_prof, v_prof::text),
    ('fotos-alunos', v_foto_aluno, v_aluno::text),
    ('fotos-alunos', v_foto_lider, v_lider::text);

  -- ===== Instrutor =====
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_prof, 'role', 'authenticated', 'iss', 'https://teste.supabase.co/auth/v1')::text, true);
  set local role authenticated;
  perform public.atualizar_minha_foto(v_base || v_foto_prof);
  select foto into v_txt from public.perfis where id = v_prof;
  r := r || E'\n' || case when v_txt = v_base || v_foto_prof then 'ok' else 'FALHOU' end || ' - instrutor troca a própria foto';

  begin
    perform public.atualizar_minha_foto(v_base || v_foto_aluno);
    r := r || E'\nFALHOU - usou a foto enviada por outra pessoa';
  exception when sqlstate '22023' then r := r || E'\nok - foto enviada por outra pessoa é recusada';
  end;
  begin
    perform public.atualizar_minha_foto(v_base || 'perfis/44444444-4444-4444-8444-444444444444.webp');
    r := r || E'\nFALHOU - aceitou foto que não existe';
  exception when sqlstate '22023' then r := r || E'\nok - foto que não existe é recusada';
  end;
  begin
    perform public.atualizar_minha_foto('https://outro.site/storage/v1/object/public/fotos-alunos/' || v_foto_prof);
    r := r || E'\nFALHOU - aceitou foto de outro endereço';
  exception when sqlstate '22023' then r := r || E'\nok - foto de outro endereço é recusada';
  end;
  begin
    perform public.atualizar_minha_foto(v_base || 'perfis/../equipe/11111111-1111-4111-8111-111111111111.webp');
    r := r || E'\nFALHOU - aceitou caminho com ..';
  exception when sqlstate '22023' then r := r || E'\nok - caminho com .. é recusado';
  end;
  begin
    perform public.atualizar_minha_foto(v_base || 'perfis/11111111-1111-4111-8111-111111111111.png');
    r := r || E'\nFALHOU - aceitou outra extensão';
  exception when sqlstate '22023' then r := r || E'\nok - só foto .webp da pasta perfis';
  end;

  update public.perfis set foto = 'https://qualquer.invalid/x.webp' where id = v_prof;
  get diagnostics v_n = row_count;
  r := r || E'\n' || case when v_n = 0 then 'ok' else 'FALHOU' end || ' - sem ser gestor, não grava a foto direto na tabela';

  begin
    insert into storage.objects (bucket_id, name, owner_id) values ('fotos-alunos', 'equipe/x.webp', v_prof::text);
    r := r || E'\nFALHOU - instrutor enviou foto fora da pasta perfis';
  exception when insufficient_privilege then r := r || E'\nok - quem não é gestor só envia para a pasta perfis';
  end;
  reset role;

  -- ===== Aluno: grava na ficha da turma =====
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_aluno, 'role', 'authenticated', 'iss', 'https://teste.supabase.co/auth/v1')::text, true);
  set local role authenticated;
  perform public.atualizar_minha_foto(v_base || v_foto_aluno);
  reset role;
  select foto into v_txt from public.participantes where id = v_part;
  r := r || E'\n' || case when v_txt = v_base || v_foto_aluno then 'ok' else 'FALHOU' end || ' - aluno troca a foto da ficha (a do site)';
  select count(*) into v_n from public.perfis where id = v_aluno and foto is null;
  r := r || E'\n' || case when v_n = 1 then 'ok' else 'FALHOU' end || ' - foto do aluno não vai para o perfil';

  -- ===== Líder discente vendo como aluno: grava no próprio perfil =====
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lider, 'role', 'authenticated', 'iss', 'https://teste.supabase.co/auth/v1')::text, true);
  set local role authenticated;
  perform public.atualizar_minha_foto(v_base || v_foto_lider);
  reset role;
  select count(*) into v_n from public.perfis where id = v_lider and foto = v_base || v_foto_lider;
  select count(*) + v_n * 10 into v_n from public.participantes where id = v_part_lider and foto is null;
  r := r || E'\n' || case when v_n = 11 then 'ok' else 'FALHOU' end || ' - líder vendo como aluno não mexe na ficha de demonstração';

  -- ===== Visitante =====
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin
    perform public.atualizar_minha_foto(v_base || v_foto_prof);
    r := r || E'\nFALHOU - visitante chamou atualizar_minha_foto';
  exception when insufficient_privilege then r := r || E'\nok - visitante não troca foto';
  end;
  reset role;

  raise exception '%', r;
end;
$$;
