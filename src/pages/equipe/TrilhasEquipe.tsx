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
 * vê as turmas dele; o gestor e o colaborador, todas. O colaborador cuida só do
 * conteúdo: não vê entregas nem corrige. As regras ficam no banco (RLS).
 */
import { useCallback, useEffect, useState } from 'react';

import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import Janela from '../../components/admin/Janela';
import { Carregando } from '../../components/admin/Moldura';
import { Aviso, Vazio, classeCampo, classeRotulo, type Mensagem } from '../../components/admin/Ui';
import { espaco, foco, superficie, texto } from '../../components/admin/designSystem';
import { Corrigir, FormularioDeAtividade } from '../../components/atividades/FormulariosDaEquipe';
import CartaoDaTrilhaDaEquipe from '../../components/trilhas/CartaoDaTrilhaDaEquipe';
import FormularioDeTrilhaOuMaterial from '../../components/trilhas/FormularioDeTrilhaOuMaterial';
import ListaDeEntregas from '../../components/trilhas/ListaDeEntregas';
import type { AlvoDeApagar, EstadoAtividades, JanelaAberta } from '../../components/trilhas/tipos';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { chaveAtividadesDaTurma, servicoAtividades, type AtividadesDaTurma } from '../../lib/atividades';
import { CHAVE_MATERIAL, servicoMaterial } from '../../lib/material';
import { servicoSessao } from '../../lib/sessao';
import { servicoTurmas } from '../../lib/turmas';
import {
  gravarPreferencia,
  lerPreferencia,
  PREFERENCIA_TURMA_DO_PROFESSOR as PREFERENCIA_TURMA,
} from '../../utils/preferencias';

const SEM_TURMA: AtividadesDaTurma = { alunos: [], atividades: [] };

const TrilhasEquipe: React.FC = () => {
  const trilhas = useDadosEmCache(CHAVE_MATERIAL, () => servicoMaterial.carregarTrilhas());
  const turmas = useDadosEmCache('minhas-turmas', () => servicoTurmas.carregarComEdicao());
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const daTurma = useDadosEmCache(turmaId === null ? 'atividades:sem-turma' : chaveAtividadesDaTurma(turmaId), () =>
    turmaId === null ? Promise.resolve(SEM_TURMA) : servicoAtividades.carregarDaTurma(turmaId),
  );

  // Entregas e correção só para gestor e instrutor (até saber o papel, escondidas)
  const [mostrarEntregas, setMostrarEntregas] = useState(false);
  useEffect(() => {
    servicoSessao
      .contaLogada()
      .then((l) => setMostrarEntregas(l ? servicoSessao.corrigeEntregas(l.perfil) : false))
      .catch((e) => {
        console.error('[trilhas] não leu o perfil', e?.code ?? e?.message);
        setMostrarEntregas(false);
      });
  }, []);

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

  const apagar = async (alvo: AlvoDeApagar) => {
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
        ? await servicoMaterial.apagarTrilha(alvo.trilha.id)
        : alvo.tipo === 'material'
          ? await servicoMaterial.apagarMaterial(alvo.material.id)
          : await servicoAtividades.apagar(alvo.atividade.id);
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
          {mostrarEntregas && estadoAtividades === 'pronto' && (
            <p className={texto.apoio}>{turma.alunos.length} aluno(s) nesta turma</p>
          )}
        </div>
      ) : (
        <div className={espaco.entreBlocos}>
          <Vazio>Você ainda não está em nenhuma turma: dá para cuidar dos materiais, mas não das atividades.</Vazio>
        </div>
      )}

      <Aviso mensagem={mensagem} />

      <div className={`grid grid-cols-1 ${espaco.grade} xl:grid-cols-2`}>
        {listaDeTrilhas.map((trilha) => (
          <CartaoDaTrilhaDaEquipe
            key={trilha.id}
            trilha={trilha}
            atividades={turma.atividades.filter((a) => a.trilha_id === trilha.id)}
            idsDosAlunos={idsDosAlunos}
            totalDeAlunos={turma.alunos.length}
            estadoAtividades={estadoAtividades}
            mostrarEntregas={mostrarEntregas}
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

export default TrilhasEquipe;
