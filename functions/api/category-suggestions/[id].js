// functions/api/category-suggestions/[id].js
// PUT: Approve or reject a category suggestion (admin only)
// Approving creates the category automatically

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
  const data = headerB64 + '.' + payloadB64;
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

async function requireAdmin(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const jwtSecret = env.JWT_SECRET || 'en-santiago_default_secret_2024';
  const user = await verifyJWT(token, jwtSecret);
  if (!user || user.role !== 'admin') return null;
  return user;
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

export async function onRequestPut(context) {
  try {
    const { request, env, params } = context;
    const admin = await requireAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ error: 'No autorizado.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sugId = parseInt(params.id);
    if (isNaN(sugId)) {
      return new Response(JSON.stringify({ error: 'ID invalido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { action, icon, color, tipo_negocio_id } = body; // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Accion invalida. Usa "approve" o "reject".' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const suggestion = await env.DB.prepare('SELECT * FROM category_suggestions WHERE id = ?').bind(sugId).first();
    if (!suggestion) {
      return new Response(JSON.stringify({ error: 'Sugerencia no encontrada.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reject') {
      await env.DB.prepare(
        "UPDATE category_suggestions SET status = 'rejected', resolved_at = datetime('now') WHERE id = ?"
      ).bind(sugId).run();
      return new Response(JSON.stringify({ message: 'Sugerencia rechazada.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Approve: create the category
    const slug = slugify(suggestion.category_name);
    const existingCat = await env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(slug).first();
    if (existingCat) {
      await env.DB.prepare(
        "UPDATE category_suggestions SET status = 'approved', resolved_at = datetime('now') WHERE id = ?"
      ).bind(sugId).run();
      return new Response(JSON.stringify({ message: 'Categoria ya existia. Sugerencia marcada como aprobada.', category_id: existingCat.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const insertResult = await env.DB.prepare(
      'INSERT INTO categories (name, slug, icon, color, sort_order, is_active, tipo_negocio_id) VALUES (?, ?, ?, ?, 99, 1, ?)'
    ).bind(suggestion.category_name, slug, icon || 'fas fa-store', color || '#607d8b', tipo_negocio_id ? parseInt(tipo_negocio_id) : null).run();

    await env.DB.prepare(
      "UPDATE category_suggestions SET status = 'approved', resolved_at = datetime('now') WHERE id = ?"
    ).bind(sugId).run();

    const newCat = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(insertResult.meta.last_row_id).first();

    return new Response(JSON.stringify({
      message: 'Categoria creada exitosamente a partir de la sugerencia.',
      category: newCat,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Category suggestion PUT error:', error);
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}