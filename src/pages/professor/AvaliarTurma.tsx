/**
 * ============================================
 * INSTRUTOR · AVALIAÇÃO DO FIM DA EDIÇÃO
 * ============================================
 *
 * Cada aluno da turma recebe nota de 0 a 5 em Participação em sala, Entrega das
 * atividades e Comportamento (a SOMA aparece ao lado), com uma observação opcional.
 * A tela só aparece depois da data que a coordenação definiu. Salvar grava a
 * turma inteira de uma vez e trava: depois disso o instrutor não edita nem vê
 * mais (só a coordenação vê). Aluno que entrar depois aparece sozinho para avaliar.
 */
import { useCallback, useEffect, useState } from 'react';

import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import LinhaDeAvaliacao from '../../components/admin/LinhaDeAvaliacao';
import { Carregando } from '../../components/admin/Moldura';
import {
  Aviso,
  Botao,
  Cartao,
  JanelaDeConfirmacao,
  Vazio,
  classeCampo,
  classeRotulo,
  type Mensagem,
} from '../../components/admin/Ui';
import { selo, texto } from '../../components/admin/designSystem';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import {
  CHAVE_AVALIACOES_PENDENTES,
  CRITERIOS_INSTRUTOR,
  NOTA_MAXIMA_INSTRUTOR,
  notasCompletas,
  servicoAvaliacoes,
  type NotasDoInstrutor,
} from '../../lib/avaliacoes';
import { StatusProcessamento } from '../../types';

const CHAVES = CRITERIOS_INSTRUTOR.map((c) => c.chave);
const SEM_NOTA: NotasDoInstrutor = { participacao: null, entrega: null, comportamento: null, observacao: '' };
type AlunoParaAvaliar = { id: number; nome: string; foto: string | null };

