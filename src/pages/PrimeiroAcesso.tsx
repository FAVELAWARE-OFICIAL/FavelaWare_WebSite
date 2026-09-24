/**
 * ============================================
 * PÁGINA PRIMEIRO ACESSO (ALUNO)
 * ============================================
 *
 * O aluno entra com o login da turma e a senha padrão; antes de ver a área
 * dele, passa por duas etapas (o mesmo design dos dados da bolsa do instrutor):
 * 1. Sua senha: troca a senha padrão por uma só dele;
 * 2. Seus dados: nome completo (vem o da turma; ele corrige se precisar), data
 *    de nascimento e Gmail (e-mail de contato).
 *
 * Sem isso a guarda de rota não deixa entrar em /aluno. A senha é trocada no
 * Supabase Auth; os dados vão pela função concluir_primeiro_acesso do banco,
 * que também libera a conta.
 */
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import Carregamento from '../components/admin/Carregamento';
import CamposDeNovaSenha from '../components/CamposDeNovaSenha';
import TelaDeEtapas from '../components/TelaDeEtapas';
import { classeCampoDeEtapa, classeRotuloDeEtapa } from '../components/estilosDeAcesso';
import { useCampos } from '../hooks/useCampos';
import { servicoPerfil } from '../lib/perfil';
import { servicoSenha } from '../lib/senha';
import { servicoSessao, type MeuPerfil } from '../lib/sessao';
import { StatusProcessamento } from '../types';
import { hoje as hojeLocal } from '../utils/datas';
import { emailValido } from '../utils/texto';

const ETAPAS = [
  { titulo: 'Sua senha', descricao: 'Troque a senha padrão por uma só sua.', icone: '🔑' },
  { titulo: 'Seus dados', descricao: 'Confira seu nome e diga como falar com você.', icone: '🪪' },
];

type Campos = { senha: string; confirmacao: string; nome: string; dataNascimento: string; email: string };

/** O problema da etapa (texto e o campo para levar o foco), ou null */
function problemaDaEtapa(etapa: number, c: Campos): { texto: string; campo: keyof Campos } | null {
  if (etapa === 0) {
    const problema = servicoSenha.validarNova(c.senha, c.confirmacao, 'A nova senha');
    return problema ? { texto: problema, campo: 'senha' } : null;
  }
  const nome = c.nome.trim().replace(/\s+/g, ' ');
  if (nome.length < 3 || !nome.includes(' '))
    return { texto: 'Informe o nome completo (nome e sobrenome).', campo: 'nome' };
  if (!c.dataNascimento) return { texto: 'Informe sua data de nascimento.', campo: 'dataNascimento' };
  if (!emailValido(c.email)) return { texto: 'Informe um Gmail (ou outro e-mail) válido.', campo: 'email' };
  return null;
}

