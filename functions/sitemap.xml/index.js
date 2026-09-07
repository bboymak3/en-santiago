// functions/sitemap.xml/index.js
// GET: Generate dynamic XML sitemap for SEO (no auth required)
// FIX: Limpiado de estados de Venezuela, agregadas páginas faltantes, lastmod en estáticas

export async function onRequestGet(context) {
  try {
    const { env } = context;
    const baseUrl = 'https://en-santiago.pages.dev';

    // FIX: Páginas estáticas con lastmod automático (fecha de hoy)
    const today = new Date().toISOString().substring(0, 10);
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/search.html', priority: '0.9', changefreq: 'daily' },
      { loc: '/planes.html', priority: '0.9', changefreq: 'monthly' },
      { loc: '/marketplace.html', priority: '0.8', changefreq: 'daily' },
      { loc: '/properties.html', priority: '0.8', changefreq: 'daily' },
      { loc: '/map.html', priority: '0.8', changefreq: 'weekly' },
      { loc: '/empleo.html', priority: '0.7', changefreq: 'daily' },
      { loc: '/new-business.html', priority: '0.7', changefreq: 'monthly' },
      { loc: '/registrar-negocio.html', priority: '0.9', changefreq: 'monthly' },
      { loc: '/new-property.html', priority: '0.7', changefreq: 'monthly' },
      { loc: '/contacto.html', priority: '0.6', changefreq: 'monthly' },
      { loc: '/quienes-somos.html', priority: '0.6', changefreq: 'yearly' },
      { loc: '/partners.html', priority: '0.6', changefreq: 'monthly' },
      { loc: '/academia.html', priority: '0.6', changefreq: 'weekly' },
      { loc: '/entretenimiento.html', priority: '0.6', changefreq: 'weekly' },
      { loc: '/reservas.html', priority: '0.6', changefreq: 'weekly' },
      { loc: '/cupones.html', priority: '0.6', changefreq: 'weekly' },
      { loc: '/emergencia.html', priority: '0.5', changefreq: 'monthly' },
      { loc: '/eventos.html', priority: '0.5', changefreq: 'weekly' },
      { loc: '/privacidad.html', priority: '0.3', changefreq: 'yearly' },
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

    // FIX: Fetch all comunas (states) with businesses — sin hardcode de estados de Venezuela
    // La consulta anterior tenía un CASE WHEN con estados de Venezuela (Anzoátegui, Bolívar, etc.)
    // que no aplican a Chile. Ahora usa slugify dinámico en JavaScript.
    try {
      const states = await env.DB.prepare(
        `SELECT DISTINCT state, MAX(updated_at) as last_updated
         FROM businesses
         WHERE status = 'approved' AND state IS NOT NULL AND state != ''
         GROUP BY state
         ORDER BY last_updated DESC`
      ).all();

      function slugifyState(text) {
        if (!text) return '';
        return text.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      for (const st of states.results) {
        if (!st.state) continue;
        const stateSlug = slugifyState(st.state);
        if (!stateSlug) continue;
        const lastmod = st.last_updated ? st.last_updated.substring(0, 10) : '';
        dynamicUrls += `  <url>
    <loc>${baseUrl}/comuna/${stateSlug}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.6</priority>
    <changefreq>weekly</changefreq>
  </url>\n`;
      }
    } catch (e) {
      // States may not exist
    }

    // Build static page URLs with lastmod
    let staticUrls = '';
    for (const page of staticPages) {
      staticUrls += `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
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
