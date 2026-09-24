/**
 * ============================================
 * DADOS DAS TURMAS
 * ============================================
 *
 * ARQUIVO GERADO a partir do site oficial (https://favelaware.animahub.com.br).
 * Cada foto foi pareada com a legenda que aparece embaixo dela na página
 * de origem, na ordem do documento.
 *
 * Os alunos sem "foto" vieram das listas de presença de cada edição e não
 * aparecem no site oficial: a página mostra o avatar padrão no lugar.
 * Nomes curtos seguem o formato dos colegas da mesma turma.
 * Entrou quem teve ao menos uma presença, com duas exceções decididas de
 * propósito: Luiz Filipe (Turma 1, 2022.1) só consta na aba de mudança de
 * horário e entrou mesmo assim; Nilmara segue na Turma 2 de 2022.1, como no
 * site oficial, embora a lista de presença a coloque na Turma 1.
 *
 * Para corrigir um nome, edite aqui mesmo: nada regera este arquivo.
 * FOTO: o jeito certo é trocar no dashboard (Alunos): a foto de lá aparece
 * aqui pelo participanteId. 7 alunos da 1ª edição não estão no banco (sem
 * participanteId): a foto deles só muda editando este arquivo.
 * NÃO mude os participanteId: cada um aponta para um aluno do banco (e está
 * marcado com no_site lá). Aluno novo no site precisa ser marcado no_site no
 * banco também (migration), senão a foto do dashboard não aparece.
 */

export interface Aluno {
  /** Id do aluno no banco: a foto posta no dashboard substitui a daqui (lib/sitePublico.ts) */
  participanteId?: number;
  nome: string;
  foto?: string; // sem foto, a página mostra o avatar padrão
  /** Vem do "Meu perfil" do aluno (lib/sitePublico.ts), não deste arquivo */
  linkedin?: string;
}

export interface TurmaDoSite {
  slug: string; // usado na URL: /turmas/<slug>
  nome: string;
  edicao: string;
  periodo: string;
  atual: boolean; // destaca a turma em andamento
  fotoTurma?: string; // foto da turma inteira, mostrada acima dos alunos
  alunos: Aluno[];
}

