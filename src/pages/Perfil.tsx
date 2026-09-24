/**
 * ============================================
 * MEU PERFIL (gestor, professor e aluno)
 * ============================================
 *
 * Aberta pela foto na barra superior. Dois cartões:
 * 1. Meus dados: o que cada papel pode alterar (ver lib/perfil.ts).
 * 2. Trocar senha: pede a senha atual antes de gravar a nova.
 * O instrutor tem um terceiro: o atalho para atualizar os dados do RPA.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useCarregamentoCompleto } from '../components/admin/Carregamento';
import { Carregando } from '../components/admin/Moldura';
import { Aviso, Botao, Cartao, classeCampo, classeRotulo, type Mensagem } from '../components/admin/Ui';
import { espaco, foco, texto } from '../components/admin/designSystem';
import { servicoPerfil, type MeusDados } from '../lib/perfil';
import { servicoSenha, TAMANHO_MINIMO_SENHA, type EtapaSenha } from '../lib/senha';
import { StatusProcessamento } from '../types';
import { hoje as hojeLocal } from '../utils/datas';
import { emailValido } from '../utils/texto';

const NOME_DO_PAPEL = { gestor: 'Gestor', professor: 'Instrutor', aluno: 'Aluno' } as const;

const Perfil: React.FC = () => {
  const [dados, setDados] = useState<MeusDados | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const mostrarCarregando = useCarregamentoCompleto(dados === null && !erroAoCarregar, 0);

  useEffect(() => {
    let ativo = true;
    servicoPerfil
      .carregarMeusDados()
      .then((d) => ativo && setDados(d))
      .catch((e) => {
        console.error('[perfil] falha ao carregar', e);
        if (ativo) setErroAoCarregar(true);
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (erroAoCarregar)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar seu perfil. Recarregue a página.' }} />;
  if (mostrarCarregando || !dados) return <Carregando texto="Abrindo seu perfil" />;

  return (
    <div className={`grid grid-cols-1 ${espaco.grade} lg:grid-cols-2`}>
      <MeusDadosCartao dados={dados} />
      <TrocarSenhaCartao />
      {dados.papel === 'professor' && (
        <Cartao
          titulo="Dados para o RPA"
          descricao="CPF, identidade, INSS/PIS, endereço e os outros dados do recibo de pagamento."
        >
          <Link
            to="/dados-do-instrutor"
            className={`inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 ${foco} focus-visible:ring-offset-2`}
          >
            Ver e atualizar meus dados
          </Link>
        </Cartao>
      )}
    </div>
  );
};

// ============ 1. MEUS DADOS ============
const MeusDadosCartao: React.FC<{ dados: MeusDados }> = ({ dados }) => {
  const ehEquipe = dados.papel === 'gestor' || dados.papel === 'professor';
  const [nome, setNome] = useState(dados.nome);
  const [dataNascimento, setDataNascimento] = useState(dados.aluno?.dataNascimento ?? '');
  const [email, setEmail] = useState(dados.aluno?.email ?? '');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const hoje = hojeLocal();

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    if (!ehEquipe) {
      if (!dataNascimento) return setMensagem({ tipo: 'erro', texto: 'Informe sua data de nascimento.' });
      if (!emailValido(email)) return setMensagem({ tipo: 'erro', texto: 'Informe um e-mail válido.' });
    }
    setSalvando(true);
    try {
      if (ehEquipe) await servicoPerfil.salvarNome(nome);
      else await servicoPerfil.salvarDadosDeAluno(dataNascimento, email);
      setMensagem({ tipo: 'sucesso', texto: 'Dados salvos.' });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: servicoPerfil.mensagemDoErro(erro, !ehEquipe) });
    } finally {
      setSalvando(false);
    }
  };

  const podeEditar = ehEquipe || dados.aluno !== null;

  return (
    <Cartao titulo="Meus dados">
      <form onSubmit={salvar} className={espaco.formulario}>
        <div>
          <label htmlFor="perfil-nome" className={classeRotulo}>
            Nome
          </label>
          {ehEquipe ? (
            <input
              id="perfil-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              disabled={salvando}
              className={classeCampo}
            />
          ) : (
            <>
              <input id="perfil-nome" value={nome} readOnly className={`${classeCampo} bg-gray-50 text-gray-600`} />
              <p className={`mt-1 ${texto.apoio}`}>É o nome da chamada. Para corrigir, fale com a coordenação.</p>
            </>
          )}
        </div>

        <div>
          <label htmlFor="perfil-acesso" className={classeRotulo}>
            {dados.papel === 'aluno' ? 'Login' : 'E-mail de acesso'}
          </label>
          <input
            id="perfil-acesso"
            value={dados.acesso}
            readOnly
            className={`${classeCampo} bg-gray-50 text-gray-600`}
          />
          <p className={`mt-1 ${texto.apoio}`}>
            {dados.papel ? NOME_DO_PAPEL[dados.papel] : ''} · o acesso não muda por aqui.
          </p>
        </div>

        {dados.aluno && (
          <>
            <div>
              <label htmlFor="perfil-nascimento" className={classeRotulo}>
                Data de nascimento
              </label>
              <input
                id="perfil-nascimento"
                type="date"
                required
                max={hoje}
                autoComplete="bday"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                disabled={salvando}
                className={classeCampo}
              />
            </div>
            <div>
              <label htmlFor="perfil-email" className={classeRotulo}>
                E-mail para contato
              </label>
              <input
                id="perfil-email"
                type="email"
                required
                autoComplete="email"
                maxLength={200}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={salvando}
                className={classeCampo}
                placeholder="Ex: maria@email.com"
              />
            </div>
          </>
        )}

        <Aviso mensagem={mensagem} className="" />
        {podeEditar && (
          <div>
            <Botao type="submit" variante="primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar dados'}
            </Botao>
          </div>
        )}
      </form>
    </Cartao>
  );
};

// ============ 2. TROCAR SENHA ============
const TrocarSenhaCartao: React.FC = () => {
  const vazio = { atual: '', nova: '', confirmacao: '' };
  const [campos, setCampos] = useState(vazio);
  const [etapa, setEtapa] = useState<EtapaSenha | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  const mudar = (e: React.ChangeEvent<HTMLInputElement>) =>
    setCampos((c) => ({ ...c, [e.target.name]: e.target.value }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    const problema = servicoSenha.validarNova(campos.nova, campos.confirmacao, 'A nova senha', 'As duas senhas novas');
    if (problema) return setMensagem({ tipo: 'erro', texto: problema });

    const resultado = await servicoSenha.trocar(campos.atual, campos.nova, setEtapa);
    setEtapa(null);
    if (resultado.status !== StatusProcessamento.Sucesso)
      return setMensagem({ tipo: 'erro', texto: resultado.mensagem! });
    setCampos(vazio);
    setMensagem({ tipo: 'sucesso', texto: 'Senha trocada. Nos outros aparelhos, será preciso entrar de novo.' });
  };

  const ocupado = etapa !== null;

  return (
    <Cartao titulo="Trocar senha">
      <form onSubmit={salvar} className={espaco.formulario}>
        <div>
          <label htmlFor="senha-atual" className={classeRotulo}>
            Senha atual
          </label>
          <input
            id="senha-atual"
            name="atual"
            type="password"
            autoComplete="current-password"
            required
            value={campos.atual}
            onChange={mudar}
            disabled={ocupado}
            className={classeCampo}
          />
        </div>
        <div>
          <label htmlFor="senha-nova" className={classeRotulo}>
            Nova senha
          </label>
          <input
            id="senha-nova"
            name="nova"
            type="password"
            autoComplete="new-password"
            required
            minLength={TAMANHO_MINIMO_SENHA}
            value={campos.nova}
            onChange={mudar}
            disabled={ocupado}
            className={classeCampo}
          />
          <p className={`mt-1 ${texto.apoio}`}>Pelo menos {TAMANHO_MINIMO_SENHA} caracteres.</p>
        </div>
        <div>
          <label htmlFor="senha-confirmacao" className={classeRotulo}>
            Repita a nova senha
          </label>
          <input
            id="senha-confirmacao"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            required
            value={campos.confirmacao}
            onChange={mudar}
            disabled={ocupado}
            className={classeCampo}
          />
        </div>

        <Aviso mensagem={mensagem} className="" />
        <div>
          <Botao type="submit" variante="primario" disabled={ocupado}>
            {etapa === 'conferindo'
              ? 'Conferindo senha atual…'
              : etapa === 'salvando'
                ? 'Salvando nova senha…'
                : 'Trocar senha'}
          </Botao>
        </div>
      </form>
    </Cartao>
  );
};

export default Perfil;
