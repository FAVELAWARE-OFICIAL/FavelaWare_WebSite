/**
 * ============================================
 * DADOS DO INSTRUTOR (BOLSA / RPA)
 * ============================================
 *
 * Logo depois do primeiro acesso, o instrutor preenche os dados do documento
 * "DADOS PARA RPA" (recibo de pagamento de autônomo) usados na bolsa. Sem isso
 * a guarda de rota não deixa entrar em /professor.
 *
 * A tela ocupa a janela inteira, sem rolagem: o formulário vem em 4 etapas
 * (Identificação, Contato, Endereço e Outras informações). Cada etapa é
 * conferida antes de avançar; no fim, tudo é conferido de novo e salvo.
 *
 * A mesma página serve para atualizar depois (o perfil tem um atalho): ela
 * abre já preenchida. Os números vão só com dígitos para o banco, que confere
 * CPF e PIS de novo (os dígitos verificadores).
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import Carregamento from '../components/admin/Carregamento';
import {
  CORES_RACAS,
  ESTADOS_CIVIS,
  GRAUS_DE_INSTRUCAO,
  mascaraCep,
  mascaraCpf,
  mascaraPis,
  mascaraTelefone,
  nascimentoMaximo,
  servicoDadosInstrutor,
  UFS,
  validarDados,
  type DadosInstrutor,
} from '../lib/dadosInstrutor';
import { servicoSessao } from '../lib/sessao';
import { hoje as hojeLocal } from '../utils/datas';
import { FUNDO_DA_MARCA, LOGO } from '../data/imagens';

// Campo compacto: a etapa inteira precisa caber na tela sem rolar
const classeCampo =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 transition-all focus:border-transparent focus:ring-2 focus:ring-favela-green-500 lg:py-3';
const classeRotulo = 'mb-1 block text-sm font-medium text-gray-700 lg:mb-1.5';

const VAZIO: DadosInstrutor = {
  nome_completo: '',
  cpf: '',
  identidade: '',
  pis: '',
  data_nascimento: '',
  telefone: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  estado_civil: '',
  cor_raca: '',
  grau_instrucao: '',
  linkedin: '',
};

// Máscara de cada campo numérico (o que a pessoa vê enquanto digita)
const MASCARAS: Partial<Record<keyof DadosInstrutor, (v: string) => string>> = {
  cpf: mascaraCpf,
  pis: mascaraPis,
  cep: mascaraCep,
  telefone: mascaraTelefone,
};

/** As 4 etapas do formulário e os campos de cada uma (na ordem da tela) */
const ETAPAS: { titulo: string; descricao: string; icone: string; campos: (keyof DadosInstrutor)[] }[] = [
  {
    titulo: 'Identificação',
    descricao: 'Como você aparece no recibo da bolsa.',
    icone: '🪪',
    campos: ['nome_completo', 'cpf', 'identidade', 'pis', 'data_nascimento'],
  },
  {
    titulo: 'Contato',
    descricao: 'Como a gestão do projeto fala com você.',
    icone: '📞',
    campos: ['telefone', 'email', 'linkedin'],
  },
  {
    titulo: 'Endereço',
    descricao: 'Onde você mora (também vai no recibo).',
    icone: '📍',
    campos: ['cep', 'numero', 'logradouro', 'complemento', 'bairro', 'cidade', 'uf'],
  },
  {
    titulo: 'Outras informações',
    descricao: 'Pedidas pelo documento do RPA.',
    icone: '📝',
    campos: ['estado_civil', 'cor_raca', 'grau_instrucao'],
  },
];

const etapaDoCampo = (campo: keyof DadosInstrutor) => ETAPAS.findIndex((e) => e.campos.includes(campo));

type Estado =
  { tipo: 'verificando' } | { tipo: 'sem-acesso' } | { tipo: 'pronto'; usuarioId: string; jaTinha: boolean };

