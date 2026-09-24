-- Dados das listas de presença de cada edição do FavelaWare (vindas das planilhas).
-- Só gestor lê. Ninguém escreve pela API: a carga é feita pelo script
-- scripts/importar_planilhas.py, rodado com o CLI do Supabase.
--
--   edicoes ─┬─ turmas ─┬─ participantes (alunos) ── mudancas_horario
--            │          ├─ duplas
--            │          └─ conteudos_turma ── conteudos
--            ├─ participantes (professores, sem turma)
--            └─ aulas (de uma turma, ou da agenda dos professores) ── presencas

create table public.edicoes (
  id                     bigint generated always as identity primary key,
  nome                   text not null unique,
  ordem                  integer not null unique,
  arquivo_origem         text not null,
  -- Resumo que a própria planilha informa (só a de 2022 traz)
  total_alunos_informado integer check (total_alunos_informado >= 0),
  aprovados_informado    integer check (aprovados_informado >= 0),
  desistentes_informado  integer check (desistentes_informado >= 0),
  criado_em              timestamptz not null default now()
);

create table public.turmas (
  id        bigint generated always as identity primary key,
  edicao_id bigint not null references public.edicoes (id) on delete cascade,
  nome      text not null,
  unique (edicao_id, nome)
);

create table public.participantes (
  id         bigint generated always as identity primary key,
  edicao_id  bigint not null references public.edicoes (id) on delete cascade,
  turma_id   bigint references public.turmas (id) on delete cascade,
  funcao     text not null check (funcao in ('aluno', 'professor')),
  nome       text not null check (length(trim(nome)) > 0),
  login      text,
  observacao text,
  -- Aluno sempre pertence a uma turma; professor atende a edição inteira
  check (funcao = 'professor' or turma_id is not null)
);
create index participantes_edicao_id_idx on public.participantes (edicao_id);
create index participantes_turma_id_idx on public.participantes (turma_id);

-- Um dia de chamada. turma_id nulo = agenda dos professores da edição.
-- data pode faltar: a aba "Página8" de 2022 é uma chamada avulsa sem data.
create table public.aulas (
  id        bigint generated always as identity primary key,
  edicao_id bigint not null references public.edicoes (id) on delete cascade,
  turma_id  bigint references public.turmas (id) on delete cascade,
  data      date,
  ordem     integer not null,
  descricao text,
  unique nulls not distinct (edicao_id, turma_id, ordem)
);
create index aulas_turma_id_idx on public.aulas (turma_id);

-- Célula vazia na planilha = sem registro (a pessoa ainda não estava na turma).
--   presente    -> P
--   ausente     -> A, F
--   justificada -> Provas, Viajando, Luto, X (não entra no cálculo da frequência)
--   folga       -> FOLGA (só professor)
create table public.presencas (
  participante_id   bigint not null references public.participantes (id) on delete cascade,
  aula_id           bigint not null references public.aulas (id) on delete cascade,
  situacao          text not null check (situacao in ('presente', 'ausente', 'justificada', 'folga')),
  registro_original text not null,
  primary key (participante_id, aula_id)
);
create index presencas_aula_id_idx on public.presencas (aula_id);

-- Conteúdos do curso e o aproveitamento médio (aba "Gráficos" de 2022)
create table public.conteudos (
  id               bigint generated always as identity primary key,
  edicao_id        bigint not null references public.edicoes (id) on delete cascade,
  ordem            integer not null,
  nome             text not null,
  nome_ingles      text,
  dias             integer check (dias > 0),
  percentual_medio numeric(5, 4) check (percentual_medio between 0 and 1),
  unique (edicao_id, ordem)
);

-- Presenças e faltas somadas por conteúdo em cada turma (rodapé das abas de turma)
create table public.conteudos_turma (
  conteudo_id bigint not null references public.conteudos (id) on delete cascade,
  turma_id    bigint not null references public.turmas (id) on delete cascade,
  presencas   integer not null check (presencas >= 0),
  faltas      integer check (faltas >= 0),
  primary key (conteudo_id, turma_id)
);
create index conteudos_turma_turma_id_idx on public.conteudos_turma (turma_id);

-- Duplas de trabalho (texto como está na planilha: "Thiago e Ana Caroline")
create table public.duplas (
  id          bigint generated always as identity primary key,
  turma_id    bigint not null references public.turmas (id) on delete cascade,
  ordem       integer not null,
  integrantes text not null,
  emails      text,
  unique (turma_id, ordem)
);

-- Horário escolhido na mudança de horário (nulo = não marcou nenhum)
create table public.mudancas_horario (
  participante_id bigint primary key references public.participantes (id) on delete cascade,
  horario         text check (horario in ('08h-12h', '09h-13h', '13h-17h'))
);

-- Frequência por pessoa: presentes / (presentes + ausentes). Justificada e folga ficam fora.
create view public.frequencia_participantes
with (security_invoker = true) as
select
  p.id as participante_id,
  p.edicao_id,
  p.turma_id,
  p.funcao,
  p.nome,
  p.login,
  p.observacao,
  count(*) filter (where pr.situacao = 'presente')    as presentes,
  count(*) filter (where pr.situacao = 'ausente')     as ausentes,
  count(*) filter (where pr.situacao = 'justificada') as justificadas,
  count(*) filter (where pr.situacao = 'folga')       as folgas,
  round(
    count(*) filter (where pr.situacao = 'presente')::numeric
    / nullif(count(*) filter (where pr.situacao in ('presente', 'ausente')), 0),
    4
  ) as frequencia
from public.participantes p
left join public.presencas pr on pr.participante_id = p.id
group by p.id;

-- Presença por aula (para o gráfico ao longo do tempo)
create view public.presenca_por_aula
with (security_invoker = true) as
select
  a.id as aula_id,
  a.edicao_id,
  a.turma_id,
  a.data,
  a.ordem,
  a.descricao,
  count(*) filter (where pr.situacao = 'presente')    as presentes,
  count(*) filter (where pr.situacao = 'ausente')     as ausentes,
  count(*) filter (where pr.situacao = 'justificada') as justificadas,
  count(*) filter (where pr.situacao = 'folga')       as folgas
from public.aulas a
left join public.presencas pr on pr.aula_id = a.id
group by a.id;

-- Acesso: só gestor lê; ninguém escreve pela API
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'edicoes', 'turmas', 'participantes', 'aulas', 'presencas',
    'conteudos', 'conteudos_turma', 'duplas', 'mudancas_horario'
  ] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on table public.%I from anon, authenticated', tabela);
    execute format('grant select on table public.%I to authenticated', tabela);
    execute format(
      'create policy "gestor le" on public.%I for select to authenticated using ((select private.eh_gestor()))',
      tabela
    );
  end loop;
end $$;

revoke all on public.frequencia_participantes, public.presenca_por_aula from anon, authenticated;
grant select on public.frequencia_participantes, public.presenca_por_aula to authenticated;
