/**
 * ============================================
 * CARREGAMENTO: SPRAY PINTANDO A LOGO DO FAVELAWARE
 * ============================================
 *
 * Uma lata de spray é chacoalhada, começa a pintar e cobre a logo do
 * FavelaWare em faixas, indo e voltando como quem grafita um muro; depois se
 * afasta, a logo fica um instante pronta e o ciclo recomeça.
 *
 * Movimento natural:
 * - antes de pintar, a lata é chacoalhada (como se faz com spray de verdade);
 * - cada passada acelera no começo e desacelera no fim (easing), como a mão;
 * - nas pontas a lata faz a curva e desce para a faixa de baixo;
 * - a lata inclina de leve para o lado em que está indo, e a mão treme um pouco;
 * - do bico sai um cone de névoa com gotículas, e a tinta bate na parede.
 *
 * Tinta: a logo fica atrás de uma MÁSCARA — um jato "desenrolado" no mesmo
 * compasso da lata. Núcleo sólido + borda macia e salpicada (filtro de ruído),
 * como a borda de uma pintura com spray.
 *
 * Ciclo completo: quem usa o carregamento chama aguardarCicloCompleto() antes de
 * esconder, para a pintura sempre terminar (ver função no fim do arquivo). Dois
 * carregamentos em sequência continuam a mesma pintura, sem recomeçar.
 *
 * Quem pediu "reduzir movimento" no sistema vê a logo pronta, sem animação.
 */
import { useEffect, useId, useRef, useState } from 'react';

// ============================================
// ROTEIRO (frações do ciclo)
// ============================================
const DURACAO = 4.4; // segundos por ciclo
const CHEGA = 0.12; // lata chega e é chacoalhada
const FIM_PINTURA = 0.7; // última faixa pintada
const LEVANTOU = 0.8; // lata se afastou
const PRONTA = 0.9; // logo inteira à mostra até aqui
const SUMIU = 0.97; // logo apagada; recomeça

/** Tempo em que a logo fica pronta e visível: o mínimo que o carregamento aparece */
const CICLO_VISIVEL_MS = PRONTA * DURACAO * 1000;

// Curvas de velocidade (keySplines do SVG)
const LINEAR = '0 0 1 1';
const SUAVE = '0.45 0 0.55 1'; // acelera e desacelera
const SAI_DEVAGAR = '0 0 0.3 1'; // chega rápido e assenta
const ENTRA_DEVAGAR = '0.6 0 1 1'; // começa devagar e dispara

// A logo ocupa 400 x 254 (proporção do arquivo, 1000 x 635)
const LARGURA = 400;
const ALTURA = 254;
const MARGEM = 20;

// Faixas de tinta: vai e volta, descendo; nas pontas, uma curva (a mão virando)
const FAIXAS = [30, 90, 150, 210, 250];
const PINCELADA = FAIXAS.map((y, i) => {
  const direita = i % 2 === 0;
  const xFim = direita ? LARGURA + MARGEM : -MARGEM;
  if (i === 0) return `M ${-MARGEM} ${y} H ${xFim}`;
  const xCurva = direita ? -MARGEM - 18 : LARGURA + MARGEM + 18;
  const yAnterior = FAIXAS[i - 1];
  return `Q ${xCurva} ${(y + yAnterior) / 2} ${direita ? -MARGEM : LARGURA + MARGEM} ${y} H ${xFim}`;
}).join(' ');

// Trechos: passadas (horizontais) e curvas (viradas). Comprimento aproximado.
const TRECHOS = FAIXAS.flatMap((y, i) => {
  const passada = { tamanho: LARGURA + 2 * MARGEM, sentido: i % 2 === 0 ? 1 : -1 };
  if (i === 0) return [passada];
  return [{ tamanho: (y - FAIXAS[i - 1]) * 1.25, sentido: 0 }, passada];
});
const COMPRIMENTO = TRECHOS.reduce((s, t) => s + t.tamanho, 0);

// A máscara mede o caminho em "pathLength = 1000": a fração pintada é exata,
// não importa o comprimento real das curvas
const TINTA = 1000;

/**
 * Monta os tempos da pintura: cada trecho ganha um intervalo proporcional ao
 * tamanho (curvas um pouco mais lentas), e em cada intervalo o movimento acelera
 * e desacelera. Lata, tinta e inclinação usam exatamente os mesmos tempos.
 */
