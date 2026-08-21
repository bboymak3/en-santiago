// functions/api/businesses/[id]/services/index.js
// GET: List all services for a business (public)
// POST: Create a service (auth required, owner or admin)

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

async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyJWT(token, env.JWT_SECRET);
}

// Ensure table exists
async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS business_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `).run();
}

// ─── GET: List all services for a business ──────────────────────
export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { id } = params;

    await ensureTable(env);

    // Verify business exists
    const business = await env.DB.prepare('SELECT id FROM businesses WHERE id = ?').bind(id).first();
    if (!business) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const services = await env.DB.prepare(
      'SELECT * FROM business_services WHERE business_id = ? ORDER BY sort_order ASC, id ASC'
    ).bind(id).all();

    return new Response(JSON.stringify({ services: services.results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create a service ─────────────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env, params } = context;
    const { id } = params;

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await ensureTable(env);

    // Check business exists
    const business = await env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(id).first();
    if (!business) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check authorization: owner or admin
    if (user.role !== 'admin' && user.id !== business.user_id) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para agregar servicios a este negocio' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    if (!body.title || !body.title.trim()) {
      return new Response(JSON.stringify({ error: 'El título del servicio es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get next sort_order
    const maxOrder = await env.DB.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM business_services WHERE business_id = ?'
    ).bind(id).first();
    const sortOrder = body.sort_order !== undefined ? parseInt(body.sort_order) : maxOrder.next_order;

    const result = await env.DB.prepare(`
      INSERT INTO business_services (business_id, title, description, sort_order)
      VALUES (?, ?, ?, ?)
    `).bind(
      parseInt(id),
      body.title.trim(),
      body.description || '',
      sortOrder
    ).run();

    const serviceId = result.meta.last_row_id;
    const service = await env.DB.prepare(
      'SELECT * FROM business_services WHERE id = ?'
    ).bind(serviceId).first();

    return new Response(JSON.stringify({
      service,
      message: 'Servicio creado',
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}