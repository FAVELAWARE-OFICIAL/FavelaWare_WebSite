/**
 * Cartão de uma trilha na página da equipe: abas Materiais e Atividades, com os
 * botões de gestão. Quem abre janelas e apaga é a página (TrilhasEquipe).
 */
import { useState } from 'react';

import AbasDoCartao from '../admin/AbasDoCartao';
import { IconeLinkExterno } from '../admin/Icones';
import { Botao, Cartao } from '../admin/Ui';
import { foco, selo, texto } from '../admin/designSystem';
import { paraCorrigir, resumoNaTurma, type Atividade } from '../../lib/atividades';
import { resumoDasRegras } from '../../lib/entregas';
import { dominioDoLink, type TrilhaDoPortal } from '../../lib/material';
import { formatarDataHora } from '../../utils/datas';
import type { AlvoDeApagar, EstadoAtividades, JanelaAberta } from './tipos';

type Aba = 'materiais' | 'atividades';

interface PropsCartao {
  trilha: TrilhaDoPortal;
  atividades: Atividade[];
  idsDosAlunos: Set<number>;
  totalDeAlunos: number;
  estadoAtividades: EstadoAtividades;
  /** Entregas e correção (gestor e instrutor); o colaborador cuida só do conteúdo */
  mostrarEntregas: boolean;
  aoAbrir: (j: JanelaAberta) => void;
  aoApagar: (alvo: AlvoDeApagar) => void;
}

const CartaoDaTrilhaDaEquipe: React.FC<PropsCartao> = ({
  trilha,
  atividades,
  idsDosAlunos,
  totalDeAlunos,
  estadoAtividades,
  mostrarEntregas,
  aoAbrir,
  aoApagar,
}) => {
  // Até a pessoa escolher, a aba segue os dados: trilha sem material, mas com
  // atividade, abre em Atividades (as atividades chegam depois dos materiais)
  const [escolhida, setEscolhida] = useState<Aba | null>(null);
  const aba: Aba = escolhida ?? (trilha.materiais.length === 0 && atividades.length > 0 ? 'atividades' : 'materiais');

  // Entregas esperando correção nesta trilha (só de quem está na turma)
  const aguardandoNaTrilha = mostrarEntregas ? paraCorrigir(atividades, idsDosAlunos) : 0;

  const painelMateriais = (
    <>
      {trilha.materiais.length === 0 ? (
        <p className={`py-2 ${texto.apoio}`}>Nenhum material nesta trilha ainda.</p>
      ) : (
        <ul className="-my-1 mb-3 divide-y divide-gray-100">
          {trilha.materiais.map((m) => (
            <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 rounded ${texto.destaque} hover:text-favela-green-700 hover:underline ${foco}`}
                >
                  {m.titulo}
                  <IconeLinkExterno className="h-3.5 w-3.5" />
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
                <p className={texto.apoio}>
                  {m.descricao ? `${m.descricao} · ` : ''}
                  {dominioDoLink(m.url)}
                </p>
              </div>
              <div className="flex gap-1">
                <Botao
                  tamanho="pequeno"
                  onClick={() => aoAbrir({ tipo: 'material', trilhaId: trilha.id, material: m })}
                >
                  Editar
                </Botao>
                <Botao tamanho="pequeno" variante="perigo" onClick={() => aoApagar({ tipo: 'material', material: m })}>
                  Apagar
                </Botao>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Botao className="w-full" onClick={() => aoAbrir({ tipo: 'material', trilhaId: trilha.id })}>
        + Adicionar link
      </Botao>
    </>
  );

  const painelAtividades =
    estadoAtividades === 'carregando' ? (
      <p className={`py-2 ${texto.apoio}`}>Carregando as atividades…</p>
    ) : estadoAtividades === 'erro' ? (
      <p className="py-2 text-sm text-red-700">
        Não foi possível carregar as atividades desta turma. Recarregue a página.
      </p>
    ) : estadoAtividades === 'erro-turmas' ? (
      <p className="py-2 text-sm text-red-700">Não foi possível carregar as turmas. Recarregue a página.</p>
    ) : estadoAtividades === 'sem-turma' ? (
      <p className={`py-2 ${texto.apoio}`}>Sem turma, não há atividades para mostrar.</p>
    ) : (
      <>
        {atividades.length === 0 ? (
          <p className={`py-2 ${texto.apoio}`}>Nenhuma atividade desta trilha nesta turma.</p>
        ) : (
          <ul className="-my-1 mb-3 divide-y divide-gray-100">
            {atividades.map((a) => {
              const { aguardando, entregaram, encerrada } = resumoNaTurma(a, idsDosAlunos);
              return (
                <li key={a.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={texto.destaque}>{a.titulo}</p>
                      <p className={texto.apoio}>
                        Prazo: {formatarDataHora(a.prazo)}
                        {encerrada ? ' (encerrado)' : ''}
                        {mostrarEntregas && ` · ${entregaram} de ${totalDeAlunos} entregaram`}
                      </p>
                      {resumoDasRegras(a) && <p className={`mt-0.5 ${texto.apoio}`}>Exige: {resumoDasRegras(a)}</p>}
                    </div>
                    {mostrarEntregas && aguardando > 0 && (
                      <span className={`${selo.base} ${selo.informacao}`}>{aguardando} para corrigir</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {mostrarEntregas && (
                      <Botao
                        tamanho="pequeno"
                        variante={aguardando > 0 ? 'primario' : 'secundario'}
                        onClick={() => aoAbrir({ tipo: 'entregas', atividadeId: a.id })}
                      >
                        Entregas
                      </Botao>
                    )}
                    <Botao
                      tamanho="pequeno"
                      onClick={() => aoAbrir({ tipo: 'atividade', trilhaId: trilha.id, atividade: a })}
                    >
                      Editar e prazo
                    </Botao>
                    {/* Sem ver as entregas, o botão fica sempre: o banco recusa atividade com entrega */}
                    {(!mostrarEntregas || a.tentativas.length === 0) && (
                      <Botao
                        tamanho="pequeno"
                        variante="perigo"
                        onClick={() => aoApagar({ tipo: 'atividade', atividade: a })}
                      >
                        Apagar
                      </Botao>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Botao className="w-full" onClick={() => aoAbrir({ tipo: 'atividade', trilhaId: trilha.id, atividade: null })}>
          + Nova atividade
        </Botao>
      </>
    );

  return (
    <Cartao
      titulo={trilha.nome}
      descricao={trilha.descricao ?? undefined}
      acoes={
        <div className="flex gap-1">
          <Botao tamanho="pequeno" onClick={() => aoAbrir({ tipo: 'trilha', trilha })}>
            Editar
          </Botao>
          <Botao tamanho="pequeno" variante="perigo" onClick={() => aoApagar({ tipo: 'trilha', trilha })}>
            Apagar
          </Botao>
        </div>
      }
    >
      <AbasDoCartao<Aba>
        id={`trilha-equipe-${trilha.id}`}
        rotulo={`Conteúdo de ${trilha.nome}`}
        ativa={aba}
        aoTrocar={setEscolhida}
        abas={[
          { valor: 'materiais', rotulo: 'Materiais', total: trilha.materiais.length, painel: painelMateriais },
          {
            valor: 'atividades',
            rotulo: 'Atividades',
            total: estadoAtividades === 'pronto' ? atividades.length : undefined,
            alerta: aguardandoNaTrilha > 0 ? `${aguardandoNaTrilha} para corrigir` : undefined,
            painel: painelAtividades,
          },
        ]}
      />
    </Cartao>
  );
};

export default CartaoDaTrilhaDaEquipe;
