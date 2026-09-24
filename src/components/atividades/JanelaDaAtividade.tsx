/**
 * ============================================
 * JANELA DA ATIVIDADE (ÁREA DO ALUNO)
 * ============================================
 *
 * Janela no padrão "Entrega: Exercício":
 * - topo com trilha, situação e prazo (quanto falta);
 * - enunciado, histórico (envios e respostas do professor);
 * - a entrega (link, comentário e/ou arquivo), com o botão sempre à vista no rodapé.
 *
 * Conta de demonstração ("ver como aluno", sem aluno ligado): o formulário é
 * conferido igual ao do aluno, mas o envio não é gravado (o banco também não deixaria).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { IconeAlerta, IconeClipe, IconeEnviarArquivo, IconeLink, IconeRelogio } from '../admin/Icones';
import Janela from '../admin/Janela';
import { Aviso, Botao, classeCampo, classeRotulo, type Mensagem } from '../admin/Ui';
import { estado, foco, selo, texto } from '../admin/designSystem';
import HistoricoDeTentativas from './HistoricoDeTentativas';
import {
  enviarTentativa,
  formatarDataHora,
  formatosEmTexto,
  podeEnviar,
  ROTULO_SITUACAO,
  ROTULO_TIPO_LINK,
  situacaoDoAluno,
  tiposAceitos,
  type Formato,
  TAMANHO_MAXIMO_ARQUIVO,
  tentativasDe,
  validarEntrega,
  type Atividade,
  type EtapaEnvio,
  type Situacao,
} from '../../lib/atividades';

export const COR_SITUACAO: Record<Situacao, string> = {
  pendente: selo.neutro,
  aguardando: selo.informacao,
  refazer: selo.atencao,
  concluida: selo.sucesso,
  encerrada: selo.erro,
};

const LIMITE_COMENTARIO = 10000;

/**
 * "faltam 3 dias", "vence em 5 horas", "vence em menos de 1 hora", "encerrado".
 * Sempre arredonda para baixo: nunca promete mais tempo do que realmente há.
 */
function quantoFalta(prazo: string): string {
  const ms = new Date(prazo).getTime() - Date.now();
  if (ms <= 0) return 'encerrado';
  const horas = Math.floor(ms / 36e5);
  if (horas < 1) return 'vence em menos de 1 hora';
  if (horas < 24) return horas === 1 ? 'vence em 1 hora' : `vence em ${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`;
}

const tamanhoLegivel = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

// ============================================
// JANELA DA ATIVIDADE
// ============================================
interface PropsJanela {
  atividade: Atividade;
  participanteId: number;
  demonstracao: boolean;
  aoEnviar: () => Promise<void>;
  onFechar: () => void;
}

