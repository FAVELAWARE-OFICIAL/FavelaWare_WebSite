/**
 * ============================================
 * ADMIN · EQUIPE (TODOS OS MEMBROS)
 * ============================================
 *
 * Todas as contas que não são de aluno: gestores, instrutores, parceiros e banca.
 * O gestor troca a função de cada pessoa (com confirmação) e preenche o vínculo e o
 * cargo, que saem no cartão da página Sobre e do Hall da Fama. A dona do portal tem
 * todas as personas (o "Ver como"): a função dela só ela muda, e ninguém mais
 * ganha isso. O banco confere as duas regras.
 * O gestor também adiciona (convite por e-mail já com a função) e remove
 * (apaga a conta, com o ponto, o RPA e as notas da pessoa; ver lib/equipe.ts).
 */
import { useCallback, useEffect, useState } from 'react';

import Avatar from '../../components/admin/Avatar';
import CamposDeVinculo, { type VinculoECargo } from '../../components/admin/CamposDeVinculo';
import Janela from '../../components/admin/Janela';
import { useCarregamentoCompleto } from '../../components/admin/Carregamento';
import { Carregando } from '../../components/admin/Moldura';
import {
  Aviso,
  Botao,
  Cartao,
  JanelaDeConfirmacao,
  Vazio,
  classeCampo,
  type Mensagem,
} from '../../components/admin/Ui';
import { selo, texto } from '../../components/admin/designSystem';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import {
  FUNCOES_DA_EQUIPE,
  FUNCOES_DE_NOVO_MEMBRO,
  servicoEquipe,
  type FuncaoDeNovoMembro,
  type MembroDaEquipe,
} from '../../lib/equipe';
import { NOME_DO_PAPEL, servicoSessao, type Papel } from '../../lib/sessao';
import { StatusProcessamento } from '../../types';
import { emailValido } from '../../utils/texto';

const CHAVE_MEMBROS = 'equipe:membros';

const NOVO_MEMBRO = { nome: '', email: '', papel: 'professor' as FuncaoDeNovoMembro };