const ROTEIRO = (() => {
  const peso = (t: (typeof TRECHOS)[number]) => (t.sentido === 0 ? t.tamanho * 1.6 : t.tamanho);
  const pesoTotal = TRECHOS.reduce((s, t) => s + peso(t), 0);

  // Progresso ao longo do caminho (0 a 1) e tempo de cada fronteira de trecho
  const tempos = [0, CHEGA];
  const progresso = [0, 0];
  const splines = [LINEAR];
  // Inclinação da lata: reta nas fronteiras, inclinada no meio das passadas
  const temposCerdas = [0, CHEGA];
  const cerdas = [0, 0];

  let tempo = CHEGA;
  let andado = 0;
  for (const trecho of TRECHOS) {
    const duracao = (peso(trecho) / pesoTotal) * (FIM_PINTURA - CHEGA);
    temposCerdas.push(tempo + duracao / 2, tempo + duracao);
    cerdas.push(trecho.sentido * 7, 0);
    tempo += duracao;
    andado += trecho.tamanho;
    tempos.push(tempo);
    progresso.push(andado / COMPRIMENTO);
    splines.push(SUAVE);
  }
  // Depois de pintar: fica no fim até o ciclo acabar, e volta ao começo escondido
  tempos.push(SUMIU, 1);
  progresso.push(1, 0);
  splines.push(LINEAR, LINEAR);
  temposCerdas.push(1);
  cerdas.push(0);

  const txt = (lista: number[]) => lista.map((n) => Number(n.toFixed(4))).join('; ');
  return {
    tempos: txt(tempos),
    progresso: txt(progresso),
    // Tinta em unidades de pathLength (0 a 1000): mesma fração do caminho que a lata
    tinta: txt(progresso.map((p) => TINTA * (1 - p))),
    splines: splines.join('; '),
    temposCerdas: txt(temposCerdas),
    cerdas: txt(cerdas),
    splinesCerdas: Array(cerdas.length - 1).fill(SUAVE).join('; '),
  };
})();

// Fases gerais (chegar, pintar, levantar, mostrar, apagar)
const FASES = `0; ${CHEGA}; ${FIM_PINTURA}; ${LEVANTOU}; ${PRONTA}; ${SUMIU}; 1`;
const SPLINES_FASES = [SAI_DEVAGAR, LINEAR, ENTRA_DEVAGAR, LINEAR, SUAVE, LINEAR].join('; ');

// ============================================
// CICLO COMPARTILHADO ENTRE CARREGAMENTOS
// ============================================
// Momento em que a pintura atual começou. Um carregamento que aparece logo
// depois de outro (ex.: "verificando acesso" e depois "carregando dados")
// continua do mesmo ponto, em vez de recomeçar a logo do zero.
let inicioDaPintura: number | null = null;

function marcarInicio(): number {
  const agora = performance.now();
  // Pintura antiga (de um carregamento que já acabou há tempo): começa outra
  if (inicioDaPintura === null || agora - inicioDaPintura > DURACAO * 1000) inicioDaPintura = agora;
  return inicioDaPintura;
}

/**
 * Espera a pintura em andamento terminar (logo inteira à mostra) antes de
 * esconder o carregamento. Chame depois que os dados chegarem.
 */
export async function aguardarCicloCompleto(): Promise<void> {
  if (prefereMenosMovimento() || inicioDaPintura === null) return;
  const resta = inicioDaPintura + CICLO_VISIVEL_MS - performance.now();
  if (resta > 0) await new Promise((r) => setTimeout(r, resta));
  inicioDaPintura = null;
}

/**
 * Diz quando mostrar o carregamento, sem cortar a pintura no meio:
 * - se `carregando` termina antes de `atraso` ms, o carregamento nem aparece
 *   (carga rápida não pisca a animação);
 * - se apareceu, fica até a logo estar inteira pintada, mesmo que os dados
 *   já tenham chegado.
 *
 * Uso: `const mostrar = useCarregamentoCompleto(carregando)`; enquanto
 * `mostrar`, exiba o <Carregamento>; se `carregando` e não `mostrar`, não exiba nada.
 */
