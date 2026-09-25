import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => import('../testes/supabaseFalso'));

import { contarPessoas } from '../data/hallDaFama';
import { consultaFalha, removerDoStorage } from '../testes/supabaseFalso';
import { servicoAtestados } from './atestados';
import { notasCompletas, servicoAvaliacoes, somaDasNotas } from './avaliacoes';
import { servicoEdicoes } from './edicoes';
import { comZoom, enquadramentoPadrao, recorteDaFoto, servicoFotoPadronizada, ZOOM_MAXIMO } from './fotoPadronizada';
import { servicoMaterial } from './material';
import { mensagemDeErroDeCadastro } from './banco';
import { validarDados, type DadosInstrutor } from './dadosInstrutor';
import { SEM_REGRAS, servicoEntregas } from './entregas';
import { QUANTIDADE_NO_HISTORICO, servicoPonto, type Ponto } from './ponto';
import { senhaForte, servicoSenha } from './senha';
import { servicoPerfil } from './perfil';
import { servicoSessao, type MeuPerfil } from './sessao';
import { semQuemJaAparece, servicoSitePublico } from './sitePublico';
import { servicoSolicitacoes } from './solicitacoes';

const perfil = (mudancas: Partial<MeuPerfil>): MeuPerfil => ({
  papel: null,
  nome: null,
  foto: null,
  participanteId: null,
  precisaTrocarSenha: false,
  podeAlternarPapel: false,
  ...mudancas,
});

describe('sessão: área de cada papel', () => {
  it('parceiro usa a área do gestor, só para ver', () => {
    expect(servicoSessao.destinoDoPerfil(perfil({ papel: 'parceiro' }))).toBe('/dashboard');
    expect(servicoSessao.somenteLeitura(perfil({ papel: 'parceiro' }))).toBe(true);
    expect(servicoSessao.somenteLeitura(perfil({ papel: 'gestor' }))).toBe(false);
  });

  it('colaborador usa a área do gestor: lê a edição e não corrige entregas', () => {
    expect(servicoSessao.destinoDoPerfil(perfil({ papel: 'colaborador' }))).toBe('/dashboard');
    expect(servicoSessao.somenteLeitura(perfil({ papel: 'colaborador' }))).toBe(true);
    expect(servicoSessao.corrigeEntregas(perfil({ papel: 'colaborador' }))).toBe(false);
    expect(servicoSessao.corrigeEntregas(perfil({ papel: 'parceiro' }))).toBe(false);
    expect(servicoSessao.corrigeEntregas(perfil({ papel: 'gestor' }))).toBe(true);
    expect(servicoSessao.corrigeEntregas(perfil({ papel: 'professor' }))).toBe(true);
  });

  it('alcance na área do gestor: gestor tudo, colaborador e parceiro só as páginas deles', () => {
    const acesso = (papel: MeuPerfil['papel']) => servicoSessao.acessoNaAreaDoGestor(perfil({ papel }));
    expect(acesso('gestor')).toBe('gestor');
    expect(acesso('colaborador')).toBe('colaborador');
    // Qualquer outro papel (ou nenhum) cai no mínimo
    for (const papel of ['parceiro', 'professor', 'aluno', 'banca', null] as const)
      expect(acesso(papel)).toBe('parceiro');

    const abre = servicoSessao.podeAbrir.bind(servicoSessao);
    for (const caminho of [
      '/dashboard/membros',
      '/dashboard/avaliacoes',
      '/dashboard/equipe',
      '/dashboard/presenca-professores',
    ])
      expect(abre('gestor', caminho)).toBe(true);
    for (const caminho of ['/dashboard/turmas', '/dashboard/solicitacoes', '/dashboard/trilhas']) {
      expect(abre('colaborador', caminho)).toBe(true);
      expect(abre('parceiro', caminho)).toBe(false);
    }
    for (const caminho of [
      '/dashboard/membros',
      '/dashboard/avaliacoes',
      '/dashboard/equipe',
      '/dashboard/presenca-professores',
    ]) {
      expect(abre('colaborador', caminho)).toBe(false);
      expect(abre('parceiro', caminho)).toBe(false);
    }
    for (const caminho of ['/dashboard', '/dashboard/alunos', '/dashboard/chamada', '/dashboard/perfil'])
      expect(abre('parceiro', caminho)).toBe(true);
  });

  it('gestor e professor vão para a área deles', () => {
    expect(servicoSessao.destinoDoPerfil(perfil({ papel: 'gestor' }))).toBe('/dashboard');
    expect(servicoSessao.destinoDoPerfil(perfil({ papel: 'professor' }))).toBe('/professor');
  });

  it('aluno só tem área ligado a uma turma (ou vendo como aluno)', () => {
    expect(servicoSessao.destinoDoPerfil(perfil({ papel: 'aluno' }))).toBeNull();
    expect(servicoSessao.destinoDoPerfil(perfil({ papel: 'aluno', participanteId: 5 }))).toBe('/aluno');
    expect(servicoSessao.destinoDoPerfil(perfil({ papel: 'aluno', podeAlternarPapel: true }))).toBe('/aluno');
    expect(servicoSessao.destinoDoPerfil(perfil({ papel: 'aluno', participanteId: 5, precisaTrocarSenha: true }))).toBe(
      '/primeiro-acesso',
    );
  });

  it('login do aluno vira o e-mail interno e volta', () => {
    expect(servicoSessao.emailDoIdentificador(' Maria.Silva ')).toBe('maria.silva@aluno.favelaware.invalid');
    expect(servicoSessao.emailDoIdentificador('equipe@favelaware.com')).toBe('equipe@favelaware.com');
    expect(servicoSessao.identificadorDoEmail('maria.silva@aluno.favelaware.invalid')).toBe('maria.silva');
    expect(servicoSessao.identificadorDoEmail('equipe@favelaware.com')).toBe('equipe@favelaware.com');
  });
});

