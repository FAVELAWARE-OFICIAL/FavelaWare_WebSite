/**
 * ============================================
 * DADOS DAS TRILHAS E DO CRONOGRAMA
 * ============================================
 *
 * Uma fonte só para a página Como Fazemos: antes, as trilhas (programa) e o
 * cronograma das aulas ficavam em duas páginas e repetiam o mesmo conteúdo.
 * Agora cada módulo junta:
 * - duracao e topicos: o programa (o que se aprende), da página Como Fazemos;
 * - aulas: o cronograma da Edição III (data, tema e instrutores), da página
 *   Aulas do site oficial. Nenhuma aula ficou de fora (121 no total).
 *
 * A estrutura da edição atual segue o cronograma (a ordem em que as aulas
 * aconteceram). O que só existia no programa continua aqui:
 * - a trilha FORGE (36 horas), que não tem aulas no cronograma;
 * - as oficinas de Entrevistas e de Pitch, cujas aulas estão dentro dos
 *   módulos de JavaScript (a "nota" aponta onde).
 * Onde programa e cronograma divergiam, vale o cronograma (escolha declarada):
 * - 1ª trilha: o programa dizia 60 horas, o cronograma 57;
 * - JavaScript, JavaScript para Web e APIs estavam na 2ª trilha (152 horas)
 *   no programa; no cronograma formam a 3ª trilha (sem carga total informada),
 *   então a 2ª trilha mostra 152 horas com os módulos que ficaram nela;
 * - "3ª TRILHA: FORGE" do programa virou só "FORGE", porque a 3ª trilha do
 *   cronograma é a de JavaScript;
 * - "Introdução Forge Chatbot e IA I" ficou com o nome do cronograma (sem o
 *   "I"), e a "Oficina Softskills" genérica do programa foi ligada à aula
 *   "Trabalho em equipe" (a única oficina de softskills sem nome no programa).
 *
 * Para mudar uma aula ou um tópico, edite só este arquivo.
 */

export interface AulaDoCronograma {
  data: string;
  titulo: string;
  detalhes: string[];
}

export interface Modulo {
  nome: string;
  duracao?: string;
  topicos: string[];
  aulas?: AulaDoCronograma[];
  /** Observação curta (ex.: onde está a aula de uma oficina) */
  nota?: string;
}

export interface TrilhaDoCurso {
  id: string;
  titulo: string;
  horas: string;
  modulos: Modulo[];
}

export interface EdicaoAnterior {
  id: string;
  nome: string;
  trilhas: TrilhaDoCurso[];
}

// Tópicos de JavaScript: iguais na edição atual e na Edição II
const TOPICOS_JAVASCRIPT = [
  'Variáveis, concatenação',
  'Operadores (aritméticos, relacionais, lógico, ternário)',
  'Estrutura Condicional (if-else)',
  'Estrutura Condicional (switch-case)',
  'Array',
  'Estrutura de repetição (while)',
  'Estrutura de repetição (do-while)',
  'Estrutura de repetição (for)',
  'Funções',
  'Classes e objetos',
  'Desenvolvimento do Projeto',
];

