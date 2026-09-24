/**
 * ============================================
 * GRÁFICOS DO PAINEL DO GESTOR
 * ============================================
 *
 * Gráficos feitos com a biblioteca Recharts. Cada componente recebe os dados
 * já calculados pelo painel (lib/dashboard.ts) e só desenha.
 *
 * Padrão de todos:
 * - linha tracejada da META (75%) onde o eixo é frequência;
 * - rótulo com o valor em cada barra (não precisa passar o mouse para ler);
 * - dica (tooltip) em cartão, com a frase completa ("12 de 18 presentes");
 * - cores da marca; vermelho/âmbar/verde só para faixa de frequência.
 * ResponsiveContainer faz o gráfico ocupar a largura do cartão, em qualquer tela.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Cartao } from './Ui';
import { META_FREQUENCIA, corDaFrequencia, formatarPercentual } from '../../lib/painel';

// Cores das séries: verde e roxo da marca primeiro, depois tons de apoio
export const CORES_SERIES = ['#8bc53f', '#2d2a5f', '#2563eb', '#db2777', '#f59e0b'];

const COR_EIXO = '#6b7280';
const COR_GRADE = '#eef0f3';
const eixoPercentual = {
  domain: [0, 1] as [number, number],
  tickFormatter: formatarPercentual,
  width: 44,
  ticks: [0, 0.25, 0.5, 0.75, 1],
};
const estiloEixo = { fontSize: 12, fill: COR_EIXO };

/** Aparência da linha tracejada da meta de frequência (75%) */
const propsMeta = {
  stroke: '#dc2626',
  strokeDasharray: '5 4',
  strokeWidth: 1.5,
  ifOverflow: 'extendDomain' as const,
};

/** Cartão padrão de cada gráfico (altura fixa para o ResponsiveContainer) */
export const CardGrafico: React.FC<{
  titulo: string;
  descricao: string;
  children: React.ReactNode;
  className?: string;
  altura?: string;
  rodape?: React.ReactNode;
}> = ({ titulo, descricao, children, className, altura = 'h-72', rodape }) => (
  <Cartao titulo={titulo} descricao={descricao} className={className}>
    <div className={altura}>{children}</div>
    {rodape && <div className="mt-4 border-t border-gray-100 pt-3">{rodape}</div>}
  </Cartao>
);

/** Aviso dentro do card quando o filtro deixa o gráfico sem dados */
export const SemDados: React.FC = () => (
  <div className="flex h-full items-center justify-center text-sm text-gray-500">
    Nenhum dado com os filtros atuais.
  </div>
);

/** Dica (tooltip) em cartão branco, no padrão do painel */
const CaixaDica: React.FC<{ titulo: string; linhas: { cor?: string; texto: string; destaque?: string }[] }> = ({
  titulo,
  linhas,
}) => (
  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
    <p className="mb-1 font-semibold text-gray-900">{titulo}</p>
    {linhas.map((l) => (
      <p key={l.texto} className="flex items-center gap-2 text-gray-600">
        {l.cor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.cor }} />}
        <span>{l.texto}</span>
        {l.destaque && <strong className="ml-auto pl-3 tabular-nums text-gray-900">{l.destaque}</strong>}
      </p>
    ))}
  </div>
);

// ============================================
// 1. PRESENÇA AO LONGO DO CURSO (área por turma + meta)
// ============================================
type Ponto = Record<string, string | number | null>;

