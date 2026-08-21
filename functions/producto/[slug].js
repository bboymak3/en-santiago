// functions/producto/[slug].js
// Legacy route: redirects ALL products to /producto/:tipo/:slug format

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

    // Look up product by slug
    const product = await env.DB.prepare(
      `SELECT p.slug, p.category
       FROM products p
       WHERE p.slug = ? AND (p.status = 'approved' OR p.status IS NULL)`
    ).bind(slug).first();

    if (product) {
      const tipo = slugify(product.category || 'general');
      return new Response('', {
        status: 301,
        headers: { 'Location': `/producto/${tipo}/${product.slug}` },
      });
    }

    // Fallback: try by numeric ID
    const numericSlug = parseInt(slug);
    if (!isNaN(numericSlug)) {
      const byId = await env.DB.prepare(
        `SELECT p.slug, p.category
         FROM products p
         WHERE p.id = ? AND (p.status = 'approved' OR p.status IS NULL)`
      ).bind(numericSlug).first();
      if (byId && byId.slug) {
        const tipo = slugify(byId.category || 'general');
        return new Response('', {
          status: 301,
          headers: { 'Location': `/producto/${tipo}/${byId.slug}` },
        });
      }
    }

    return new Response('<h1>Producto no encontrado</h1><p>El producto que buscas no existe o fue eliminado.</p>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    console.error('Producto redirect error:', error);
    return new Response('Error interno del servidor', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}