const PrimeiroAcesso: React.FC = () => {
  const navigate = useNavigate();
  const formulario = useRef<HTMLFormElement>(null);
  const [perfil, setPerfil] = useState<MeuPerfil | null | undefined>(undefined); // undefined = verificando
  const { campos, setCampos, aoAlterarCampo } = useCampos<Campos>({
    senha: '',
    confirmacao: '',
    nome: '',
    dataNascimento: '',
    email: '',
  });
  const [etapa, setEtapa] = useState(0);
  const [liberadaAte, setLiberadaAte] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [focar, setFocar] = useState<keyof Campos | null>(null);

  // Só aluno ligado a uma turma, e que ainda não fez o primeiro acesso.
  // O nome vem o da turma (ele confere e corrige se precisar)
  useEffect(() => {
    servicoSessao
      .contaLogada()
      .then(async (logada) => {
        setPerfil(logada?.perfil ?? null);
        if (logada?.perfil.papel !== 'aluno') return;
        const dados = await servicoPerfil.carregarMeusDados().catch((e) => {
          console.error('[primeiro acesso] não carregou os dados da turma', e?.code ?? e?.message);
          return null;
        });
        if (dados) setCampos((c) => ({ ...c, nome: c.nome || dados.nome, email: c.email || dados.aluno?.email || '' }));
      })
      .catch((e) => {
        console.error('[primeiro acesso] não conferiu a conta', e?.code ?? e?.message);
        setPerfil(null);
      });
  }, [setCampos]);

  // Leva o foco ao campo com problema (ou ao primeiro da etapa nova)
  useEffect(() => {
    if (!focar) return;
    formulario.current?.querySelector<HTMLElement>(`[name="${focar}"]`)?.focus();
    setFocar(null);
  }, [focar, etapa]);

  const irPara = (proxima: number, campo?: keyof Campos) => {
    setEtapa(proxima);
    setLiberadaAte((atual) => Math.max(atual, proxima));
    setFocar(campo ?? (proxima === 0 ? 'senha' : 'nome'));
  };

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensagem(null);
    // Confere a etapa atual; na última, confere as duas (dá para pular pelo índice)
    for (const i of etapa === ETAPAS.length - 1 ? [0, 1] : [etapa]) {
      const problema = problemaDaEtapa(i, campos);
      if (problema) {
        setMensagem(problema.texto);
        return irPara(i, problema.campo);
      }
    }
    if (etapa < ETAPAS.length - 1) return irPara(etapa + 1);

    setSalvando(true);
    const resultado = await servicoSenha.concluirPrimeiroAcesso(campos.senha, {
      nome: campos.nome,
      dataNascimento: campos.dataNascimento,
      email: campos.email,
    });
    if (resultado.status !== StatusProcessamento.Sucesso) {
      setSalvando(false);
      return setMensagem(resultado.mensagem);
    }
    navigate('/aluno', { replace: true });
  };

  if (perfil === undefined) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Carregamento texto="Verificando acesso" />
      </div>
    );
  }
  if (!perfil || perfil.papel !== 'aluno' || !perfil.participanteId) return <Navigate to="/login" replace />;
  if (!perfil.precisaTrocarSenha) return <Navigate to="/aluno" replace />;

  // Data local (a mesma regra do "Meu perfil"): em UTC, depois das 21h já seria amanhã
  const hoje = hojeLocal();

  const etapas = [
    <div key="senha" className="col-span-2 space-y-4 lg:col-span-6">
      <CamposDeNovaSenha
        senha={campos.senha}
        confirmacao={campos.confirmacao}
        aoAlterar={aoAlterarCampo}
        rotuloDaConfirmacao="Repita a nova senha *"
        dica={<p className="mt-1 text-xs text-gray-500">Diferente da senha padrão, e com:</p>}
        estilo={{ campo: classeCampoDeEtapa, rotulo: classeRotuloDeEtapa }}
      />
    </div>,
    <div key="dados" className="contents">
      <div className="col-span-2 lg:col-span-6">
        <label htmlFor="nome" className={classeRotuloDeEtapa}>
          Nome completo *
        </label>
        <input
          id="nome"
          name="nome"
          autoComplete="name"
          maxLength={120}
          value={campos.nome}
          onChange={aoAlterarCampo}
          className={classeCampoDeEtapa}
          placeholder="Ex: Maria Eduarda Souza Lima"
        />
        <p className="mt-1 text-xs text-gray-500">Como vai aparecer na chamada e no certificado.</p>
      </div>
      <div className="col-span-2 lg:col-span-2">
        <label htmlFor="dataNascimento" className={classeRotuloDeEtapa}>
          Data de aniversário *
        </label>
        <input
          id="dataNascimento"
          name="dataNascimento"
          type="date"
          max={hoje}
          autoComplete="bday"
          value={campos.dataNascimento}
          onChange={aoAlterarCampo}
          className={classeCampoDeEtapa}
        />
      </div>
      <div className="col-span-2 lg:col-span-4">
        <label htmlFor="email" className={classeRotuloDeEtapa}>
          Gmail *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={200}
          value={campos.email}
          onChange={aoAlterarCampo}
          className={classeCampoDeEtapa}
          placeholder="Ex: maria@gmail.com"
        />
      </div>
    </div>,
  ];

  return (
    <TelaDeEtapas
      titulo="BEM-VINDO(A)!"
      tituloCurto="Primeiro acesso"
      descricao="Este é o seu primeiro acesso. Crie uma senha só sua e complete seus dados para ver o material das aulas."
      privacidade="Seus dados ficam só com você e com a coordenação do FavelaWare. Ninguém mais vê."
      privacidadeCurta="Seus dados ficam só com você e com a coordenação."
      etapas={ETAPAS}
      etapa={etapa}
      liberadaAte={liberadaAte}
      concluida={(i) => !problemaDaEtapa(i, campos)}
      aoIrPara={(i) => {
        setMensagem(null);
        irPara(i);
      }}
      erro={mensagem}
      ocupado={salvando}
      rotuloFinal="SALVAR E ENTRAR"
      formulario={formulario}
      aoEnviar={aoEnviar}
    >
      {etapas[etapa]}
    </TelaDeEtapas>
  );
};

export default PrimeiroAcesso;
