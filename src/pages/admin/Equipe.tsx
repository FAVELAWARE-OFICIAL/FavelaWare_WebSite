/**
 * ============================================
 * ADMIN · INSTRUTORES (EQUIPE)
 * ============================================
 *
 * O gestor cadastra instrutores (eles recebem um convite por e-mail para
 * definir a senha) e escolhe em quais turmas cada um faz a chamada. As turmas
 * podem ser de edições diferentes: o mesmo instrutor participa de várias.
 * Também consulta os dados do RPA que cada instrutor preencheu.
 */
import { useEffect, useMemo, useState } from 'react';
import Avatar from '../../components/admin/Avatar';
import EscolherFoto from '../../components/admin/EscolherFoto';
import CamposDeVinculo, { type VinculoECargo } from '../../components/admin/CamposDeVinculo';

import { useCampos } from '../../hooks/useCampos';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { StatusProcessamento } from '../../types';
import { formatarDia } from '../../utils/datas';

import { useCarregamentoCompleto } from '../../components/admin/Carregamento';

import { Carregando } from '../../components/admin/Moldura';
import { Aviso, Cartao, Vazio, classeCampo, type Mensagem } from '../../components/admin/Ui';
import { CHAVE_EQUIPE, servicoEquipe, type Professor } from '../../lib/equipe';
import type { TurmaComEdicao } from '../../lib/turmas';
import { foco, selo, texto } from '../../components/admin/designSystem';
import Janela from '../../components/admin/Janela';
import { servicoDadosInstrutor, textoParaRpa, type DadosInstrutorDaEquipe } from '../../lib/dadosInstrutor';
import { FOTO_PADRAO_DE_PESSOA } from '../../data/imagens';

/**
 * Botões de turma que ligam/desligam (usados no cadastro e na lista).
 * Só turma de edição aberta recebe instrutor; um vínculo antigo com turma de
 * edição encerrada aparece marcado, e só dá para tirar. A turma de
 * demonstração não entra (é do "Ver como").
 */
const SeletorDeTurmas: React.FC<{
  turmas: TurmaComEdicao[];
  escolhidas: number[];
  aoAlternar: (turmaId: number) => void;
  desabilitado?: boolean;
}> = ({ turmas, escolhidas, aoAlternar, desabilitado }) => (
  <div className="flex flex-wrap gap-2">
    {turmas
      .filter((t) => !t.demonstracao && (!t.edicaoEncerrada || escolhidas.includes(t.id)))
      .map((t) => {
        const ativa = escolhidas.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => aoAlternar(t.id)}
            disabled={desabilitado}
            aria-pressed={ativa}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${foco} disabled:opacity-50 ${
              ativa
                ? 'border-favela-green-600 bg-favela-green-50 text-favela-green-800'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            {ativa ? '✓ ' : ''}
            {t.nome} <span className="text-gray-400">· {t.edicao}</span>
            {t.edicaoEncerrada && <span className="text-gray-400"> · encerrada</span>}
          </button>
        );
      })}
  </div>
);

