/**
 * ============================================
 * EQUIPE · TRILHAS (professor e gestor)
 * ============================================
 *
 * Espelho da página do aluno: cada trilha é um cartão com as abas Materiais e
 * Atividades, mas aqui com os botões de gestão.
 * - Materiais: adicionar, editar e apagar links (valem para todas as turmas).
 * - Atividades (da turma escolhida no topo): publicar, editar (inclusive o prazo),
 *   apagar (só sem entregas) e ver as entregas para corrigir com feedback e nota.
 * - A trilha em si: nova, editar e apagar (trilha com atividades não é apagada).
 *
 * A mesma página aparece em /professor/trilhas e /dashboard/trilhas. O professor
 * vê as turmas dele; o gestor, todas. As regras ficam no banco (RLS).
 */
import { useCallback, useEffect, useState } from 'react';

import AbasDoCartao from '../../components/admin/AbasDoCartao';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import { IconeLinkExterno } from '../../components/admin/Icones';
import Janela from '../../components/admin/Janela';
import { Carregando, gravarPreferencia, lerPreferencia } from '../../components/admin/Moldura';
import { Aviso, Botao, Cartao, Vazio, classeCampo, classeRotulo, type Mensagem } from '../../components/admin/Ui';
import { espaco, foco, selo, superficie, texto } from '../../components/admin/designSystem';
import { Corrigir, FormularioDeAtividade } from '../../components/atividades/FormulariosDaEquipe';
import {
  apagarAtividade,
  carregarAtividadesDaTurma,
  resumoDasRegras,
  chaveAtividadesDaTurma,
  formatarDataHora,
  situacaoDoAluno,
  tentativasDe,
  type AlunoDaTurma,
  type Atividade,
  type AtividadesDaTurma,
  type Situacao,
} from '../../lib/atividades';
import { useDadosEmCache } from '../../lib/cache';
import { carregarMinhasTurmas } from '../../lib/chamada';
import {
  apagarMaterial,
  apagarTrilha,
  carregarTrilhas,
  CHAVE_MATERIAL,
  dominioDoLink,
  salvarMaterial,
  salvarTrilha,
  type MaterialDaTrilha,
  type Trilha,
} from '../../lib/material';

const PREFERENCIA_TURMA = 'professor:turma';

const SITUACAO_NA_EQUIPE: Record<Situacao, { rotulo: string; cor: string }> = {
  pendente: { rotulo: 'Sem entrega', cor: selo.neutro },
  encerrada: { rotulo: 'Não entregou', cor: selo.erro },
  aguardando: { rotulo: 'Aguardando', cor: selo.informacao },
  refazer: { rotulo: 'Refazendo', cor: selo.atencao },
  concluida: { rotulo: 'Concluída', cor: selo.sucesso },
};

type Aba = 'materiais' | 'atividades';

type JanelaAberta =
  | { tipo: 'trilha'; trilha?: Trilha }
  | { tipo: 'material'; trilhaId: number; material?: MaterialDaTrilha }
  | { tipo: 'atividade'; trilhaId: number; atividade: Atividade | null }
  | { tipo: 'entregas'; atividadeId: number }
  | { tipo: 'corrigir'; atividadeId: number; aluno: AlunoDaTurma };

const SEM_TURMA: AtividadesDaTurma = { alunos: [], atividades: [] };

/** Situação da aba Atividades (turmas e atividades carregam à parte dos materiais) */
type EstadoAtividades = 'carregando' | 'pronto' | 'erro' | 'erro-turmas' | 'sem-turma';

