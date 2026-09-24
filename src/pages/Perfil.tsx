/**
 * ============================================
 * MEU PERFIL (gestor, professor, aluno e parceiro, este só para ver)
 * ============================================
 *
 * Aberta pela foto na barra superior. Dois cartões:
 * 1. Meus dados: o que cada papel pode alterar (ver lib/perfil.ts).
 * 2. Trocar senha: pede a senha atual antes de gravar a nova.
 * O instrutor tem um terceiro: o atalho para atualizar os dados do RPA.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import Carregamento, { aguardarCicloCompleto, useCarregamentoCompleto } from '../components/admin/Carregamento';
import { Carregando } from '../components/admin/Moldura';
import { Aviso, Botao, Cartao, classeCampo, classeRotulo, type Mensagem, classeDoBotao } from '../components/admin/Ui';
import { espaco, selo, superficie, texto } from '../components/admin/designSystem';
import Avatar from '../components/admin/Avatar';
import { CAPA_AZUL, CAPA_VERDE } from '../data/imagens';
import { useCampos } from '../hooks/useCampos';
import { servicoPerfil, type MeusDados, type RedesDoPerfil } from '../lib/perfil';
import { IconeGithub, IconeGmail, IconeLinkedin } from '../components/RedesSociais';
import CamposDeNovaSenha from '../components/CamposDeNovaSenha';
import { servicoSenha, type EtapaSenha } from '../lib/senha';
import { StatusProcessamento } from '../types';
import { hoje as hojeLocal } from '../utils/datas';
import { emailValido } from '../utils/texto';
import { NOME_DO_PAPEL } from '../lib/sessao';

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
    <div className="w-full">
      <Identidade dados={dados} />
      <div className={`grid grid-cols-1 ${espaco.grade} lg:grid-cols-2`}>
        <MeusDadosCartao dados={dados} />
        <TrocarSenhaCartao />
        <RedesCartao dados={dados} />
        {dados.papel === 'professor' && (
          <Cartao
            titulo="Dados para o RPA"
            descricao="CPF, identidade, INSS/PIS, endereço e os outros dados do recibo de pagamento."
            className="lg:col-span-2"
          >
            <Link to="/dados-do-instrutor" className={classeDoBotao()}>
              Ver e atualizar meus dados
            </Link>
          </Cartao>
        )}
      </div>
    </div>
  );
};

// ============ 0. QUEM ESTÁ LOGADO ============
/**
 * Cartão de identidade: capa da marca (#programandomudanças), foto grande, nome,
 * papel e acesso. A capa é a verde no tema claro e a azul no escuro; o resto usa
 * as cores do design system, que têm versão no tema escuro.
 */
const Identidade: React.FC<{ dados: MeusDados }> = ({ dados }) => (
  <section aria-label="Quem está logado" className={`${superficie.cartao} ${espaco.entreBlocos} overflow-hidden`}>
    {/* Faixa baixa com a arte inteira (sem cortar): as laterais ficam na cor de fundo da própria capa */}
    <img src={CAPA_VERDE} alt="" className="so-tema-claro h-24 w-full bg-[#91d429] object-contain sm:h-32" />
    <img src={CAPA_AZUL} alt="" className="so-tema-escuro h-24 w-full bg-[#21225f] object-contain sm:h-32" />
    <div className="flex flex-col items-center gap-3 px-5 pb-5 text-center sm:flex-row sm:items-end sm:gap-5 sm:text-left">
      {/* A foto sobe sobre a faixa; o anel tem a cor do cartão (clara ou escura) */}
      <span className="-mt-10 shrink-0 rounded-full bg-white p-1 shadow-md sm:-mt-12">
        <Avatar foto={dados.foto} nome={dados.nome} tamanho="lg" />
      </span>
      <div className="min-w-0 flex-1 sm:pb-1">
        <h2 className="truncate text-lg font-semibold text-gray-900">{dados.nome || 'Sem nome'}</h2>
        <p className={`mt-0.5 truncate ${texto.apoio}`}>{dados.acesso}</p>
      </div>
      {dados.papel && <span className={`${selo.base} ${selo.marca} sm:mb-1`}>{NOME_DO_PAPEL[dados.papel]}</span>}
    </div>
  </section>
);

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
    <Cartao
      titulo="Meus dados"
      descricao={podeEditar ? 'O que aparece para a coordenação e na conversa.' : 'Só para consulta.'}
    >
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
              <p className={`mt-1 ${texto.apoio}`}>
                {dados.papel === 'aluno'
                  ? 'É o nome da chamada. Para corrigir, fale com a coordenação.'
                  : 'Para corrigir, fale com a coordenação.'}
              </p>
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
          <p className={`mt-1 ${texto.apoio}`}>O acesso não muda por aqui.</p>
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

