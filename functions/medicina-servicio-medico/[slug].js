// functions/medicina-servicio-medico/[slug].js
// Legacy route: redirects to /:tipo/:categoria/:slug format

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

    const business = await env.DB.prepare(
      `SELECT b.slug, b.business_type, c.slug as category_slug
       FROM businesses b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.slug = ? AND b.status = 'approved'`
    ).bind(slug).first();

    if (business) {
      const tipo = slugify(business.business_type || 'negocio');
      const cat = business.category_slug || 'medicina-servicio-medico';
      return new Response('', {
        status: 301,
        headers: { 'Location': `/${tipo}/${cat}/${business.slug}` },
      });
    }

    return new Response('<h1>Negocio no encontrado</h1><p>El negocio que buscas no existe o fue eliminado.</p>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    console.error('Medicina redirect error:', error);
    return new Response('Error interno del servidor', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}