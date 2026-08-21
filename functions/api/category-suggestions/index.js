// functions/api/category-suggestions/index.js
// GET: List category suggestions (admin only)
// POST: Submit category suggestion (public, auth optional)

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

async function getUser(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';
  return await verifyJWT(token, jwtSecret);
}

async function requireAdmin(request, env) {
  const user = await getUser(request, env);
  if (!user || user.role !== 'admin') return null;
  return user;
}

// ─── GET: List category suggestions (admin only) ────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
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

    const result = await env.DB.prepare(
      'SELECT cs.*, u.name as user_name, u.email as user_email FROM category_suggestions cs LEFT JOIN users u ON cs.user_id = u.id ORDER BY cs.created_at DESC LIMIT 100'
    ).all();

    return new Response(JSON.stringify({ suggestions: result.results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Category suggestions GET error:', error);
    if (error.message && error.message.includes('no such table')) {
      return new Response(JSON.stringify({ error: 'La tabla category_suggestions no existe. Ejecuta: CREATE TABLE category_suggestions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, category_name TEXT NOT NULL, reason TEXT, status TEXT DEFAULT \'pending\', created_at TEXT DEFAULT (datetime(\'now\')), resolved_at TEXT, FOREIGN KEY (user_id) REFERENCES users(id))', suggestions: [] }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Submit category suggestion ───────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { category_name, reason } = body;

    if (!category_name || !category_name.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre de la categoria es requerido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (category_name.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'El nombre debe tener al menos 3 caracteres.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = await getUser(request, env);

    // Check if already suggested recently (avoid spam)
    const recentCheck = await env.DB.prepare(
      "SELECT id FROM category_suggestions WHERE LOWER(category_name) = ? AND status = 'pending' LIMIT 1"
    ).bind(category_name.trim().toLowerCase()).first();
    if (recentCheck) {
      return new Response(JSON.stringify({ error: 'Esta categoria ya fue sugerida y esta pendiente de revision.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await env.DB.prepare(
      'INSERT INTO category_suggestions (user_id, category_name, reason, status) VALUES (?, ?, ?, ?)'
    ).bind(
      user ? user.id : null,
      category_name.trim(),
      (reason || '').trim() || null,
      'pending'
    ).run();

    return new Response(JSON.stringify({
      message: 'Solicitud enviada. El administrador la revisara pronto.',
      suggestion_id: result.meta.last_row_id,
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Category suggestion POST error:', error);
    if (error.message && error.message.includes('no such table')) {
      return new Response(JSON.stringify({ error: 'Tabla no disponible. Contacta al administrador.', debug: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}