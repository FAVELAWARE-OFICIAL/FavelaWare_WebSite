/**
 * ============================================
 * ADMIN · PRESENÇA DOS PROFESSORES
 * ============================================
 *
 * 1. Ponto dos professores (pelo site): cada professor marca o próprio dia
 *    (P, F ou J). O gestor vê o período, corrige clicando na célula e lança o
 *    ponto de um dia que ainda não foi marcado.
 * 2. Histórico da planilha: a presença da equipe registrada em 2022 (só nas
 *    edições que têm esse registro).
 */
import { useCallback, useMemo, useState } from 'react';

import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import Janela from '../../components/admin/Janela';
import { Carregando } from '../../components/admin/Moldura';
import PlanilhaDeChamada, { LegendaSituacoes } from '../../components/admin/PlanilhaDeChamada';
import {
  Aviso,
  BarraDeFiltros,
  Botao,
  Cartao,
  Indicador,
  Vazio,
  classeCampo,
  classeRotulo,
  type Mensagem,
} from '../../components/admin/Ui';
import { espaco, foco, selo, texto } from '../../components/admin/designSystem';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { OPCOES_PONTO, opcaoDoPonto, servicoPonto, type SituacaoPonto } from '../../lib/ponto';
import { diasAtras, formatarData, hoje } from '../../utils/datas';
import { useAdmin } from './contexto';

type Correcao = { professorId: string; nome: string; data: string; atual?: SituacaoPonto };