// ============ 3. REDES E CONTATO ============
/**
 * LinkedIn, GitHub e Gmail (e-mail de contato), cada um com o ícone da marca.
 * Colou o endereço inteiro ou só o usuário: o serviço completa e confere.
 * No site (páginas Sobre e da turma) aparece SÓ o LinkedIn. O aluno já tem o
 * e-mail de contato em "Meus dados", então aqui ficam só LinkedIn e GitHub.
 */
const REDES = [
  {
    chave: 'linkedin',
    rotulo: 'LinkedIn',
    Icone: IconeLinkedin,
    cor: 'bg-[#0a66c2]',
    tipo: 'text',
    exemplo: 'linkedin.com/in/seu-nome',
  },
  { chave: 'github', rotulo: 'GitHub', Icone: IconeGithub, cor: 'bg-gray-900', tipo: 'text', exemplo: 'seu-usuario' },
  {
    chave: 'emailContato',
    rotulo: 'Gmail',
    Icone: IconeGmail,
    cor: 'bg-[#ea4335]',
    tipo: 'email',
    exemplo: 'seu-nome@gmail.com',
  },
] as const;

const RedesCartao: React.FC<{ dados: MeusDados }> = ({ dados }) => {
  const { campos, setCampos, aoAlterarCampo } = useCampos<RedesDoPerfil>(dados.redes);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const redes = REDES.filter((r) => r.chave !== 'emailContato' || dados.papel !== 'aluno');
  // Só aluno (página da turma) e instrutor (equipe da página Sobre) aparecem no site
  const saiNoSite = dados.papel === 'aluno' || dados.papel === 'professor';

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    setSalvando(true);
    const problema = await servicoPerfil.salvarRedes(campos);
    setSalvando(false);
    if (problema) return setMensagem({ tipo: 'erro', texto: problema });
    // Mostra como ficou gravado (endereço completo)
    const atualizado = await servicoPerfil.carregarMeusDados().catch(() => null);
    if (atualizado) setCampos(atualizado.redes);
    setMensagem({ tipo: 'sucesso', texto: `Redes salvas.${saiNoSite ? ' O LinkedIn já aparece no site.' : ''}` });
  };

  return (
    <Cartao
      titulo="Redes e contato"
      descricao={
        dados.papel === 'professor'
          ? 'Seu LinkedIn aparece na equipe da página Sobre (sem ele aqui, vale o dos dados da bolsa). GitHub e Gmail ficam só no portal.'
          : saiNoSite
            ? 'Seu LinkedIn aparece na página da sua turma, no site. GitHub fica só no portal.'
            : 'Seus contatos ficam só aqui no portal.'
      }
      className="lg:col-span-2"
    >
      <form onSubmit={salvar} className={espaco.formulario}>
        <div className={`grid grid-cols-1 ${espaco.compacto} md:grid-cols-3`}>
          {redes.map((r) => (
            <div key={r.chave}>
              <label htmlFor={`rede-${r.chave}`} className={classeRotulo}>
                {r.rotulo}
              </label>
              <div className="flex items-stretch">
                <span
                  className={`flex w-10 shrink-0 items-center justify-center rounded-l-lg text-white ${r.cor}`}
                  aria-hidden="true"
                >
                  <r.Icone className="h-5 w-5" />
                </span>
                <input
                  id={`rede-${r.chave}`}
                  name={r.chave}
                  type={r.tipo}
                  inputMode={r.tipo === 'email' ? 'email' : 'url'}
                  autoComplete={r.tipo === 'email' ? 'email' : 'off'}
                  maxLength={200}
                  value={campos[r.chave]}
                  onChange={aoAlterarCampo}
                  disabled={salvando}
                  className={`${classeCampo} rounded-l-none`}
                  placeholder={r.exemplo}
                />
              </div>
            </div>
          ))}
        </div>
        <Aviso mensagem={mensagem} className="" />
        <div>
          <Botao type="submit" variante="primario" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar redes'}
          </Botao>
        </div>
      </form>
    </Cartao>
  );
};

