/**
 * ============================================
 * ALUNO · TRILHAS (MATERIAIS E ATIVIDADES)
 * ============================================
 *
 * Uma página só, organizada pelas trilhas (Carreira Tech, Git e GitHub...).
 * Cada trilha é um cartão com duas abas:
 * - Materiais: os links das aulas (abrem em nova aba);
 * - Atividades: as atividades da turma nessa trilha; ao abrir, a janela de entrega.
 *
 * "Ver como aluno" (conta que alterna papéis, sem aluno ligado) vê as atividades da
 * turma mais recente que tem atividades, exatamente como o aluno vê.
 */
import { useCallback, useState } from 'react';

import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import { IconeLinkExterno } from '../../components/admin/Icones';
import AbasDoCartao from '../../components/admin/AbasDoCartao';
import { Carregando } from '../../components/admin/Moldura';
import { Aviso, Cartao, Vazio } from '../../components/admin/Ui';
import { espaco, foco, selo, texto } from '../../components/admin/designSystem';
import JanelaDaAtividade, { COR_SITUACAO } from '../../components/atividades/JanelaDaAtividade';
import {
  carregarAtividadesDoAluno, CHAVE_ATIVIDADES_ALUNO, formatarDataHora, podeEnviar, ROTULO_SITUACAO, situacaoDoAluno,
  tentativasDe, type Atividade,
} from '../../lib/atividades';
import { useDadosEmCache } from '../../lib/cache';
import { carregarTrilhas, CHAVE_MATERIAL, dominioDoLink, type Trilha } from '../../lib/material';

type Aba = 'materiais' | 'atividades';

const TrilhasAluno: React.FC = () => {
  const material = useDadosEmCache(CHAVE_MATERIAL, carregarTrilhas);
  const atividades = useDadosEmCache(CHAVE_ATIVIDADES_ALUNO, carregarAtividadesDoAluno);
  const carregando = material.dados === undefined || atividades.dados === undefined;
  const falhou = (material.erro && material.dados === undefined) || (atividades.erro && atividades.dados === undefined);
  const mostrarCarregando = useCarregamentoCompleto(carregando && !falhou, 0);
  const [abertaId, setAbertaId] = useState<number | null>(null);
  const fechar = useCallback(() => setAbertaId(null), []);

  if (falhou) return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar as trilhas. Recarregue a página.' }} />;
  if (mostrarCarregando || material.dados === undefined || atividades.dados === undefined) {
    return <Carregando texto="Carregando as trilhas" />;
  }

  const trilhas = material.dados;
  const doAluno = atividades.dados;
  // Conta de demonstração: nenhuma tentativa é "dela" (ids de aluno são sempre positivos)
  const participanteId = doAluno.participanteId ?? -1;
  // Demonstração: a turma mais recente que tem atividade (as turmas já vêm da
  // edição mais nova para a mais antiga)
  const turmaDaDemonstracao = doAluno.visualizacao
    ? (doAluno.turmas.find((t) => doAluno.atividades.some((a) => a.turma_id === t.id)) ?? doAluno.turmas[0])?.id
    : undefined;
  const lista = doAluno.visualizacao
    ? doAluno.atividades.filter((a) => a.turma_id === turmaDaDemonstracao)
    : doAluno.atividades;
  const aberta = lista.find((a) => a.id === abertaId) ?? null;

  const atividadesDa = (trilhaId: number) => lista.filter((a) => a.trilha_id === trilhaId);

  if (!trilhas.length) return <Vazio>Nenhuma trilha publicada ainda.</Vazio>;

  return (
    <>
      <div className={`grid grid-cols-1 ${espaco.grade} lg:grid-cols-2`}>
        {trilhas.map((trilha) => (
          <CartaoDaTrilha
            key={trilha.id}
            trilha={trilha}
            atividades={atividadesDa(trilha.id)}
            participanteId={participanteId}
            aoAbrir={setAbertaId}
          />
        ))}
      </div>

      {aberta && (
        <JanelaDaAtividade
          key={aberta.id}
          atividade={aberta}
          participanteId={participanteId}
          demonstracao={doAluno.visualizacao}
          aoEnviar={atividades.recarregar}
          onFechar={fechar}
        />
      )}
    </>
  );
};

