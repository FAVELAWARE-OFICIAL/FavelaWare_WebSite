/**
 * ============================================
 * DADOS DO HALL DA FAMA
 * ============================================
 *
 * ARQUIVO GERADO a partir do site oficial (https://favelaware.animahub.com.br).
 * Cada foto foi pareada com a legenda que aparece embaixo dela na página
 * de origem, na ordem do documento.
 *
 * O hall reúne TODO mundo que participou de cada ano, inclusive quem continua
 * no projeto. O site oficial só listava 5 pessoas em 2025; a equipe da
 * Edição III (equipeEdicaoIII, abaixo) veio da página Sobre e entra em 2025
 * e em 2026, com os retratos de public/imgs/team.
 *
 * Para corrigir um nome ou trocar uma foto, edite aqui mesmo: nada regera
 * este arquivo automaticamente. Ano novo? Acrescente-o à edição certa em
 * "edicoes", no fim do arquivo.
 */

export interface MembroEquipe {
  nome: string;
  cargo: string;
  organizacao: string;
  ano: string;
  foto: string;
  /** Opcional: perfil no LinkedIn (https://www.linkedin.com/in/...). Com ele, o cartão mostra o ícone. */
  linkedin?: string;
}

/**
 * Equipe da Edição III (ago/2025 a jul/2026): trabalhou nos dois anos, então
 * aparece no hall em 2025 e em 2026. A página Sobre usa esta mesma lista.
 */
export const equipeEdicaoIII: Omit<MembroEquipe, 'ano'>[] = [
  { nome: 'Joyce', cargo: 'Coordenadora', organizacao: 'Mundiale', foto: '/imgs/team/joyce.webp' },
  { nome: 'Nathalia Mazziero', cargo: 'Comunicação', organizacao: 'Mundiale', foto: '/imgs/team/nathalia.webp' },
  {
    nome: 'Ivan Santos',
    cargo: 'Coordenador',
    organizacao: 'AOPA',
    foto: '/imgs/team/ivan.webp',
    linkedin: 'https://www.linkedin.com/in/ivan-santos-248712114/',
  },
  { nome: 'Alinne Viegas', cargo: 'Psicóloga', organizacao: 'AOPA', foto: '/imgs/team/alinne.webp' },
  { nome: 'Letícia Sales', cargo: 'Assistente', organizacao: 'AOPA', foto: '/imgs/team/leticia.webp' },
  {
    nome: 'Raquel de Matos',
    cargo: 'Curadoria de Material',
    organizacao: 'Ânima',
    foto: '/imgs/team/raquel.webp',
    linkedin: 'https://www.linkedin.com/in/raquel-matos-mauricio/',
  },
  { nome: 'Gabriel Evaristo', cargo: 'Curadoria de Material', organizacao: 'Ânima', foto: '/imgs/team/gabriel.webp' },
  {
    nome: 'Gabrielle Soares',
    cargo: 'Editora de Conteúdo',
    organizacao: 'Ânima',
    foto: '/imgs/team/gabrielle.webp',
    linkedin: 'https://www.linkedin.com/in/gabrielle-soares-teixeira/',
  },
  {
    nome: 'Lorraine Fernandes',
    cargo: 'Designer gráfico',
    organizacao: 'Ânima',
    foto: '/imgs/team/lorraine.webp',
    linkedin: 'https://www.linkedin.com/in/lorraine-vieira/',
  },
  {
    nome: 'João Vitor',
    cargo: 'Desenvolvedor Full-Stack',
    organizacao: 'Ânima',
    foto: '/imgs/hall-da-fama/joao-vitor.webp',
  },
  {
    nome: 'Lucelho Silva',
    cargo: 'Líder Discente',
    organizacao: 'Ânima',
    foto: '/imgs/team/lucelho.webp',
    linkedin: 'https://www.linkedin.com/in/lucelhosilva',
  },
  {
    nome: 'Diego Manini',
    cargo: 'Instrutor Discente',
    organizacao: 'Ânima',
    foto: '/imgs/team/diego.webp',
    linkedin: 'https://www.linkedin.com/in/diego-manini-384549232',
  },
  {
    nome: 'Pedro Soares',
    cargo: 'Instrutor Discente',
    organizacao: 'Ânima',
    foto: '/imgs/team/pedro.webp',
    linkedin: 'https://www.linkedin.com/in/pedro-soares-9b42a927b/',
  },
  { nome: 'Miguel Alchaar', cargo: 'Instrutor Discente', organizacao: 'Ânima', foto: '/imgs/team/miguel.webp' },
  { nome: 'Leandro Cavalcante', cargo: 'Instrutor Discente', organizacao: 'Ânima', foto: '/imgs/team/leandro.webp' },
];

