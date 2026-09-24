/**
 * ============================================
 * ADMIN · AVALIAÇÕES DO FIM DA EDIÇÃO
 * ============================================
 *
 * Três abas, na edição escolhida no topo:
 * - Instrutores: a data a partir da qual os instrutores avaliam e quem já avaliou;
 * - Banca: os membros da banca (nome, e-mail e organização). Quem é de fora recebe
 *   convite por e-mail e entra numa conta que só vê a avaliação; quem já tem
 *   conta (ex.: uma gestora) só é vinculado e avalia pelo botão "Avaliar como banca";
 * - Resultado: média dos instrutores + soma da banca, da maior para a menor.
 * Edição encerrada fica só para consulta (o banco também recusa).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import AbasDoCartao from '../../components/admin/AbasDoCartao';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import Janela from '../../components/admin/Janela';
import { Carregando } from '../../components/admin/Moldura';
import TabelaDeClassificacao from '../../components/admin/TabelaDeClassificacao';
import {
  Aviso,
  Botao,
  Cartao,
  Indicador,
  JanelaDeConfirmacao,
  Vazio,
  classeCampo,
  classeRotulo,
  type Mensagem,
  classeDoBotao,
} from '../../components/admin/Ui';
import { espaco, selo, texto } from '../../components/admin/designSystem';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { chaveAvaliacoes, servicoAvaliacoes } from '../../lib/avaliacoes';
import { servicoSessao } from '../../lib/sessao';
import { formatarData } from '../../utils/datas';
import { useAdmin } from './contexto';

type Aba = 'instrutores' | 'banca' | 'resultado';

const formatarNota = (n: number | null) =>
  n === null ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const Avaliacoes: React.FC = () => {
  const { edicao } = useAdmin();
  const encerrada = edicao.encerrada;
  const {
    dados: painel,
    erro,
    recarregar,
  } = useDadosEmCache(chaveAvaliacoes(edicao.id), () => servicoAvaliacoes.carregarPainel(edicao.id));
  const resultado = useDadosEmCache(`${chaveAvaliacoes(edicao.id)}:resultado`, () =>
    servicoAvaliacoes.carregarResultado(edicao.id),
  );
  const [aba, setAba] = useState<Aba>('instrutores');
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  // Datas digitadas (null = ainda não mexeu: vale a do banco)
  const [prazos, setPrazos] = useState<{ inicio?: string; fim?: string; banca?: string }>({});
  const [novoMembro, setNovoMembro] = useState(false);
  const [campos, setCampos] = useState({ nome: '', email: '', organizacao: '' });
  const [ocupado, setOcupado] = useState(false);
  const [erroJanela, setErroJanela] = useState<Mensagem>(null);
  // undefined = ainda não sabe quem está logado (o resultado fica escondido até saber)
  const [meuId, setMeuId] = useState<string | null | undefined>(undefined);
  const [tirando, setTirando] = useState<{ id: number; nome: string; avaliados: number } | null>(null);
  const fecharNovo = useCallback(() => setNovoMembro(false), []);
  const fecharTirar = useCallback(() => setTirando(null), []);

  // Quem está logado (para saber se também está na banca desta edição)
  useEffect(() => {
    servicoSessao
      .contaLogada()
      .then((l) => setMeuId(l?.conta.id ?? null))
      .catch((e) => console.error('[avaliações] não conferiu a conta logada', e?.code ?? e?.message));
  }, []);

  const atualizar = () =>
    Promise.all([recarregar(), resultado.recarregar()]).catch(() =>
      setMensagem({ tipo: 'erro', texto: 'Não foi possível atualizar as avaliações.' }),
    );

  /** Uma ação do gestor: mostra o erro ou o aviso e atualiza a tela */
  const agir = async (acao: () => Promise<string | null>, sucesso: string) => {
    setOcupado(true);
    setMensagem(null);
    const falha = await acao();
    setOcupado(false);
    setMensagem(falha ? { tipo: 'erro', texto: falha } : { tipo: 'sucesso', texto: sucesso });
    if (!falha) await atualizar();
  };

  const cadastrar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Confere antes de convidar: o e-mail não sai para quem não vai entrar
    if (painel?.banca.some((m) => m.email === campos.email.trim().toLowerCase())) {
      return setErroJanela({ tipo: 'erro', texto: 'Esta pessoa já está na banca desta edição.' });
    }
    setOcupado(true);
    const { erro: falha, convidado } = await servicoAvaliacoes.cadastrarMembro(edicao.id, campos);
    setOcupado(false);
    if (falha) return setErroJanela({ tipo: 'erro', texto: falha });
    setNovoMembro(false);
    setMensagem({
      tipo: 'sucesso',
      texto: convidado
        ? `Convite enviado para ${campos.email.trim()}. Ao criar a senha, ${campos.nome.trim()} já cai na avaliação.`
        : `${campos.nome.trim()} já tinha conta e foi posto na banca. Ele avalia pelo próprio acesso.`,
    });
    await atualizar();
  };

  const mostrarCarregando = useCarregamentoCompleto(painel === undefined && !erro, 0);
  if (erro && painel === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar as avaliações.' }} />;
  if (mostrarCarregando || painel === undefined) return <Carregando texto="Carregando avaliações" />;

  const prazosNaTela = {
    inicio: prazos.inicio ?? painel.liberadaEm ?? '',
    fim: prazos.fim ?? painel.liberadaAte ?? '',
    banca: prazos.banca ?? painel.bancaEm ?? '',
  };
  const salvarPrazoDosInstrutores = () =>
    agir(
      () =>
        servicoAvaliacoes.definirPrazos(edicao.id, {
          inicio: prazosNaTela.inicio || null,
          fim: prazosNaTela.fim || null,
        }),
      'Prazo salvo.',
    );
  const salvarDiaDaBanca = () =>
    agir(() => servicoAvaliacoes.definirPrazos(edicao.id, { banca: prazosNaTela.banca || null }), 'Dia salvo.');
  /** Campo de data dos prazos (instrutores e banca usam o mesmo) */
  const campoDeData = (chave: 'inicio' | 'fim' | 'banca', rotulo: string) => (
    <div>
      <label htmlFor={`prazo-${chave}`} className={classeRotulo}>
        {rotulo}
      </label>
      <input
        id={`prazo-${chave}`}
        type="date"
        value={prazosNaTela[chave]}
        onChange={(e) => setPrazos((p) => ({ ...p, [chave]: e.target.value }))}
        disabled={encerrada || ocupado}
        className={classeCampo}
      />
    </div>
  );
  const turmasAvaliadas = painel.instrutores.filter(
    (t) => t.instrutores.length && t.instrutores.every((i) => i.avaliou),
  ).length;
  const bancaConcluida = painel.banca.filter((m) => m.concluida_em).length;
  // Gestor(a) que também é da banca: só vê o resultado depois de concluir as notas
  // dela, para não ver as dos outros membros antes (regra da banca)
  const minhaBanca = painel.banca.find((m) => m.perfil_id === meuId);
  // Sem saber quem está logado, esconde (falha fechada)
  const resultadoEscondido = meuId === undefined || Boolean(minhaBanca && !minhaBanca.concluida_em);

  const painelInstrutores = (
    <div className={espaco.lista}>
      <Cartao
        titulo="Prazo da avaliação"
        descricao="Só dentro deste prazo os instrutores veem a avaliação dos alunos das turmas deles. Fora dele, nem aparece no menu."
      >
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            salvarPrazoDosInstrutores();
          }}
        >
          {campoDeData('inicio', 'Início')}
          {campoDeData('fim', 'Fim')}
          <Botao type="submit" variante="primario" disabled={encerrada || ocupado}>
            Salvar prazo
          </Botao>
          <p className={texto.apoio}>
            {painel.liberadaEm
              ? `De ${formatarData(painel.liberadaEm)}${painel.liberadaAte ? ` até ${formatarData(painel.liberadaAte)}` : ' em diante'}.`
              : 'Sem prazo: os instrutores ainda não avaliam.'}
          </p>
        </form>
      </Cartao>

      {!painel.instrutores.length ? (
        <Vazio>Esta edição ainda não tem turmas.</Vazio>
      ) : (
        painel.instrutores.map((t) => (
          <Cartao key={t.turmaId} titulo={t.turma}>
            {!t.instrutores.length ? (
              <p className={texto.apoio}>Nenhum instrutor vinculado a esta turma.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {t.instrutores.map((i) => (
                  <li key={i.id} className={`${selo.base} ${i.avaliou ? selo.sucesso : selo.atencao}`}>
                    {i.nome} · {i.avaliou ? 'avaliou' : 'pendente'}
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        ))
      )}
    </div>
  );

  const painelBanca = (
    <div className={espaco.lista}>
      <Cartao
        titulo="Dia da banca"
        descricao="A banca avalia na apresentação final (formatura): só neste dia ela consegue dar nota."
      >
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            salvarDiaDaBanca();
          }}
        >
          {campoDeData('banca', 'Dia da apresentação')}
          <Botao type="submit" variante="primario" disabled={encerrada || ocupado}>
            Salvar dia
          </Botao>
          <p className={texto.apoio}>
            {painel.bancaEm
              ? `Marcada para ${formatarData(painel.bancaEm)}.`
              : 'Sem dia marcado: a banca ainda não avalia.'}
          </p>
        </form>
      </Cartao>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={texto.apoio}>
          Quem é de fora recebe um convite por e-mail e entra numa conta que só vê a avaliação. Cada membro dá nota de 0
          a 5 a cada aluno e só vê as próprias notas; quando todos concluem, aparece a lista final.
        </p>
        <div className="flex flex-wrap gap-2">
          {minhaBanca && (
            <Link to="/banca" className={classeDoBotao()}>
              Avaliar como banca
            </Link>
          )}
          <Botao
            variante="primario"
            disabled={encerrada}
            onClick={() => {
              setErroJanela(null);
              setCampos({ nome: '', email: '', organizacao: '' });
              setNovoMembro(true);
            }}
          >
            + Membro da banca
          </Botao>
        </div>
      </div>
      {!painel.banca.length ? (
        <Vazio>Nenhum membro na banca desta edição.</Vazio>
      ) : (
        <ul className={espaco.lista}>
          {painel.banca.map((m) => (
            <li key={m.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className={texto.destaque}>
                    {m.nome} <span className="text-gray-500">({m.organizacao})</span>
                  </p>
                  <p className={texto.apoio}>
                    {m.email} · {m.avaliados} de {painel.alunos} alunos avaliados
                  </p>
                </div>
                <span className={`${selo.base} ${m.concluida_em ? selo.sucesso : selo.atencao}`}>
                  {m.concluida_em ? 'Concluiu' : 'Avaliando'}
                </span>
                {!encerrada && (
                  <div className="flex flex-wrap gap-2">
                    <Botao
                      tamanho="pequeno"
                      variante="perigo"
                      disabled={ocupado}
                      onClick={() => setTirando({ id: m.id, nome: m.nome, avaliados: m.avaliados })}
                    >
                      Tirar
                    </Botao>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const painelResultado = resultadoEscondido ? (
    <Vazio>
      {meuId === undefined
        ? 'Conferindo o seu acesso. Se o resultado não aparecer, recarregue a página.'
        : 'Você está na banca desta edição: o resultado aparece aqui depois que você concluir as suas notas.'}
    </Vazio>
  ) : resultado.erro && resultado.dados === undefined ? (
    <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível calcular o resultado. Recarregue a página.' }} />
  ) : resultado.dados === undefined ? (
    <Carregando texto="Calculando o resultado" />
  ) : !resultado.dados.length ? (
    <Vazio>Esta edição não tem alunos.</Vazio>
  ) : (
    <div className={espaco.lista}>
      <p className={texto.apoio}>
        Total = média das somas dos instrutores (0 a 15) + soma das notas de todos os membros da banca.
      </p>
      <TabelaDeClassificacao
        linhas={resultado.dados.map((l) => ({
          chave: l.participante_id,
          nome: l.nome,
          foto: l.foto,
          turma: l.turma,
          total: Number(l.total),
          detalhe: `Instrutores ${formatarNota(l.nota_instrutores)} (${l.instrutores_que_avaliaram} de ${Math.max(l.instrutores_da_turma, l.instrutores_que_avaliaram)}) · Banca ${formatarNota(l.nota_banca)} (${l.membros_que_avaliaram} de ${painel.banca.length})`,
        }))}
      />
    </div>
  );

  return (
    <>
      <Aviso mensagem={mensagem} />

      <div className={`mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3`}>
        <Indicador
          rotulo="Turmas avaliadas pelos instrutores"
          valor={`${turmasAvaliadas}/${painel.instrutores.length}`}
          tom={turmasAvaliadas === painel.instrutores.length && turmasAvaliadas > 0 ? 'positivo' : 'normal'}
        />
        <Indicador
          rotulo="Banca que concluiu"
          valor={`${bancaConcluida}/${painel.banca.length}`}
          tom={painel.banca.length > 0 && bancaConcluida === painel.banca.length ? 'positivo' : 'normal'}
        />
        <Indicador rotulo="Alunos na edição" valor={String(painel.alunos)} />
      </div>

      <AbasDoCartao<Aba>
        id="avaliacoes"
        rotulo="Avaliações"
        ativa={aba}
        aoTrocar={setAba}
        abas={[
          { valor: 'instrutores', rotulo: 'Instrutores', painel: painelInstrutores },
          { valor: 'banca', rotulo: 'Banca avaliadora', total: painel.banca.length, painel: painelBanca },
          { valor: 'resultado', rotulo: 'Resultado', painel: painelResultado },
        ]}
      />

      <JanelaDeConfirmacao
        titulo="Tirar da banca?"
        aberta={tirando !== null}
        aoFechar={fecharTirar}
        aoConfirmar={async () => {
          if (!tirando) return;
          await agir(() => servicoAvaliacoes.excluirMembro(tirando.id), 'Membro tirado da banca.');
          setTirando(null);
        }}
        ocupado={ocupado}
        variante="perigo"
        rotuloConfirmar="Tirar e apagar as notas"
        rotuloOcupado="Tirando…"
        rotuloVoltar="Voltar"
      >
        <strong>{tirando?.nome}</strong> sai da banca e as {tirando?.avaliados ?? 0} notas dele(a) são apagadas. Não dá
        para desfazer.
      </JanelaDeConfirmacao>

      <Janela titulo="Membro da banca" aberta={novoMembro} onFechar={fecharNovo}>
        <form onSubmit={cadastrar} className="space-y-4">
          <Aviso mensagem={erroJanela} className="" />
          <div>
            <label htmlFor="banca-nome" className={classeRotulo}>
              Nome *
            </label>
            <input
              id="banca-nome"
              required
              maxLength={120}
              value={campos.nome}
              onChange={(e) => setCampos((c) => ({ ...c, nome: e.target.value }))}
              className={classeCampo}
              placeholder="Ex: Luiz"
            />
          </div>
          <div>
            <label htmlFor="banca-email" className={classeRotulo}>
              E-mail *
            </label>
            <input
              id="banca-email"
              type="email"
              required
              maxLength={200}
              value={campos.email}
              onChange={(e) => setCampos((c) => ({ ...c, email: e.target.value }))}
              className={classeCampo}
              placeholder="Ex: luiz@mundiale.com.br"
            />
            <p className={`mt-1 ${texto.apoio}`}>
              Se já tiver conta no portal (ex.: gestora), é só vinculada; senão, recebe o convite neste e-mail.
            </p>
          </div>
          <div>
            <label htmlFor="banca-organizacao" className={classeRotulo}>
              Organização *
            </label>
            <input
              id="banca-organizacao"
              required
              maxLength={120}
              value={campos.organizacao}
              onChange={(e) => setCampos((c) => ({ ...c, organizacao: e.target.value }))}
              className={classeCampo}
              placeholder="Ex: Mundiale"
            />
          </div>
          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Botao type="submit" variante="primario" disabled={ocupado}>
              {ocupado ? 'Enviando…' : 'Convidar para a banca'}
            </Botao>
          </div>
        </form>
      </Janela>
    </>
  );
};

export default Avaliacoes;
