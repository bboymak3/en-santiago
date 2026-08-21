// functions/api/users/activate-premium.js
// POST: Admin manually activates Premium for a user (after verifying payment)

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

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'en-santiago_default_secret_2024';

    // Verify admin auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = await verifyJWT(authHeader.substring(7), jwtSecret);
    if (!admin || admin.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden activar Premium' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { user_id, duration, admin_notes } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id es requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user exists
    const user = await env.DB.prepare('SELECT id, name, email, plan_type FROM users WHERE id = ?').bind(user_id).first();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user.plan_type === 'premium') {
      return new Response(JSON.stringify({ error: 'Este usuario ya es Premium' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate expiry
    const days = duration === '1_year' ? 365 : 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // Update user to Premium
    await env.DB.prepare(`
      UPDATE users SET plan_type = 'premium', plan_expires_at = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(expiresAt.toISOString(), user_id).run();

    // Remove expiration from user's existing posts
    await env.DB.prepare("UPDATE businesses SET expires_at = NULL WHERE user_id = ? AND expires_at IS NOT NULL").bind(user_id).run();
    await env.DB.prepare("UPDATE properties SET expires_at = NULL WHERE user_id = ? AND expires_at IS NOT NULL").bind(user_id).run();
    await env.DB.prepare("UPDATE products SET expires_at = NULL WHERE user_id = ? AND expires_at IS NOT NULL").bind(user_id).run();
    await env.DB.prepare("UPDATE job_listings SET expires_at = NULL WHERE user_id = ? AND expires_at IS NOT NULL").bind(user_id).run();

    // Create notification
    try {
      await env.DB.prepare(`
        INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, 'premium', 'Plan Premium Activado', ?, 'dashboard.html')
      `).bind(
        user_id,
        `Tu plan Premium ha sido activado por ${days} dias. Tus publicaciones ya no caducaran.`,
      ).run();
    } catch (e) { /* notification table may not exist */ }

    return new Response(JSON.stringify({
      message: `Plan Premium activado para ${user.name} por ${days} dias`,
      user_id: user_id,
      duration: days,
      expires_at: expiresAt.toISOString(),
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Manual premium activation error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}