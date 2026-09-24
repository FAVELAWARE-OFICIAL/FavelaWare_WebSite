/**
 * Parceiros e idealizadores do FavelaWare.
 * Fonte única para a página inicial (grade de logos) e para a página Sobre.
 */
import type { Parceiro } from '../types';

export const parceiros: Parceiro[] = [
  {
    nome: 'Mundiale',
    emoji: '🌍',
    imagem: '/imgs/partners/Mundiale.webp',
    descricao:
      'Com a união de pessoas, tecnologia e uma metodologia própria, a Mundiale revoluciona a relação entre marcas e consumidores por meio de canais digitais, proporcionando interações mais humanas, assertivas e fluidas.',
    site: 'https://mundiale.com.br',
  },
  {
    nome: 'AOPA',
    emoji: '👥',
    imagem: '/imgs/partners/AOPA.webp',
    descricao:
      'A AOPA é uma instituição social católica dos Religiosos Pavonianos, que, pela experiência de seu fundador, São Ludovico Pavoni, dedica-se ao atendimento integral de crianças e adolescentes.',
    site: 'https://www.pavonianos.org.br/unidade/aopabh',
  },
  {
    nome: 'Ecossistema Ânima Educação',
    emoji: '🌱',
    imagem: '/imgs/partners/ecossistema ânima.webp',
    descricao:
      'O Ecossistema Ânima Educação é uma das maiores organizações educacionais privadas de ensino superior do Brasil, com cerca de 330 mil estudantes e 18 mil educadores e educadoras.',
    site: 'https://animaeducacao.com.br',
  },
  {
    nome: 'UNA Cristiano Machado',
    emoji: '🎓',
    imagem: '/imgs/partners/Una Cristiano Machado.webp',
    descricao:
      'A Una Cristiano Machado é uma das instituições da Ânima com compromisso de oferecer educação de qualidade, focada na formação acadêmica sólida e inovadora.',
    site: 'https://una.br',
  },
  {
    // O site oficial não traz descrição do Ânima Lab (só o rodapé "Site criado
    // pela equipe Ânima Hub"): texto provisório, a confirmar com a coordenação
    nome: 'Ânima Lab',
    emoji: '🎨',
    imagem: '/imgs/partners/ânima.webp',
    descricao:
      'O Ânima Lab faz parte do Ecossistema Ânima Educação. A equipe Ânima Hub criou o site oficial do FavelaWare.',
  },
  {
    nome: 'Rede Transformar',
    emoji: '🔄',
    imagem: '/imgs/partners/Rede Transformar.webp',
    descricao:
      'A REDE TRANSFORMAR é uma organização sem fins lucrativos que desenvolve programas, projetos e ações de assessoramento, defesa e garantia de direitos sociais.',
  },
].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })); // sempre em ordem alfabética
