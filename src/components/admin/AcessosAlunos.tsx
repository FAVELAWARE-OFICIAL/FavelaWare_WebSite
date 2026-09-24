/**
 * ============================================
 * ACESSOS DOS ALUNOS (em lote e na ficha do aluno)
 * ============================================
 *
 * - <AcessosDaTurma>: dentro de uma <Janela>, cria o acesso de todos os alunos
 *   de uma turma que ainda não têm, com a senha padrão digitada pelo gestor.
 * - <AcessoDoAluno>: bloco da ficha do aluno com o login, a situação e o botão
 *   de criar acesso ou redefinir a senha.
 *
 * A senha padrão não fica guardada em lugar nenhum: o gestor passa aos alunos,
 * e cada um é obrigado a trocar no primeiro acesso.
 */
import { useState } from 'react';

import { Aviso, Botao, classeCampo, classeRotulo, type Mensagem } from './Ui';
import { espaco, selo, texto } from './designSystem';
import type { Participante, Turma } from '../../lib/dashboard';
import { gerenciarAcessos, ROTULO_ACESSO, type ResultadoDosAcessos, type SituacaoDoAcesso } from '../../lib/acessos';

const TAMANHO_MINIMO = 8;

const ESTILO_SELO: Record<SituacaoDoAcesso, string> = {
  'sem-acesso': selo.neutro,
  'primeiro-acesso': selo.atencao,
  ativo: selo.sucesso,
};

/** Selo com a situação do acesso (usado na lista de alunos) */
export const SeloAcesso: React.FC<{ situacao: SituacaoDoAcesso }> = ({ situacao }) => (
  <span className={`${selo.base} ${ESTILO_SELO[situacao]}`}>{ROTULO_ACESSO[situacao]}</span>
);

/** Campo da senha padrão (texto visível: o gestor precisa conferir o que vai passar aos alunos) */
const CampoSenha: React.FC<{ id: string; valor: string; aoMudar: (v: string) => void }> = ({ id, valor, aoMudar }) => (
  <div>
    <label htmlFor={id} className={classeRotulo}>Senha padrão *</label>
    <input
      id={id}
      type="text"
      autoComplete="off"
      spellCheck={false}
      minLength={TAMANHO_MINIMO}
      maxLength={72}
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      className={classeCampo}
      placeholder="Ex: Favela#2026turmaA"
    />
    <p className={`mt-1 ${texto.apoio}`}>
      Mínimo de {TAMANHO_MINIMO} caracteres. Evite senhas óbvias: quem souber o login e a senha padrão entra antes do aluno.
    </p>
  </div>
);

const ResumoDoResultado: React.FC<{ resultado: ResultadoDosAcessos }> = ({ resultado }) => (
  <div className="space-y-2">
    <Aviso
      className=""
      mensagem={{
        tipo: resultado.criados + resultado.redefinidos > 0 ? 'sucesso' : 'erro',
        texto:
          resultado.redefinidos > 0
            ? `Senha redefinida. No próximo acesso o aluno troca a senha de novo.`
            : `${resultado.criados} acesso(s) criado(s).`,
      }}
    />
    {resultado.ignorados.length > 0 && (
      <ul className={`list-disc pl-5 ${texto.corpo}`}>
        {resultado.ignorados.map((i) => <li key={i.nome}><strong>{i.nome}</strong>: {i.motivo}</li>)}
      </ul>
    )}
  </div>
);

