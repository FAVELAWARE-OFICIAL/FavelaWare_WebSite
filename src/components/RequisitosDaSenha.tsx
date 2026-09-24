/**
 * ============================================
 * REQUISITOS DA SENHA (MEDIDOR DE FORÇA)
 * ============================================
 *
 * Mostra, enquanto a pessoa digita, a força da senha (barra de 5 partes) e
 * cada requisito da política (src/lib/senha.ts) como um selo que fica verde
 * quando é cumprido. Usada em toda tela que cria senha: primeiro acesso,
 * convite do instrutor, "Meu perfil" e a senha padrão dos alunos.
 *
 * `id` liga a lista ao campo: use aria-describedby={id} no input.
 */
import { motion } from 'framer-motion';

import { REQUISITOS_DA_SENHA } from '../lib/senha';
import { estado } from './admin/designSystem';

/** Nome e cor da força pela quantidade de requisitos cumpridos */
function forcaDa(cumpridos: number) {
  if (cumpridos === REQUISITOS_DA_SENHA.length)
    return { rotulo: 'Forte', cor: 'bg-favela-green-500', texto: 'text-green-800' };
  if (cumpridos >= 3) return { rotulo: 'Média', cor: 'bg-amber-400', texto: 'text-amber-800' };
  return { rotulo: 'Fraca', cor: 'bg-red-500', texto: 'text-red-800' };
}

const RequisitosDaSenha: React.FC<{ senha: string; id?: string }> = ({ senha, id }) => {
  const situacao = REQUISITOS_DA_SENHA.map((r) => ({ ...r, ok: r.atende(senha) }));
  const cumpridos = situacao.filter((r) => r.ok).length;
  const forca = forcaDa(cumpridos);

  return (
    <div id={id} className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      {/* Barra de força: uma parte por requisito */}
      <div className="mb-2.5 flex items-center gap-3">
        <div className="grid flex-1 grid-cols-5 gap-1.5" aria-hidden="true">
          {situacao.map((r, i) => (
            <span key={r.id} className="h-1.5 overflow-hidden rounded-full bg-gray-200">
              <motion.span
                className={`block h-full rounded-full ${forca.cor}`}
                initial={false}
                animate={{ width: i < cumpridos ? '100%' : '0%' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </span>
          ))}
        </div>
        <span className={`w-12 text-right text-xs font-semibold ${senha ? forca.texto : 'text-gray-400'}`}>
          {senha ? forca.rotulo : '—'}
        </span>
      </div>

      {/* Requisitos em selos */}
      <ul className="flex flex-wrap gap-1.5">
        {situacao.map((r) => (
          <li
            key={r.id}
            aria-label={`${r.texto}: ${r.ok ? 'cumprido' : 'falta'}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-300 ${
              r.ok ? estado.sucesso : 'border-gray-200 bg-white text-gray-500'
            }`}
          >
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ scale: r.ok ? 1 : 0.85 }}
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                r.ok ? 'bg-green-600 text-white' : 'border border-gray-300 text-transparent'
              }`}
            >
              ✓
            </motion.span>
            <span aria-hidden="true">{r.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RequisitosDaSenha;
