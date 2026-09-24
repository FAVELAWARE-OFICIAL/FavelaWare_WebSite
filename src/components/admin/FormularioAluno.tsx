/**
 * ============================================
 * FORMULÁRIO DE ALUNO (CADASTRAR / EDITAR)
 * ============================================
 *
 * Usado dentro de uma <Janela> na página de alunos do gestor.
 * A foto é opcional: é reduzida no navegador antes de subir (ver gestao.ts).
 */
import { useState } from 'react';

import Avatar from './Avatar';
import { AcessoDoAluno } from './AcessosAlunos';
import type { SituacaoDoAcesso } from '../../lib/acessos';
import { Aviso, Botao, classeCampo, classeRotulo, type Mensagem } from './Ui';
import type { Participante, Turma } from '../../lib/dashboard';
import { apagarFotoAntiga, enviarFotoDoAluno, removerAluno, salvarAluno } from '../../lib/gestao';

interface Props {
  edicaoId: number;
  turmas: Turma[];
  aluno: Participante | null; // null = cadastro novo
  onConcluir: (texto: string) => void;
  /** Situação do acesso ao sistema (só na edição) */
  situacaoAcesso?: SituacaoDoAcesso;
  /** Depois de criar/redefinir o acesso: atualiza a lista */
  aoMudarAcesso?: () => Promise<void>;
}

const FormularioAluno: React.FC<Props> = ({ edicaoId, turmas, aluno, onConcluir, situacaoAcesso, aoMudarAcesso }) => {
  const [formData, setFormData] = useState({
    nome: aluno?.nome ?? '',
    login: aluno?.login ?? '',
    turma_id: String(aluno?.turma_id ?? turmas[0]?.id ?? ''),
    observacao: aluno?.observacao ?? '',
  });
  const [foto, setFoto] = useState<string | null>(aluno?.foto ?? null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((anterior) => ({ ...anterior, [name]: value }));
  };

  const escolherFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // deixa escolher o mesmo arquivo de novo
    if (!arquivo) return;
    setEnviandoFoto(true);
    setMensagem(null);
    try {
      setFoto(await enviarFotoDoAluno(arquivo));
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro instanceof Error ? erro.message : 'Não foi possível enviar a foto.' });
    } finally {
      setEnviandoFoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do aluno.' });
      return;
    }
    setSalvando(true);
    const erro = await salvarAluno(edicaoId, { ...formData, turma_id: Number(formData.turma_id), foto }, aluno?.id);
    setSalvando(false);
    if (erro) {
      setMensagem({ tipo: 'erro', texto: erro });
      return;
    }
    if (aluno && aluno.foto !== foto) await apagarFotoAntiga(aluno.foto); // trocou a foto: apaga a velha
    onConcluir(aluno ? `${formData.nome.trim()} atualizado.` : `${formData.nome.trim()} cadastrado.`);
  };

  const remover = async () => {
    if (!aluno) return;
    setSalvando(true);
    const erro = await removerAluno(aluno.id);
    setSalvando(false);
    if (erro) {
      setMensagem({ tipo: 'erro', texto: erro });
      return;
    }
    await apagarFotoAntiga(aluno.foto);
    onConcluir(`${aluno.nome} removido.`);
  };

  if (!turmas.length) {
    return <p className="text-sm text-gray-600">Crie uma turma nesta edição antes de cadastrar alunos (menu Edições e turmas).</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Aviso mensagem={mensagem} className="" />

      {/* Foto: prévia + botão de trocar */}
      <div className="flex items-center gap-4">
        <Avatar foto={foto} nome={formData.nome || 'aluno'} tamanho="lg" />
        <div className="flex flex-wrap gap-2">
          <label className={`inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-favela-green-500 ${enviandoFoto ? 'pointer-events-none opacity-50' : ''}`}>
            {enviandoFoto ? 'Enviando...' : foto ? 'Trocar foto' : 'Adicionar foto'}
            <input type="file" accept="image/*" onChange={escolherFoto} className="sr-only" />
          </label>
          {foto && (
            <Botao variante="perigo" onClick={() => setFoto(null)}>Tirar foto</Botao>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="aluno-nome" className={classeRotulo}>Nome completo *</label>
        <input id="aluno-nome" name="nome" value={formData.nome} onChange={handleInputChange} required maxLength={120}
          className={classeCampo} placeholder="Ex: Maria da Silva Santos" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="aluno-turma" className={classeRotulo}>Turma *</label>
          <select id="aluno-turma" name="turma_id" value={formData.turma_id} onChange={handleInputChange} className={classeCampo}>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="aluno-login" className={classeRotulo}>Login</label>
          <input id="aluno-login" name="login" value={formData.login} onChange={handleInputChange} maxLength={60}
            className={classeCampo} placeholder="Ex: maria.santos" autoComplete="off" />
        </div>
      </div>

      <div>
        <label htmlFor="aluno-observacao" className={classeRotulo}>Observação</label>
        <textarea id="aluno-observacao" name="observacao" value={formData.observacao} onChange={handleInputChange}
          rows={2} maxLength={500} className={classeCampo} />
      </div>

      {/* Login e senha do aluno (criar acesso / redefinir senha) */}
      {aluno && situacaoAcesso && aoMudarAcesso && (
        <AcessoDoAluno aluno={aluno} situacao={situacaoAcesso} onConcluir={aoMudarAcesso} />
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {aluno ? (
          confirmandoRemocao ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-red-700">
              <span>Remover apaga também o histórico de presença.</span>
              <Botao variante="perigo" onClick={remover} disabled={salvando}>Confirmar</Botao>
              <Botao onClick={() => setConfirmandoRemocao(false)}>Cancelar</Botao>
            </div>
          ) : (
            <Botao variante="perigo" onClick={() => setConfirmandoRemocao(true)}>Remover aluno</Botao>
          )
        ) : <span />}
        <Botao type="submit" variante="primario" disabled={salvando || enviandoFoto}>
          {salvando ? 'Salvando...' : aluno ? 'Salvar alterações' : 'Cadastrar aluno'}
        </Botao>
      </div>
    </form>
  );
};

export default FormularioAluno;
