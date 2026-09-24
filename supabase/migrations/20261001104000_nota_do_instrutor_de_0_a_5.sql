-- Nota do instrutor de 0 a 5 em cada critério (como a da banca); a soma vai de 0 a 15.
-- Ainda não há avaliação real gravada (a funcionalidade é nova), então só troca a regra.
alter table public.avaliacoes_instrutor
  drop constraint avaliacoes_instrutor_participacao_check,
  drop constraint avaliacoes_instrutor_entrega_check,
  drop constraint avaliacoes_instrutor_comportamento_check;
alter table public.avaliacoes_instrutor
  add constraint avaliacoes_instrutor_participacao_check check (participacao between 0 and 5),
  add constraint avaliacoes_instrutor_entrega_check check (entrega between 0 and 5),
  add constraint avaliacoes_instrutor_comportamento_check check (comportamento between 0 and 5);

comment on function public.resultado_das_avaliacoes(bigint) is
  'Gestor: média das somas dos instrutores (0 a 15) + soma das notas de todos os membros da banca.';
