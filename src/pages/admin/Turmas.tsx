/**
 * ============================================
 * ADMIN · EDIÇÕES E TURMAS (aba de "Alunos e chamadas")
 * ============================================
 *
 * Mostra só a edição escolhida no seletor lá de cima (igual às outras páginas):
 * renomear a edição, criar, renomear e apagar turmas dela. "Nova edição" cria
 * a próxima (ex.: a 4ª) e já a seleciona no topo.
 *
 * Os nomes de turma seguem um padrão fixo, que o banco também exige:
 * "Turma Única" quando há uma só; "Turma 1, 2..." ou "Turma A, B..." quando há mais.
 */
import { useCallback, useState } from 'react';

import { useDadosEmCache } from '../../hooks/useDadosEmCache';

import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import Janela from '../../components/admin/Janela';
import { Carregando } from '../../components/admin/Moldura';
import { Aviso, Botao, Cartao, classeCampo, classeRotulo, type Mensagem } from '../../components/admin/Ui';
import { servicoEdicoes } from '../../lib/edicoes';
import { chaveTurmas, NOMES_DE_TURMA, servicoTurmas, type TurmaComAlunos } from '../../lib/turmas';
import { useAdmin } from './contexto';
import { texto } from '../../components/admin/designSystem';

// O que a janela está editando
type AlvoDaJanela =
  | { tipo: 'nova-edicao' }
  | { tipo: 'renomear-edicao' }
  | { tipo: 'nova-turma' }
  | { tipo: 'renomear-turma'; id: number };

const TITULOS: Record<AlvoDaJanela['tipo'], string> = {
  'nova-edicao': 'Nova edição',
  'renomear-edicao': 'Renomear edição',
  'nova-turma': 'Nova turma',
  'renomear-turma': 'Renomear turma',
};