// ============================================
// EM LOTE (uma turma)
// ============================================
export const AcessosDaTurma: React.FC<{
  turmas: Turma[];
  alunos: Participante[];
  acessos: Record<number, SituacaoDoAcesso>;
  onConcluir: () => Promise<void>;
}> = ({ turmas, alunos, acessos, onConcluir }) => {
  const [turmaId, setTurmaId] = useState(String(turmas[0]?.id ?? ''));
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [resultado, setResultado] = useState<ResultadoDosAcessos | null>(null);

  const daTurma = alunos.filter((a) => a.funcao === 'aluno' && String(a.turma_id) === turmaId);
  const situacao = (id: number): SituacaoDoAcesso => acessos[id] ?? 'sem-acesso';
  const semAcesso = daTurma.filter((a) => situacao(a.id) === 'sem-acesso');
  const contar = (s: SituacaoDoAcesso) => daTurma.filter((a) => situacao(a.id) === s).length;

  const criar = async () => {
    setMensagem(null);
    setResultado(null);
    if (senha.length < TAMANHO_MINIMO) return setMensagem({ tipo: 'erro', texto: `A senha padrão precisa ter pelo menos ${TAMANHO_MINIMO} caracteres.` });
    setEnviando(true);
    const { resultado: r, erro } = await gerenciarAcessos('criar', semAcesso.map((a) => a.id), senha);
    setEnviando(false);
    if (erro) return setMensagem({ tipo: 'erro', texto: erro });
    setResultado(r!);
    await onConcluir();
  };

  return (
    <div className={espaco.formulario}>
      <p className={texto.corpo}>
        O aluno entra com o <strong>login</strong> (ex.: <code>maria.silva</code>) e a senha padrão. No primeiro acesso ele
        troca a senha e informa data de nascimento e e-mail.
      </p>

      <div>
        <label htmlFor="acessos-turma" className={classeRotulo}>Turma</label>
        <select id="acessos-turma" value={turmaId} onChange={(e) => { setTurmaId(e.target.value); setResultado(null); }} className={classeCampo}>
          {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['sem-acesso', 'primeiro-acesso', 'ativo'] as SituacaoDoAcesso[]).map((s) => (
          <span key={s} className={`${selo.base} ${ESTILO_SELO[s]}`}>{contar(s)} · {ROTULO_ACESSO[s]}</span>
        ))}
      </div>

      {semAcesso.length === 0 ? (
        <p className={texto.apoio}>Todos os alunos desta turma já têm acesso.</p>
      ) : (
        <>
          <CampoSenha id="acessos-senha" valor={senha} aoMudar={setSenha} />
          <Aviso mensagem={mensagem} className="" />
          <Botao variante="primario" className="w-full" disabled={enviando} onClick={criar}>
            {enviando ? 'Criando acessos...' : `Criar acesso para ${semAcesso.length} aluno(s)`}
          </Botao>
        </>
      )}
      {resultado && <ResumoDoResultado resultado={resultado} />}
    </div>
  );
};

// ============================================
// NA FICHA DO ALUNO
// ============================================
export const AcessoDoAluno: React.FC<{
  aluno: Participante;
  situacao: SituacaoDoAcesso;
  onConcluir: () => Promise<void>;
}> = ({ aluno, situacao, onConcluir }) => {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [resultado, setResultado] = useState<ResultadoDosAcessos | null>(null);
  const acao = situacao === 'sem-acesso' ? 'criar' : 'redefinir';

  const confirmar = async () => {
    setMensagem(null);
    if (senha.length < TAMANHO_MINIMO) return setMensagem({ tipo: 'erro', texto: `A senha padrão precisa ter pelo menos ${TAMANHO_MINIMO} caracteres.` });
    setEnviando(true);
    const { resultado: r, erro } = await gerenciarAcessos(acao, [aluno.id], senha);
    setEnviando(false);
    if (erro) return setMensagem({ tipo: 'erro', texto: erro });
    setResultado(r!);
    setAberto(false);
    await onConcluir();
  };

  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={texto.titulo}>Acesso ao sistema</h3>
          <p className={texto.apoio}>Login: <code>{aluno.login ?? 'gerado do nome ao criar o acesso'}</code></p>
        </div>
        <SeloAcesso situacao={situacao} />
      </div>

      {resultado && <div className="mt-3"><ResumoDoResultado resultado={resultado} /></div>}

      {aberto ? (
        <div className={`mt-3 ${espaco.formulario}`}>
          <CampoSenha id={`senha-${aluno.id}`} valor={senha} aoMudar={setSenha} />
          <Aviso mensagem={mensagem} className="" />
          <div className="flex justify-end gap-2">
            <Botao onClick={() => setAberto(false)}>Cancelar</Botao>
            <Botao variante="primario" disabled={enviando} onClick={confirmar}>
              {enviando ? 'Salvando...' : acao === 'criar' ? 'Criar acesso' : 'Redefinir senha'}
            </Botao>
          </div>
        </div>
      ) : (
        <Botao tamanho="pequeno" className="mt-3" onClick={() => { setResultado(null); setAberto(true); }}>
          {acao === 'criar' ? 'Criar acesso' : 'Redefinir senha'}
        </Botao>
      )}
    </section>
  );
};
