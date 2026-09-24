/**
 * ============================================
 * ADMIN · CHAMADA
 * ============================================
 *
 * A lista de presença de cada turma em grade, como na planilha original.
 * O gestor clica numa célula para corrigir: presente, ausente, falta
 * justificada ou sem registro.
 */
import { useCallback, useState } from 'react';

import Carregamento, { aguardarCicloCompleto } from '../../components/admin/Carregamento';
import Janela from '../../components/admin/Janela';
import PlanilhaDeChamada, { ESTILO_SITUACAO, LegendaSituacoes } from '../../components/admin/PlanilhaDeChamada';
import { Aviso, BarraDeFiltros, Botao, Cartao, Vazio, type Mensagem } from '../../components/admin/Ui';
import type { Aula, Presenca } from '../../lib/painel';
import { LETRA_DA_MARCACAO, servicoChamada } from '../../lib/chamada';
import { formatarData } from '../../utils/datas';
import { useAdmin } from './contexto';
import { foco } from '../../components/admin/designSystem';

type Correcao = { pessoa: { id: number; nome: string }; aula: Aula; presenca: Presenca | undefined };

const OPCOES = [
  { valor: 'presente', rotulo: 'Presente' },
  { valor: 'ausente', rotulo: 'Ausente' },
  { valor: 'justificada', rotulo: 'Falta justificada' },
] as const;

const Chamada: React.FC = () => {
  const { painel, atualizarPresencaNaTela } = useAdmin();
  const [correcao, setCorrecao] = useState<Correcao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  // Enquanto grava, a janela não fecha (senão parece que a correção sumiu)
  const fechar = useCallback(() => {
    if (!salvando) setCorrecao(null);
  }, [salvando]);

  const aplicar = async (situacao: (typeof OPCOES)[number]['valor'] | null) => {
    if (!correcao) return;
    setSalvando(true);
    try {
      // Grava e deixa a pintura do carregamento terminar (não corta no meio)
      await servicoChamada.corrigirPresenca(correcao.aula.id, correcao.pessoa.id, situacao);
      await aguardarCicloCompleto();
      // Gravou no banco: troca só esta célula na tela (sem baixar a edição inteira de novo)
      atualizarPresencaNaTela(
        correcao.aula.id,
        correcao.pessoa.id,
        situacao
          ? {
              aula_id: correcao.aula.id,
              participante_id: correcao.pessoa.id,
              situacao,
              registro_original: LETRA_DA_MARCACAO[situacao],
            }
          : null,
      );
      setMensagem({
        tipo: 'sucesso',
        texto: `${correcao.pessoa.nome} em ${formatarData(correcao.aula.data)}: ${
          situacao ? ESTILO_SITUACAO[situacao].rotulo.toLowerCase() : 'sem registro'
        }.`,
      });
      setCorrecao(null);
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível corrigir a presença.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Aviso mensagem={mensagem} />
      <BarraDeFiltros />

      <div className="mb-4">
        <LegendaSituacoes situacoes={['presente', 'ausente', 'justificada']} />
      </div>

      {!painel.turmasVisiveis.length ? (
        <Vazio>Esta edição ainda não tem turmas.</Vazio>
      ) : (
        <div className="space-y-6">
          {painel.turmasVisiveis.map((t) => {
            const alunos = painel.alunos.filter((a) => a.turma_id === t.id);
            return (
              <Cartao key={t.id} titulo={t.nome} descricao={`${alunos.length} alunos`}>
                <PlanilhaDeChamada
                  titulo={t.nome}
                  pessoas={alunos}
                  aulas={painel.aulasDeAlunos.filter((a) => a.turma_id === t.id)}
                  celulas={painel.celulas}
                  aoClicarCelula={(pessoa, aula, presenca) => {
                    setMensagem(null);
                    setCorrecao({ pessoa, aula, presenca });
                  }}
                />
              </Cartao>
            );
          })}
        </div>
      )}

      <Janela titulo="Corrigir presença" aberta={correcao !== null} onFechar={fechar}>
        {salvando && <Carregamento modo="sobreposto" texto="Salvando presença" />}
        {correcao && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              <strong>{correcao.pessoa.nome}</strong> em <strong>{formatarData(correcao.aula.data)}</strong>
              <br />
              Hoje está como:{' '}
              {correcao.presenca
                ? `${ESTILO_SITUACAO[correcao.presenca.situacao].rotulo} (registro "${correcao.presenca.registro_original}")`
                : 'sem registro'}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OPCOES.map((op) => {
                const atual = correcao.presenca?.situacao === op.valor;
                return (
                  <button
                    key={op.valor}
                    type="button"
                    disabled={salvando || atual}
                    onClick={() => aplicar(op.valor)}
                    className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${foco} disabled:cursor-not-allowed ${
                      atual ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded font-bold ${ESTILO_SITUACAO[op.valor].classe}`}
                    >
                      {ESTILO_SITUACAO[op.valor].letra}
                    </span>
                    {op.rotulo}
                    {atual ? ' (atual)' : ''}
                  </button>
                );
              })}
              <Botao onClick={() => aplicar(null)} disabled={salvando || !correcao.presenca} className="py-3">
                Deixar sem registro
              </Botao>
            </div>
          </div>
        )}
      </Janela>
    </>
  );
};

export default Chamada;
