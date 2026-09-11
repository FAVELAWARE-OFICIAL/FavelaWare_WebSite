/**
 * ============================================
 * DADOS DAS TURMAS
 * ============================================
 *
 * ARQUIVO GERADO a partir do site oficial (https://favelaware.animahub.com.br).
 * Cada foto foi pareada com a legenda que aparece embaixo dela na página
 * de origem, na ordem do documento.
 *
 * Para corrigir um nome ou trocar uma foto, edite aqui mesmo: nada regera
 * este arquivo automaticamente.
 */

export interface Aluno {
  nome: string;
  foto: string;
}

export interface Turma {
  slug: string;      // usado na URL: /turmas/<slug>
  nome: string;
  edicao: string;
  periodo: string;
  atual: boolean;    // destaca a turma em andamento
  fotoTurma?: string; // foto da turma inteira, mostrada acima dos alunos
  alunos: Aluno[];
}

export const turmas: Turma[] = [
  {
    "slug": "turma-2025",
    "nome": "Turma 2025",
    "edicao": "3ª Edição",
    "periodo": "2025",
    "atual": true,
    "fotoTurma": "/imgs/gallery/turma-sala-03.jpg",
    "alunos": [
      {
        "nome": "Adrian Andrade",
        "foto": "/imgs/turmas/turma-2025/adrian-andrade.png"
      },
      {
        "nome": "Ana Clara Pereira",
        "foto": "/imgs/turmas/turma-2025/ana-clara-pereira.png"
      },
      {
        "nome": "Ana Vitória",
        "foto": "/imgs/turmas/turma-2025/ana-vitoria.png"
      },
      {
        "nome": "Átila  Tavares",
        "foto": "/imgs/turmas/turma-2025/atila-tavares.png"
      },
      {
        "nome": "Camilly",
        "foto": "/imgs/turmas/turma-2025/camilly.png"
      },
      {
        "nome": "Daniel Silva",
        "foto": "/imgs/turmas/turma-2025/daniel-silva.png"
      },
      {
        "nome": "Esther Santos",
        "foto": "/imgs/turmas/turma-2025/esther-santos.png"
      },
      {
        "nome": "Gabriel Barros",
        "foto": "/imgs/turmas/turma-2025/gabriel-barros.png"
      },
      {
        "nome": "Isaac Matos",
        "foto": "/imgs/turmas/turma-2025/isaac-matos.png"
      },
      {
        "nome": "Isabella Araújo",
        "foto": "/imgs/turmas/turma-2025/isabella-araujo.png"
      },
      {
        "nome": "João Pedro Lima",
        "foto": "/imgs/turmas/turma-2025/joao-pedro-lima.png"
      },
      {
        "nome": "Kennedy Gomes",
        "foto": "/imgs/turmas/turma-2025/kennedy-gomes.png"
      },
      {
        "nome": "Lauany",
        "foto": "/imgs/turmas/turma-2025/lauany.png"
      },
      {
        "nome": "Lucas Marques dos Santos",
        "foto": "/imgs/turmas/turma-2025/lucas-marques-dos-santos.png"
      },
      {
        "nome": "Luiz",
        "foto": "/imgs/turmas/turma-2025/luiz.png"
      },
      {
        "nome": "Marcella Dutra",
        "foto": "/imgs/turmas/turma-2025/marcella-dutra.png"
      },
      {
        "nome": "Marco Túlio Dias",
        "foto": "/imgs/turmas/turma-2025/marco-tulio-dias.png"
      },
      {
        "nome": "Melissa",
        "foto": "/imgs/turmas/turma-2025/melissa.png"
      },
      {
        "nome": "Mizael Pereira",
        "foto": "/imgs/turmas/turma-2025/mizael-pereira.png"
      },
      {
        "nome": "Murilo Rosa",
        "foto": "/imgs/turmas/turma-2025/murilo-rosa.png"
      },
      {
        "nome": "Nicole Souza",
        "foto": "/imgs/turmas/turma-2025/nicole-souza.png"
      },
      {
        "nome": "Rafaela Santos",
        "foto": "/imgs/turmas/turma-2025/rafaela-santos.png"
      },
      {
        "nome": "Stella Santos",
        "foto": "/imgs/turmas/turma-2025/stella-santos.png"
      },
      {
        "nome": "Victor Hugor Lopes",
        "foto": "/imgs/turmas/turma-2025/victor-hugor-lopes.png"
      },
      {
        "nome": "Vitória Costa",
        "foto": "/imgs/turmas/turma-2025/vitoria-costa.png"
      }
    ]
  },
  {
    "slug": "turma-1-2023-2",
    "nome": "Turma 1",
    "edicao": "2ª Edição",
    "periodo": "2023.2",
    "atual": false,
    "fotoTurma": "/imgs/turmas/turma-1-2023-2/foto-turma.jpg",
    "alunos": [
      {
        "nome": "Allam Gabriel",
        "foto": "/imgs/turmas/turma-1-2023-2/allam-gabriel.png"
      },
      {
        "nome": "Bryan Junio",
        "foto": "/imgs/turmas/turma-1-2023-2/bryan-junio.png"
      },
      {
        "nome": "Djalma Júnior",
        "foto": "/imgs/turmas/turma-1-2023-2/djalma-junior.png"
      },
      {
        "nome": "Emanuelle Ketlen",
        "foto": "/imgs/turmas/turma-1-2023-2/emanuelle-ketlen.png"
      },
      {
        "nome": "Leandro Divino",
        "foto": "/imgs/turmas/turma-1-2023-2/leandro-divino.png"
      },
      {
        "nome": "Maristela Pereira",
        "foto": "/imgs/turmas/turma-1-2023-2/maristela-pereira.png"
      },
      {
        "nome": "Mayra Merydy",
        "foto": "/imgs/turmas/turma-1-2023-2/mayra-merydy.png"
      },
      {
        "nome": "Pietro Augusto",
        "foto": "/imgs/turmas/turma-1-2023-2/pietro-augusto.png"
      },
      {
        "nome": "Sarah Kethelyn",
        "foto": "/imgs/turmas/turma-1-2023-2/sarah-kethelyn.png"
      },
      {
        "nome": "Vinícius Pereira",
        "foto": "/imgs/turmas/turma-1-2023-2/vinicius-pereira.png"
      },
      {
        "nome": "Vitor Gabriel",
        "foto": "/imgs/turmas/turma-1-2023-2/vitor-gabriel.png"
      },
      {
        "nome": "Vitoria da Silva",
        "foto": "/imgs/turmas/turma-1-2023-2/vitoria-da-silva.png"
      },
      {
        "nome": "Victor Rafael",
        "foto": "/imgs/turmas/turma-1-2023-2/victor-rafael.png"
      },
      {
        "nome": "João Pedro",
        "foto": "/imgs/turmas/turma-1-2023-2/joao-pedro.png"
      }
    ]
  },
  {
    "slug": "turma-2-2023-2",
    "nome": "Turma 2",
    "edicao": "2ª Edição",
    "periodo": "2023.2",
    "atual": false,
    "fotoTurma": "/imgs/turmas/turma-2-2023-2/foto-turma.jpg",
    "alunos": [
      {
        "nome": "Caio Henrique",
        "foto": "/imgs/turmas/turma-2-2023-2/caio-henrique.png"
      },
      {
        "nome": "Daniel de Almeida",
        "foto": "/imgs/turmas/turma-2-2023-2/daniel-de-almeida.png"
      },
      {
        "nome": "Felipe Miguel",
        "foto": "/imgs/turmas/turma-2-2023-2/felipe-miguel.png"
      },
      {
        "nome": "Lucas Alves",
        "foto": "/imgs/turmas/turma-2-2023-2/lucas-alves.png"
      },
      {
        "nome": "Nilmara Tomaz",
        "foto": "/imgs/turmas/turma-2-2023-2/nilmara-tomaz.png"
      },
      {
        "nome": "Maria Fernanda",
        "foto": "/imgs/turmas/turma-2-2023-2/maria-fernanda.png"
      }
    ]
  },
  {
    "slug": "turma-1-2022-1",
    "nome": "Turma 1",
    "edicao": "1ª Edição",
    "periodo": "2022.1",
    "atual": false,
    "fotoTurma": "/imgs/turmas/turma-1-2022-1/foto-turma.jpg",
    "alunos": [
      {
        "nome": "Emanuelle Gonçalves Ferreira de Oliveira",
        "foto": "/imgs/turmas/turma-1-2022-1/emanuelle-goncalves-ferreira-de-oliveira.png"
      },
      {
        "nome": "Emilly Soares Passos",
        "foto": "/imgs/turmas/turma-1-2022-1/emilly-soares-passos.png"
      },
      {
        "nome": "Emily Caroline Gonçalves do Nacimento",
        "foto": "/imgs/turmas/turma-1-2022-1/emily-caroline-goncalves-do-nacimento.png"
      },
      {
        "nome": "Evandro Coimbra Lopes Junior",
        "foto": "/imgs/turmas/turma-1-2022-1/evandro-coimbra-lopes-junior.png"
      },
      {
        "nome": "Isaac Oliveira Gouvea Batista da Silva",
        "foto": "/imgs/turmas/turma-1-2022-1/isaac-oliveira-gouvea-batista-da-silva.png"
      },
      {
        "nome": "Janaína De Souza Pereira",
        "foto": "/imgs/turmas/turma-1-2022-1/janaina-de-souza-pereira.png"
      },
      {
        "nome": "Kaique Almeida Dias",
        "foto": "/imgs/turmas/turma-1-2022-1/kaique-almeida-dias.png"
      },
      {
        "nome": "Leticia Sales de Freitas",
        "foto": "/imgs/turmas/turma-1-2022-1/leticia-sales-de-freitas.png"
      },
      {
        "nome": "Maria Eduarda Nunes Martins",
        "foto": "/imgs/turmas/turma-1-2022-1/maria-eduarda-nunes-martins.png"
      },
      {
        "nome": "Maria Jacilene de Morais Lopes",
        "foto": "/imgs/turmas/turma-1-2022-1/maria-jacilene-de-morais-lopes.png"
      },
      {
        "nome": "Mariany Soares Passos",
        "foto": "/imgs/turmas/turma-1-2022-1/mariany-soares-passos.png"
      },
      {
        "nome": "Mateus Nascimento Ferreira",
        "foto": "/imgs/turmas/turma-1-2022-1/mateus-nascimento-ferreira.png"
      },
      {
        "nome": "Milene de Sousa Vieira",
        "foto": "/imgs/turmas/turma-1-2022-1/milene-de-sousa-vieira.png"
      },
      {
        "nome": "Mírian Cristina Rodrigues dos Santos",
        "foto": "/imgs/turmas/turma-1-2022-1/mirian-cristina-rodrigues-dos-santos.png"
      },
      {
        "nome": "Pedro Henrique Pereira Barbosa",
        "foto": "/imgs/turmas/turma-1-2022-1/pedro-henrique-pereira-barbosa.png"
      },
      {
        "nome": "Yuri Christopher Santos de Jesus",
        "foto": "/imgs/turmas/turma-1-2022-1/yuri-christopher-santos-de-jesus.png"
      }
    ]
  },
  {
    "slug": "turma-2-2022-1",
    "nome": "Turma 2",
    "edicao": "1ª Edição",
    "periodo": "2022.1",
    "atual": false,
    "fotoTurma": "/imgs/turmas/turma-2-2022-1/foto-turma.jpg",
    "alunos": [
      {
        "nome": "Antonio Carlos Ratte Gallo Filho",
        "foto": "/imgs/turmas/turma-2-2022-1/antonio-carlos-ratte-gallo-filho.png"
      },
      {
        "nome": "Arthur Cleuber de Sousa Jeronimo",
        "foto": "/imgs/turmas/turma-2-2022-1/arthur-cleuber-de-sousa-jeronimo.png"
      },
      {
        "nome": "Giovane Mendes Barbosa",
        "foto": "/imgs/turmas/turma-2-2022-1/giovane-mendes-barbosa.png"
      },
      {
        "nome": "Gleizielen Yasmin Nascimento dos Santos",
        "foto": "/imgs/turmas/turma-2-2022-1/gleizielen-yasmin-nascimento-dos-santos.png"
      },
      {
        "nome": "Italo Gabriel Lemes Cardoso",
        "foto": "/imgs/turmas/turma-2-2022-1/italo-gabriel-lemes-cardoso.png"
      },
      {
        "nome": "Joao Vitor Oliveira Ferreira",
        "foto": "/imgs/turmas/turma-2-2022-1/joao-vitor-oliveira-ferreira.png"
      },
      {
        "nome": "Karolayne Fernanda Liberato",
        "foto": "/imgs/turmas/turma-2-2022-1/karolayne-fernanda-liberato.png"
      },
      {
        "nome": "Kauan Ferreira de Souza",
        "foto": "/imgs/turmas/turma-2-2022-1/kauan-ferreira-de-souza.png"
      },
      {
        "nome": "Laryssa Emyly Gomes da Silva",
        "foto": "/imgs/turmas/turma-2-2022-1/laryssa-emyly-gomes-da-silva.png"
      },
      {
        "nome": "Marcos Vinicius Rodigues da Silva",
        "foto": "/imgs/turmas/turma-2-2022-1/marcos-vinicius-rodigues-da-silva.png"
      },
      {
        "nome": "Mateus José de Araujo",
        "foto": "/imgs/turmas/turma-2-2022-1/mateus-jose-de-araujo.png"
      },
      {
        "nome": "Nathielly Kemilly Moreira dos Santos",
        "foto": "/imgs/turmas/turma-2-2022-1/nathielly-kemilly-moreira-dos-santos.png"
      },
      {
        "nome": "Nicole Moragana Pereira da Silva",
        "foto": "/imgs/turmas/turma-2-2022-1/nicole-moragana-pereira-da-silva.png"
      },
      {
        "nome": "Nilmara Tomaz dos Santos",
        "foto": "/imgs/turmas/turma-2-2022-1/nilmara-tomaz-dos-santos.png"
      },
      {
        "nome": "Raissa Silva Teodoro",
        "foto": "/imgs/turmas/turma-2-2022-1/raissa-silva-teodoro.png"
      },
      {
        "nome": "Samuel Moiseis de Souza",
        "foto": "/imgs/turmas/turma-2-2022-1/samuel-moiseis-de-souza.png"
      },
      {
        "nome": "Thais Pereira de Souza",
        "foto": "/imgs/turmas/turma-2-2022-1/thais-pereira-de-souza.png"
      },
      {
        "nome": "Thiago Dias da Silva",
        "foto": "/imgs/turmas/turma-2-2022-1/thiago-dias-da-silva.png"
      },
      {
        "nome": "Vinícius Soares Passos",
        "foto": "/imgs/turmas/turma-2-2022-1/vinicius-soares-passos.png"
      },
      {
        "nome": "Vitor Jonatha de Amorim Lopes",
        "foto": "/imgs/turmas/turma-2-2022-1/vitor-jonatha-de-amorim-lopes.png"
      },
      {
        "nome": "Vitoria Juliana de Amorim Lopes",
        "foto": "/imgs/turmas/turma-2-2022-1/vitoria-juliana-de-amorim-lopes.png"
      }
    ]
  },
  {
    "slug": "turma-2-2022-2",
    "nome": "Turma 2",
    "edicao": "1ª Edição",
    "periodo": "2022.2",
    "atual": false,
    "fotoTurma": "/imgs/turmas/turma-2-2022-2/foto-turma.jpg",
    "alunos": [
      {
        "nome": "Antonio Carlos Ratte Gallo Filho",
        "foto": "/imgs/turmas/turma-2-2022-2/antonio-carlos-ratte-gallo-filho.png"
      },
      {
        "nome": "Arthur Cleuber de Sousa Jeronimo",
        "foto": "/imgs/turmas/turma-2-2022-2/arthur-cleuber-de-sousa-jeronimo.png"
      },
      {
        "nome": "Giovane Mendes Barbosa",
        "foto": "/imgs/turmas/turma-2-2022-2/giovane-mendes-barbosa.png"
      },
      {
        "nome": "Vitor Jonatha de Amorim Lopes",
        "foto": "/imgs/turmas/turma-2-2022-2/vitor-jonatha-de-amorim-lopes.png"
      },
      {
        "nome": "Vitoria Juliana de Amorim Lopes",
        "foto": "/imgs/turmas/turma-2-2022-2/vitoria-juliana-de-amorim-lopes.png"
      },
      {
        "nome": "Joao Vitor Oliveira Ferreira",
        "foto": "/imgs/turmas/turma-2-2022-2/joao-vitor-oliveira-ferreira.png"
      }
    ]
  }
];

/** Busca uma turma pelo slug da URL. */
export const acharTurma = (slug?: string): Turma | undefined =>
  turmas.find((t) => t.slug === slug);
