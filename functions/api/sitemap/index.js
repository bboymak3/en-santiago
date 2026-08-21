// functions/api/sitemap/index.js
// GET: Generate dynamic XML sitemap for SEO (no auth required)

export async function onRequestGet(context) {
  try {
    const { env } = context;
    const baseUrl = 'https://holax.com.ve';

    // All public-facing pages (ordered by priority)
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/search.html', priority: '0.9', changefreq: 'daily' },
      { loc: '/marketplace.html', priority: '0.8', changefreq: 'daily' },
      { loc: '/map.html', priority: '0.8', changefreq: 'weekly' },
      { loc: '/empleo.html', priority: '0.7', changefreq: 'daily' },
      { loc: '/new-business.html', priority: '0.7', changefreq: 'monthly' },
      { loc: '/entretenimiento.html', priority: '0.7', changefreq: 'weekly' },
      { loc: '/reservas.html', priority: '0.7', changefreq: 'weekly' },
      { loc: '/cupones.html', priority: '0.7', changefreq: 'weekly' },
      { loc: '/emergencia.html', priority: '0.6', changefreq: 'monthly' },
      { loc: '/eventos.html', priority: '0.6', changefreq: 'weekly' },
      { loc: '/privacidad.html', priority: '0.4', changefreq: 'yearly' },
      { loc: '/eliminacion-datos.html', priority: '0.3', changefreq: 'yearly' },
      { loc: '/login.html', priority: '0.3', changefreq: 'monthly' },
    ];

    let dynamicUrls = '';

    // Fetch all approved businesses with slugs
    try {
      let businesses;
      try {
        businesses = await env.DB.prepare(
          "SELECT b.slug, b.business_type, b.updated_at, c.slug as category_slug, tn.slug as tipo_slug FROM businesses b LEFT JOIN categories c ON b.category_id = c.id LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id WHERE b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != '' ORDER BY b.updated_at DESC"
        ).all();
      } catch (joinErr) {
        businesses = await env.DB.prepare(
          "SELECT b.slug, b.business_type, b.updated_at, c.slug as category_slug FROM businesses b LEFT JOIN categories c ON b.category_id = c.id WHERE b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != '' ORDER BY b.updated_at DESC"
        ).all();
      }

      function slugify(text) {
        if (!text) return '';
        return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }

      for (const biz of businesses.results) {
        const lastmod = biz.updated_at ? biz.updated_at.substring(0, 10) : '';
        const tipo = biz.tipo_slug || slugify(biz.business_type || 'negocio');
        const cat = biz.category_slug || 'otro';
        dynamicUrls += `  <url>
    <loc>${baseUrl}/${tipo}/${cat}/${biz.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>\n`;
      }

      // Also add legacy redirect URLs for businesses without slug
      const businessesLegacy = await env.DB.prepare(
        "SELECT id, slug, updated_at FROM businesses WHERE status = 'approved' AND (slug IS NULL OR slug = '') ORDER BY updated_at DESC"
      ).all();

      for (const biz of businessesLegacy.results) {
        const lastmod = biz.updated_at ? biz.updated_at.substring(0, 10) : '';
        dynamicUrls += `  <url>
    <loc>${baseUrl}/negocio/${biz.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.5</priority>
    <changefreq>monthly</changefreq>
  </url>\n`;
      }
    } catch (e) {
      // Table may not exist yet — skip
    }

    // Fetch all approved products with slugs
    try {
      const products = await env.DB.prepare(
        "SELECT slug, category, updated_at FROM products WHERE (status = 'approved' OR status IS NULL) AND slug IS NOT NULL AND slug != '' ORDER BY updated_at DESC"
      ).all();

      for (const prod of products.results) {
        const lastmod = prod.updated_at ? prod.updated_at.substring(0, 10) : '';
        const tipo = slugify(prod.category || 'general');
        dynamicUrls += `  <url>
    <loc>${baseUrl}/producto/${tipo}/${prod.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.7</priority>
    <changefreq>weekly</changefreq>
  </url>\n`;
      }
    } catch (e) {
      // Products table may not have slug column yet
    }

    // Fetch all categories with businesses
    try {
      const categories = await env.DB.prepare(
        `SELECT c.slug, MAX(b.updated_at) as last_updated
         FROM categories c
         INNER JOIN businesses b ON b.category_id = c.id AND b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != ''
         GROUP BY c.id
         ORDER BY last_updated DESC`
      ).all();

      for (const cat of categories.results) {
        const lastmod = cat.last_updated ? cat.last_updated.substring(0, 10) : '';
        dynamicUrls += `  <url>
    <loc>${baseUrl}/categoria/${cat.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.7</priority>
    <changefreq>weekly</changefreq>
  </url>\n`;
      }
    } catch (e) {
      // Categories may not exist
    }

    // Fetch all states with businesses
    try {
      const states = await env.DB.prepare(
        `SELECT LOWER(REPLACE(REPLACE(
           CASE state
             WHEN 'Anzoátegui' THEN 'anzoategui'
             WHEN 'Bolívar' THEN 'bolivar'
             WHEN 'Carabobo' THEN 'carabobo'
             WHEN 'Falcón' THEN 'falcon'
             WHEN 'Guárico' THEN 'guarico'
             WHEN 'Mérida' THEN 'merida'
             WHEN 'Miranda' THEN 'miranda'
             WHEN 'Monagas' THEN 'monagas'
             WHEN 'Nueva Esparta' THEN 'nueva-esparta'
             WHEN 'Portuguesa' THEN 'portuguesa'
             WHEN 'Sucre' THEN 'sucre'
             WHEN 'Táchira' THEN 'tachira'
             WHEN 'Trujillo' THEN 'trujillo'
             WHEN 'Yaracuy' THEN 'yaracuy'
             WHEN 'Zulia' THEN 'zulia'
             WHEN 'Barinas' THEN 'barinas'
             WHEN 'Aragua' THEN 'aragua'
             WHEN 'Lara' THEN 'lara'
             WHEN 'Vargas' THEN 'vargas'
             WHEN 'Distrito Capital' THEN 'distrito-capital'
             WHEN 'Amazonas' THEN 'amazonas'
             WHEN 'Apure' THEN 'apure'
             WHEN 'Cojedes' THEN 'cojedes'
             WHEN 'Delta Amacuro' THEN 'delta-amacuro'
             ELSE LOWER(REPLACE(state, ' ', '-'))
           END
         , 'á','a'), 'é','e'), 'í','i'), 'ó','o'), 'ú','u'), 'ñ','n') as state_slug,
           MAX(b.updated_at) as last_updated
         FROM businesses b
         WHERE b.status = 'approved' AND b.state IS NOT NULL AND b.state != ''
         GROUP BY b.state
         ORDER BY last_updated DESC`
      ).all();

      for (const st of states.results) {
        if (!st.state_slug) continue;
        const lastmod = st.last_updated ? st.last_updated.substring(0, 10) : '';
        dynamicUrls += `  <url>
    <loc>${baseUrl}/estado/${st.state_slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.6</priority>
    <changefreq>weekly</changefreq>
  </url>\n`;
      }
    } catch (e) {
      // States may not exist
    }

    // Build static page URLs
    let staticUrls = '';
    for (const page of staticPages) {
      staticUrls += `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <priority>${page.priority}</priority>
    <changefreq>${page.changefreq}</changefreq>
  </url>\n`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticUrls}${dynamicUrls}</urlset>`;

    return new Response(xml.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return new Response('Error generating sitemap', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
