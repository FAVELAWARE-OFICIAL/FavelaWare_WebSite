/* ============================================
   WEB COMPONENTS: Navbar e Footer compartilhados
   Carregado com `defer` no <head> de cada página,
   renderiza antes do primeiro paint (sem flash).
   ============================================ */

const MENU_ITEMS = [
  { label: 'HOME',             href: 'index.html',           page: 'home' },
  { label: 'COMO FAZEMOS',     href: 'como-fazemos.html',    page: 'como-fazemos' },
  { label: 'SOBRE',            href: 'sobre.html',           page: 'sobre' },
  { label: 'AULAS',            href: 'aulas.html',           page: 'aulas' },
  { label: 'MATERIAL',         href: 'material.html',        page: 'material' },
  { label: 'TURMAS',           href: 'turmas.html',          page: 'turmas' },
  { label: 'GALERIA',          href: 'galeria.html',         page: 'galeria' },
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
      <footer class="site-footer site-footer--compact">
        <div class="site-footer__inner">
          <div class="site-footer__socials" aria-label="Redes sociais">
            <a class="site-footer__social" href="mailto:favelaware@gmail.com" aria-label="Email">✉️</a>
            <a class="site-footer__social" href="https://www.instagram.com/favelaware" target="_blank" rel="noopener" aria-label="Instagram">📷</a>
          </div>

          <p class="site-footer__about">
            O FavelaWare é uma iniciativa voltada para a formação de jovens programadores vindos de comunidades
            de Belo Horizonte/MG focada na capacitação de hard skills e soft skills.
          </p>

          <p class="site-footer__credit">Site criado pela equipe Ânima Hub</p>
        </div>
      </footer>
    `;
  }
}

customElements.define('site-navbar', SiteNavbar);
customElements.define('site-footer', SiteFooter);
