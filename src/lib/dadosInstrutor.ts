/**
 * ============================================
 * DADOS DO INSTRUTOR (RPA)
 * ============================================
 *
 * Os dados do documento "DADOS PARA RPA" (recibo de pagamento de autônomo).
 * O instrutor preenche logo depois do login (a guarda de rota não deixa entrar
 * na área sem eles) e pode atualizar pelo perfil; o gestor só consulta.
 *
 * Dado pessoal (cor/raça é sensível pela LGPD): nunca vai para log nem para
 * cache do navegador. Quem garante que só o dono e o gestor leem é o RLS da
 * tabela dados_instrutores.
 */
import { emailValido } from '../utils/texto';
import { codigoDoErro } from './banco';
import { supabase } from './supabase';

export interface DadosInstrutor {
  nome_completo: string;
  cpf: string;
  identidade: string;
  pis: string;
  data_nascimento: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  estado_civil: string;
  cor_raca: string;
  grau_instrucao: string;
  /** Opcional: endereço do perfil (https://www.linkedin.com/in/...) */
  linkedin: string | null;
}

export type DadosInstrutorDaEquipe = DadosInstrutor & { perfil_id: string; atualizado_em: string };

const COLUNAS =
  'nome_completo, cpf, identidade, pis, data_nascimento, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf, estado_civil, cor_raca, grau_instrucao, linkedin';

// Rótulos das opções (o banco guarda o código da esquerda)
export const ESTADOS_CIVIS: Record<string, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  uniao_estavel: 'União estável',
  separado: 'Separado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
};

// Classificação do IBGE, com a opção de não declarar
export const CORES_RACAS: Record<string, string> = {
  branca: 'Branca',
  preta: 'Preta',
  parda: 'Parda',
  amarela: 'Amarela',
  indigena: 'Indígena',
  nao_declarada: 'Prefiro não declarar',
};

export const GRAUS_DE_INSTRUCAO: Record<string, string> = {
  fundamental_incompleto: 'Ensino fundamental incompleto',
  fundamental_completo: 'Ensino fundamental completo',
  medio_incompleto: 'Ensino médio incompleto',
  medio_completo: 'Ensino médio completo',
  tecnico: 'Ensino técnico',
  superior_cursando: 'Ensino superior (cursando)',
  superior_incompleto: 'Ensino superior incompleto',
  superior_completo: 'Ensino superior completo',
  pos_graduacao: 'Pós-graduação',
  mestrado: 'Mestrado',
  doutorado: 'Doutorado',
};

export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

// ---------- Números: só dígitos no banco, com máscara na tela ----------
const soDigitos = (valor: string) => valor.replace(/\D/g, '');

/** Aplica uma máscara tipo "000.000.000-00" aos dígitos digitados */
function mascarar(valor: string, molde: string): string {
  const digitos = soDigitos(valor);
  let saida = '';
  let i = 0;
  for (const c of molde) {
    if (i >= digitos.length) break;
    saida += c === '0' ? digitos[i++] : c;
  }
  return saida;
}

export const mascaraCpf = (v: string) => mascarar(v, '000.000.000-00');
export const mascaraPis = (v: string) => mascarar(v, '000.00000.00-0');
export const mascaraCep = (v: string) => mascarar(v, '00000-000');
export const mascaraTelefone = (v: string) =>
  soDigitos(v).length > 10 ? mascarar(v, '(00) 00000-0000') : mascarar(v, '(00) 0000-0000');

