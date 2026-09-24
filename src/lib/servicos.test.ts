import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => import('../testes/supabaseFalso'));

import { consultaFalha, removerDoStorage } from '../testes/supabaseFalso';
import { servicoAlunos } from './alunos';
import { servicoAtestados } from './atestados';
import { servicoEdicoes } from './edicoes';
import { servicoMaterial } from './material';
import { mensagemDeErroDeCadastro } from './banco';
import { validarDados, type DadosInstrutor } from './dadosInstrutor';
import { SEM_REGRAS, servicoEntregas } from './entregas';
import { QUANTIDADE_NO_HISTORICO, servicoPonto, type Ponto } from './ponto';
import { senhaForte, servicoSenha } from './senha';
import { servicoSessao, type MeuPerfil } from './sessao';

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

describe('fotos do aluno enviadas e não salvas', () => {
  const original = 'http://localhost:54321/storage/v1/object/public/fotos-alunos/original.webp';
  const nova = 'http://localhost:54321/storage/v1/object/public/fotos-alunos/nova.webp';

  it('apaga a foto enviada agora e nunca a que o aluno já tinha', async () => {
    removerDoStorage.mockClear();
    await servicoAlunos.descartarFotoNaoSalva(original, original);
    await servicoAlunos.descartarFotoNaoSalva(null, original);
    expect(removerDoStorage).not.toHaveBeenCalled();
    await servicoAlunos.descartarFotoNaoSalva(nova, original);
    expect(removerDoStorage).toHaveBeenCalledWith(['nova.webp']);
  });

  it('foto do site (em /imgs) nunca vai para o Storage', async () => {
    removerDoStorage.mockClear();
    await servicoAlunos.descartarFotoNaoSalva('/imgs/team/ana.webp', null);
    expect(removerDoStorage).not.toHaveBeenCalled();
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
