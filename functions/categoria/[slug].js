// functions/categoria/[slug].js
// GET: SEO-indexable category page at /categoria/:slug
// Lists all approved businesses in a category with H1, description, JSON-LD

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Auto-migrate: add banner_url column if missing (same as /api/categories)
    try { await env.DB.prepare('ALTER TABLE categories ADD COLUMN banner_url TEXT').run(); } catch(e) {}

    const baseUrl = 'https://en-santiago.pages.dev';

    // Look up category by slug
    const category = await env.DB.prepare(
      `SELECT * FROM categories WHERE slug = ?`
    ).bind(slug).first();

    if (!category) {
      // FIX: If the requested slug doesn't match any row, try to find a category
      // whose slugify(name) matches — this catches renamed categories where
      // external links still point to the OLD slug.
      //
      // Example: admin renames "Tapizados de Volantes" (slug: tapizados-de-volantes)
      //          to "Tapizar IA" (new slug: tapizar-ia). Old Google links still
      //          point to /categoria/tapizados-de-volantes. We try to find it by
      //          slugify(name) first, and also by an alternative slug-match pass.
      const decodedSlug = decodeURIComponent(slug);

      // Pass 1: try matching by slugify(name) — handles cases where slug was
      // never regenerated but name was changed
      const allCats = await env.DB.prepare(
        `SELECT * FROM categories ORDER BY name ASC`
      ).all();
      const match = (allCats.results || []).find(c => {
        const catSlug = (c.name || '').toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return catSlug === decodedSlug;
      });

      if (match) {
        // 301 redirect to the canonical URL with the current slug
        return new Response('', {
          status: 301,
          headers: { 'Location': `/categoria/${match.slug}` },
        });
      }

      return new Response('<h1>Categoría no encontrada</h1><p>La categoría que buscas no existe.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Fetch approved businesses in this category
    let businesses;
    try {
      businesses = await env.DB.prepare(
        `SELECT b.id, b.title, b.slug, b.description, b.city, b.state, b.phone, b.whatsapp,
                b.logo, b.business_type,
                c.name as category_name, c.slug as category_slug,
                tn.slug as tipo_negocio_slug, tn.name as tipo_negocio_name,
                (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
                b.featured, b.views
         FROM businesses b
         LEFT JOIN categories c ON b.category_id = c.id
         LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
         WHERE b.category_id = ? AND b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != ''
         ORDER BY b.featured DESC, b.views DESC
         LIMIT 100`
      ).bind(category.id).all();
    } catch (joinErr) {
      // Fallback without tipos_negocio join
      businesses = await env.DB.prepare(
        `SELECT b.id, b.title, b.slug, b.description, b.city, b.state, b.phone, b.whatsapp,
                b.logo, b.business_type,
                c.name as category_name, c.slug as category_slug,
                (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
                b.featured, b.views
         FROM businesses b
         LEFT JOIN categories c ON b.category_id = c.id
         WHERE b.category_id = ? AND b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != ''
         ORDER BY b.featured DESC, b.views DESC
         LIMIT 100`
      ).bind(category.id).all();
    }

    const catName = category.name || 'Categoría';
    const catIcon = category.icon || 'fas fa-tag';
    const catDescription = `Directorio de ${catName.toLowerCase()} en Santiago de Chile. Encuentra los mejores negocios de ${catName.toLowerCase()} con información de contacto, ubicación, servicios y más.`;
    const canonicalUrl = `${baseUrl}/categoria/${category.slug}`;
    const totalBiz = businesses.results ? businesses.results.length : 0;

    // Count by state for this category
    const stateCounts = await env.DB.prepare(
      `SELECT b.state, COUNT(*) as count
       FROM businesses b
       WHERE b.category_id = ? AND b.status = 'approved'
       GROUP BY b.state
       ORDER BY count DESC
       LIMIT 15`
    ).bind(category.id).all();

    // Helper to build SEO URL segments for a business
    function bizTipo(b) {
      return b.tipo_negocio_slug || (b.business_type || 'negocio').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Build business cards HTML
    const bizCards = (businesses.results || []).map(b => {
      const desc = b.description ? b.description.substring(0, 120) + (b.description.length > 120 ? '...' : '') : '';
      const img = b.cover_image || b.logo || '';
      const waNum = (b.whatsapp || b.phone || '').replace(/[^0-9]/g, '');
      const tipo = bizTipo(b);
      const cat = b.category_slug || 'otro';
      return `
        <a href="${esc('/' + tipo + '/' + cat + '/' + b.slug)}" class="cat-biz-card">
          <div class="cat-biz-img">
            ${img ? `<img src="${esc(img)}" alt="${esc(b.title)}" loading="lazy" onerror="this.style.display='none'">` : `<div class="cat-biz-ph"><i class="fas fa-store"></i></div>`}
            ${b.featured ? '<span class="cat-biz-featured"><i class="fas fa-star"></i></span>' : ''}
          </div>
          <div class="cat-biz-body">
            <div class="cat-biz-title">${esc(b.title)}</div>
            <div class="cat-biz-loc"><i class="fas fa-map-marker-alt"></i> ${esc(b.city || '')}${b.state ? ', ' + esc(b.state) : ''}</div>
            ${desc ? `<div class="cat-biz-desc">${esc(desc)}</div>` : ''}
          </div>
        </a>`;
    }).join('');

    // Build state links
    const stateLinks = (stateCounts.results || []).map(s => {
      if (!s.state) return '';
      const stateSlug = s.state.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `<a href="/comuna/${stateSlug}" class="cat-state-chip"><i class="fas fa-map-marker-alt"></i> ${esc(s.state)} <span class="cat-state-count">${s.count}</span></a>`;
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
    <title>${esc(catName)} en Santiago de Chile - Directorio En Santiago</title>
    <meta name="description" content="${esc(catDescription)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(catName)} en Santiago de Chile - En Santiago">
    <meta property="og:description" content="${esc(catDescription)}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="En Santiago">
    <meta property="og:locale" content="es_CL">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${esc(catName)} en Santiago de Chile - En Santiago">
    <meta name="twitter:description" content="${esc(catDescription)}">

    <!-- JSON-LD: CollectionPage + BreadcrumbList -->
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `${catName} en Santiago de Chile`,
      "description": catDescription,
      "url": canonicalUrl,
      "isPartOf": {
        "@type": "WebSite",
        "name": "En Santiago",
        "url": "https://en-santiago.pages.dev"
      }
    })}</script>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://en-santiago.pages.dev/" },
        { "@type": "ListItem", "position": 2, "name": "Negocios", "item": "https://en-santiago.pages.dev/search.html" },
        { "@type": "ListItem", "position": 3, "name": catName, "item": canonicalUrl }
      ]
    })}</script>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `${catName} en Santiago de Chile`,
      "numberOfItems": totalBiz,
      "itemListElement": (businesses.results || []).slice(0, 20).map((b, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": b.title,
        "url": baseUrl + '/' + bizTipo(b) + '/' + (b.category_slug || 'otro') + '/' + b.slug
      }))
    })}</script>

    <link rel="stylesheet" href="/css/styles.css?v=4">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        body { background: #f5f5f5; margin: 0; font-family: system-ui, -apple-system, sans-serif; }
        .cat-nav { background: #fff; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .cat-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 16px; display: flex; align-items: center; height: 60px; }
        .cat-nav-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; font-size: 1.2rem; font-weight: 800; color: #006EE3; }
        .cat-nav-logo:hover { opacity: 0.9; }
        /* Hero: solo banner (sin capa gris, sin texto visible). H1 queda oculto para SEO. */
        .cat-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        .cat-hero { position: relative; width: 100%; background: #f5f5f5; overflow: hidden; margin: 0; padding: 0; line-height: 0; }
        .cat-hero-banner { display: block; width: 100%; height: auto; max-height: 480px; object-fit: cover; object-position: center; }
        @media (max-width: 1024px) { .cat-hero-banner { max-height: 360px; } }
        @media (max-width: 768px)  { .cat-hero-banner { max-height: 240px; } }
        @media (max-width: 480px)  { .cat-hero-banner { max-height: 160px; } }
        .cat-breadcrumb { max-width: 1200px; margin: 0 auto; padding: 16px 20px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #94a3b8; }
        .cat-breadcrumb a { color: #006EE3; text-decoration: none; }
        .cat-breadcrumb a:hover { text-decoration: underline; }
        .cat-content { max-width: 1200px; margin: 0 auto; padding: 0 20px 60px; }
        .cat-section-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
        .cat-section-title i { color: #006EE3; }
        .cat-states { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
        .cat-state-chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 0.85rem; color: #475569; text-decoration: none; transition: all 0.2s; font-weight: 500; }
        .cat-state-chip:hover { border-color: #006EE3; color: #006EE3; background: #f0f7ff; }
        .cat-state-count { background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; color: #64748b; font-weight: 600; }
        .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .cat-biz-card { background: #fff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb; text-decoration: none; color: inherit; transition: all 0.2s; display: block; }
        .cat-biz-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); border-color: #006EE3; }
        .cat-biz-img { position: relative; aspect-ratio: 3/4; overflow: hidden; background: #f0f0f0; }
        .cat-biz-img img { width: 100%; height: 100%; object-fit: contain; object-position: center; }
        .cat-biz-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 2.5rem; }
        .cat-biz-featured { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 26px; height: 26px; background: #fbbf24; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .cat-biz-body { padding: 8px 10px 10px; }
        .cat-biz-title { font-size: 0.78rem; font-weight: 700; color: #1e293b; margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cat-biz-loc { font-size: 0.65rem; color: #64748b; margin: 0 0 3px; }
        .cat-biz-loc i { font-size: 0.55rem; }
        .cat-biz-desc { font-size: 0.6rem; color: #94a3b8; line-height: 1.4; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .cat-empty { text-align: center; padding: 60px 20px; color: #94a3b8; }
        .cat-empty i { font-size: 3rem; margin-bottom: 16px; display: block; }
        .cat-footer { background: #0f172a; color: #94a3b8; text-align: center; padding: 30px 20px; font-size: 0.82rem; }
        .cat-footer a { color: #006EE3; }
        @media (max-width: 1024px) { .cat-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) {
            .cat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .cat-content { padding: 0 12px 40px; }
        }
    </style>
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TMH9V9QQ"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
    <nav class="cat-nav">
        <div class="cat-nav-inner">
            <a href="/" class="cat-nav-logo">
                <img src="/images/favicon.jpeg" alt="En Santiago" style="height:32px;width:auto;border-radius:6px;">
                En Santiago
            </a>
        </div>
    </nav>

    <!-- H1 oculto visualmente, preservado para SEO -->
    <h1 class="cat-sr-only">${esc(catName)} en Santiago de Chile</h1>

    ${category.banner_url ? `
    <section class="cat-hero">
        <img src="${esc(category.banner_url)}" alt="${esc(catName)}" class="cat-hero-banner" loading="eager" decoding="async">
    </section>
    ` : ''}

    <div class="cat-breadcrumb">
        <a href="/">Inicio</a> <span>/</span>
        <a href="/search.html">Negocios</a> <span>/</span>
        <span>${esc(catName)}</span>
    </div>

    <div class="cat-content">
        ${stateLinks ? `
        <div class="cat-section-title"><i class="fas fa-map"></i> Filtrar por comuna</div>
        <div class="cat-states">${stateLinks}</div>
        ` : ''}

        <div class="cat-section-title"><i class="fas fa-th-large"></i> Todos los negocios</div>
        ${totalBiz > 0 ? `
        <div class="cat-grid">${bizCards}</div>
        ` : `
        <div class="cat-empty">
            <i class="fas fa-store-slash"></i>
            <p>Aún no hay negocios registrados en esta categoría.</p>
            <a href="/new-business.html" style="color:#006EE3;font-weight:600;margin-top:12px;display:inline-block;">Publica tu negocio aquí</a>
        </div>
        `}
    </div>

    <footer class="cat-footer">
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
    console.error('[categoria] Error:', error);
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