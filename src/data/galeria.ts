/**
 * Fotos do site: o destaque da página inicial e a página Galeria, por edição.
 * Os arquivos da Galeria ficam em /imgs/gallery/.
 */
import type { FotoEmDestaque } from '../types';

/** Foto da página Galeria (o caminho é montado a partir do arquivo) */
export interface FotoDaGaleria {
  arquivo: string;
  legenda: string;
}

/** Fotos grandes da página inicial */
export const fotosEmDestaque: FotoEmDestaque[] = [
  {
    id: 1,
    titulo: 'Abertura do Projeto 2022',
    descricao:
      'Abertura do projeto com a professora Samara, Rafaela, Tatiana e Iracema, os parceiros da Mundiale, das Obras Pavonianas e alunos',
    categoria: 'Evento',
    imagem: '/imgs/gallery/AberturaDoProjeto2022.webp',
  },
  {
    id: 2,
    titulo: 'Formatura 2022',
    descricao: 'Formatura do projeto FavelaWare na Mundiale - 2022',
    categoria: 'Formatura',
    imagem: '/imgs/gallery/Formatura2022.webp',
  },
];

export const edicaoAtual: FotoDaGaleria[] = [
  { arquivo: 'break-the-pattern-01.webp', legenda: 'Women Techmakers — Break the Pattern' },
  { arquivo: 'break-the-pattern-02.webp', legenda: 'Plateia do Break the Pattern' },
  { arquivo: 'break-the-pattern-03.webp', legenda: 'Turma no Break the Pattern' },
  { arquivo: 'break-the-pattern-04.webp', legenda: 'Alunas no evento' },
  { arquivo: 'break-the-pattern-05.webp', legenda: 'Lembrança do evento' },
  { arquivo: 'break-the-pattern-06.webp', legenda: 'Palco do Break the Pattern' },
  { arquivo: 'palestra-01.webp', legenda: 'Palestra' },
  { arquivo: 'palestra-02.webp', legenda: 'Palestrante no palco' },
  { arquivo: 'palestra-03.webp', legenda: 'Auditório durante a palestra' },
  { arquivo: 'palestra-04.webp', legenda: 'Mesa de debate' },
  { arquivo: 'devfest-01.webp', legenda: 'DevFest Belo Horizonte' },
  { arquivo: 'devfest-02.webp', legenda: 'Crachás do DevFest' },
  { arquivo: 'devfest-03.webp', legenda: 'Turma no DevOpsDays' },
  { arquivo: 'devfest-04.webp', legenda: 'Participantes do DevOpsDays' },
  { arquivo: 'devfest-05.webp', legenda: 'Equipe no DevOpsDays' },
  { arquivo: 'devfest-06.webp', legenda: 'Google Developer Group BH' },
  { arquivo: 'devfest-07.webp', legenda: 'Alunos no GDG Meet' },
  { arquivo: 'evento-01.jpg', legenda: 'Espaço do evento' },
  { arquivo: 'evento-02.webp', legenda: 'Decoração do evento' },
  { arquivo: 'evento-03.jpg', legenda: 'Estande' },
  { arquivo: 'evento-04.webp', legenda: 'Conversa no estande' },
  { arquivo: 'evento-05.webp', legenda: 'Atividade em grupo' },
  { arquivo: 'turma-sala-01.webp', legenda: 'Primeiro dia de aula' },
  { arquivo: 'turma-sala-02.webp', legenda: 'Primeiro dia de aula' },
  { arquivo: 'turma-sala-03.webp', legenda: 'Turma 2025' },
];

export const segundaEdicao: FotoDaGaleria[] = [
  { arquivo: 'premiacao-01.webp', legenda: 'Prêmio Ser Humano' },
  { arquivo: 'premiacao-02.webp', legenda: 'Entrega do troféu' },
  { arquivo: 'premiacao-03.webp', legenda: 'Equipe premiada' },
  { arquivo: 'edicao-2-01.webp', legenda: 'Turma com os certificados na Mundiale' },
  { arquivo: 'edicao-2-02.webp', legenda: 'Turma com os certificados na Mundiale' },
  { arquivo: 'edicao-2-03.webp', legenda: 'Turma com os certificados na Mundiale' },
  { arquivo: 'edicao-2-04.webp', legenda: 'Turma com os certificados na Mundiale' },
  { arquivo: 'edicao-2-05.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-06.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-07.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-08.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-09.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-10.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-11.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-12.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-13.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-14.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-15.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-16.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-17.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-18.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-19.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-20.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-21.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-22.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-23.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-24.webp', legenda: 'Entrega de certificados' },
  { arquivo: 'edicao-2-25.webp', legenda: 'Entrega de certificados' },
];

export const primeiraEdicao: FotoDaGaleria[] = [
  { arquivo: 'AberturaDoProjeto2022.webp', legenda: 'Abertura do projeto — 2022' },
  { arquivo: 'Formatura2022.webp', legenda: 'Formatura — 2022' },
  { arquivo: 'turma-1-2022-2.webp', legenda: 'Turma 1 — 2022.2' },
  { arquivo: 'edicao-1-01.webp', legenda: 'Convite do evento de abertura' },
  { arquivo: 'edicao-1-02.webp', legenda: 'Convite do encerramento da trilha Cultura e Encantamento' },
  { arquivo: 'edicao-1-03.webp', legenda: 'Turma reunida na abertura' },
  { arquivo: 'edicao-1-04.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
  { arquivo: 'edicao-1-05.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
  { arquivo: 'edicao-1-06.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
  { arquivo: 'edicao-1-07.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
  { arquivo: 'edicao-1-08.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
  { arquivo: 'edicao-1-09.webp', legenda: 'Evento de abertura nas Obras Pavonianas' },
];
