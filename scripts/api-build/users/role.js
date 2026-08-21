// functions/api/users/role.js
// PUT: Change user role (admin only)

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
    const admin = await verifyJWT(token, env.JWT_SECRET || 'aunclick_default_secret_2024');
    if (!admin || admin.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acceso denegado. Solo administradores.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { user_id, new_role } = body;

    if (!user_id || !new_role) {
      return new Response(JSON.stringify({ error: 'user_id y new_role son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validRoles = ['user', 'user_premium', 'seller', 'admin'];
    if (!validRoles.includes(new_role)) {
      return new Response(JSON.stringify({ error: 'Rol inválido', validRoles }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUser = await env.DB.prepare('SELECT id, name, email, role, account_type FROM users WHERE id = ?').bind(user_id).first();
    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const oldRole = targetUser.role;

    if (new_role === 'user_premium') {
      await env.DB.prepare(`
        UPDATE users SET
          role = ?,
          account_type = 'premium',
          plan = 'manual_premium',
          plan_starts_at = datetime('now'),
          plan_expires_at = datetime('now', '+12 months'),
          updated_at = datetime('now')
        WHERE id = ?
      `).bind('user_premium', user_id).run();
    } else if (new_role === 'user') {
      await env.DB.prepare(`
        UPDATE users SET
          role = ?,
          account_type = 'free',
          plan = NULL,
          plan_starts_at = NULL,
          plan_expires_at = NULL,
          updated_at = datetime('now')
        WHERE id = ?
      `).bind('user', user_id).run();

      await env.DB.prepare(`
        UPDATE products SET expires_at = datetime('now', '+7 days')
        WHERE user_id = ? AND expires_at IS NULL AND status = 'approved'
      `).bind(user_id).run();
    } else if (new_role === 'seller') {
      await env.DB.prepare(`
        UPDATE users SET role = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind('seller', user_id).run();
    } else if (new_role === 'admin') {
      await env.DB.prepare(`
        UPDATE users SET
          role = ?,
          account_type = 'premium',
          plan = 'admin_lifetime',
          updated_at = datetime('now')
        WHERE id = ?
      `).bind('admin', user_id).run();
    }

    await env.DB.prepare(
      'INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)'
    ).bind(
      'role_change',
      'Cambio de rol de usuario',
      `"${targetUser.name}" (${targetUser.email}): ${oldRole} -> ${new_role}`,
      user_id
    ).run();

    return new Response(JSON.stringify({
      message: `Rol cambiado de "${oldRole}" a "${new_role}" exitosamente`,
      user_id,
      old_role: oldRole,
      new_role: new_role,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Role change error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}