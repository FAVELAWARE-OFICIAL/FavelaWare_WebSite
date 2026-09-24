/**
 * ============================================
 * PROFESSOR · MEU PONTO
 * ============================================
 *
 * O professor marca o próprio dia: P (presente), F (falta) ou J (justificada).
 * - O dia começa em hoje; dá para marcar um dia anterior, nunca um futuro.
 * - Clicar grava na hora; clicar de novo na marcação escolhida desmarca.
 * - Embaixo, os últimos pontos dele.
 */
import { useEffect, useState } from 'react';

import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import { Carregando } from '../../components/admin/Moldura';
import { Aviso, Cartao, Vazio, classeCampo, classeRotulo, type Mensagem } from '../../components/admin/Ui';
import { espaco, foco, selo, texto } from '../../components/admin/designSystem';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { CHAVE_MEUS_PONTOS, OPCOES_PONTO, opcaoDoPonto, servicoPonto, type SituacaoPonto } from '../../lib/ponto';
import { formatarData, hoje } from '../../utils/datas';

const diaDaSemana = (data: string) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });

const MeuPonto: React.FC = () => {
  const { dados, erro, recarregar } = useDadosEmCache(CHAVE_MEUS_PONTOS, () => servicoPonto.carregarMeus());
  const pontos = dados?.pontos;
  const mostrarCarregando = useCarregamentoCompleto(dados === undefined && !erro, 0);
  const [dia, setDia] = useState(hoje());
  const [salvando, setSalvando] = useState<SituacaoPonto | 'limpar' | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  // Dia mais antigo que o histórico carregado: a marcação vem do banco, só daquele dia
  const noHistorico = !pontos || servicoPonto.diaEstaNoHistorico(pontos, dia);
  const [diaForaDoHistorico, setDiaForaDoHistorico] = useState<{ dia: string; situacao: SituacaoPonto | null }>();
  useEffect(() => {
    if (noHistorico) return;
    let ativo = true;
    servicoPonto
      .carregarMeuDia(dia)
      .then((situacao) => ativo && setDiaForaDoHistorico({ dia, situacao }))
      .catch((erro) => {
        console.error('[ponto] falha ao conferir o dia', erro?.code, erro?.message);
        if (!ativo) return;
        // Libera os botões: marcar grava o dia de qualquer forma, e a mensagem avisa
        setDiaForaDoHistorico({ dia, situacao: null });
        setMensagem({
          tipo: 'erro',
          texto: 'Não foi possível conferir o ponto deste dia. Se já estava marcado, a marcação será trocada.',
        });
      });
    return () => {
      ativo = false;
    };
  }, [dia, noHistorico]);
  const conferindoDia = !noHistorico && diaForaDoHistorico?.dia !== dia;
  const marcadoNoDia = noHistorico
    ? pontos?.find((p) => p.data === dia)?.situacao
    : (diaForaDoHistorico?.situacao ?? undefined);

  const marcar = async (valor: SituacaoPonto) => {
    const nova = marcadoNoDia === valor ? null : valor; // clicar de novo desmarca
    setSalvando(nova ?? 'limpar');
    setMensagem(null);
    try {
      await servicoPonto.registrar(dia, nova);
      if (!noHistorico) setDiaForaDoHistorico({ dia, situacao: nova });
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: servicoPonto.mensagemDoErro(e) });
      setSalvando(null);
      return;
    }
    try {
      await recarregar();
      setMensagem({
        tipo: 'sucesso',
        texto: nova
          ? `Ponto de ${formatarData(dia)} marcado como ${opcaoDoPonto(nova).rotulo.toLowerCase()}.`
          : `Ponto de ${formatarData(dia)} desmarcado.`,
      });
    } catch (e) {
      console.error('[ponto] salvo, mas falhou ao atualizar a lista', e);
      setMensagem({ tipo: 'sucesso', texto: 'Ponto salvo. Recarregue a página para ver a lista atualizada.' });
    } finally {
      setSalvando(null);
    }
  };

  if (erro && pontos === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar seus pontos.' }} />;
  if (mostrarCarregando || dados === undefined || pontos === undefined)
    return <Carregando texto="Carregando seu ponto" />;
  if (!dados.souProfessor) {
    return (
      <Aviso
        mensagem={{
          tipo: 'erro',
          texto:
            'Só instrutores batem ponto. Para lançar o ponto de alguém, use Instrutores › Presença dos instrutores.',
        }}
      />
    );
  }

  return (
    <div className={`grid grid-cols-1 ${espaco.grade} lg:grid-cols-5`}>
      {/* ============ MARCAR O DIA ============ */}
      <Cartao titulo="Bater ponto" descricao="Marque como foi o seu dia de aula." className="lg:col-span-3">
        <div className={espaco.formulario}>
          <div className="sm:max-w-xs">
            <label htmlFor="dia-ponto" className={classeRotulo}>
              Dia
            </label>
            <input
              id="dia-ponto"
              type="date"
              value={dia}
              max={hoje()}
              disabled={salvando !== null}
              onChange={(e) => {
                if (e.target.value) {
                  setDia(e.target.value);
                  setMensagem(null);
                }
              }}
              className={classeCampo}
            />
            <p className={`mt-1 capitalize ${texto.apoio}`}>{diaDaSemana(dia)}</p>
          </div>

          <div role="group" aria-label={`Ponto de ${formatarData(dia)}`} className="grid grid-cols-3 gap-3">
            {OPCOES_PONTO.map((op) => {
              const escolhido = marcadoNoDia === op.valor;
              return (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => marcar(op.valor)}
                  disabled={salvando !== null || conferindoDia}
                  aria-pressed={escolhido}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-4 transition-colors disabled:cursor-wait ${foco} ${
                    escolhido ? op.classe : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <span className="text-2xl font-bold">{op.letra}</span>
                  <span className="text-xs font-medium">{salvando === op.valor ? 'Salvando…' : op.rotulo}</span>
                </button>
              );
            })}
          </div>

          <Aviso mensagem={mensagem} className="" />
          {marcadoNoDia && !mensagem && (
            <p className={texto.apoio}>Clique de novo na marcação escolhida para desmarcar.</p>
          )}
        </div>
      </Cartao>

      {/* ============ HISTÓRICO ============ */}
      <Cartao titulo="Meus últimos pontos" className="lg:col-span-2">
        {!pontos.length ? (
          <Vazio>Nenhum ponto marcado ainda.</Vazio>
        ) : (
          <ul className="-my-2 divide-y divide-gray-100">
            {pontos.slice(0, 20).map((p) => {
              const op = opcaoDoPonto(p.situacao);
              const estiloSelo =
                p.situacao === 'presente' ? selo.sucesso : p.situacao === 'ausente' ? selo.erro : selo.atencao;
              return (
                <li key={p.data}>
                  <button
                    type="button"
                    onClick={() => {
                      setDia(p.data);
                      setMensagem(null);
                    }}
                    disabled={salvando !== null}
                    className={`-mx-2 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-gray-50 ${foco}`}
                  >
                    <span>
                      <span className={`block ${texto.destaque}`}>{formatarData(p.data)}</span>
                      <span className={`block capitalize ${texto.apoio}`}>{diaDaSemana(p.data)}</span>
                    </span>
                    <span className={`${selo.base} ${estiloSelo}`}>
                      {op.letra} · {op.rotulo}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </div>
  );
};

export default MeuPonto;
