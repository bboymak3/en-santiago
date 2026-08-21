// functions/api/bazar/index.js
// GET: List bazar responses (admin: all, user: own) or check if user responded
// POST: Save bazar response (user)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  return verifyJWT(authHeader.substring(7), env.JWT_SECRET || 'aunclick_jwt_secret_2024_secure');
}

// Ensure table exists
async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS bazar_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_id INTEGER,
      response TEXT NOT NULL CHECK(response IN ('si','no')),
      source TEXT NOT NULL DEFAULT 'profile',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

// ─── GET ────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB no disponible' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await ensureTable(env);

    const url = new URL(request.url);
    const user = await getUserFromRequest(request, env);

    // Admin: list all responses with user/business info
    if (user && user.role === 'admin') {
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
      const offset = (page - 1) * limit;
      const filter = url.searchParams.get('response') || '';

      let whereClause = '1=1';
      const bindings = [];
      if (filter && (filter === 'si' || filter === 'no')) {
        whereClause += ' AND br.response = ?';
        bindings.push(filter);
      }

      const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM bazar_responses br WHERE ${whereClause}`).bind(...bindings).first();

      const rows = await env.DB.prepare(`
        SELECT br.*,
               u.name as user_name, u.email as user_email,
               b.title as business_title
        FROM bazar_responses br
        LEFT JOIN users u ON br.user_id = u.id
        LEFT JOIN businesses b ON br.business_id = b.id
        WHERE ${whereClause}
        ORDER BY br.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(...bindings, limit, offset).all();

      return new Response(JSON.stringify({
        responses: rows.results,
        stats: {
          total: countResult.total,
          si: countResult.total, // will recalc
          no: 0,
        },
        pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) },
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Authenticated user: check if already responded (include created_at for 15-day cooldown)
    if (user) {
      const existing = await env.DB.prepare(
        'SELECT id, response, created_at FROM bazar_responses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(user.id).first();
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const isWithinCooldown = existing && existing.created_at && existing.created_at >= fifteenDaysAgo;
      return new Response(JSON.stringify({
        responded: !!existing,
        response: existing?.response || null,
        responded_at: existing?.created_at || null,
        within_cooldown: !!isWithinCooldown
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Bazar GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno', debug: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ─── POST ───────────────────────────────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB no disponible' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const user = await getUserFromRequest(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Token requerido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await ensureTable(env);

    const body = await request.json();
    const { response, business_id, source } = body;

    if (response !== 'si' && response !== 'no') {
      return new Response(JSON.stringify({ error: 'Respuesta inválida. Debe ser "si" o "no".' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check if bazar is enabled
    const setting = await env.DB.prepare("SELECT value FROM admin_settings WHERE key = 'bazar_enabled'").first();
    if (!setting || setting.value !== '1') {
      return new Response(JSON.stringify({ error: 'La función de Bazar está desactivada actualmente.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check if user already responded (allow re-response but update existing)
    const existing = await env.DB.prepare(
      'SELECT id FROM bazar_responses WHERE user_id = ? AND (? IS NULL OR business_id = ?) ORDER BY created_at DESC LIMIT 1'
    ).bind(user.id, business_id || null, business_id || null).first();

    if (existing) {
      await env.DB.prepare('UPDATE bazar_responses SET response = ?, source = ?, created_at = datetime(\'now\') WHERE id = ?')
        .bind(response, source || 'profile', existing.id).run();
    } else {
      await env.DB.prepare('INSERT INTO bazar_responses (user_id, business_id, response, source) VALUES (?, ?, ?, ?)')
        .bind(user.id, business_id || null, response, source || 'profile').run();
    }

    return new Response(JSON.stringify({ message: 'Respuesta guardada', response }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bazar POST error:', error);
    return new Response(JSON.stringify({ error: 'Error interno', debug: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}