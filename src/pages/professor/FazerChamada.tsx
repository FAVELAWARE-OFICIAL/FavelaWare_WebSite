/**
 * ============================================
 * PROFESSOR · FAZER CHAMADA
 * ============================================
 *
 * O professor escolhe a turma e o dia, marca cada aluno como
 * P (presente), A (ausente) ou J (falta justificada) e salva.
 *
 * - Dia que já tem chamada abre com as marcações salvas, para corrigir.
 * - Clicar de novo na marcação escolhida desmarca (aluno fica sem registro).
 * - Nada vai para o banco até clicar em "Salvar chamada".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Avatar from '../../components/admin/Avatar';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import { Carregando, gravarPreferencia, lerPreferencia, RodapeFixo } from '../../components/admin/Moldura';
import { Botao, Cartao, Vazio } from '../../components/admin/Ui';
import Janela from '../../components/admin/Janela';
import {
  aulaDoDia, carregarAlunos, carregarAulas, carregarMarcacoes, carregarMinhasTurmas, hoje, salvarChamada,
  type AlunoDaChamada, type AulaRegistrada, type Marcacao, type TurmaDoProfessor,
} from '../../lib/chamada';
import { formatarData } from '../../lib/dashboard';
import { campo, foco, texto } from '../../components/admin/designSystem';

// As três opções da chamada: letra no botão, nome completo para leitor de tela
const OPCOES: { valor: Marcacao; letra: string; rotulo: string; ativo: string }[] = [
  { valor: 'presente', letra: 'P', rotulo: 'Presente', ativo: 'bg-favela-green-500 border-favela-green-500 text-[#2d2a5f]' },
  { valor: 'ausente', letra: 'A', rotulo: 'Ausente', ativo: 'bg-red-600 border-red-600 text-white' },
  { valor: 'justificada', letra: 'J', rotulo: 'Falta justificada', ativo: 'bg-amber-400 border-amber-400 text-gray-900' },
];

type Marcacoes = Record<number, Marcacao | undefined>;

const mesmasMarcacoes = (a: Marcacoes, b: Marcacoes, alunos: AlunoDaChamada[]) =>
  alunos.every((aluno) => a[aluno.id] === b[aluno.id]);

const FazerChamada: React.FC = () => {
  // ============================================
  // ESTADOS
  // ============================================
  const [turmas, setTurmas] = useState<TurmaDoProfessor[] | null>(null);
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [data, setData] = useState(hoje());
  const [alunos, setAlunos] = useState<AlunoDaChamada[]>([]);
  const [aulas, setAulas] = useState<AulaRegistrada[]>([]);
  const [marcacoes, setMarcacoes] = useState<Marcacoes>({}); // o que está na tela
  const [salvas, setSalvas] = useState<Marcacoes>({});       // o que está no banco
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Turmas do professor (o banco só devolve as dele); abre a última usada
  useEffect(() => {
    carregarMinhasTurmas()
      .then((lista) => {
        setTurmas(lista);
        const lembrada = Number(lerPreferencia('professor:turma'));
        setTurmaId((lista.find((t) => t.id === lembrada) ?? lista[0])?.id ?? null);
        if (!lista.length) setCarregando(false);
      })
      .catch(() => {
        setTurmas([]);
        setCarregando(false);
        setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar suas turmas.' });
      });
  }, []);

  // Alunos e dias já registrados da turma escolhida
  useEffect(() => {
    if (turmaId === null) return;
    let ativo = true;
    setCarregando(true);
    gravarPreferencia('professor:turma', String(turmaId));
    Promise.all([carregarAlunos(turmaId), carregarAulas(turmaId)])
      .then(([listaAlunos, listaAulas]) => {
        if (!ativo) return;
        setAlunos(listaAlunos);
        setAulas(listaAulas);
      })
      .catch(() => ativo && setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar a turma.' }))
      .finally(() => ativo && setCarregando(false));
    return () => { ativo = false; };
  }, [turmaId]);

  // Marcações do dia: se o dia já tem chamada, abre o que foi salvo
  const aulaAtual = aulaDoDia(aulas, data);
  const aulaAtualId = aulaAtual?.id;
  useEffect(() => {
    let ativo = true;
    if (!aulaAtualId) {
      setMarcacoes({});
      setSalvas({});
      return;
    }
    carregarMarcacoes(aulaAtualId)
      .then((m) => {
        if (!ativo) return;
        setMarcacoes(m);
        setSalvas(m);
      })
      .catch(() => ativo && setMensagem({ tipo: 'erro', texto: 'Não foi possível abrir a chamada deste dia.' }));
    return () => { ativo = false; };
  }, [aulaAtualId]);

  // Dia que já tem chamada: avisa numa janela (uma vez por turma + dia).
  // Depois de salvar, o dia passa a ter chamada, mas aí não faz sentido avisar.
  const [avisoCorrecao, setAvisoCorrecao] = useState(false);
  const jaAvisados = useRef(new Set<string>());
  useEffect(() => {
    if (!aulaAtualId || carregando || turmaId === null) return;
    const chave = `${turmaId}:${data}`;
    if (jaAvisados.current.has(chave)) return;
    jaAvisados.current.add(chave);
    setAvisoCorrecao(true);
  }, [aulaAtualId, carregando, turmaId, data]);
  const fecharAviso = useCallback(() => setAvisoCorrecao(false), []);

  const escolherOutroDia = () => {
    setAvisoCorrecao(false);
    // Depois que a janela fecha (e devolve o foco), leva o foco ao campo do dia
    setTimeout(() => document.getElementById('data')?.focus(), 50);
  };

  const alterado = !mesmasMarcacoes(marcacoes, salvas, alunos);
  // Carregamento na hora (nunca tela em branco) e pintura sempre completa
  const mostrarCarregando = useCarregamentoCompleto(turmas === null || carregando, 0);

  const contagem = useMemo(() => {
    const c = { presente: 0, ausente: 0, justificada: 0, semMarcacao: 0 };
    for (const a of alunos) {
      const m = marcacoes[a.id];
      if (m) c[m]++; else c.semMarcacao++;
    }
    return c;
  }, [alunos, marcacoes]);

  // ============================================
  // AÇÕES
  // ============================================

  // Trocar de turma ou de dia descarta o que não foi salvo: pergunta antes
  const podeSairDaChamada = () =>
    !alterado || window.confirm('Há marcações não salvas. Deseja descartar?');

  const trocarTurma = (id: number) => {
    if (!podeSairDaChamada()) return;
    setMensagem(null);
    setMarcacoes({});
    setSalvas({});
    setTurmaId(id);
  };

  const trocarData = (novaData: string) => {
    if (!novaData || !podeSairDaChamada()) return;
    setMensagem(null);
    setData(novaData);
  };

  const marcar = (alunoId: number, valor: Marcacao) => {
    setMensagem(null);
    setMarcacoes((atual) => ({ ...atual, [alunoId]: atual[alunoId] === valor ? undefined : valor }));
  };

  const marcarTodos = (valor: Marcacao | undefined) => {
    setMensagem(null);
    setMarcacoes(Object.fromEntries(alunos.map((a) => [a.id, valor])));
  };

  const salvar = async () => {
    if (turmaId === null) return;
    setSalvando(true);
    setMensagem(null);
    try {
      await salvarChamada(turmaId, data, alunos, marcacoes);
      jaAvisados.current.add(`${turmaId}:${data}`); // acabou de salvar: não avisa "já tem chamada"
      setAulas(await carregarAulas(turmaId)); // o dia pode ter virado aula nova
      setSalvas(marcacoes);
      setMensagem({ tipo: 'sucesso', texto: `Chamada de ${formatarData(data)} salva.` });
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível salvar a chamada. Verifique a conexão e tente de novo.' });
    } finally {
      setSalvando(false);
    }
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================
  if (turmas === null || (mostrarCarregando && !alunos.length)) return <Carregando texto="Carregando suas turmas" />;

  if (!turmas.length) {
    return <Vazio>Você ainda não está vinculado a nenhuma turma. Peça ao gestor para liberar suas turmas.</Vazio>;
  }

  const classeCampo = campo;

  return (
    <div>
      {/* ============ TURMA E DIA ============ */}
      <Cartao className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-72">
            <label htmlFor="turma" className={`${texto.rotulo}`}>Turma</label>
            <select id="turma" value={turmaId ?? ''} onChange={(e) => trocarTurma(Number(e.target.value))} className={classeCampo}>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome} · {t.edicao}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor="data" className={`${texto.rotulo}`}>Dia da aula</label>
            <input id="data" type="date" value={data} max={hoje()} onChange={(e) => trocarData(e.target.value)} className={classeCampo} />
          </div>
        </div>

        {/* Atalho para os últimos dias com chamada */}
        {aulas.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-gray-600">Últimas chamadas</p>
            <div className="flex flex-wrap gap-2">
              {[...new Set(aulas.map((a) => a.data))].slice(0, 10).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => trocarData(d)}
                  aria-pressed={d === data}
                  className={`rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition-colors ${foco} ${
                    d === data ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {formatarData(d)}
                </button>
              ))}
            </div>
          </div>
        )}
      </Cartao>

      {mensagem && (
        <div
          role={mensagem.tipo === 'erro' ? 'alert' : 'status'}
          className={`mb-6 rounded-lg border p-4 text-sm ${
            mensagem.tipo === 'sucesso' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {mostrarCarregando || carregando ? (
        <Carregando texto="Carregando alunos" />
      ) : !alunos.length ? (
        <Vazio>Esta turma ainda não tem alunos cadastrados.</Vazio>
      ) : (
        <Cartao
          titulo={`${alunos.length} alunos`}
          descricao={`${contagem.presente} presentes · ${contagem.ausente} ausentes · ${contagem.justificada} justificadas · ${contagem.semMarcacao} sem marcação`}
          acoes={
            <div className="flex flex-wrap gap-2">
              <Botao tamanho="pequeno" onClick={() => marcarTodos('presente')}>Todos presentes</Botao>
              <Botao tamanho="pequeno" onClick={() => marcarTodos(undefined)}>Limpar</Botao>
            </div>
          }
        >
          <ul className="-my-2 divide-y divide-gray-100">
            {alunos.map((aluno) => (
              <li key={aluno.id} className="flex flex-wrap items-center gap-3 py-2">
                <Avatar foto={aluno.foto} nome={aluno.nome} tamanho="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{aluno.nome}</p>
                  {aluno.login && <p className={`truncate ${texto.apoio}`}>{aluno.login}</p>}
                </div>

                {/* P / A / J: botões de alternância (clicar de novo desmarca) */}
                <div role="group" aria-label={`Presença de ${aluno.nome}`} className="flex gap-2">
                  {OPCOES.map((op) => {
                    const escolhido = marcacoes[aluno.id] === op.valor;
                    return (
                      <button
                        key={op.valor}
                        type="button"
                        onClick={() => marcar(aluno.id, op.valor)}
                        aria-pressed={escolhido}
                        aria-label={op.rotulo}
                        title={op.rotulo}
                        className={`h-11 w-11 rounded-lg border-2 text-base font-bold transition-colors ${foco} focus-visible:ring-offset-2 ${
                          escolhido ? op.ativo : 'border-gray-200 bg-white text-gray-400 hover:border-gray-400 hover:text-gray-700'
                        }`}
                      >
                        {op.letra}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {/* ============ BARRA DE SALVAR (fixa no pé da tela, pela Moldura) ============ */}
      {alunos.length > 0 && (
        <RodapeFixo>
        <div className="border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              {alterado ? 'Há alterações não salvas.' : aulaAtual ? 'Tudo salvo.' : 'Marque os alunos e salve.'}
            </p>
            <button
              type="button"
              onClick={salvar}
              disabled={!alterado || salvando}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-colors ${foco} focus-visible:ring-offset-2 ${
                !alterado || salvando ? 'cursor-not-allowed bg-gray-200 text-gray-500' : 'bg-favela-green-600 text-white hover:bg-favela-green-700'
              }`}
            >
              {salvando ? 'Salvando...' : 'Salvar chamada'}
            </button>
          </div>
        </div>
        </RodapeFixo>
      )}

      {/* ============ AVISO: DIA COM CHAMADA JÁ REGISTRADA ============ */}
      <Janela titulo="Chamada já registrada" aberta={avisoCorrecao} onFechar={fecharAviso}>
        <div className="space-y-5">
          <div className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden="true">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.3 3.9 1.8 18.5A2 2 0 0 0 3.5 21.5h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
            </span>
            <div className={texto.corpo}>
              <p>
                A chamada de <strong>{formatarData(data)}</strong> desta turma já foi feita. As marcações salvas foram
                abertas para você revisar.
              </p>
              <p className={`mt-2 ${texto.apoio}`}>Qualquer alteração só vale depois de clicar em “Salvar chamada”.</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <Botao onClick={escolherOutroDia}>Escolher outro dia</Botao>
            <Botao variante="primario" onClick={fecharAviso}>Corrigir chamada</Botao>
          </div>
        </div>
      </Janela>
    </div>
  );
};

export default FazerChamada;