describe('senha nova', () => {
  it('exige 8 caracteres com maiúscula, minúscula, número e caractere especial', () => {
    expect(servicoSenha.validarNova('Ab1!', 'Ab1!')).toBe('A senha precisa ter: pelo menos 8 caracteres.');
    expect(servicoSenha.validarNova('abcdefgh', 'abcdefgh')).toBe(
      'A senha precisa ter: uma letra maiúscula, um número, um caractere especial (ex.: ! @ # $ %).',
    );
    expect(servicoSenha.validarNova('ABCDEFG1!', 'ABCDEFG1!')).toBe('A senha precisa ter: uma letra minúscula.');
    expect(servicoSenha.validarNova('Favela2026', 'Favela2026')).toBe(
      'A senha precisa ter: um caractere especial (ex.: ! @ # $ %).',
    );
    expect(servicoSenha.validarNova('Favela#2026', 'Favela#2026')).toBeNull();
  });

  it('confere a confirmação com o texto de cada tela', () => {
    expect(servicoSenha.validarNova('Favela#2026', 'Favela#2025', 'A nova senha', 'As duas senhas novas')).toBe(
      'As duas senhas novas não são iguais.',
    );
  });

  it('aceita os símbolos do teclado que o Supabase aceita', () => {
    for (const simbolo of ['!', '@', '#', '$', '%', '&', '*', '_', '-', '.', '?', '/', '[', '~', '`', '{']) {
      expect(senhaForte(`Favela2026${simbolo}`)).toBe(true);
    }
    expect(senhaForte('Favela2026 ')).toBe(false); // espaço não conta como especial
    expect(senhaForte('Fávela2026')).toBe(false); // letra acentuada não conta como especial
  });
});

describe('ponto: dia fora do histórico carregado', () => {
  const ponto = (data: string): Ponto => ({
    professor_id: 'p',
    data,
    situacao: 'presente',
    registrado_em: data,
    justificativa: null,
    atestado_id: null,
  });

  it('histórico incompleto cobre qualquer dia', () => {
    expect(servicoPonto.diaEstaNoHistorico([ponto('2026-03-10')], '2020-01-01')).toBe(true);
  });

  it('histórico cheio não cobre dia mais antigo que o último da lista', () => {
    const cheio = Array.from({ length: QUANTIDADE_NO_HISTORICO }, (_, i) =>
      ponto(`2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, '0')}`),
    ).reverse();
    const maisAntigo = cheio[cheio.length - 1].data;
    expect(servicoPonto.diaEstaNoHistorico(cheio, maisAntigo)).toBe(true);
    expect(servicoPonto.diaEstaNoHistorico(cheio, '2025-12-31')).toBe(false);
  });
});

