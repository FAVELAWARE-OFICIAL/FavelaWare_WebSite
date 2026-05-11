/* ============================================
   MAIN: scripts globais usados em todas as páginas
   ============================================ */

// Inicializa AOS (animações de scroll) se a lib estiver carregada na página.
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 600,
      once: true,
      offset: 80,
      easing: 'ease-out',
    });
  }
});
