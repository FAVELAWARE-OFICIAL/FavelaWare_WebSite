/**
 * ============================================
 * FORMULÁRIOS DA EQUIPE (ATIVIDADES)
 * ============================================
 *
 * Usados pelo professor e pelo gestor na página de trilhas:
 * - FormularioDeAtividade: publicar ou editar (título, enunciado, trilha, prazo e o
 *   que o aluno precisa enviar: comentário, link de um tipo, arquivo de certos formatos);
 * - Corrigir: histórico da entrega + feedback, nota (0 a 100) e Concluída/Refazer.
 * As regras (quem pode, prazo, só a última tentativa) ficam no banco.
 */
import { useEffect, useState } from 'react';

import { Aviso, Botao, Vazio, classeCampo, classeTextoLongo, classeRotulo, type Mensagem } from '../admin/Ui';
import { espaco, foco, texto } from '../admin/designSystem';
import HistoricoDeTentativas from './HistoricoDeTentativas';
import { servicoAtividades, tentativasDe, type AlunoDaTurma, type Atividade } from '../../lib/atividades';
import {
  FORMATOS,
  ROTULO_TIPO_LINK,
  SEM_REGRAS,
  type Formato,
  type RegrasDeEntrega,
  type TipoLink,
} from '../../lib/entregas';
import { useDadosEmCache } from '../../hooks/useDadosEmCache';
import { CHAVE_MATERIAL, servicoMaterial } from '../../lib/material';
import { deCampoDataHora, paraCampoDataHora } from '../../utils/datas';

// ============ CRIAR / EDITAR ============
export const FormularioDeAtividade: React.FC<{
  turmaId: number;
  atividade: Atividade | null;
  /** Atividade nova já começa nesta trilha (a do cartão onde se clicou) */
  trilhaInicial?: number;
  aoSalvar: (mensagem: string) => Promise<void>;
}> = ({ turmaId, atividade, trilhaInicial, aoSalvar }) => {
  const { dados: trilhas, erro } = useDadosEmCache(CHAVE_MATERIAL, () => servicoMaterial.carregarTrilhas());
  const [campos, setCampos] = useState({
    trilhaId: atividade?.trilha_id ?? trilhaInicial ?? 0,
    titulo: atividade?.titulo ?? '',
    enunciado: atividade?.enunciado ?? '',
    prazo: atividade ? paraCampoDataHora(atividade.prazo) : '',
  });
  const [regras, setRegras] = useState<RegrasDeEntrega>(() =>
    atividade
      ? {
          exige_texto: atividade.exige_texto,
          exige_link: atividade.exige_link,
          tipo_link: atividade.tipo_link,
          exige_arquivo: atividade.exige_arquivo,
          formatos: atividade.formatos,
        }
      : SEM_REGRAS,
  );
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  // Atividade nova começa na primeira trilha
  useEffect(() => {
    if (!campos.trilhaId && trilhas?.length) setCampos((c) => ({ ...c, trilhaId: trilhas[0]!.id }));
  }, [trilhas, campos.trilhaId]);

  if (erro && trilhas === undefined)
    return <Aviso mensagem={{ tipo: 'erro', texto: 'Não foi possível carregar as trilhas.' }} className="" />;
  if (trilhas === undefined) return <p className={texto.corpo}>Carregando as trilhas…</p>;
  if (!trilhas.length) return <Vazio>Crie uma trilha antes de publicar atividades.</Vazio>;

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    if (!campos.prazo) return setMensagem({ tipo: 'erro', texto: 'Escolha o prazo.' });
    setSalvando(true);
    const falha = await servicoAtividades.salvar(
      {
        trilha_id: campos.trilhaId,
        titulo: campos.titulo,
        enunciado: campos.enunciado,
        prazo: deCampoDataHora(campos.prazo),
        ...regras,
      },
      atividade ? { id: atividade.id } : { turmaId },
    );
    if (falha) {
      setSalvando(false);
      return setMensagem({ tipo: 'erro', texto: falha });
    }
    await aoSalvar(atividade ? 'Atividade atualizada.' : 'Atividade publicada para a turma.');
  };

  return (
    <form onSubmit={salvar} className={espaco.formulario}>
      <div>
        <label htmlFor="atividade-trilha" className={classeRotulo}>
          Trilha
        </label>
        <select
          id="atividade-trilha"
          value={campos.trilhaId}
          disabled={salvando}
          className={classeCampo}
          onChange={(e) => setCampos((c) => ({ ...c, trilhaId: Number(e.target.value) }))}
        >
          {trilhas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="atividade-titulo" className={classeRotulo}>
          Título
        </label>
        <input
          id="atividade-titulo"
          required
          maxLength={120}
          placeholder="Ex: Exercício Módulo 2"
          value={campos.titulo}
          disabled={salvando}
          className={classeCampo}
          onChange={(e) => setCampos((c) => ({ ...c, titulo: e.target.value }))}
        />
      </div>
      <div>
        <label htmlFor="atividade-enunciado" className={classeRotulo}>
          Enunciado
        </label>
        <textarea
          id="atividade-enunciado"
          required
          rows={6}
          maxLength={10000}
          value={campos.enunciado}
          disabled={salvando}
          placeholder="O que o aluno precisa fazer e entregar"
          className={classeTextoLongo}
          onChange={(e) => setCampos((c) => ({ ...c, enunciado: e.target.value }))}
        />
      </div>
      <div>
        <label htmlFor="atividade-prazo" className={classeRotulo}>
          Prazo (horário de Brasília)
        </label>
        <input
          id="atividade-prazo"
          type="datetime-local"
          required
          value={campos.prazo}
          disabled={salvando}
          className={classeCampo}
          onChange={(e) => setCampos((c) => ({ ...c, prazo: e.target.value }))}
        />
        <p className={`mt-1 ${texto.apoio}`}>
          Depois do prazo, o envio fecha. Quem receber "Refazer" ainda pode reenviar.
        </p>
      </div>
      <RegrasDaEntrega regras={regras} aoMudar={setRegras} desabilitado={salvando} />
      <Aviso mensagem={mensagem} className="" />
      <Botao type="submit" variante="primario" disabled={salvando}>
        {salvando ? 'Salvando…' : atividade ? 'Salvar alterações' : 'Publicar atividade'}
      </Botao>
    </form>
  );
};

