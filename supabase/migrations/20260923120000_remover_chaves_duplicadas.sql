-- participantes e aulas ficaram com DUAS chaves estrangeiras para turmas: a
-- antiga (turma_id) e a nova (turma_id, edicao_id), que já garante a mesma coisa
-- e ainda exige a mesma edição. Com duas, a API não sabe qual relação usar ao
-- juntar as tabelas (erro PGRST201). Fica só a nova; os índices em turma_id continuam.
alter table public.participantes drop constraint participantes_turma_id_fkey;
alter table public.aulas drop constraint aulas_turma_id_fkey;
