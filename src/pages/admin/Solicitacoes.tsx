/**
 * ============================================
 * ADMIN · SOLICITAÇÕES
 * ============================================
 *
 * Lugar dos pedidos dos alunos (mudança de turno, de turma...). Duas abas:
 * - Recebidas: o gestor registra o pedido que chegou (WhatsApp, e-mail, sala)
 *   e responde aprovando ou recusando. Quando existir a área do aluno, o
 *   próprio aluno envia por lá e o pedido cai aqui.
 * - Mudança de horário: o registro da planilha de 2022, em que a Turma 1
 *   escolheu um novo horário de aula.
 */
import { useCallback, useMemo, useState } from 'react';

import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { formatarDia } from '../../utils/datas';

import Avatar from '../../components/admin/Avatar';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import Janela from '../../components/admin/Janela';
import { Carregando } from '../../components/admin/Moldura';
import { Aviso, Botao, Cartao, Vazio, classeCampo, classeRotulo, type Mensagem } from '../../components/admin/Ui';
import {
  chaveSolicitacoes,
  servicoSolicitacoes,
  TIPOS_SOLICITACAO,
  type Solicitacao,
  type StatusSolicitacao,
  type TipoSolicitacao,
} from '../../lib/solicitacoes';
import { useAdmin } from './contexto';
import { foco, texto } from '../../components/admin/designSystem';

const ESTILO_STATUS: Record<StatusSolicitacao, { rotulo: string; classe: string }> = {
  pendente: { rotulo: 'Pendente', classe: 'bg-amber-100 text-amber-800' },
  aprovada: { rotulo: 'Aprovada', classe: 'bg-green-100 text-green-800' },
  recusada: { rotulo: 'Recusada', classe: 'bg-gray-200 text-gray-700' },
};

