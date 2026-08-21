// functions/api/subscription/check.js
// GET: Check current user's subscription status

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    const user = await env.DB.prepare(`
      SELECT id, name, email, role, account_type, plan, plan_starts_at, plan_expires_at,
             seller_owner_id, whatsapp_enabled
      FROM users WHERE id = ?
    `).bind(currentUser.id).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let isPremium = false;
    let planStatus = 'none';
    let daysRemaining = 0;

    if (user.role === 'admin') {
      isPremium = true;
      planStatus = 'admin_lifetime';
    } else if (user.plan && user.plan_expires_at) {
      const now = new Date();
      const expiresAt = new Date(user.plan_expires_at);
      if (expiresAt > now) {
        isPremium = true;
        planStatus = 'active';
        daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      } else {
        isPremium = false;
        planStatus = 'expired';
        daysRemaining = 0;
        await env.DB.prepare(
          "UPDATE users SET account_type = 'free', plan = NULL, updated_at = datetime('now') WHERE id = ?"
        ).bind(user.id).run();
      }
    }

    const productStats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_products,
        SUM(CASE WHEN (expires_at IS NULL OR expires_at > datetime('now')) AND status = 'approved' THEN 1 ELSE 0 END) as active_products,
        SUM(CASE WHEN expires_at IS NOT NULL AND expires_at <= datetime('now') THEN 1 ELSE 0 END) as expired_products
      FROM products WHERE user_id = ?
    `).bind(user.id).first();

    const latestPayment = await env.DB.prepare(`
      SELECT id, amount, payment_type, status, created_at, processed_at
      FROM payments WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).bind(user.id).first();

    const plans = [
      {
        id: 'quarterly',
        name: 'Plan Trimestral',
        price: 30,
        currency: 'USD',
        duration: '3 meses',
        features: [
          'Publicaciones ilimitadas',
          'Botón de WhatsApp activo',
          'Perfil completo visible',
          'Sin expiración de productos',
        ],
      },
      {
        id: 'annual',
        name: 'Plan Anual',
        price: 100,
        currency: 'USD',
        duration: '12 meses',
        features: [
          'Todo del Plan Trimestral',
          'Perfil Google integrado',
          'Prioridad en resultados',
          'Soporte prioritario',
        ],
      },
    ];

    return new Response(JSON.stringify({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        account_type: user.account_type,
      },
      subscription: {
        is_premium: isPremium,
        plan: user.plan,
        plan_status: planStatus,
        plan_starts_at: user.plan_starts_at,
        plan_expires_at: user.plan_expires_at,
        days_remaining: daysRemaining,
      },
      product_stats: productStats || { total_products: 0, active_products: 0, expired_products: 0 },
      latest_payment: latestPayment,
      plans,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Subscription check error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}