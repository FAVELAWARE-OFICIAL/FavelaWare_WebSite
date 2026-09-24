-- Complemento da 20261001118000: o Postgres só apaga a linha que a pessoa também
-- consegue ler (e a API do Storage lê antes de apagar). A foto que a pessoa trocou
-- fica visível só para ela, com a mesma regra de quem pode apagar.
create policy "cada um le a foto que trocou" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-alunos' and (select private.posso_apagar_foto_trocada(name)));
