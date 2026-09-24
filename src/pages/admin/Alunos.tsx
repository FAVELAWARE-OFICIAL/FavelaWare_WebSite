/**
 * ============================================
 * ADMIN · ALUNOS
 * ============================================
 *
 * Lista de alunos da edição com foto e frequência. O gestor cadastra, edita
 * e remove alunos por aqui.
 * - Computador: tabela; clicar no título de uma coluna ordena.
 * - Celular: a tabela vira uma lista de cartões (tabela larga não cabe em 375px).
 */
import { useCallback, useMemo, useState } from 'react';

import Avatar from '../../components/admin/Avatar';
import FormularioAluno from '../../components/admin/FormularioAluno';
import { AcessosDaTurma, SeloAcesso } from '../../components/admin/AcessosAlunos';
import { CHAVE_ACESSOS, servicoAcessos, type SituacaoDoAcesso } from '../../lib/acessos';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import Janela from '../../components/admin/Janela';
import { Aviso, BarraDeFiltros, Botao, Vazio, type Mensagem } from '../../components/admin/Ui';
import { FAIXAS, faixaDe, formatarPercentual, type AlunoDoPainel, type Participante } from '../../lib/painel';
import { useAdmin } from './contexto';
import { campo, foco, superficie, texto } from '../../components/admin/designSystem';

type Coluna = 'nome' | 'turma' | 'presentes' | 'ausentes' | 'justificadas' | 'frequencia';

// campo, rótulo, alinha à direita (colunas de número)
const COLUNAS: [Coluna, string, boolean][] = [
  ['nome', 'Nome', false],
  ['turma', 'Turma', false],
  ['presentes', 'Presenças', true],
  ['ausentes', 'Faltas', true],
  ['justificadas', 'Justificadas', true],
  ['frequencia', 'Frequência', false],
];

// Ordens oferecidas no seletor (a padrão é nome A→Z; o filtro separa por turma)
const ORDENACOES: { valor: string; rotulo: string }[] = [
  { valor: 'nome:asc', rotulo: 'Nome (A–Z)' },
  { valor: 'nome:desc', rotulo: 'Nome (Z–A)' },
  { valor: 'frequencia:asc', rotulo: 'Menor frequência' },
  { valor: 'frequencia:desc', rotulo: 'Maior frequência' },
  { valor: 'ausentes:desc', rotulo: 'Mais faltas' },
  { valor: 'turma:asc', rotulo: 'Turma' },
];

/** Barrinha colorida da frequência (vermelho / amarelo / verde) */
const BarraFrequencia: React.FC<{ frequencia: number | null }> = ({ frequencia }) => {
  const faixa = FAIXAS.find((f) => f.valor === faixaDe(frequencia));
  return (
    <div className="flex min-w-[8rem] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${(frequencia ?? 0) * 100}%`, backgroundColor: faixa?.cor }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold tabular-nums">{formatarPercentual(frequencia)}</span>
    </div>
  );
};

