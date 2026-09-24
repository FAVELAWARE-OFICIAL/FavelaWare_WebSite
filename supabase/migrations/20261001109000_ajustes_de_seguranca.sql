-- Ajustes da auditoria de segurança
-- 1. E-mail de contato (Gmail) só com caracteres de e-mail (nada de < > " ?).
-- 2. Conta que virou aluno depois de entrar na banca não avalia mais.

alter table public.perfis drop constraint perfis_email_contato_check;
alter table public.perfis add constraint perfis_email_contato_check check (
  email_contato is null or (char_length(email_contato) <= 200
    and email_contato ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

create or replace function private.meu_membro_da_banca()
returns public.membros_banca
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_membro public.membros_banca;
begin
  -- Aberta antes de encerrada, real antes de demonstração, mais recente primeiro
  select m.* into v_membro
  from public.membros_banca m
  join public.edicoes e on e.id = m.edicao_id
  join public.perfis pf on pf.id = m.perfil_id
  where m.perfil_id = (select auth.uid()) and pf.papel <> 'aluno'
  order by e.encerrada, e.demonstracao, e.ordem desc
  limit 1;
  if v_membro.id is null then
    raise exception 'Você não está na banca avaliadora de nenhuma edição.' using errcode = '42501';
  end if;
  return v_membro;
end;
$$;
