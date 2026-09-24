/**
 * ============================================
 * BANCA AVALIADORA · AVALIAÇÃO
 * ============================================
 *
 * O membro da banca (conta convidada, ou alguém da equipe posto na banca) avalia
 * cada aluno de 0 a 5 em Inovação/Funcionalidade, Qualidade da apresentação e
 * Aplicabilidade. A nota salva por aluno e pode ser corrigida até ele clicar em
 * "Concluir avaliação"; depois disso trava. Aluno que entrar depois aparece sem
 * nota e pode ser avaliado (só ele). Ninguém vê a nota dos outros membros.
 * Quando toda a banca tem nota de todos, a mesma tela mostra só a lista final.
 */
import { useCallback, useEffect, useState } from 'react';

import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import LinhaDeAvaliacao from '../../components/admin/LinhaDeAvaliacao';
import { Carregando } from '../../components/admin/Moldura';
import TabelaDeClassificacao from '../../components/admin/TabelaDeClassificacao';
import { Aviso, Botao, Cartao, JanelaDeConfirmacao, Vazio, type Mensagem } from '../../components/admin/Ui';
import { texto } from '../../components/admin/designSystem';
import {
  CRITERIOS_BANCA,
  NOTA_MAXIMA_BANCA,
  notasCompletas,
  servicoAvaliacoes,
  type AvaliacaoDaBanca as Avaliacao,
  type NotasDaBanca,
} from '../../lib/avaliacoes';
import { StatusProcessamento } from '../../types';
import { formatarData } from '../../utils/datas';

const CHAVES = CRITERIOS_BANCA.map((c) => c.chave);
type SituacaoDoAluno = 'salvo' | 'alterado' | 'salvando';

