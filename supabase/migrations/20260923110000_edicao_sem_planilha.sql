-- Edição criada pelo site (4ª em diante) não vem de planilha: arquivo_origem fica
-- vazio. Só as três primeiras, importadas das listas de presença, têm o arquivo.
alter table public.edicoes alter column arquivo_origem drop not null;