export function useCarregamentoCompleto(carregando: boolean, atraso = 300): boolean {
  // Sem atraso, já nasce visível: nenhum quadro em branco antes da pintura
  const [visivel, setVisivel] = useState(() => carregando && atraso === 0);

  useEffect(() => {
    let ativo = true;
    if (carregando) {
      const espera = setTimeout(() => ativo && setVisivel(true), atraso);
      return () => { ativo = false; clearTimeout(espera); };
    }
    if (visivel) aguardarCicloCompleto().then(() => ativo && setVisivel(false));
    return () => { ativo = false; };
  }, [carregando, visivel, atraso]);

  return visivel;
}

const prefereMenosMovimento = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ============================================
// LATA DE SPRAY 3D
// ============================================
// Geometria (em volta do ponto que está sendo pintado, na origem 0,0):
// o bico fica acima e à direita; a lata aponta para baixo e para a esquerda.
const BICO = { x: 34, y: -44 };
const ANGULO_LATA = -52; // gira a lata (desenhada com o bico para a esquerda) até mirar a origem

// Gotículas: saem do bico e chegam espalhadas na parede (perpendicular ao jato)
const GOTICULAS = [-15, -9, -4, 0, 4, 9, 14, -12, 11, -2].map((desvio, i) => ({
  destino: { x: 0.79 * desvio, y: 0.61 * desvio },
  raio: 1.2 + ((i * 7) % 5) * 0.35,
  duracao: 0.3 + ((i * 3) % 4) * 0.05,
  atraso: -i * 0.037,
}));

// Chacoalhar: vai e volta rápido durante a chegada, depois para
const CHACOALHAR = (() => {
  const tempos = [0];
  const valores = ['0 0'];
  const passos = 8;
  for (let i = 1; i <= passos; i++) {
    tempos.push((CHEGA * 0.85 * i) / passos);
    valores.push(i === passos ? '0 0' : i % 2 ? '5 -7' : '-4 6');
  }
  tempos.push(1);
  valores.push('0 0');
  return { tempos: tempos.map((t) => Number(t.toFixed(4))).join('; '), valores: valores.join('; ') };
})();

const LataDeSpray: React.FC<{ id: string; dur: string }> = ({ id, dur }) => (
  <g>
    <defs>
      {/* Corpo roxo da marca com brilho: claro no meio, escuro nas bordas (cilindro) */}
      <linearGradient id={`corpo-${id}`} x1="0" x2="1">
        <stop offset="0" stopColor="#141230" />
        <stop offset="0.3" stopColor="#4c47a3" />
        <stop offset="0.45" stopColor="#9a95e8" />
        <stop offset="0.65" stopColor="#2d2a5f" />
        <stop offset="1" stopColor="#0f0d24" />
      </linearGradient>
      <linearGradient id={`faixa-${id}`} x1="0" x2="1">
        <stop offset="0" stopColor="#3f6212" />
        <stop offset="0.4" stopColor="#8bc53f" />
        <stop offset="0.55" stopColor="#b5e07a" />
        <stop offset="1" stopColor="#4d7c0f" />
      </linearGradient>
      <linearGradient id={`metal-${id}`} x1="0" x2="1">
        <stop offset="0" stopColor="#6b7280" />
        <stop offset="0.35" stopColor="#f9fafb" />
        <stop offset="0.6" stopColor="#9ca3af" />
        <stop offset="1" stopColor="#4b5563" />
      </linearGradient>
    </defs>

    {/* Desenhada com o bico em 0,0 apontando para a esquerda; o corpo fica embaixo */}
    <g transform={`translate(${BICO.x} ${BICO.y}) rotate(${ANGULO_LATA})`}>
      {/* Inclina para o lado da passada */}
      <g>
        <animateTransform attributeName="transform" type="rotate" dur={dur} repeatCount="indefinite" calcMode="spline"
          values={ROTEIRO.cerdas} keyTimes={ROTEIRO.temposCerdas} keySplines={ROTEIRO.splinesCerdas} />
        {/* Válvula (com o bico) e haste */}
        <rect x="0" y="-5" width="12" height="10" rx="2.5" fill={`url(#metal-${id})`} />
        <circle cx="1" cy="0" r="1.6" fill="#111827" />
        <rect x="4" y="5" width="4" height="4" fill="#9ca3af" />
        {/* Cúpula */}
        <path d="M-11 19 Q-11 7 6 6 Q23 7 23 19 Z" fill={`url(#metal-${id})`} />
        {/* Corpo */}
        <rect x="-11" y="17" width="34" height="80" rx="4" fill={`url(#corpo-${id})`} />
        {/* Rótulo verde com a sigla */}
        <rect x="-11" y="42" width="34" height="28" fill={`url(#faixa-${id})`} />
        <text x="6" y="61" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="Inter, system-ui, sans-serif">FW</text>
        {/* Reflexo de luz e aro do fundo */}
        <rect x="-5" y="20" width="3" height="72" rx="1.5" fill="#fff" opacity="0.3" />
        <rect x="-11" y="93" width="34" height="5" rx="2" fill={`url(#metal-${id})`} />
      </g>
    </g>
  </g>
);

