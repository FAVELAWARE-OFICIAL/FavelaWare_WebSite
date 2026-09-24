/**
 * ============================================
 * ÍCONES DA ÁREA ADMINISTRATIVA
 * ============================================
 *
 * SVG inline (traço de 24x24), sem biblioteca de ícones. Todos herdam a cor do
 * texto (currentColor) e são decorativos: o rótulo vem do texto ao lado, ou do
 * aria-label do botão quando o menu está recolhido.
 */
const Svg: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = 'w-5 h-5' }) => (
  <svg
    className={`${className} shrink-0`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

type Icone = React.FC<{ className?: string }>;

export const IconeVisaoGeral: Icone = (p) => (
  <Svg {...p}>
    <path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z" />
  </Svg>
);
export const IconeAlunos: Icone = (p) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);
export const IconeChamada: Icone = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 10h18M8 2v4M16 2v4M8 15l2 2 4-4" />
  </Svg>
);
export const IconeMenu: Icone = (p) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);
export const IconeFechar: Icone = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const IconeSair: Icone = (p) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Svg>
);
export const IconeEquipe: Icone = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
    <path d="M19 8v6M16 11h6" />
  </Svg>
);
export const IconeSolicitacoes: Icone = (p) => (
  <Svg {...p}>
    <path d="M4 4h16v12H8l-4 4z" />
    <path d="M8 9h8M8 12h5" />
  </Svg>
);
export const IconeMaterial: Icone = (p) => (
  <Svg {...p}>
    <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5z" />
    <path d="M8 7h7M8 11h5" />
  </Svg>
);
export const IconeAtividades: Icone = (p) => (
  <Svg {...p}>
    <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z" />
    <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <path d="M9 14l2 2 4-4" />
  </Svg>
);
export const IconeRelogio: Icone = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const IconeLink: Icone = (p) => (
  <Svg {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Svg>
);
export const IconeClipe: Icone = (p) => (
  <Svg {...p}>
    <path d="m21 11-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l8-8" />
  </Svg>
);
export const IconeEnviarArquivo: Icone = (p) => (
  <Svg {...p}>
    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    <path d="M12 15V3M7 8l5-5 5 5" />
  </Svg>
);
export const IconeAlerta: Icone = (p) => (
  <Svg {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
);
export const IconeLinkExterno: Icone = (p) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);
export const IconePonto: Icone = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
    <path d="M8 3.5 6 2M16 3.5 18 2" />
  </Svg>
);
export const IconeAvaliacao: Icone = (p) => (
  <Svg {...p}>
    <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8-4.3-4.1 5.9-.9z" />
  </Svg>
);
export const IconeMembros: Icone = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="7" r="3" />
    <circle cx="5" cy="10" r="2.2" />
    <circle cx="19" cy="10" r="2.2" />
    <path d="M6.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5M1.5 19c0-2 1.4-3.6 3.5-3.9M22.5 19c0-2-1.4-3.6-3.5-3.9" />
  </Svg>
);