const Membros: React.FC = () => {
  const { dados: membros, erro, recarregar } = useDadosEmCache(CHAVE_MEMBROS, () => servicoEquipe.listarMembros());
  const [meuId, setMeuId] = useState<string | null>(null);
  const [trocando, setTrocando] = useState<{ membro: MembroDaEquipe; papel: Papel } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const fecharTroca = useCallback(() => setTrocando(null), []);
  const [editando, setEditando] = useState<{ membro: MembroDaEquipe; valor: VinculoECargo } | null>(null);
  const [erroJanela, setErroJanela] = useState<Mensagem>(null);
  const fecharEdicao = useCallback(() => setEditando(null), []);
  const [novo, setNovo] = useState<typeof NOVO_MEMBRO | null>(null);
  const fecharNovo = useCallback(() => setNovo(null), []);
  const [removendo, setRemovendo] = useState<MembroDaEquipe | null>(null);
  const fecharRemocao = useCallback(() => setRemovendo(null), []);

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

  const abrirEdicao = (membro: MembroDaEquipe) => {
    setErroJanela(null);
    setEditando({ membro, valor: { organizacao: membro.organizacao ?? '', cargo: membro.cargo ?? '' } });
  };

  const salvarVinculo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editando) return;
    setSalvando(true);
    const falha = await servicoEquipe.salvarVinculoECargo(editando.membro.id, editando.valor);
    setSalvando(false);
    if (falha) return setErroJanela({ tipo: 'erro', texto: falha });
    setEditando(null);
    setMensagem({ tipo: 'sucesso', texto: `Vínculo e cargo de ${editando.membro.nome ?? 'a pessoa'} salvos.` });
    await recarregar().catch(() => setMensagem({ tipo: 'erro', texto: 'Não foi possível atualizar a lista.' }));
  };

  const abrirNovo = () => {
    setErroJanela(null);
    setNovo(NOVO_MEMBRO);
  };

  const adicionar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!novo) return;
    const nome = novo.nome.trim();
    const email = novo.email.trim();
    if (!nome || !emailValido(email)) {
      return setErroJanela({ tipo: 'erro', texto: 'Preencha o nome e um e-mail válido.' });
    }
    setSalvando(true);
    const { resultado, aviso } = await servicoEquipe.adicionarMembro(nome, email, novo.papel);
    setSalvando(false);
    if (resultado.status !== StatusProcessamento.Sucesso) {
      return setErroJanela({ tipo: 'erro', texto: resultado.mensagem ?? 'Não foi possível adicionar.' });
    }
    setNovo(null);
    setMensagem(
      aviso
        ? { tipo: 'erro', texto: `Convite enviado para ${email}. ${aviso}` }
        : {
            tipo: 'sucesso',
            texto: `Convite enviado para ${email} como ${NOME_DO_PAPEL[novo.papel].toLowerCase()}. A pessoa define a senha pelo link do e-mail.`,
          },
    );
    await recarregar().catch(() => setMensagem({ tipo: 'erro', texto: 'Não foi possível atualizar a lista.' }));
  };

  const confirmarRemocao = async () => {
    if (!removendo) return;
    setSalvando(true);
    try {
      await servicoEquipe.remover(removendo.id);
      setMensagem({ tipo: 'sucesso', texto: `A conta de ${removendo.nome ?? removendo.email} foi apagada.` });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: (erro as Error).message });
    } finally {
      setSalvando(false);
      setRemovendo(null);
    }
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
        acoes={
          <Botao variante="primario" tamanho="pequeno" onClick={abrirNovo}>
            Adicionar membro
          </Botao>
        }
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
                  <p className={`truncate ${texto.apoio}`}>
                    {[m.cargo, m.organizacao].filter(Boolean).join(' · ') || 'Sem cargo e vínculo'} · {m.email}
                  </p>
                </div>
                <Botao tamanho="pequeno" onClick={() => abrirEdicao(m)}>
                  Vínculo e cargo
                </Botao>
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
                {/* Ninguém se remove (perderia o acesso) e a líder discente não sai por aqui */}
                {m.id !== meuId && !m.todasAsPersonas && (
                  <Botao variante="perigo" tamanho="pequeno" onClick={() => setRemovendo(m)}>
                    Remover
                  </Botao>
                )}
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Janela
        titulo="Vínculo e cargo"
        subtitulo={editando?.membro.nome ?? undefined}
        aberta={editando !== null}
        onFechar={fecharEdicao}
      >
        {editando && (
          <form onSubmit={salvarVinculo} className="space-y-4">
            <Aviso mensagem={erroJanela} className="" />
            <CamposDeVinculo
              id="membro"
              valor={editando.valor}
              aoMudar={(valor) => setEditando({ ...editando, valor })}
              desabilitado={salvando}
            />
            <p className={texto.apoio}>
              {editando.membro.papel === 'banca'
                ? 'Quem é da banca não aparece no site: o vínculo e o cargo ficam só aqui.'
                : 'Saem no cartão da pessoa na página Sobre e, quando a edição encerra, no Hall da Fama. Coordenação e parceiros só aparecem no site com cargo.'}
            </p>
            <Botao type="submit" variante="primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Botao>
          </form>
        )}
      </Janela>

      <Janela titulo="Adicionar membro" aberta={novo !== null} onFechar={fecharNovo}>
        {novo && (
          <form onSubmit={adicionar} className="space-y-4" noValidate>
            <Aviso mensagem={erroJanela} className="" />
            <div>
              <label htmlFor="novo-nome" className={texto.rotulo}>
                Nome *
              </label>
              <input
                id="novo-nome"
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                required
                maxLength={120}
                autoComplete="off"
                placeholder="Ex: Maria Souza"
                disabled={salvando}
                className={classeCampo}
              />
            </div>
            <div>
              <label htmlFor="novo-email" className={texto.rotulo}>
                E-mail *
              </label>
              <input
                id="novo-email"
                type="email"
                value={novo.email}
                onChange={(e) => setNovo({ ...novo, email: e.target.value })}
                required
                autoComplete="off"
                placeholder="Ex: maria@email.com"
                disabled={salvando}
                className={classeCampo}
              />
            </div>
            <div>
              <label htmlFor="novo-funcao" className={texto.rotulo}>
                Função
              </label>
              <select
                id="novo-funcao"
                value={novo.papel}
                onChange={(e) => setNovo({ ...novo, papel: e.target.value as FuncaoDeNovoMembro })}
                disabled={salvando}
                className={classeCampo}
              >
                {FUNCOES_DE_NOVO_MEMBRO.map((p) => (
                  <option key={p} value={p}>
                    {NOME_DO_PAPEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <p className={texto.apoio}>
              A pessoa recebe um e-mail para criar a senha. As turmas do instrutor ficam na página Equipe; a banca entra
              pela Avaliação.
            </p>
            <Botao type="submit" variante="primario" disabled={salvando}>
              {salvando ? 'Enviando…' : 'Enviar convite'}
            </Botao>
          </form>
        )}
      </Janela>

      <JanelaDeConfirmacao
        titulo="Apagar a conta?"
        aberta={removendo !== null}
        aoFechar={fecharRemocao}
        aoConfirmar={confirmarRemocao}
        ocupado={salvando}
        variante="perigo"
        rotuloConfirmar="Remover"
        rotuloOcupado="Removendo…"
        rotuloVoltar="Voltar"
      >
        A conta de <strong>{removendo?.nome ?? removendo?.email}</strong> será apagada, junto com o ponto, os dados do
        RPA, os atestados e as notas que a pessoa deu. As chamadas ficam, sem o nome. Não dá para desfazer; o e-mail
        pode ser convidado de novo.
      </JanelaDeConfirmacao>

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