describe('entregas: conferência antes de enviar', () => {
  const arquivo = (tipo: string, tamanho = 10) => new File([new Uint8Array(tamanho)], 'x', { type: tipo });

  it('pede alguma coisa para entregar', () => {
    expect(servicoEntregas.validar({ comentario: ' ', link: '', arquivo: null }, SEM_REGRAS)).toBe(
      'Envie um link, um texto ou um arquivo.',
    );
  });

  it('confere o tipo de link pedido', () => {
    const regras = { ...SEM_REGRAS, exige_link: true, tipo_link: 'github' as const };
    expect(servicoEntregas.validar({ comentario: 'Minha resposta', link: '', arquivo: null }, regras)).toBe(
      'Esta atividade pede o link do GitHub.',
    );
    expect(servicoEntregas.validar({ comentario: '', link: 'https://gitlab.com/x', arquivo: null }, regras)).toBe(
      'O link precisa ser do GitHub (https://github.com/...).',
    );
    expect(servicoEntregas.validar({ comentario: '', link: 'https://github.com/x', arquivo: null }, regras)).toBeNull();
  });

  it('confere formato e tamanho do arquivo', () => {
    const soPdf = { ...SEM_REGRAS, formatos: ['pdf' as const] };
    expect(servicoEntregas.validar({ comentario: '', link: '', arquivo: arquivo('image/png') }, soPdf)).toBe(
      'Formato não aceito nesta atividade. Use PDF.',
    );
    expect(
      servicoEntregas.validar(
        { comentario: '', link: '', arquivo: arquivo('application/pdf', 11 * 1024 * 1024) },
        soPdf,
      ),
    ).toBe('O arquivo passa de 10 MB.');
  });
});

describe('fotos enviadas e não salvas', () => {
  const original = 'http://localhost:54321/storage/v1/object/public/fotos-alunos/original.webp';
  const nova = 'http://localhost:54321/storage/v1/object/public/fotos-alunos/nova.webp';

  it('apaga a foto enviada agora e nunca a que o aluno já tinha', async () => {
    removerDoStorage.mockClear();
    await servicoFotoPadronizada.descartarNaoSalva(original, original);
    await servicoFotoPadronizada.descartarNaoSalva(null, original);
    expect(removerDoStorage).not.toHaveBeenCalled();
    await servicoFotoPadronizada.descartarNaoSalva(nova, original);
    expect(removerDoStorage).toHaveBeenCalledWith(['nova.webp']);
  });

  it('foto do site (em /imgs) nunca vai para o Storage', async () => {
    removerDoStorage.mockClear();
    await servicoFotoPadronizada.descartarNaoSalva('/imgs/team/ana.webp', null);
    expect(removerDoStorage).not.toHaveBeenCalled();
  });

  it('URL de outro endereço com o mesmo caminho nunca apaga nada do nosso bucket', async () => {
    removerDoStorage.mockClear();
    await servicoFotoPadronizada.descartarNaoSalva(
      'https://outro.exemplo/storage/v1/object/public/fotos-alunos/x.webp',
      null,
    );
    expect(removerDoStorage).not.toHaveBeenCalled();
  });
});