/** Jato: cone de névoa, gotículas voando e a mancha onde a tinta bate */
const Jato: React.FC<{ id: string; dur: string }> = ({ id, dur }) => (
  <g>
    <defs>
      <linearGradient id={`nevoa-${id}`} gradientUnits="userSpaceOnUse" x1={BICO.x} y1={BICO.y} x2="0" y2="0">
        <stop offset="0" stopColor="#8bc53f" stopOpacity="0.55" />
        <stop offset="1" stopColor="#8bc53f" stopOpacity="0.12" />
      </linearGradient>
      <radialGradient id={`mancha-${id}`}>
        <stop offset="0" stopColor="#8bc53f" stopOpacity="0.5" />
        <stop offset="1" stopColor="#8bc53f" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Só aparece enquanto está pintando */}
    <animate attributeName="opacity" dur={dur} repeatCount="indefinite" calcMode="discrete"
      values="0; 1; 0; 0; 0; 0" keyTimes={`0; ${CHEGA}; ${FIM_PINTURA}; ${LEVANTOU}; ${PRONTA}; ${SUMIU}`} />
    <circle cx="0" cy="0" r="22" fill={`url(#mancha-${id})`}>
      <animate attributeName="r" dur="0.5s" repeatCount="indefinite" values="20; 24; 20" />
    </circle>
    <path d={`M${BICO.x} ${BICO.y} L-14 -11 Q-4 12 14 11 Z`} fill={`url(#nevoa-${id})`}>
      <animate attributeName="opacity" dur="0.23s" repeatCount="indefinite" values="0.85; 1; 0.8" />
    </path>
    {GOTICULAS.map((g, i) => (
      <circle key={i} r={g.raio} fill="#6aa520">
        <animateMotion dur={`${g.duracao}s`} begin={`${g.atraso}s`} repeatCount="indefinite"
          path={`M${BICO.x} ${BICO.y} L${g.destino.x} ${g.destino.y}`} />
        <animate attributeName="opacity" dur={`${g.duracao}s`} begin={`${g.atraso}s`} repeatCount="indefinite" values="0.9; 0.7; 0" />
      </circle>
    ))}
  </g>
);

