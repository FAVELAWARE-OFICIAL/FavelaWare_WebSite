/**
 * ============================================
 * ALUNO · SOLICITAÇÕES
 * ============================================
 *
 * O aluno escreve o que precisa (o tipo é livre: "Mudança de turno", "Atestado"...)
 * e conversa com a coordenação na janela de cada pedido até a devolutiva.
 * Cada pedido cai no quadro do gestor (Aberto -> Em andamento -> Concluído).
 * Os cartões e a conversa são as mesmas peças do gestor e do parceiro.
 */
import { useCallback, useState } from 'react';

import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import ConversaDaSolicitacao from '../../components/admin/ConversaDaSolicitacao';
import { Carregando } from '../../components/admin/Moldura';
import ResumoDaSolicitacao from '../../components/admin/ResumoDaSolicitacao';
import {
  Aviso,
  Botao,
  Cartao,
  Vazio,
  classeCampo,
  classeRotulo,
  classeTextoLongo,
  type Mensagem,
} from '../../components/admin/Ui';
import { useCampos } from '../../hooks/useCampos';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import {
  CHAVE_MINHAS_SOLICITACOES,
  servicoSolicitacoes,
  TAMANHO_MAXIMO_TEXTO,
  TAMANHO_MAXIMO_TIPO,
} from '../../lib/solicitacoes';

const CAMPOS_VAZIOS = { tipo: '', descricao: '' };

const SolicitacoesAluno: React.FC = () => {
  const {
    dados: lista,
    erro,
    recarregar,
  } = useDadosEmCache(CHAVE_MINHAS_SOLICITACOES, () => servicoSolicitacoes.carregarMinhas());
  const { campos, setCampos, aoAlterarCampo } = useCampos(CAMPOS_VAZIOS);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  // Guarda só o id: a conversa mostra o pedido como está na lista (status atualizado)
  const [conversaId, setConversaId] = useState<number | null>(null);
  const fecharConversa = useCallback(() => {
    setConversaId(null);
    recarregar().catch(() => undefined); // a coordenação pode ter respondido enquanto a janela estava aberta
  }, [recarregar]);

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensagem(null);
    setEnviando(true);
    const falha = await servicoSolicitacoes.enviarMinha(campos.tipo, campos.descricao);
    setEnviando(false);
    if (falha) return setMensagem({ tipo: 'erro', texto: falha });
    setCampos(CAMPOS_VAZIOS);
    setMensagem({ tipo: 'sucesso', texto: 'Solicitação enviada. A conversa com a coordenação fica aqui ao lado.' });
    await recarregar().catch(() => undefined);
  };

  const mostrarCarregando = useCarregamentoCompleto(lista === undefined && !erro, 0);
  if (erro && lista === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar suas solicitações.' }} />;
  if (mostrarCarregando || lista === undefined) return <Carregando texto="Carregando suas solicitações" />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Cartao titulo="Nova solicitação" descricao="Precisa mudar de turno, de turma ou falar de outro assunto?">
        <form onSubmit={enviar} className="space-y-4">
          <Aviso mensagem={mensagem} className="" />
          <div>
            <label htmlFor="minha-sol-tipo" className={classeRotulo}>
              Tipo de pedido *
            </label>
            <input
              id="minha-sol-tipo"
              name="tipo"
              type="text"
              required
              maxLength={TAMANHO_MAXIMO_TIPO}
              value={campos.tipo}
              onChange={aoAlterarCampo}
              className={classeCampo}
              placeholder="Ex: Mudança de turno"
            />
          </div>
          <div>
            <label htmlFor="minha-sol-descricao" className={classeRotulo}>
              O que você precisa *
            </label>
            <textarea
              id="minha-sol-descricao"
              name="descricao"
              rows={5}
              maxLength={TAMANHO_MAXIMO_TEXTO}
              required
              value={campos.descricao}
              onChange={aoAlterarCampo}
              className={classeTextoLongo}
              placeholder="Ex: comecei a trabalhar de manhã e preciso passar para o turno da tarde."
            />
          </div>
          <div className="flex justify-end">
            <Botao type="submit" variante="primario" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar solicitação'}
            </Botao>
          </div>
        </form>
      </Cartao>

      <Cartao titulo="Minhas solicitações">
        {!lista.length ? (
          <Vazio>Você ainda não enviou nenhuma solicitação.</Vazio>
        ) : (
          <ul className="space-y-3">
            {lista.map((s) => (
              <ResumoDaSolicitacao
                key={s.id}
                solicitacao={s}
                acoes={
                  <Botao tamanho="pequeno" onClick={() => setConversaId(s.id)}>
                    Conversa
                  </Botao>
                }
              />
            ))}
          </ul>
        )}
      </Cartao>

      <ConversaDaSolicitacao
        solicitacao={lista.find((s) => s.id === conversaId) ?? null}
        modo="aluno"
        onFechar={fecharConversa}
      />
    </div>
  );
};

export default SolicitacoesAluno;