// ============================================
// ABA 1: SOLICITAÇÕES RECEBIDAS
// ============================================
const Recebidas: React.FC = () => {
  const { edicao, dados } = useAdmin();
  const alunos = useMemo(() => dados.participantes.filter((p) => p.funcao === 'aluno'), [dados.participantes]);
  const alunoPorId = useMemo(() => new Map(alunos.map((a) => [a.id, a])), [alunos]);

  // Já vem pronto do cache (o layout carrega na abertura); atualiza por trás
  const {
    dados: lista,
    erro,
    recarregar,
  } = useDadosEmCache(chaveSolicitacoes(edicao.id), () => servicoSolicitacoes.carregar(edicao.id));
  const [mostrar, setMostrar] = useState<'pendentes' | 'todas'>('pendentes');
  const [nova, setNova] = useState(false);
  const [respondendo, setRespondendo] = useState<Solicitacao | null>(null);
  const [campos, setCampos] = useState({
    participante_id: '',
    tipo: 'mudanca_turno' as TipoSolicitacao,
    descricao: '',
    resposta: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [erroJanela, setErroJanela] = useState<Mensagem>(null);

  const carregar = () =>
    recarregar().catch(() => setMensagem({ tipo: 'erro', texto: 'Não foi possível atualizar as solicitações.' }));

  const aoAlterarCampo = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCampos((anterior) => ({ ...anterior, [name]: value }));
  };

  const fecharNova = useCallback(() => setNova(false), []);
  const fecharResposta = useCallback(() => setRespondendo(null), []);

  const registrar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!campos.participante_id || !campos.descricao.trim()) {
      setErroJanela({ tipo: 'erro', texto: 'Escolha o aluno e descreva o pedido.' });
      return;
    }
    setSalvando(true);
    const erro = await servicoSolicitacoes.registrar(Number(campos.participante_id), campos.tipo, campos.descricao);
    setSalvando(false);
    if (erro) return setErroJanela({ tipo: 'erro', texto: erro });
    setNova(false);
    setMensagem({ tipo: 'sucesso', texto: 'Solicitação registrada.' });
    await carregar();
  };

  const responder = async (status: StatusSolicitacao) => {
    if (!respondendo) return;
    setSalvando(true);
    const erro = await servicoSolicitacoes.responder(respondendo.id, status, campos.resposta);
    setSalvando(false);
    if (erro) return setErroJanela({ tipo: 'erro', texto: erro });
    setRespondendo(null);
    setMensagem({ tipo: 'sucesso', texto: `Solicitação ${ESTILO_STATUS[status].rotulo.toLowerCase()}.` });
    await carregar();
  };

  // Sem os dados: carregamento na hora (nunca tela em branco) e pintura completa
  const mostrarCarregando = useCarregamentoCompleto(lista === undefined && !erro, 0);
  // Carregando: ocupa a página toda (sem os botões do topo ao lado)
  if (erro && lista === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar as solicitações.' }} />;
  if (mostrarCarregando || lista === undefined) return <Carregando texto="Carregando solicitações" />;

  const visiveis = (lista ?? []).filter((s) => mostrar === 'todas' || s.status === 'pendente');
  const pendentes = (lista ?? []).filter((s) => s.status === 'pendente').length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-lg border border-gray-300 bg-white p-1 text-sm"
          role="group"
          aria-label="Quais mostrar"
        >
          {(['pendentes', 'todas'] as const).map((op) => (
            <button
              key={op}
              type="button"
              aria-pressed={mostrar === op}
              onClick={() => setMostrar(op)}
              className={`rounded-md px-3 py-1.5 font-medium ${foco} ${
                mostrar === op ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {op === 'pendentes' ? `Pendentes (${pendentes})` : 'Todas'}
            </button>
          ))}
        </div>
        <Botao
          variante="primario"
          disabled={!alunos.length}
          onClick={() => {
            setMensagem(null);
            setErroJanela(null);
            setCampos({ participante_id: '', tipo: 'mudanca_turno', descricao: '', resposta: '' });
            setNova(true);
          }}
        >
          + Registrar solicitação
        </Botao>
      </div>

      <Aviso mensagem={mensagem} />

      {!visiveis.length ? (
        <Vazio>
          {mostrar === 'pendentes'
            ? 'Nenhuma solicitação pendente nesta edição.'
            : 'Nenhuma solicitação registrada nesta edição.'}
          <br />
          Quando um aluno pedir algo (por exemplo, mudar de turno), registre aqui para acompanhar a resposta.
        </Vazio>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((s) => {
            const aluno = alunoPorId.get(s.participante_id);
            return (
              <li key={s.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar foto={aluno?.foto ?? null} nome={aluno?.nome ?? ''} tamanho="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900">{aluno?.nome}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTILO_STATUS[s.status].classe}`}
                      >
                        {ESTILO_STATUS[s.status].rotulo}
                      </span>
                    </div>
                    <p className={`${texto.apoio}`}>
                      {TIPOS_SOLICITACAO[s.tipo]} · recebida em {formatarDia(s.criada_em)}
                      {s.resolvida_em ? ` · respondida em ${formatarDia(s.resolvida_em)}` : ''}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-800">{s.descricao}</p>
                    {s.resposta && (
                      <p className="mt-2 rounded-md bg-gray-50 p-2 text-sm text-gray-700">
                        <strong>Resposta:</strong> {s.resposta}
                      </p>
                    )}
                  </div>
                  <Botao
                    tamanho="pequeno"
                    onClick={() => {
                      setErroJanela(null);
                      setCampos((f) => ({ ...f, resposta: s.resposta ?? '' }));
                      setRespondendo(s);
                    }}
                  >
                    {s.status === 'pendente' ? 'Responder' : 'Alterar resposta'}
                  </Botao>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Registrar pedido recebido */}
      <Janela titulo="Registrar solicitação" aberta={nova} onFechar={fecharNova}>
        <form onSubmit={registrar} className="space-y-4">
          <Aviso mensagem={erroJanela} className="" />
          <div>
            <label htmlFor="sol-aluno" className={classeRotulo}>
              Aluno *
            </label>
            <select
              id="sol-aluno"
              name="participante_id"
              value={campos.participante_id}
              onChange={aoAlterarCampo}
              className={classeCampo}
            >
              <option value="">Escolha o aluno</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sol-tipo" className={classeRotulo}>
              Tipo de pedido *
            </label>
            <select id="sol-tipo" name="tipo" value={campos.tipo} onChange={aoAlterarCampo} className={classeCampo}>
              {Object.entries(TIPOS_SOLICITACAO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sol-descricao" className={classeRotulo}>
              O que o aluno pediu *
            </label>
            <textarea
              id="sol-descricao"
              name="descricao"
              rows={4}
              maxLength={2000}
              value={campos.descricao}
              onChange={aoAlterarCampo}
              className={classeCampo}
              placeholder="Ex: pediu para passar do turno da manhã para o da tarde, porque começou a trabalhar."
            />
          </div>
          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Botao type="submit" variante="primario" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Registrar'}
            </Botao>
          </div>
        </form>
      </Janela>

      {/* Responder: aprovar ou recusar, com uma resposta opcional */}
      <Janela titulo="Responder solicitação" aberta={respondendo !== null} onFechar={fecharResposta}>
        {respondendo && (
          <div className="space-y-4">
            <Aviso mensagem={erroJanela} className="" />
            <p className="text-sm text-gray-700">
              <strong>{alunoPorId.get(respondendo.participante_id)?.nome}</strong> ·{' '}
              {TIPOS_SOLICITACAO[respondendo.tipo]}
            </p>
            <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-800">{respondendo.descricao}</p>
            <div>
              <label htmlFor="sol-resposta" className={classeRotulo}>
                Resposta (opcional)
              </label>
              <textarea
                id="sol-resposta"
                name="resposta"
                rows={3}
                maxLength={2000}
                value={campos.resposta}
                onChange={aoAlterarCampo}
                className={classeCampo}
                placeholder="Ex: aprovado a partir da próxima semana."
              />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
              {respondendo.status !== 'pendente' && (
                <Botao onClick={() => responder('pendente')} disabled={salvando}>
                  Voltar para pendente
                </Botao>
              )}
              <Botao onClick={() => responder('recusada')} disabled={salvando}>
                Recusar
              </Botao>
              <Botao variante="primario" onClick={() => responder('aprovada')} disabled={salvando}>
                Aprovar
              </Botao>
            </div>
          </div>
        )}
      </Janela>
    </>
  );
};

// ============================================
// ABA 2: MUDANÇA DE HORÁRIO (planilha de 2022)
// ============================================
const HORARIOS = [
  { valor: '08h-12h', rotulo: '8h às 12h', periodo: 'Manhã', cor: 'border-t-favela-green-500' },
  { valor: '09h-13h', rotulo: '9h às 13h', periodo: 'Manhã estendida', cor: 'border-t-blue-600' },
  { valor: '13h-17h', rotulo: '13h às 17h', periodo: 'Tarde', cor: 'border-t-[#2d2a5f]' },
  { valor: null, rotulo: 'Não escolheu', periodo: 'Sem resposta na planilha', cor: 'border-t-gray-300' },
];

const MudancaDeHorario: React.FC = () => {
  const { edicao, dados } = useAdmin();
  const alunoPorId = new Map(dados.participantes.map((p) => [p.id, p]));
  const turma = dados.turmas.find((t) =>
    dados.mudancasHorario.some((m) => alunoPorId.get(m.participante_id)?.turma_id === t.id),
  );

  if (!dados.mudancasHorario.length) {
    return (
      <Vazio>
        A planilha da {edicao.nome} não tem mudança de horário registrada.
        <br />
        Esse registro existe só na Edição 1 (2022): escolha essa edição no seletor lá em cima para ver.
      </Vazio>
    );
  }

  const escolheram = dados.mudancasHorario.filter((m) => m.horario).length;

  return (
    <>
      <Cartao className="mb-6">
        <p className="text-sm text-gray-700">
          <strong>O que é:</strong> durante o curso, a <strong>{turma?.nome ?? 'turma'}</strong> da {edicao.nome}{' '}
          precisou mudar o horário das aulas. Cada aluno escolheu um dos três horários abaixo.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          <strong>Resultado:</strong> {escolheram} de {dados.mudancasHorario.length} alunos escolheram um horário.
        </p>
      </Cartao>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {HORARIOS.map((h) => {
          const alunos = dados.mudancasHorario
            .filter((m) => m.horario === h.valor)
            .map((m) => alunoPorId.get(m.participante_id)!)
            .filter(Boolean)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
          return (
            <section
              key={h.rotulo}
              className={`rounded-lg border border-t-4 border-gray-200 bg-white p-5 shadow-sm ${h.cor}`}
            >
              <p className={`${texto.rotuloMaiusculo}`}>{h.periodo}</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">{h.rotulo}</h3>
              <p className="mb-4 text-sm text-gray-600">
                {alunos.length} aluno{alunos.length === 1 ? '' : 's'}
              </p>
              <ul className="space-y-2">
                {alunos.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm text-gray-800">
                    <Avatar foto={a.foto} nome={a.nome} />
                    <span className="min-w-0 truncate" title={a.nome}>
                      {a.nome}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
};

// ============================================
// PÁGINA COM AS DUAS ABAS
// ============================================
const ABAS = [
  { id: 'recebidas', rotulo: 'Recebidas', Conteudo: Recebidas },
  { id: 'horario', rotulo: 'Mudança de horário', Conteudo: MudancaDeHorario },
] as const;

const Solicitacoes: React.FC = () => {
  const [aba, setAba] = useState<(typeof ABAS)[number]['id']>('recebidas');
  const Conteudo = ABAS.find((a) => a.id === aba)!.Conteudo;

  // Setas do teclado trocam de aba (padrão de acessibilidade de abas)
  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = ABAS.findIndex((a) => a.id === aba);
    const proxima = ABAS[(i + (e.key === 'ArrowRight' ? 1 : ABAS.length - 1)) % ABAS.length];
    setAba(proxima.id);
    document.getElementById(`aba-${proxima.id}`)?.focus();
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Solicitações"
        onKeyDown={aoTeclar}
        className="mb-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-gray-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ABAS.map((a) => (
          <button
            key={a.id}
            id={`aba-${a.id}`}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            aria-controls={`painel-${a.id}`}
            tabIndex={aba === a.id ? 0 : -1}
            onClick={() => setAba(a.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${foco} ${
              aba === a.id
                ? 'border-favela-green-600 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div id={`painel-${aba}`} role="tabpanel" aria-labelledby={`aba-${aba}`}>
        <Conteudo />
      </div>
    </>
  );
};

export default Solicitacoes;
