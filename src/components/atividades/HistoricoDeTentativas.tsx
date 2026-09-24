/**
 * ============================================
 * HISTÓRICO DE UMA ENTREGA
 * ============================================
 *
 * Linha do tempo das tentativas de um aluno numa atividade (modelo "Entrega:
 * Exercício"): o envio do aluno com data e hora e, abaixo, a resposta do
 * professor. No fim, a situação: concluída com a nota, refazer ou aguardando.
 *
 * Usado pelo aluno e pela equipe. Todo texto é mostrado como texto (nunca HTML).
 */
import { useState } from 'react';

import { foco, texto } from '../admin/designSystem';
import type { Tentativa } from '../../lib/atividades';
import { servicoEntregas } from '../../lib/entregas';
import { formatarDataHora } from '../../utils/datas';

const Avatar: React.FC<{ nome: string; tom: 'aluno' | 'professor' }> = ({ nome, tom }) => {
  const iniciais =
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?';
  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        tom === 'aluno' ? 'bg-blue-100 text-favela-blue-700' : 'bg-favela-green-500 text-[#2d2a5f]'
      }`}
    >
      {iniciais}
    </span>
  );
};

const BotaoArquivo: React.FC<{ tentativa: Tentativa; nome: string }> = ({ tentativa, nome }) => {
  const [estado, setEstado] = useState<'parado' | 'abrindo' | 'erro'>('parado');
  const baixar = async () => {
    setEstado('abrindo');
    try {
      // Baixa por aqui e salva com o nome certo: se o servidor ou o Drive falhar,
      // o erro aparece no botão, sem tirar a pessoa do portal
      const r = await fetch(await servicoEntregas.linkDoArquivo(tentativa));
      if (!r.ok) throw new Error(`download ${r.status}`);
      const endereco = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = endereco;
      a.download = nome;
      a.click();
      setTimeout(() => URL.revokeObjectURL(endereco), 10000);
      setEstado('parado');
    } catch (e) {
      console.error('[atividades] falha ao gerar o link do arquivo', e);
      setEstado('erro');
    }
  };
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={baixar}
        disabled={estado === 'abrindo'}
        className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-wait ${foco}`}
      >
        <span aria-hidden="true">📎</span>
        <span className="max-w-[16rem] truncate">{nome}</span>
        {estado === 'abrindo' && <span className={texto.apoio}>abrindo…</span>}
      </button>
      {estado === 'erro' && (
        <span role="alert" className="text-xs text-red-700">
          Não foi possível baixar. Tente de novo.
        </span>
      )}
    </span>
  );
};

const HistoricoDeTentativas: React.FC<{ tentativas: Tentativa[]; nomeDoAluno: string }> = ({
  tentativas,
  nomeDoAluno,
}) => {
  if (!tentativas.length) return null;
  const ultima = tentativas[tentativas.length - 1]!;

  return (
    <div>
      <ol className="space-y-6">
        {tentativas.map((t) => (
          <li key={t.id} className="border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
            <p className={`mb-3 ${texto.rotuloMaiusculo}`}>{t.numero}ª tentativa</p>

            {/* Envio do aluno */}
            <div className="flex gap-3">
              <Avatar nome={nomeDoAluno} tom="aluno" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-gray-900">{nomeDoAluno}</span>
                  <span className={`ml-2 ${texto.apoio}`}>• {formatarDataHora(t.enviada_em)}</span>
                </p>
                <div className="mt-2 space-y-2">
                  {t.link && (
                    <a
                      href={t.link}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className={`block break-all text-sm font-medium text-favela-blue-600 underline hover:text-favela-blue-700 ${foco}`}
                    >
                      {t.link}
                    </a>
                  )}
                  {t.comentario && <p className={`whitespace-pre-wrap break-words ${texto.corpo}`}>{t.comentario}</p>}
                  {t.arquivo_id && t.arquivo && <BotaoArquivo tentativa={t} nome={t.arquivo.nome} />}
                  {t.arquivo_caminho && t.arquivo_nome && <BotaoArquivo tentativa={t} nome={t.arquivo_nome} />}
                </div>
              </div>
            </div>

            {/* Resposta do instrutor */}
            {t.status !== 'aguardando' && t.feedback && (
              <div className="ml-4 mt-4 flex gap-3 border-l-2 border-gray-200 pl-4">
                <Avatar nome={t.avaliada_por_nome ?? 'Instrutor'} tom="professor" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-900">{t.avaliada_por_nome ?? 'Instrutor'}</span>
                    {t.avaliada_em && (
                      <span className={`ml-2 ${texto.apoio}`}>• {formatarDataHora(t.avaliada_em)}</span>
                    )}
                  </p>
                  <p className={`mt-2 whitespace-pre-wrap break-words ${texto.corpo}`}>{t.feedback}</p>
                  {t.status === 'refazer' && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      Pediu para refazer{t.nota !== null ? ` · nota ${t.nota} / 100` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {/* Situação final */}
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-gray-100 pt-5">
        {ultima.status === 'concluida' ? (
          <>
            <p className="flex items-center gap-3 text-sm font-semibold text-gray-900">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-favela-green-500 text-[#2d2a5f]"
              >
                ✓
              </span>
              Tarefa concluída com sucesso!
            </p>
            <span className="rounded-lg bg-favela-green-500 px-3 py-1.5 text-base font-bold text-[#2d2a5f] tabular-nums">
              {ultima.nota} / 100
            </span>
          </>
        ) : ultima.status === 'refazer' ? (
          <p className="text-sm font-semibold text-amber-800">
            Refaça e envie de novo ({ultima.numero + 1}ª tentativa).
          </p>
        ) : (
          <p className="text-sm font-semibold text-gray-700">Aguardando correção do instrutor.</p>
        )}
      </div>
    </div>
  );
};

export default HistoricoDeTentativas;