const AvaliacaoDaBanca: React.FC = () => {
  const [dados, setDados] = useState<Avaliacao | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [notas, setNotas] = useState<Map<number, NotasDaBanca>>(new Map());
  const [situacao, setSituacao] = useState<Map<number, SituacaoDoAluno>>(new Map());
  /** Depois de concluir, as notas já dadas não mudam (só aluno novo recebe nota) */
  const [travados, setTravados] = useState<Set<number>>(new Set());
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const fecharConfirmacao = useCallback(() => setConfirmando(false), []);

  const abrir = useCallback(async () => {
    const { resultado, dados: lidos } = await servicoAvaliacoes.abrirDaBanca();
    if (resultado.status !== StatusProcessamento.Sucesso || !lidos) {
      return setFalha(resultado.mensagem ?? 'Não foi possível abrir a avaliação.');
    }
    setFalha(null);
    setDados(lidos);
    if (!lidos.completa) {
      const comNota = lidos.alunos.filter((a) => notasCompletas(a, CHAVES)).map((a) => a.id);
      setNotas(
        new Map(
          lidos.alunos.map((a) => [
            a.id,
            { inovacao: a.inovacao, apresentacao: a.apresentacao, aplicabilidade: a.aplicabilidade },
          ]),
        ),
      );
      setSituacao(new Map(comNota.map((id) => [id, 'salvo' as const])));
      setTravados(new Set(lidos.concluida ? comNota : []));
    }
  }, []);

  useEffect(() => {
    abrir();
  }, [abrir]);

  const mostrarCarregando = useCarregamentoCompleto(dados === null && falha === null, 0);

  const mudar = (alunoId: number, chave: keyof NotasDaBanca, valor: number | null) => {
    setNotas((atual) => new Map(atual).set(alunoId, { ...atual.get(alunoId)!, [chave]: valor }));
    setSituacao((atual) => new Map(atual).set(alunoId, 'alterado'));
  };

  const salvar = async (alunoId: number) => {
    setSituacao((atual) => new Map(atual).set(alunoId, 'salvando'));
    const resultado = await servicoAvaliacoes.salvarNotaDaBanca(alunoId, notas.get(alunoId)!);
    if (resultado.status !== StatusProcessamento.Sucesso) {
      setSituacao((atual) => new Map(atual).set(alunoId, 'alterado'));
      return setMensagem({ tipo: 'erro', texto: resultado.mensagem! });
    }
    setSituacao((atual) => new Map(atual).set(alunoId, 'salvo'));
    // Já concluída: a nota do aluno novo também trava, e a lista final pode ter saído
    if (dados && !dados.completa && dados.concluida) {
      setTravados((atual) => new Set(atual).add(alunoId));
      await abrir();
    }
  };

  const concluir = async () => {
    setConcluindo(true);
    const resultado = await servicoAvaliacoes.concluirDaBanca();
    setConcluindo(false);
    setConfirmando(false);
    if (resultado.status !== StatusProcessamento.Sucesso) {
      return setMensagem({ tipo: 'erro', texto: resultado.mensagem! });
    }
    setMensagem({
      tipo: 'sucesso',
      texto: 'Avaliação concluída. Obrigado! Quando toda a banca concluir, a lista final aparece aqui.',
    });
    await abrir();
  };

  if (falha) return <Aviso mensagem={{ tipo: 'erro', texto: falha }} />;
  if (mostrarCarregando || !dados) return <Carregando texto="Abrindo a avaliação" />;

  const quem = (
    <p className={`mb-4 ${texto.apoio}`}>
      {dados.edicao} · {dados.membro.nome} ({dados.membro.organizacao})
    </p>
  );

  if (dados.completa) {
    return (
      <>
        {quem}
        <Cartao titulo="Resultado da banca" descricao="Toda a banca concluiu. Soma das notas de todos os membros.">
          <TabelaDeClassificacao
            rotuloDoTotal="Banca"
            linhas={dados.ranking.map((l, i) => ({
              chave: i,
              nome: l.nome,
              foto: l.foto,
              turma: l.turma,
              total: l.total,
            }))}
          />
        </Cartao>
      </>
    );
  }

  // Fora do dia da banca (ou com a edição encerrada) tudo fica só para ver
  const encerrada = dados.encerrada || !dados.hoje_e_o_dia;
  const avisoDoDia = dados.encerrada
    ? 'A edição foi encerrada: a avaliação fica só para consulta.'
    : !dados.dia
      ? 'A coordenação ainda não marcou o dia da banca. A avaliação abre só nesse dia.'
      : !dados.hoje_e_o_dia
        ? `A banca avalia no dia ${formatarData(dados.dia)} (apresentação final). Só nesse dia dá para dar nota.`
        : null;
  const salvos = dados.alunos.filter((a) => situacao.get(a.id) === 'salvo').length;
  const faltando = dados.alunos.length - salvos;

  return (
    <>
      {quem}
      <Aviso mensagem={mensagem} />
      {(avisoDoDia || (dados.concluida && !faltando)) && !mensagem && (
        <Aviso
          mensagem={{
            tipo: 'sucesso',
            texto: avisoDoDia ?? 'Você já concluiu. Quando toda a banca concluir, a lista final aparece aqui.',
          }}
        />
      )}

      <Cartao
        titulo="Avaliação da apresentação final"
        descricao={
          dados.concluida
            ? 'Você já concluiu: as notas dadas não mudam. Aluno que entrou depois aparece sem nota para avaliar.'
            : 'Nota de 0 a 5 em cada critério. Só você vê as suas notas; dá para corrigir até concluir.'
        }
      >
        {!dados.alunos.length ? (
          <Vazio>Esta edição ainda não tem alunos.</Vazio>
        ) : (
          <ul className="space-y-3">
            {dados.alunos.map((a) => {
              const n = notas.get(a.id)!;
              const estado = situacao.get(a.id);
              const travado = encerrada || travados.has(a.id);
              return (
                <LinhaDeAvaliacao
                  key={a.id}
                  aluno={a}
                  criterios={CRITERIOS_BANCA}
                  notas={n}
                  maximo={NOTA_MAXIMA_BANCA}
                  aoMudar={(chave, valor) => mudar(a.id, chave, valor)}
                  desabilitado={travado || estado === 'salvando'}
                  situacao={estado === 'salvo' ? 'salvo' : undefined}
                >
                  {!travado && estado !== 'salvo' && (
                    <div className="mt-3 flex justify-end">
                      <Botao
                        tamanho="pequeno"
                        variante="primario"
                        disabled={!notasCompletas(n, CHAVES) || estado === 'salvando'}
                        onClick={() => salvar(a.id)}
                      >
                        {estado === 'salvando' ? 'Salvando…' : 'Salvar nota'}
                      </Botao>
                    </div>
                  )}
                </LinhaDeAvaliacao>
              );
            })}
          </ul>
        )}

        {!encerrada && !dados.concluida && dados.alunos.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <p className={texto.apoio}>
              {salvos} de {dados.alunos.length} alunos com nota salva
            </p>
            <Botao variante="primario" disabled={faltando > 0} onClick={() => setConfirmando(true)}>
              Concluir avaliação
            </Botao>
          </div>
        )}
      </Cartao>

      <JanelaDeConfirmacao
        titulo="Concluir a avaliação?"
        aberta={confirmando}
        aoFechar={fecharConfirmacao}
        aoConfirmar={concluir}
        ocupado={concluindo}
        rotuloConfirmar="Concluir"
        rotuloOcupado="Concluindo…"
      >
        Depois de concluir, <strong>as notas não mudam mais</strong>. Quando toda a banca concluir, esta tela mostra a
        lista final.
      </JanelaDeConfirmacao>
    </>
  );
};

export default AvaliacaoDaBanca;