const DadosDoInstrutor: React.FC = () => {
  const navigate = useNavigate();
  const formulario = useRef<HTMLFormElement>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: 'verificando' });
  const [campos, setCampos] = useState<DadosInstrutor>(VAZIO);
  const [etapa, setEtapa] = useState(0);
  // Etapa mais adiante já liberada (dá para voltar e pular até ela pelo índice)
  const [liberadaAte, setLiberadaAte] = useState(0);
  // Campo que recebe o foco depois de trocar de etapa (o do erro, ou o primeiro)
  const [focar, setFocar] = useState<keyof DadosInstrutor | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erroCarregar, setErroCarregar] = useState(false);

  // Só quem é instrutor; se já preencheu, abre com os dados (para atualizar)
  useEffect(() => {
    let ativo = true;
    (async () => {
      const logada = await servicoSessao.contaLogada();
      const usuario = logada?.conta;
      const perfil = logada?.perfil ?? null;
      if (!ativo) return;
      if (!usuario || perfil?.papel !== 'professor') return setEstado({ tipo: 'sem-acesso' });
      try {
        const salvos = await servicoDadosInstrutor.carregarMeus(usuario.id);
        if (!ativo) return;
        if (salvos) {
          setCampos({
            ...salvos,
            complemento: salvos.complemento ?? '',
            linkedin: salvos.linkedin ?? '',
            cpf: mascaraCpf(salvos.cpf),
            pis: mascaraPis(salvos.pis),
            cep: mascaraCep(salvos.cep),
            telefone: mascaraTelefone(salvos.telefone),
          });
          setLiberadaAte(ETAPAS.length - 1); // já preenchido: todas as etapas abertas
        } else {
          // Primeira vez: aproveita o nome e o e-mail que já estão no perfil
          setCampos((f) => ({ ...f, nome_completo: perfil.nome ?? '', email: usuario.email ?? '' }));
        }
        setEstado({ tipo: 'pronto', usuarioId: usuario.id, jaTinha: Boolean(salvos) });
      } catch (erro) {
        console.error('[dados-instrutor] falha ao carregar', (erro as { code?: string })?.code);
        if (ativo) {
          setErroCarregar(true);
          setEstado({ tipo: 'pronto', usuarioId: usuario.id, jaTinha: false });
        }
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // Depois de trocar de etapa, leva o foco ao campo certo
  useEffect(() => {
    if (!focar) return;
    formulario.current?.querySelector<HTMLElement>(`[name="${focar}"]`)?.focus();
    setFocar(null);
  }, [focar, etapa]);

  const aoAlterarCampo = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const mascara = MASCARAS[name as keyof DadosInstrutor];
    setCampos((anterior) => ({ ...anterior, [name]: mascara ? mascara(value) : value }));
  };

  const irPara = (proxima: number, campo?: keyof DadosInstrutor) => {
    setEtapa(proxima);
    setLiberadaAte((atual) => Math.max(atual, proxima));
    setFocar(campo ?? ETAPAS[proxima].campos[0]);
  };

  /** Mostra o problema e leva até o campo (trocando de etapa, se preciso) */
  const apontar = (problema: { campo: keyof DadosInstrutor; texto: string }) => {
    setMensagem(problema.texto);
    irPara(etapaDoCampo(problema.campo), problema.campo);
  };

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (estado.tipo !== 'pronto') return;
    setMensagem(null);

    // Etapas do meio: confere só os campos desta etapa e avança
    if (etapa < ETAPAS.length - 1) {
      const problema = validarDados(campos, hojeLocal(), ETAPAS[etapa].campos);
      if (problema) return apontar(problema);
      return irPara(etapa + 1);
    }

    // Última etapa: confere tudo (uma etapa pode ter sido pulada pelo índice)
    const problema = validarDados(campos, hojeLocal());
    if (problema) return apontar(problema);

    setSalvando(true);
    try {
      await servicoDadosInstrutor.salvarMeus(estado.usuarioId, campos);
      navigate(estado.jaTinha ? '/professor/perfil' : '/professor', { replace: true });
    } catch (erro) {
      setSalvando(false);
      setMensagem(servicoDadosInstrutor.mensagemDoErroAoSalvar(erro));
    }
  };

  if (estado.tipo === 'verificando') {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Carregamento texto="Verificando acesso" />
      </div>
    );
  }
  if (estado.tipo === 'sem-acesso') return <Navigate to="/login" replace />;

  const hoje = hojeLocal();
  const ultima = etapa === ETAPAS.length - 1;
  const atual = ETAPAS[etapa];

  const campo = (
    nome: keyof DadosInstrutor,
    rotulo: string,
    classe: string,
    extras: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className={classe}>
      <label htmlFor={nome} className={classeRotulo}>
        {rotulo}
      </label>
      <input
        id={nome}
        name={nome}
        value={campos[nome] ?? ''}
        onChange={aoAlterarCampo}
        className={classeCampo}
        {...extras}
      />
    </div>
  );
  const lista = (
    nome: keyof DadosInstrutor,
    rotulo: string,
    classe: string,
    opcoes: Record<string, string>,
    extras: { autoComplete?: string } = {},
  ) => (
    <div className={classe}>
      <label htmlFor={nome} className={classeRotulo}>
        {rotulo}
      </label>
      <select
        id={nome}
        name={nome}
        value={campos[nome] ?? ''}
        onChange={aoAlterarCampo}
        required
        className={classeCampo}
        {...extras}
      >
        <option value="" disabled>
          Escolha…
        </option>
        {Object.entries(opcoes).map(([valor, texto]) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </select>
    </div>
  );

  // Campos de cada etapa: grade de 2 colunas no celular e 6 em tela grande
  const camposDaEtapa = [
    <>
      {campo('nome_completo', 'Nome completo *', 'col-span-2 lg:col-span-6', {
        autoComplete: 'name',
        maxLength: 150,
        required: true,
      })}
      {campo('cpf', 'CPF *', 'col-span-1 lg:col-span-3', {
        inputMode: 'numeric',
        placeholder: '000.000.000-00',
        required: true,
        autoComplete: 'off',
      })}
      {campo('identidade', 'Identidade (RG) *', 'col-span-1 lg:col-span-3', {
        placeholder: 'Ex: MG-00.000.000',
        maxLength: 30,
        required: true,
        autoComplete: 'off',
      })}
      {campo('pis', 'INSS/PIS *', 'col-span-1 lg:col-span-3', {
        inputMode: 'numeric',
        placeholder: '000.00000.00-0',
        required: true,
        autoComplete: 'off',
      })}
      {campo('data_nascimento', 'Nascimento *', 'col-span-1 lg:col-span-3', {
        type: 'date',
        min: '1900-01-01',
        max: nascimentoMaximo(hoje),
        required: true,
        autoComplete: 'bday',
      })}
    </>,
    <>
      {campo('telefone', 'Telefone (com DDD) *', 'col-span-2 lg:col-span-3', {
        type: 'tel',
        inputMode: 'tel',
        placeholder: '(31) 90000-0000',
        required: true,
        autoComplete: 'tel',
      })}
      {campo('email', 'E-mail *', 'col-span-2 lg:col-span-3', {
        type: 'email',
        maxLength: 254,
        required: true,
        autoComplete: 'email',
      })}
      {campo('linkedin', 'LinkedIn (opcional)', 'col-span-2 lg:col-span-6', {
        type: 'url',
        inputMode: 'url',
        maxLength: 200,
        placeholder: 'linkedin.com/in/seu-nome',
        autoComplete: 'url',
      })}
    </>,
    <>
      {campo('cep', 'CEP *', 'col-span-1 lg:col-span-2', {
        inputMode: 'numeric',
        placeholder: '00000-000',
        required: true,
        autoComplete: 'postal-code',
      })}
      {campo('numero', 'Número *', 'col-span-1 lg:col-span-1', {
        maxLength: 20,
        required: true,
        placeholder: '120 ou s/n',
      })}
      {campo('logradouro', 'Rua / avenida *', 'col-span-2 lg:col-span-3', {
        maxLength: 150,
        required: true,
        autoComplete: 'address-line1',
      })}
      {campo('complemento', 'Complemento', 'col-span-2 lg:col-span-2', {
        maxLength: 80,
        placeholder: 'Ex: apto 201',
        autoComplete: 'address-line2',
      })}
      {campo('bairro', 'Bairro *', 'col-span-1 lg:col-span-2', { maxLength: 80, required: true })}
      {campo('cidade', 'Cidade *', 'col-span-1 lg:col-span-2', {
        maxLength: 80,
        required: true,
        autoComplete: 'address-level2',
      })}
      {lista('uf', 'Estado (UF) *', 'col-span-1 lg:col-span-2', Object.fromEntries(UFS.map((uf) => [uf, uf])), {
        autoComplete: 'address-level1',
      })}
    </>,
    <>
      {lista('estado_civil', 'Estado civil *', 'col-span-2 lg:col-span-2', ESTADOS_CIVIS)}
      {lista('cor_raca', 'Cor/raça *', 'col-span-2 lg:col-span-2', CORES_RACAS)}
      {lista('grau_instrucao', 'Grau de instrução *', 'col-span-2 lg:col-span-2', GRAUS_DE_INSTRUCAO)}
      <p className="col-span-2 text-sm text-gray-500 lg:col-span-6">
        Cor/raça segue a classificação do IBGE e pode ficar como “Prefiro não declarar”.
      </p>
    </>,
  ];

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      {/* ============================================
          PAINEL DA MARCA (tela grande): etapas e aviso de privacidade
          ============================================ */}
      <aside
        className="relative hidden w-[36%] max-w-xl flex-col justify-between overflow-hidden bg-[#8bc53f] p-10 lg:flex xl:p-12"
        style={{
          backgroundImage: `url('${FUNDO_DA_MARCA}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Véu roxo: o texto branco precisa de contraste sobre a foto */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2d2a5f]/90 via-[#2d2a5f]/70 to-[#2d2a5f]/85" />

        <div className="relative z-10">
          <img src={LOGO} alt="Logo FavelaWare" className="mb-8 w-44 object-contain drop-shadow-2xl" />
          <h1 className="mb-3 text-3xl font-bold leading-tight text-white drop-shadow-lg xl:text-4xl">
            {estado.jaTinha ? 'MEUS DADOS DA BOLSA' : 'DADOS DA BOLSA'}
          </h1>
          <p className="max-w-sm text-white/85">
            {estado.jaTinha
              ? 'Confira e atualize o que mudou.'
              : 'Antes de entrar na área do instrutor, preencha os dados usados no RPA (recibo de pagamento de autônomo).'}
          </p>
        </div>

        {/* Índice das etapas: dá para voltar a qualquer etapa já liberada */}
        <nav aria-label="Etapas do formulário" className="relative z-10">
          <ol className="space-y-2">
            {ETAPAS.map((e, i) => {
              // Concluída: já liberada, fora da etapa atual e com os campos certos
              const concluida = i !== etapa && i <= liberadaAte && !validarDados(campos, hoje, e.campos);
              const liberada = i <= liberadaAte;
              return (
                <li key={e.titulo}>
                  <button
                    type="button"
                    disabled={!liberada || salvando}
                    onClick={() => {
                      setMensagem(null);
                      irPara(i);
                    }}
                    aria-current={i === etapa ? 'step' : undefined}
                    className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      i === etapa ? 'bg-white/15' : liberada ? 'hover:bg-white/10' : 'cursor-default opacity-60'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        i === etapa
                          ? 'bg-[#8bc53f] text-[#2d2a5f]'
                          : concluida
                            ? 'bg-white text-[#2d2a5f]'
                            : 'border-2 border-white/60 text-white'
                      }`}
                    >
                      {concluida ? '✓' : i + 1}
                    </span>
                    <span>
                      <span className="block font-semibold text-white">{e.titulo}</span>
                      <span className="block text-sm text-white/75">{e.descricao}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <p className="relative z-10 flex items-start gap-2 text-sm text-white/85">
          <span aria-hidden="true">🔒</span>
          Estes dados servem só para emitir o seu RPA e cumprir as obrigações previdenciárias. Só você e a gestão do
          projeto veem estas informações.
        </p>
      </aside>

      {/* ============================================
          FORMULÁRIO (uma etapa por vez)
          ============================================ */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Topo: progresso. No celular e no tablet (sem o painel da marca), também o
            título e o aviso de privacidade, que ninguém pode deixar de ver */}
        <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-2.5 sm:px-8 lg:px-12 lg:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src={LOGO} alt="Logo FavelaWare" className="w-14 shrink-0 object-contain lg:hidden" />
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-gray-900 lg:hidden">
                  {estado.jaTinha ? 'Meus dados da bolsa' : 'Dados da bolsa'}
                </h1>
                <p className="truncate text-sm font-medium text-gray-500">
                  Etapa {etapa + 1} de {ETAPAS.length}
                  <span className="lg:hidden"> · {atual.titulo}</span>
                </p>
              </div>
            </div>
            {estado.jaTinha && (
              <Link
                to="/professor/perfil"
                className="shrink-0 rounded text-sm font-medium text-gray-600 underline hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500"
              >
                Voltar sem salvar
              </Link>
            )}
          </div>
          <p className="mt-1.5 text-xs text-gray-600 lg:hidden">
            <span aria-hidden="true">🔒 </span>
            Usados só para emitir o seu RPA. Só você e a gestão do projeto veem estes dados.
          </p>
          <div className="mt-2.5 grid grid-cols-4 gap-2 lg:mt-3" aria-hidden="true">
            {ETAPAS.map((e, i) => (
              <span
                key={e.titulo}
                className={`h-1.5 rounded-full transition-colors duration-300 ${
                  i <= etapa ? 'bg-gradient-to-r from-favela-green-500 to-favela-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </header>

        <form ref={formulario} onSubmit={aoEnviar} noValidate className="flex min-h-0 flex-1 flex-col">
          {/* Meio: a etapa ocupa o espaço que sobra, centralizada na altura */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-8 lg:px-12 lg:py-8">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center">
              {erroCarregar && (
                <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-800">
                  Não foi possível carregar os dados já salvos. Recarregue a página antes de continuar.
                </div>
              )}
              {mensagem && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-800"
                >
                  {mensagem}
                </motion.div>
              )}

              {/* key: cada etapa monta de novo e entra deslizando. Sem esperar a saída da
                  anterior, os campos já existem quando o foco é levado a eles */}
              <motion.fieldset
                key={etapa}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                <legend className="mb-0.5 flex items-center gap-2 text-xl font-bold text-gray-900 lg:mb-1 lg:text-3xl">
                  <span aria-hidden="true">{atual.icone}</span>
                  {atual.titulo}
                </legend>
                <p className="mb-3 text-sm text-gray-600 lg:mb-8 lg:text-base">{atual.descricao}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-6 lg:gap-x-6 lg:gap-y-6">
                  {camposDaEtapa[etapa]}
                </div>
              </motion.fieldset>
            </div>
          </div>

          {/* Pé: navegação entre as etapas (sempre à vista) */}
          <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-8 lg:px-12 lg:py-4">
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setMensagem(null);
                  irPara(etapa - 1);
                }}
                disabled={etapa === 0 || salvando}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-semibold lg:py-3 text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 disabled:invisible"
              >
                ‹ Voltar
              </button>
              <motion.button
                type="submit"
                disabled={salvando || erroCarregar}
                whileHover={salvando || erroCarregar ? undefined : { scale: 1.02 }}
                whileTap={salvando || erroCarregar ? undefined : { scale: 0.98 }}
                className={`flex-1 rounded-lg px-6 py-2.5 font-bold lg:py-3 text-white shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 focus-visible:ring-offset-2 sm:flex-none sm:px-10 ${
                  salvando || erroCarregar
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-gradient-to-r from-favela-green-600 to-favela-blue-600 hover:shadow-xl'
                }`}
              >
                {salvando
                  ? 'Salvando...'
                  : !ultima
                    ? 'Próximo ›'
                    : estado.jaTinha
                      ? 'SALVAR ALTERAÇÕES'
                      : 'SALVAR E ENTRAR'}
              </motion.button>
            </div>
          </footer>
        </form>
      </main>
    </div>
  );
};

export default DadosDoInstrutor;
