/**
 * ============================================
 * ADMIN · VISÃO GERAL
 * ============================================
 *
 * A primeira tela do gestor conta uma história, em ordem:
 * 1. Resumo da edição: do que se trata (edição, turmas, período) e os números
 *    que importam, cada um com o seu contexto (meta, "x de y", período);
 * 2. Como a presença evoluiu aula a aula, contra a meta de 75%;
 * 3. Onde estão os alunos (faixas de frequência) e como as turmas se comparam;
 * 4. Quem precisa de atenção — a lista que vira ação.
 */
import { useNavigate } from 'react-router-dom';

import Avatar from '../../components/admin/Avatar';
import {
  CardGrafico, GraficoBarrasPercentual, GraficoDistribuicao, GraficoPresencaNoTempo, SemDados,
} from '../../components/admin/Graficos';
import { BarraDeFiltros, Botao, Cartao } from '../../components/admin/Ui';
import { espaco, foco, selo, superficie, texto } from '../../components/admin/designSystem';
import {
  FAIXAS, FALTAS_SEGUIDAS_ALERTA, META_FREQUENCIA, faixaDe, formatarData, formatarPercentual,
} from '../../lib/dashboard';
import { useAdmin } from './contexto';

const pontos = (diferenca: number) => `${Math.abs(Math.round(diferenca * 100))} ponto${Math.abs(Math.round(diferenca * 100)) === 1 ? '' : 's'}`;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// ============================================
// INDICADOR COM CONTEXTO
// ============================================
const Indicador: React.FC<{
  rotulo: string;
  valor: string;
  contexto: React.ReactNode;
  tom?: 'normal' | 'alerta' | 'positivo';
  children?: React.ReactNode;
}> = ({ rotulo, valor, contexto, tom = 'normal', children }) => {
  const cor = { normal: 'text-gray-900', alerta: 'text-red-600', positivo: 'text-favela-green-700' }[tom];
  return (
    <div className={`${superficie.cartao} flex flex-col p-5`}>
      <p className={texto.rotuloMaiusculo}>{rotulo}</p>
      <p className={`mt-2 ${texto.numero} ${cor}`}>{valor}</p>
      <div className={`mt-1 ${texto.apoio}`}>{contexto}</div>
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
};

/** Barra com a frequência e o marcador da meta */
const BarraComMeta: React.FC<{ valor: number | null }> = ({ valor }) => (
  <div className="relative h-2 rounded-full bg-gray-100" aria-hidden="true">
    <div
      className="h-full rounded-full"
      style={{ width: `${(valor ?? 0) * 100}%`, backgroundColor: FAIXAS.find((f) => f.valor === faixaDe(valor))?.cor }}
    />
    <span className="absolute -top-1 h-4 w-0.5 rounded bg-red-600" style={{ left: `${META_FREQUENCIA * 100}%` }} title="Meta 75%" />
  </div>
);

const VisaoGeral: React.FC = () => {
  const { edicao, painel, setFiltros } = useAdmin();
  const navigate = useNavigate();

  const totalAlunos = painel.alunos.length;
  const media = painel.frequenciaMedia;
  const diferencaMeta = media === null ? null : media - META_FREQUENCIA;
  const emRisco = painel.emRisco.length;
  const aulas = painel.aulasDeAlunos.filter((a) => a.data).length;
  const presentesPorAula = aulas ? Math.round(painel.totais.presentes / aulas) : 0;

  // Leva para a lista de alunos já filtrada pelos que estão abaixo da meta
  const verAlunosEmRisco = () => {
    setFiltros((f) => ({ ...f, faixa: 'risco' }));
    navigate('/dashboard/alunos');
  };

  return (
    <>
      <BarraDeFiltros />

      {/* ============ 1. RESUMO DA EDIÇÃO ============ */}
      <section aria-labelledby="titulo-resumo" className={espaco.entreBlocos}>
        <div className="mb-4">
          <h2 id="titulo-resumo" className={texto.titulo}>Resumo da {edicao.nome}</h2>
          <p className={texto.corpo}>
            {plural(totalAlunos, 'aluno', 'alunos')} em {plural(painel.turmasVisiveis.length, 'turma', 'turmas')}
            {painel.periodo && (
              <> · {plural(aulas, 'aula registrada', 'aulas registradas')} de {formatarData(painel.periodo.inicio)} a {formatarData(painel.periodo.fim)}</>
            )}
            {edicao.total_alunos_informado != null && (
              <> · Resultado oficial da planilha: <strong>{edicao.aprovados_informado} aprovados</strong> e{' '}
                <strong>{edicao.desistentes_informado} desistentes</strong> de {edicao.total_alunos_informado}</>
            )}
          </p>
        </div>

        <div className={`grid grid-cols-1 ${espaco.compacto} sm:grid-cols-2 xl:grid-cols-4`}>
          <Indicador
            rotulo="Frequência média"
            valor={formatarPercentual(media)}
            tom={diferencaMeta === null ? 'normal' : diferencaMeta >= 0 ? 'positivo' : 'alerta'}
            contexto={
              diferencaMeta === null ? 'Sem aulas no período'
              : diferencaMeta >= 0 ? `${pontos(diferencaMeta)} acima da meta de 75%`
              : `${pontos(diferencaMeta)} abaixo da meta de 75%`
            }
          >
            <BarraComMeta valor={media} />
          </Indicador>

          <Indicador
            rotulo="Alunos em risco"
            valor={String(emRisco)}
            tom={emRisco > 0 ? 'alerta' : 'positivo'}
            contexto={
              totalAlunos
                ? <>{formatarPercentual(emRisco / totalAlunos)} da turma está <strong>abaixo de 75%</strong> de frequência</>
                : 'Nenhum aluno com os filtros atuais'
            }
          >
            {emRisco > 0 && (
              <a href="#atencao" className={`text-xs font-semibold text-favela-green-700 hover:underline ${foco} rounded`}>
                Ver quem são ↓
              </a>
            )}
          </Indicador>

          <Indicador
            rotulo="Possível desistência"
            valor={String(painel.possivelDesistencia.length)}
            tom={painel.possivelDesistencia.length > 0 ? 'alerta' : 'positivo'}
            contexto={<>Faltaram as <strong>{FALTAS_SEGUIDAS_ALERTA} últimas aulas</strong> seguidas (ou mais)</>}
          />

          <Indicador
            rotulo="Presença por aula"
            valor={String(presentesPorAula)}
            contexto={<>alunos presentes, em média, em cada uma das {plural(aulas, 'aula', 'aulas')}</>}
          />
        </div>
      </section>

      {/* ============ 2. EVOLUÇÃO ============ */}
      <CardGrafico
        className={espaco.entreBlocos}
        titulo="Como a presença evoluiu"
        descricao="Percentual de alunos presentes em cada aula. Abaixo da linha vermelha, a turma ficou fora da meta."
        altura="h-80"
        rodape={
          painel.melhorAula && painel.piorAula && (
            <p className={texto.apoio}>
              Melhor aula: <strong className="text-favela-green-700">{formatarData(painel.melhorAula.data)} ({formatarPercentual(painel.melhorAula.media)})</strong>
              {' · '}
              Pior aula: <strong className="text-red-600">{formatarData(painel.piorAula.data)} ({formatarPercentual(painel.piorAula.media)})</strong>
            </p>
          )
        }
      >
        {painel.pontos.length
          ? <GraficoPresencaNoTempo pontos={painel.pontos} turmas={painel.turmasVisiveis.map((t) => t.nome)} />
          : <SemDados />}
      </CardGrafico>

      {/* ============ 3. ONDE ESTÃO OS ALUNOS ============ */}
      <div className={`${espaco.entreBlocos} grid grid-cols-1 ${espaco.grade} xl:grid-cols-2`}>
        <CardGrafico
          titulo="Onde estão os alunos"
          descricao="Quantos alunos em cada faixa de frequência (e a parte da turma que isso representa)."
        >
          {totalAlunos ? <GraficoDistribuicao barras={painel.distribuicao} /> : <SemDados />}
        </CardGrafico>
        <CardGrafico
          titulo="Comparação entre turmas"
          descricao="Frequência média de cada turma. Verde: na meta; âmbar ou vermelho: abaixo."
        >
          {totalAlunos ? (
            <GraficoBarrasPercentual
              larguraRotulo={96}
              barras={painel.porTurma.map((t) => ({ rotulo: t.rotulo, valor: t.valor, detalhe: plural(t.alunos, 'aluno', 'alunos') }))}
            />
          ) : <SemDados />}
        </CardGrafico>
      </div>

      {/* ============ 4. QUEM PRECISA DE ATENÇÃO ============ */}
      <Cartao
        className={`${espaco.entreBlocos} scroll-mt-20`}
        titulo="Quem precisa de atenção"
        descricao={
          emRisco
            ? `${plural(emRisco, 'aluno está', 'alunos estão')} abaixo da meta de 75%, de quem tem mais faltas para menos.`
            : 'Todos os alunos estão na meta de frequência.'
        }
        acoes={emRisco > 0 && <Botao tamanho="pequeno" onClick={verAlunosEmRisco}>Ver na lista de alunos</Botao>}
      >
        <div id="atencao" className="-mt-2">
          {emRisco === 0 ? (
            <p className={texto.corpo}>Nenhum aluno em risco com os filtros atuais. 🎉</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {painel.emRisco.slice(0, 8).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Avatar foto={a.foto} nome={a.nome} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${texto.destaque}`}>{a.nome}</p>
                    <p className={texto.apoio}>
                      {a.turma} · {plural(a.ausentes, 'falta', 'faltas')} em {a.presentes + a.ausentes} aulas
                    </p>
                  </div>
                  {a.faltasSeguidas >= FALTAS_SEGUIDAS_ALERTA && (
                    <span className={`${selo.base} ${selo.erro}`}>{a.faltasSeguidas} faltas seguidas</span>
                  )}
                  <div className="flex w-36 items-center gap-2">
                    <div className="flex-1"><BarraComMeta valor={a.frequencia} /></div>
                    <span className="w-10 text-right text-sm font-semibold tabular-nums">{formatarPercentual(a.frequencia)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {emRisco > 8 && (
            <p className={`mt-3 ${texto.apoio}`}>
              E mais {plural(emRisco - 8, 'aluno', 'alunos')}. Use “Ver na lista de alunos” para ver todos.
            </p>
          )}
        </div>
      </Cartao>

    </>
  );
};

export default VisaoGeral;