// ============ O QUE O ALUNO PRECISA ENVIAR ============
const Chave: React.FC<{
  id: string;
  ligada: boolean;
  aoMudar: (v: boolean) => void;
  desabilitado: boolean;
  rotulo: string;
  apoio: string;
}> = ({ id, ligada, aoMudar, desabilitado, rotulo, apoio }) => (
  <div className="flex items-start justify-between gap-4">
    <span>
      <label htmlFor={id} className={`block ${texto.destaque}`}>
        {rotulo}
      </label>
      <span id={`${id}-apoio`} className={`block ${texto.apoio}`}>
        {apoio}
      </span>
    </span>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-describedby={`${id}-apoio`}
      disabled={desabilitado}
      onClick={() => aoMudar(!ligada)}
      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${foco} ${
        ligada ? 'bg-favela-green-600' : 'bg-gray-400'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${ligada ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  </div>
);

const RegrasDaEntrega: React.FC<{
  regras: RegrasDeEntrega;
  aoMudar: (r: RegrasDeEntrega) => void;
  desabilitado: boolean;
}> = ({ regras, aoMudar, desabilitado }) => {
  const mudar = (parte: Partial<RegrasDeEntrega>) => aoMudar({ ...regras, ...parte });
  const alternarFormato = (f: Formato) =>
    mudar({ formatos: regras.formatos.includes(f) ? regras.formatos.filter((x) => x !== f) : [...regras.formatos, f] });

  return (
    <fieldset className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">O que o aluno precisa enviar</legend>
      <p className={`mb-4 ${texto.apoio}`}>
        Ligue o que é obrigatório. Sem nada ligado, o aluno escolhe: link, comentário ou arquivo.
      </p>
      <div className="space-y-5">
        <Chave
          id="regra-texto"
          rotulo="Comentário ou resposta"
          apoio="Um texto escrito pelo aluno."
          ligada={regras.exige_texto}
          aoMudar={(v) => mudar({ exige_texto: v })}
          desabilitado={desabilitado}
        />

        <div className="space-y-2">
          <Chave
            id="regra-link"
            rotulo="Link"
            apoio="Repositório, documento ou site publicado."
            ligada={regras.exige_link}
            aoMudar={(v) => mudar({ exige_link: v })}
            desabilitado={desabilitado}
          />
          <div className="sm:max-w-xs">
            <label htmlFor="regra-tipo-link" className={classeRotulo}>
              Tipo de link aceito
            </label>
            <select
              id="regra-tipo-link"
              value={regras.tipo_link}
              disabled={desabilitado}
              className={classeCampo}
              onChange={(e) => mudar({ tipo_link: e.target.value as TipoLink })}
            >
              {(Object.keys(ROTULO_TIPO_LINK) as TipoLink[]).map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO_LINK[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Chave
            id="regra-arquivo"
            rotulo="Arquivo"
            apoio="Enviado pelo portal (vai para o Google Drive), até 10 MB."
            ligada={regras.exige_arquivo}
            aoMudar={(v) => mudar({ exige_arquivo: v })}
            desabilitado={desabilitado}
          />
          <div>
            <p id="regra-formatos" className={classeRotulo}>
              Formatos aceitos
            </p>
            <div role="group" aria-labelledby="regra-formatos" className="flex flex-wrap gap-2">
              {(Object.keys(FORMATOS) as Formato[]).map((f) => {
                const marcado = regras.formatos.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={marcado}
                    disabled={desabilitado}
                    onClick={() => alternarFormato(f)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${foco} ${
                      marcado
                        ? 'border-favela-green-600 bg-favela-green-50 text-favela-green-800'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {marcado ? '✓ ' : ''}
                    {FORMATOS[f].rotulo}
                  </button>
                );
              })}
            </div>
            <p className={`mt-1 ${texto.apoio}`}>
              {regras.formatos.length
                ? 'Só os formatos marcados serão aceitos.'
                : 'Nenhum marcado: qualquer formato aceito pelo portal.'}
            </p>
          </div>
        </div>
      </div>
    </fieldset>
  );
};

// ============ CORRIGIR ============
export const Corrigir: React.FC<{ atividade: Atividade; aluno: AlunoDaTurma; aoSalvar: () => Promise<void> }> = ({
  atividade,
  aluno,
  aoSalvar,
}) => {
  const tentativas = tentativasDe(atividade, aluno.id);
  const ultima = tentativas[tentativas.length - 1];
  const [feedback, setFeedback] = useState(ultima?.status !== 'aguardando' ? (ultima?.feedback ?? '') : '');
  const [nota, setNota] = useState(ultima?.nota != null ? String(ultima.nota) : '');
  const [salvando, setSalvando] = useState<'concluida' | 'refazer' | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  if (!ultima) return <Vazio>Este aluno ainda não entregou.</Vazio>;

  const responder = async (status: 'concluida' | 'refazer') => {
    setMensagem(null);
    setSalvando(status);
    const falha = await servicoAtividades.avaliar(ultima.id, { status, feedback, notaDigitada: nota });
    if (falha) {
      setSalvando(null);
      return setMensagem({ tipo: 'erro', texto: falha });
    }
    try {
      await aoSalvar();
      setMensagem({
        tipo: 'sucesso',
        texto: status === 'concluida' ? 'Entrega concluída.' : 'Pedido de refazer enviado ao aluno.',
      });
    } catch (e) {
      console.error('[atividades] corrigiu, mas falhou ao atualizar', e);
      setMensagem({ tipo: 'sucesso', texto: 'Correção salva. Recarregue a página para ver o histórico.' });
    }
    setSalvando(null);
  };

  return (
    <div className="space-y-6">
      <HistoricoDeTentativas tentativas={tentativas} nomeDoAluno={aluno.nome} />

      <div className={`border-t border-gray-100 pt-5 ${espaco.formulario}`}>
        <p className={texto.titulo}>
          {ultima.status === 'aguardando'
            ? `Responder a ${ultima.numero}ª tentativa`
            : `Alterar a resposta da ${ultima.numero}ª tentativa`}
        </p>
        <div>
          <label htmlFor="correcao-feedback" className={classeRotulo}>
            Feedback para o aluno
          </label>
          <textarea
            id="correcao-feedback"
            rows={5}
            maxLength={10000}
            value={feedback}
            disabled={salvando !== null}
            onChange={(e) => setFeedback(e.target.value)}
            className={classeTextoLongo}
          />
        </div>
        <div className="sm:max-w-[10rem]">
          <label htmlFor="correcao-nota" className={classeRotulo}>
            Nota (0 a 100)
          </label>
          <input
            id="correcao-nota"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={nota}
            disabled={salvando !== null}
            onChange={(e) => setNota(e.target.value)}
            className={classeCampo}
          />
          <p className={`mt-1 ${texto.apoio}`}>Obrigatória para concluir.</p>
        </div>
        <Aviso mensagem={mensagem} className="" />
        <div className="flex flex-wrap gap-3">
          <Botao variante="primario" disabled={salvando !== null} onClick={() => responder('concluida')}>
            {salvando === 'concluida' ? 'Salvando…' : 'Concluída'}
          </Botao>
          <Botao disabled={salvando !== null} onClick={() => responder('refazer')}>
            {salvando === 'refazer' ? 'Salvando…' : 'Pedir para refazer'}
          </Botao>
        </div>
      </div>
    </div>
  );
};