export const turmas: TurmaDoSite[] = [
  {
    slug: 'turma-2025',
    nome: 'Turma Única',
    edicao: '3ª Edição',
    periodo: '2025',
    atual: true,
    fotoTurma: '/imgs/gallery/turma-sala-03.webp',
    alunos: [
      {
        participanteId: 73,
        nome: 'Adrian Andrade',
        foto: '/imgs/turmas/turma-2025/adrian-andrade.webp',
      },
      {
        participanteId: 75,
        nome: 'Ana Clara Pereira',
        foto: '/imgs/turmas/turma-2025/ana-clara-pereira.webp',
      },
      {
        participanteId: 76,
        nome: 'Ana Vitória',
        foto: '/imgs/turmas/turma-2025/ana-vitoria.webp',
      },
      {
        participanteId: 77,
        nome: 'Átila  Tavares',
        foto: '/imgs/turmas/turma-2025/atila-tavares.webp',
      },
      {
        participanteId: 78,
        nome: 'Camilly',
        foto: '/imgs/turmas/turma-2025/camilly.webp',
      },
      {
        participanteId: 79,
        nome: 'Daniel Silva',
        foto: '/imgs/turmas/turma-2025/daniel-silva.webp',
      },
      {
        participanteId: 80,
        nome: 'Esther Santos',
        foto: '/imgs/turmas/turma-2025/esther-santos.webp',
      },
      {
        participanteId: 81,
        nome: 'Gabriel Barros',
        foto: '/imgs/turmas/turma-2025/gabriel-barros.webp',
      },
      {
        participanteId: 82,
        nome: 'Isaac Matos',
        foto: '/imgs/turmas/turma-2025/isaac-matos.webp',
      },
      {
        participanteId: 83,
        nome: 'Isabella Araújo',
        foto: '/imgs/turmas/turma-2025/isabella-araujo.webp',
      },
      {
        participanteId: 84,
        nome: 'João Pedro Lima',
        foto: '/imgs/turmas/turma-2025/joao-pedro-lima.webp',
      },
      {
        participanteId: 85,
        nome: 'Kauã Silva',
      },
      {
        participanteId: 86,
        nome: 'Kennedy Gomes',
        foto: '/imgs/turmas/turma-2025/kennedy-gomes.webp',
      },
      {
        participanteId: 87,
        nome: 'Lauany',
        foto: '/imgs/turmas/turma-2025/lauany.webp',
      },
      {
        participanteId: 89,
        nome: 'Lucas Almeida',
      },
      {
        participanteId: 88,
        nome: 'Lucas Marques dos Santos',
        foto: '/imgs/turmas/turma-2025/lucas-marques-dos-santos.webp',
      },
      {
        participanteId: 91,
        nome: 'Lucas Silva',
      },
      {
        participanteId: 90,
        nome: 'Luiz',
        foto: '/imgs/turmas/turma-2025/luiz.webp',
      },
      {
        participanteId: 92,
        nome: 'Marcella Dutra',
        foto: '/imgs/turmas/turma-2025/marcella-dutra.webp',
      },
      {
        participanteId: 93,
        nome: 'Marco Túlio Dias',
        foto: '/imgs/turmas/turma-2025/marco-tulio-dias.webp',
      },
      {
        participanteId: 94,
        nome: 'Melissa',
        foto: '/imgs/turmas/turma-2025/melissa.webp',
      },
      {
        participanteId: 95,
        nome: 'Mizael Pereira',
        foto: '/imgs/turmas/turma-2025/mizael-pereira.webp',
      },
      {
        participanteId: 96,
        nome: 'Murilo Rosa',
        foto: '/imgs/turmas/turma-2025/murilo-rosa.webp',
      },
      {
        participanteId: 97,
        nome: 'Nicole Souza',
        foto: '/imgs/turmas/turma-2025/nicole-souza.webp',
      },
      {
        participanteId: 98,
        nome: 'Otávio Lúcio',
      },
      {
        participanteId: 99,
        nome: 'Rafaela Santos',
        foto: '/imgs/turmas/turma-2025/rafaela-santos.webp',
      },
      {
        participanteId: 100,
        nome: 'Stella Santos',
        foto: '/imgs/turmas/turma-2025/stella-santos.webp',
      },
      {
        participanteId: 101,
        nome: 'Victor Hugor Lopes',
        foto: '/imgs/turmas/turma-2025/victor-hugor-lopes.webp',
      },
      {
        participanteId: 102,
        nome: 'Vitória Costa',
        foto: '/imgs/turmas/turma-2025/vitoria-costa.webp',
      },
    ],
  },
  {
    slug: 'turma-1-2023-2',
    nome: 'Turma 1',
    edicao: '2ª Edição',
    periodo: '2023.2',
    atual: false,
    fotoTurma: '/imgs/turmas/turma-1-2023-2/foto-turma.webp',
    alunos: [
      {
        participanteId: 42,
        nome: 'Allam Gabriel',
        foto: '/imgs/turmas/turma-1-2023-2/allam-gabriel.webp',
      },
      {
        participanteId: 43,
        nome: 'Ana Flavia',
      },
      {
        participanteId: 44,
        nome: 'Ana Vitória',
      },
      {
        participanteId: 45,
        nome: 'Bryan Junio',
        foto: '/imgs/turmas/turma-1-2023-2/bryan-junio.webp',
      },
      {
        participanteId: 60,
        nome: 'Djalma Júnior',
        foto: '/imgs/turmas/turma-1-2023-2/djalma-junior.webp',
      },
      {
        participanteId: 46,
        nome: 'Emanuelle Ketlen',
        foto: '/imgs/turmas/turma-1-2023-2/emanuelle-ketlen.webp',
      },
      {
        participanteId: 47,
        nome: 'Gabriela Martins',
      },
      {
        participanteId: 49,
        nome: 'Leandro Divino',
        foto: '/imgs/turmas/turma-1-2023-2/leandro-divino.webp',
      },
      {
        participanteId: 50,
        nome: 'Maristela Pereira',
        foto: '/imgs/turmas/turma-1-2023-2/maristela-pereira.webp',
      },
      {
        participanteId: 51,
        nome: 'Mayra Merydy',
        foto: '/imgs/turmas/turma-1-2023-2/mayra-merydy.webp',
      },
      {
        participanteId: 52,
        nome: 'Pietro Augusto',
        foto: '/imgs/turmas/turma-1-2023-2/pietro-augusto.webp',
      },
      {
        participanteId: 53,
        nome: 'Sara Cristina',
      },
      {
        participanteId: 54,
        nome: 'Sarah Kethelyn',
        foto: '/imgs/turmas/turma-1-2023-2/sarah-kethelyn.webp',
      },
      {
        participanteId: 55,
        nome: 'Thiago Lopes',
      },
      {
        participanteId: 57,
        nome: 'Vinícius Pereira',
        foto: '/imgs/turmas/turma-1-2023-2/vinicius-pereira.webp',
      },
      {
        participanteId: 58,
        nome: 'Vitor Gabriel',
        foto: '/imgs/turmas/turma-1-2023-2/vitor-gabriel.webp',
      },
      {
        participanteId: 59,
        nome: 'Vitoria da Silva',
        foto: '/imgs/turmas/turma-1-2023-2/vitoria-da-silva.webp',
      },
      {
        participanteId: 56,
        nome: 'Victor Rafael',
        foto: '/imgs/turmas/turma-1-2023-2/victor-rafael.webp',
      },
      {
        participanteId: 48,
        nome: 'João Pedro',
        foto: '/imgs/turmas/turma-1-2023-2/joao-pedro.webp',
      },
    ],
  },
  {
    slug: 'turma-2-2023-2',
    nome: 'Turma 2',
    edicao: '2ª Edição',
    periodo: '2023.2',
    atual: false,
    fotoTurma: '/imgs/turmas/turma-2-2023-2/foto-turma.webp',
    alunos: [
      {
        participanteId: 61,
        nome: 'Ana Carolina',
      },
      {
        participanteId: 62,
        nome: 'Beatriz de Oliveira',
      },
      {
        participanteId: 63,
        nome: 'Caio Henrique',
        foto: '/imgs/turmas/turma-2-2023-2/caio-henrique.webp',
      },
      {
        participanteId: 64,
        nome: 'Daniel de Almeida',
        foto: '/imgs/turmas/turma-2-2023-2/daniel-de-almeida.webp',
      },
      {
        participanteId: 65,
        nome: 'Felipe Miguel',
        foto: '/imgs/turmas/turma-2-2023-2/felipe-miguel.webp',
      },
      {
        participanteId: 66,
        nome: 'Guilherme Pereira',
      },
      {
        participanteId: 67,
        nome: 'Heitor Dinelli',
      },
      {
        participanteId: 68,
        nome: 'Lucas Alves',
        foto: '/imgs/turmas/turma-2-2023-2/lucas-alves.webp',
      },
      {
        participanteId: 70,
        nome: 'Mateus Nascimento',
      },
      {
        participanteId: 71,
        nome: 'Nilmara Tomaz',
        foto: '/imgs/turmas/turma-2-2023-2/nilmara-tomaz.webp',
      },
      {
        participanteId: 69,
        nome: 'Maria Fernanda',
        foto: '/imgs/turmas/turma-2-2023-2/maria-fernanda.webp',
      },
      {
        participanteId: 72,
        nome: 'Taissa dos Santos',
      },
    ],
  },
  {
    slug: 'turma-1-2022-1',
    nome: 'Turma 1',
    edicao: '1ª Edição',
    periodo: '2022.1',
    atual: false,
    fotoTurma: '/imgs/turmas/turma-1-2022-1/foto-turma.webp',
    alunos: [
      {
        participanteId: 4,
        nome: 'Emanuelle Gonçalves Ferreira de Oliveira',
        foto: '/imgs/turmas/turma-1-2022-1/emanuelle-goncalves-ferreira-de-oliveira.webp',
      },
      {
        participanteId: 5,
        nome: 'Emilly Soares Passos',
        foto: '/imgs/turmas/turma-1-2022-1/emilly-soares-passos.webp',
      },
      {
        participanteId: 6,
        nome: 'Emily Caroline Gonçalves do Nacimento',
        foto: '/imgs/turmas/turma-1-2022-1/emily-caroline-goncalves-do-nacimento.webp',
      },
      {
        participanteId: 7,
        nome: 'Evandro Coimbra Lopes Junior',
        foto: '/imgs/turmas/turma-1-2022-1/evandro-coimbra-lopes-junior.webp',
      },
      {
        participanteId: 8,
        nome: 'Isaac Oliveira Gouvea Batista da Silva',
        foto: '/imgs/turmas/turma-1-2022-1/isaac-oliveira-gouvea-batista-da-silva.webp',
      },
      {
        participanteId: 9,
        nome: 'Janaína De Souza Pereira',
        foto: '/imgs/turmas/turma-1-2022-1/janaina-de-souza-pereira.webp',
      },
      {
        participanteId: 10,
        nome: 'Kaique Almeida Dias',
        foto: '/imgs/turmas/turma-1-2022-1/kaique-almeida-dias.webp',
      },
      {
        participanteId: 11,
        nome: 'Kauã Thomaz dos Santos',
      },
      {
        participanteId: 12,
        nome: 'Leticia Sales de Freitas',
        foto: '/imgs/turmas/turma-1-2022-1/leticia-sales-de-freitas.webp',
      },
      {
        nome: 'Luiz Filipe Miranda Neves',
      },
      {
        participanteId: 13,
        nome: 'Maria Eduarda Nunes Martins',
        foto: '/imgs/turmas/turma-1-2022-1/maria-eduarda-nunes-martins.webp',
      },
      {
        participanteId: 14,
        nome: 'Maria Jacilene de Morais Lopes',
        foto: '/imgs/turmas/turma-1-2022-1/maria-jacilene-de-morais-lopes.webp',
      },
      {
        participanteId: 15,
        nome: 'Mariany Soares Passos',
        foto: '/imgs/turmas/turma-1-2022-1/mariany-soares-passos.webp',
      },
      {
        participanteId: 16,
        nome: 'Mateus Nascimento Ferreira',
        foto: '/imgs/turmas/turma-1-2022-1/mateus-nascimento-ferreira.webp',
      },
      {
        participanteId: 17,
        nome: 'Milene de Sousa Vieira',
        foto: '/imgs/turmas/turma-1-2022-1/milene-de-sousa-vieira.webp',
      },
      {
        participanteId: 18,
        nome: 'Mírian Cristina Rodrigues dos Santos',
        foto: '/imgs/turmas/turma-1-2022-1/mirian-cristina-rodrigues-dos-santos.webp',
      },
      {
        participanteId: 20,
        nome: 'Pedro Henrique Pereira Barbosa',
        foto: '/imgs/turmas/turma-1-2022-1/pedro-henrique-pereira-barbosa.webp',
      },
      {
        participanteId: 21,
        nome: 'Yuri Christopher Santos de Jesus',
        foto: '/imgs/turmas/turma-1-2022-1/yuri-christopher-santos-de-jesus.webp',
      },
    ],
  },
  {
    slug: 'turma-2-2022-1',
    nome: 'Turma 2',
    edicao: '1ª Edição',
    periodo: '2022.1',
    atual: false,
    fotoTurma: '/imgs/turmas/turma-2-2022-1/foto-turma.webp',
    alunos: [
      {
        participanteId: 22,
        nome: 'Antonio Carlos Ratte Gallo Filho',
        foto: '/imgs/turmas/turma-2-2022-1/antonio-carlos-ratte-gallo-filho.webp',
      },
      {
        participanteId: 23,
        nome: 'Arthur Cleuber de Sousa Jeronimo',
        foto: '/imgs/turmas/turma-2-2022-1/arthur-cleuber-de-sousa-jeronimo.webp',
      },
      {
        participanteId: 24,
        nome: 'Giovane Mendes Barbosa',
        foto: '/imgs/turmas/turma-2-2022-1/giovane-mendes-barbosa.webp',
      },
      {
        participanteId: 25,
        nome: 'Gleizielen Yasmin Nascimento dos Santos',
        foto: '/imgs/turmas/turma-2-2022-1/gleizielen-yasmin-nascimento-dos-santos.webp',
      },
      {
        participanteId: 26,
        nome: 'Italo Gabriel Lemes Cardoso',
        foto: '/imgs/turmas/turma-2-2022-1/italo-gabriel-lemes-cardoso.webp',
      },
      {
        participanteId: 27,
        nome: 'Joao Vitor Oliveira Ferreira',
        foto: '/imgs/turmas/turma-2-2022-1/joao-vitor-oliveira-ferreira.webp',
      },
      {
        participanteId: 28,
        nome: 'Karolayne Fernanda Liberato',
        foto: '/imgs/turmas/turma-2-2022-1/karolayne-fernanda-liberato.webp',
      },
      {
        participanteId: 29,
        nome: 'Kauan Ferreira de Souza',
        foto: '/imgs/turmas/turma-2-2022-1/kauan-ferreira-de-souza.webp',
      },
      {
        participanteId: 30,
        nome: 'Laryssa Emyly Gomes da Silva',
        foto: '/imgs/turmas/turma-2-2022-1/laryssa-emyly-gomes-da-silva.webp',
      },
      {
        participanteId: 31,
        nome: 'Marcos Vinicius Rodigues da Silva',
        foto: '/imgs/turmas/turma-2-2022-1/marcos-vinicius-rodigues-da-silva.webp',
      },
      {
        participanteId: 32,
        nome: 'Mateus José de Araujo',
        foto: '/imgs/turmas/turma-2-2022-1/mateus-jose-de-araujo.webp',
      },
      {
        participanteId: 33,
        nome: 'Nathielly Kemilly Moreira dos Santos',
        foto: '/imgs/turmas/turma-2-2022-1/nathielly-kemilly-moreira-dos-santos.webp',
      },
      {
        participanteId: 34,
        nome: 'Nicole Moragana Pereira da Silva',
        foto: '/imgs/turmas/turma-2-2022-1/nicole-moragana-pereira-da-silva.webp',
      },
      {
        participanteId: 19,
        nome: 'Nilmara Tomaz dos Santos',
        foto: '/imgs/turmas/turma-2-2022-1/nilmara-tomaz-dos-santos.webp',
      },
      {
        participanteId: 35,
        nome: 'Raissa Silva Teodoro',
        foto: '/imgs/turmas/turma-2-2022-1/raissa-silva-teodoro.webp',
      },
      {
        participanteId: 36,
        nome: 'Samuel Moiseis de Souza',
        foto: '/imgs/turmas/turma-2-2022-1/samuel-moiseis-de-souza.webp',
      },
      {
        participanteId: 37,
        nome: 'Thais Pereira de Souza',
        foto: '/imgs/turmas/turma-2-2022-1/thais-pereira-de-souza.webp',
      },
      {
        participanteId: 38,
        nome: 'Thiago Dias da Silva',
        foto: '/imgs/turmas/turma-2-2022-1/thiago-dias-da-silva.webp',
      },
      {
        participanteId: 39,
        nome: 'Vinícius Soares Passos',
        foto: '/imgs/turmas/turma-2-2022-1/vinicius-soares-passos.webp',
      },
      {
        participanteId: 40,
        nome: 'Vitor Jonatha de Amorim Lopes',
        foto: '/imgs/turmas/turma-2-2022-1/vitor-jonatha-de-amorim-lopes.webp',
      },
      {
        participanteId: 41,
        nome: 'Vitoria Juliana de Amorim Lopes',
        foto: '/imgs/turmas/turma-2-2022-1/vitoria-juliana-de-amorim-lopes.webp',
      },
    ],
  },
  {
    slug: 'turma-2-2022-2',
    nome: 'Turma 2',
    edicao: '1ª Edição',
    periodo: '2022.2',
    atual: false,
    fotoTurma: '/imgs/turmas/turma-2-2022-2/foto-turma.webp',
    alunos: [
      {
        nome: 'Antonio Carlos Ratte Gallo Filho',
        foto: '/imgs/turmas/turma-2-2022-2/antonio-carlos-ratte-gallo-filho.webp',
      },
      {
        nome: 'Arthur Cleuber de Sousa Jeronimo',
        foto: '/imgs/turmas/turma-2-2022-2/arthur-cleuber-de-sousa-jeronimo.webp',
      },
      {
        nome: 'Giovane Mendes Barbosa',
        foto: '/imgs/turmas/turma-2-2022-2/giovane-mendes-barbosa.webp',
      },
      {
        nome: 'Vitor Jonatha de Amorim Lopes',
        foto: '/imgs/turmas/turma-2-2022-2/vitor-jonatha-de-amorim-lopes.webp',
      },
      {
        nome: 'Vitoria Juliana de Amorim Lopes',
        foto: '/imgs/turmas/turma-2-2022-2/vitoria-juliana-de-amorim-lopes.webp',
      },
      {
        nome: 'Joao Vitor Oliveira Ferreira',
        foto: '/imgs/turmas/turma-2-2022-2/joao-vitor-oliveira-ferreira.webp',
      },
    ],
  },
];