export const GraficoPresencaNoTempo: React.FC<{ pontos: Ponto[]; turmas: string[] }> = ({ pontos, turmas }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={pontos} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
      <defs>
        {turmas.map((turma, i) => (
          <linearGradient key={turma} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={CORES_SERIES[i % CORES_SERIES.length]} stopOpacity={0.28} />
            <stop offset="1" stopColor={CORES_SERIES[i % CORES_SERIES.length]} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid stroke={COR_GRADE} vertical={false} />
      <XAxis dataKey="rotulo" tick={estiloEixo} tickLine={false} axisLine={{ stroke: COR_GRADE }} minTickGap={28} />
      <YAxis {...eixoPercentual} tick={estiloEixo} tickLine={false} axisLine={false} />
      <ReferenceLine
        y={META_FREQUENCIA}
        {...propsMeta}
        label={{ value: 'Meta 75%', position: 'insideTopRight', fill: '#dc2626', fontSize: 11, fontWeight: 600 }}
      />
      <Tooltip
        cursor={{ stroke: '#9ca3af', strokeDasharray: '3 3' }}
        content={({ active, payload, label }) =>
          active && payload?.length ? (
            <CaixaDica
              titulo={`Aula de ${label}`}
              linhas={payload.map((item) => ({
                cor: item.color,
                texto: `${item.name}: ${(item.payload as Ponto)[`${item.name}__detalhe`] ?? ''}`,
                destaque: formatarPercentual(Number(item.value)),
              }))}
            />
          ) : null
        }
      />
      {turmas.length > 1 && (
        <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      )}
      {turmas.map((turma, i) => (
        <Area
          key={turma}
          type="monotone"
          dataKey={turma}
          name={turma}
          stroke={CORES_SERIES[i % CORES_SERIES.length]}
          strokeWidth={2.5}
          fill={`url(#area-${i})`}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
          connectNulls
        />
      ))}
    </AreaChart>
  </ResponsiveContainer>
);

// ============================================
// 2. DISTRIBUIÇÃO POR FAIXA (quantos alunos em cada faixa)
// ============================================
export const GraficoDistribuicao: React.FC<{
  barras: { rotulo: string; valor: number; cor: string; parte: number }[];
}> = ({ barras }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={barras} margin={{ top: 28, right: 8, bottom: 0, left: 0 }}>
      <CartesianGrid stroke={COR_GRADE} vertical={false} />
      <XAxis dataKey="rotulo" tick={estiloEixo} tickLine={false} axisLine={{ stroke: COR_GRADE }} />
      <YAxis allowDecimals={false} tick={estiloEixo} tickLine={false} axisLine={false} width={32} />
      <Tooltip
        cursor={{ fill: '#f3f4f6' }}
        content={({ active, payload }) => {
          const b = payload?.[0]?.payload as (typeof barras)[number] | undefined;
          return active && b ? (
            <CaixaDica
              titulo={b.rotulo}
              linhas={[{ cor: b.cor, texto: `${b.valor} aluno(s)`, destaque: formatarPercentual(b.parte) }]}
            />
          ) : null;
        }}
      />
      <Bar dataKey="valor" radius={[8, 8, 0, 0]} maxBarSize={96}>
        {barras.map((b) => (
          <Cell key={b.rotulo} fill={b.cor} />
        ))}
        {/* "12 · 32%" em cima de cada barra */}
        <LabelList
          dataKey="valor"
          position="top"
          content={({ x, y, width, index }) => {
            const b = barras[index as number];
            return (
              <text
                x={Number(x) + Number(width) / 2}
                y={Number(y) - 8}
                textAnchor="middle"
                fontSize={12}
                fill="#111827"
                fontWeight={600}
              >
                {b.valor}{' '}
                <tspan fill={COR_EIXO} fontWeight={400}>
                  · {formatarPercentual(b.parte)}
                </tspan>
              </text>
            );
          }}
        />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// ============================================
// 3. BARRAS HORIZONTAIS EM % (turmas, conteúdos) com a meta
// ============================================
export const GraficoBarrasPercentual: React.FC<{
  /** valor null = sem aula contável no período: mostra "sem dados", nunca 0% */
  barras: { rotulo: string; valor: number | null; detalhe?: string }[];
  /** Cor única; se omitida, cada barra fica verde (na meta) ou âmbar/vermelha (abaixo) */
  cor?: string;
  larguraRotulo?: number;
}> = ({ barras, cor, larguraRotulo = 150 }) => {
  const corDa = (valor: number | null) => (valor === null ? corDaFrequencia(null) : (cor ?? corDaFrequencia(valor)));
  // O gráfico desenha a barra com o valor numérico; o original fica para rótulo e dica
  const dados = barras.map((b) => ({
    ...b,
    barra: b.valor ?? 0,
    textoDoRotulo: b.valor === null ? 'sem dados' : formatarPercentual(b.valor),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={COR_GRADE} horizontal={false} />
        <XAxis type="number" {...eixoPercentual} tick={estiloEixo} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="rotulo"
          width={larguraRotulo}
          tick={{ ...estiloEixo, fill: '#374151' }}
          tickLine={false}
          axisLine={false}
        />
        <ReferenceLine
          x={META_FREQUENCIA}
          {...propsMeta}
          label={{ value: 'Meta', position: 'top', fill: '#dc2626', fontSize: 11, fontWeight: 600 }}
        />
        <Tooltip
          cursor={{ fill: '#f3f4f6' }}
          content={({ active, payload }) => {
            const b = payload?.[0]?.payload as (typeof dados)[number] | undefined;
            if (!active || !b) return null;
            return (
              <CaixaDica
                titulo={b.rotulo}
                linhas={[
                  b.valor === null
                    ? { cor: corDa(null), texto: 'Sem aulas no período' }
                    : { cor: corDa(b.valor), texto: b.detalhe ?? 'Percentual', destaque: formatarPercentual(b.valor) },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="barra" radius={[0, 8, 8, 0]} maxBarSize={32}>
          {dados.map((b) => (
            <Cell key={b.rotulo} fill={corDa(b.valor)} />
          ))}
          <LabelList
            dataKey="textoDoRotulo"
            position="right"
            style={{ fontSize: 12, fontWeight: 600, fill: '#111827' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