// ============ 2. TROCAR SENHA ============

/** Confirmação da troca: o ✓ se desenha e a mensagem entra logo depois */
const SenhaTrocada: React.FC<{ aoContinuar: () => void }> = ({ aoContinuar }) => (
  <motion.div
    role="status"
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col items-center py-6 text-center"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-favela-green-500 to-favela-green-600 shadow-lg shadow-favela-green-500/30"
    >
      {/* Onda que se espalha em volta do círculo */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border-2 border-favela-green-500"
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
      />
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" aria-hidden="true">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="white"
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
      <p className="text-lg font-bold text-gray-900">Senha trocada!</p>
      <p className={`mx-auto mt-1 max-w-xs ${texto.corpo} text-gray-600`}>
        Nos outros aparelhos, será preciso entrar de novo.
      </p>
      <div className="mx-auto mt-4 flex max-w-xs items-start gap-2 rounded-lg bg-gray-50 p-3 text-left text-xs text-gray-600">
        <span aria-hidden="true">🔒</span>
        <span>Neste aparelho você continua conectado. Guarde a nova senha num lugar seguro.</span>
      </div>
      <Botao className="mt-5" onClick={aoContinuar}>
        Concluir
      </Botao>
    </motion.div>
  </motion.div>
);

const TrocarSenhaCartao: React.FC = () => {
  const vazio = { atual: '', senha: '', confirmacao: '' };
  const { campos, setCampos, aoAlterarCampo } = useCampos(vazio);
  const [etapa, setEtapa] = useState<EtapaSenha | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [trocada, setTrocada] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    const problema = servicoSenha.validarNova(campos.senha, campos.confirmacao, 'A nova senha', 'As duas senhas novas');
    if (problema) return setMensagem({ tipo: 'erro', texto: problema });

    const resultado = await servicoSenha.trocar(campos.atual, campos.senha, setEtapa);
    await aguardarCicloCompleto(); // a pintura do carregamento termina antes do resultado
    setEtapa(null);
    if (resultado.status !== StatusProcessamento.Sucesso)
      return setMensagem({ tipo: 'erro', texto: resultado.mensagem! });
    setCampos(vazio);
    setTrocada(true);
  };

  const ocupado = etapa !== null;

  return (
    <Cartao titulo="Segurança" descricao="Troque a senha quando quiser. Os outros aparelhos saem da conta.">
      <div className="relative">
        {ocupado && (
          <Carregamento
            modo="sobreposto"
            texto={etapa === 'conferindo' ? 'Conferindo a senha atual' : 'Salvando a nova senha'}
          />
        )}
        {trocada ? (
          <SenhaTrocada aoContinuar={() => setTrocada(false)} />
        ) : (
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
                onChange={aoAlterarCampo}
                disabled={ocupado}
                className={classeCampo}
              />
            </div>
            <CamposDeNovaSenha
              senha={campos.senha}
              confirmacao={campos.confirmacao}
              aoAlterar={aoAlterarCampo}
              rotuloDaSenha="Nova senha"
              rotuloDaConfirmacao="Repita a nova senha"
              estilo={{ campo: classeCampo, rotulo: classeRotulo }}
              prefixoDoId="nova-"
              desabilitado={ocupado}
            />

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
        )}
      </div>
    </Cartao>
  );
};

export default Perfil;
