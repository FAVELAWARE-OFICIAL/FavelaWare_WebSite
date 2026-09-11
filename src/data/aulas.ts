/**
 * ============================================
 * DADOS DAS AULAS (EDIÇÃO III)
 * ============================================
 *
 * Cronograma completo das aulas, copiado da página AULAS do site oficial
 * (favelaware.animahub.com.br/aulas). Os textos estão como lá, só com os
 * espaços normalizados.
 *
 * Para mudar uma aula, edite só este arquivo: a página Aulas desenha tudo
 * a partir desta lista.
 *
 * - detalhes: as linhas que aparecem embaixo da aula (instrutores,
 *   psicóloga...), exatamente como no site oficial.
 * - Módulo sem nome: a trilha lista as aulas direto, sem subtítulo
 *   (Oficinas e Intervenção Psicológica).
 */

export interface Aula {
  data: string;
  titulo: string;
  detalhes: string[];
}

export interface ModuloAulas {
  nome?: string;
  aulas: Aula[];
}

export interface TrilhaAulas {
  titulo: string;
  modulos: ModuloAulas[];
}

export const trilhasAulas: TrilhaAulas[] = [
  {
    titulo: '1ª TRILHA: CULTURA E ENCANTAMENTO - 57 HORAS',
    modulos: [
      {
        nome: 'Carreira Tech',
        aulas: [
          { data: '05/08/2025', titulo: 'Apresentação e Carreira em TI', detalhes: ['Instrutores: Ivan (AOPA).'] },
        ],
      },
      {
        nome: 'Inclusão: Mundo Digital',
        aulas: [
          { data: '06/08/2025', titulo: 'Acessar computador', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '07/08/2025', titulo: 'Onde buscar os recursos', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '12/08/2025', titulo: 'Conceitos de Hardware e Software', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '13/08/2025', titulo: 'Conceitos de Hardware e Software (Aula Prática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '14/08/2025', titulo: 'Uso de e-mail e Ferramentas Google', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '19/08/2025', titulo: 'Uso de e-mail e Ferramentas Google', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'Pensamento Lógico',
        aulas: [
          { data: '20/08/2025', titulo: 'Introdução ao pensamento lógico', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '21/08/2025', titulo: 'Resolução de problemas de modo geral (matemática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '26/08/2025', titulo: 'Resolução de problemas de modo geral (dinâmica)', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '27/08/2025', titulo: 'Oficina de Currículo e LinkedIn (Mundiale)', detalhes: ['Instrutores presentes: Pedro e Diego'] },
          { data: '28/08/2025', titulo: 'Resolução de problemas de modo geral (jogos)', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '02/09/2025', titulo: 'Ferramentas que possibilitem o desenvolvimento lógico', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '03/09/2025', titulo: 'Ferramentas que possibilitem o desenvolvimento lógico', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '04/09/2025', titulo: 'Ferramentas que possibilitem o desenvolvimento lógico', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'Git e GitHub',
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
    titulo: '2ª TRILHA: DESENVOLVIMENTO WEB - 152 HORAS',
    modulos: [
      {
        nome: 'HTML',
        aulas: [
          { data: '17/09/2025', titulo: 'O que é HTML', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '18/09/2025', titulo: 'Cabeçalhos, parágrafos, formatação', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '23/09/2025', titulo: 'Cabeçalhos, parágrafos, formatação (Prática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '24/09/2025', titulo: 'Lista ordenada e não ordenada, imagens', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '25/09/2025', titulo: 'Lista ordenada e não ordenada, imagens (Prática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '30/09/2025', titulo: 'Links, formulários', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '01/10/2025', titulo: 'Links, formulários (Prática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '02/10/2025', titulo: 'Desenvolvimento desafio HTML', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '07/10/2025', titulo: 'Desenvolvimento desafio HTML', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '08/10/2025', titulo: 'Oficina Softskills: Mentalidade de Crescimento e Autogestão (Mundiale)', detalhes: ['Instrutores presentes: Renato e Victor'] },
          { data: '09/10/2025', titulo: 'Desenvolvimento desafio HTML', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'Introdução Forge Chatbot e IA',
        aulas: [
          { data: '21/10/2025', titulo: 'Introdução ao desenvolvimento de IA em ChatBot', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '22/10/2025', titulo: 'Chatbot Analytics', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '23/10/2025', titulo: 'Chatbot Analytics', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '28/10/2025', titulo: 'Introdução a automação e web-crawlers, RPA, Diferença entre automação e automatização', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '29/10/2025', titulo: 'Forge', detalhes: ['Instrutores: Renato e Victor'] },
          { data: '30/10/2025', titulo: 'Forge', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'CSS',
        aulas: [
          { data: '05/11/2025', titulo: 'Introdução', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '06/11/2025', titulo: 'Seletores, classes, ids, tags', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '11/11/2025', titulo: 'Projeto - Definição e Esboço', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '12/11/2025', titulo: 'Seletores, classes, ids, tags (Prática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '13/11/2025', titulo: 'Formatação, posicionamentos', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '18/11/2025', titulo: 'Formatação, posicionamentos (Prática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '19/11/2025', titulo: 'Fontes, bordas, cores', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '20/11/2025', titulo: 'Fontes, bordas, cores (Prática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '25/11/2025', titulo: 'Exercícios', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '26/11/2025', titulo: 'Exercícios', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '27/11/2025', titulo: 'Exercícios', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '02/12/2025', titulo: 'Projeto', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'LÓGICA DE PROGRAMAÇÃO',
        aulas: [
          { data: '03/12/2025', titulo: 'Lógica de programação e algoritmos', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '04/12/2025', titulo: 'Lógica de programação e algoritmos (Prática)', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '09/12/2025', titulo: 'Lógica de programação e algoritmos', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '10/12/2025', titulo: 'Lógica de programação e algoritmos (Prática)', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '11/12/2025', titulo: 'Correlacionando com Fluxograma (Moqups e Draw.io)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '16/12/2025', titulo: 'Projeto', detalhes: ['Instrutores: Renato e Emily'] },
          { data: '17/12/2025', titulo: 'Correlacionando com Fluxograma (Prática)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '18/12/2025', titulo: 'Oficina Softskills: Trabalho em equipe (Mundiale)', detalhes: ['Instrutores presentes: Renato e Emily'] },
        ],
      },
    ],
  },
  {
    titulo: '3° TRILHA: FUNDAMENTOS DE DESENVOLVIMENTO WEB COM JAVASCRIPT',
    modulos: [
      {
        nome: 'JAVASCRIPT',
        aulas: [
          { data: '24/02/2026', titulo: 'Variáveis, concatenação', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '25/02/2026', titulo: 'Operadores (aritméticos, relacionais, lógico, ternário)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '26/02/2026', titulo: 'Estrutura Condicional (if-else)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '03/03/2026', titulo: 'Estrutura Condicional (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '04/03/2026', titulo: 'Projeto', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '05/03/2026', titulo: 'Estrutura Condicional (switch-case)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '10/03/2026', titulo: 'Estrutura Condicional (exercícios)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '11/03/2026', titulo: 'Array', detalhes: ['Mundiale'] },
          { data: '12/03/2026', titulo: 'Array', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '17/03/2026', titulo: 'Array (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '18/03/2026', titulo: 'Estrutura de repetição (while)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '19/03/2026', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '24/03/2026', titulo: 'Estrutura de repetição (exercícios)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '25/03/2026', titulo: 'Estrutura de repetição (do-while)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '26/03/2026', titulo: 'Estrutura de repetição (for)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '31/03/2026', titulo: 'Estrutura de repetição (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '01/04/2026', titulo: 'Funções', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '07/04/2026', titulo: 'Funções (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '08/04/2026', titulo: 'Projeto', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '09/04/2026', titulo: 'Classes e objetos', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '14/04/2026', titulo: 'Classes e objetos (exercícios)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '15/04/2026', titulo: 'Classes e objetos (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'JAVASCRIPT PARA WEB',
        aulas: [
          { data: '16/04/2026', titulo: 'Projeto', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '22/04/2026', titulo: 'O que é a DOM e Ferramentas de desenvolvedor', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '23/04/2026', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '28/04/2026', titulo: 'Acessando elementos da pagina', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '29/04/2026', titulo: 'Acessando elementos da pagina (exercícios)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '30/04/2026', titulo: 'Manipulando valores de input', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '05/05/2026', titulo: 'Manipulando valores de input (exercícios)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '06/05/2026', titulo: 'Trabalhando com estilos via javascript', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '07/05/2026', titulo: 'Trabalhando com estilos via javascript (exercícios)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '12/05/2026', titulo: 'Exercícios', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '13/05/2026', titulo: 'Projeto', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '14/05/2026', titulo: 'Oficina Softskills: Comportamento em Entrevistas e Networking', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '19/05/2026', titulo: 'Projeto', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '20/05/2026', titulo: 'O que é API/ O que é JSON', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
      {
        nome: 'TRABALHANDO COM APIS',
        aulas: [
          { data: '21/05/2026', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '26/05/2026', titulo: 'Como funciona requisições HTTP', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '27/05/2026', titulo: 'Consumindo uma API (GET)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '28/05/2026', titulo: 'Consumindo uma API (GET) (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '02/06/2026', titulo: 'Inserindo dados via API', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '03/06/2026', titulo: 'Inserindo dados via API (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '09/06/2026', titulo: 'Conhecendo outros métodos', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '10/06/2026', titulo: 'Conhecendo outros métodos (exercícios)', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '11/06/2026', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '16/06/2026', titulo: 'Banco de Dados', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '17/06/2026', titulo: 'Banco de Dados', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '18/06/2026', titulo: 'Banco de Dados', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '23/06/2026', titulo: 'Banco de Dados', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '24/06/2026', titulo: 'Banco de Dados', detalhes: ['Instrutores: Pedro e Diego'] },
          { data: '25/06/2026', titulo: 'Banco de Dados (exercícios)', detalhes: ['Instrutores: Miguel e Leandro'] },
          { data: '30/06/2026', titulo: 'Pitch de Projeto: Como Apresentar Suas Ideias', detalhes: ['Instrutores: Pedro e Diego'] },
        ],
      },
    ],
  },
  {
    titulo: 'OFICINAS - 15 HORAS',
    modulos: [
      {
        aulas: [
          { data: '27/08/2025', titulo: 'Oficina de Currículo e LinkedIn (Mundiale)', detalhes: ['Instrutores presentes: Pedro e Diego'] },
          { data: '08/10/2025', titulo: 'Oficina Softskills: Mentalidade de Crescimento e Autogestão (Mundiale)', detalhes: ['Instrutores presentes: Renato e Victor'] },
          { data: '18/12/2025', titulo: 'Oficina Softskills: Trabalho em equipe (Mundiale)', detalhes: ['Instrutores presentes: Renato e Emily'] },
        ],
      },
    ],
  },
  {
    titulo: 'INTERVENÇÃO PSICOLÓGICA - 15 HORAS',
    modulos: [
      {
        aulas: [
          { data: '28/08/2025', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores presentes: Renato e Victor', 'Psicóloga: Alinne Viegas (AOPA)'] },
          { data: '18/09/2025', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores presentes: Pedro e Diego', 'Psicóloga: Alinne Viegas (AOPA)'] },
          { data: '09/10/2025', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores presentes: Pedro e Diego', 'Psicóloga: Alinne Viegas (AOPA)'] },
          { data: '06/11/2025', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores presentes: Renato e Victor', 'Psicóloga: Alinne Viegas (AOPA)'] },
          { data: '27/11/2025', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores presentes: Renato e Victor', 'Psicóloga: Alinne Viegas (AOPA)'] },
          { data: '16/12/2025', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores presentes: Renato e Emily', 'Psicóloga: Alinne Viegas (AOPA)'] },
          { data: '2026', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores presentes: A definir', 'Psicóloga: Alinne Viegas (AOPA)'] },
          { data: '2026', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores presentes: A definir', 'Psicóloga: Alinne Viegas (AOPA)'] },
          { data: '2026', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores presentes: A definir', 'Psicóloga: Alinne Viegas (AOPA)'] },
          { data: '2026', titulo: 'Intervenção Psicológica em grupo', detalhes: ['Instrutores presentes: A definir', 'Psicóloga: Alinne Viegas (AOPA)'] },
        ],
      },
    ],
  },
];
