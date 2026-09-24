/**
 * ============================================
 * DADOS DO BANCO NO SITE PÚBLICO
 * ============================================
 *
 * O site público (sem login) lê do banco só o que mostra, por funções que
 * devolvem nome e foto e nada mais:
 * - fotos_das_turmas: a foto que o gestor põe no dashboard substitui a do
 *   arquivo nas páginas de turmas, e o LinkedIn do "Meu perfil" do aluno
 *   aparece junto (cada aluno de src/data/turmas.ts tem o participanteId);
 * - turmas_do_site: as turmas e os alunos das edições novas (a 4ª em diante),
 *   que não estão escritas à mão em src/data/turmas.ts;
 * - equipe_da_edicao_atual: a equipe da edição aberta (instrutores, coordenação e
 *   parceiros, com cargo e vínculo), na página Sobre;
 * - hall_da_fama_do_site: a equipe de cada edição nova encerrada (retrato do
 *   encerramento), no Hall da Fama, antes das edições do arquivo.
 *
 * Aqui mora a regra (montar as turmas no formato do site, juntar com as do
 * arquivo, o título da equipe). Os hooks de src/hooks/ só guardam o estado.
 *
 * Usa fetch direto (sem o cliente do Supabase) para o site público continuar
 * leve. Se o banco não responder, a página fica só com o que está no arquivo.
 */
import { CHAVE_PUBLICAVEL_SUPABASE, PREFIXO_FOTOS_PUBLICAS, URL_SUPABASE } from '../config';
import { ordenarPorOrganizacao, type GrupoDoHall, type PessoaDoHall } from '../data/hallDaFama';
import type { TurmaDoSite } from '../data/turmas';
import { perfilLinkedinValido } from '../utils/texto';

// Só aceita foto do próprio site ou do bucket de fotos do projeto: um valor
// estranho no banco nunca vira imagem de outro endereço no site público
const fotoConfiavel = (foto: unknown): string | null =>
  typeof foto === 'string' &&
  (foto.startsWith('/imgs/') || (PREFIXO_FOTOS_PUBLICAS !== null && foto.startsWith(PREFIXO_FOTOS_PUBLICAS)))
    ? foto
    : null;

/** Linha de turmas_do_site */
interface AlunoDoBanco {
  edicaoOrdem: number;
  edicaoNome: string;
  encerrada: boolean;
  turmaId: number;
  turmaNome: string;
  /** Já no formato curto do site ("Maria Lima"), montado pelo banco */
  alunoNome: string | null;
  foto: string | null;
  linkedin: string | null;
}

/** O que o banco diz de um aluno do arquivo: foto atual e LinkedIn do perfil */
export interface AlunoAtualizado {
  foto: string | null;
  linkedin: string | null;
}

/** Só aceita LinkedIn no formato de perfil (valor estranho no banco nunca vira link) */
const linkedinConfiavel = (valor: unknown): string | null =>
  typeof valor === 'string' && perfilLinkedinValido(valor) ? valor : null;

/** A equipe da edição atual, pronta para a página Sobre */
export interface EquipeDaEdicao {
  titulo: string;
  pessoas: PessoaDoHall[];
}

/** Linha de equipe_da_edicao_atual ou hall_da_fama_do_site -> cartão do site */
const linhaParaPessoa = (l: Record<string, unknown>): PessoaDoHall => ({
  nome: String(l.nome ?? 'Instrutor'),
  cargo: String(l.cargo ?? ''),
  organizacao: typeof l.organizacao === 'string' ? l.organizacao : undefined,
  foto: fotoConfiavel(l.foto) ?? undefined,
  linkedin: linkedinConfiavel(l.linkedin) ?? undefined,
});

export class ServicoSitePublico {
  /** Cada consulta é buscada uma vez por visita e reaproveitada entre as páginas */
  private buscas = new Map<string, Promise<unknown[]>>();

  /** { id do aluno: foto atual e LinkedIn }; vazio se o banco não responder */
  async fotosDosAlunos(): Promise<Map<number, AlunoAtualizado>> {
    const linhas = await this.chamar<{ id: number; foto: unknown; linkedin: unknown }>('fotos_das_turmas');
    // Foto estranha (fora do site e do bucket) vira "sem foto", nunca imagem de outro endereço
    return new Map(linhas.map((l) => [l.id, { foto: fotoConfiavel(l.foto), linkedin: linkedinConfiavel(l.linkedin) }]));
  }

  /** Turmas das edições novas, no formato do site (turma sem aluno também aparece) */
  async turmasDoBanco(): Promise<TurmaDoSite[]> {
    const linhas = await this.chamar<Record<string, unknown>>('turmas_do_site');
    return this.montarTurmas(
      linhas.map((l) => ({
        edicaoOrdem: Number(l.edicao_ordem),
        edicaoNome: String(l.edicao_nome ?? ''),
        encerrada: Boolean(l.encerrada),
        turmaId: Number(l.turma_id),
        turmaNome: String(l.turma_nome ?? ''),
        alunoNome: typeof l.aluno_nome === 'string' ? l.aluno_nome : null,
        foto: fotoConfiavel(l.foto),
        linkedin: linkedinConfiavel(l.linkedin),
      })),
    );
  }

