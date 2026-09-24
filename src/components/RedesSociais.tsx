/**
 * ============================================
 * COMPONENTE REDES SOCIAIS
 * ============================================
 *
 * Botões redondos com os canais oficiais do FavelaWare (Instagram e e-mail).
 * Usado no rodapé (fundo roxo) e na página de Contato (fundo claro).
 *
 * Os ícones são SVG escritos direto no JSX: nenhuma biblioteca extra e
 * nenhum HTML injetado.
 */

// Endereços oficiais (fonte única em src/data/contato.ts)
import { email, instagram } from '../data/contato';

interface RedeSocial {
  nome: string;
  href: string;
  rotulo: string; // Texto lido pelo leitor de tela (o botão só tem ícone)
  externo: boolean; // true = abre em nova aba
  icone: React.ReactNode;
}

const redesSociais: RedeSocial[] = [
  {
    nome: 'Instagram',
    href: instagram,
    rotulo: 'Instagram do FavelaWare (abre em nova aba)',
    externo: true,
    // Ícone do Instagram: Simple Icons 16.30.0 (licença CC0)
    icone: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" />
      </svg>
    ),
  },
  {
    nome: 'E-mail',
    href: `mailto:${email}`,
    rotulo: `Enviar e-mail para ${email}`,
    externo: false,
    // Ícone de envelope: Heroicons v2, contorno (licença MIT)
    icone: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
        />
      </svg>
    ),
  },
];

/** Ícone do LinkedIn ("in" dentro do quadrado), desenhado aqui mesmo (sem biblioteca) */
export const IconeLinkedin: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm1.5 7.5V19h3V9.5h-3ZM7 4.75a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM10.5 9.5V19h3v-5c0-1.4.9-2.1 1.9-2.1s1.6.7 1.6 2.1v5h3v-5.6c0-2.9-1.6-4.1-3.6-4.1-1.5 0-2.5.7-2.9 1.4V9.5h-3Z" />
  </svg>
);

/** Ícone clicável que abre o LinkedIn da pessoa em nova aba (cartões de equipe) */
export const LinkLinkedin: React.FC<{ nome: string; url: string }> = ({ nome, url }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`LinkedIn de ${nome} (abre em nova aba)`}
    className="mt-2 inline-flex rounded text-[#0a66c2] transition-colors hover:text-[#2d2a5f] focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 focus-visible:ring-offset-2"
  >
    <IconeLinkedin className="h-6 w-6" />
  </a>
);

// Cores de cada variação. O ring-offset usa a cor do fundo para o anel de
// foco ficar "descolado" do botão sem aparecer uma borda branca.
const estilosPorFundo = {
  roxo: 'bg-white/10 text-white hover:bg-[#8bc53f] hover:text-[#2d2a5f] focus-visible:ring-offset-[#2d2a5f]',
  claro: 'bg-[#2d2a5f] text-white hover:bg-[#8bc53f] hover:text-[#2d2a5f] focus-visible:ring-offset-white',
};

export const LinksRedesSociais: React.FC<{ fundo: 'roxo' | 'claro' }> = ({ fundo }) => {
  return (
    <div className="flex gap-4">
      {redesSociais.map((rede) => (
        <a
          key={rede.nome}
          href={rede.href}
          aria-label={rede.rotulo}
          // Link externo abre em nova aba; noopener/noreferrer impede a página
          // aberta de controlar a nossa pelo window.opener
          target={rede.externo ? '_blank' : undefined}
          rel={rede.externo ? 'noopener noreferrer' : undefined}
          className={`w-11 h-11 rounded-full inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8bc53f] focus-visible:ring-offset-2 ${estilosPorFundo[fundo]}`}
        >
          {rede.icone}
        </a>
      ))}
    </div>
  );
};