const Turmas: React.FC = () => {
  const { edicao, edicoes, recarregarEdicoes, recarregarDados } = useAdmin();
  const [janela, setJanela] = useState<AlvoDaJanela | null>(null);
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [erroJanela, setErroJanela] = useState<Mensagem>(null);

  // Já vem pronto do cache (o layout carrega na abertura); atualiza por trás
  const {
    dados: turmas,
    erro,
    recarregar: carregar,
  } = useDadosEmCache(chaveTurmas(edicao.id), () => servicoTurmas.carregarDaEdicao(edicao.id));

  const usados = (turmas ?? []).map((t) => t.nome);
  // Sem os dados: carregamento na hora (nunca tela em branco) e pintura completa
  const mostrarCarregando = useCarregamentoCompleto(turmas === undefined && !erro, 0);

  const abrir = (alvo: AlvoDaJanela, valorInicial: string) => {
    setMensagem(null);
    setErroJanela(null);
    setValor(valorInicial);
    setJanela(alvo);
  };
  const fechar = useCallback(() => setJanela(null), []);

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!janela || !valor.trim()) return;
    const nome = valor.trim();
    setSalvando(true);

    if (janela.tipo === 'nova-edicao') {
      const { erro, id } = await servicoEdicoes.criar(nome);
      setSalvando(false);
      if (erro) return setErroJanela({ tipo: 'erro', texto: erro });
      setJanela(null);
      await recarregarEdicoes(id); // já abre a edição nova no seletor do topo
      return;
    }

    const erro =
      janela.tipo === 'renomear-edicao'
        ? await servicoEdicoes.renomear(edicao.id, nome)
        : janela.tipo === 'nova-turma'
          ? await servicoTurmas.criar(edicao.id, nome)
          : await servicoTurmas.renomear(janela.id, nome);
    setSalvando(false);
    if (erro) return setErroJanela({ tipo: 'erro', texto: erro });

    setJanela(null);
    setMensagem({ tipo: 'sucesso', texto: janela.tipo === 'nova-turma' ? `${nome} criada.` : 'Nome atualizado.' });
    // Nome de edição aparece no seletor; nome de turma, nos filtros e nas outras abas
    await Promise.all([carregar(), janela.tipo === 'renomear-edicao' ? recarregarEdicoes() : recarregarDados()]);
  };

  const apagar = async (turma: TurmaComAlunos) => {
    if (!window.confirm(`Apagar a ${turma.nome}? Só funciona se ela não tiver alunos nem aulas.`)) return;
    const erro = await servicoTurmas.apagar(turma.id);
    if (erro) return setMensagem({ tipo: 'erro', texto: erro });
    setMensagem({ tipo: 'sucesso', texto: `${turma.nome} apagada.` });
    await Promise.all([carregar(), recarregarDados()]);
  };

  const encerrarEdicao = async () => {
    const pergunta =
      `Encerrar a ${edicao.nome}? A chamada fica só para consulta e ninguém mais altera a presença. ` +
      'A equipe desta edição vai para o Hall da Fama. Pelo site não dá para reabrir.';
    if (!window.confirm(pergunta)) return;
    const erro = await servicoEdicoes.encerrar(edicao.id);
    if (erro) return setMensagem({ tipo: 'erro', texto: erro });
    setMensagem({ tipo: 'sucesso', texto: `${edicao.nome} encerrada.` });
    await recarregarEdicoes(edicao.id);
  };

  // Carregando: ocupa a página toda
  if (erro && turmas === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar as turmas.' }} />;
  if (mostrarCarregando || turmas === undefined) return <Carregando texto="Carregando turmas" />;

  const ehTurma = janela?.tipo === 'nova-turma' || janela?.tipo === 'renomear-turma';
  // Na lista só entram nomes livres (e o nome atual, ao renomear)
  const nomesLivres = NOMES_DE_TURMA.filter((n) => n === valor || !usados.includes(n));

  return (
    <>
      <Aviso mensagem={mensagem} />

      {
        <Cartao
          titulo={edicao.nome}
          descricao={`${turmas.length} turma(s) · ${turmas.reduce((s, t) => s + t.alunos, 0)} alunos${
            edicao.encerrada ? ' · edição encerrada: presença só para consulta' : ''
          }`}
          acoes={
            <div className="flex flex-wrap gap-2">
              <Botao tamanho="pequeno" onClick={() => abrir({ tipo: 'renomear-edicao' }, edicao.nome)}>
                Renomear edição
              </Botao>
              {!edicao.encerrada && !edicao.demonstracao && (
                <Botao tamanho="pequeno" variante="perigo" onClick={encerrarEdicao}>
                  Encerrar edição
                </Botao>
              )}
              <Botao
                tamanho="pequeno"
                variante="primario"
                onClick={() =>
                  abrir(
                    { tipo: 'nova-edicao' },
                    `Edição ${edicoes.filter((e) => !e.demonstracao).length + 1} (${new Date().getFullYear()})`,
                  )
                }
              >
                + Nova edição
              </Botao>
            </div>
          }
          className="max-w-3xl"
        >
          {turmas.length === 0 ? (
            <p className="mb-4 text-sm text-gray-500">Nenhuma turma ainda.</p>
          ) : (
            <ul className="-mt-2 mb-4 divide-y divide-gray-100">
              {turmas.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="font-medium text-gray-900">{t.nome}</p>
                    <p className={`${texto.apoio}`}>{t.alunos} aluno(s)</p>
                  </div>
                  <div className="flex gap-1">
                    <Botao tamanho="pequeno" onClick={() => abrir({ tipo: 'renomear-turma', id: t.id }, t.nome)}>
                      Renomear
                    </Botao>
                    {t.alunos === 0 && (
                      <Botao variante="perigo" tamanho="pequeno" onClick={() => apagar(t)}>
                        Apagar
                      </Botao>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Botao
            className="w-full"
            onClick={() => {
              // Sugere o próximo nome livre ("Turma Única" só se for a primeira)
              const sugestao =
                NOMES_DE_TURMA.find((n) => !usados.includes(n) && (usados.length === 0 || n !== 'Turma Única')) ?? '';
              abrir({ tipo: 'nova-turma' }, sugestao);
            }}
          >
            + Adicionar turma
          </Botao>
          {usados.includes('Turma Única') && (
            <p className="mt-2 text-xs text-amber-700">
              Vai ter mais de uma turma? Renomeie a “Turma Única” para “Turma 1” ou “Turma A”.
            </p>
          )}
        </Cartao>
      }

      <Janela titulo={janela ? TITULOS[janela.tipo] : ''} aberta={janela !== null} onFechar={fechar}>
        <form onSubmit={aoEnviar} className="space-y-4">
          <Aviso mensagem={erroJanela} className="" />
          <div>
            <label htmlFor="nome-cadastro" className={classeRotulo}>
              Nome *
            </label>
            {ehTurma ? (
              <select
                id="nome-cadastro"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className={classeCampo}
              >
                {nomesLivres.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="nome-cadastro"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
                maxLength={60}
                className={classeCampo}
                placeholder="Ex: Edição 4 (2026)"
              />
            )}
          </div>
          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Botao type="submit" variante="primario" disabled={salvando || !valor.trim()}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Botao>
          </div>
        </form>
      </Janela>
    </>
  );
};

export default Turmas;
