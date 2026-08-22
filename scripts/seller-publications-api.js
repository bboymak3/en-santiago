// functions/api/seller-publications/index.js
// GET: Get all publications by a specific seller (admin or self)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  return JSON.parse(atob(base64));
}

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let sigBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
  const sigPad = sigBase64.length % 4;
  if (sigPad) sigBase64 += '='.repeat(4 - sigPad);
  const sigBytes = Uint8Array.from(atob(sigBase64), (c) => c.charCodeAt(0));
  const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
  if (!isValid) return null;
  const payload = base64urlDecode(payloadB64);
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const currentUser = await verifyJWT(token, env.JWT_SECRET || 'aunclick_default_secret_2024');
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const sellerId = url.searchParams.get('seller_id');

    if (!sellerId) {
      return new Response(JSON.stringify({ error: 'seller_id es requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only admin or the seller themself
    if (currentUser.role !== 'admin' && String(currentUser.id) !== String(sellerId)) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sid = parseInt(sellerId);

    // Get businesses
    const businesses = await env.DB.prepare(
      "SELECT id, title, category_id, city, state, status, views, created_at, 'business' as type FROM businesses WHERE user_id = ? OR created_by_seller = ? ORDER BY created_at DESC"
    ).bind(sid, sid).all();

    // Get products
    const products = await env.DB.prepare(
      "SELECT id, name, price, category, status, created_at, 'product' as type FROM products WHERE user_id = ? ORDER BY created_at DESC"
    ).bind(sid).all();

    // Get job listings
    const jobs = await env.DB.prepare(
      "SELECT id, title, job_type, state, city, status, views, created_at, 'job' as type FROM job_listings WHERE user_id = ? ORDER BY created_at DESC"
    ).bind(sid).all();

    // Get properties (inmuebles)
    const properties = await env.DB.prepare(
      "SELECT id, title, property_type, operation_type, price, state, city, status, views, created_at, 'property' as type FROM properties WHERE user_id = ? ORDER BY created_at DESC"
    ).bind(sid).all();

    // Get category names for businesses
    const categories = await env.DB.prepare('SELECT id, name FROM categories').all();
    const catMap = {};
    if (categories.results) {
      for (const c of categories.results) catMap[c.id] = c.name;
    }

    const bizResults = (businesses.results || []).map(b => ({
      ...b,
      category_name: catMap[b.category_id] || 'Sin categoría',
    }));

    return new Response(JSON.stringify({
      seller_id: sid,
      businesses: bizResults,
      products: products.results || [],
      jobs: jobs.results || [],
      properties: properties.results || [],
      totals: {
        businesses: (businesses.results || []).length,
        products: (products.results || []).length,
        jobs: (jobs.results || []).length,
        properties: (properties.results || []).length,
      },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seller publications GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}