  /**
   * Lista da página Turmas: as novas (do banco) e as do arquivo com a foto atual
   * do dashboard e o LinkedIn do perfil por cima. Com uma edição nova em
   * andamento, a do arquivo deixa de ser a "atual".
   */
  juntarTurmas(doArquivo: TurmaDoSite[], fotos: Map<number, AlunoAtualizado>, novas: TurmaDoSite[]): TurmaDoSite[] {
    const comFotos = !fotos.size
      ? doArquivo
      : doArquivo.map((turma) => ({
          ...turma,
          alunos: turma.alunos.map((aluno) => {
            const atual = aluno.participanteId ? fotos.get(aluno.participanteId) : undefined;
            return !atual ? aluno : { ...aluno, foto: atual.foto ?? undefined, linkedin: atual.linkedin ?? undefined };
          }),
        }));
    const temAtualNoBanco = novas.some((t) => t.atual);
    return [...novas, ...(temAtualNoBanco ? comFotos.map((t) => ({ ...t, atual: false })) : comFotos)];
  }

  /** Equipe da edição atual com o título da seção (null se não houver edição aberta com equipe) */
  async equipeDaEdicaoAtual(): Promise<EquipeDaEdicao | null> {
    const linhas = await this.chamar<Record<string, unknown>>('equipe_da_edicao_atual');
    if (!linhas.length) return null;
    // O título segue o das edições anteriores: "EQUIPE — EDIÇÃO IV"
    return {
      titulo: `EQUIPE — EDIÇÃO ${this.numeroRomano(Number(linhas[0].edicao_ordem))}`,
      pessoas: ordenarPorOrganizacao(linhas.map(linhaParaPessoa)),
    };
  }

  /** Edições novas encerradas, da mais recente para a mais antiga, no formato do Hall da Fama */
  async hallDoBanco(): Promise<GrupoDoHall[]> {
    const linhas = await this.chamar<Record<string, unknown>>('hall_da_fama_do_site');
    const porEdicao = new Map<number, GrupoDoHall>();
    for (const l of linhas) {
      const ordem = Number(l.edicao_ordem);
      let grupo = porEdicao.get(ordem);
      if (!grupo) {
        grupo = {
          id: `edicao-${ordem}`,
          nome: this.nomeDaEdicao(ordem),
          periodo: this.periodoDaEdicao(String(l.edicao_nome ?? '')),
          membros: [],
        };
        porEdicao.set(ordem, grupo);
      }
      grupo.membros.push(linhaParaPessoa(l));
    }
    return [...porEdicao.values()].map((g) => ({ ...g, membros: ordenarPorOrganizacao(g.membros) }));
  }

  /** Linhas do banco (uma por aluno) -> turmas no formato do site */
  private montarTurmas(linhas: AlunoDoBanco[]): TurmaDoSite[] {
    const porTurma = new Map<number, TurmaDoSite>();
    for (const l of linhas) {
      let turma = porTurma.get(l.turmaId);
      if (!turma) {
        turma = {
          slug: `edicao-${l.edicaoOrdem}-${this.paraSlug(l.turmaNome)}`,
          nome: l.turmaNome,
          edicao: this.nomeDaEdicao(l.edicaoOrdem),
          periodo: this.periodoDaEdicao(l.edicaoNome),
          atual: !l.encerrada,
          alunos: [],
        };
        porTurma.set(l.turmaId, turma);
      }
      if (l.alunoNome) {
        turma.alunos.push({ nome: l.alunoNome, foto: l.foto ?? undefined, linkedin: l.linkedin ?? undefined });
      }
    }
    return [...porTurma.values()];
  }

  /** 4 -> "4ª Edição" (turmas e Hall da Fama) */
  private nomeDaEdicao(ordem: number): string {
    return `${ordem}ª Edição`;
  }

  /** "Edição 4 (2026)" -> "2026" */
  private periodoDaEdicao(nome: string): string {
    return /\(([^)]+)\)/.exec(nome)?.[1] ?? '';
  }

  /** "Turma 1" -> "turma-1" (sem acento, para a URL) */
  private paraSlug(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** 4 -> "IV" */
  private numeroRomano(numero: number): string {
    const valores: [number, string][] = [
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ];
    let resto = numero;
    let romano = '';
    for (const [valor, letras] of valores) {
      while (resto >= valor) {
        romano += letras;
        resto -= valor;
      }
    }
    return romano;
  }

  /** Chama uma função pública do banco; lista vazia se não der (a página segue com o arquivo) */
  private chamar<T>(funcao: string): Promise<T[]> {
    if (!URL_SUPABASE || !CHAVE_PUBLICAVEL_SUPABASE) return Promise.resolve([]);
    let busca = this.buscas.get(funcao);
    if (!busca) {
      busca = fetch(`${URL_SUPABASE}/rest/v1/rpc/${funcao}`, {
        method: 'POST',
        headers: {
          apikey: CHAVE_PUBLICAVEL_SUPABASE,
          Authorization: `Bearer ${CHAVE_PUBLICAVEL_SUPABASE}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
        .then((resposta) => (resposta.ok ? resposta.json() : Promise.reject(new Error(String(resposta.status)))))
        .then((linhas: unknown) => (Array.isArray(linhas) ? linhas : []))
        .catch((erro) => {
          console.error(`[site] ${funcao} indisponível; ficando com o arquivo`, erro?.message);
          this.buscas.delete(funcao); // na próxima página tenta de novo
          return [];
        });
      this.buscas.set(funcao, busca);
    }
    return busca as Promise<T[]>;
  }
}

export const servicoSitePublico = new ServicoSitePublico();