const JanelaDaAtividade: React.FC<PropsJanela> = ({ atividade, participanteId, demonstracao, aoEnviar, onFechar }) => {
  const tentativas = tentativasDe(atividade, participanteId);
  const situacao = situacaoDoAluno(tentativas, atividade.prazo);
  const envioAberto = podeEnviar(situacao);

  // Estado da entrega fica aqui: o botão de enviar mora no rodapé da janela
  const [link, setLink] = useState('');
  const [comentario, setComentario] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [etapa, setEtapa] = useState<EtapaEnvio | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [avisoDemonstracao, setAvisoDemonstracao] = useState(false);
  const [enviou, setEnviou] = useState(false);
  const tituloHistorico = useRef<HTMLHeadingElement>(null);
  const ocupado = etapa !== null;

  // Não fecha no meio do envio. Ref (e não dependência) para a função ficar estável:
  // a Janela refaz o foco quando ela muda.
  const ocupadoRef = useRef(false);
  ocupadoRef.current = ocupado;
  const fechar = useCallback(() => {
    if (!ocupadoRef.current) onFechar();
  }, [onFechar]);

  // Depois de enviar, o formulário some (a entrega fica "aguardando"): o foco vai
  // para o histórico, onde a entrega nova aparece, em vez de se perder fora da janela.
  useEffect(() => {
    if (enviou) tituloHistorico.current?.focus();
  }, [enviou]);

  // A mensagem fica no fim do formulário; o botão, no rodapé: rola até ela para ser vista
  useEffect(() => {
    if (mensagem?.tipo === 'erro' || avisoDemonstracao) {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document
        .getElementById(avisoDemonstracao ? 'aviso-demonstracao' : 'aviso-entrega')
        ?.scrollIntoView({ block: 'nearest', behavior: suave ? 'smooth' : 'auto' });
    }
  }, [mensagem, avisoDemonstracao]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    setAvisoDemonstracao(false);
    const entrega = { comentario, link, arquivo };

    if (demonstracao) {
      // Confere igual ao aluno, mas não grava nada
      const problema = validarEntrega(entrega, atividade);
      if (problema) return setMensagem({ tipo: 'erro', texto: problema });
      return setAvisoDemonstracao(true);
    }

    const erro = await enviarTentativa(atividade.id, participanteId, entrega, setEtapa, atividade);
    if (erro) {
      setEtapa(null);
      return setMensagem({ tipo: 'erro', texto: erro });
    }
    try {
      await aoEnviar(); // a janela passa a mostrar o envio no histórico
      setLink('');
      setComentario('');
      setArquivo(null);
      setMensagem({ tipo: 'sucesso', texto: 'Entrega enviada! Agora é só esperar a correção do instrutor.' });
    } catch (falha) {
      console.error('[atividades] entregue, mas falhou ao atualizar', falha);
      setMensagem({ tipo: 'sucesso', texto: 'Entrega enviada. Recarregue a página para ver o histórico.' });
    }
    setEtapa(null);
    setEnviou(true);
  };

  const numero = tentativas.length + 1;
  const temRegras = atividade.exige_texto || atividade.exige_link || atividade.exige_arquivo;
  const dicaDoLink =
    atividade.tipo_link === 'github'
      ? 'https://github.com/seu-usuario/seu-repositorio'
      : atividade.tipo_link === 'drive'
        ? 'https://drive.google.com/…'
        : 'https://github.com/… ou link do Google Drive';

  const topo = (
    <div className="flex flex-wrap items-center gap-2">
      {atividade.trilha && <span className={`${selo.base} ${selo.marca}`}>{atividade.trilha.nome}</span>}
      <span className={`${selo.base} ${COR_SITUACAO[situacao]}`}>{ROTULO_SITUACAO[situacao]}</span>
      <span className={`ml-auto flex items-center gap-1.5 ${texto.apoio}`}>
        <IconeRelogio className="h-4 w-4" />
        {formatarDataHora(atividade.prazo)}
        {situacao === 'pendente' && (
          <span className="font-semibold text-gray-700">· {quantoFalta(atividade.prazo)}</span>
        )}
      </span>
    </div>
  );

  const rodape = envioAberto ? (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className={texto.apoio}>
        {temRegras
          ? 'Os campos marcados com * são obrigatórios.'
          : 'Preencha pelo menos um: link, comentário ou arquivo.'}
      </p>
      <Botao type="submit" form="form-entrega" variante="primario" disabled={ocupado} className="sm:min-w-[11rem]">
        {ocupado && <Girando />}
        {etapa === 'arquivo'
          ? 'Enviando para o Drive…'
          : etapa === 'registro'
            ? 'Registrando…'
            : numero > 1
              ? `Enviar ${numero}ª tentativa`
              : 'Enviar entrega'}
      </Botao>
    </div>
  ) : undefined;

  return (
    <Janela titulo={atividade.titulo} aberta onFechar={fechar} larga topo={topo} rodape={rodape} focoInicial="fechar">
      <div className="space-y-6">
        {/* Confirmação do envio (o formulário já sumiu) */}
        {!envioAberto && <Aviso mensagem={mensagem} className="" />}

        {/* Enunciado */}
        <section aria-labelledby="titulo-enunciado">
          <h3 id="titulo-enunciado" className={`mb-2 ${texto.rotuloMaiusculo}`}>
            O que fazer
          </h3>
          <div className="rounded-lg border-l-4 border-favela-green-500 bg-gray-50 p-4">
            <p className={`whitespace-pre-wrap break-words leading-relaxed ${texto.corpo}`}>{atividade.enunciado}</p>
          </div>
        </section>

        {temRegras && envioAberto && (
          <section aria-labelledby="titulo-exigencias">
            <h3 id="titulo-exigencias" className={`mb-2 ${texto.rotuloMaiusculo}`}>
              O que você precisa enviar
            </h3>
            <ul className="grid gap-2 sm:grid-cols-3">
              {atividade.exige_texto && (
                <Exigencia titulo="Comentário ou resposta" detalhe="Escreva no campo de texto" />
              )}
              {atividade.exige_link && (
                <Exigencia titulo={ROTULO_TIPO_LINK[atividade.tipo_link]} detalhe={dicaDoLink} />
              )}
              {atividade.exige_arquivo && (
                <Exigencia titulo="Arquivo" detalhe={`${formatosEmTexto(atividade.formatos)}, até 10 MB`} />
              )}
            </ul>
          </section>
        )}

        {situacao === 'encerrada' && (
          <div role="status" className={`flex gap-3 rounded-lg border p-4 text-sm ${estado.atencao}`}>
            <IconeAlerta className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">O prazo terminou em {formatarDataHora(atividade.prazo)}.</p>
              <p className="mt-1">
                O envio das tarefas não está mais disponível. Se tiver alguma dúvida, fale com o seu instrutor.
              </p>
            </div>
          </div>
        )}

        {tentativas.length > 0 && (
          <section aria-labelledby="titulo-historico" className="border-t border-gray-100 pt-5">
            <h3
              id="titulo-historico"
              ref={tituloHistorico}
              tabIndex={-1}
              className={`mb-4 rounded ${texto.rotuloMaiusculo} ${foco}`}
            >
              Suas entregas
            </h3>
            <HistoricoDeTentativas tentativas={tentativas} nomeDoAluno="Você" />
          </section>
        )}

        {envioAberto && (
          <form
            id="form-entrega"
            onSubmit={enviar}
            aria-labelledby="titulo-entrega"
            className="space-y-4 border-t border-gray-100 pt-5"
          >
            <div>
              <h3 id="titulo-entrega" className={texto.titulo}>
                {numero > 1 ? `Sua ${numero}ª tentativa` : 'Sua entrega'}
              </h3>
              <p className={`mt-0.5 ${texto.apoio}`}>
                Depois de enviar, o instrutor corrige e a resposta aparece aqui.
              </p>
            </div>

            {/* Link */}
            <div>
              <label htmlFor="entrega-link" className={classeRotulo}>
                {atividade.tipo_link === 'qualquer' ? 'Link do trabalho' : ROTULO_TIPO_LINK[atividade.tipo_link]}{' '}
                <Obrigatorio sim={atividade.exige_link} />
              </label>
              <div className="relative">
                <IconeLink className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="entrega-link"
                  type="url"
                  inputMode="url"
                  placeholder={dicaDoLink}
                  value={link}
                  maxLength={2000}
                  onChange={(e) => setLink(e.target.value)}
                  disabled={ocupado}
                  aria-required={atividade.exige_link}
                  className={`${classeCampo} pl-9`}
                />
              </div>
            </div>

            {/* Comentário */}
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="entrega-texto" className={classeRotulo}>
                  Comentário ou resposta <Obrigatorio sim={atividade.exige_texto} />
                </label>
                <span className={`${texto.apoio} tabular-nums`} aria-live="polite">
                  {comentario.length > LIMITE_COMENTARIO * 0.9 ? `${comentario.length}/${LIMITE_COMENTARIO}` : ''}
                </span>
              </div>
              <textarea
                id="entrega-texto"
                rows={4}
                value={comentario}
                maxLength={LIMITE_COMENTARIO}
                aria-required={atividade.exige_texto}
                placeholder="Conte o que você fez, ou escreva a sua resposta aqui."
                onChange={(e) => setComentario(e.target.value)}
                disabled={ocupado}
                className={`${classeCampo} resize-y`}
              />
            </div>

            {/* Arquivo */}
            <CampoDeArquivo
              arquivo={arquivo}
              aoEscolher={setArquivo}
              desabilitado={ocupado}
              obrigatorio={atividade.exige_arquivo}
              formatos={atividade.formatos}
            />

            <div id="aviso-entrega">
              <Aviso mensagem={mensagem} className="" />
            </div>
            {avisoDemonstracao && (
              <p id="aviso-demonstracao" role="status" className={`rounded-lg border p-3 text-sm ${estado.atencao}`}>
                <span className="font-semibold">Conta de demonstração:</span> a entrega está certinha, mas não foi
                gravada. Para um aluno, ela iria para o instrutor corrigir.
              </p>
            )}
          </form>
        )}
      </div>
    </Janela>
  );
};

