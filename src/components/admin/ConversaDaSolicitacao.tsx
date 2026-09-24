/**
 * ============================================
 * CONVERSA DE UMA SOLICITAÇÃO (estilo WhatsApp)
 * ============================================
 *
 * A mesma janela para o aluno e para a coordenação (o banco decide quem lê e
 * escreve):
 * - cada fala é um balão com a foto de quem escreveu: as minhas à direita
 *   (verde), as da outra pessoa à esquerda (branco);
 * - começa com o pedido do aluno e termina com a devolutiva;
 * - a coordenação cuida do atendimento aqui mesmo: "Iniciar atendimento",
 *   e para concluir escreve a devolutiva e clica em "Aprovar" ou "Recusar".
 *   Mandar mensagem num pedido aberto já inicia o atendimento (o banco muda).
 *   Reabrir guarda a devolutiva, que volta na caixa para ser ajustada.
 * - O aluno aparece sempre com a foto da ficha (a mesma do pedido).
 * - Enquanto a janela está aberta, busca mensagens novas a cada 30 s (só com a
 *   aba visível): simples e barato, sem conexão aberta o tempo todo.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  servicoSolicitacoes,
  TAMANHO_MAXIMO_TEXTO,
  type MensagemDaSolicitacao,
  type Solicitacao,
  type SolicitacaoDaEquipe,
  type StatusSolicitacao,
} from '../../lib/solicitacoes';
import { servicoSessao, type Papel } from '../../lib/sessao';
import { formatarDataHora } from '../../utils/datas';
import Avatar from './Avatar';
import Janela from './Janela';
import { SeloDaSolicitacao, STATUS_DA_SOLICITACAO } from './ResumoDaSolicitacao';
import { Aviso, Botao, classeTextoLongo, type Mensagem } from './Ui';
import { texto } from './designSystem';

type Modo = 'aluno' | 'gestor';

/** Como cada papel aparece embaixo do nome */
const PAPEL_NA_CONVERSA: Record<Papel, string> = {
  aluno: 'Aluno',
  gestor: 'Coordenação',
  professor: 'Instrutor',
  parceiro: 'Parceiro',
  banca: 'Banca avaliadora',
};

const INTERVALO_DE_ATUALIZACAO_MS = 30_000;

/** O que está em andamento agora (só esse botão mostra "…") */
type Acao = 'enviar' | 'aprovada' | 'recusada' | 'mover' | 'reabrir';

interface Props {
  solicitacao: Solicitacao | SolicitacaoDaEquipe | null;
  modo: Modo;
  onFechar: () => void;
  /** A coordenação mudou o status: quem abriu a janela recarrega a lista */
  aoMudar?: () => Promise<unknown>;
}

