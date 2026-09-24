/**
 * Conteúdo da página Sobre e os números do projeto mostrados na página inicial.
 * A equipe da 3ª edição (equipeEdicaoIII) mora em src/data/hallDaFama.ts: a
 * mesma lista abastece a página Sobre e a 3ª edição do hall.
 */

/**
 * Números do projeto na abertura da página inicial. São escritos à mão: a
 * página Turmas conta os alunos de src/data/turmas.ts, que só tem as turmas
 * publicadas no site.
 */
export const estatisticasDoProjeto = [
  { numero: '150+', rotulo: 'Alunos' },
  { numero: '5+', rotulo: 'Turmas' },
  { numero: '3', rotulo: 'Edições' },
];

// Ordem cronológica, da esquerda para a direita, como no cronograma do site
// oficial: lá cada texto fica alinhado com a data do mesmo ponto da linha.
export const cronograma = [
  { data: '26/05', titulo: 'Início das divulgações' },
  { data: '29/05', titulo: 'Pré-inscrições para as oficinas' },
  { data: '11/06', titulo: 'Oficina Mundo Tech' },
  { data: '18/06', titulo: 'Oficina Developer na Prática' },
  { data: '25/06', titulo: 'Oficina ChatBot e IA' },
  { data: '25/06', titulo: 'Inscrições FavelaWare' },
  { data: '05/08', titulo: 'Início das aulas' },
  { data: '01/08/26', titulo: 'Formatura' },
];

export const idealizadores = [
  { nome: 'Gustavo Pena', cargo: 'Idealizador', organizacao: 'Mundiale', foto: '/imgs/team/gustavo.webp' },
  { nome: 'Cristiane de Ávila', cargo: 'Idealizadora', organizacao: 'Mundiale', foto: '/imgs/team/cristiane.webp' },
  { nome: 'Diomar', cargo: 'Idealizador', organizacao: 'AOPA', foto: '/imgs/team/diomar.webp' },
  {
    nome: 'Rafaela Moreira',
    cargo: 'Idealizadora e Orientadora',
    organizacao: 'Ânima',
    foto: '/imgs/team/rafaela.webp',
    linkedin: 'https://www.linkedin.com/in/rafaelapcmoreira/',
  },
  { nome: 'Samara Leal', cargo: 'Idealizadora', organizacao: 'Ânima', foto: '/imgs/team/samara.webp' },
].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); // sempre em ordem alfabética

export const propositos = [
  {
    titulo: 'Acadêmico',
    descricao:
      'Proporcionar aos alunos de TI da Una Cristiano Machado compartilhar as habilidades adquiridas nos cursos.',
    cor: 'text-pink-500',
  },
  {
    titulo: 'Social',
    descricao: 'Gerar mudanças na realidade de jovens de comunidades vulneráveis.',
    cor: 'text-pink-500',
  },
  {
    titulo: 'Carreira',
    descricao: 'Fornecer experiência prática, abrindo um novo caminho para o futuro da carreira de tecnologia.',
    cor: 'text-pink-500',
  },
];