// ============================================
// CAMPO DE ARQUIVO (clique ou arraste)
// ============================================
const CampoDeArquivo: React.FC<{
  arquivo: File | null;
  aoEscolher: (f: File | null) => void;
  desabilitado: boolean;
  obrigatorio: boolean;
  formatos: Formato[];
}> = ({ arquivo, aoEscolher, desabilitado, obrigatorio, formatos }) => {
  const [arrastando, setArrastando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const [removeu, setRemoveu] = useState(false);

  // Enquanto o formulário está na tela, arquivo solto fora da área não abre no
  // navegador (o que tiraria a pessoa da página e perderia o que ela digitou)
  useEffect(() => {
    const segurar = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', segurar);
    window.addEventListener('drop', segurar);
    return () => {
      window.removeEventListener('dragover', segurar);
      window.removeEventListener('drop', segurar);
    };
  }, []);

  // Depois de "Remover", o foco volta para a escolha de arquivo (o botão sumiu)
  useEffect(() => {
    if (removeu && !arquivo) campo.current?.focus();
  }, [removeu, arquivo]);

  const soltar = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    if (!desabilitado) aoEscolher(e.dataTransfer.files?.[0] ?? null);
  };

  // Sair de um filho (texto, ícone) não é sair da área: evita o destaque piscar
  const sair = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastando(false);
  };

  return (
    <div>
      <span className={classeRotulo} id="rotulo-arquivo">
        Arquivo <Obrigatorio sim={obrigatorio} />
      </span>
      {arquivo ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-favela-green-50 text-favela-green-700">
            <IconeClipe />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate ${texto.destaque}`}>{arquivo.name}</span>
            <span className={`block ${texto.apoio}`}>{tamanhoLegivel(arquivo.size)}</span>
          </span>
          <Botao
            tamanho="pequeno"
            variante="perigo"
            disabled={desabilitado}
            aria-label={`Remover ${arquivo.name}`}
            onClick={() => {
              aoEscolher(null);
              setRemoveu(true);
            }}
          >
            Remover
          </Botao>
        </div>
      ) : (
        <label
          htmlFor="entrega-arquivo"
          onDragOver={(e) => {
            e.preventDefault();
            if (!desabilitado) setArrastando(true);
          }}
          onDragLeave={sair}
          onDrop={soltar}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-favela-green-500 ${
            arrastando
              ? 'border-favela-green-500 bg-favela-green-50'
              : 'border-gray-300 bg-white hover:border-favela-green-500 hover:bg-gray-50'
          }`}
        >
          <IconeEnviarArquivo className="h-7 w-7 text-favela-green-600" />
          <span className={texto.destaque}>
            Arraste o arquivo aqui ou <span className="text-favela-green-700 underline">escolha no computador</span>
          </span>
          <span id="dica-arquivo" className={texto.apoio}>
            {formatosEmTexto(formatos)} · até {TAMANHO_MAXIMO_ARQUIVO / 1024 / 1024} MB
          </span>
          <input
            id="entrega-arquivo"
            ref={campo}
            type="file"
            accept={tiposAceitos(formatos).join(',')}
            disabled={desabilitado}
            aria-labelledby="rotulo-arquivo"
            aria-describedby="dica-arquivo"
            aria-required={obrigatorio}
            className="sr-only"
            onChange={(e) => aoEscolher(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
};

/** "*" nos campos obrigatórios; "(opcional)" nos outros */
const Obrigatorio: React.FC<{ sim: boolean }> = ({ sim }) =>
  sim ? (
    <>
      <span className="text-red-600" aria-hidden="true">
        *
      </span>
      <span className="sr-only">(obrigatório)</span>
    </>
  ) : (
    <span className="font-normal">(opcional)</span>
  );

/** Um item de "O que você precisa enviar" */
const Exigencia: React.FC<{ titulo: string; detalhe: string }> = ({ titulo, detalhe }) => (
  <li className="flex items-start gap-2 rounded-lg border border-favela-green-500/40 bg-favela-green-50 px-3 py-2">
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-favela-green-500 text-[11px] font-bold text-[#2d2a5f]"
    >
      ✓
    </span>
    <span className="min-w-0">
      <span className={`block ${texto.destaque}`}>{titulo}</span>
      <span className={`block break-words ${texto.apoio}`}>{detalhe}</span>
    </span>
  </li>
);

/** Indicador de envio em andamento (dentro do botão) */
const Girando: React.FC = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export default JanelaDaAtividade;
