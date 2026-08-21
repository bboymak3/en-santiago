// functions/api/video-carousel/index.js
// GET: List active videos (public) or all videos (admin)
// POST: Add video (admin only)
// DELETE: Remove video (admin only)

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
  return verifyJWT(authHeader.substring(7), env.JWT_SECRET || 'aunclick_jwt_secret_2024_secure');
}

async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS video_carousel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT DEFAULT '',
      thumbnail_url TEXT DEFAULT '',
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      business_id INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
  // Auto-migrate: add business_id column if missing
  try { await env.DB.prepare('ALTER TABLE video_carousel ADD COLUMN business_id INTEGER DEFAULT NULL').run(); } catch(e) {}
}

// ─── GET ────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB no disponible' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await ensureTable(env);

    const url = new URL(request.url);
    const isAdminParam = url.searchParams.get('admin') === 'true';
    const user = await getUserFromRequest(request, env);

    if (isAdminParam && user && user.role === 'admin') {
      // Admin: all videos with business name
      const rows = await env.DB.prepare(`
        SELECT vc.*, b.title as business_title
        FROM video_carousel vc
        LEFT JOIN businesses b ON vc.business_id = b.id
        ORDER BY vc.order_index ASC, vc.id DESC
      `).all();
      return new Response(JSON.stringify({ videos: rows.results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Public: only active videos
    const rows = await env.DB.prepare('SELECT id, url, title, thumbnail_url, order_index FROM video_carousel WHERE is_active = 1 ORDER BY order_index ASC, id DESC').all();
    return new Response(JSON.stringify({ videos: rows.results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Video carousel GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno', debug: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ─── POST: Add video (admin) ────────────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB no disponible' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const user = await getUserFromRequest(request, env);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await ensureTable(env);

    const body = await request.json();
    const { url, title, thumbnail_url, order_index, business_id } = body;

    if (!url || !url.trim()) {
      return new Response(JSON.stringify({ error: 'La URL del video es requerida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const result = await env.DB.prepare(
      'INSERT INTO video_carousel (url, title, thumbnail_url, order_index, business_id) VALUES (?, ?, ?, ?, ?)'
    ).bind(url.trim(), (title || '').trim(), (thumbnail_url || '').trim(), parseInt(order_index) || 0, business_id ? parseInt(business_id) : null).run();

    return new Response(JSON.stringify({ message: 'Video agregado', id: result.meta.last_row_id }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Video carousel POST error:', error);
    return new Response(JSON.stringify({ error: 'Error interno', debug: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ─── PUT: Toggle video active (admin) ─────────────────────────
export async function onRequestPut(context) {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB no disponible' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const user = await getUserFromRequest(request, env);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await request.json();
    if (body.is_active !== undefined) {
      await env.DB.prepare('UPDATE video_carousel SET is_active = ? WHERE id = ?').bind(body.is_active ? 1 : 0, parseInt(id)).run();
    }
    if (body.title !== undefined) {
      await env.DB.prepare('UPDATE video_carousel SET title = ? WHERE id = ?').bind(body.title, parseInt(id)).run();
    }
    if (body.order_index !== undefined) {
      await env.DB.prepare('UPDATE video_carousel SET order_index = ? WHERE id = ?').bind(parseInt(body.order_index), parseInt(id)).run();
    }
    if (body.url !== undefined) {
      await env.DB.prepare('UPDATE video_carousel SET url = ? WHERE id = ?').bind(body.url, parseInt(id)).run();
    }
    if (body.thumbnail_url !== undefined) {
      await env.DB.prepare('UPDATE video_carousel SET thumbnail_url = ? WHERE id = ?').bind(body.thumbnail_url, parseInt(id)).run();
    }

    return new Response(JSON.stringify({ message: 'Video actualizado' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Video carousel PUT error:', error);
    return new Response(JSON.stringify({ error: 'Error interno', debug: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ─── DELETE: Remove video (admin) ───────────────────────────────
export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB no disponible' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const user = await getUserFromRequest(request, env);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await env.DB.prepare('DELETE FROM video_carousel WHERE id = ?').bind(parseInt(id)).run();

    return new Response(JSON.stringify({ message: 'Video eliminado' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Video carousel DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Error interno', debug: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}