/** Entregas de uma atividade: cada aluno da turma, a situação e o botão de corrigir */
import { Botao, Vazio } from '../admin/Ui';
import { selo, texto } from '../admin/designSystem';
import { situacaoDoAluno, tentativasDe, type AlunoDaTurma, type Atividade, type Situacao } from '../../lib/atividades';

const SITUACAO_NA_EQUIPE: Record<Situacao, { rotulo: string; cor: string }> = {
  pendente: { rotulo: 'Sem entrega', cor: selo.neutro },
  encerrada: { rotulo: 'Não entregou', cor: selo.erro },
  aguardando: { rotulo: 'Aguardando', cor: selo.informacao },
  refazer: { rotulo: 'Refazendo', cor: selo.atencao },
  concluida: { rotulo: 'Concluída', cor: selo.sucesso },
};

const ListaDeEntregas: React.FC<{
  atividade: Atividade;
  alunos: AlunoDaTurma[];
  aoCorrigir: (aluno: AlunoDaTurma) => void;
}> = ({ atividade, alunos, aoCorrigir }) => (
  <div className="space-y-4">
    <p className={`whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 ${texto.corpo}`}>{atividade.enunciado}</p>
    {!alunos.length ? (
      <Vazio>Nenhum aluno nesta turma.</Vazio>
    ) : (
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {alunos.map((aluno) => {
          const tentativas = tentativasDe(atividade, aluno.id);
          const situacao = situacaoDoAluno(tentativas, atividade.prazo);
          const ultima = tentativas[tentativas.length - 1];
          const estilo = SITUACAO_NA_EQUIPE[situacao];
          return (
            <li key={aluno.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className={texto.destaque}>{aluno.nome}</span>
              <span className="flex items-center gap-2">
                {ultima && <span className={texto.apoio}>{ultima.numero}ª tentativa</span>}
                {situacao === 'concluida' && ultima?.nota != null && (
                  <span className={`${texto.destaque} tabular-nums`}>{ultima.nota} / 100</span>
                )}
                <span className={`${selo.base} ${estilo.cor}`}>{estilo.rotulo}</span>
                {ultima && (
                  <Botao
                    tamanho="pequeno"
                    variante={ultima.status === 'aguardando' ? 'primario' : 'secundario'}
                    onClick={() => aoCorrigir(aluno)}
                  >
                    {ultima.status === 'aguardando' ? 'Corrigir' : 'Ver entrega'}
                  </Botao>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

export default ListaDeEntregas;