/** Um balão: foto ao lado, nome e papel em cima, hora no canto */
const Balao: React.FC<{
  autor: string;
  papel: string;
  foto: string | null;
  quando: string;
  minha: boolean;
  destaque?: string;
  children: React.ReactNode;
}> = ({ autor, papel, foto, quando, minha, destaque, children }) => (
  <li className={`flex items-end gap-2 ${minha ? 'flex-row-reverse' : ''}`}>
    <Avatar foto={foto} nome={autor} />
    <div
      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
        minha ? 'rounded-br-sm bg-[#d9fdd3]' : 'rounded-bl-sm bg-white'
      }`}
    >
      <p className="mb-0.5 text-xs">
        <span className="font-semibold text-[#2d2a5f]">{minha ? 'Você' : autor}</span>
        <span className="text-gray-500"> · {papel}</span>
      </p>
      {destaque && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">{destaque}</p>}
      <p className="whitespace-pre-line break-words text-gray-900">{children}</p>
      <p className="mt-1 text-right text-[11px] text-gray-500">{quando}</p>
    </div>
  </li>
);

const ConversaDaSolicitacao: React.FC<Props> = ({ solicitacao, modo, onFechar, aoMudar }) => {
  const [mensagens, setMensagens] = useState<MensagemDaSolicitacao[] | null>(null);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [textoNovo, setTextoNovo] = useState('');
  const [emAndamento, setEmAndamento] = useState<Acao | null>(null);
  const ocupado = emAndamento !== null;
  const [aviso, setAviso] = useState<Mensagem>(null);
  const fim = useRef<HTMLLIElement>(null);
  const id = solicitacao?.id ?? null;
  // A conversa aberta agora: resposta que chegar atrasada de outra conversa é descartada
  const conversaAtual = useRef<number | null>(null);
  conversaAtual.current = id;

  const carregar = useCallback(async () => {
    if (id === null) return;
    try {
      const lidas = await servicoSolicitacoes.carregarMensagens(id);
      if (conversaAtual.current === id) setMensagens(lidas);
    } catch {
      if (conversaAtual.current === id) setAviso({ tipo: 'erro', texto: 'Não foi possível carregar a conversa.' });
    }
  }, [id]);

  // Ao abrir: limpa, busca e segue buscando enquanto aberta e visível
  useEffect(() => {
    if (id === null) return;
    setMensagens(null);
    setAviso(null);
    setTextoNovo('');
    setEmAndamento(null);
    servicoSessao
      .contaLogada()
      .then((l) => setMeuId(l?.conta.id ?? null))
      .catch(() => setMeuId(null)); // sem saber quem sou, as falas só não ficam à direita
    carregar();
    const relogio = setInterval(() => {
      if (document.visibilityState === 'visible') carregar();
    }, INTERVALO_DE_ATUALIZACAO_MS);
    return () => clearInterval(relogio);
  }, [id, carregar]);

  // Mensagem nova: rola até o fim
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'nearest' });
  }, [mensagens?.length, solicitacao?.status]);

  if (!solicitacao) return null;

  const aberta = servicoSolicitacoes.emAberto(solicitacao);
  // O aluno escreve enquanto a solicitação está aberta; a coordenação, sempre
  const podeEscrever = modo === 'gestor' || aberta;

  /**
   * Faz uma ação e, se deu certo, atualiza quem abriu a janela. Se a pessoa já
   * trocou de conversa quando a resposta chega, nada muda na conversa nova.
   */
  const agir = async (qual: Acao, acao: () => Promise<string | null>, depois?: () => void) => {
    const daConversa = solicitacao.id;
    setEmAndamento(qual);
    setAviso(null);
    const erro = await acao();
    if (conversaAtual.current !== daConversa) return;
    setEmAndamento(null);
    if (erro) return setAviso({ tipo: 'erro', texto: erro });
    depois?.();
    await aoMudar?.();
  };

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await agir(
      'enviar',
      () => servicoSolicitacoes.enviarMensagem(solicitacao.id, textoNovo),
      () => setTextoNovo(''),
    );
    await carregar();
  };

  /** Aprovar ou recusar: o texto escrito vira a devolutiva */
  const concluir = (status: Extract<StatusSolicitacao, 'aprovada' | 'recusada'>) =>
    agir(
      status,
      () => servicoSolicitacoes.responder(solicitacao.id, status, textoNovo),
      () => {
        setTextoNovo('');
        setAviso({ tipo: 'sucesso', texto: `Solicitação ${STATUS_DA_SOLICITACAO[status].rotulo.toLowerCase()}.` });
      },
    );

  /** Reabrir: a devolutiva fica guardada e volta na caixa para ser ajustada */
  const reabrir = () =>
    agir(
      'reabrir',
      () => servicoSolicitacoes.responder(solicitacao.id, 'pendente', solicitacao.resposta ?? ''),
      () => setTextoNovo(solicitacao.resposta ?? ''),
    );

  const minha = (autorId: string | null) => Boolean(meuId && autorId === meuId);
  // Devolutiva: "Você" só para quem concluiu (a lista do gestor traz o id)
  const devolutivaMinha = 'respondida_por_id' in solicitacao && minha(solicitacao.respondida_por_id);

  return (
    <Janela
      titulo={solicitacao.tipo}
      subtitulo={modo === 'gestor' ? `Pedido de ${solicitacao.aluno}` : undefined}
      aberta
      larga
      onFechar={onFechar}
      topo={
        <div className="flex flex-wrap items-center gap-2">
          <SeloDaSolicitacao status={solicitacao.status} />
          {modo === 'gestor' && (
            <div className="ml-auto flex flex-wrap gap-2">
              {solicitacao.status === 'pendente' && (
                <Botao
                  tamanho="pequeno"
                  variante="primario"
                  disabled={ocupado}
                  onClick={() => agir('mover', () => servicoSolicitacoes.mover(solicitacao.id, 'em_andamento'))}
                >
                  Iniciar atendimento
                </Botao>
              )}
              {solicitacao.status === 'em_andamento' && (
                <Botao
                  tamanho="pequeno"
                  disabled={ocupado}
                  onClick={() => agir('mover', () => servicoSolicitacoes.mover(solicitacao.id, 'pendente'))}
                >
                  Voltar para aberto
                </Botao>
              )}
              {!aberta && (
                <Botao tamanho="pequeno" disabled={ocupado} onClick={reabrir}>
                  {emAndamento === 'reabrir' ? 'Reabrindo…' : 'Reabrir'}
                </Botao>
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Fundo de conversa, como no WhatsApp */}
        <ul
          className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl bg-[#efeae2] p-3 sm:p-4"
          aria-live="polite"
          aria-label="Mensagens"
        >
          <Balao
            autor={solicitacao.aluno}
            papel="Aluno"
            foto={solicitacao.foto}
            quando={formatarDataHora(solicitacao.criada_em)}
            minha={modo === 'aluno'}
            destaque="Pedido"
          >
            {solicitacao.descricao}
          </Balao>
          {(mensagens ?? []).map((m) => (
            <Balao
              key={m.id}
              autor={m.autor_nome ?? PAPEL_NA_CONVERSA[m.autor_papel]}
              papel={PAPEL_NA_CONVERSA[m.autor_papel]}
              foto={m.autor_foto}
              quando={formatarDataHora(m.criada_em)}
              minha={minha(m.autor_id)}
            >
              {m.texto}
            </Balao>
          ))}
          {!aberta && solicitacao.resposta && (
            <Balao
              autor={solicitacao.respondida_por ?? 'Coordenação'}
              papel="Coordenação"
              foto={null}
              quando={solicitacao.resolvida_em ? formatarDataHora(solicitacao.resolvida_em) : ''}
              minha={devolutivaMinha}
              destaque={`Devolutiva · ${STATUS_DA_SOLICITACAO[solicitacao.status].rotulo}`}
            >
              {solicitacao.resposta}
            </Balao>
          )}
          {mensagens === null && <li className={`text-center ${texto.apoio}`}>Carregando a conversa…</li>}
          <li ref={fim} aria-hidden="true" />
        </ul>

        <Aviso mensagem={aviso} className="" />

        {podeEscrever ? (
          <form onSubmit={enviar} className="space-y-3">
            <label htmlFor="conversa-texto" className="sr-only">
              Mensagem
            </label>
            <textarea
              id="conversa-texto"
              rows={3}
              maxLength={TAMANHO_MAXIMO_TEXTO}
              value={textoNovo}
              onChange={(e) => setTextoNovo(e.target.value)}
              className={classeTextoLongo}
              placeholder={
                modo === 'aluno'
                  ? 'Escreva para a coordenação…'
                  : aberta
                    ? 'Escreva para o aluno… (para concluir, escreva a devolutiva e clique em Aprovar ou Recusar)'
                    : 'Escreva para o aluno…'
              }
            />
            <div className="flex flex-wrap justify-end gap-2">
              {modo === 'gestor' && aberta && (
                <>
                  <Botao disabled={ocupado} onClick={() => concluir('recusada')}>
                    {emAndamento === 'recusada' ? 'Recusando…' : 'Recusar'}
                  </Botao>
                  <Botao disabled={ocupado} onClick={() => concluir('aprovada')}>
                    {emAndamento === 'aprovada' ? 'Aprovando…' : 'Aprovar'}
                  </Botao>
                </>
              )}
              <Botao type="submit" variante="primario" disabled={ocupado || !textoNovo.trim()}>
                {emAndamento === 'enviar' ? 'Enviando…' : 'Enviar'}
              </Botao>
            </div>
          </form>
        ) : (
          <p className={texto.apoio}>
            Solicitação concluída: a conversa fica só para consulta. Se precisar de outra coisa, abra uma nova
            solicitação.
          </p>
        )}
      </div>
    </Janela>
  );
};

export default ConversaDaSolicitacao;