describe('troca de foto', () => {
  const antiga = 'http://localhost:54321/storage/v1/object/public/fotos-alunos/perfis/antiga.webp';
  const nova = 'http://localhost:54321/storage/v1/object/public/fotos-alunos/perfis/nova.webp';
  const arquivo = new File(['x'], 'foto.png', { type: 'image/png' });

  it('gravou: a antiga sai do Storage e volta a nova', async () => {
    removerDoStorage.mockClear();
    vi.spyOn(servicoFotoPadronizada, 'enviar').mockResolvedValueOnce(nova);
    const gravar = vi.fn(async () => {});
    expect(await servicoFotoPadronizada.trocar(arquivo, 'perfis', gravar, antiga)).toBe(nova);
    expect(gravar).toHaveBeenCalledWith(nova);
    expect(removerDoStorage).toHaveBeenCalledWith(['perfis/antiga.webp']);
    expect(removerDoStorage).not.toHaveBeenCalledWith(['perfis/nova.webp']);
  });

  it('o ajuste de zoom e posição chega até o envio; sem ajuste, segue o recorte padrão', async () => {
    const enviar = vi.spyOn(servicoFotoPadronizada, 'enviar').mockResolvedValue(nova);
    const gravar = vi.fn(async () => {});
    await servicoFotoPadronizada.trocar(arquivo, 'perfis', gravar, null, { zoom: 2, x: 0, y: 1 });
    expect(enviar).toHaveBeenLastCalledWith(arquivo, 'perfis', { zoom: 2, x: 0, y: 1 });
    await servicoFotoPadronizada.trocar(arquivo, 'equipe', gravar, null);
    expect(enviar).toHaveBeenLastCalledWith(arquivo, 'equipe', undefined);
    enviar.mockRestore();

    // O perfil repassa o ajuste para a troca (o aviso de perfil mudado é da tela, fica de fora)
    const trocar = vi.spyOn(servicoFotoPadronizada, 'trocar').mockResolvedValue(nova);
    const perfilPorDentro = servicoPerfil as unknown as { avisarQueMudou: () => void };
    const avisar = vi.spyOn(perfilPorDentro, 'avisarQueMudou').mockImplementation(() => {});
    await servicoPerfil.trocarMinhaFoto(arquivo, antiga, { zoom: 1.5, x: 0.3, y: 0.4 });
    expect(trocar).toHaveBeenLastCalledWith(arquivo, 'perfis', expect.any(Function), antiga, {
      zoom: 1.5,
      x: 0.3,
      y: 0.4,
    });
    trocar.mockRestore();
    avisar.mockRestore();
  });

  it('não gravou: a nova sai do Storage, a antiga fica e o erro segue', async () => {
    removerDoStorage.mockClear();
    vi.spyOn(servicoFotoPadronizada, 'enviar').mockResolvedValueOnce(nova);
    const gravar = vi.fn(async () => {
      throw new Error('Não foi possível salvar a foto.');
    });
    await expect(servicoFotoPadronizada.trocar(arquivo, 'perfis', gravar, antiga)).rejects.toThrow(
      'Não foi possível salvar a foto.',
    );
    expect(removerDoStorage).toHaveBeenCalledWith(['perfis/nova.webp']);
    expect(removerDoStorage).not.toHaveBeenCalledWith(['perfis/antiga.webp']);
  });
});

describe('falha ao ler a próxima ordem', () => {
  it('não grava e não culpa o nome', async () => {
    consultaFalha.ativa = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(await servicoEdicoes.criar('Edição 4')).toEqual({ erro: 'Não foi possível criar a edição.' });
      expect(await servicoMaterial.salvarTrilha({ nome: 'Git', descricao: '' })).toBe(
        'Não foi possível criar a trilha.',
      );
      expect(
        await servicoMaterial.salvarMaterial({ trilha_id: 1, titulo: 'Aula', descricao: '', url: 'https://x.com' }),
      ).toBe('Não foi possível adicionar o material.');
    } finally {
      consultaFalha.ativa = false;
      vi.restoreAllMocks();
    }
  });
});

describe('falta justificada', () => {
  const arquivo = (tipo: string, tamanho = 10) => new File([new Uint8Array(tamanho)], 'atestado', { type: tipo });

  it('exige a justificativa e aceita o atestado em PDF ou foto', () => {
    expect(servicoAtestados.validar('  ', null)).toBe('Escreva a justificativa da falta.');
    expect(servicoAtestados.validar('Consulta médica', null)).toBeNull();
    expect(servicoAtestados.validar('Consulta médica', arquivo('application/pdf'))).toBeNull();
    expect(servicoAtestados.validar('Consulta médica', arquivo('image/jpeg'))).toBeNull();
  });

  it('recusa outro tipo, arquivo grande e texto longo', () => {
    expect(servicoAtestados.validar('Consulta', arquivo('application/zip'))).toBe(
      'Envie o atestado em PDF ou foto (PNG, JPG ou WebP).',
    );
    expect(servicoAtestados.validar('Consulta', arquivo('application/pdf', 11 * 1024 * 1024))).toBe(
      'O atestado passa de 10 MB.',
    );
    expect(servicoAtestados.validar('x'.repeat(1001), null)).toBe('A justificativa passa de 1000 caracteres.');
  });
});

