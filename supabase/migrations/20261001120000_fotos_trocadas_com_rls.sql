-- Toda tabela nasce com RLS (CLAUDE.md), inclusive no schema private: fotos_trocadas
-- só é lida e escrita pelas funções security definer (atualizar_minha_foto e
-- posso_apagar_foto_trocada). Sem política e sem grant: se um dia o schema for
-- exposto, ninguém anota foto alheia para apagar.
alter table private.fotos_trocadas enable row level security;
revoke all on private.fotos_trocadas from public, anon, authenticated;
