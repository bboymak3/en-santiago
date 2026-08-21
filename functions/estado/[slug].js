// functions/comuna/[slug].js
// GET: SEO-indexable state page at /comuna/:slug
// Lists all approved businesses, products, jobs, properties in a state

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    const baseUrl = 'https://en-santiago.pages.dev';

    // Santiago de Chilen states map
    const STATES = {
      'distrito-capital': 'Distrito Capital',
      'amazonas': 'Amazonas',
      'anzoategui': 'Anzoátegui',
      'apure': 'Apure',
      'aragua': 'Aragua',
      'santiago': 'Santiago',
      'bolivar': 'Bolívar',
      'carabobo': 'Carabobo',
      'cojedes': 'Cojedes',
      'delta-amacuro': 'Delta Amacuro',
      'falcon': 'Falcón',
      'guarico': 'Guárico',
      'lara': 'Lara',
      'santiago': 'Mérida',
      'miranda': 'Miranda',
      'monagas': 'Monagas',
      'nueva-esparta': 'Nueva Esparta',
      'portuguesa': 'Portuguesa',
      'sucre': 'Sucre',
      'tachira': 'Táchira',
      'trujillo': 'Trujillo',
      'vargas': 'Vargas',
      'yaracuy': 'Yaracuy',
      'zulia': 'Zulia',
    };

    const decodedSlug = decodeURIComponent(slug).toLowerCase();
    let stateName = STATES[decodedSlug];

    // Fallback: try matching from DB
    if (!stateName) {
      const dbState = await env.DB.prepare(
        `SELECT DISTINCT state FROM businesses WHERE LOWER(state) LIKE ? AND status = 'approved' LIMIT 1`
      ).bind('%' + slug.replace(/-/g, '%') + '%').first();
      if (dbState && dbState.state) {
        stateName = dbState.state;
      }
    }

    if (!stateName) {
      return new Response('<h1>Comuna no encontrado</h1><p>El comuna que buscas no está disponible.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const canonicalUrl = `${baseUrl}/comuna/${decodedSlug}`;
    const stateDesc = `Directorio completo de negocios, productos, inmuebles y empleos en ${stateName}, Santiago de Chile. Encuentra todo lo que necesitas en ${stateName}.`;

    // Fetch businesses
    let businesses;
    try {
      businesses = await env.DB.prepare(
        `SELECT b.id, b.title, b.slug, b.city, b.phone, b.whatsapp,
                b.business_type,
                c.name as category_name, c.slug as category_slug,
                tn.slug as tipo_negocio_slug,
                (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
                b.featured
         FROM businesses b
         LEFT JOIN categories c ON b.category_id = c.id
         LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
         WHERE LOWER(b.state) = LOWER(?) AND b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != ''
         ORDER BY b.featured DESC, b.created_at DESC
         LIMIT 50`
      ).bind(stateName).all();
    } catch (joinErr) {
      businesses = await env.DB.prepare(
        `SELECT b.id, b.title, b.slug, b.city, b.phone, b.whatsapp,
                b.business_type,
                c.name as category_name, c.slug as category_slug,
                (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
                b.featured
         FROM businesses b
         LEFT JOIN categories c ON b.category_id = c.id
         WHERE LOWER(b.state) = LOWER(?) AND b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != ''
         ORDER BY b.featured DESC, b.created_at DESC
         LIMIT 50`
      ).bind(stateName).all();
    }

    // Fetch categories with counts in this state
    const catCounts = await env.DB.prepare(
      `SELECT c.name, c.slug, c.icon, COUNT(b.id) as count
       FROM businesses b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE LOWER(b.state) = LOWER(?) AND b.status = 'approved'
       GROUP BY b.category_id
       ORDER BY count DESC
       LIMIT 20`
    ).bind(stateName).all();

    // Fetch cities with counts
    const cityCounts = await env.DB.prepare(
      `SELECT b.city, COUNT(*) as count
       FROM businesses b
       WHERE LOWER(b.state) = LOWER(?) AND b.status = 'approved' AND b.city IS NOT NULL AND b.city != ''
       GROUP BY b.city
       ORDER BY count DESC
       LIMIT 20`
    ).bind(stateName).all();

    const totalBiz = businesses.results ? businesses.results.length : 0;

    // Build category chips
    const catChips = (catCounts.results || []).map(c => {
      if (!c.name) return '';
      const catSlug = c.slug || c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `<a href="/categoria/${catSlug}" class="est-cat-chip"><i class="${c.icon || 'fas fa-tag'}"></i> ${esc(c.name)} <span class="est-count">${c.count}</span></a>`;
    }).join('');

    // Build city chips
    const cityChips = (cityCounts.results || []).map(c => {
      if (!c.city) return '';
      return `<span class="est-city-chip"><i class="fas fa-map-pin"></i> ${esc(c.city)} <span class="est-count">${c.count}</span></span>`;
    }).join('');

    // Build business cards
    const bizCards = (businesses.results || []).map(b => {
      const img = b.cover_image || '';
      const tipo = b.tipo_negocio_slug || (b.business_type || 'negocio').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const cat = b.category_slug || 'otro';
      return `
        <a href="${esc('/' + tipo + '/' + cat + '/' + b.slug)}" class="est-biz-card">
          <div class="est-biz-img">
            ${img ? `<img src="${esc(img)}" alt="${esc(b.title)}" loading="lazy" onerror="this.style.display='none'">` : `<div class="est-biz-ph"><i class="fas fa-store"></i></div>`}
            ${b.featured ? '<span class="est-biz-featured"><i class="fas fa-star"></i></span>' : ''}
          </div>
          <div class="est-biz-body">
            <div class="est-biz-title">${esc(b.title)}</div>
            <div class="est-biz-loc"><i class="fas fa-map-marker-alt"></i> ${esc(b.city || stateName)}</div>
            ${b.category_name ? `<div class="est-biz-cat"><i class="fas fa-tag"></i> ${esc(b.category_name)}</div>` : ''}
          </div>
        </a>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TMH9V9QQ');</script>
<!-- End Google Tag Manager -->
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-RYF2N8ZD15"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-RYF2N8ZD15');
</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/jpeg" href="/images/favicon.jpeg">
    <title>Negocios en ${esc(stateName)} - Directorio En Santiago Santiago de Chile</title>
    <meta name="description" content="${esc(stateDesc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="Negocios en ${esc(stateName)} - En Santiago">
    <meta property="og:description" content="${esc(stateDesc)}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="En Santiago">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Negocios en ${esc(stateName)} - En Santiago">

    <!-- JSON-LD -->
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `Negocios en ${stateName}`,
      "description": stateDesc,
      "url": canonicalUrl,
      "isPartOf": { "@type": "WebSite", "name": "En Santiago", "url": "https://en-santiago.pages.dev" }
    })}</script>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://en-santiago.pages.dev/" },
        { "@type": "ListItem", "position": 2, "name": stateName, "item": canonicalUrl }
      ]
    })}</script>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `Negocios en ${stateName}`,
      "numberOfItems": totalBiz,
      "itemListElement": (businesses.results || []).slice(0, 20).map((b, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": b.title,
        "url": `https://en-santiago.pages.dev/${b.tipo_negocio_slug || (b.business_type || 'negocio').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}/${b.category_slug || 'otro'}/${b.slug}`
      }))
    })}</script>

    <link rel="stylesheet" href="/css/styles.css?v=4">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        body { background: #f5f5f5; margin: 0; font-family: system-ui, -apple-system, sans-serif; }
        .est-nav { background: #fff; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .est-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 16px; display: flex; align-items: center; height: 60px; }
        .est-nav-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; font-size: 1.2rem; font-weight: 800; color: #006EE3; }
        .est-hero { background: linear-gradient(135deg, #0a0f1a 0%, #1e293b 100%); padding: 60px 20px 50px; text-align: center; color: #fff; }
        .est-hero-icon { width: 64px; height: 64px; border-radius: 18px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin: 0 auto 20px; color: #38bdf8; }
        .est-hero h1 { font-size: 2.2rem; font-weight: 800; margin: 0 0 12px; }
        .est-hero p { font-size: 1.05rem; color: rgba(255,255,255,0.7); max-width: 600px; margin: 0 auto 20px; line-height: 1.6; }
        .est-hero-stats { display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; }
        .est-hero-stat { text-align: center; }
        .est-hero-stat-val { font-size: 1.5rem; font-weight: 800; color: #fbbf24; }
        .est-hero-stat-lbl { font-size: 0.75rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px; }
        .est-breadcrumb { max-width: 1200px; margin: 0 auto; padding: 16px 20px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #94a3b8; }
        .est-breadcrumb a { color: #006EE3; text-decoration: none; }
        .est-breadcrumb a:hover { text-decoration: underline; }
        .est-content { max-width: 1200px; margin: 0 auto; padding: 0 20px 60px; }
        .est-section-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
        .est-section-title i { color: #006EE3; }
        .est-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
        .est-cat-chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 0.85rem; color: #475569; text-decoration: none; transition: all 0.2s; font-weight: 500; }
        .est-cat-chip:hover { border-color: #006EE3; color: #006EE3; background: #f0f7ff; }
        .est-city-chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 0.85rem; color: #475569; }
        .est-count { background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; color: #64748b; font-weight: 600; }
        .est-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .est-biz-card { background: #fff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb; text-decoration: none; color: inherit; transition: all 0.2s; display: block; }
        .est-biz-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); border-color: #006EE3; }
        .est-biz-img { position: relative; aspect-ratio: 3/4; overflow: hidden; background: #f0f0f0; }
        .est-biz-img img { width: 100%; height: 100%; object-fit: contain; object-position: center; }
        .est-biz-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 2.5rem; }
        .est-biz-featured { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 26px; height: 26px; background: #fbbf24; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .est-biz-body { padding: 8px 10px 10px; }
        .est-biz-title { font-size: 0.78rem; font-weight: 700; color: #1e293b; margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .est-biz-loc { font-size: 0.65rem; color: #64748b; margin: 0 0 3px; }
        .est-biz-loc i { font-size: 0.55rem; }
        .est-biz-cat { font-size: 0.6rem; color: #006EE3; margin: 0; }
        .est-biz-cat i { font-size: 0.5rem; }
        .est-empty { text-align: center; padding: 60px 20px; color: #94a3b8; }
        .est-footer { background: #0f172a; color: #94a3b8; text-align: center; padding: 30px 20px; font-size: 0.82rem; }
        .est-footer a { color: #006EE3; }
        @media (max-width: 1024px) { .est-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) {
            .est-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .est-hero { padding: 40px 16px 36px; }
            .est-hero h1 { font-size: 1.6rem; }
        }
    </style>
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TMH9V9QQ"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
    <nav class="est-nav">
        <div class="est-nav-inner">
            <a href="/" class="est-nav-logo">
                <img src="/images/favicon.jpeg" alt="En Santiago" style="height:32px;width:auto;border-radius:6px;">
                En Santiago
            </a>
        </div>
    </nav>

    <section class="est-hero">
        <div class="est-hero-icon"><i class="fas fa-map-marked-alt"></i></div>
        <h1>Negocios en ${esc(stateName)}</h1>
        <p>${esc(stateDesc)}</p>
        <div class="est-hero-stats">
            <div class="est-hero-stat"><div class="est-hero-stat-val">${totalBiz}</div><div class="est-hero-stat-lbl">Negocios</div></div>
            <div class="est-hero-stat"><div class="est-hero-stat-val">${(catCounts.results || []).length}</div><div class="est-hero-stat-lbl">Categorías</div></div>
            <div class="est-hero-stat"><div class="est-hero-stat-val">${(cityCounts.results || []).length}</div><div class="est-hero-stat-lbl">Ciudades</div></div>
        </div>
    </section>

    <div class="est-breadcrumb">
        <a href="/">Inicio</a> <span>/</span>
        <span>${esc(stateName)}</span>
    </div>

    <div class="est-content">
        ${catChips ? `
        <div class="est-section-title"><i class="fas fa-tags"></i> Categorías en ${esc(stateName)}</div>
        <div class="est-chips">${catChips}</div>
        ` : ''}

        ${cityChips ? `
        <div class="est-section-title"><i class="fas fa-city"></i> Ciudades</div>
        <div class="est-chips">${cityChips}</div>
        ` : ''}

        <div class="est-section-title"><i class="fas fa-th-large"></i> Todos los negocios en ${esc(stateName)}</div>
        ${totalBiz > 0 ? `
        <div class="est-grid">${bizCards}</div>
        ` : `
        <div class="est-empty">
            <i class="fas fa-store-slash"></i>
            <p>Aún no hay negocios registrados en ${esc(stateName)}.</p>
            <a href="/new-business.html" style="color:#006EE3;font-weight:600;margin-top:12px;display:inline-block;">Sé el primero en publicar</a>
        </div>
        `}
    </div>

    <footer class="est-footer">
        <p>&copy; ${new Date().getFullYear()} <a href="/">En Santiago</a> — Directorio de Negocios en Santiago de Chile</p>
      <p><a href="https://maps.app.goo.gl/Jz2QTADrNNneQtGd9" target="_blank" rel="noopener noreferrer">Página web desarrollada por Grupo 360 Soluciones</a></p>
      <p><a href="http://coporo.pages.dev/" target="_blank" rel="noopener noreferrer">Diseño de páginas webs - SEO Local -</a></p>
    </footer>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Link': `<${canonicalUrl}>; rel="canonical"`,
      },
    });
  } catch (error) {
    console.error('[comuna] Error:', error);
    return new Response('Error interno del servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}