export const membros: MembroEquipe[] = [
  ...equipeEdicaoIII.map((pessoa) => ({ ...pessoa, ano: '2026' })),
  {
    nome: 'Angelina Faustino',
    cargo: 'Coordenadora',
    organizacao: 'Mundiale',
    ano: '2025',
    foto: '/imgs/hall-da-fama/angelina-faustino.webp',
    linkedin: 'https://www.linkedin.com/in/angelina-faustino/',
  },
  {
    nome: 'Renato Freitas',
    cargo: 'Instrutor Discente',
    organizacao: 'Ânima',
    ano: '2025',
    foto: '/imgs/hall-da-fama/renato-freitas.webp',
    linkedin: 'https://www.linkedin.com/in/renatonfreitas/',
  },
  {
    nome: 'Victor Santos',
    cargo: 'Instrutor Discente',
    organizacao: 'Ânima',
    ano: '2025',
    foto: '/imgs/hall-da-fama/victor-santos.webp',
    linkedin: 'https://www.linkedin.com/in/vapsxdev/',
  },
  {
    nome: 'Emily Lamas',
    cargo: 'Curadoria de Material',
    organizacao: 'Ânima',
    ano: '2025',
    foto: '/imgs/hall-da-fama/emily-lamas.webp',
    linkedin: 'https://www.linkedin.com/in/emilly-lamas-51b645372/',
  },
  {
    nome: 'Vínicius Godinho',
    cargo: 'Curadoria de Material',
    organizacao: 'Ânima',
    ano: '2025',
    foto: '/imgs/hall-da-fama/vinicius-godinho.webp',
    linkedin: 'https://www.linkedin.com/in/vinicius-m-godinho-b4155623a/',
  },
  ...equipeEdicaoIII.map((pessoa) => ({ ...pessoa, ano: '2025' })),
  {
    nome: 'Alessandro Ferreira',
    cargo: 'Coordenador',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/alessandro-ferreira.webp',
  },
  {
    nome: 'Ivan Santos',
    cargo: 'Coordenador',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/ivan-santos.webp',
    linkedin: 'https://www.linkedin.com/in/ivan-santos-248712114/',
  },
  {
    nome: 'Nathalia Mazziero',
    cargo: 'Comunicação',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/nathalia-mazziero.webp',
  },
  {
    nome: 'Alinne Viegas',
    cargo: 'Psicóloga',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/alinne-viegas.webp',
  },
  {
    nome: 'Jataíza Barboza',
    cargo: 'Líder Discente',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/jataiza-barboza.webp',
  },
  {
    nome: 'Pedro Assunção',
    cargo: 'Produtor Conteúdo',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/pedro-assuncao.webp',
  },
  {
    nome: 'Lucelho Silva',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/lucelho-cristiano.webp',
    linkedin: 'https://www.linkedin.com/in/lucelhosilva',
  },
  {
    nome: 'João Vitor',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/joao-vitor.webp',
  },
  {
    nome: 'Raquel de Matos',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/raquel-de-matos.webp',
    linkedin: 'https://www.linkedin.com/in/raquel-matos-mauricio/',
  },
  {
    nome: 'Matheus Henrique',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/matheus-henrique.webp',
  },
  {
    nome: 'Rodrigo Queiroz',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2024',
    foto: '/imgs/hall-da-fama/rodrigo-queiroz.webp',
  },
  {
    nome: 'Alessandro Ferreira',
    cargo: 'Coordenador',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/coordenador.webp',
  },
  {
    nome: 'Ivan Santos',
    cargo: 'Coordenador',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/ivan-santos.webp',
    linkedin: 'https://www.linkedin.com/in/ivan-santos-248712114/',
  },
  {
    nome: 'Álvaro',
    cargo: 'Coordenador',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/alvaro.webp',
  },
  {
    nome: 'Fernanda Alves',
    cargo: 'Produtora Conteúdo',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/fernanda-alves.webp',
  },
  {
    nome: 'Nathalia Mazziero',
    cargo: 'Comunicação',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/comunicacao.webp',
  },
  {
    nome: 'Andressa Fernandes',
    cargo: 'Redes Sociais',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/andressa-fernandes.webp',
  },
  {
    nome: 'Alinne Viegas',
    cargo: 'Psicóloga',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/psicologa.webp',
  },
  {
    nome: 'Taynara Soares',
    cargo: 'Intervenção Psicológica',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/psicologica.webp',
  },
  {
    nome: 'Scarlett Lina',
    cargo: 'Intervenção Psicológica',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/scarlett-lina.webp',
  },
  {
    nome: 'Ludmile dos Santos',
    cargo: 'Intervenção Psicológica',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/ludmile-dos-santos.webp',
  },
  {
    nome: 'Laís Martins',
    cargo: 'Intervenção Psicológica',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/lais-martins.webp',
  },
  {
    nome: 'Fabíola Fernanda',
    cargo: 'Orientadora Psicologia',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/fabiola-fernanda.webp',
  },
  {
    nome: 'Jataíza Barboza',
    cargo: 'Líder Discente',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/lider-discente.webp',
  },
  {
    nome: 'Lucelho Silva',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/instrutor-discente.webp',
    linkedin: 'https://www.linkedin.com/in/lucelhosilva',
  },
  {
    nome: 'João Vitor',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/joao-vitor.webp',
  },
  {
    nome: 'Raquel de Matos',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/raquel-de-matos.webp',
    linkedin: 'https://www.linkedin.com/in/raquel-matos-mauricio/',
  },
  {
    nome: 'Matheus Henrique',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/matheus-henrique.webp',
  },
  {
    nome: 'Gabriel Lucas',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2023',
    foto: '/imgs/hall-da-fama/gabriel-lucas.webp',
  },
  {
    nome: 'Karla',
    cargo: 'Sponsor',
    organizacao: '',
    ano: '2022',
    foto: '/imgs/hall-da-fama/karla.webp',
  },
  {
    nome: 'Laura Magalhães',
    cargo: 'Colíder',
    organizacao: '',
    ano: '2022',
    foto: '/imgs/hall-da-fama/laura-magalhaes.webp',
  },
  {
    nome: 'Paulo Henrique Domingos',
    cargo: 'Edição',
    organizacao: '',
    ano: '2022',
    foto: '/imgs/hall-da-fama/paulo-henrique-domingos.webp',
  },
  {
    nome: 'Marcelo Laurentino',
    cargo: 'Curadoria de Material',
    organizacao: '',
    ano: '2022',
    foto: '/imgs/hall-da-fama/marcelo-laurentino.webp',
  },
  {
    nome: 'Lara Alves',
    cargo: 'Líder Discente',
    organizacao: '',
    ano: '2022',
    foto: '/imgs/hall-da-fama/lara-alves.webp',
  },
  {
    nome: 'Fabiana Quelott',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2022',
    foto: '/imgs/hall-da-fama/fabiana-quelott.webp',
  },
  {
    nome: 'Jamir Rodrigues',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2022',
    foto: '/imgs/hall-da-fama/jamir-rodrigues.webp',
  },
  {
    nome: 'Thalita Alves',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2022',
    foto: '/imgs/hall-da-fama/thalita-alves.webp',
  },
  {
    nome: 'Lucelho Silva',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2022',
    foto: '/imgs/hall-da-fama/lucelho-2022.webp',
    linkedin: 'https://www.linkedin.com/in/lucelhosilva',
  },
  {
    nome: 'Emily Lamas',
    cargo: 'Instrutor Discente',
    organizacao: '',
    ano: '2022',
    foto: '/imgs/hall-da-fama/emily-lamas-2022.webp',
    linkedin: 'https://www.linkedin.com/in/emilly-lamas-51b645372/',
  },
];