const TrilhasEquipe: React.FC = () => {
  const trilhas = useDadosEmCache(CHAVE_MATERIAL, carregarTrilhas);
  const turmas = useDadosEmCache('minhas-turmas', carregarMinhasTurmas);
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const daTurma = useDadosEmCache(turmaId === null ? 'atividades:sem-turma' : chaveAtividadesDaTurma(turmaId), () =>
    turmaId === null ? Promise.resolve(SEM_TURMA) : carregarAtividadesDaTurma(turmaId),
  );

  const [janela, setJanela] = useState<JanelaAberta | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const fechar = useCallback(() => setJanela(null), []);

  // Começa na turma usada da última vez (a mesma lembrada pela chamada); se a lista
  // mudar e a turma escolhida sumir, volta para uma que existe
  useEffect(() => {
    const lista = turmas.dados;
    if (!lista?.length || (turmaId !== null && lista.some((t) => t.id === turmaId))) return;
    const lembrada = Number(lerPreferencia(PREFERENCIA_TURMA));
    setTurmaId((lista.find((t) => t.id === lembrada) ?? lista[0])!.id);
  }, [turmas.dados, turmaId]);

  // A página inteira só espera as trilhas (os materiais). Turmas e atividades
  // carregam no seu canto: um erro nelas não tira o acesso aos materiais, e trocar
  // de turma não desmonta os cartões (as abas ficam onde estavam).
  const falhou = trilhas.erro && trilhas.dados === undefined;
  const mostrarCarregando = useCarregamentoCompleto(trilhas.dados === undefined && !falhou, 0);

  if (falhou)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar as trilhas. Recarregue a página.' }} />;
  if (mostrarCarregando || trilhas.dados === undefined) return <Carregando texto="Carregando as trilhas" />;

  const listaDeTrilhas = trilhas.dados;
  const listaDeTurmas = turmas.dados;
  const turma = daTurma.dados ?? SEM_TURMA;
  const estadoAtividades: EstadoAtividades =
    turmas.erro && listaDeTurmas === undefined
      ? 'erro-turmas'
      : listaDeTurmas === undefined
        ? 'carregando'
        : listaDeTurmas.length === 0
          ? 'sem-turma'
          : daTurma.erro && daTurma.dados === undefined
            ? 'erro'
            : turmaId === null || daTurma.dados === undefined
              ? 'carregando'
              : 'pronto';
  const idsDosAlunos = new Set(turma.alunos.map((a) => a.id));

  // Depois de gravar, busca de novo só o que mudou
  const recarregar = async (oQue: 'trilhas' | 'atividades', texto: string) => {
    setJanela(null);
    try {
      await (oQue === 'trilhas' ? trilhas.recarregar() : daTurma.recarregar());
    } catch (e) {
      console.error('[trilhas] salvou, mas falhou ao atualizar', e);
    }
    setMensagem({ tipo: 'sucesso', texto });
  };

  const apagar = async (
    alvo:
      | { tipo: 'trilha'; trilha: Trilha }
      | { tipo: 'material'; material: MaterialDaTrilha }
      | { tipo: 'atividade'; atividade: Atividade },
  ) => {
    const pergunta =
      alvo.tipo === 'trilha'
        ? `Apagar a trilha "${alvo.trilha.nome}" e os ${alvo.trilha.materiais.length} materiais dela?`
        : alvo.tipo === 'material'
          ? `Apagar "${alvo.material.titulo}"?`
          : `Apagar a atividade "${alvo.atividade.titulo}"?`;
    if (!window.confirm(pergunta)) return;
    setMensagem(null);
    const falha =
      alvo.tipo === 'trilha'
        ? await apagarTrilha(alvo.trilha.id)
        : alvo.tipo === 'material'
          ? await apagarMaterial(alvo.material.id)
          : await apagarAtividade(alvo.atividade.id);
    if (falha) return setMensagem({ tipo: 'erro', texto: falha });
    if (alvo.tipo === 'atividade') await recarregar('atividades', `Atividade "${alvo.atividade.titulo}" apagada.`);
    else await recarregar('trilhas', alvo.tipo === 'trilha' ? 'Trilha apagada.' : 'Material apagado.');
  };

  const abrir = (j: JanelaAberta) => {
    setMensagem(null);
    setJanela(j);
  };

  const turmaEscolhida = listaDeTurmas?.find((t) => t.id === turmaId);
  const nomeDaTurma = turmaEscolhida
    ? `${turmaEscolhida.nome}${turmaEscolhida.edicao ? ` · ${turmaEscolhida.edicao}` : ''}`
    : undefined;

  const atividadeDaJanela =
    janela && (janela.tipo === 'entregas' || janela.tipo === 'corrigir')
      ? turma.atividades.find((a) => a.id === janela.atividadeId)
      : undefined;

  return (
    <>
      {/* Turma: as atividades são de uma turma (os materiais valem para todas) */}
      {estadoAtividades === 'erro-turmas' ? (
        <Aviso
          mensagem={{
            tipo: 'erro',
            texto:
              'Não foi possível carregar as turmas. Os materiais continuam disponíveis; recarregue a página para ver as atividades.',
          }}
        />
      ) : listaDeTurmas === undefined ? (
        <p className={`${espaco.entreBlocos} ${texto.apoio}`}>Carregando as turmas…</p>
      ) : listaDeTurmas.length > 0 ? (
        <div className={`${espaco.entreBlocos} flex flex-wrap items-end justify-between gap-3`}>
          <div className="w-full sm:max-w-sm">
            <label htmlFor="trilhas-turma" className={classeRotulo}>
              Turma das atividades
            </label>
            <select
              id="trilhas-turma"
              value={turmaId ?? ''}
              className={classeCampo}
              onChange={(e) => {
                setTurmaId(Number(e.target.value));
                gravarPreferencia(PREFERENCIA_TURMA, e.target.value);
              }}
            >
              {listaDeTurmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                  {t.edicao ? ` · ${t.edicao}` : ''}
                </option>
              ))}
            </select>
          </div>
          {estadoAtividades === 'pronto' && <p className={texto.apoio}>{turma.alunos.length} aluno(s) nesta turma</p>}
        </div>
      ) : (
        <div className={espaco.entreBlocos}>
          <Vazio>Você ainda não está em nenhuma turma: dá para cuidar dos materiais, mas não das atividades.</Vazio>
        </div>
      )}

      <Aviso mensagem={mensagem} />

      <div className={`grid grid-cols-1 ${espaco.grade} xl:grid-cols-2`}>
        {listaDeTrilhas.map((trilha) => (
          <CartaoDaTrilha
            key={trilha.id}
            trilha={trilha}
            atividades={turma.atividades.filter((a) => a.trilha_id === trilha.id)}
            idsDosAlunos={idsDosAlunos}
            totalDeAlunos={turma.alunos.length}
            estadoAtividades={estadoAtividades}
            aoAbrir={abrir}
            aoApagar={apagar}
          />
        ))}

        {/* Última "caixa": criar trilha nova */}
        <button
          type="button"
          onClick={() => abrir({ tipo: 'trilha' })}
          className={`${superficie.vazio} flex min-h-[8rem] items-center justify-center p-6 text-sm font-semibold text-gray-600 transition-colors hover:border-favela-green-500 hover:text-favela-green-700 ${foco}`}
        >
          + Nova trilha
        </button>
      </div>

      {/* ============ JANELAS ============ */}
      <Janela
        titulo={
          janela?.tipo === 'trilha'
            ? janela.trilha
              ? 'Editar trilha'
              : 'Nova trilha'
            : janela?.tipo === 'material'
              ? janela.material
                ? 'Editar material'
                : 'Adicionar link'
              : ''
        }
        aberta={janela?.tipo === 'trilha' || janela?.tipo === 'material'}
        onFechar={fechar}
      >
        {(janela?.tipo === 'trilha' || janela?.tipo === 'material') && (
          <FormularioDeTrilhaOuMaterial
            key={
              janela.tipo === 'trilha'
                ? `t-${janela.trilha?.id ?? 'nova'}`
                : `m-${janela.trilhaId}-${janela.material?.id ?? 'novo'}`
            }
            alvo={janela}
            trilhas={listaDeTrilhas}
            aoSalvar={(texto) => recarregar('trilhas', texto)}
          />
        )}
      </Janela>

      <Janela
        titulo={janela?.tipo === 'atividade' && janela.atividade ? 'Editar atividade' : 'Nova atividade'}
        aberta={janela?.tipo === 'atividade'}
        onFechar={fechar}
      >
        {janela?.tipo === 'atividade' && turmaId !== null && (
          <FormularioDeAtividade
            key={`${janela.trilhaId}-${janela.atividade?.id ?? 'nova'}`}
            turmaId={turmaId}
            atividade={janela.atividade}
            trilhaInicial={janela.trilhaId}
            aoSalvar={(texto) => recarregar('atividades', texto)}
          />
        )}
      </Janela>

      <Janela
        titulo={atividadeDaJanela ? `Entregas · ${atividadeDaJanela.titulo}` : ''}
        subtitulo={nomeDaTurma}
        aberta={janela?.tipo === 'entregas' && atividadeDaJanela !== undefined}
        onFechar={fechar}
        larga
      >
        {janela?.tipo === 'entregas' && atividadeDaJanela && (
          <ListaDeEntregas
            atividade={atividadeDaJanela}
            alunos={turma.alunos}
            aoCorrigir={(aluno) => setJanela({ tipo: 'corrigir', atividadeId: atividadeDaJanela.id, aluno })}
          />
        )}
      </Janela>

      <Janela
        titulo={janela?.tipo === 'corrigir' ? janela.aluno.nome : ''}
        subtitulo={atividadeDaJanela ? [atividadeDaJanela.titulo, nomeDaTurma].filter(Boolean).join(' · ') : undefined}
        aberta={janela?.tipo === 'corrigir' && atividadeDaJanela !== undefined}
        onFechar={fechar}
        larga
      >
        {janela?.tipo === 'corrigir' && atividadeDaJanela && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setJanela({ tipo: 'entregas', atividadeId: atividadeDaJanela.id })}
              className={`rounded text-sm font-medium text-favela-green-700 hover:underline ${foco}`}
            >
              ← Voltar para as entregas
            </button>
            <Corrigir atividade={atividadeDaJanela} aluno={janela.aluno} aoSalvar={daTurma.recarregar} />
          </div>
        )}
      </Janela>
    </>
  );
};

