// functions/negocio/[slug].js
// Legacy route: redirects ALL businesses to /:tipo/:categoria/:slug format

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    function slugify(text) {
      if (!text) return '';
      return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Check if tipos_negocio exists, use appropriate query
    let business;
    try {
      business = await env.DB.prepare(
        `SELECT b.slug, b.business_type, c.slug as category_slug,
          tn.slug as tipo_negocio_slug
         FROM businesses b
         LEFT JOIN categories c ON b.category_id = c.id
         LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
         WHERE b.slug = ? AND b.status = 'approved'`
      ).bind(slug).first();
    } catch (e) {
      // tipos_negocio table doesn't exist yet
      business = await env.DB.prepare(
        `SELECT b.slug, b.business_type, c.slug as category_slug
         FROM businesses b
         LEFT JOIN categories c ON b.category_id = c.id
         WHERE b.slug = ? AND b.status = 'approved'`
      ).bind(slug).first();
    }

    if (business) {
      const tipo = business.tipo_negocio_slug || slugify(business.business_type || 'negocio');
      const cat = business.category_slug || 'otro';
      return new Response('', {
        status: 301,
        headers: { 'Location': '/' + tipo + '/' + cat + '/' + business.slug },
      });
    }

    // Fallback: try by numeric ID
    const numericSlug = parseInt(slug);
    if (!isNaN(numericSlug)) {
      let byId;
      try {
        byId = await env.DB.prepare(
          `SELECT b.slug, b.business_type, c.slug as category_slug,
            tn.slug as tipo_negocio_slug
           FROM businesses b
           LEFT JOIN categories c ON b.category_id = c.id
           LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
           WHERE b.id = ? AND b.status = 'approved'`
        ).bind(numericSlug).first();
      } catch (e) {
        byId = await env.DB.prepare(
          `SELECT b.slug, b.business_type, c.slug as category_slug
           FROM businesses b
           LEFT JOIN categories c ON b.category_id = c.id
           WHERE b.id = ? AND b.status = 'approved'`
        ).bind(numericSlug).first();
      }
      if (byId) {
        const tipo = byId.tipo_negocio_slug || slugify(byId.business_type || 'negocio');
        const cat = byId.category_slug || 'otro';
        return new Response('', {
          status: 301,
          headers: { 'Location': '/' + tipo + '/' + cat + '/' + byId.slug },
        });
      }
    }

    return new Response('<h1>Negocio no encontrado</h1><p>El negocio que buscas no existe o fue eliminado.</p>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    console.error('Negocio redirect error:', error);
    return new Response('Error interno del servidor', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}