-- Vínculo (organização: Mundiale, AOPA, Ânima ou outra) e cargo de quem é da
-- equipe, para o cartão da página Sobre e do Hall da Fama. Quem preenche é o
-- gestor (no convite e na página Membros): a política "gestor altera perfis"
-- já limita a gravação a ele. Sai no site público, então só texto curto.
alter table public.perfis
  add column organizacao text
    check (organizacao is null or (char_length(organizacao) between 1 and 60 and organizacao !~ '[[:cntrl:]<>]')),
  add column cargo text
    check (cargo is null or (char_length(cargo) between 1 and 60 and cargo !~ '[[:cntrl:]<>]'));

grant update (organizacao, cargo) on public.perfis to authenticated;
