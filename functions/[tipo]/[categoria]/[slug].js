// functions/[tipo]/[categoria]/[slug].js
// Universal business detail route: /:tipo-de-negocio/:categoria/:nombre-negocio
// SEO-friendly URL structure for ALL businesses

import { renderBusinessPage } from '../../_lib/render-business.js';

function slugify(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const SITE_URL = 'https://en-santiago.pages.dev';

// Simple query without tipos_negocio JOIN (safe fallback)
const BIZ_SIMPLE = `SELECT
  b.*,
  c.name as category_name, c.slug as category_slug,
  (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
  (SELECT COUNT(*) FROM images WHERE business_id = b.id) as image_count
FROM businesses b
LEFT JOIN categories c ON b.category_id = c.id`;

// Full query with tipos_negocio JOIN
const BIZ_FULL = `SELECT
  b.*,
  c.name as category_name, c.slug as category_slug,
  c.tipo_negocio_id,
  tn.slug as tipo_negocio_slug, tn.name as tipo_negocio_name,
  (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
  (SELECT COUNT(*) FROM images WHERE business_id = b.id) as image_count
FROM businesses b
LEFT JOIN categories c ON b.category_id = c.id
LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id`;

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { tipo, categoria, slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Check if tipos_negocio table exists
    let hasTiposTable = false;
    try {
      await env.DB.prepare('SELECT 1 FROM tipos_negocio LIMIT 1').first();
      hasTiposTable = true;
    } catch (e) { /* table doesn't exist yet */ }

    // Look up the category by slug (still needed for breadcrumb context, but NOT for filtering)
    let catRow;
    try {
      catRow = await env.DB.prepare(
        'SELECT id, slug, name FROM categories WHERE slug = ? AND is_active = 1'
      ).bind(categoria).first();
    } catch (e) {
      catRow = null;
    }
    // catRow is no longer used for SQL filtering; the business lookup is by slug only.

    // FIX: NO filtrar por categoria en la query SQL.
    // Antes era: WHERE b.slug = ? AND c.id = ? (con el category_id de la URL)
    // Eso rompia cuando el business fue movido a otra categoria: la URL vieja
    // tenia la categoria anterior, la query no encontraba el business, y daba 404.
    // Ahora buscamos solo por slug, y si la URL no coincide con la categoria
    // actual del business, hacemos 301 redirect a la URL canonica nueva.
    let business;

    async function queryBusiness(query, ...bindArgs) {
      return env.DB.prepare(query).bind(...bindArgs).first();
    }

    const whereClause = ' WHERE b.slug = ? AND b.status = \'approved\'';
    const bindArgs = [slug];

    // Try BIZ_FULL first, fall back to BIZ_SIMPLE
    try {
      if (hasTiposTable) {
        business = await queryBusiness(BIZ_FULL + whereClause, ...bindArgs);
      } else {
        business = await queryBusiness(BIZ_SIMPLE + whereClause, ...bindArgs);
      }
    } catch (e) {
      // BIZ_FULL failed (e.g. tipo_negocio_id column missing), try simple
      try {
        business = await queryBusiness(BIZ_SIMPLE + whereClause, ...bindArgs);
      } catch (e2) {
        business = null;
      }
    }

    if (!business) {
      // Fallback: try by numeric ID
      const numericSlug = parseInt(slug);
      if (!isNaN(numericSlug)) {
        try {
          const byId = await env.DB.prepare(
            BIZ_SIMPLE + ' WHERE b.id = ? AND b.status = \'approved\''
          ).bind(numericSlug).first();
          if (byId) {
            const correctTipo = byId.tipo_negocio_slug || slugify(byId.business_type || 'negocio');
            const correctCat = byId.category_slug || 'otro';
            return new Response('', {
              status: 301,
              headers: { 'Location': '/' + correctTipo + '/' + correctCat + '/' + byId.slug },
            });
          }
        } catch (e) { /* ignore fallback errors */ }
      }

      return new Response('<h1>Negocio no encontrado</h1><p>El negocio que buscas no existe o fue eliminado.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Verify URL segments match the business data — redirect if wrong
    const correctTipo = business.tipo_negocio_slug || slugify(business.business_type || 'negocio');
    const correctCat = business.category_slug || 'otro';

    if (tipo !== correctTipo || categoria !== correctCat) {
      return new Response('', {
        status: 301,
        headers: { 'Location': '/' + correctTipo + '/' + correctCat + '/' + business.slug },
      });
    }

    // Build the canonical URL and path prefix
    const pathPrefix = '/' + tipo + '/' + categoria;
    const canonicalUrl = SITE_URL + pathPrefix + '/' + business.slug;

    // Fetch reviews for rich snippets (AggregateRating)
    let reviews = [];
    let avgRating = 0;
    let reviewCount = 0;
    try {
      // Get total count and average first
      const stats = await env.DB.prepare(
        'SELECT COALESCE(AVG(rating), 0) as avg, COUNT(*) as cnt FROM reviews WHERE business_id = ? AND rating IS NOT NULL AND rating > 0'
      ).bind(business.id).first();
      reviewCount = stats?.cnt || 0;
      avgRating = stats?.avg || 0;
      // Get up to 5 most recent for Review snippets
      if (reviewCount > 0) {
        const reviewRows = await env.DB.prepare(
          'SELECT rating, comment, name, created_at FROM reviews WHERE business_id = ? AND rating IS NOT NULL AND rating > 0 ORDER BY created_at DESC LIMIT 5'
        ).bind(business.id).all();
        reviews = reviewRows.results || [];
      }
    } catch (e) { /* reviews table may not exist */ }

    // Build breadcrumbs
    const tipoLabel = business.tipo_negocio_name || (business.business_type || 'Negocio').charAt(0).toUpperCase() + (business.business_type || 'negocio').slice(1);

    return renderBusinessPage(env, business, {
      pathPrefix: pathPrefix,
      canonicalUrl: canonicalUrl,
      sectionLabel: business.category_name || tipoLabel,
      tipoLabel: tipoLabel,
      reviews: reviews,
      avgRating: avgRating,
      reviewCount: reviewCount,
      categoryBreadcrumb: business.category_name ? {
        name: business.category_name,
        url: SITE_URL + '/categoria/' + business.category_slug,
      } : null,
      tipoBreadcrumb: {
        name: tipoLabel,
        url: SITE_URL + '/' + correctTipo,
      },
    });

  } catch (error) {
    console.error('Business dynamic route error:', error);
    return new Response('Error interno del servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}