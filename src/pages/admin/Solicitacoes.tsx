/**
 * ============================================
 * ADMIN · SOLICITAÇÕES
 * ============================================
 *
 * Pedidos dos alunos, de todas as edições (não depende do seletor do topo).
 * O gestor não registra pedido: o aluno abre pela área dele, e a coordenação
 * atende na conversa (estilo WhatsApp), que é onde se inicia o atendimento e
 * se conclui (aprova ou recusa) com a devolutiva.
 * - Lista: em ordem de chegada, com filtro dos que estão em aberto;
 * - Quadro: kanban Aberto -> Em andamento -> Concluído.
 */
import { useCallback, useState } from 'react';

import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { formatarDia } from '../../utils/datas';

import AbasDoCartao from '../../components/admin/AbasDoCartao';
import Avatar from '../../components/admin/Avatar';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import ConversaDaSolicitacao from '../../components/admin/ConversaDaSolicitacao';
import { Carregando } from '../../components/admin/Moldura';
import ResumoDaSolicitacao, { SeloDaSolicitacao } from '../../components/admin/ResumoDaSolicitacao';
import { Aviso, Botao, Vazio, type Mensagem } from '../../components/admin/Ui';
import {
  CHAVE_SOLICITACOES,
  servicoSolicitacoes,
  type SolicitacaoDaEquipe,
  type StatusSolicitacao,
} from '../../lib/solicitacoes';
import { foco, selo, texto } from '../../components/admin/designSystem';

/** Colunas do quadro: cada pedido cai numa só */
const COLUNAS: { id: string; titulo: string; status: StatusSolicitacao[]; cor: string }[] = [
  { id: 'aberto', titulo: 'Aberto', status: ['pendente'], cor: 'border-t-amber-400' },
  { id: 'andamento', titulo: 'Em andamento', status: ['em_andamento'], cor: 'border-t-blue-500' },
  { id: 'concluido', titulo: 'Concluído', status: ['aprovada', 'recusada'], cor: 'border-t-favela-green-500' },
];

type Aba = 'lista' | 'quadro';

const Solicitacoes: React.FC = () => {
  // Já vem pronto do cache (o layout carrega na abertura); atualiza por trás
  const { dados: lista, erro, recarregar } = useDadosEmCache(CHAVE_SOLICITACOES, () => servicoSolicitacoes.carregar());
  const [aba, setAba] = useState<Aba>('lista');
  const [mostrar, setMostrar] = useState<'abertas' | 'todas'>('abertas');
  // Guarda só o id: a conversa sempre mostra o pedido como está na lista (status atualizado)
  const [conversaId, setConversaId] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  const carregar = useCallback(
    () => recarregar().catch(() => setMensagem({ tipo: 'erro', texto: 'Não foi possível atualizar as solicitações.' })),
    [recarregar],
  );
  const fecharConversa = useCallback(() => {
    setConversaId(null);
    carregar();
  }, [carregar]);

  // Sem os dados: carregamento na hora (nunca tela em branco) e pintura completa
  const mostrarCarregando = useCarregamentoCompleto(lista === undefined && !erro, 0);
  if (erro && lista === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar as solicitações.' }} />;
  if (mostrarCarregando || lista === undefined) return <Carregando texto="Carregando solicitações" />;

  const abertas = lista.filter((s) => servicoSolicitacoes.emAberto(s));
  const visiveis = mostrar === 'todas' ? lista : abertas;
  const conversa = lista.find((s) => s.id === conversaId) ?? null;

  /** Botão de cada pedido, igual na lista e no quadro: tudo se resolve na conversa */
  const abrirConversa = (s: SolicitacaoDaEquipe) => (
    <Botao tamanho="pequeno" variante="primario" onClick={() => setConversaId(s.id)}>
      {servicoSolicitacoes.emAberto(s) ? 'Atender' : 'Ver conversa'}
    </Botao>
  );

  const painelLista = (
    <>
      <div
        className="mb-4 inline-flex rounded-lg border border-gray-300 bg-white p-1 text-sm"
        role="group"
        aria-label="Quais mostrar"
      >
        {(['abertas', 'todas'] as const).map((op) => (
          <button
            key={op}
            type="button"
            aria-pressed={mostrar === op}
            onClick={() => setMostrar(op)}
            className={`rounded-md px-3 py-1.5 font-medium ${foco} ${
              mostrar === op ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {op === 'abertas' ? `Em aberto (${abertas.length})` : 'Todas'}
          </button>
        ))}
      </div>
      {!visiveis.length ? (
        <Vazio>
          {mostrar === 'abertas' ? 'Nenhuma solicitação em aberto.' : 'Nenhuma solicitação por aqui.'}
          <br />
          Os alunos abrem as solicitações pela área deles.
        </Vazio>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((s) => (
            <ResumoDaSolicitacao
              key={s.id}
              solicitacao={s}
              cabecalho={
                <>
                  <Avatar foto={s.foto} nome={s.aluno} tamanho="md" />
                  <p className="font-medium text-gray-900">{s.aluno}</p>
                  <span className={`${selo.base} ${selo.neutro}`}>{s.edicao}</span>
                </>
              }
              acoes={abrirConversa(s)}
            />
          ))}
        </ul>
      )}
    </>
  );

  const painelQuadro = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {COLUNAS.map((coluna) => {
        const daColuna = lista.filter((s) => coluna.status.includes(s.status));
        return (
          <section
            key={coluna.id}
            aria-labelledby={`coluna-${coluna.id}`}
            className={`flex min-h-[12rem] flex-col rounded-lg border border-t-4 border-gray-200 bg-gray-50 ${coluna.cor}`}
          >
            <h3
              id={`coluna-${coluna.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900"
            >
              {coluna.titulo}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                {daColuna.length}
              </span>
            </h3>
            <ul className="flex-1 space-y-3 px-3 pb-3">
              {!daColuna.length && <li className={`px-1 py-4 text-center ${texto.apoio}`}>Nada por aqui.</li>}
              {daColuna.map((s) => (
                <li key={s.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Avatar foto={s.foto} nome={s.aluno} />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900" title={s.aluno}>
                      {s.aluno}
                    </p>
                    {coluna.id === 'concluido' && <SeloDaSolicitacao status={s.status} />}
                  </div>
                  <p className={`mt-1 ${texto.apoio}`}>
                    {s.tipo} · {s.edicao} · {formatarDia(s.criada_em)}
                  </p>
                  <p className="mb-3 mt-2 line-clamp-3 whitespace-pre-line text-sm text-gray-800">{s.descricao}</p>
                  {abrirConversa(s)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );

  return (
    <>
      <Aviso mensagem={mensagem} />

      <AbasDoCartao<Aba>
        id="solicitacoes"
        rotulo="Solicitações"
        ativa={aba}
        aoTrocar={setAba}
        abas={[
          { valor: 'lista', rotulo: 'Lista', painel: painelLista },
          {
            valor: 'quadro',
            rotulo: 'Quadro',
            total: abertas.length,
            alerta: abertas.length ? `${abertas.length} em aberto` : undefined,
            painel: painelQuadro,
          },
        ]}
      />

      <ConversaDaSolicitacao solicitacao={conversa} modo="gestor" onFechar={fecharConversa} aoMudar={carregar} />
    </>
  );
};

export default Solicitacoes;
