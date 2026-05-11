/* ============================================
   WEB COMPONENTS — Navbar e Footer compartilhados
   Carregado com `defer` no <head> de cada página,
   renderiza antes do primeiro paint (sem flash).
   ============================================ */

const MENU_ITEMS = [
  { label: 'HOME',             href: 'index.html',           page: 'home' },
  { label: 'COMO FAZEMOS',     href: 'como-fazemos.html',    page: 'como-fazemos' },
  { label: 'SOBRE',            href: 'sobre.html',           page: 'sobre' },
  { label: 'MATERIAL',         href: 'material.html',        page: 'material' },
  { label: 'RECONHECIMENTOS',  href: 'reconhecimentos.html', page: 'reconhecimentos' },
  { label: 'CONTATO',          href: 'contato.html',         page: 'contato' },
];

class SiteNavbar extends HTMLElement {
  connectedCallback() {
    const currentPage = this.getAttribute('current') || 'home';
    const transparentOnHome = this.hasAttribute('transparent-on-home') && currentPage === 'home';

    const linksDesktop = MENU_ITEMS.map(item =>
      `<li><a class="site-nav__link" href="${item.href}" ${item.page === currentPage ? 'aria-current="page"' : ''}>${item.label}</a></li>`
    ).join('');

    const linksMobile = MENU_ITEMS.map(item =>
      `<li><a class="site-nav__mobile-link" href="${item.href}" ${item.page === currentPage ? 'aria-current="page"' : ''}>${item.label}</a></li>`
    ).join('');

    this.innerHTML = `
      <nav class="site-nav ${transparentOnHome ? 'site-nav--transparent' : ''}" id="site-nav" aria-label="Navegação principal">
        <div class="site-nav__inner">
          <a class="site-nav__brand" href="index.html">FavelaWare</a>

          <ul class="site-nav__menu">${linksDesktop}</ul>

          <button class="site-nav__toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="site-nav-mobile">
            <span class="site-nav__toggle-bar"></span>
            <span class="site-nav__toggle-bar"></span>
            <span class="site-nav__toggle-bar"></span>
          </button>
        </div>

        <div class="site-nav__mobile" id="site-nav-mobile" aria-hidden="true">
          <ul class="site-nav__mobile-list">${linksMobile}</ul>
        </div>
      </nav>
    `;

    const nav = this.querySelector('.site-nav');
    const toggle = this.querySelector('.site-nav__toggle');
    const mobile = this.querySelector('.site-nav__mobile');

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.setAttribute('aria-label', expanded ? 'Abrir menu' : 'Fechar menu');
      mobile.setAttribute('aria-hidden', String(expanded));
    });

    if (transparentOnHome) {
      const onScroll = () => {
        if (window.scrollY > 20) {
          nav.classList.remove('site-nav--transparent');
          nav.classList.add('site-nav--scrolled');
        } else {
          nav.classList.add('site-nav--transparent');
          nav.classList.remove('site-nav--scrolled');
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="site-footer">
        <div class="site-footer__inner">
          <div class="site-footer__grid">
            <div>
              <h3 class="site-footer__brand text-gradient">FavelaWare</h3>
              <p class="site-footer__about">
                Uma iniciativa voltada para a formação de jovens programadores vindos de comunidades de Belo Horizonte/MG,
                focada na capacitação de hard skills e soft skills.
              </p>
              <div class="site-footer__socials">
                <a class="site-footer__social" href="https://instagram.com/favelaware" target="_blank" rel="noopener" aria-label="Instagram">📷</a>
                <a class="site-footer__social" href="mailto:favelaware@gmail.com" aria-label="Email">📧</a>
              </div>
            </div>

            <div>
              <h4 class="site-footer__title">Links Rápidos</h4>
              <nav class="site-footer__links" aria-label="Links do rodapé">
                <a class="site-footer__link" href="sobre.html">Sobre</a>
                <a class="site-footer__link" href="como-fazemos.html">Trilhas</a>
                <a class="site-footer__link" href="material.html">Material</a>
                <a class="site-footer__link" href="reconhecimentos.html">Reconhecimentos</a>
                <a class="site-footer__link" href="contato.html">Contato</a>
              </nav>
            </div>

            <div>
              <h4 class="site-footer__title">Contato</h4>
              <div class="site-footer__contact-item">
                <span aria-hidden="true">📍</span>
                <div>
                  <strong>Localização</strong>
                  <p>Belo Horizonte/MG</p>
                </div>
              </div>
              <div class="site-footer__contact-item">
                <span aria-hidden="true">✉️</span>
                <div>
                  <strong>Email</strong>
                  <p><a class="site-footer__link" href="mailto:favelaware@gmail.com">favelaware@gmail.com</a></p>
                </div>
              </div>
            </div>
          </div>

          <div class="site-footer__divider"></div>

          <div class="site-footer__bottom">
            <p>© ${new Date().getFullYear()} FavelaWare. Todos os direitos reservados.</p>
            <p>Feito com <span class="site-footer__heart" aria-hidden="true">❤️</span> para as comunidades</p>
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define('site-navbar', SiteNavbar);
customElements.define('site-footer', SiteFooter);
