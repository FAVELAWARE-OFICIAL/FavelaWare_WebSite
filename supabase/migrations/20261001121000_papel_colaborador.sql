-- Papel novo: colaborador (equipe interna do projeto: design, desenvolvimento).
-- Sozinho num arquivo: o valor novo do enum só pode ser usado depois do commit.
-- As permissões do colaborador estão em 20261001122000_colaborador_permissoes.sql.
alter type public.papel_usuario add value if not exists 'colaborador';
