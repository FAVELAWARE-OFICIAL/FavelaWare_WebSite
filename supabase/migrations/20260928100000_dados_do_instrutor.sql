-- ============================================
-- Dados do instrutor para o RPA (recibo de pagamento de autônomo)
-- ============================================
-- Logo depois do login, o instrutor precisa informar os dados do documento
-- "DADOS PARA RPA": nome completo, CPF, identidade, INSS/PIS, endereço, data de
-- nascimento, telefone, e-mail, estado civil, cor/raça e grau de instrução.
--
-- São dados pessoais (e cor/raça é dado sensível pela LGPD): só o próprio
-- instrutor e o gestor leem. Ninguém apaga pela API; a linha some junto com o
-- perfil (on delete cascade).

-- ---------- Validações (dígitos verificadores) ----------
create function private.cpf_valido(p_cpf text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_soma int;
  v_dv int;
begin
  if p_cpf is null or p_cpf !~ '^\d{11}$' or p_cpf ~ '^(\d)\1{10}$' then
    return false;
  end if;
  -- 1º dígito: pesos 10..2 nos 9 primeiros
  v_soma := 0;
  for i in 1..9 loop
    v_soma := v_soma + substr(p_cpf, i, 1)::int * (11 - i);
  end loop;
  v_dv := (v_soma * 10) % 11 % 10;
  if v_dv <> substr(p_cpf, 10, 1)::int then return false; end if;
  -- 2º dígito: pesos 11..2 nos 10 primeiros
  v_soma := 0;
  for i in 1..10 loop
    v_soma := v_soma + substr(p_cpf, i, 1)::int * (12 - i);
  end loop;
  v_dv := (v_soma * 10) % 11 % 10;
  return v_dv = substr(p_cpf, 11, 1)::int;
end;
$$;

-- PIS/PASEP/NIT: pesos 3,2,9,8,7,6,5,4,3,2; resto 0 ou 1 dá dígito 0
create function private.pis_valido(p_pis text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_pesos int[] := array[3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  v_soma int := 0;
  v_dv int;
begin
  if p_pis is null or p_pis !~ '^\d{11}$' or p_pis ~ '^(\d)\1{10}$' then
    return false;
  end if;
  for i in 1..10 loop
    v_soma := v_soma + substr(p_pis, i, 1)::int * v_pesos[i];
  end loop;
  v_dv := 11 - (v_soma % 11);
  if v_dv >= 10 then v_dv := 0; end if;
  return v_dv = substr(p_pis, 11, 1)::int;
end;
$$;

revoke execute on function private.cpf_valido(text), private.pis_valido(text) from public, anon;
grant execute on function private.cpf_valido(text), private.pis_valido(text) to authenticated;

-- ---------- Tabela ----------
create table public.dados_instrutores (
  perfil_id        uuid primary key references public.perfis (id) on delete cascade,
  nome_completo    text not null check (char_length(nome_completo) between 3 and 150),
  cpf              text not null check (private.cpf_valido(cpf)),
  identidade       text not null check (char_length(identidade) between 3 and 30),
  pis              text not null check (private.pis_valido(pis)),
  data_nascimento  date not null,
  telefone         text not null check (telefone ~ '^\d{10,11}$'),
  email            text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  cep              text not null check (cep ~ '^\d{8}$'),
  logradouro       text not null check (char_length(logradouro) between 2 and 150),
  numero           text not null check (char_length(numero) between 1 and 20),
  complemento      text check (complemento is null or char_length(complemento) <= 80),
  bairro           text not null check (char_length(bairro) between 2 and 80),
  cidade           text not null check (char_length(cidade) between 2 and 80),
  uf               text not null check (uf in (
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
    'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  estado_civil     text not null check (estado_civil in (
    'solteiro','casado','uniao_estavel','separado','divorciado','viuvo')),
  cor_raca         text not null check (cor_raca in (
    'branca','preta','parda','amarela','indigena','nao_declarada')),
  grau_instrucao   text not null check (grau_instrucao in (
    'fundamental_incompleto','fundamental_completo','medio_incompleto','medio_completo',
    'tecnico','superior_cursando','superior_incompleto','superior_completo',
    'pos_graduacao','mestrado','doutorado')),
  atualizado_em    timestamptz not null default now()
);

comment on table public.dados_instrutores is
  'Dados do instrutor para o RPA. Dado pessoal (cor/raça é sensível): só o dono e o gestor leem.';

-- Limpa espaços, põe o e-mail em minúsculas, confere a data e carimba a hora.
-- O dono da linha não muda depois de criada.
create function private.dados_instrutores_arrumar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.perfil_id := old.perfil_id;
  end if;
  new.nome_completo := btrim(regexp_replace(new.nome_completo, '\s+', ' ', 'g'));
  new.identidade    := btrim(new.identidade);
  new.email         := lower(btrim(new.email));
  new.logradouro    := btrim(new.logradouro);
  new.numero        := btrim(new.numero);
  new.complemento   := nullif(btrim(new.complemento), '');
  new.bairro        := btrim(new.bairro);
  new.cidade        := btrim(new.cidade);
  new.uf            := upper(btrim(new.uf));
  if new.data_nascimento < date '1900-01-01' or new.data_nascimento > current_date - interval '14 years' then
    raise exception 'Data de nascimento inválida' using errcode = '23514';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger dados_instrutores_arrumar
  before insert or update on public.dados_instrutores
  for each row execute function private.dados_instrutores_arrumar();

-- ---------- Regras de acesso ----------
alter table public.dados_instrutores enable row level security;
revoke all on public.dados_instrutores from anon, authenticated;
grant select, insert, update on public.dados_instrutores to authenticated;

-- Quem é instrutor preenche e atualiza os próprios dados
create function private.eh_instrutor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'professor');
$$;
revoke execute on function private.eh_instrutor() from public, anon;
grant execute on function private.eh_instrutor() to authenticated;

create policy "dono ou gestor le" on public.dados_instrutores for select to authenticated
  using (perfil_id = (select auth.uid()) or (select private.eh_gestor()));

create policy "instrutor cria os proprios" on public.dados_instrutores for insert to authenticated
  with check (perfil_id = (select auth.uid()) and (select private.eh_instrutor()));

create policy "instrutor atualiza os proprios" on public.dados_instrutores for update to authenticated
  using (perfil_id = (select auth.uid()) and (select private.eh_instrutor()))
  with check (perfil_id = (select auth.uid()) and (select private.eh_instrutor()));
