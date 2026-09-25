-- Colaborador (equipe interna: design, desenvolvimento) entra na equipe da edição,
-- na página Sobre e, quando a edição encerra, no Hall da Fama. Mesma regra de
-- gestor, parceiro e líder: só aparece com cargo (o gestor define na tela Equipe).
create or replace function private.equipe_da_edicao(p_edicao bigint)
returns table (perfil_id uuid, nome text, foto text, cargo text, organizacao text, linkedin text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (p.id)
    p.id,
    private.nome_curto(coalesce(nullif(trim(p.nome), ''), 'Instrutor')),
    p.foto,
    coalesce(p.cargo, 'Instrutor(a)'),
    p.organizacao,
    coalesce(p.linkedin, di.linkedin)
  from public.perfis p
  left join public.dados_instrutores di on di.perfil_id = p.id
  where (
      p.papel = 'professor' and not p.pode_alternar_papel
      and exists (
        select 1
        from public.professores_turmas pt
        join public.turmas t on t.id = pt.turma_id
        where pt.professor_id = p.id and t.edicao_id = p_edicao
      )
    )
    or ((p.papel in ('gestor', 'parceiro', 'colaborador') or p.pode_alternar_papel) and p.cargo is not null)
  order by p.id;
$$;