/** Dígitos verificadores do CPF (a mesma conta do banco, private.cpf_valido) */
function cpfValido(cpf: string): boolean {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    return ((soma * 10) % 11) % 10;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/** Dígito verificador do PIS/PASEP/NIT (mesma conta de private.pis_valido) */
function pisValido(pis: string): boolean {
  const d = soDigitos(pis);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = pesos.reduce((total, peso, i) => total + Number(d[i]) * peso, 0);
  const dv = 11 - (soma % 11);
  return (dv >= 10 ? 0 : dv) === Number(d[10]);
}

/**
 * LinkedIn como o banco aceita: https://(www.)linkedin.com/in/<perfil>.
 * Completa o que a pessoa costuma colar ("linkedin.com/in/maria", sem https).
 * Devolve null se vazio, ou undefined se não for um perfil do LinkedIn.
 */
function normalizarLinkedin(valor: string | null): string | null | undefined {
  const texto = (valor ?? '').trim();
  if (!texto) return null;
  const completo = /^https?:\/\//i.test(texto) ? texto.replace(/^https?:/i, 'https:') : `https://${texto}`;
  // Esquema e domínio em minúsculas ("HTTPS://www.LinkedIn.com/in/..." também vale)
  const semBusca = completo.split(/[?#]/)[0].replace(/^https:\/\/[^/]+/i, (inicio) => inicio.toLowerCase());
  return /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9%_-]{2,100}\/?$/.test(semBusca) &&
    semBusca.length <= 200
    ? semBusca
    : undefined;
}

/** Data mais recente aceita no nascimento (14 anos atrás), no formato aaaa-mm-dd */
export function nascimentoMaximo(hoje: string): string {
  const [ano, mes, dia] = hoje.split('-');
  return `${Number(ano) - 14}-${mes}-${dia}`;
}

/** Confere tudo antes de enviar. Devolve a primeira mensagem de erro (com o campo), ou null. */
export function validarDados(
  dados: DadosInstrutor,
  hoje: string,
): { campo: keyof DadosInstrutor; texto: string } | null {
  const vazio = (v: string | null) => !v || !v.trim();
  if (vazio(dados.nome_completo) || dados.nome_completo.trim().length < 3)
    return { campo: 'nome_completo', texto: 'Informe seu nome completo.' };
  if (!cpfValido(dados.cpf)) return { campo: 'cpf', texto: 'CPF inválido. Confira os números.' };
  if (vazio(dados.identidade) || dados.identidade.trim().length < 3)
    return { campo: 'identidade', texto: 'Informe sua identidade (RG).' };
  if (!pisValido(dados.pis)) return { campo: 'pis', texto: 'INSS/PIS inválido. Confira os números.' };
  if (!dados.data_nascimento) return { campo: 'data_nascimento', texto: 'Informe sua data de nascimento.' };
  if (dados.data_nascimento < '1900-01-01' || dados.data_nascimento > nascimentoMaximo(hoje)) {
    return { campo: 'data_nascimento', texto: 'Data de nascimento inválida.' };
  }
  if (!/^\d{10,11}$/.test(soDigitos(dados.telefone)))
    return { campo: 'telefone', texto: 'Informe o telefone com DDD.' };
  if (!emailValido(dados.email)) return { campo: 'email', texto: 'Informe um e-mail válido.' };
  if (soDigitos(dados.cep).length !== 8) return { campo: 'cep', texto: 'Informe o CEP com 8 números.' };
  if (vazio(dados.logradouro) || dados.logradouro.trim().length < 2)
    return { campo: 'logradouro', texto: 'Informe a rua.' };
  if (vazio(dados.numero)) return { campo: 'numero', texto: 'Informe o número (ou "s/n").' };
  if (vazio(dados.bairro) || dados.bairro.trim().length < 2) return { campo: 'bairro', texto: 'Informe o bairro.' };
  if (vazio(dados.cidade) || dados.cidade.trim().length < 2) return { campo: 'cidade', texto: 'Informe a cidade.' };
  if (!UFS.includes(dados.uf)) return { campo: 'uf', texto: 'Escolha o estado (UF).' };
  if (!(dados.estado_civil in ESTADOS_CIVIS)) return { campo: 'estado_civil', texto: 'Escolha o estado civil.' };
  if (!(dados.cor_raca in CORES_RACAS))
    return { campo: 'cor_raca', texto: 'Escolha a cor/raça (ou "Prefiro não declarar").' };
  if (!(dados.grau_instrucao in GRAUS_DE_INSTRUCAO))
    return { campo: 'grau_instrucao', texto: 'Escolha o grau de instrução.' };
  if (normalizarLinkedin(dados.linkedin) === undefined) {
    return {
      campo: 'linkedin',
      texto: 'LinkedIn inválido. Use o endereço do perfil, ex.: linkedin.com/in/seu-nome (ou deixe em branco).',
    };
  }
  return null;
}

// ---------- Banco ----------

export class ServicoDadosInstrutor {
  /** Quem já preencheu não precisa ser consultado de novo nesta sessão */
  private preenchidoPor: string | null = null;

  /**
   * O instrutor já preencheu os dados? Usado pela guarda de rota. Em erro de
   * rede devolve true: a exigência é de cadastro, não de segurança, e não deve
   * trancar o instrutor fora da chamada por uma falha momentânea.
   */
  async jaPreencheu(usuarioId: string): Promise<boolean> {
    if (this.preenchidoPor === usuarioId) return true;
    const { count, error } = await supabase
      .from('dados_instrutores')
      .select('perfil_id', { count: 'exact', head: true })
      .eq('perfil_id', usuarioId);
    if (error) {
      console.error('[dados-instrutor] falha ao conferir o preenchimento', error.code);
      return true;
    }
    if (count) this.preenchidoPor = usuarioId;
    return Boolean(count);
  }

  /** Os dados de quem está logado (null se ainda não preencheu) */
  async carregarMeus(usuarioId: string): Promise<DadosInstrutor | null> {
    const { data, error } = await supabase
      .from('dados_instrutores')
      .select(COLUNAS)
      .eq('perfil_id', usuarioId)
      .maybeSingle();
    if (error) throw error;
    return data as DadosInstrutor | null;
  }

  /** Grava (cria ou atualiza) os dados do instrutor logado, com os números só em dígitos */
  async salvarMeus(usuarioId: string, dados: DadosInstrutor): Promise<void> {
    const linha = {
      ...dados,
      perfil_id: usuarioId,
      cpf: soDigitos(dados.cpf),
      pis: soDigitos(dados.pis),
      telefone: soDigitos(dados.telefone),
      cep: soDigitos(dados.cep),
      complemento: dados.complemento?.trim() || null,
      linkedin: normalizarLinkedin(dados.linkedin) ?? null,
    };
    const { error } = await supabase.from('dados_instrutores').upsert(linha, { onConflict: 'perfil_id' });
    if (error) throw error;
    this.preenchidoPor = usuarioId;
  }

  /** Gestor: só QUEM já preencheu (para o selo); a ficha vem ao abrir, uma por vez */
  async carregarQuemPreencheu(): Promise<Set<string>> {
    const { data, error } = await supabase.from('dados_instrutores').select('perfil_id');
    if (error) throw error;
    return new Set(data.map((d) => d.perfil_id as string));
  }

  /** Gestor: a ficha de um instrutor (minimização: nunca baixa a de todos) */
  async carregarDoInstrutor(perfilId: string): Promise<DadosInstrutorDaEquipe> {
    const { data, error } = await supabase
      .from('dados_instrutores')
      .select(`perfil_id, atualizado_em, ${COLUNAS}`)
      .eq('perfil_id', perfilId)
      .single();
    if (error) throw error;
    return data as DadosInstrutorDaEquipe;
  }

  /** Texto para o instrutor a partir do erro do banco ao salvar (o código vai para o log) */
  mensagemDoErroAoSalvar(erro: unknown): string {
    const codigo = codigoDoErro(erro);
    console.error('[dados-instrutor] falha ao salvar', codigo); // só o código: a mensagem pode trazer os dados
    return codigo === '23514'
      ? 'Algum dado não passou na conferência. Revise CPF, INSS/PIS e data de nascimento.'
      : 'Não foi possível salvar agora. Tente de novo em instantes.';
  }
}

export const servicoDadosInstrutor = new ServicoDadosInstrutor();

/** Texto no formato do documento "DADOS PARA RPA", para copiar */
export function textoParaRpa(d: DadosInstrutor): string {
  const endereco = `${d.logradouro}, ${d.numero}${d.complemento ? ` - ${d.complemento}` : ''} - ${d.bairro} - ${d.cidade}/${d.uf} - CEP ${mascaraCep(d.cep)}`;
  const [ano, mes, dia] = d.data_nascimento.split('-');
  return [
    `NOME: ${d.nome_completo}`,
    `CPF: ${mascaraCpf(d.cpf)}`,
    `IDENTIDADE: ${d.identidade}`,
    `INSS/PIS: ${mascaraPis(d.pis)}`,
    `ENDEREÇO: ${endereco}`,
    `DATA NASCIMENTO: ${dia}/${mes}/${ano}`,
    `TEL: ${mascaraTelefone(d.telefone)}`,
    `E-MAIL: ${d.email}`,
    `ESTADO CIVIL: ${ESTADOS_CIVIS[d.estado_civil] ?? d.estado_civil}`,
    `COR/RAÇA: ${CORES_RACAS[d.cor_raca] ?? d.cor_raca}`,
    `GRAU INSTRUÇÃO: ${GRAUS_DE_INSTRUCAO[d.grau_instrucao] ?? d.grau_instrucao}`,
    ...(d.linkedin ? [`LINKEDIN: ${d.linkedin}`] : []),
  ].join('\n');
}
