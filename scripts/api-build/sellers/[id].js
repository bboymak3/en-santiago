// functions/api/sellers/[id].js
// GET: Seller detail
// PUT: Update seller status/plan (admin only)

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

// GET: Seller detail
export async function onRequestGet(context) {
  try {
    const { request, env, params } = context;

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

    const sellerId = parseInt(params.id);

    if (currentUser.role !== 'admin' && currentUser.id !== sellerId) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const seller = await env.DB.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.whatsapp, u.avatar, u.role,
             u.is_active, u.plan, u.plan_starts_at, u.plan_expires_at, u.created_at,
             u.account_type, u.bio
      FROM users u
      WHERE u.id = ? AND u.role = 'seller'
    `).bind(sellerId).first();

    if (!seller) {
      return new Response(JSON.stringify({ error: 'Vendedor no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const managedUsers = await env.DB.prepare(`
      SELECT id, name, email, phone, role, account_type, is_active, plan, plan_expires_at
      FROM users WHERE seller_owner_id = ? ORDER BY created_at DESC
    `).bind(sellerId).all();

    const businesses = await env.DB.prepare(`
      SELECT id, title, slug, status, business_type, created_at
      FROM businesses WHERE created_by_seller = ? ORDER BY created_at DESC LIMIT 50
    `).bind(sellerId).all();

    const payments = await env.DB.prepare(`
      SELECT id, amount, currency, payment_type, status, proof_url, created_at, processed_at
      FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
    `).bind(sellerId).all();

    return new Response(JSON.stringify({
      seller,
      managed_users: managedUsers.results,
      businesses: businesses.results,
      payments: payments.results,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seller detail error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// PUT: Update seller (admin only)
export async function onRequestPut(context) {
  try {
    const { request, env, params } = context;

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
    if (!currentUser || currentUser.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acceso denegado. Solo administradores.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sellerId = parseInt(params.id);
    const body = await request.json();
    const { is_active, plan, name, phone, whatsapp, email } = body;

    const seller = await env.DB.prepare('SELECT id, name, email, is_active FROM users WHERE id = ? AND role = ?').bind(sellerId, 'seller').first();
    if (!seller) {
      return new Response(JSON.stringify({ error: 'Vendedor no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updates = [];
    const bindings = [];

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      bindings.push(is_active ? 1 : 0);
    }
    if (plan) {
      updates.push('plan = ?');
      bindings.push(plan);
      if (plan === 'quarterly') {
        updates.push("plan_starts_at = datetime('now')");
        updates.push("plan_expires_at = datetime('now', '+3 months')");
        updates.push('account_type = ?');
        bindings.push('premium');
      } else if (plan === 'annual') {
        updates.push("plan_starts_at = datetime('now')");
        updates.push("plan_expires_at = datetime('now', '+12 months')");
        updates.push('account_type = ?');
        bindings.push('premium');
      }
    }
    if (name) { updates.push('name = ?'); bindings.push(name); }
    if (phone !== undefined) { updates.push('phone = ?'); bindings.push(phone); }
    if (whatsapp !== undefined) { updates.push('whatsapp = ?'); bindings.push(whatsapp); }
    if (email) { updates.push('email = ?'); bindings.push(email); }

    updates.push("updated_at = datetime('now')");
    bindings.push(sellerId);

    await env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...bindings).run();

    if (is_active !== undefined && is_active !== seller.is_active) {
      const statusText = is_active ? 'activado' : 'desactivado';
      await env.DB.prepare(
        'INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)'
      ).bind('seller_status_change', `Vendedor ${statusText}`, `El vendedor "${seller.name}" (${seller.email}) ha sido ${statusText}`, sellerId).run();
    }

    return new Response(JSON.stringify({
      message: 'Vendedor actualizado exitosamente',
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seller update error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}