describe('erros de cadastro', () => {
  it('traduz duplicidade e valor fora do padrão', () => {
    expect(mensagemDeErroDeCadastro({ code: '23505' }, 'Falhou.')).toBe('Já existe um cadastro com esse nome.');
    expect(mensagemDeErroDeCadastro({ code: '23514' }, 'Falhou.')).toBe('Valor fora do padrão aceito.');
    expect(mensagemDeErroDeCadastro({ code: '42P01' }, 'Falhou.')).toBe('Falhou.');
  });
});

describe('dados do instrutor', () => {
  const validos: DadosInstrutor = {
    nome_completo: 'Maria da Silva',
    cpf: '529.982.247-25',
    identidade: 'MG-12.345.678',
    pis: '',
    data_nascimento: '1990-05-10',
    telefone: '(31) 99999-0000',
    email: 'maria@exemplo.com',
    cep: '30000-000',
    logradouro: 'Rua A',
    numero: '10',
    complemento: null,
    bairro: 'Centro',
    cidade: 'Belo Horizonte',
    uf: 'MG',
    estado_civil: 'solteiro',
    cor_raca: 'parda',
    grau_instrucao: 'superior_completo',
    linkedin: null,
  };

  it('aponta o campo com problema', () => {
    expect(validarDados({ ...validos, cpf: '111.111.111-11' }, '2026-09-24')?.campo).toBe('cpf');
    // Com CPF válido, o próximo campo conferido é o PIS (vazio aqui)
    expect(validarDados(validos, '2026-09-24')?.campo).toBe('pis');
  });

  it('confere só os campos da etapa quando pedido', () => {
    // O PIS vazio é da etapa 1: a etapa de endereço não reclama dele
    expect(validarDados(validos, '2026-09-24', ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf'])).toBeNull();
    // LinkedIn é o último conferido no geral, mas é o primeiro problema da etapa de contato
    expect(
      validarDados({ ...validos, linkedin: 'facebook.com/maria' }, '2026-09-24', ['telefone', 'email', 'linkedin'])
        ?.campo,
    ).toBe('linkedin');
  });
});

describe('solicitações', () => {
  it('em aberto: aberta ou em andamento; concluída: aprovada ou recusada', () => {
    expect(servicoSolicitacoes.emAberto({ status: 'pendente' })).toBe(true);
    expect(servicoSolicitacoes.emAberto({ status: 'em_andamento' })).toBe(true);
    expect(servicoSolicitacoes.emAberto({ status: 'aprovada' })).toBe(false);
    expect(servicoSolicitacoes.emAberto({ status: 'recusada' })).toBe(false);
  });

  it('o aluno escreve o tipo do pedido (obrigatório, até 80 caracteres)', async () => {
    expect(await servicoSolicitacoes.enviarMinha('  ', 'Preciso mudar')).toBe('Escreva o tipo do pedido.');
    expect(await servicoSolicitacoes.enviarMinha('x'.repeat(81), 'Preciso mudar')).toBe(
      'O tipo passa de 80 caracteres.',
    );
    expect(await servicoSolicitacoes.enviarMinha('Mudança de turno', ' ')).toBe('Descreva o que você precisa.');
  });

  it('mensagem vazia não vai para o banco', async () => {
    expect(await servicoSolicitacoes.enviarMensagem(1, '   ')).toBe('Escreva a mensagem.');
  });
});

describe('site público', () => {
  const doArquivo = [
    {
      slug: 't1',
      nome: 'Turma 1',
      edicao: '3ª Edição',
      periodo: '2025',
      atual: true,
      alunos: [{ participanteId: 7, nome: 'Ana', foto: '/imgs/a.webp' }],
    },
  ];

  it('foto atual do dashboard e LinkedIn do perfil por cima do arquivo', () => {
    const [turma] = servicoSitePublico.juntarTurmas(
      doArquivo,
      new Map([[7, { foto: null, linkedin: 'https://www.linkedin.com/in/ana' }]]),
      [],
    );
    expect(turma.alunos[0].foto).toBeUndefined();
    expect(turma.alunos[0].linkedin).toBe('https://www.linkedin.com/in/ana');
  });

  it('com edição nova em andamento no banco, a do arquivo deixa de ser a atual', () => {
    const nova = {
      slug: 'edicao-4-turma-1',
      nome: 'Turma 1',
      edicao: '4ª Edição',
      periodo: '2026',
      atual: true,
      alunos: [],
    };
    const turmas = servicoSitePublico.juntarTurmas(doArquivo, new Map(), [nova]);
    expect(turmas.map((t) => [t.edicao, t.atual])).toEqual([
      ['4ª Edição', true],
      ['3ª Edição', false],
    ]);
  });
});

describe('equipe no site e Hall da Fama', () => {
  // Linhas como o banco devolve (equipe_da_edicao_atual e hall_da_fama_do_site)
  const linha = (nome: string, organizacao: string | null, extra: Record<string, unknown> = {}) => ({
    edicao_ordem: 4,
    edicao_nome: 'Edição 4 (2026)',
    nome,
    cargo: 'Instrutor(a)',
    organizacao,
    foto: null,
    linkedin: null,
    ...extra,
  });
  const chamar = (linhas: unknown[]) =>
    vi
      .spyOn(servicoSitePublico as unknown as { chamar: () => Promise<unknown[]> }, 'chamar')
      .mockResolvedValueOnce(linhas);

  it('Sobre: título da edição e pessoas em ordem Mundiale, AOPA, Ânima e outras', async () => {
    chamar([
      linha('Rui Lima', 'Outra'),
      linha('Ana Dias', 'Ânima'),
      linha('Bia Reis', 'Mundiale'),
      linha('Caio Luz', null),
    ]);
    const equipe = await servicoSitePublico.equipeDaEdicaoAtual();
    expect(equipe?.titulo).toBe('EQUIPE — EDIÇÃO IV');
    expect(equipe?.pessoas.map((p) => p.nome)).toEqual(['Bia Reis', 'Ana Dias', 'Rui Lima', 'Caio Luz']);
  });

  it('Sobre: foto de outro endereço e LinkedIn que não é perfil viram nada', async () => {
    chamar([
      linha('Ana Dias', 'Ânima', { foto: 'https://outro.site/x.webp', linkedin: 'https://evil.example/in/ana' }),
    ]);
    const equipe = await servicoSitePublico.equipeDaEdicaoAtual();
    expect(equipe?.pessoas[0].foto).toBeUndefined();
    expect(equipe?.pessoas[0].linkedin).toBeUndefined();
  });

  it('Sobre: sem equipe na edição aberta, a seção não aparece', async () => {
    chamar([]);
    expect(await servicoSitePublico.equipeDaEdicaoAtual()).toBeNull();
  });

  it('Hall: uma edição por grupo, com nome e período no formato do arquivo', async () => {
    chamar([
      linha('Ana Dias', 'Ânima', { edicao_ordem: 5, edicao_nome: 'Edição 5 (2027)' }),
      linha('Bia Reis', 'Mundiale'),
      linha('Caio Luz', 'AOPA'),
    ]);
    const grupos = await servicoSitePublico.hallDoBanco();
    expect(grupos.map((g) => [g.id, g.nome, g.periodo, g.membros.map((m) => m.nome)])).toEqual([
      ['edicao-5', '5ª Edição', '2027', ['Ana Dias']],
      ['edicao-4', '4ª Edição', '2026', ['Bia Reis', 'Caio Luz']],
    ]);
  });

  it('Hall: o total conta cada pessoa uma vez, mesmo em duas edições', () => {
    const grupo = (id: string, nomes: string[]) => ({
      id,
      nome: id,
      periodo: '',
      membros: nomes.map((nome) => ({ nome, cargo: '' })),
    });
    expect(contarPessoas([grupo('a', ['Ana', 'Bia']), grupo('b', ['Ana', 'Caio'])])).toBe(3);
  });
});

describe('avaliações do fim da edição', () => {
  const chaves = ['participacao', 'entrega', 'comportamento'];

  it('soma só as notas dadas e sabe quando os três critérios estão preenchidos', () => {
    const parcial = { participacao: 4, entrega: null, comportamento: 5, observacao: '' };
    expect(somaDasNotas(parcial, chaves)).toBe(9);
    expect(notasCompletas(parcial, chaves)).toBe(false);
    expect(notasCompletas({ ...parcial, entrega: 0 }, chaves)).toBe(true);
  });

  it('não manda ao banco turma com aluno sem as três notas', async () => {
    const notas = new Map([[1, { participacao: 4, entrega: null, comportamento: 5, observacao: '' }]]);
    const resultado = await servicoAvaliacoes.salvarDaTurma(10, notas);
    expect(resultado.mensagem).toBe('Dê as três notas a todos os alunos antes de salvar.');
  });
});

describe('foto: recorte e ajuste de zoom e posição', () => {
  it('sem ajuste, o recorte é o de sempre: o maior quadrado do centro, um pouco acima do meio', () => {
    expect(recorteDaFoto(1000, 600)).toEqual({ x: 200, y: 0, lado: 600 });
    // Retrato: 8% do lado acima do centro (o rosto)
    expect(recorteDaFoto(600, 1000)).toEqual({ x: 0, y: 200 - 48, lado: 600 });
  });

  it('o enquadramento inicial da janela reproduz o recorte de sempre', () => {
    for (const [largura, altura] of [
      [1000, 600],
      [600, 1000],
      [800, 800],
    ]) {
      expect(recorteDaFoto(largura, altura, enquadramentoPadrao(largura, altura))).toEqual(
        recorteDaFoto(largura, altura),
      );
    }
  });

  it('zoom encolhe o quadrado e a posição anda na sobra, sem sair da foto', () => {
    expect(recorteDaFoto(900, 600, { zoom: 2, x: 0, y: 0 })).toEqual({ x: 0, y: 0, lado: 300 });
    expect(recorteDaFoto(900, 600, { zoom: 2, x: 1, y: 1 })).toEqual({ x: 600, y: 300, lado: 300 });
    // Fora dos limites: o zoom e a posição ficam presos no que cabe
    expect(recorteDaFoto(900, 600, { zoom: 10, x: 5, y: -2 })).toEqual({
      x: 900 - 600 / ZOOM_MAXIMO,
      y: 0,
      lado: 600 / ZOOM_MAXIMO,
    });
    expect(recorteDaFoto(900, 600, { zoom: 0.2, x: 0.5, y: 0.5 })).toEqual({ x: 150, y: 0, lado: 600 });
  });

  it('o zoom aproxima em volta do meio do círculo, sem escorregar para o lado', () => {
    const centro = ({ x, y, lado }: { x: number; y: number; lado: number }) => [x + lado / 2, y + lado / 2];
    const antes = { zoom: 1, x: 0.2, y: 0 };
    const depois = comZoom(1000, 600, antes, 3);
    expect(depois.zoom).toBe(3);
    const [cx0, cy0] = centro(recorteDaFoto(1000, 600, antes));
    const [cx1, cy1] = centro(recorteDaFoto(1000, 600, depois));
    expect(cx1).toBeCloseTo(cx0);
    expect(cy1).toBeCloseTo(cy0);
  });
});

describe('site: cada pessoa aparece uma vez na página Sobre', () => {
  it('quem já é idealizador sai da equipe da edição, sem ligar para acento, maiúscula ou espaço', () => {
    const idealizadores = [{ nome: 'Rafaela Moreira' }, { nome: 'Cristiane de Ávila' }];
    const equipe = [
      { nome: 'Lucelho Silva' },
      { nome: 'rafaela  moreira ' },
      { nome: 'Cristiane de Avila' },
      { nome: 'Raquel Souza' },
    ];
    expect(semQuemJaAparece(equipe, idealizadores).map((p) => p.nome)).toEqual(['Lucelho Silva', 'Raquel Souza']);
    expect(semQuemJaAparece(equipe, [])).toEqual(equipe);
  });
});