const Alunos: React.FC = () => {
  const { edicao, dados, painel, recarregarDados, somenteLeitura } = useAdmin();
  const [ordem, setOrdem] = useState<{ campo: Coluna; crescente: boolean }>({ campo: 'nome', crescente: true });
  // undefined = janela fechada; null = cadastro novo; Participante = edição
  const [emEdicao, setEmEdicao] = useState<Participante | null | undefined>(undefined);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [janelaAcessos, setJanelaAcessos] = useState(false);
  // Quem já tem login no sistema (vem pronto do cache; o layout carrega na abertura).
  // O parceiro não vê acesso nem login dos alunos.
  const { dados: acessos, recarregar: recarregarAcessos } = useDadosEmCache(CHAVE_ACESSOS, () =>
    somenteLeitura ? Promise.resolve<Record<number, SituacaoDoAcesso>>({}) : servicoAcessos.carregar(),
  );
  const situacao = (id: number): SituacaoDoAcesso => acessos?.[id] ?? 'sem-acesso';
  // Criar acesso pode gerar o login do aluno: atualiza as duas listas
  const aoMudarAcesso = async () => {
    await Promise.all([recarregarAcessos(), recarregarDados()]);
  };

  const ordenados = useMemo(() => {
    const { campo, crescente } = ordem;
    return [...painel.alunos].sort((a, b) => {
      const va = a[campo] ?? -1;
      const vb = b[campo] ?? -1;
      const comparacao = typeof va === 'string' ? va.localeCompare(String(vb), 'pt-BR') : Number(va) - Number(vb);
      // Empate (mesma turma, mesma frequência...): fica em ordem alfabética
      return (crescente ? comparacao : -comparacao) || a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [painel.alunos, ordem]);

  // Texto começa em A→Z; número começa do maior
  const ordenarPor = (campo: Coluna) =>
    setOrdem((atual) => ({
      campo,
      crescente: atual.campo === campo ? !atual.crescente : campo === 'nome' || campo === 'turma',
    }));

  const fecharJanela = useCallback(() => setEmEdicao(undefined), []);
  const fecharAcessos = useCallback(() => setJanelaAcessos(false), []);

  const concluir = async (texto: string) => {
    setEmEdicao(undefined);
    setMensagem({ tipo: 'sucesso', texto });
    await recarregarDados();
  };

  // Parceiro só vê: sem editar e sem a situação do acesso
  const botaoEditar = (a: AlunoDoPainel) =>
    somenteLeitura ? null : (
      <Botao onClick={() => setEmEdicao(a)} tamanho="pequeno" aria-label={`Editar ${a.nome}`}>
        Editar
      </Botao>
    );
  const seloDoAcesso = (a: AlunoDoPainel) => (somenteLeitura ? null : <SeloAcesso situacao={situacao(a.id)} />);

  return (
    <>
      <Aviso mensagem={mensagem} />

      {/* Filtros + ordem + "Novo aluno", tudo na mesma caixa */}
      <BarraDeFiltros
        extras={
          <div className="w-full sm:w-48">
            <label htmlFor="ordenar" className={texto.rotulo}>
              Ordenar por
            </label>
            <select
              id="ordenar"
              value={`${ordem.campo}:${ordem.crescente ? 'asc' : 'desc'}`}
              onChange={(e) => {
                const [coluna, direcao] = e.target.value.split(':');
                setOrdem({ campo: coluna as Coluna, crescente: direcao === 'asc' });
              }}
              className={campo}
            >
              {ORDENACOES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </div>
        }
        acoes={
          <>
            <span className={`${texto.apoio} pb-2`}>
              {ordenados.length} aluno{ordenados.length === 1 ? '' : 's'}
            </span>
            {!somenteLeitura && (
              <>
                <Botao
                  onClick={() => {
                    setMensagem(null);
                    setJanelaAcessos(true);
                  }}
                >
                  Acessos
                </Botao>
                <Botao
                  variante="primario"
                  onClick={() => {
                    setMensagem(null);
                    setEmEdicao(null);
                  }}
                >
                  + Novo aluno
                </Botao>
              </>
            )}
          </>
        }
      />

      {!ordenados.length ? (
        <Vazio>
          {painel.alunos.length === 0 && !dados.participantes.some((p) => p.funcao === 'aluno')
            ? `Esta edição ainda não tem alunos.${somenteLeitura ? '' : ' Clique em "Novo aluno" para cadastrar.'}`
            : 'Nenhum aluno com os filtros atuais.'}
        </Vazio>
      ) : (
        <>
          {/* ============ CELULAR: cartões ============ */}
          <ul className="space-y-3 md:hidden">
            {ordenados.map((a) => (
              <li key={a.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar foto={a.foto} nome={a.nome} tamanho="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{a.nome}</p>
                    <p className={`truncate ${texto.apoio}`}>{[a.turma, a.login].filter(Boolean).join(' · ')}</p>
                    <div className="mt-1 empty:hidden">{seloDoAcesso(a)}</div>
                  </div>
                  {botaoEditar(a)}
                </div>
                <div className="mt-3">
                  <BarraFrequencia frequencia={a.frequencia} />
                </div>
                <p className={`mt-2 ${texto.apoio} tabular-nums`}>
                  {a.presentes} presenças · {a.ausentes} faltas · {a.justificadas} justificadas
                </p>
                {a.observacao && <p className="mt-2 text-xs text-gray-600">{a.observacao}</p>}
              </li>
            ))}
          </ul>

          {/* ============ COMPUTADOR: tabela ============ */}
          <div className={`hidden overflow-x-auto ${superficie.cartao} md:block`}>
            <table className="w-full text-sm">
              <caption className="sr-only">Alunos e frequência ({ordenados.length})</caption>
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  {COLUNAS.map(([campo, rotulo, direita]) => (
                    <th
                      key={campo}
                      scope="col"
                      className={`px-4 py-3 font-medium ${direita ? 'text-right' : 'text-left'}`}
                      aria-sort={ordem.campo === campo ? (ordem.crescente ? 'ascending' : 'descending') : 'none'}
                    >
                      <button
                        type="button"
                        onClick={() => ordenarPor(campo)}
                        className={`rounded uppercase tracking-wide hover:text-gray-900 ${foco}`}
                      >
                        {rotulo}
                        <span aria-hidden="true" className="ml-1">
                          {ordem.campo === campo ? (ordem.crescente ? '↑' : '↓') : ''}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Observação
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ordenados.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar foto={a.foto} nome={a.nome} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{a.nome}</p>
                          <p className={`flex flex-wrap items-center gap-2 ${texto.apoio}`}>
                            {a.login}
                            {seloDoAcesso(a)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{a.turma}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{a.presentes}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{a.ausentes}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{a.justificadas}</td>
                    <td className="px-4 py-2.5">
                      <BarraFrequencia frequencia={a.frequencia} />
                    </td>
                    <td className="max-w-xs px-4 py-2.5 text-gray-600">{a.observacao ?? ''}</td>
                    <td className="px-4 py-2.5 text-right">{botaoEditar(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Janela titulo={emEdicao ? 'Editar aluno' : 'Novo aluno'} aberta={emEdicao !== undefined} onFechar={fecharJanela}>
        {emEdicao !== undefined && (
          <FormularioAluno
            edicaoId={edicao.id}
            turmas={dados.turmas}
            aluno={emEdicao}
            onConcluir={concluir}
            situacaoAcesso={emEdicao ? situacao(emEdicao.id) : undefined}
            aoMudarAcesso={aoMudarAcesso}
          />
        )}
      </Janela>

      <Janela titulo="Acessos dos alunos" aberta={janelaAcessos} onFechar={fecharAcessos}>
        {janelaAcessos && (
          <AcessosDaTurma
            turmas={dados.turmas}
            alunos={dados.participantes}
            acessos={acessos ?? {}}
            onConcluir={aoMudarAcesso}
          />
        )}
      </Janela>
    </>
  );
};

export default Alunos;
