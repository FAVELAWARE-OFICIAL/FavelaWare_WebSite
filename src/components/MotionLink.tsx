/**
 * ============================================
 * COMPONENTE MOTIONLINK (LINK ANIMADO)
 * ============================================
 *
 * É o <Link> do React Router com os poderes do Framer Motion
 * (whileHover, whileTap, animate...).
 *
 * Por que existe: botão dentro de <Link> (<a><button>) é HTML inválido e
 * cria dois alvos de foco para o teclado. Com o MotionLink o próprio link
 * recebe as animações, e a navegação continua sem recarregar a página.
 *
 * Cuidado: o <Link> do react-router 7 cria um ref novo a cada render. Se o
 * componente pai re-renderizar durante o hover (ex.: um useState ligado ao
 * onMouseEnter), o Framer Motion trata o link como elemento novo e o hover
 * trava ou é cancelado. Prefira variants disparadas pelo próprio whileHover
 * (os filhos herdam o estado; veja o botão "SAIBA MAIS" do Hero) ou garanta
 * que o pai não re-renderize enquanto o mouse está em cima.
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export const MotionLink = motion.create(Link);
