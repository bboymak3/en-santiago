// functions/api/property-favorites/index.js
// GET: List user's favorited properties
// POST: Add favorite
// DELETE: Remove favorite

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

// GET: List user's favorites
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const jwtSecret = env.JWT_SECRET || 'aunclick_jwt_secret_2024';
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const favorites = await env.DB.prepare(`
      SELECT pf.*, p.title, p.property_type, p.operation_type, p.price, p.currency, p.city, p.status,
        (SELECT url FROM property_images WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image
      FROM property_favorites pf
      JOIN properties p ON pf.property_id = p.id
      WHERE pf.user_id = ?
      ORDER BY pf.created_at DESC
    `).bind(payload.id).all();

    return new Response(JSON.stringify({ favorites: favorites.results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST: Add favorite
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const jwtSecret = env.JWT_SECRET || 'aunclick_jwt_secret_2024';
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { property_id } = body;
    if (!property_id) {
      return new Response(JSON.stringify({ error: 'property_id requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already favorited
    const existing = await env.DB.prepare('SELECT id FROM property_favorites WHERE user_id = ? AND property_id = ?').bind(payload.id, property_id).first();
    if (existing) {
      return new Response(JSON.stringify({ message: 'Ya está en favoritos', favorited: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare('INSERT INTO property_favorites (user_id, property_id) VALUES (?, ?)').bind(payload.id, property_id).run();

    return new Response(JSON.stringify({ message: 'Agregado a favoritos', favorited: true }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// DELETE: Remove favorite
export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const jwtSecret = env.JWT_SECRET || 'aunclick_jwt_secret_2024';
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const propertyId = url.searchParams.get('property_id');
    if (!propertyId) {
      return new Response(JSON.stringify({ error: 'property_id requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare('DELETE FROM property_favorites WHERE user_id = ? AND property_id = ?').bind(payload.id, propertyId).run();

    return new Response(JSON.stringify({ message: 'Eliminado de favoritos', favorited: false }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
