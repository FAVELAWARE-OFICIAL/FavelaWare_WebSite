/** Nova trilha, editar trilha, novo material ou editar material (dentro de uma <Janela>) */
import { useState } from 'react';

import { Aviso, Botao, classeCampo, classeTextoLongo, classeRotulo, type Mensagem } from '../admin/Ui';
import { espaco } from '../admin/designSystem';
import { useCampos } from '../../hooks/useCampos';
import { servicoMaterial, type TrilhaDoPortal } from '../../lib/material';
import type { JanelaAberta } from './tipos';

const FormularioDeTrilhaOuMaterial: React.FC<{
  alvo: Extract<JanelaAberta, { tipo: 'trilha' | 'material' }>;
  trilhas: TrilhaDoPortal[];
  aoSalvar: (mensagem: string) => Promise<void>;
}> = ({ alvo, trilhas, aoSalvar }) => {
  const { campos, aoAlterarCampo } = useCampos(() =>
    alvo.tipo === 'trilha'
      ? { nome: alvo.trilha?.nome ?? '', titulo: '', descricao: alvo.trilha?.descricao ?? '', url: '', trilha_id: '' }
      : {
          nome: '',
          titulo: alvo.material?.titulo ?? '',
          descricao: alvo.material?.descricao ?? '',
          url: alvo.material?.url ?? 'https://',
          trilha_id: String(alvo.trilhaId),
        },
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<Mensagem>(null);

  const aoEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSalvando(true);
    const falha =
      alvo.tipo === 'trilha'
        ? await servicoMaterial.salvarTrilha({ nome: campos.nome, descricao: campos.descricao }, alvo.trilha?.id)
        : await servicoMaterial.salvarMaterial(
            {
              trilha_id: Number(campos.trilha_id),
              titulo: campos.titulo,
              descricao: campos.descricao,
              url: campos.url,
            },
            alvo.material?.id,
          );
    setSalvando(false);
    if (falha) return setErro({ tipo: 'erro', texto: falha });
    await aoSalvar(alvo.tipo === 'trilha' ? 'Trilha salva.' : 'Material salvo.');
  };

  return (
    <form onSubmit={aoEnviar} className={espaco.formulario}>
      <Aviso mensagem={erro} className="" />
      {alvo.tipo === 'trilha' ? (
        <>
          <div>
            <label htmlFor="trilha-nome" className={classeRotulo}>
              Nome da trilha *
            </label>
            <input
              id="trilha-nome"
              name="nome"
              value={campos.nome}
              onChange={aoAlterarCampo}
              required
              maxLength={80}
              className={classeCampo}
              placeholder="Ex: Git e GitHub"
            />
          </div>
          <div>
            <label htmlFor="trilha-descricao" className={classeRotulo}>
              Descrição
            </label>
            <textarea
              id="trilha-descricao"
              name="descricao"
              value={campos.descricao}
              onChange={aoAlterarCampo}
              rows={2}
              maxLength={300}
              className={classeTextoLongo}
              placeholder="Ex: Versionamento de código e trabalho em equipe"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="material-trilha" className={classeRotulo}>
              Trilha *
            </label>
            <select
              id="material-trilha"
              name="trilha_id"
              value={campos.trilha_id}
              onChange={aoAlterarCampo}
              className={classeCampo}
            >
              {trilhas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="material-titulo" className={classeRotulo}>
              Título *
            </label>
            <input
              id="material-titulo"
              name="titulo"
              value={campos.titulo}
              onChange={aoAlterarCampo}
              required
              maxLength={120}
              className={classeCampo}
              placeholder="Ex: Slides da aula 1"
            />
          </div>
          <div>
            <label htmlFor="material-url" className={classeRotulo}>
              Link (https://) *
            </label>
            <input
              id="material-url"
              name="url"
              type="url"
              value={campos.url}
              onChange={aoAlterarCampo}
              required
              className={classeCampo}
              placeholder="https://..."
            />
          </div>
          <div>
            <label htmlFor="material-descricao" className={classeRotulo}>
              Descrição
            </label>
            <textarea
              id="material-descricao"
              name="descricao"
              value={campos.descricao}
              onChange={aoAlterarCampo}
              rows={2}
              maxLength={300}
              className={classeTextoLongo}
              placeholder="Ex: Pasta no Google Drive com os exercícios"
            />
          </div>
        </>
      )}
      <div className="flex justify-end border-t border-gray-100 pt-4">
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Botao>
      </div>
    </form>
  );
};

export default FormularioDeTrilhaOuMaterial;
