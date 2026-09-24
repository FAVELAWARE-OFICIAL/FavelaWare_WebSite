-- Papel novo: banca (membro externo da banca avaliadora da apresentação final).
-- Sozinho num arquivo: o valor novo do enum só pode ser usado depois do commit.
-- A conta "banca" só enxerga a própria avaliação e, no fim, a lista completa
-- (20261001103000_banca_com_conta.sql).
alter type public.papel_usuario add value if not exists 'banca';
