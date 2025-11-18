/**
 * ============================================
 * TIPOS CUSTOMIZADOS (types.ts)
 * ============================================
 *
 * Este arquivo define os tipos TypeScript usados no projeto.
 * TypeScript adiciona tipagem ao JavaScript, ajudando a prevenir erros.
 *
 * Conceitos importantes:
 * - interface: define a estrutura de um objeto
 * - type: cria um tipo customizado
 * - Tipagem ajuda o editor a mostrar erros antes de executar o código
 */

/**
 * TIPO: Foto da Galeria
 * Define a estrutura de cada foto exibida na galeria
 */
export interface Photo {
  id: number;              // Identificador único da foto
  title: string;           // Título da foto
  description: string;     // Descrição detalhada
  category: string;        // Categoria (Evento, Formatura, etc)
  image: string;           // Caminho para a imagem
}

/**
 * TIPO: Parceiro/Idealizador
 * Define a estrutura de cada parceiro do projeto
 */
export interface Partner {
  name: string;            // Nome do parceiro
  logo: string;            // Emoji ou ícone
  image?: string;          // Caminho para logo (opcional)
}

/**
 * TIPO: Parceiro Detalhado (página Sobre)
 * Versão estendida com informações completas
 */
export interface DetailedPartner extends Partner {
  descricao: string;       // Descrição do parceiro
  link: string;            // Link para site
}

/**
 * TIPO: Link Social
 * Define links de redes sociais no footer
 */
export interface SocialLink {
  name: string;            // Nome da rede social
  icon: string;            // Emoji ou ícone
  href: string;            // URL do link
  color: string;           // Classes de cor (Tailwind)
}

/**
 * TIPO: Evento do Cronograma
 * Define cada evento na timeline
 */
export interface TimelineEvent {
  titleTop: string;        // Título superior
  dateTop: string;         // Data superior
  titleBottom: string;     // Título inferior
  dateBottom: string;      // Data inferior
  posicao?: number;        // Posição na timeline (opcional)
}

/**
 * TIPO: Item do Cronograma (versão Sobre)
 */
export interface CronogramaItem {
  data: string;            // Data do evento
  titulo: string;          // Título do evento
  subtitulo: string;       // Subtítulo (opcional)
  subtituloTexto: string;  // Texto do subtítulo
  posicao: number;         // Posição na timeline
}

/**
 * TIPO: Idealizador
 * Define cada membro fundador do projeto
 */
export interface Idealizador {
  nome: string;            // Nome completo
  cargo: string;           // Cargo/função
  organizacao: string;     // Organização
  foto?: string;           // Foto (opcional)
}

/**
 * TIPO: Propósito
 * Define os propósitos do projeto
 */
export interface Proposito {
  titulo: string;          // Título do propósito
  descricao: string;       // Descrição
  cor: string;             // Classe de cor (Tailwind)
}

/**
 * TIPO: Membro da Equipe
 * Define membros das equipes passadas
 */
export interface TeamMember {
  nome: string;            // Nome do membro
  cargo: string;           // Cargo/função
  foto: string | null;     // Foto (pode ser null)
}

/**
 * TIPO: Equipe por Ano
 * Agrupa membros por ano
 */
export interface YearTeam {
  ano: string;             // Ano da equipe
  membros: TeamMember[];   // Array de membros
}

/**
 * TIPO: Tópico de Módulo
 * Tópicos ensinados em cada módulo
 */
export type Topico = string;

/**
 * TIPO: Módulo de Ensino
 * Define um módulo dentro de uma trilha
 */
export interface Modulo {
  nome: string;            // Nome do módulo
  duracao: string;         // Duração (ex: "18 horas")
  topicos: Topico[];       // Lista de tópicos
}

/**
 * TIPO: Trilha de Ensino
 * Define uma trilha completa do projeto
 */
export interface Trilha {
  id: number;              // ID único
  titulo: string;          // Título da trilha
  horas: string;           // Total de horas
  modulos: Modulo[];       // Módulos da trilha
}

/**
 * TIPO: Edição Anterior
 * Define edições passadas do projeto
 */
export interface EdicaoAnterior {
  nome: string;            // Nome da edição
  ano: string;             // Ano
}

/**
 * TIPO: Estatística do Projeto
 * Números exibidos no Hero
 */
export interface Estatistica {
  number: string;          // Número (ex: "150+")
  label: string;           // Rótulo (ex: "Alunos")
}

/**
 * TIPO: Material/Recurso Educacional
 * Define materiais disponíveis para download (Google Drive, Gitbook, etc)
 */
export interface Material {
  id: number;              // ID único
  titulo: string;          // Título do material
  descricao: string;       // Descrição breve
  plataforma: 'drive' | 'gitbook'; // Plataforma onde está hospedado
  link: string;            // URL do material
  icone: string;           // Emoji ou ícone
}

/**
 * TIPO: Entrega de Atividade
 * Define as informações de uma entrega de atividade pelo aluno
 */
export interface Entrega {
  nomeAluno: string;       // Nome do aluno
  emailAluno: string;      // Email do aluno
  nomeAtividade: string;   // Nome/título da atividade
  arquivo: File;           // Arquivo PDF da atividade
  dataEntrega: Date;       // Data e hora da entrega
}

/**
 * TIPO: Artigo Científico
 * Define artigos publicados sobre o projeto
 */
export interface ArtigoCientifico {
  id: number;              // ID único
  titulo: string;          // Título do artigo
  descricao: string;       // Descrição/resumo
  doi: string;             // DOI ou link do artigo
  ano: string;             // Ano de publicação
  icone: string;           // Emoji ou ícone
}

/**
 * TIPO: Prêmio/Reconhecimento
 * Define prêmios e reconhecimentos recebidos
 */
export interface Premio {
  id: number;              // ID único
  titulo: string;          // Nome do prêmio
  descricao: string;       // Descrição do prêmio
  ano: string;             // Ano de recebimento
  link?: string;           // Link para mais informações (opcional)
  imagens: string[];       // Array de caminhos de imagens
  icone: string;           // Emoji ou ícone
}

/**
 * TIPO: Informação de Contato
 * Define dados de contato (email, telefone, endereço)
 */
export interface ContatoInfo {
  tipo: 'email' | 'telefone' | 'endereco'; // Tipo de contato
  titulo: string;          // Título da seção
  valor: string;           // Valor do contato (email, número, endereço)
  link?: string;           // Link (mailto:, tel:, etc) - opcional
  icone: string;           // Emoji ou ícone
}
