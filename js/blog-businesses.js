// js/blog-businesses.js
// Fichas de negocios en las páginas del blog.
//
// Uso en el HTML:
//   <section data-blog-biz="top"></section>      → fichas arriba (6)
//   <section data-blog-biz="bottom"></section>   → más fichas + "Ver más" + "Ver todas"
//   <script src="/js/blog-businesses.js" defer
//           data-terms="barber|barbería"   (términos buscados en título/descripción/dirección, separados por |)
//           data-categories="barberias"    (slugs de categoría, separados por |; opcional)
//           data-label="barberías"         (texto para títulos y botón)
//           data-q="barberia"></script>    (búsqueda para el botón "Ver más ...")
//
// Primero muestra negocios relacionados con el artículo; si no alcanzan,
// completa con los negocios más vistos del directorio.

(function () {
  'use strict';

  var script = document.currentScript;
  var cfg = {
    terms: ((script && script.dataset.terms) || '').split('|').map(function (t) { return t.trim(); }).filter(Boolean),
    categories: ((script && script.dataset.categories) || '').split('|').map(function (t) { return t.trim(); }).filter(Boolean),
    label: (script && script.dataset.label) || '',
    q: (script && script.dataset.q) || '',
  };

  var TOP_COUNT = 6;
  var PAGE_COUNT = 6;
  var GENERAL_LIMIT = 24;

  var pool = [];
  var seen = {};
  var sources = [];
  var generalPage = 1;
  var generalDone = false;
  var shown = 0;

  cfg.categories.forEach(function (slug) {
    sources.push('/api/businesses?categoria=' + encodeURIComponent(slug) + '&sort=views_desc&limit=30');
  });
  cfg.terms.forEach(function (term) {
    sources.push('/api/businesses?search=' + encodeURIComponent(term) + '&sort=views_desc&limit=30');
  });

  function addToPool(list, related) {
    (list || []).forEach(function (b) {
      if (!b || seen[b.id]) return;
      seen[b.id] = true;
      b._related = related;
      pool.push(b);
    });
  }

  function fetchJson(url) {
    return fetch(url).then(function (r) { return r.ok ? r.json() : { businesses: [] }; })
      .catch(function () { return { businesses: [] }; });
  }

  var relatedLoaded = null;
  function loadRelated() {
    if (!relatedLoaded) {
      relatedLoaded = Promise.all(sources.map(fetchJson)).then(function (results) {
        results.forEach(function (d) { addToPool(d.businesses, true); });
      });
    }
    return relatedLoaded;
  }

  function loadGeneralPage() {
    var url = '/api/businesses?sort=views_desc&limit=' + GENERAL_LIMIT + '&page=' + generalPage;
    generalPage++;
    return fetchJson(url).then(function (d) {
      var list = d.businesses || [];
      if (list.length < GENERAL_LIMIT) generalDone = true;
      addToPool(list, false);
    });
  }

  // Asegura que haya al menos `needed` fichas en el pool (o que no queden más)
  function ensure(needed) {
    return loadRelated().then(function loop() {
      if (pool.length >= needed || generalDone) return;
      return loadGeneralPage().then(loop);
    });
  }

  // ─── Render ──────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function slugify(text) {
    if (!text) return 'negocio';
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Misma lógica que getBusinessUrl() de js/app.js
  function bizUrl(b) {
    if (b.slug) {
      if (b.category_slug === 'medicina-servicio-medico') return '/medicina-servicio-medico/' + b.slug;
      if (b.category_slug && b.business_type) return '/' + slugify(b.business_type) + '/' + b.category_slug + '/' + b.slug;
      if (b.category_slug && b.tipo_negocio_slug) return '/' + b.tipo_negocio_slug + '/' + b.category_slug + '/' + b.slug;
      return '/negocio/' + b.slug;
    }
    return '/business.html?id=' + b.id;
  }

  function thumb(url, w) {
    if (!url || url.indexOf('/api/serve?key=') === -1 || /[?&]w=/.test(url)) return url;
    return url + '&w=' + w;
  }

  function card(b) {
    var img = b.logo || b.cover_image || '';
    var place = [b.city, b.state].filter(Boolean).join(', ');
    var desc = b.description ? String(b.description).replace(/<[^>]*>/g, '') : '';
    if (desc.length > 90) desc = desc.slice(0, 90).trim() + '…';
    var phone = (b.whatsapp || '').replace(/[^0-9]/g, '');

    return '<article class="bb-card">' +
      '<a class="bb-card-link" href="' + esc(bizUrl(b)) + '">' +
        '<div class="bb-card-img">' +
          (img
            ? '<img src="' + esc(thumb(img, 400)) + '" alt="' + esc(b.title) + '" loading="lazy" decoding="async" width="400" height="300" onerror="this.onerror=null;this.remove()">'
            : '<i class="fas fa-store"></i>') +
          (b.featured ? '<span class="bb-badge"><i class="fas fa-star"></i> Destacado</span>' : '') +
        '</div>' +
        '<div class="bb-card-body">' +
          (b.category_name ? '<span class="bb-cat">' + esc(b.category_name) + '</span>' : '') +
          '<h3>' + esc(b.title || 'Negocio') + '</h3>' +
          (place ? '<p class="bb-loc"><i class="fas fa-map-marker-alt"></i> ' + esc(place) + '</p>' : '') +
          (desc ? '<p class="bb-desc">' + esc(desc) + '</p>' : '') +
        '</div>' +
      '</a>' +
      '<div class="bb-actions">' +
        '<a href="' + esc(bizUrl(b)) + '" class="bb-btn">Ver ficha</a>' +
        (phone ? '<a href="https://wa.me/' + phone + '" target="_blank" rel="noopener" class="bb-btn bb-btn-wa"><i class="fab fa-whatsapp"></i></a>' : '') +
      '</div>' +
    '</article>';
  }

  function hasRelated() {
    return pool.some(function (b) { return b._related; });
  }

  function takeNext(n) {
    var slice = pool.slice(shown, shown + n);
    shown += slice.length;
    return slice;
  }

  function injectStyles() {
    if (document.getElementById('bb-styles')) return;
    var css =
      '.bb-section{max-width:1100px;margin:32px auto;padding:0 20px}' +
      '.bb-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}' +
      '.bb-head h2{font-size:1.4rem;margin:0;color:#1a1a2e}' +
      '.bb-head p{margin:4px 0 0;color:#64748b;font-size:.9rem}' +
      '.bb-head a{color:#006EE3;font-weight:600;text-decoration:none;font-size:.9rem;white-space:nowrap}' +
      '.bb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}' +
      '.bb-card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.08);display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s}' +
      '.bb-card:hover{transform:translateY(-3px);box-shadow:0 8px 22px rgba(0,0,0,.12)}' +
      '.bb-card-link{text-decoration:none;color:inherit;display:block;flex:1}' +
      '.bb-card-img{position:relative;aspect-ratio:4/3;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:2.2rem;overflow:hidden}' +
      '.bb-card-img img{width:100%;height:100%;object-fit:cover}' +
      '.bb-badge{position:absolute;top:8px;left:8px;background:#FFC107;color:#1a1a2e;font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:10px}' +
      '.bb-card-body{padding:12px 14px}' +
      '.bb-cat{display:inline-block;background:#E3F2FD;color:#006EE3;padding:2px 8px;border-radius:10px;font-size:.68rem;font-weight:700;text-transform:uppercase;margin-bottom:6px}' +
      '.bb-card-body h3{font-size:1rem;margin:0 0 6px;color:#1a1a2e;line-height:1.3}' +
      '.bb-loc{font-size:.8rem;color:#64748b;margin:0 0 6px}' +
      '.bb-desc{font-size:.82rem;color:#475569;margin:0;line-height:1.45}' +
      '.bb-actions{display:flex;gap:8px;padding:0 14px 14px}' +
      '.bb-btn{flex:1;text-align:center;background:#006EE3;color:#fff;padding:8px 10px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.85rem}' +
      '.bb-btn-wa{flex:0 0 42px;background:#25D366}' +
      '.bb-more{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:22px}' +
      '.bb-more button,.bb-more a{border:none;cursor:pointer;padding:12px 24px;border-radius:10px;font-weight:700;font-size:.95rem;text-decoration:none}' +
      '.bb-more button{background:#fff;color:#006EE3;border:2px solid #006EE3}' +
      '.bb-more a{background:#006EE3;color:#fff}' +
      '.bb-loading{text-align:center;color:#94a3b8;padding:20px}' +
      '@media (max-width:600px){.bb-grid{grid-template-columns:repeat(2,1fr);gap:12px}.bb-card-body h3{font-size:.9rem}.bb-desc{display:none}}';
    var style = document.createElement('style');
    style.id = 'bb-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function searchUrl() {
    return cfg.q ? '/search.html?q=' + encodeURIComponent(cfg.q) : '/search.html';
  }

  function renderTop(el) {
    el.classList.add('bb-section');
    el.innerHTML =
      '<div class="bb-head"><div><h2>Negocios destacados en Santiago</h2><p>Fichas verificadas del directorio En Santiago</p></div>' +
      '<a href="' + searchUrl() + '">Ver todos →</a></div>' +
      '<div class="bb-grid"><div class="bb-loading">Cargando negocios…</div></div>';
    var grid = el.querySelector('.bb-grid');
    return ensure(TOP_COUNT).then(function () {
      var items = takeNext(TOP_COUNT);
      if (!items.length) { el.style.display = 'none'; return; }
      // Solo se titula con la etiqueta del artículo si hay negocios relacionados
      if (cfg.label && hasRelated()) el.querySelector('.bb-head h2').textContent = 'Negocios recomendados: ' + cfg.label;
      grid.innerHTML = items.map(card).join('');
    });
  }

  function renderBottom(el) {
    var title = cfg.label && hasRelated() ? 'Más ' + cfg.label + ' y negocios relacionados' : 'Más negocios en Santiago';
    el.classList.add('bb-section');
    el.innerHTML =
      '<div class="bb-head"><div><h2>' + esc(title) + '</h2><p>Descubre más fichas del directorio</p></div></div>' +
      '<div class="bb-grid"></div>' +
      '<div class="bb-more">' +
        '<button type="button" class="bb-load-more"><i class="fas fa-plus"></i> Ver más</button>' +
        (cfg.q ? '<a href="' + searchUrl() + '" class="bb-see-related" style="background:#1a1a2e">Ver más ' + esc(cfg.label || 'relacionados') + '</a>' : '') +
        '<a href="/search.html"><i class="fas fa-th"></i> Ver todas las fichas</a>' +
      '</div>';
    var grid = el.querySelector('.bb-grid');
    var btn = el.querySelector('.bb-load-more');

    function more() {
      btn.disabled = true;
      return ensure(shown + PAGE_COUNT).then(function () {
        var items = takeNext(PAGE_COUNT);
        if (items.length) grid.insertAdjacentHTML('beforeend', items.map(card).join(''));
        btn.disabled = false;
        if (shown >= pool.length && generalDone) btn.style.display = 'none';
      });
    }
    btn.addEventListener('click', more);
    return more();
  }

  function init() {
    var top = document.querySelector('[data-blog-biz="top"]');
    var bottom = document.querySelector('[data-blog-biz="bottom"]');
    if (!top && !bottom) return;
    injectStyles();
    // El bloque de abajo espera al de arriba para no repetir fichas
    var p = top ? renderTop(top) : Promise.resolve();
    if (bottom) p.then(function () { renderBottom(bottom); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
