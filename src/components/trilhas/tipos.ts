/** Tipos compartilhados pela página de trilhas da equipe e pelos componentes dela */
import type { AlunoDaTurma, Atividade } from '../../lib/atividades';
import type { MaterialDaTrilha, TrilhaDoPortal } from '../../lib/material';

/** Janela aberta na página (formulários e listas) */
export type JanelaAberta =
  | { tipo: 'trilha'; trilha?: TrilhaDoPortal }
  | { tipo: 'material'; trilhaId: number; material?: MaterialDaTrilha }
  | { tipo: 'atividade'; trilhaId: number; atividade: Atividade | null }
  | { tipo: 'entregas'; atividadeId: number }
  | { tipo: 'corrigir'; atividadeId: number; aluno: AlunoDaTurma };

/** Situação da aba Atividades (turmas e atividades carregam à parte dos materiais) */
export type EstadoAtividades = 'carregando' | 'pronto' | 'erro' | 'erro-turmas' | 'sem-turma';

/** O que o botão "Apagar" de um cartão pede para apagar */
export type AlvoDeApagar =
  | { tipo: 'trilha'; trilha: TrilhaDoPortal }
  | { tipo: 'material'; material: MaterialDaTrilha }
  | { tipo: 'atividade'; atividade: Atividade };
