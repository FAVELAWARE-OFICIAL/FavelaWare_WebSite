/**
 * ============================================
 * JANELA DA FALTA JUSTIFICADA (J)
 * ============================================
 *
 * Abre quando o instrutor marca J na chamada de um aluno ou no próprio ponto.
 * Pede a justificativa (obrigatória) e aceita o atestado (opcional, PDF ou foto).
 * O atestado sobe na hora para o Drive (lib/atestados.ts); a justificativa e o
 * atestado entram de fato quando a chamada ou o ponto for salvo.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  servicoAtestados,
  TAMANHO_MAXIMO_JUSTIFICATIVA,
  TIPOS_DE_ATESTADO,
  type DonoDoAtestado,
  type Justificativa,
} from '../../lib/atestados';
import { StatusProcessamento } from '../../types';
import { tamanhoLegivel } from '../../utils/arquivos';
import Carregamento, { aguardarCicloCompleto } from './Carregamento';
import Janela from './Janela';
import { Aviso, Botao, classeRotulo, classeTextoLongo, type Mensagem } from './Ui';
import { foco, texto } from './designSystem';

interface Props {
  aberta: boolean;
  /** "Maria Silva · 07/03/2026" */
  subtitulo: string;
  dono: DonoDoAtestado;
  /** O que já estava registrado (para editar) */
  inicial: Justificativa | null;
  aoConfirmar: (justificativa: Justificativa) => void;
  aoFechar: () => void;
}

const JanelaDeJustificativa: React.FC<Props> = ({ aberta, subtitulo, dono, inicial, aoConfirmar, aoFechar }) => {
  const [textoDaJustificativa, setTextoDaJustificativa] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  // Atestado já guardado antes (continua valendo se a pessoa não trocar)
  const [atestadoAnterior, setAtestadoAnterior] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  // Durante o envio a janela não fecha (Esc ou X). A função fica estável: a
  // Janela refaz o foco se ela mudar a cada render.
  const enviandoAgora = useRef(false);
  useEffect(() => {
    enviandoAgora.current = enviando;
  }, [enviando]);
  const fechar = useCallback(() => {
    if (!enviandoAgora.current) aoFechar();
  }, [aoFechar]);

  // Cada abertura começa do que já estava registrado. Só na abertura: quem usa a
  // janela pode recriar `inicial` a cada render, e isso não pode apagar o que se digita.
  const inicialNaAbertura = useRef(inicial);
  inicialNaAbertura.current = inicial;
  useEffect(() => {
    if (!aberta) return;
    setTextoDaJustificativa(inicialNaAbertura.current?.texto ?? '');
    setAtestadoAnterior(inicialNaAbertura.current?.atestadoId ?? null);
    setArquivo(null);
    setMensagem(null);
  }, [aberta]);

  const escolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const escolhido = e.target.files?.[0] ?? null;
    e.target.value = ''; // deixa escolher o mesmo arquivo de novo
    if (!escolhido) return;
    const problema = servicoAtestados.validar('ok', escolhido);
    if (problema) return setMensagem({ tipo: 'erro', texto: problema });
    setMensagem(null);
    setArquivo(escolhido);
  };

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    const problema = servicoAtestados.validar(textoDaJustificativa, arquivo);
    if (problema) return setMensagem({ tipo: 'erro', texto: problema });

    let atestadoId = atestadoAnterior;
    if (arquivo) {
      setEnviando(true);
      const envio = await servicoAtestados.enviar(dono, arquivo);
      await aguardarCicloCompleto();
      setEnviando(false);
      if (envio.resultado.status !== StatusProcessamento.Sucesso) {
        return setMensagem({ tipo: 'erro', texto: envio.resultado.mensagem! });
      }
      atestadoId = envio.atestadoId ?? null;
    }
    aoConfirmar({ texto: textoDaJustificativa.trim(), atestadoId });
  };

  const temAtestado = Boolean(arquivo || atestadoAnterior);

  return (
    <Janela titulo="Falta justificada" subtitulo={subtitulo} aberta={aberta} onFechar={fechar}>
      {enviando && <Carregamento modo="sobreposto" texto="Enviando o atestado" />}
      <form onSubmit={confirmar} className="space-y-4">
        <div>
          <label htmlFor="justificativa" className={classeRotulo}>
            Justificativa *
          </label>
          <textarea
            id="justificativa"
            rows={4}
            maxLength={TAMANHO_MAXIMO_JUSTIFICATIVA}
            value={textoDaJustificativa}
            onChange={(e) => setTextoDaJustificativa(e.target.value)}
            placeholder="Ex.: consulta médica, doença, luto, compromisso escolar…"
            className={classeTextoLongo}
            aria-describedby="justificativa-contador"
          />
          <p id="justificativa-contador" className={`mt-1 text-right ${texto.apoio}`}>
            {textoDaJustificativa.length}/{TAMANHO_MAXIMO_JUSTIFICATIVA}
          </p>
        </div>

        <div>
          <p className={classeRotulo}>Atestado (opcional)</p>
          {temAtestado ? (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xl shadow-sm"
              >
                📄
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-green-900">
                  {arquivo ? arquivo.name : 'Atestado já anexado'}
                </p>
                <p className="text-xs text-green-800">
                  {arquivo
                    ? `${tamanhoLegivel(arquivo.size)} · será enviado ao confirmar`
                    : 'Guardado no Drive do projeto'}
                </p>
              </div>
              <Botao
                tamanho="pequeno"
                variante="secundario"
                onClick={() => {
                  setArquivo(null);
                  setAtestadoAnterior(null);
                }}
              >
                Tirar
              </Botao>
            </div>
          ) : (
            <label
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center transition-colors hover:border-favela-green-500 hover:bg-favela-green-50 focus-within:border-favela-green-500 ${foco}`}
            >
              <span aria-hidden="true" className="text-2xl">
                📎
              </span>
              <span className="text-sm font-semibold text-gray-800">Anexar atestado</span>
              <span className={texto.apoio}>PDF ou foto (PNG, JPG, WebP), até 10 MB</span>
              <input type="file" accept={TIPOS_DE_ATESTADO.join(',')} onChange={escolherArquivo} className="sr-only" />
            </label>
          )}
          <p className={`mt-2 ${texto.apoio}`}>
            <span aria-hidden="true">🔒 </span>O atestado fica no Drive do projeto e só a gestão consegue abrir.
          </p>
        </div>

        <Aviso mensagem={mensagem} className="" />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao onClick={fechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Confirmar justificativa'}
          </Botao>
        </div>
      </form>
    </Janela>
  );
};

export default JanelaDeJustificativa;