/** Edição III (atual): programa + cronograma, módulo a módulo */
export const trilhasAtuais: TrilhaDoCurso[] = [
  {
    id: 'cultura',
    titulo: '1ª TRILHA: CULTURA E ENCANTAMENTO',
    horas: '57 HORAS',
    modulos: [
      {
        nome: 'Carreira Tech',
        topicos: [],
        aulas: [
          { data: '05/08/2025', titulo: 'Apresentação e Carreira em TI', detalhes: ['Instrutores: Ivan (AOPA).'] },
        ],
      },
      {
        nome: 'Inclusão: Mundo Digital',
        duracao: '18 horas',
        topicos: [
          'Acessar computador',
          'Onde buscar os recursos',
          'Conceitos de hardware e software',
          'Uso de e-mail e Ferramentas Google',
        ],
        aulas: [
          { data: '06/08/2025', titulo: 'Acessar computador', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '07/08/2025', titulo: 'Onde buscar os recursos', detalhes: ['Instrutores: Pedro e Diego'] },
          {
            data: '12/08/2025',
            titulo: 'Conceitos de Hardware e Software',
            detalhes: ['Instrutores: Renato e Victor'],
          },
          {
            data: '13/08/2025',
            titulo: 'Conceitos de Hardware e Software (Aula Prática)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '14/08/2025',
            titulo: 'Uso de e-mail e Ferramentas Google',
            detalhes: ['Instrutores: Renato e Victor'],
          },
          {
            data: '19/08/2025',
            titulo: 'Uso de e-mail e Ferramentas Google',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
        ],
      },
      {
        nome: 'Pensamento Lógico',
        duracao: '33 horas',
        topicos: [
          'Introdução ao pensamento lógico',
          'Resolução de problemas de modo geral',
          'Ferramentas que possibilitem o desenvolvimento lógico',
          'Lógica de programação e algoritmos',
          'Correlacionando com Fluxograma',
          'Git e GitHub',
        ],
        aulas: [
          { data: '20/08/2025', titulo: 'Introdução ao pensamento lógico', detalhes: ['Instrutores: Renato e Victor'] },
          {
            data: '21/08/2025',
            titulo: 'Resolução de problemas de modo geral (matemática)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '26/08/2025',
            titulo: 'Resolução de problemas de modo geral (dinâmica)',
            detalhes: ['Instrutores: Renato e Victor'],
          },
          {
            data: '27/08/2025',
            titulo: 'Oficina de Currículo e LinkedIn (Mundiale)',
            detalhes: ['Instrutores presentes: Pedro e Diego'],
          },
          {
            data: '28/08/2025',
            titulo: 'Resolução de problemas de modo geral (jogos)',
            detalhes: ['Instrutores: Renato e Victor'],
          },
          {
            data: '02/09/2025',
            titulo: 'Ferramentas que possibilitem o desenvolvimento lógico',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '03/09/2025',
            titulo: 'Ferramentas que possibilitem o desenvolvimento lógico',
            detalhes: ['Instrutores: Renato e Victor'],
          },
          {
            data: '04/09/2025',
            titulo: 'Ferramentas que possibilitem o desenvolvimento lógico',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
        ],
      },
      {
        nome: 'Git e GitHub',
        topicos: [],
        aulas: [
          { data: '09/09/2025', titulo: 'Git e GitHub', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '10/09/2025', titulo: 'Git e GitHub', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '11/09/2025', titulo: 'Git e GitHub', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '16/09/2025', titulo: 'Git e GitHub', detalhes: ['Instrutores: Renato e Victor'] },
        ],
      },
    ],
  },
  {
    id: 'web',
    titulo: '2ª TRILHA: DESENVOLVIMENTO WEB',
    horas: '152 HORAS',
    modulos: [
      {
        nome: 'HTML',
        duracao: '33 horas',
        topicos: [
          'O que é HTML',
          'Cabeçalhos, parágrafos, formatação',
          'Lista ordenada e não ordenada, imagens',
          'Links, formulários',
          'Desenvolvimento do desafio HTML',
          'Exercícios Práticos',
        ],
        aulas: [
          { data: '17/09/2025', titulo: 'O que é HTML', detalhes: ['Instrutores: Pedro e Diego'] },
          {
            data: '18/09/2025',
            titulo: 'Cabeçalhos, parágrafos, formatação',
            detalhes: ['Instrutores: Renato e Victor'],
          },
          {
            data: '23/09/2025',
            titulo: 'Cabeçalhos, parágrafos, formatação (Prática)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '24/09/2025',
            titulo: 'Lista ordenada e não ordenada, imagens',
            detalhes: ['Instrutores: Renato e Victor'],
          },
          {
            data: '25/09/2025',
            titulo: 'Lista ordenada e não ordenada, imagens (Prática)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          { data: '30/09/2025', titulo: 'Links, formulários', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '01/10/2025', titulo: 'Links, formulários (Prática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '02/10/2025', titulo: 'Desenvolvimento desafio HTML', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '07/10/2025', titulo: 'Desenvolvimento desafio HTML', detalhes: ['Instrutores: Pedro e Diego'] },
          {
            data: '08/10/2025',
            titulo: 'Oficina Softskills: Mentalidade de Crescimento e Autogestão (Mundiale)',
            detalhes: ['Instrutores presentes: Renato e Victor'],
          },
          { data: '09/10/2025', titulo: 'Desenvolvimento desafio HTML', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'Introdução Forge Chatbot e IA',
        duracao: '18 horas',
        topicos: [
          'Introdução ao desenvolvimento de IA em ChatBot',
          'Chatbot Analytics',
          'Introdução a automação e web-crawlers, RPA, Diferença entre automação e automatização',
          'Forge',
        ],
        aulas: [
          {
            data: '21/10/2025',
            titulo: 'Introdução ao desenvolvimento de IA em ChatBot',
            detalhes: ['Instrutores: Renato e Victor'],
          },
          { data: '22/10/2025', titulo: 'Chatbot Analytics', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '23/10/2025', titulo: 'Chatbot Analytics', detalhes: ['Instrutores: Renato e Victor'] },
          {
            data: '28/10/2025',
            titulo: 'Introdução a automação e web-crawlers, RPA, Diferença entre automação e automatização',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          { data: '29/10/2025', titulo: 'Forge', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '30/10/2025', titulo: 'Forge', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'CSS',
        duracao: '36 horas',
        topicos: [
          'Introdução',
          'Seletores, classes, ids, tags',
          'Formatação, posicionamentos',
          'Fontes, bordas, cores',
          'Projeto - Definição e Esboço',
        ],
        aulas: [
          { data: '05/11/2025', titulo: 'Introdução', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '06/11/2025', titulo: 'Seletores, classes, ids, tags', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '11/11/2025', titulo: 'Projeto - Definição e Esboço', detalhes: ['Instrutores: Renato e Emily'] },
          {
            data: '12/11/2025',
            titulo: 'Seletores, classes, ids, tags (Prática)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          { data: '13/11/2025', titulo: 'Formatação, posicionamentos', detalhes: ['Instrutores: Renato e Emily'] },
          {
            data: '18/11/2025',
            titulo: 'Formatação, posicionamentos (Prática)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          { data: '19/11/2025', titulo: 'Fontes, bordas, cores', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '20/11/2025', titulo: 'Fontes, bordas, cores (Prática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '25/11/2025', titulo: 'Exercícios', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '26/11/2025', titulo: 'Exercícios', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '27/11/2025', titulo: 'Exercícios', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '02/12/2025', titulo: 'Projeto', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'Lógica de Programação',
        duracao: '25 horas',
        topicos: [
          'Lógica de programação e algoritmos',
          'Correlacionando com Fluxograma (Moqups e Draw.io)',
          'Desenvolvimento do Projeto',
        ],
        aulas: [
          {
            data: '03/12/2025',
            titulo: 'Lógica de programação e algoritmos',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '04/12/2025',
            titulo: 'Lógica de programação e algoritmos (Prática)',
            detalhes: ['Instrutores: Renato e Emily'],
          },
          {
            data: '09/12/2025',
            titulo: 'Lógica de programação e algoritmos',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '10/12/2025',
            titulo: 'Lógica de programação e algoritmos (Prática)',
            detalhes: ['Instrutores: Renato e Emily'],
          },
          {
            data: '11/12/2025',
            titulo: 'Correlacionando com Fluxograma (Moqups e Draw.io)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          { data: '16/12/2025', titulo: 'Projeto', detalhes: ['Instrutores: Renato e Emily'] },
          {
            data: '17/12/2025',
            titulo: 'Correlacionando com Fluxograma (Prática)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '18/12/2025',
            titulo: 'Oficina Softskills: Trabalho em equipe (Mundiale)',
            detalhes: ['Instrutores presentes: Renato e Emily'],
          },
        ],
      },
    ],
  },
  {
    id: 'javascript',
    titulo: '3ª TRILHA: FUNDAMENTOS DE DESENVOLVIMENTO WEB COM JAVASCRIPT',
    horas: '',
    modulos: [
      {
        nome: 'JavaScript',
        duracao: '63 horas',
        topicos: TOPICOS_JAVASCRIPT,
        aulas: [
          { data: '24/02/2026', titulo: 'Variáveis, concatenação', detalhes: ['Instrutores: Miguel e Leandro'] },
          {
            data: '25/02/2026',
            titulo: 'Operadores (aritméticos, relacionais, lógico, ternário)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '26/02/2026',
            titulo: 'Estrutura Condicional (if-else)',
            detalhes: ['Instrutores: Miguel e Leandro'],
          },
          {
            data: '03/03/2026',
            titulo: 'Estrutura Condicional (exercícios)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          { data: '04/03/2026', titulo: 'Projeto', detalhes: ['Instrutores: Miguel e Leandro'] },
          {
            data: '05/03/2026',
            titulo: 'Estrutura Condicional (switch-case)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '10/03/2026',
            titulo: 'Estrutura Condicional (exercícios)',
            detalhes: ['Instrutores: Miguel e Leandro'],
          },
          { data: '11/03/2026', titulo: 'Array', detalhes: ['Mundiale'] },
          { data: '12/03/2026', titulo: 'Array', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '17/03/2026', titulo: 'Array (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '18/03/2026', titulo: 'Estrutura de repetição (while)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '19/03/2026', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores: Pedro e Diego'] },
          {
            data: '24/03/2026',
            titulo: 'Estrutura de repetição (exercícios)',
            detalhes: ['Instrutores: Miguel e Leandro'],
          },
          { data: '25/03/2026', titulo: 'Estrutura de repetição (do-while)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '26/03/2026', titulo: 'Estrutura de repetição (for)', detalhes: ['Instrutores: Miguel e Leandro'] },
          {
            data: '31/03/2026',
            titulo: 'Estrutura de repetição (exercícios)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          { data: '01/04/2026', titulo: 'Funções', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '07/04/2026', titulo: 'Funções (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '08/04/2026', titulo: 'Projeto', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '09/04/2026', titulo: 'Classes e objetos', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '14/04/2026', titulo: 'Classes e objetos (exercícios)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '15/04/2026', titulo: 'Classes e objetos (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'JavaScript para Web',
        duracao: '36 horas',
        topicos: [
          'O que é a DOM e Ferramentas de desenvolvedor',
          'Acessando elementos da página',
          'Manipulando valores de input',
          'Trabalhando com estilos via JavaScript',
          'Desenvolvimento do Projeto',
        ],
        aulas: [
          { data: '16/04/2026', titulo: 'Projeto', detalhes: ['Instrutores: Miguel e Leandro'] },
          {
            data: '22/04/2026',
            titulo: 'O que é a DOM e Ferramentas de desenvolvedor',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '23/04/2026',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores: Miguel e Leandro'],
          },
          { data: '28/04/2026', titulo: 'Acessando elementos da pagina', detalhes: ['Instrutores: Pedro e Diego'] },
          {
            data: '29/04/2026',
            titulo: 'Acessando elementos da pagina (exercícios)',
            detalhes: ['Instrutores: Miguel e Leandro'],
          },
          { data: '30/04/2026', titulo: 'Manipulando valores de input', detalhes: ['Instrutores: Pedro e Diego'] },
          {
            data: '05/05/2026',
            titulo: 'Manipulando valores de input (exercícios)',
            detalhes: ['Instrutores: Miguel e Leandro'],
          },
          {
            data: '06/05/2026',
            titulo: 'Trabalhando com estilos via javascript',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '07/05/2026',
            titulo: 'Trabalhando com estilos via javascript (exercícios)',
            detalhes: ['Instrutores: Miguel e Leandro'],
          },
          { data: '12/05/2026', titulo: 'Exercícios', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '13/05/2026', titulo: 'Projeto', detalhes: ['Instrutores: Miguel e Leandro'] },
          {
            data: '14/05/2026',
            titulo: 'Oficina Softskills: Comportamento em Entrevistas e Networking',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          { data: '19/05/2026', titulo: 'Projeto', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '20/05/2026', titulo: 'O que é API/ O que é JSON', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'Trabalhando com APIs',
        duracao: '46 horas',
        topicos: [
          'O que é API',
          'O que é JSON',
          'Como funciona requisições HTTP',
          'Consumindo uma API (GET)',
          'Conhecendo outros métodos',
          'Inserindo dados via API',
          'Banco de Dados',
          'Desenvolvimento do Projeto',
        ],
        aulas: [
          {
            data: '21/05/2026',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores: Miguel e Leandro'],
          },
          { data: '26/05/2026', titulo: 'Como funciona requisições HTTP', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '27/05/2026', titulo: 'Consumindo uma API (GET)', detalhes: ['Instrutores: Miguel e Leandro'] },
          {
            data: '28/05/2026',
            titulo: 'Consumindo uma API (GET) (exercícios)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          { data: '02/06/2026', titulo: 'Inserindo dados via API', detalhes: ['Instrutores: Miguel e Leandro'] },
          {
            data: '03/06/2026',
            titulo: 'Inserindo dados via API (exercícios)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          { data: '09/06/2026', titulo: 'Conhecendo outros métodos', detalhes: ['Instrutores: Miguel e Leandro'] },
          {
            data: '10/06/2026',
            titulo: 'Conhecendo outros métodos (exercícios)',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
          {
            data: '11/06/2026',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores: Miguel e Leandro'],
          },
          { data: '16/06/2026', titulo: 'Banco de Dados', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '17/06/2026', titulo: 'Banco de Dados', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '18/06/2026', titulo: 'Banco de Dados', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '23/06/2026', titulo: 'Banco de Dados', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '24/06/2026', titulo: 'Banco de Dados', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '25/06/2026', titulo: 'Banco de Dados (exercícios)', detalhes: ['Instrutores: Miguel e Leandro'] },
          {
            data: '30/06/2026',
            titulo: 'Pitch de Projeto: Como Apresentar Suas Ideias',
            detalhes: ['Instrutores: Pedro e Diego'],
          },
        ],
      },
    ],
  },
  {
    id: 'forge',
    titulo: 'FORGE',
    horas: '36 HORAS',
    modulos: [
      {
        nome: 'Introdução',
        duracao: '4 horas',
        topicos: ['Introdução a automação e web-crawlers', 'RPA', 'Diferença entre automação e automatização'],
      },
      {
        nome: 'Tutorial Básico de Forge',
        duracao: '6 horas',
        topicos: ['Editar blocos de entrada e saída', 'Blocos de ações básicas'],
      },
      {
        nome: 'Prática',
        duracao: '14 horas',
        topicos: ['Desenvolvimento de bot', 'Desafio Bot Individual'],
      },
    ],
  },
  {
    id: 'oficinas',
    titulo: 'OFICINAS',
    horas: '15 HORAS',
    modulos: [
      {
        nome: 'Oficina de Currículo e LinkedIn',
        duracao: '3 horas',
        topicos: [],
        aulas: [
          {
            data: '27/08/2025',
            titulo: 'Oficina de Currículo e LinkedIn (Mundiale)',
            detalhes: ['Instrutores presentes: Pedro e Diego'],
          },
        ],
      },
      {
        nome: 'Oficina Softskills: Mentalidade de Crescimento e Autogestão',
        duracao: '3 horas',
        topicos: [],
        aulas: [
          {
            data: '08/10/2025',
            titulo: 'Oficina Softskills: Mentalidade de Crescimento e Autogestão (Mundiale)',
            detalhes: ['Instrutores presentes: Renato e Victor'],
          },
        ],
      },
      {
        nome: 'Oficina Softskills: Trabalho em equipe',
        duracao: '3 horas',
        topicos: [],
        aulas: [
          {
            data: '18/12/2025',
            titulo: 'Oficina Softskills: Trabalho em equipe (Mundiale)',
            detalhes: ['Instrutores presentes: Renato e Emily'],
          },
        ],
      },
      {
        nome: 'Oficina Softskills: Comportamento em Entrevistas e Networking',
        duracao: '3 horas',
        topicos: [],
        nota: 'Aula de 14/05/2026, no módulo JavaScript para Web.',
      },
      {
        nome: 'Pitch de Projeto: Como Apresentar Suas Ideias',
        duracao: '3 horas',
        topicos: [],
        nota: 'Aula de 30/06/2026, no módulo Trabalhando com APIs.',
      },
    ],
  },
  {
    id: 'intervencao',
    titulo: 'INTERVENÇÃO PSICOLÓGICA',
    horas: '15 HORAS',
    modulos: [
      {
        nome: 'Intervenção Psicológica em grupo',
        duracao: '15 horas',
        topicos: [],
        aulas: [
          {
            data: '28/08/2025',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores presentes: Renato e Victor', 'Psicóloga: Alinne Viegas (AOPA)'],
          },
          {
            data: '18/09/2025',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores presentes: Pedro e Diego', 'Psicóloga: Alinne Viegas (AOPA)'],
          },
          {
            data: '09/10/2025',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores presentes: Pedro e Diego', 'Psicóloga: Alinne Viegas (AOPA)'],
          },
          {
            data: '06/11/2025',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores presentes: Renato e Victor', 'Psicóloga: Alinne Viegas (AOPA)'],
          },
          {
            data: '27/11/2025',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores presentes: Renato e Victor', 'Psicóloga: Alinne Viegas (AOPA)'],
          },
          {
            data: '16/12/2025',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores presentes: Renato e Emily', 'Psicóloga: Alinne Viegas (AOPA)'],
          },
          {
            data: '2026',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores presentes: A definir', 'Psicóloga: Alinne Viegas (AOPA)'],
          },
          {
            data: '2026',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores presentes: A definir', 'Psicóloga: Alinne Viegas (AOPA)'],
          },
          {
            data: '2026',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores presentes: A definir', 'Psicóloga: Alinne Viegas (AOPA)'],
          },
          {
            data: '2026',
            titulo: 'Intervenção Psicológica em grupo',
            detalhes: ['Instrutores presentes: A definir', 'Psicóloga: Alinne Viegas (AOPA)'],
          },
        ],
      },
    ],
  },
];

// Trilhas das edições anteriores, conforme o site oficial (só o programa).
// As horas da Edição I estão como no original (a soma dos módulos não bate com o total).
export const edicoesAnteriores: EdicaoAnterior[] = [
  {
    id: 'edicao-1',
    nome: 'TRILHAS - EDIÇÃO I',
    trilhas: [
      {
        id: 't1',
        titulo: '1ª TRILHA: CULTURA E ENCANTAMENTO',
        horas: '90 HORAS',
        modulos: [
          {
            nome: 'Carreira Tech',
            duracao: '3 horas',
            topicos: [
              'A carreira em TI (Ânima Transformação Digital e parceiros)',
              'Como montar um currículo; Trabalho em equipe; Entrevistas de emprego e oratória',
            ],
          },
          {
            nome: 'Mídias Digitais',
            duracao: '3 horas',
            topicos: ['Ferramentas essenciais para o trabalho'],
          },
          {
            nome: 'Inclusão: Mundo Digital',
            duracao: '6 horas',
            topicos: ['Acessar computador; Conceitos de hardware e software'],
          },
          {
            nome: 'Pensamento Lógico',
            duracao: '6 horas',
            topicos: ['Uso de ferramentas e jogos para desenvolver o raciocínio lógico'],
          },
          {
            nome: 'Low Code',
            duracao: '9 horas',
            topicos: ['Criação de histórias, jogos e animações usando ferramentas lúdicas (Scratch/Construct 3)'],
          },
          {
            nome: 'Lógica de programação básica',
            duracao: '48 horas',
            topicos: [
              'Fluxograma, algoritmos, operadores, estrutura de decisão, estrutura de repetição, estrutura de dados simples - Portugol/Python',
            ],
          },
          {
            nome: 'App Inventor/Bubble.io',
            duracao: '9 horas',
            topicos: [
              'Ferramentas de programação baseadas em blocos para construir aplicativos funcionais para dispositivos móveis',
            ],
          },
          {
            nome: 'Desenvolvimento de Projeto',
            duracao: '6 horas',
            topicos: ['Aplicação do conhecimento adquirido na trilha'],
          },
        ],
      },
      {
        id: 't2',
        titulo: '2ª TRILHA: DESENVOLVIMENTO WEB (INICIAL)',
        horas: '80 HORAS',
        modulos: [
          {
            nome: 'Front-end',
            duracao: '40 horas',
            topicos: ['Criação de páginas de site usando Html; CSS; Java Script'],
          },
          {
            nome: 'Back end',
            duracao: '40 horas',
            topicos: ['Banco de dados relacional', 'Ambiente de execução Node JS'],
          },
          {
            nome: 'WitForce',
            duracao: '12 horas',
            topicos: [],
          },
        ],
      },
    ],
  },
  {
    id: 'edicao-2',
    nome: 'TRILHAS - EDIÇÃO II',
    trilhas: [
      {
        id: 't1',
        titulo: '1ª TRILHA: CULTURA E ENCANTAMENTO',
        horas: '60 HORAS',
        modulos: [
          {
            nome: 'Carreira Tech',
            duracao: '4 horas',
            topicos: [
              'Carreira em TI',
              'Como montar um currículo, trabalho em equipe, entrevistas de emprego e oratória',
              'Oficina de LinkedIn, uso de e-mail',
            ],
          },
          {
            nome: 'Inclusão: Mundo Digital',
            duracao: '6 horas',
            topicos: ['Acessar computador', 'Onde buscar os recursos', 'Conceitos de hardware e software'],
          },
          {
            nome: 'Pensamento Lógico',
            duracao: '47 horas',
            topicos: [
              'Introdução ao pensamento lógico',
              'Resolução de problemas de modo geral',
              'Ferramentas que possibilitem o desenvolvimento lógico',
              'Lógica de programação e algoritmos',
              'Correlacionando com Fluxograma',
            ],
          },
          {
            nome: 'Git e GitHub',
            duracao: '3 horas',
            topicos: ['Controle de versão com Git e GitHub'],
          },
          {
            nome: 'Projeto',
            duracao: '2 horas',
            topicos: ['Definição do tema e esboço'],
          },
          {
            nome: 'SoftSkills',
            duracao: '3 horas',
            topicos: ['Oficinas'],
          },
        ],
      },
      {
        id: 't2',
        titulo: '2ª TRILHA: DESENVOLVIMENTO WEB',
        horas: '152 HORAS',
        modulos: [
          {
            nome: 'HTML',
            duracao: '22 horas',
            topicos: [
              'O que é HTML',
              'Cabeçalhos, parágrafos, formatação',
              'Lista ordenada e não ordenada, imagens',
              'Links, formulários',
              'Desenvolvimento do Projeto',
            ],
          },
          {
            nome: 'CSS',
            duracao: '21 horas',
            topicos: [
              'Introdução',
              'Seletores, classes, ids, tags',
              'Fontes, bordas, cores',
              'Formatação, posicionamentos',
              'Desenvolvimento do Projeto',
            ],
          },
          {
            nome: 'JAVASCRIPT',
            duracao: '52 horas',
            topicos: TOPICOS_JAVASCRIPT,
          },
          {
            nome: 'JAVASCRIPT PARA WEB',
            duracao: '26 horas',
            topicos: [
              'O que é a DOM',
              'Ferramentas de desenvolvedor',
              'Acessando elementos da página',
              'Manipulando valores de input',
              'Trabalhando com estilos via JavaScript',
              'Desenvolvimento do Projeto',
            ],
          },
          {
            nome: 'SoftSkills',
            duracao: '2 horas',
            topicos: ['Oficinas'],
          },
          {
            nome: 'Trabalhando com APIs',
            duracao: '29 horas',
            topicos: [
              'O que é API',
              'O que é JSON',
              'Como funciona requisições HTTP',
              'Consumindo uma API (GET)',
              'Conhecendo outros métodos',
              'Inserindo dados via API',
              'Desenvolvimento do Projeto',
            ],
          },
        ],
      },
      {
        id: 't3',
        titulo: '3ª TRILHA: FORGE',
        horas: '24 HORAS',
        modulos: [
          {
            nome: 'Introdução',
            duracao: '4 horas',
            topicos: ['Introdução a automação e web-crawlers', 'RPA', 'Diferença entre automação e automatização'],
          },
          {
            nome: 'Tutorial Básico de Forge',
            duracao: '6 horas',
            topicos: ['Editar blocos de entrada e saída', 'Blocos de ações básicas'],
          },
          {
            nome: 'Prática',
            duracao: '14 horas',
            topicos: ['Desenvolvimento de bot', 'Desafio Bot Individual'],
          },
        ],
      },
      {
        id: 't4',
        titulo: 'INTERVENÇÃO PSICOLÓGICA',
        horas: '40 HORAS',
        modulos: [
          {
            nome: 'Intervenção Psicológica em grupo',
            duracao: '20 horas',
            topicos: [],
          },
          {
            nome: 'Plantão Psicológico',
            duracao: '20 horas',
            topicos: [],
          },
        ],
      },
    ],
  },
];
