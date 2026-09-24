/**
 * ============================================
 * ADMIN · EQUIPE (TODOS OS MEMBROS)
 * ============================================
 *
 * Todas as contas que não são de aluno: gestores, instrutores, parceiros e banca.
 * O gestor troca a função de cada pessoa (com confirmação). A dona do portal tem
 * todas as personas (o "Ver como"): a função dela só ela muda, e ninguém mais
 * ganha isso. O banco confere as duas regras.
 */
import { useCallback, useEffect, useState } from 'react';

import Avatar from '../../components/admin/Avatar';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import { Carregando } from '../../components/admin/Moldura';
import { Aviso, Cartao, JanelaDeConfirmacao, Vazio, classeCampo, type Mensagem } from '../../components/admin/Ui';
import { selo, texto } from '../../components/admin/designSystem';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { FUNCOES_DA_EQUIPE, servicoEquipe, type MembroDaEquipe } from '../../lib/equipe';
import { NOME_DO_PAPEL, servicoSessao, type Papel } from '../../lib/sessao';

const CHAVE_MEMBROS = 'equipe:membros';

const Membros: React.FC = () => {
  const { dados: membros, erro, recarregar } = useDadosEmCache(CHAVE_MEMBROS, () => servicoEquipe.listarMembros());
  const [meuId, setMeuId] = useState<string | null>(null);
  const [trocando, setTrocando] = useState<{ membro: MembroDaEquipe; papel: Papel } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const fecharTroca = useCallback(() => setTrocando(null), []);

  useEffect(() => {
    servicoSessao
      .contaLogada()
      .then((l) => setMeuId(l?.conta.id ?? null))
      .catch((e) => console.error('[equipe] não conferiu a conta', e?.message));
  }, []);

  const confirmarTroca = async () => {
    if (!trocando) return;
    setSalvando(true);
    const falha = await servicoEquipe.trocarFuncao(trocando.membro.id, trocando.papel);
    setSalvando(false);
    setTrocando(null);
    setMensagem(
      falha
        ? { tipo: 'erro', texto: falha }
        : {
            tipo: 'sucesso',
            texto: `${trocando.membro.nome ?? 'A pessoa'} agora é ${NOME_DO_PAPEL[trocando.papel].toLowerCase()}.`,
          },
    );
    await recarregar().catch(() => setMensagem({ tipo: 'erro', texto: 'Não foi possível atualizar a lista.' }));
  };

  const mostrarCarregando = useCarregamentoCompleto(membros === undefined && !erro, 0);
  if (erro && membros === undefined) {
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar a equipe.' }} />;
  }
  if (mostrarCarregando || membros === undefined) return <Carregando texto="Carregando a equipe" />;

  return (
    <>
      <Aviso mensagem={mensagem} />
      <Cartao
        titulo={`Membros e funções · ${membros.length} pessoa${membros.length === 1 ? '' : 's'}`}
        descricao="A função define o que cada pessoa acessa. Só o(a) líder discente tem todas as personas (o “Ver como”) e troca a própria função."
      >
        {!membros.length ? (
          <Vazio>Ninguém na equipe ainda.</Vazio>
        ) : (
          <ul className="divide-y divide-gray-100">
            {membros.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar foto={m.foto} nome={m.nome ?? ''} tamanho="md" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate ${texto.destaque}`}>
                    {m.nome ?? 'Sem nome'}
                    {m.id === meuId ? <span className="text-gray-500"> (você)</span> : null}
                  </p>
                  <p className={`truncate ${texto.apoio}`}>{m.email}</p>
                </div>
                {m.todasAsPersonas ? (
                  <span className={`${selo.base} ${selo.marca}`}>Líder discente</span>
                ) : (
                  <div className="w-full sm:w-52">
                    <label htmlFor={`funcao-${m.id}`} className="sr-only">
                      Função de {m.nome}
                    </label>
                    <select
                      id={`funcao-${m.id}`}
                      value={m.papel}
                      onChange={(e) => setTrocando({ membro: m, papel: e.target.value as Papel })}
                      className={classeCampo}
                    >
                      {FUNCOES_DA_EQUIPE.map((p) => (
                        <option key={p} value={p}>
                          {NOME_DO_PAPEL[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <JanelaDeConfirmacao
        titulo="Trocar a função?"
        aberta={trocando !== null}
        aoFechar={fecharTroca}
        aoConfirmar={confirmarTroca}
        ocupado={salvando}
        rotuloConfirmar="Trocar"
        rotuloOcupado="Trocando…"
        rotuloVoltar="Voltar"
      >
        <strong>{trocando?.membro.nome}</strong> passa de{' '}
        <strong>{trocando ? NOME_DO_PAPEL[trocando.membro.papel] : ''}</strong> para{' '}
        <strong>{trocando ? NOME_DO_PAPEL[trocando.papel] : ''}</strong>. O acesso muda na próxima vez que a pessoa
        abrir o portal.
      </JanelaDeConfirmacao>
    </>
  );
};

export default Membros;