const AvaliarTurma: React.FC = () => {
  const {
    dados: pendentes,
    erro,
    recarregar,
  } = useDadosEmCache(CHAVE_AVALIACOES_PENDENTES, () => servicoAvaliacoes.pendentesDoInstrutor());
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [alunos, setAlunos] = useState<AlunoParaAvaliar[] | null>(null);
  // Notas por aluno: ficam guardadas ao trocar de turma (os alunos são de turmas diferentes)
  const [notas, setNotas] = useState<Map<number, NotasDoInstrutor>>(new Map());
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  // Muda para buscar de novo os alunos que faltam (depois de salvar, ou se entrou aluno)
  const [versaoDosAlunos, setVersaoDosAlunos] = useState(0);
  const fecharConfirmacao = useCallback(() => setConfirmando(false), []);

  // Abre a primeira turma pendente
  useEffect(() => {
    if (pendentes && !pendentes.some((p) => p.turma_id === turmaId)) setTurmaId(pendentes[0]?.turma_id ?? null);
  }, [pendentes, turmaId]);

  // Alunos que faltam avaliar na turma escolhida
  useEffect(() => {
    if (turmaId === null) return;
    let ativo = true;
    setAlunos(null);
    servicoAvaliacoes
      .alunosParaAvaliar(turmaId)
      .then((lista) => ativo && setAlunos(lista))
      .catch((e) => {
        console.error('[avaliação] alunos da turma', e?.code ?? e?.message);
        if (ativo) setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar os alunos da turma.' });
      });
    return () => {
      ativo = false;
    };
  }, [turmaId, versaoDosAlunos]);

  const notasDe = (alunoId: number) => notas.get(alunoId) ?? SEM_NOTA;
  const mudar = (alunoId: number, campo: keyof NotasDoInstrutor, valor: number | string | null) =>
    setNotas((atual) => new Map(atual).set(alunoId, { ...(atual.get(alunoId) ?? SEM_NOTA), [campo]: valor }));

  const salvar = async () => {
    if (turmaId === null || !alunos) return;
    setSalvando(true);
    const daTurma = new Map(alunos.map((a) => [a.id, notasDe(a.id)]));
    const resultado = await servicoAvaliacoes.salvarDaTurma(turmaId, daTurma);
    setSalvando(false);
    setConfirmando(false);
    // Deu certo ou mudou a turma (entrou aluno): busca de novo o que falta avaliar
    setVersaoDosAlunos((v) => v + 1);
    if (resultado.status !== StatusProcessamento.Sucesso) {
      return setMensagem({ tipo: 'erro', texto: resultado.mensagem! });
    }
    setMensagem({ tipo: 'sucesso', texto: 'Avaliação salva e enviada para a coordenação. Obrigado!' });
    await recarregar().catch((e) => console.error('[avaliação] pendentes', e?.code ?? e?.message));
  };

  const mostrarCarregando = useCarregamentoCompleto(pendentes === undefined && !erro, 0);
  if (erro && pendentes === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar as avaliações.' }} />;
  if (mostrarCarregando || pendentes === undefined) return <Carregando texto="Abrindo a avaliação" />;

  if (!pendentes.length) {
    return (
      <>
        <Aviso mensagem={mensagem} />
        <Vazio>Nenhuma turma para avaliar agora. Quando a coordenação liberar a avaliação, ela aparece aqui.</Vazio>
      </>
    );
  }

  const avaliados = alunos ? alunos.filter((a) => notasCompletas(notasDe(a.id), CHAVES)).length : 0;
  const pronta = Boolean(alunos?.length) && avaliados === alunos!.length;
  const turma = pendentes.find((p) => p.turma_id === turmaId);

  return (
    <>
      <Aviso mensagem={mensagem} />

      <Cartao
        titulo={`Avaliação final · ${turma?.edicao_nome ?? ''}`}
        descricao="Nota de 0 a 5 em cada critério. Depois de salvar não dá para editar, e a avaliação vai só para a coordenação."
        acoes={
          pendentes.length > 1 ? (
            <div>
              <label htmlFor="avaliar-turma" className={classeRotulo}>
                Turma
              </label>
              <select
                id="avaliar-turma"
                value={turmaId ?? ''}
                onChange={(e) => setTurmaId(Number(e.target.value))}
                className={classeCampo}
              >
                {pendentes.map((p) => (
                  <option key={p.turma_id} value={p.turma_id}>
                    {p.turma_nome}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className={`${selo.base} ${selo.neutro}`}>{turma?.turma_nome}</span>
          )
        }
      >
        {!alunos ? (
          <Carregando texto="Carregando alunos" />
        ) : (
          <ul className="space-y-3">
            {alunos.map((a) => {
              const n = notasDe(a.id);
              return (
                <LinhaDeAvaliacao
                  key={a.id}
                  aluno={a}
                  criterios={CRITERIOS_INSTRUTOR}
                  notas={n}
                  maximo={NOTA_MAXIMA_INSTRUTOR}
                  aoMudar={(chave, valor) => mudar(a.id, chave, valor)}
                  desabilitado={salvando}
                >
                  <label htmlFor={`obs-${a.id}`} className="sr-only">
                    Observação sobre {a.nome}
                  </label>
                  <input
                    id={`obs-${a.id}`}
                    maxLength={1000}
                    value={n.observacao}
                    onChange={(e) => mudar(a.id, 'observacao', e.target.value)}
                    disabled={salvando}
                    className={`${classeCampo} mt-3`}
                    placeholder="Observação (opcional)"
                  />
                </LinhaDeAvaliacao>
              );
            })}
          </ul>
        )}

        {alunos && alunos.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <p className={texto.apoio}>
              {avaliados} de {alunos.length} alunos com as três notas
            </p>
            <Botao variante="primario" disabled={!pronta || salvando} onClick={() => setConfirmando(true)}>
              Salvar avaliação
            </Botao>
          </div>
        )}
      </Cartao>

      <JanelaDeConfirmacao
        titulo="Salvar a avaliação?"
        aberta={confirmando}
        aoFechar={fecharConfirmacao}
        aoConfirmar={salvar}
        ocupado={salvando}
        rotuloConfirmar="Salvar e enviar"
        rotuloOcupado="Salvando…"
      >
        Depois de salvar, <strong>não dá para editar</strong> e a avaliação da {turma?.turma_nome} some da sua tela: ela
        vai só para a coordenação.
      </JanelaDeConfirmacao>
    </>
  );
};

export default AvaliarTurma;
