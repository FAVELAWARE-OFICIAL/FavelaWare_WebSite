/**
 * ============================================
 * LINHA DE AVALIAÇÃO (um aluno)
 * ============================================
 *
 * Foto, nome, selo com a soma e uma nota de 0 a 5 por critério. A mesma peça
 * na avaliação dos instrutores e na da banca; o que muda vem por props
 * (critérios, observação, botão de salvar da banca).
 */
import Avatar from './Avatar';
import CampoDeNota from './CampoDeNota';
import { selo, texto } from './designSystem';
import { notasCompletas, somaDasNotas, type Criterio } from '../../lib/avaliacoes';

interface Props<C extends string> {
  aluno: { id: number; nome: string; foto: string | null; turma?: string | null };
  criterios: Criterio<C>[];
  notas: Record<C, number | null>;
  maximo: number;
  aoMudar: (chave: C, valor: number | null) => void;
  desabilitado?: boolean;
  /** Texto a mais no selo (ex.: "salvo") */
  situacao?: string;
  /** Embaixo das notas: observação do instrutor, botão "Salvar nota" da banca */
  children?: React.ReactNode;
}

function LinhaDeAvaliacao<C extends string>({
  aluno,
  criterios,
  notas,
  maximo,
  aoMudar,
  desabilitado,
  situacao,
  children,
}: Props<C>) {
  const chaves = criterios.map((c) => c.chave);
  const completa = notasCompletas(notas, chaves);
  return (
    <li className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar foto={aluno.foto} nome={aluno.nome} tamanho="md" />
        <div className="min-w-0 flex-1">
          <p className={texto.destaque}>{aluno.nome}</p>
          {aluno.turma && <p className={texto.apoio}>{aluno.turma}</p>}
        </div>
        <span className={`${selo.base} ${completa ? selo.marca : selo.neutro} tabular-nums`}>
          Soma {somaDasNotas(notas, chaves)}/{chaves.length * maximo}
          {situacao ? ` · ${situacao}` : ''}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {criterios.map((c) => (
          <div key={c.chave} className="flex flex-col gap-2 rounded-lg bg-white p-2">
            <span className="min-w-0 text-xs">
              <span className="block font-medium text-gray-800">{c.rotulo}</span>
              {c.detalhe && <span className="block text-gray-500">{c.detalhe}</span>}
            </span>
            <CampoDeNota
              id={`nota-${aluno.id}-${c.chave}`}
              rotulo={`${c.rotulo} de ${aluno.nome}`}
              valor={notas[c.chave]}
              maximo={maximo}
              aoMudar={(v) => aoMudar(c.chave, v)}
              desabilitado={desabilitado}
            />
          </div>
        ))}
      </div>
      {children}
    </li>
  );
}

export default LinhaDeAvaliacao;
