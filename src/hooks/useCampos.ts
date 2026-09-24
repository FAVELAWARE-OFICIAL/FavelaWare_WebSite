/**
 * ============================================
 * CAMPOS DE FORMULÁRIO CONTROLADO
 * ============================================
 *
 * Guarda os valores de um formulário num objeto só. Cada input, select ou
 * textarea precisa de `name` igual à chave do objeto: o `aoAlterarCampo`
 * usa o `name` para saber o que atualizar. Só texto (não trata checkbox).
 */
import { useState } from 'react';

export function useCampos<T extends object>(inicial: T | (() => T)) {
  const [campos, setCampos] = useState(inicial);

  const aoAlterarCampo = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCampos((anterior) => ({ ...anterior, [name]: value }));
  };

  return { campos, setCampos, aoAlterarCampo };
}
