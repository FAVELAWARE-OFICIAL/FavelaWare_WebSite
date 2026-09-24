/**
 * ============================================
 * CARTÃO DE PESSOA
 * ============================================
 *
 * Foto redonda sobre o verde da marca, com nome e, se houver, cargo,
 * organização e o ícone do LinkedIn. Usado nas grades de equipe e de alunos.
 *
 * Dois jeitos de entrar na tela, conforme a página:
 * - sem `atraso` (Hall da Fama, página da turma): o cartão é filho de uma
 *   grade com cascata(...) e herda dela o initial/animate; foto menor no celular.
 * - com `atraso` (Sobre): o cartão cresce sozinho ao aparecer na tela,
 *   esperando `atraso` segundos; foto sempre w-32.
 */

import { motion, type MotionProps } from 'framer-motion';
import { LinkLinkedin } from './RedesSociais';
import { surgirDeBaixo } from './animacoes';
import { FOTO_PADRAO_DE_PESSOA } from '../data/imagens';

interface Props {
  nome: string;
  /** Sem foto, aparece o avatar padrão (silhueta branca sobre o verde) */
  foto?: string | null;
  cargo?: string;
  organizacao?: string;
  linkedin?: string | null;
  atraso?: number;
  /** Tira a sombra e o anel branco em volta da foto */
  semMoldura?: boolean;
}

const CartaoDePessoa: React.FC<Props> = ({ nome, foto, cargo, organizacao, linkedin, atraso, semMoldura }) => {
  const naGrade = atraso === undefined;

  const movimento: MotionProps = naGrade
    ? { variants: surgirDeBaixo, whileHover: { y: -8 } }
    : {
        initial: { opacity: 0, scale: 0.8 },
        whileInView: { opacity: 1, scale: 1 },
        viewport: { once: true },
        transition: { delay: atraso },
        whileHover: { y: -10 },
      };

  const tamanhoDaFoto = naGrade ? 'w-28 h-28 md:w-32 md:h-32' : 'w-32 h-32';
  const moldura = semMoldura ? '' : ' shadow-lg ring-4 ring-white';

  return (
    <motion.div {...movimento} className="flex flex-col items-center text-center">
      {/* O verde do container aparece nas bordas do recorte circular,
          combinando com o fundo verde das próprias fotos */}
      <div className={`${tamanhoDaFoto} bg-[#8bc53f] rounded-full overflow-hidden mb-4${moldura}`}>
        <img
          src={foto ?? FOTO_PADRAO_DE_PESSOA}
          alt={`Foto de ${nome}`}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {cargo && <p className="text-sm font-bold text-[#8bc53f] mb-1">{cargo}</p>}
      <p className={`text-base font-bold text-[#2d2a5f]${naGrade ? ' leading-tight' : ''}`}>{nome}</p>
      {organizacao && <p className="text-sm text-pink-500 font-semibold">{organizacao}</p>}
      {linkedin && <LinkLinkedin nome={nome} url={linkedin} />}
    </motion.div>
  );
};

export default CartaoDePessoa;