// ---------- Organização por edição ----------
// O hall é mostrado por EDIÇÃO (não por ano). Cada ano pertence a uma edição;
// o campo "ano" continua nos dados para nada se perder.

export interface EdicaoDoHall {
  id: string;
  nome: string;
  periodo: string;
  anos: string[];
}

/** Edições, da mais recente para a mais antiga */
export const edicoes: EdicaoDoHall[] = [
  { id: 'edicao-3', nome: '3ª Edição', periodo: '2025–2026', anos: ['2026', '2025'] },
  { id: 'edicao-2', nome: '2ª Edição', periodo: '2023–2024', anos: ['2024', '2023'] },
  { id: 'edicao-1', nome: '1ª Edição', periodo: '2022', anos: ['2022'] },
];

/** Pessoa num cartão da equipe (arquivo ou banco): foto e LinkedIn são opcionais */
export type PessoaDoHall = Pick<MembroEquipe, 'nome' | 'cargo'> & {
  organizacao?: string;
  foto?: string;
  linkedin?: string;
};

/** Uma edição no Hall da Fama, com as pessoas já em ordem */
export interface GrupoDoHall {
  id: string;
  nome: string;
  periodo: string;
  membros: PessoaDoHall[];
}

// Ordem das organizações dentro de cada edição (quem não tem organização vai por último).
// O formulário de vínculo sugere estas mesmas.
export const ORDEM_DAS_ORGANIZACOES = ['Mundiale', 'AOPA', 'Ânima'];
const posicaoDaOrganizacao = (organizacao?: string) => {
  const i = ORDEM_DAS_ORGANIZACOES.indexOf(organizacao ?? '');
  return i === -1 ? ORDEM_DAS_ORGANIZACOES.length : i;
};