// ============================================
// COMPONENTE
// ============================================
const Carregamento: React.FC<{ texto: string; modo?: 'bloco' | 'sobreposto' }> = ({ texto, modo = 'bloco' }) => {
  const legenda = `${texto}…`;
  const id = useId().replace(/:/g, ''); // ids únicos: pode haver dois carregamentos na tela
  const parado = prefereMenosMovimento();
  const svgRef = useRef<SVGSVGElement>(null);
  const dur = `${DURACAO}s`;

  // Continua a pintura do ponto em que ela está (ver "ciclo compartilhado")
  useEffect(() => {
    if (parado) return;
    const inicio = marcarInicio();
    svgRef.current?.setCurrentTime(((performance.now() - inicio) / 1000) % DURACAO);
  }, [parado]);

  // Jato "desenrolado" no compasso da lata (mesmos tempos e curvas)
  const tinta = (largura: number, filtro: string) => (
    <path
      d={PINCELADA}
      fill="none"
      stroke="#fff"
      strokeWidth={largura}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={TINTA}
      strokeDasharray={`${TINTA} ${TINTA}`}
      strokeDashoffset={parado ? 0 : TINTA}
      filter={filtro}
    >
      {!parado && (
        <animate attributeName="stroke-dashoffset" dur={dur} repeatCount="indefinite" calcMode="spline"
          values={ROTEIRO.tinta} keyTimes={ROTEIRO.tempos} keySplines={ROTEIRO.splines} />
      )}
    </path>
  );

  const desenho = (
    // Quadro simétrico em volta da logo (centro em 200 x 127): a logo fica no
    // centro visual; as folgas são o espaço da lata se mexer (ela fica à direita
    // do jato, então precisa de sobra dos lados para não ser cortada)
    <svg ref={svgRef} viewBox="-160 -150 720 554" className="w-80 max-w-full sm:w-[30rem]" aria-hidden="true">
      <defs>
        {/* Borda de spray: macia (desfoque) e salpicada (ruído fino) */}
        <filter id={`spray-${id}`} filterUnits="userSpaceOnUse" x="-120" y="-100" width="640" height="460">
          <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="macio" />
          <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="4" result="ruido" />
          <feComposite in="macio" in2="ruido" operator="arithmetic" k1="1.5" k2="0.35" k3="0" k4="-0.3" />
        </filter>
        <filter id={`nucleo-${id}`} filterUnits="userSpaceOnUse" x="-120" y="-100" width="640" height="460">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <mask id={`tinta-${id}`} maskUnits="userSpaceOnUse" x="-120" y="-100" width="640" height="460" style={{ maskType: 'alpha' }}>
          {tinta(66, `url(#nucleo-${id})`)}
          {tinta(104, `url(#spray-${id})`)}
        </mask>
      </defs>

      {/* A logo "pintada": só aparece onde a tinta já chegou */}
      <g mask={`url(#tinta-${id})`}>
        {!parado && (
          <animate attributeName="opacity" dur={dur} repeatCount="indefinite" calcMode="spline"
            values="1; 1; 1; 1; 1; 0; 0" keyTimes={FASES} keySplines={SPLINES_FASES} />
        )}
        <image href="/imgs/logo/logo.png" x="0" y="0" width={LARGURA} height={ALTURA} />
      </g>

      {/* Legenda dentro do desenho, colada na logo: o centro do quadro é o centro da logo */}
      <text x={LARGURA / 2} y={ALTURA + 62} textAnchor="middle" fontSize="24" fontWeight="500" fill="#4b5563"
        fontFamily="Inter, system-ui, sans-serif">
        {legenda}
      </text>

      {!parado && (
        <g>
          {/* Chega pelo alto, pinta e se afasta no fim */}
          <animateTransform attributeName="transform" type="translate" dur={dur} repeatCount="indefinite" calcMode="spline"
            values="-40 -120; 0 0; 0 0; 110 -90; 110 -90; 110 -90; -40 -120" keyTimes={FASES} keySplines={SPLINES_FASES} />
          <animate attributeName="opacity" dur={dur} repeatCount="indefinite" calcMode="spline"
            values="0; 1; 1; 0; 0; 0; 0" keyTimes={FASES} keySplines={SPLINES_FASES} />
          <g>
            {/* Segue a tinta, no mesmo compasso (mesmos tempos e curvas) */}
            <animateMotion dur={dur} repeatCount="indefinite" path={PINCELADA} calcMode="spline"
              keyPoints={ROTEIRO.progresso} keyTimes={ROTEIRO.tempos} keySplines={ROTEIRO.splines} />
            <Jato id={id} dur={dur} />
            <g>
              {/* Chacoalhada antes de pintar */}
              <animateTransform attributeName="transform" type="translate" dur={dur} repeatCount="indefinite"
                values={CHACOALHAR.valores} keyTimes={CHACOALHAR.tempos} />
              <g>
                {/* Tremor leve da mão */}
                <animateTransform attributeName="transform" type="translate" dur="0.31s" repeatCount="indefinite"
                  values="0 0; 0.7 1.2; -0.4 0.5; 0 0" />
                <LataDeSpray id={id} dur={dur} />
              </g>
            </g>
          </g>
        </g>
      )}
    </svg>
  );

  const conteudo = (
    <div role="status" aria-live="polite" className="flex items-center justify-center">
      {desenho}
      {/* O desenho é decorativo; o leitor de tela ouve esta frase */}
      <span className="sr-only">{legenda}</span>
    </div>
  );

  if (modo === 'sobreposto') {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/95 backdrop-blur-sm">
        {conteudo}
      </div>
    );
  }
  // Ocupa todo o espaço livre da área de conteúdo (a <main> é uma coluna flexível)
  // e fica no centro exato, na vertical e na horizontal, em qualquer tela
  return <div className="flex w-full flex-1 items-center justify-center py-8">{conteudo}</div>;
};

export default Carregamento;