// ============================================
// CARTÃO DA TRILHA (abas Materiais / Atividades)
// ============================================
interface PropsCartao {
  trilha: Trilha;
  atividades: Atividade[];
  participanteId: number;
  aoAbrir: (atividadeId: number) => void;
}

const CartaoDaTrilha: React.FC<PropsCartao> = ({ trilha, atividades, participanteId, aoAbrir }) => {
  // Trilha sem material, mas com atividade, já abre nas atividades
  const [aba, setAba] = useState<Aba>(trilha.materiais.length === 0 && atividades.length > 0 ? 'atividades' : 'materiais');

  // Quantas o aluno ainda pode entregar (pendente ou refazer): ponto de alerta na aba
  const paraEntregar = atividades.filter((a) => podeEnviar(situacaoDoAluno(tentativasDe(a, participanteId), a.prazo))).length;

  return (
    <Cartao titulo={trilha.nome} descricao={trilha.descricao ?? undefined}>
      <AbasDoCartao<Aba>
        id={`trilha-${trilha.id}`}
        rotulo={`Conteúdo de ${trilha.nome}`}
        ativa={aba}
        aoTrocar={setAba}
        abas={[
          { valor: 'materiais', rotulo: 'Materiais', total: trilha.materiais.length, painel: <ListaDeMateriais trilha={trilha} /> },
          {
            valor: 'atividades', rotulo: 'Atividades', total: atividades.length,
            alerta: paraEntregar > 0 ? `${paraEntregar} para entregar` : undefined,
            painel: <ListaDeAtividades atividades={atividades} participanteId={participanteId} aoAbrir={aoAbrir} />,
          },
        ]}
      />
    </Cartao>
  );
};

const ListaDeMateriais: React.FC<{ trilha: Trilha }> = ({ trilha }) =>
  trilha.materiais.length === 0 ? (
    <p className={`py-2 ${texto.apoio}`}>Em breve: o material desta trilha ainda vai ser publicado.</p>
  ) : (
    <ul className="-my-1 divide-y divide-gray-100">
      {trilha.materiais.map((m) => (
        <li key={m.id}>
          <a href={m.url} target="_blank" rel="noopener noreferrer"
            className={`group -mx-2 flex items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-gray-50 ${foco}`}>
            <span className="min-w-0 flex-1">
              <span className={`block ${texto.destaque} group-hover:text-favela-green-700`}>{m.titulo}</span>
              {m.descricao && <span className={`block ${texto.corpo}`}>{m.descricao}</span>}
              <span className={`block ${texto.apoio}`}>{dominioDoLink(m.url)}</span>
            </span>
            <IconeLinkExterno className="mt-0.5 h-4 w-4 text-gray-400 group-hover:text-favela-green-700" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </li>
      ))}
    </ul>
  );

const ListaDeAtividades: React.FC<{ atividades: Atividade[]; participanteId: number; aoAbrir: (id: number) => void }> = ({
  atividades, participanteId, aoAbrir,
}) =>
  atividades.length === 0 ? (
    <p className={`py-2 ${texto.apoio}`}>Nenhuma atividade nesta trilha por enquanto.</p>
  ) : (
    <ul className="-my-1 divide-y divide-gray-100">
      {atividades.map((a) => {
        const tentativas = tentativasDe(a, participanteId);
        const situacao = situacaoDoAluno(tentativas, a.prazo);
        const ultima = tentativas[tentativas.length - 1];
        return (
          <li key={a.id}>
            <button type="button" onClick={() => aoAbrir(a.id)}
              className={`-mx-2 flex w-[calc(100%+1rem)] flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-gray-50 ${foco}`}>
              <span className="min-w-0">
                <span className={`block ${texto.destaque}`}>{a.titulo}</span>
                <span className={`block ${texto.apoio}`}>Prazo: {formatarDataHora(a.prazo)}</span>
              </span>
              <span className="flex items-center gap-2">
                {situacao === 'concluida' && ultima?.nota != null && (
                  <span className="text-sm font-bold tabular-nums text-gray-900">{ultima.nota} / 100</span>
                )}
                <span className={`${selo.base} ${COR_SITUACAO[situacao]}`}>{ROTULO_SITUACAO[situacao]}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

export default TrilhasAluno;
