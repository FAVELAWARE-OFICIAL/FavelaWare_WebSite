/* ============================================
   AULAS: render do cronograma a partir de aulasData
   ============================================ */

(function () {
  const root = document.getElementById('aulas-root');
  if (!root || !window.aulasData) return;

  const escapeHTML = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  const renderAula = (aula) => `
    <li class="schedule__item">
      <span class="schedule__date">${escapeHTML(aula.data)}</span>
      <div class="schedule__body">
        <p class="schedule__title">${escapeHTML(aula.titulo)}</p>
        ${aula.instrutores ? `<p class="schedule__instructors">${escapeHTML(aula.instrutores)}</p>` : ''}
      </div>
    </li>
  `;

  const renderSecao = (secao) => `
    <article class="schedule__secao">
      <h3 class="schedule__secao-title">${escapeHTML(secao.nome)}</h3>
      <ul class="schedule__list">
        ${secao.aulas.map(renderAula).join('')}
      </ul>
    </article>
  `;

  const renderTrilha = (trilha) => `
    <section class="schedule__trilha" data-aos="fade-up">
      <header class="schedule__trilha-header">
        <h2 class="schedule__trilha-title">${escapeHTML(trilha.trilha)}</h2>
        ${trilha.horas ? `<span class="schedule__trilha-hours">${escapeHTML(trilha.horas)}</span>` : ''}
      </header>
      <div class="schedule__secoes">
        ${trilha.secoes.map(renderSecao).join('')}
      </div>
    </section>
  `;

  root.innerHTML = window.aulasData.map(renderTrilha).join('');

  if (typeof AOS !== 'undefined') AOS.refresh();
})();
