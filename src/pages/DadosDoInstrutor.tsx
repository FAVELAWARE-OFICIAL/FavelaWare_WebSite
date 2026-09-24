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
import { Navigate, useNavigate } from 'react-router-dom';

import Carregamento from '../components/admin/Carregamento';
import TelaDeEtapas from '../components/TelaDeEtapas';
import { classeCampoDeEtapa, classeRotuloDeEtapa } from '../components/estilosDeAcesso';
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

  const campo = (
    nome: keyof DadosInstrutor,
    rotulo: string,
    classe: string,
    extras: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className={classe}>
      <label htmlFor={nome} className={classeRotuloDeEtapa}>
        {rotulo}
      </label>
      <input
        id={nome}
        name={nome}
        value={campos[nome] ?? ''}
        onChange={aoAlterarCampo}
        className={classeCampoDeEtapa}
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
      <label htmlFor={nome} className={classeRotuloDeEtapa}>
        {rotulo}
      </label>
      <select
        id={nome}
        name={nome}
        value={campos[nome] ?? ''}
        onChange={aoAlterarCampo}
        required
        className={classeCampoDeEtapa}
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
    <TelaDeEtapas
      titulo={estado.jaTinha ? 'MEUS DADOS DA BOLSA' : 'DADOS DA BOLSA'}
      tituloCurto={estado.jaTinha ? 'Meus dados da bolsa' : 'Dados da bolsa'}
      descricao={
        estado.jaTinha
          ? 'Confira e atualize o que mudou.'
          : 'Antes de entrar na área do instrutor, preencha os dados usados no RPA (recibo de pagamento de autônomo).'
      }
      privacidade="Estes dados servem só para emitir o seu RPA e cumprir as obrigações previdenciárias. Só você e a gestão do projeto veem estas informações."
      privacidadeCurta="Usados só para emitir o seu RPA. Só você e a gestão do projeto veem estes dados."
      etapas={ETAPAS}
      etapa={etapa}
      liberadaAte={liberadaAte}
      concluida={(i) => !validarDados(campos, hoje, ETAPAS[i].campos)}
      aoIrPara={(i) => {
        setMensagem(null);
        irPara(i);
      }}
      voltar={estado.jaTinha ? { para: '/professor/perfil', rotulo: 'Voltar sem salvar' } : undefined}
      erro={
        erroCarregar
          ? 'Não foi possível carregar os dados já salvos. Recarregue a página antes de continuar.'
          : mensagem
      }
      ocupado={salvando}
      bloqueado={erroCarregar}
      rotuloFinal={estado.jaTinha ? 'SALVAR ALTERAÇÕES' : 'SALVAR E ENTRAR'}
      formulario={formulario}
      aoEnviar={aoEnviar}
    >
      {camposDaEtapa[etapa]}
    </TelaDeEtapas>
  );
};

export default DadosDoInstrutor;