// ============================================
// CARTÃO DA TRILHA (abas Materiais / Atividades, com botões)
// ============================================
interface PropsCartao {
  trilha: Trilha;
  atividades: Atividade[];
  idsDosAlunos: Set<number>;
  totalDeAlunos: number;
  estadoAtividades: EstadoAtividades;
  aoAbrir: (j: JanelaAberta) => void;
  aoApagar: (
    alvo:
      | { tipo: 'trilha'; trilha: Trilha }
      | { tipo: 'material'; material: MaterialDaTrilha }
      | { tipo: 'atividade'; atividade: Atividade },
  ) => void;
}

const CartaoDaTrilha: React.FC<PropsCartao> = ({
  trilha,
  atividades,
  idsDosAlunos,
  totalDeAlunos,
  estadoAtividades,
  aoAbrir,
  aoApagar,
}) => {
  // Até a pessoa escolher, a aba segue os dados: trilha sem material, mas com
  // atividade, abre em Atividades (as atividades chegam depois dos materiais)
  const [escolhida, setEscolhida] = useState<Aba | null>(null);
  const aba: Aba = escolhida ?? (trilha.materiais.length === 0 && atividades.length > 0 ? 'atividades' : 'materiais');

  // Entregas esperando correção nesta trilha (só de quem está na turma)
  const paraCorrigir = atividades.reduce(
    (total, a) =>
      total + a.tentativas.filter((t) => t.status === 'aguardando' && idsDosAlunos.has(t.participante_id)).length,
    0,
  );

  const painelMateriais = (
    <>
      {trilha.materiais.length === 0 ? (
        <p className={`py-2 ${texto.apoio}`}>Nenhum material nesta trilha ainda.</p>
      ) : (
        <ul className="-my-1 mb-3 divide-y divide-gray-100">
          {trilha.materiais.map((m) => (
            <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 rounded ${texto.destaque} hover:text-favela-green-700 hover:underline ${foco}`}
                >
                  {m.titulo}
                  <IconeLinkExterno className="h-3.5 w-3.5" />
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
                <p className={texto.apoio}>
                  {m.descricao ? `${m.descricao} · ` : ''}
                  {dominioDoLink(m.url)}
                </p>
              </div>
              <div className="flex gap-1">
                <Botao
                  tamanho="pequeno"
                  onClick={() => aoAbrir({ tipo: 'material', trilhaId: trilha.id, material: m })}
                >
                  Editar
                </Botao>
                <Botao tamanho="pequeno" variante="perigo" onClick={() => aoApagar({ tipo: 'material', material: m })}>
                  Apagar
                </Botao>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Botao className="w-full" onClick={() => aoAbrir({ tipo: 'material', trilhaId: trilha.id })}>
        + Adicionar link
      </Botao>
    </>
  );

  const painelAtividades =
    estadoAtividades === 'carregando' ? (
      <p className={`py-2 ${texto.apoio}`}>Carregando as atividades…</p>
    ) : estadoAtividades === 'erro' ? (
      <p className="py-2 text-sm text-red-700">
        Não foi possível carregar as atividades desta turma. Recarregue a página.
      </p>
    ) : estadoAtividades === 'erro-turmas' ? (
      <p className="py-2 text-sm text-red-700">Não foi possível carregar as turmas. Recarregue a página.</p>
    ) : estadoAtividades === 'sem-turma' ? (
      <p className={`py-2 ${texto.apoio}`}>Sem turma, não há atividades para mostrar.</p>
    ) : (
      <>
        {atividades.length === 0 ? (
          <p className={`py-2 ${texto.apoio}`}>Nenhuma atividade desta trilha nesta turma.</p>
        ) : (
          <ul className="-my-1 mb-3 divide-y divide-gray-100">
            {atividades.map((a) => {
              const daTurma = a.tentativas.filter((t) => idsDosAlunos.has(t.participante_id));
              const aguardando = daTurma.filter((t) => t.status === 'aguardando').length;
              const entregaram = new Set(daTurma.map((t) => t.participante_id)).size;
              const encerrada = new Date(a.prazo) < new Date();
              return (
                <li key={a.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={texto.destaque}>{a.titulo}</p>
                      <p className={texto.apoio}>
                        Prazo: {formatarDataHora(a.prazo)}
                        {encerrada ? ' (encerrado)' : ''} · {entregaram} de {totalDeAlunos} entregaram
                      </p>
                      {resumoDasRegras(a) && <p className={`mt-0.5 ${texto.apoio}`}>Exige: {resumoDasRegras(a)}</p>}
                    </div>
                    {aguardando > 0 && (
                      <span className={`${selo.base} ${selo.informacao}`}>{aguardando} para corrigir</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Botao
                      tamanho="pequeno"
                      variante={aguardando > 0 ? 'primario' : 'secundario'}
                      onClick={() => aoAbrir({ tipo: 'entregas', atividadeId: a.id })}
                    >
                      Entregas
                    </Botao>
                    <Botao
                      tamanho="pequeno"
                      onClick={() => aoAbrir({ tipo: 'atividade', trilhaId: trilha.id, atividade: a })}
                    >
                      Editar e prazo
                    </Botao>
                    {a.tentativas.length === 0 && (
                      <Botao
                        tamanho="pequeno"
                        variante="perigo"
                        onClick={() => aoApagar({ tipo: 'atividade', atividade: a })}
                      >
                        Apagar
                      </Botao>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Botao className="w-full" onClick={() => aoAbrir({ tipo: 'atividade', trilhaId: trilha.id, atividade: null })}>
          + Nova atividade
        </Botao>
      </>
    );

  return (
    <Cartao
      titulo={trilha.nome}
      descricao={trilha.descricao ?? undefined}
      acoes={
        <div className="flex gap-1">
          <Botao tamanho="pequeno" onClick={() => aoAbrir({ tipo: 'trilha', trilha })}>
            Editar
          </Botao>
          <Botao tamanho="pequeno" variante="perigo" onClick={() => aoApagar({ tipo: 'trilha', trilha })}>
            Apagar
          </Botao>
        </div>
      }
    >
      <AbasDoCartao<Aba>
        id={`trilha-equipe-${trilha.id}`}
        rotulo={`Conteúdo de ${trilha.nome}`}
        ativa={aba}
        aoTrocar={setEscolhida}
        abas={[
          { valor: 'materiais', rotulo: 'Materiais', total: trilha.materiais.length, painel: painelMateriais },
          {
            valor: 'atividades',
            rotulo: 'Atividades',
            total: estadoAtividades === 'pronto' ? atividades.length : undefined,
            alerta: paraCorrigir > 0 ? `${paraCorrigir} para corrigir` : undefined,
            painel: painelAtividades,
          },
        ]}
      />
    </Cartao>
  );
};

// ============================================
// ENTREGAS DE UMA ATIVIDADE (alunos e situação)
// ============================================
const ListaDeEntregas: React.FC<{
  atividade: Atividade;
  alunos: AlunoDaTurma[];
  aoCorrigir: (aluno: AlunoDaTurma) => void;
}> = ({ atividade, alunos, aoCorrigir }) => (
  <div className="space-y-4">
    <p className={`whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 ${texto.corpo}`}>{atividade.enunciado}</p>
    {!alunos.length ? (
      <Vazio>Nenhum aluno nesta turma.</Vazio>
    ) : (
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {alunos.map((aluno) => {
          const tentativas = tentativasDe(atividade, aluno.id);
          const situacao = situacaoDoAluno(tentativas, atividade.prazo);
          const ultima = tentativas[tentativas.length - 1];
          const estilo = SITUACAO_NA_EQUIPE[situacao];
          return (
            <li key={aluno.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className={texto.destaque}>{aluno.nome}</span>
              <span className="flex items-center gap-2">
                {ultima && <span className={texto.apoio}>{ultima.numero}ª tentativa</span>}
                {situacao === 'concluida' && ultima?.nota != null && (
                  <span className={`${texto.destaque} tabular-nums`}>{ultima.nota} / 100</span>
                )}
                <span className={`${selo.base} ${estilo.cor}`}>{estilo.rotulo}</span>
                {ultima && (
                  <Botao
                    tamanho="pequeno"
                    variante={ultima.status === 'aguardando' ? 'primario' : 'secundario'}
                    onClick={() => aoCorrigir(aluno)}
                  >
                    {ultima.status === 'aguardando' ? 'Corrigir' : 'Ver entrega'}
                  </Botao>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

// ============================================
// NOVA / EDITAR TRILHA OU MATERIAL
// ============================================
const FormularioDeTrilhaOuMaterial: React.FC<{
  alvo: Extract<JanelaAberta, { tipo: 'trilha' | 'material' }>;
  trilhas: Trilha[];
  aoSalvar: (mensagem: string) => Promise<void>;
}> = ({ alvo, trilhas, aoSalvar }) => {
  const [formData, setFormData] = useState(() =>
    alvo.tipo === 'trilha'
      ? { nome: alvo.trilha?.nome ?? '', titulo: '', descricao: alvo.trilha?.descricao ?? '', url: '', trilha_id: '' }
      : {
          nome: '',
          titulo: alvo.material?.titulo ?? '',
          descricao: alvo.material?.descricao ?? '',
          url: alvo.material?.url ?? 'https://',
          trilha_id: String(alvo.trilhaId),
        },
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<Mensagem>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((anterior) => ({ ...anterior, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSalvando(true);
    const falha =
      alvo.tipo === 'trilha'
        ? await salvarTrilha({ nome: formData.nome, descricao: formData.descricao }, alvo.trilha?.id)
        : await salvarMaterial(
            {
              trilha_id: Number(formData.trilha_id),
              titulo: formData.titulo,
              descricao: formData.descricao,
              url: formData.url,
            },
            alvo.material?.id,
          );
    setSalvando(false);
    if (falha) return setErro({ tipo: 'erro', texto: falha });
    await aoSalvar(alvo.tipo === 'trilha' ? 'Trilha salva.' : 'Material salvo.');
  };

  return (
    <form onSubmit={handleSubmit} className={espaco.formulario}>
      <Aviso mensagem={erro} className="" />
      {alvo.tipo === 'trilha' ? (
        <>
          <div>
            <label htmlFor="trilha-nome" className={classeRotulo}>
              Nome da trilha *
            </label>
            <input
              id="trilha-nome"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              required
              maxLength={80}
              className={classeCampo}
              placeholder="Ex: Git e GitHub"
            />
          </div>
          <div>
            <label htmlFor="trilha-descricao" className={classeRotulo}>
              Descrição
            </label>
            <textarea
              id="trilha-descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleInputChange}
              rows={2}
              maxLength={300}
              className={classeCampo}
              placeholder="Ex: Versionamento de código e trabalho em equipe"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="material-trilha" className={classeRotulo}>
              Trilha *
            </label>
            <select
              id="material-trilha"
              name="trilha_id"
              value={formData.trilha_id}
              onChange={handleInputChange}
              className={classeCampo}
            >
              {trilhas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="material-titulo" className={classeRotulo}>
              Título *
            </label>
            <input
              id="material-titulo"
              name="titulo"
              value={formData.titulo}
              onChange={handleInputChange}
              required
              maxLength={120}
              className={classeCampo}
              placeholder="Ex: Slides da aula 1"
            />
          </div>
          <div>
            <label htmlFor="material-url" className={classeRotulo}>
              Link (https://) *
            </label>
            <input
              id="material-url"
              name="url"
              type="url"
              value={formData.url}
              onChange={handleInputChange}
              required
              className={classeCampo}
              placeholder="https://..."
            />
          </div>
          <div>
            <label htmlFor="material-descricao" className={classeRotulo}>
              Descrição
            </label>
            <textarea
              id="material-descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleInputChange}
              rows={2}
              maxLength={300}
              className={classeCampo}
              placeholder="Ex: Pasta no Google Drive com os exercícios"
            />
          </div>
        </>
      )}
      <div className="flex justify-end border-t border-gray-100 pt-4">
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Botao>
      </div>
    </form>
  );
};

export default TrilhasEquipe;
