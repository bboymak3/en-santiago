// functions/producto/[tipo]/[slug].js
// PRIMARY product route: /producto/:tipo-de-producto/:nombre-producto
// SEO-friendly URL structure for all products

import { renderProductPage } from '../../_lib/render-product.js';

const SITE_URL = 'https://holax.com.ve';

function slugify(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Valid product types (maps to the `category` field in products table)
const VALID_PRODUCT_TYPES = ['general', 'vehiculos', 'inmuebles', 'electronica', 'servicios', 'ropa', 'hogar'];

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { tipo, slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Look up product by slug
    const product = await env.DB.prepare(
      `SELECT p.*,
              b.title as business_name, b.slug as business_slug, b.business_type, b.city, b.state,
              b.phone as business_phone, b.whatsapp as business_whatsapp,
              b.instagram as business_instagram, b.facebook as business_facebook,
              b.twitter as business_twitter, b.tiktok as business_tiktok,
              b.youtube as business_youtube, b.video_url as business_video_url,
              b.logo as business_logo,
              c.slug as category_slug
       FROM products p
       LEFT JOIN businesses b ON p.business_id = b.id
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE p.slug = ? AND (p.status = 'approved' OR p.status IS NULL)`
    ).bind(slug).first();

    if (!product) {
      // Fallback: try by numeric ID
      const numericSlug = parseInt(slug);
      if (!isNaN(numericSlug)) {
        const byId = await env.DB.prepare(
          `SELECT p.*, b.title as business_name, b.slug as business_slug,
                  b.business_type, b.city, b.state, b.whatsapp as business_whatsapp,
                  b.instagram as business_instagram, b.facebook as business_facebook,
                  b.twitter as business_twitter, b.tiktok as business_tiktok,
                  b.youtube as business_youtube, b.video_url as business_video_url,
                  b.logo as business_logo,
                  c.slug as category_slug
           FROM products p
           LEFT JOIN businesses b ON p.business_id = b.id
           LEFT JOIN categories c ON b.category_id = c.id
           WHERE p.id = ? AND (p.status = 'approved' OR p.status IS NULL)`
        ).bind(numericSlug).first();
        if (byId && byId.slug) {
          const correctTipo = slugify(byId.category || 'general');
          return new Response('', {
            status: 301,
            headers: { 'Location': `/producto/${correctTipo}/${byId.slug}` },
          });
        }
      }

      return new Response('<h1>Producto no encontrado</h1><p>El producto que buscas no existe o fue eliminado.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Verify URL tipo matches product category — redirect if wrong
    const correctTipo = slugify(product.category || 'general');
    if (tipo !== correctTipo) {
      return new Response('', {
        status: 301,
        headers: { 'Location': `/producto/${correctTipo}/${product.slug}` },
      });
    }

    // Build canonical URL
    const canonicalUrl = `${SITE_URL}/producto/${correctTipo}/${product.slug}`;

    return renderProductPage(env, product, {
      canonicalUrl: canonicalUrl,
      productTypeSlug: correctTipo,
    });

  } catch (error) {
    console.error('Product [tipo]/[slug] route error:', error);
    return new Response('Error interno del servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}