const PresencaProfessores: React.FC = () => {
  const { edicao, painel, filtros } = useAdmin();

  // Período: o dos filtros De/Até; sem filtro, os últimos 30 dias
  const de = filtros.dataDe || diasAtras(30);
  const ate = filtros.dataAte || hoje();
  const ultimoDiaLancavel = ate < hoje() ? ate : hoje(); // "Lançar ponto": dentro do período e nunca no futuro
  const { dados, erro, recarregar } = useDadosEmCache(`pontos:${de}:${ate}`, () =>
    servicoPonto.carregarDaEquipe(de, ate),
  );
  const mostrarCarregando = useCarregamentoCompleto(dados === undefined && !erro, 0);

  const [correcao, setCorrecao] = useState<Correcao | null>(null);
  const [lancando, setLancando] = useState(false);
  const [lancamento, setLancamento] = useState({ professorId: '', data: hoje() });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  // Grade: só os professores atuais e os dias em que algum deles tem ponto no
  // período (do mais antigo ao mais novo). O ponto de quem deixou de ser
  // professor fica guardado no banco, mas não aparece aqui.
  const { dias, celula, totais } = useMemo(() => {
    const atuais = new Set((dados?.professores ?? []).map((p) => p.id));
    const pontos = (dados?.pontos ?? []).filter((p) => atuais.has(p.professor_id));
    const mapa = new Map(pontos.map((p) => [`${p.professor_id}|${p.data}`, p.situacao]));
    const contagem = new Map<string, Record<SituacaoPonto, number>>();
    for (const p of pontos) {
      const c = contagem.get(p.professor_id) ?? { presente: 0, ausente: 0, justificada: 0 };
      c[p.situacao]++;
      contagem.set(p.professor_id, c);
    }
    return {
      dias: [...new Set(pontos.map((p) => p.data))].sort(),
      celula: (professorId: string, data: string) => mapa.get(`${professorId}|${data}`),
      totais: (professorId: string) => contagem.get(professorId) ?? { presente: 0, ausente: 0, justificada: 0 },
    };
  }, [dados]);

  const fecharCorrecao = useCallback(() => {
    if (!salvando) setCorrecao(null);
  }, [salvando]);
  const fecharLancamento = useCallback(() => {
    if (!salvando) setLancando(false);
  }, [salvando]);

  const salvar = async (professorId: string, nome: string, data: string, situacao: SituacaoPonto | null) => {
    setSalvando(true);
    try {
      await servicoPonto.registrar(data, situacao, professorId);
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: servicoPonto.mensagemDoErro(e) });
      setCorrecao(null);
      setLancando(false);
      setSalvando(false);
      return;
    }
    try {
      await recarregar();
      setMensagem({
        tipo: 'sucesso',
        texto: `${nome} em ${formatarData(data)}: ${situacao ? opcaoDoPonto(situacao).rotulo.toLowerCase() : 'sem registro'}.`,
      });
      setCorrecao(null);
      setLancando(false);
    } catch (e) {
      console.error('[ponto] salvo, mas falhou ao atualizar a grade', e);
      setMensagem({ tipo: 'sucesso', texto: 'Ponto salvo. Recarregue a página para ver a grade atualizada.' });
      setCorrecao(null);
      setLancando(false);
    } finally {
      setSalvando(false);
    }
  };

  const professores = dados?.professores ?? [];
  const nomeDe = (p: { nome: string | null; email: string | null }) => p.nome ?? p.email ?? 'Instrutor';

  return (
    <>
      <BarraDeFiltros campos={['dataDe', 'dataAte']} />

      {/* ============ 1. PONTO PELO SITE ============ */}
      {erro && dados === undefined ? (
        <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar o ponto dos instrutores.' }} />
      ) : mostrarCarregando || dados === undefined ? (
        <Carregando texto="Carregando o ponto" />
      ) : (
        <>
          <Aviso mensagem={mensagem} />

          {professores.length > 0 && (
            <div className={`${espaco.entreBlocos} grid grid-cols-1 ${espaco.compacto} sm:grid-cols-2 xl:grid-cols-4`}>
              {professores.map((p) => {
                const t = totais(p.id);
                return (
                  <Indicador
                    key={p.id}
                    rotulo={nomeDe(p)}
                    valor={`${t.presente} ${t.presente === 1 ? 'dia' : 'dias'}`}
                    detalhe={`presente · ${t.ausente} falta(s) · ${t.justificada} justificada(s)`}
                  />
                );
              })}
            </div>
          )}

          <Cartao
            className={espaco.entreBlocos}
            titulo="Ponto dos instrutores"
            descricao={`De ${formatarData(de)} a ${formatarData(ate)}. Clique numa célula para corrigir.`}
            acoes={
              professores.length > 0 && (
                <Botao
                  tamanho="pequeno"
                  variante="primario"
                  onClick={() => {
                    setMensagem(null);
                    setLancamento({ professorId: professores[0].id, data: ultimoDiaLancavel });
                    setLancando(true);
                  }}
                >
                  + Lançar ponto
                </Botao>
              )
            }
          >
            {!professores.length ? (
              <Vazio>Nenhum instrutor cadastrado. Cadastre na aba Equipe.</Vazio>
            ) : !dias.length ? (
              <p className={texto.corpo}>Nenhum ponto marcado neste período.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="text-xs">
                  <caption className="sr-only">Ponto dos instrutores por dia</caption>
                  <thead>
                    <tr className="bg-gray-50">
                      <th
                        scope="col"
                        className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700"
                      >
                        Instrutor
                      </th>
                      {dias.map((d) => (
                        <th
                          key={d}
                          scope="col"
                          className="h-20 whitespace-nowrap px-1 py-2 font-medium text-gray-500 [writing-mode:vertical-rl] rotate-180"
                        >
                          {formatarData(d).slice(0, 5)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {professores.map((p) => (
                      <tr key={p.id} className="border-t border-gray-100">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 max-w-[10rem] truncate whitespace-nowrap bg-white px-3 py-1 text-left font-medium text-gray-800"
                          title={nomeDe(p)}
                        >
                          {nomeDe(p)}
                        </th>
                        {dias.map((d) => {
                          const atual = celula(p.id, d);
                          const op = atual ? opcaoDoPonto(atual) : null;
                          return (
                            <td key={d} className="p-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setMensagem(null);
                                  setCorrecao({ professorId: p.id, nome: nomeDe(p), data: d, atual });
                                }}
                                aria-label={`Corrigir: ${nomeDe(p)} em ${formatarData(d)}, ${op ? op.rotulo : 'sem registro'}`}
                                title={`${nomeDe(p)} · ${formatarData(d)} · ${op ? op.rotulo : 'sem registro'}`}
                                className={`flex h-6 w-6 items-center justify-center rounded border font-bold hover:ring-2 hover:ring-gray-900 ${foco} ${op ? op.classe : 'border-gray-100 bg-gray-100'}`}
                              >
                                {op?.letra}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {OPCOES_PONTO.map((o) => (
                <span key={o.valor} className={`flex items-center gap-2 ${texto.apoio}`}>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold ${o.classe}`}
                  >
                    {o.letra}
                  </span>
                  {o.rotulo}
                </span>
              ))}
            </div>
          </Cartao>
        </>
      )}

      {/* ============ 2. HISTÓRICO DA PLANILHA (2022) ============ */}
      {painel.professores.length > 0 && (
        <Cartao
          titulo="Histórico da planilha"
          descricao={`Presença da equipe registrada na planilha da ${edicao.nome}.`}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {painel.professores.map((p) => (
              <span key={p.id} className={`${selo.base} ${selo.neutro}`}>
                {p.nome}: {p.presentes} dias · {p.folgas} folga(s)
              </span>
            ))}
          </div>
          <div className="mb-4">
            <LegendaSituacoes situacoes={['presente', 'folga']} />
          </div>
          <PlanilhaDeChamada
            titulo="Presença dos instrutores (planilha)"
            pessoas={painel.professores}
            aulas={painel.aulasDeProfessores}
            celulas={painel.celulas}
          />
        </Cartao>
      )}

      {/* ============ JANELAS ============ */}
      <Janela titulo="Corrigir ponto" aberta={correcao !== null} onFechar={fecharCorrecao}>
        {correcao && (
          <div className={espaco.formulario}>
            <p className={texto.corpo}>
              <strong>{correcao.nome}</strong> em <strong>{formatarData(correcao.data)}</strong>
              <br />
              Hoje está como: {correcao.atual ? opcaoDoPonto(correcao.atual).rotulo : 'sem registro'}
            </p>
            <OpcoesDePonto
              atual={correcao.atual}
              desabilitado={salvando}
              aoEscolher={(s) => salvar(correcao.professorId, correcao.nome, correcao.data, s)}
            />
          </div>
        )}
      </Janela>

      <Janela titulo="Lançar ponto" aberta={lancando} onFechar={fecharLancamento}>
        <div className={espaco.formulario}>
          <div>
            <label htmlFor="lancar-professor" className={classeRotulo}>
              Instrutor
            </label>
            <select
              id="lancar-professor"
              value={lancamento.professorId}
              className={classeCampo}
              onChange={(e) => setLancamento((l) => ({ ...l, professorId: e.target.value }))}
            >
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {nomeDe(p)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lancar-dia" className={classeRotulo}>
              Dia
            </label>
            <input
              id="lancar-dia"
              type="date"
              min={de}
              max={ultimoDiaLancavel}
              value={lancamento.data}
              className={classeCampo}
              onChange={(e) => {
                const v = e.target.value; // digitado pode escapar do min/max: fica dentro do período
                if (v)
                  setLancamento((l) => ({ ...l, data: v < de ? de : v > ultimoDiaLancavel ? ultimoDiaLancavel : v }));
              }}
            />
          </div>
          {(() => {
            const prof = professores.find((p) => p.id === lancamento.professorId);
            return prof ? (
              <OpcoesDePonto
                atual={celula(prof.id, lancamento.data)}
                desabilitado={salvando}
                aoEscolher={(s) => salvar(prof.id, nomeDe(prof), lancamento.data, s)}
              />
            ) : null;
          })()}
        </div>
      </Janela>
    </>
  );
};

/** Os botões P / F / J / sem registro das janelas */
const OpcoesDePonto: React.FC<{
  atual?: SituacaoPonto;
  desabilitado: boolean;
  aoEscolher: (s: SituacaoPonto | null) => void;
}> = ({ atual, desabilitado, aoEscolher }) => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {OPCOES_PONTO.map((op) => {
      const escolhido = atual === op.valor;
      return (
        <button
          key={op.valor}
          type="button"
          disabled={desabilitado || escolhido}
          onClick={() => aoEscolher(op.valor)}
          className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed ${foco} ${
            escolhido ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
          }`}
        >
          <span className={`flex h-8 w-8 items-center justify-center rounded border font-bold ${op.classe}`}>
            {op.letra}
          </span>
          {op.rotulo}
          {escolhido ? ' (atual)' : ''}
        </button>
      );
    })}
    <Botao onClick={() => aoEscolher(null)} disabled={desabilitado || !atual} className="py-3">
      Deixar sem registro
    </Botao>
  </div>
);

export default PresencaProfessores;