const Equipe: React.FC = () => {
  // Já vem pronto do cache (o layout carrega na abertura); atualiza por trás
  const { dados, erro, recarregar: recarregarEquipe } = useDadosEmCache(CHAVE_EQUIPE, () => servicoEquipe.carregar());
  const turmas = dados?.turmas ?? [];
  const professores = dados?.professores;
  const { campos, setCampos, aoAlterarCampo } = useCampos({ nome: '', email: '', turmas: [] as number[] });
  const [vinculo, setVinculo] = useState<VinculoECargo>({ organizacao: '', cargo: '' });
  // Foto escolhida no cadastro: só sobe depois que o convite der certo (nada fica órfão)
  const [fotoNova, setFotoNova] = useState<File | null>(null);
  const previa = useMemo(() => (fotoNova ? URL.createObjectURL(fotoNova) : null), [fotoNova]);
  useEffect(() => () => void (previa && URL.revokeObjectURL(previa)), [previa]);
  const [enviando, setEnviando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null); // professor sendo alterado
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  // Dados do RPA: pessoais, então ficam só nesta tela (sem o cache das áreas).
  // A lista traz só quem preencheu; a ficha de cada um vem ao abrir a janela.
  const [preencheram, setPreencheram] = useState<Set<string> | null>(null);
  const [erroRpa, setErroRpa] = useState(false);
  const [vendoRpa, setVendoRpa] = useState<{
    id: string;
    nome: string;
    dados: DadosInstrutorDaEquipe | null;
    erro?: boolean;
  } | null>(null);
  const [copia, setCopia] = useState<'copiado' | 'falhou' | null>(null);

  useEffect(() => {
    let ativo = true;
    servicoDadosInstrutor
      .carregarQuemPreencheu()
      .then((ids) => ativo && setPreencheram(ids))
      .catch((e) => {
        console.error('[equipe] falha ao carregar os dados do RPA', e?.code);
        if (ativo) setErroRpa(true);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const abrirRpa = async (id: string, nome: string) => {
    setCopia(null);
    setVendoRpa({ id, nome, dados: null });
    try {
      const dados = await servicoDadosInstrutor.carregarDoInstrutor(id);
      setVendoRpa((atual) => (atual?.id === id ? { ...atual, dados } : atual));
    } catch (e) {
      console.error('[equipe] falha ao abrir os dados do RPA', (e as { code?: string })?.code);
      setVendoRpa((atual) => (atual?.id === id ? { ...atual, erro: true } : atual));
    }
  };

  // Sem HTTPS ou sem permissão não há área de transferência: avisa, para o
  // gestor não colar no RPA o que já estava copiado antes
  const copiarRpa = async () => {
    if (!vendoRpa?.dados) return;
    try {
      await navigator.clipboard.writeText(textoParaRpa(vendoRpa.dados));
      setCopia('copiado');
    } catch (e) {
      console.error('[equipe] falha ao copiar', (e as Error)?.name);
      setCopia('falhou');
    }
  };
  // Sem os dados: carregamento na hora (nunca tela em branco) e pintura completa
  const mostrarCarregando = useCarregamentoCompleto(dados === undefined && !erro, 0);

  const recarregar = () =>
    recarregarEquipe().catch(() => setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar a equipe.' }));

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensagem(null);
    if (!campos.nome.trim() || !campos.email.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome e o e-mail do instrutor.' });
      return;
    }
    setEnviando(true);
    const { resultado, contaId } = await servicoEquipe.convidar(campos.nome.trim(), campos.email.trim(), campos.turmas);
    if (resultado.status !== StatusProcessamento.Sucesso) {
      setEnviando(false);
      setMensagem({ tipo: 'erro', texto: resultado.mensagem! });
      return;
    }
    // O convite já saiu: o que falhar daqui para a frente vira aviso, com o caminho para refazer
    const avisos: string[] = [];
    if (fotoNova && contaId) {
      try {
        await servicoEquipe.trocarFoto(contaId, fotoNova, null);
      } catch (erro) {
        avisos.push(`A foto não foi salva (${(erro as Error).message}): use "Trocar foto" na lista.`);
      }
    }
    if (contaId && (vinculo.organizacao.trim() || vinculo.cargo.trim())) {
      const falha = await servicoEquipe.salvarVinculoECargo(contaId, vinculo);
      if (falha) avisos.push(`${falha} Preencha de novo na página Membros.`);
    }
    setEnviando(false);
    setMensagem({
      tipo: avisos.length ? 'erro' : 'sucesso',
      texto: [
        `Convite enviado para ${campos.email.trim()}. O instrutor define a senha pelo link do e-mail.`,
        ...avisos,
      ].join(' '),
    });
    setCampos({ nome: '', email: '', turmas: [] });
    setVinculo({ organizacao: '', cargo: '' });
    setFotoNova(null);
    recarregar();
  };

  /** Troca a foto de um instrutor da lista (o site recorta e põe no círculo verde) */
  const trocarFotoDe = async (professor: Professor, arquivo: File) => {
    setOcupado(professor.id);
    setMensagem(null);
    try {
      await servicoEquipe.trocarFoto(professor.id, arquivo, professor.foto);
      await recarregarEquipe();
      setMensagem({ tipo: 'sucesso', texto: `Foto de ${professor.nome ?? 'instrutor'} atualizada.` });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: (erro as Error).message || 'Não foi possível salvar a foto.' });
    } finally {
      setOcupado(null);
    }
  };

  const alternarVinculo = async (professor: Professor, turmaId: number) => {
    setOcupado(professor.id);
    setMensagem(null);
    try {
      await servicoEquipe.vincularTurma(professor.id, turmaId, !professor.turmas.includes(turmaId));
      await recarregar();
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível alterar as turmas do instrutor.' });
    } finally {
      setOcupado(null);
    }
  };

  const remover = async (professor: Professor) => {
    if (
      !window.confirm(
        `Remover ${professor.nome ?? professor.email} da equipe? Ele perde o acesso às turmas; as chamadas que já fez continuam no histórico.`,
      )
    )
      return;
    setOcupado(professor.id);
    try {
      await servicoEquipe.remover(professor.id);
      await recarregar();
      setMensagem({ tipo: 'sucesso', texto: `${professor.nome ?? professor.email} removido da equipe.` });
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível remover o instrutor.' });
    } finally {
      setOcupado(null);
    }
  };

  // Carregando: ocupa a página toda (não divide a tela com o formulário)
  if (erro && dados === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar a equipe.' }} />;
  if (mostrarCarregando || professores === undefined) return <Carregando texto="Carregando equipe" />;

  return (
    <>
      <Aviso mensagem={mensagem} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* ============ CADASTRO ============ */}
        <Cartao
          titulo="Cadastrar instrutor"
          descricao="Ele recebe um e-mail para criar a senha."
          className="xl:col-span-2"
        >
          <form onSubmit={aoEnviar} className="space-y-4">
            <div>
              <label htmlFor="nome" className={`${texto.rotulo}`}>
                Nome *
              </label>
              <input
                id="nome"
                name="nome"
                value={campos.nome}
                onChange={aoAlterarCampo}
                required
                maxLength={120}
                autoComplete="off"
                placeholder="Ex: Maria Souza"
                className={classeCampo}
              />
            </div>
            <div>
              <label htmlFor="email" className={`${texto.rotulo}`}>
                E-mail *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={campos.email}
                onChange={aoAlterarCampo}
                required
                autoComplete="off"
                placeholder="Ex: maria@email.com"
                className={classeCampo}
              />
            </div>
            <CamposDeVinculo id="convite" valor={vinculo} aoMudar={setVinculo} desabilitado={enviando} />
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-gray-600">Turmas</legend>
              <SeletorDeTurmas
                turmas={turmas}
                escolhidas={campos.turmas}
                aoAlternar={(id) =>
                  setCampos((f) => ({
                    ...f,
                    turmas: f.turmas.includes(id) ? f.turmas.filter((t) => t !== id) : [...f.turmas, id],
                  }))
                }
              />
            </fieldset>
            <div className="flex items-center gap-4">
              <img
                src={previa ?? FOTO_PADRAO_DE_PESSOA}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full bg-favela-green-500 object-cover ring-1 ring-gray-200"
              />
              <div>
                <EscolherFoto
                  variante="botao-compacto"
                  ocupado={enviando}
                  rotulo={fotoNova ? 'Trocar foto' : 'Adicionar foto'}
                  aoEscolher={setFotoNova}
                />
                <p className={`mt-1 ${texto.apoio}`}>
                  Opcional. Pode ter qualquer fundo: o site recorta e põe no círculo verde, como a equipe da página
                  Sobre.
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={enviando}
              className={`w-full rounded-lg px-5 py-2.5 text-sm font-bold transition-colors ${foco} focus-visible:ring-offset-2 ${
                enviando
                  ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                  : 'bg-favela-green-600 text-white hover:bg-favela-green-700'
              }`}
            >
              {enviando ? 'Enviando convite...' : 'Cadastrar e enviar convite'}
            </button>
          </form>
        </Cartao>

        {/* ============ LISTA ============ */}
        <div className="xl:col-span-3">
          {!professores.length ? (
            <Vazio>Nenhum instrutor cadastrado ainda.</Vazio>
          ) : (
            <Cartao titulo="Instrutores" descricao="Clique numa turma para liberar ou tirar a chamada dela.">
              <ul className="-my-3 divide-y divide-gray-100">
                {professores.map((p) => (
                  <li key={p.id} className="py-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex shrink-0 flex-col items-center gap-1">
                          <Avatar foto={p.foto} nome={p.nome ?? 'instrutor'} tamanho="lg" />
                          <EscolherFoto
                            variante="link"
                            ocupado={ocupado === p.id}
                            rotulo={ocupado === p.id ? 'Salvando…' : p.foto ? 'Trocar foto' : 'Pôr foto'}
                            rotuloAcessivel={`Foto de ${p.nome ?? 'instrutor'}`}
                            aoEscolher={(arquivo) => trocarFotoDe(p, arquivo)}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{p.nome ?? 'Sem nome'}</p>
                          <p className={`truncate ${texto.apoio}`}>{p.email}</p>
                          <div className="mt-1.5">
                            {preencheram?.has(p.id) ? (
                              <button
                                type="button"
                                onClick={() => abrirRpa(p.id, p.nome ?? p.email ?? 'Instrutor')}
                                aria-label={`Ver dados do RPA de ${p.nome ?? p.email ?? 'instrutor'}`}
                                className={`${selo.base} ${selo.sucesso} hover:underline ${foco}`}
                              >
                                ✓ Dados do RPA · ver
                              </button>
                            ) : preencheram ? (
                              <span className={`${selo.base} ${selo.atencao}`}>Dados do RPA pendentes</span>
                            ) : erroRpa ? (
                              <span className={`${selo.base} ${selo.erro}`}>Dados do RPA indisponíveis</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remover(p)}
                        disabled={ocupado === p.id}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                      >
                        Remover instrutor
                      </button>
                    </div>
                    <SeletorDeTurmas
                      turmas={turmas}
                      escolhidas={p.turmas}
                      aoAlternar={(turmaId) => alternarVinculo(p, turmaId)}
                      desabilitado={ocupado === p.id}
                    />
                  </li>
                ))}
              </ul>
            </Cartao>
          )}
        </div>
      </div>

      {/* ============ DADOS DO RPA (só leitura) ============ */}
      <Janela
        titulo={vendoRpa ? `Dados do RPA · ${vendoRpa.nome}` : ''}
        subtitulo={vendoRpa?.dados ? `Atualizado em ${formatarDia(vendoRpa.dados.atualizado_em)}` : undefined}
        aberta={vendoRpa !== null}
        onFechar={() => setVendoRpa(null)}
        focoInicial="fechar"
        rodape={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span role="status" className={copia === 'falhou' ? 'text-sm text-red-700' : texto.apoio}>
              {copia === 'copiado'
                ? 'Copiado.'
                : copia === 'falhou'
                  ? 'Não foi possível copiar; selecione o texto acima.'
                  : ''}
            </span>
            <button
              type="button"
              onClick={copiarRpa}
              disabled={!vendoRpa?.dados}
              className={`rounded-lg bg-favela-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-favela-green-700 ${foco} focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Copiar no formato do RPA
            </button>
          </div>
        }
      >
        {vendoRpa?.erro && (
          <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível abrir os dados. Tente de novo.' }} />
        )}
        {vendoRpa && !vendoRpa.dados && !vendoRpa.erro && <p className={texto.apoio}>Carregando…</p>}
        {vendoRpa?.dados && (
          <pre className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 font-sans text-sm leading-7 text-gray-800">
            {textoParaRpa(vendoRpa.dados)}
          </pre>
        )}
        {/* O banco só aceita endereço https://linkedin.com/in/...: o link é seguro de abrir */}
        {vendoRpa?.dados?.linkedin && (
          <a
            href={vendoRpa.dados.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-3 inline-block text-sm font-semibold text-favela-blue-600 underline hover:text-favela-blue-700 ${foco}`}
          >
            Abrir o LinkedIn (nova aba)
          </a>
        )}
      </Janela>
    </>
  );
};

export default Equipe;