/** Agrupa por organização: Mundiale, AOPA, Ânima e as outras (dentro de cada uma, a ordem recebida) */
export const ordenarPorOrganizacao = <T extends { organizacao?: string }>(pessoas: T[]): T[] =>
  [...pessoas].sort((a, b) => posicaoDaOrganizacao(a.organizacao) - posicaoDaOrganizacao(b.organizacao)); // sort é estável

/**
 * Pessoas de uma edição, sem repetir quem aparece em dois anos da mesma
 * edição (fica a entrada do ano mais recente, a foto mais nova), agrupadas
 * por organização: Mundiale, AOPA e Ânima. Dentro de cada uma, a ordem do arquivo.
 */
const membrosDaEdicao = (edicao: EdicaoDoHall): MembroEquipe[] => {
  const vistos = new Set<string>();
  return ordenarPorOrganizacao(
    edicao.anos
      .flatMap((ano) => membros.filter((m) => m.ano === ano))
      .filter((m) => (vistos.has(m.nome) ? false : (vistos.add(m.nome), true))),
  );
};

/** As edições deste arquivo (1ª a 3ª); as encerradas depois vêm do banco (ver lib/sitePublico.ts) */
export const gruposDoArquivo: GrupoDoHall[] = edicoes.map((edicao) => ({
  id: edicao.id,
  nome: edicao.nome,
  periodo: edicao.periodo,
  membros: membrosDaEdicao(edicao),
}));

/** Total de pessoas diferentes que já passaram pela equipe */
export const contarPessoas = (grupos: GrupoDoHall[]): number =>
  new Set(grupos.flatMap((g) => g.membros.map((m) => m.nome))).size;
