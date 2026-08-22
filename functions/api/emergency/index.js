// functions/api/emergency/index.js
// GET: List emergency services (filter by state, category; active only; check emergency_enabled)
// POST: Create emergency service (admin only)

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

// ─── GET: List emergency services ─────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible. Verifica el binding D1 en Cloudflare Pages.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if emergency feature is enabled
    try {
      const setting = await env.DB.prepare("SELECT value FROM admin_settings WHERE key = 'emergency_enabled'").first();
      if (setting && setting.value === '0') {
        return new Response(JSON.stringify({ error: 'La función de servicios de emergencia está deshabilitada', services: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // If admin_settings table doesn't exist, proceed anyway
    }

    const url = new URL(request.url);
    const params = url.searchParams;

    const state = params.get('state');
    const category = params.get('category');
    const search = params.get('search');
    const page = parseInt(params.get('page')) || 1;
    const limit = Math.min(parseInt(params.get('limit')) || 20, 50);
    const offset = (page - 1) * limit;

    // Build conditions — only active services
    const conditions = ['is_active = 1'];
    const bindings = [];

    if (state) {
      conditions.push('state = ?');
      bindings.push(state);
    }

    if (category) {
      conditions.push('category = ?');
      bindings.push(category);
    }

    if (search) {
      conditions.push('(name LIKE ? OR address LIKE ? OR city LIKE ? OR notes LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Count total matching services
    const countQuery = `SELECT COUNT(*) as total FROM emergency_services WHERE ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    // Fetch emergency services
    const query = `
      SELECT *
      FROM emergency_services
      WHERE ${whereClause}
      ORDER BY
        CASE WHEN category = 'policia' THEN 1
             WHEN category = 'bomberos' THEN 2
             WHEN category = 'ambulancia' THEN 3
             WHEN category = 'hospital' THEN 4
             ELSE 5
        END,
        name ASC
      LIMIT ? OFFSET ?
    `;

    const services = await env.DB.prepare(query).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      services: services.results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Emergency GET error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de emergency_services no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create emergency service (admin only) ────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible. Verifica el binding D1 en Cloudflare Pages.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin only
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo los administradores pueden crear servicios de emergencia' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    // Required fields
    const { name, category } = body;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre del servicio es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validCategories = [
      'policia', 'bomberos', 'ambulancia', 'hospital', 'defensa_civil',
      'proteccion_civil', 'cruz_roja', 'centro_salud', 'urgencias',
      'gas_natual', 'electricidad', 'agua', 'otro',
    ];

    if (!category || !validCategories.includes(category)) {
      return new Response(JSON.stringify({
        error: 'Categoría inválida',
        validCategories,
        received: category,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert emergency service
    const result = await env.DB.prepare(`
      INSERT INTO emergency_services (
        name, category, phone, address, city, state,
        lat, lng, is_24h, website, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      name.trim(),
      category,
      body.phone || null,
      body.address || null,
      body.city || null,
      body.state || null,
      body.lat || null,
      body.lng || null,
      body.is_24h ? 1 : 0,
      body.website || null,
      body.notes || null,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
    ).run();

    const serviceId = result.meta.last_row_id;

    return new Response(JSON.stringify({
      message: 'Servicio de emergencia creado exitosamente',
      service_id: serviceId,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Emergency POST error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de emergency_services no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
