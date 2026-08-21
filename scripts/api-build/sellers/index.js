// functions/api/sellers/index.js
// GET: List sellers (admin) or own managed users (seller)
// POST: Create seller account (admin only)

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

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64url(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(header);
  const payloadB64 = base64url(payload);
  const data = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureB64 = base64url(String.fromCharCode(...new Uint8Array(signature)));
  return `${data}.${signatureB64}`;
}

// GET: List sellers
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
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search');

    if (currentUser.role === 'admin') {
      let query = `
        SELECT u.id, u.name, u.email, u.phone, u.whatsapp, u.avatar, u.role,
               u.is_active, u.plan, u.plan_starts_at, u.plan_expires_at, u.created_at,
               (SELECT COUNT(*) FROM users mu WHERE mu.seller_owner_id = u.id) as managed_users_count,
               (SELECT COUNT(*) FROM businesses b WHERE b.created_by_seller = u.id) as businesses_count
        FROM users u
        WHERE u.role = 'seller'
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE role = ?';
      const bindings = ['seller'];
      const countBindings = ['seller'];

      if (search) {
        query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
        bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
        countQuery += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        countBindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
      bindings.push(limit, offset);

      const countResult = await env.DB.prepare(countQuery).bind(...countBindings).first();
      const total = countResult.total;
      const sellers = await env.DB.prepare(query).bind(...bindings).all();

      return new Response(JSON.stringify({
        sellers: sellers.results,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (currentUser.role === 'seller') {
      let query = `
        SELECT u.id, u.name, u.email, u.phone, u.whatsapp, u.avatar, u.role,
               u.is_active, u.plan, u.plan_starts_at, u.plan_expires_at, u.created_at,
               u.account_type
        FROM users u
        WHERE u.seller_owner_id = ?
      `;
      const countQuery = 'SELECT COUNT(*) as total FROM users WHERE seller_owner_id = ?';
      const bindings = [currentUser.id];

      if (search) {
        query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
        bindings.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
      bindings.push(limit, offset);

      const countResult = await env.DB.prepare(countQuery).bind(currentUser.id).first();
      const total = countResult.total;
      const managedUsers = await env.DB.prepare(query).bind(...bindings).all();

      return new Response(JSON.stringify({
        managed_users: managedUsers.results,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Sellers GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST: Create seller account (admin only)
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const currentUser = await verifyJWT(token, jwtSecret);
    if (!currentUser || currentUser.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acceso denegado. Solo administradores pueden crear vendedores.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { name, email, phone, password, whatsapp } = body;

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Nombre, email y contraseña son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Formato de email inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return new Response(JSON.stringify({ error: 'Ya existe un usuario con este email' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const passwordHash = await sha256(password);

    const result = await env.DB.prepare(
      'INSERT INTO users (name, email, phone, whatsapp, password_hash, role, account_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(name, email, phone || null, whatsapp || null, passwordHash, 'seller', 'free', 1).run();

    const sellerId = result.meta.last_row_id;

    await env.DB.prepare(
      'INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)'
    ).bind('seller_created', 'Nuevo vendedor creado', `Se ha creado el vendedor "${name}" (${email})`, sellerId).run();

    const sellerToken = await createJWT(
      { id: sellerId, name, email, role: 'seller', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 7 },
      jwtSecret
    );

    return new Response(JSON.stringify({
      message: 'Vendedor creado exitosamente',
      seller: { id: sellerId, name, email, phone, whatsapp, role: 'seller' },
      token: sellerToken,
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sellers POST error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}