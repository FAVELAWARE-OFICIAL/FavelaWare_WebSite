/**
 * ============================================
 * ANIMAÇÕES DO SITE (Framer Motion)
 * ============================================
 *
 * Vocabulário de movimento das páginas públicas.
 * - Seção: <motion.section {...surgirDeBaixo}>
 * - Lista: container com variants={cascata(0.15)}, initial="initial" e
 *   animate="animate" (ou whileInView="animate"); cada filho com variants={surgirDeBaixo}
 */

/** Entra subindo 20px e aparecendo. Serve direto como props ou como variants de um filho da cascata. */
export const surgirDeBaixo = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

/** Container de lista: os filhos entram um depois do outro, separados por `intervalo` segundos. */
export const cascata = (intervalo: number) => ({
  animate: { transition: { staggerChildren: intervalo } },
});
