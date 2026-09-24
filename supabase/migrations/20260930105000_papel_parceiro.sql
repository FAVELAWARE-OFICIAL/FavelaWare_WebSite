-- Papel novo: parceiro (empresas e instituições que acompanham o curso).
-- Sozinho num arquivo: o valor novo do enum só pode ser usado depois do commit.
-- As permissões do parceiro estão em 20260930106000_parceiro_somente_leitura.sql.
alter type public.papel_usuario add value if not exists 'parceiro';
