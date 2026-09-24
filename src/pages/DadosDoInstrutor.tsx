/**
 * ============================================
 * DADOS DO INSTRUTOR (RPA)
 * ============================================
 *
 * Logo depois do login, o instrutor preenche os dados do documento "DADOS PARA
 * RPA" (nome completo, CPF, identidade, INSS/PIS, endereço, nascimento,
 * telefone, e-mail, estado civil, cor/raça e grau de instrução). Sem isso a
 * guarda de rota não deixa entrar em /professor.
 *
 * A mesma página serve para atualizar depois (o perfil tem um atalho): ela
 * abre já preenchida. Os números vão só com dígitos para o banco, que confere
 * CPF e PIS de novo (os dígitos verificadores).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import Carregamento from '../components/admin/Carregamento';
import { hoje as hojeLocal } from '../lib/chamada';
import {
  carregarMeusDadosDeInstrutor, CORES_RACAS, ESTADOS_CIVIS, GRAUS_DE_INSTRUCAO, mascaraCep, mascaraCpf, mascaraPis,
  mascaraTelefone, nascimentoMaximo, salvarMeusDadosDeInstrutor, UFS, validarDados, type DadosInstrutor,
} from '../lib/dadosInstrutor';
import { supabase, carregarPerfil } from '../lib/supabase';

const classeCampo =
  'w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-favela-green-500 focus:border-transparent transition-all';
const classeRotulo = 'block text-sm font-medium text-gray-700 mb-2';

const VAZIO: DadosInstrutor = {
  nome_completo: '', cpf: '', identidade: '', pis: '', data_nascimento: '', telefone: '', email: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
  estado_civil: '', cor_raca: '', grau_instrucao: '', linkedin: '',
};

// Máscara de cada campo numérico (o que a pessoa vê enquanto digita)
const MASCARAS: Partial<Record<keyof DadosInstrutor, (v: string) => string>> = {
  cpf: mascaraCpf, pis: mascaraPis, cep: mascaraCep, telefone: mascaraTelefone,
};

type Estado =
  | { tipo: 'verificando' }
  | { tipo: 'sem-acesso' }
  | { tipo: 'pronto'; usuarioId: string; jaTinha: boolean };

const DadosDoInstrutor: React.FC = () => {
  const navigate = useNavigate();
  const formulario = useRef<HTMLFormElement>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: 'verificando' });
  const [formData, setFormData] = useState<DadosInstrutor>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erroCarregar, setErroCarregar] = useState(false);

  // Só quem é instrutor; se já preencheu, abre com os dados (para atualizar)
  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const usuario = data.session?.user;
      const perfil = usuario ? await carregarPerfil(usuario.id) : null;
      if (!ativo) return;
      if (!usuario || perfil?.papel !== 'professor') return setEstado({ tipo: 'sem-acesso' });
      try {
        const salvos = await carregarMeusDadosDeInstrutor(usuario.id);
        if (!ativo) return;
        if (salvos) {
          setFormData({
            ...salvos,
            complemento: salvos.complemento ?? '',
            linkedin: salvos.linkedin ?? '',
            cpf: mascaraCpf(salvos.cpf), pis: mascaraPis(salvos.pis),
            cep: mascaraCep(salvos.cep), telefone: mascaraTelefone(salvos.telefone),
          });
        } else {
          // Primeira vez: aproveita o nome e o e-mail que já estão no perfil
          setFormData((f) => ({ ...f, nome_completo: perfil.nome ?? '', email: usuario.email ?? '' }));
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
    return () => { ativo = false; };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const mascara = MASCARAS[name as keyof DadosInstrutor];
    setFormData((anterior) => ({ ...anterior, [name]: mascara ? mascara(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (estado.tipo !== 'pronto') return;
    setMensagem(null);

    const problema = validarDados(formData, hojeLocal());
    if (problema) {
      setMensagem(problema.texto);
      // Leva a pessoa até o campo com problema
      formulario.current?.querySelector<HTMLElement>(`[name="${problema.campo}"]`)?.focus();
      return;
    }

    setSalvando(true);
    try {
      await salvarMeusDadosDeInstrutor(estado.usuarioId, formData);
      navigate(estado.jaTinha ? '/professor/perfil' : '/professor', { replace: true });
    } catch (erro) {
      console.error('[dados-instrutor] falha ao salvar', (erro as { code?: string })?.code);
      setSalvando(false);
      setMensagem(
        (erro as { code?: string })?.code === '23514'
          ? 'Algum dado não passou na conferência. Revise CPF, INSS/PIS e data de nascimento.'
          : 'Não foi possível salvar agora. Tente de novo em instantes.',
      );
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
  const campo = (nome: keyof DadosInstrutor, rotulo: string, extras: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={nome} className={classeRotulo}>{rotulo}</label>
      <input id={nome} name={nome} value={formData[nome] ?? ''} onChange={handleInputChange} className={classeCampo} {...extras} />
    </div>
  );
  const lista = (nome: keyof DadosInstrutor, rotulo: string, opcoes: Record<string, string>, extras: { autoComplete?: string } = {}) => (
    <div>
      <label htmlFor={nome} className={classeRotulo}>{rotulo}</label>
      <select id={nome} name={nome} value={formData[nome] ?? ''} onChange={handleInputChange} required className={classeCampo} {...extras}>
        <option value="" disabled>Escolha…</option>
        {Object.entries(opcoes).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white px-4 py-12">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl sm:p-8 md:p-10">
        <img src="/imgs/logo/logo.png" alt="Logo FavelaWare" className="mx-auto mb-6 w-40 object-contain" />

        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {estado.jaTinha ? 'Meus dados para o RPA' : 'Complete seus dados'}
        </h1>
        <p className="mb-6 text-gray-600">
          {estado.jaTinha
            ? 'Confira e atualize o que mudou.'
            : 'Antes de entrar na área do instrutor, preencha os dados usados no RPA (recibo de pagamento de autônomo).'}{' '}
          Eles servem só para emitir o seu RPA e cumprir as obrigações previdenciárias, e só você e a gestão do projeto veem estas informações.
        </p>

        {erroCarregar && (
          <div role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-100 p-4 text-red-800">
            Não foi possível carregar os dados já salvos. Recarregue a página antes de continuar.
          </div>
        )}
        {mensagem && (
          <div role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-100 p-4 text-red-800">{mensagem}</div>
        )}

        <form ref={formulario} onSubmit={handleSubmit} noValidate className="space-y-8">
          <fieldset className="space-y-6">
            <legend className="mb-4 text-lg font-bold text-gray-900">Identificação</legend>
            {campo('nome_completo', 'Nome completo *', { autoComplete: 'name', maxLength: 150, required: true })}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {campo('cpf', 'CPF *', { inputMode: 'numeric', placeholder: '000.000.000-00', required: true, autoComplete: 'off' })}
              {campo('identidade', 'Identidade (RG) *', { placeholder: 'Ex: MG-00.000.000', maxLength: 30, required: true, autoComplete: 'off' })}
              {campo('pis', 'INSS/PIS *', { inputMode: 'numeric', placeholder: '000.00000.00-0', required: true, autoComplete: 'off' })}
              {campo('data_nascimento', 'Data de nascimento *', { type: 'date', min: '1900-01-01', max: nascimentoMaximo(hoje), required: true, autoComplete: 'bday' })}
            </div>
          </fieldset>

          <fieldset className="space-y-6">
            <legend className="mb-4 text-lg font-bold text-gray-900">Contato</legend>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {campo('telefone', 'Telefone (com DDD) *', { type: 'tel', inputMode: 'tel', placeholder: '(31) 90000-0000', required: true, autoComplete: 'tel' })}
              {campo('email', 'E-mail *', { type: 'email', maxLength: 254, required: true, autoComplete: 'email' })}
              <div className="md:col-span-2">
                {campo('linkedin', 'LinkedIn (opcional)', { type: 'url', inputMode: 'url', maxLength: 200, placeholder: 'linkedin.com/in/seu-nome', autoComplete: 'url' })}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-6">
            <legend className="mb-4 text-lg font-bold text-gray-900">Endereço</legend>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {campo('cep', 'CEP *', { inputMode: 'numeric', placeholder: '00000-000', required: true, autoComplete: 'postal-code' })}
              <div className="md:col-span-2">
                {campo('logradouro', 'Rua / avenida *', { maxLength: 150, required: true, autoComplete: 'address-line1' })}
              </div>
              {campo('numero', 'Número *', { maxLength: 20, required: true, placeholder: 'Ex: 120 ou s/n' })}
              <div className="md:col-span-2">
                {campo('complemento', 'Complemento', { maxLength: 80, placeholder: 'Ex: apto 201', autoComplete: 'address-line2' })}
              </div>
              {campo('bairro', 'Bairro *', { maxLength: 80, required: true })}
              {campo('cidade', 'Cidade *', { maxLength: 80, required: true, autoComplete: 'address-level2' })}
              {lista('uf', 'Estado (UF) *', Object.fromEntries(UFS.map((uf) => [uf, uf])), { autoComplete: 'address-level1' })}
            </div>
          </fieldset>

          <fieldset className="space-y-6">
            <legend className="mb-4 text-lg font-bold text-gray-900">Outras informações</legend>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {lista('estado_civil', 'Estado civil *', ESTADOS_CIVIS)}
              {lista('cor_raca', 'Cor/raça *', CORES_RACAS)}
              {lista('grau_instrucao', 'Grau de instrução *', GRAUS_DE_INSTRUCAO)}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={salvando || erroCarregar}
            className={`w-full rounded-lg px-6 py-4 text-lg font-bold text-white shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-favela-green-500 focus-visible:ring-offset-2 ${
              salvando || erroCarregar ? 'cursor-not-allowed bg-gray-400' : 'bg-gradient-to-r from-favela-green-600 to-favela-blue-600 hover:shadow-xl'
            }`}
          >
            {salvando ? 'Salvando...' : estado.jaTinha ? 'SALVAR ALTERAÇÕES' : 'SALVAR E ENTRAR'}
          </button>
          {estado.jaTinha && (
            <p className="text-center">
              <Link to="/professor/perfil" className="text-sm font-medium text-gray-600 underline hover:text-gray-900">
                Voltar sem salvar
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default DadosDoInstrutor;
