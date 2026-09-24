-- Trilhas do curso na ordem do site oficial (favelaware.animahub.com.br/como-fazemos):
-- 1ª trilha (Cultura e Encantamento), 2ª (Desenvolvimento Web: HTML ao Banco de
-- Dados) e 3ª (Blip). As da Edição I que não estão no cronograma atual vão para o fim.
-- Pode rodar mais de uma vez: não duplica (nome é único) e só acerta a ordem.
-- Ordem de 10 em 10, para dar para encaixar uma trilha nova no meio sem renumerar.

insert into public.trilhas (nome, descricao, ordem) values
  ('HTML', 'Estrutura de páginas web: tags, semântica e formulários', 70),
  ('Chatbot e IA (Forge)', 'Introdução a chatbots e inteligência artificial', 80),
  ('CSS', 'Estilo e layout: cores, fontes, flexbox, grid e responsividade', 90),
  ('Lógica de Programação', 'Algoritmos, variáveis, condições e repetições', 100),
  ('JavaScript', 'A linguagem da web: tipos, funções, arrays e objetos', 110),
  ('JavaScript para Web', 'DOM e eventos: páginas que reagem ao usuário', 120),
  ('Trabalhando com APIs', 'HTTP, JSON e fetch: conversar com outros sistemas', 130),
  ('Banco de Dados', 'Guardar e consultar dados do projeto', 140),
  ('Blip', 'Chatbots na plataforma Blip', 150)
on conflict (nome) do nothing;

update public.trilhas t set ordem = o.ordem
from (values
  ('Materiais gerais', 10),
  ('Carreira Tech', 20),
  ('Inclusão: Mundo Digital', 30),
  ('Mídias Digitais', 40),
  ('Pensamento Lógico', 50),
  ('Git e GitHub', 60),
  ('HTML', 70),
  ('Chatbot e IA (Forge)', 80),
  ('CSS', 90),
  ('Lógica de Programação', 100),
  ('JavaScript', 110),
  ('JavaScript para Web', 120),
  ('Trabalhando com APIs', 130),
  ('Banco de Dados', 140),
  ('Blip', 150),
  ('Desenvolvimento de Projeto', 160),
  ('Low Code', 170),
  ('Lógica Básica', 180),
  ('App Inventor e Bubble.io', 190)
) as o(nome, ordem)
where t.nome = o.nome;
