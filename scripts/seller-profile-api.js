// functions/api/seller-profile/index.js
// GET: Get seller profile (own or by user_id param)
// PUT: Update own seller profile
// POST: Create seller profile (auto on first access)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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

// GET: Get seller profile
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
    const profileUserId = url.searchParams.get('user_id');

    const targetUserId = profileUserId
      ? (currentUser.role === 'admin' ? parseInt(profileUserId) : currentUser.id)
      : currentUser.id;

    if (!profileUserId && currentUser.role !== 'seller') {
      return new Response(JSON.stringify({ error: 'Solo vendedores tienen perfil de vendedor' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sellers_profiles (
        user_id INTEGER PRIMARY KEY,
        store_name TEXT,
        description TEXT,
        avatar TEXT,
        cover_photo TEXT,
        address TEXT,
        city TEXT DEFAULT 'Mérida',
        state TEXT DEFAULT 'Mérida',
        phone TEXT,
        whatsapp TEXT,
        instagram TEXT,
        facebook TEXT,
        tiktok TEXT,
        rating REAL DEFAULT 0,
        total_sales INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`).run();
    } catch (e) {}

    let profile = await env.DB.prepare('SELECT * FROM sellers_profiles WHERE user_id = ?').bind(targetUserId).first();

    if (!profile) {
      if (targetUserId === currentUser.id || currentUser.role === 'admin') {
        const userData = await env.DB.prepare('SELECT name, phone, whatsapp FROM users WHERE id = ?').bind(targetUserId).first();
        await env.DB.prepare(
          'INSERT INTO sellers_profiles (user_id, store_name, phone, whatsapp, city, state) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          targetUserId,
          userData?.name || '',
          userData?.phone || '',
          userData?.whatsapp || '',
          'Mérida',
          'Mérida'
        ).run();
        profile = await env.DB.prepare('SELECT * FROM sellers_profiles WHERE user_id = ?').bind(targetUserId).first();
      }
    }

    const user = await env.DB.prepare(
      'SELECT id, name, email, phone, whatsapp, avatar, bio, role FROM users WHERE id = ?'
    ).bind(targetUserId).first();

    return new Response(JSON.stringify({
      profile: profile || {},
      user: user || {},
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seller profile GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// PUT: Update seller profile
export async function onRequestPut(context) {
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

    if (currentUser.role !== 'seller' && currentUser.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo vendedores pueden actualizar su perfil' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sellers_profiles (
        user_id INTEGER PRIMARY KEY, store_name TEXT, description TEXT, avatar TEXT, cover_photo TEXT,
        address TEXT, city TEXT DEFAULT 'Mérida', state TEXT DEFAULT 'Mérida', phone TEXT, whatsapp TEXT,
        instagram TEXT, facebook TEXT, tiktok TEXT, rating REAL DEFAULT 0, total_sales INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
      )`).run();
    } catch (e) {}

    const existing = await env.DB.prepare('SELECT user_id FROM sellers_profiles WHERE user_id = ?').bind(currentUser.id).first();
    if (!existing) {
      await env.DB.prepare(
        'INSERT INTO sellers_profiles (user_id, store_name, phone, whatsapp, city, state) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(currentUser.id, currentUser.name || '', currentUser.phone || '', currentUser.whatsapp || '', 'Mérida', 'Mérida').run();
    }

    const allowedFields = ['store_name', 'description', 'avatar', 'cover_photo', 'address', 'city', 'state', 'phone', 'whatsapp', 'instagram', 'facebook', 'tiktok'];
    const setClauses = [];
    const bindings = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        bindings.push(body[field]);
      }
    }

    if (setClauses.length === 0) {
      return new Response(JSON.stringify({ error: 'No se proporcionaron campos para actualizar' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    setClauses.push("updated_at = datetime('now')");
    bindings.push(currentUser.id);

    await env.DB.prepare(`UPDATE sellers_profiles SET ${setClauses.join(', ')} WHERE user_id = ?`).bind(...bindings).run();

    if (body.avatar) {
      await env.DB.prepare("UPDATE users SET avatar = ?, updated_at = datetime('now') WHERE id = ?").bind(body.avatar, currentUser.id).run();
    }

    const profile = await env.DB.prepare('SELECT * FROM sellers_profiles WHERE user_id = ?').bind(currentUser.id).first();

    return new Response(JSON.stringify({
      message: 'Perfil de vendedor actualizado exitosamente',
      profile,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seller profile PUT error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST: Create seller profile
export async function onRequestPost(context) {
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

    try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sellers_profiles (
        user_id INTEGER PRIMARY KEY, store_name TEXT, description TEXT, avatar TEXT, cover_photo TEXT,
        address TEXT, city TEXT DEFAULT 'Mérida', state TEXT DEFAULT 'Mérida', phone TEXT, whatsapp TEXT,
        instagram TEXT, facebook TEXT, tiktok TEXT, rating REAL DEFAULT 0, total_sales INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
      )`).run();
    } catch (e) {}

    const existing = await env.DB.prepare('SELECT user_id FROM sellers_profiles WHERE user_id = ?').bind(currentUser.id).first();
    if (existing) {
      return new Response(JSON.stringify({ error: 'El perfil de vendedor ya existe. Usa PUT para actualizarlo.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare(
      'INSERT INTO sellers_profiles (user_id, store_name, phone, whatsapp, city, state) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(currentUser.id, currentUser.name || '', currentUser.phone || '', currentUser.whatsapp || '', 'Mérida', 'Mérida').run();

    const profile = await env.DB.prepare('SELECT * FROM sellers_profiles WHERE user_id = ?').bind(currentUser.id).first();

    return new Response(JSON.stringify({
      message: 'Perfil de vendedor creado exitosamente',
      profile,
    }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seller profile POST error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}