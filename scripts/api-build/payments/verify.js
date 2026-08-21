// functions/api/payments/verify.js
// POST: Admin approve/reject payment

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
    const { payment_id, action, admin_notes } = body;

    if (!payment_id || !action) {
      return new Response(JSON.stringify({ error: 'payment_id y action (approve/reject) son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Acción inválida. Use "approve" o "reject".' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payment = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(payment_id).first();
    if (!payment) {
      return new Response(JSON.stringify({ error: 'Pago no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payment.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Este pago ya fue procesado (${payment.status})` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await env.DB.prepare(`
      UPDATE payments SET status = ?, admin_notes = ?, processed_by = ?, processed_at = datetime('now')
      WHERE id = ?
    `).bind(newStatus, admin_notes || null, admin.id, payment_id).run();

    if (action === 'approve') {
      if (payment.payment_type === 'subscription_quarterly' || payment.payment_type === 'subscription_annual') {
        const months = payment.payment_type === 'subscription_quarterly' ? 3 : 12;
        const planName = payment.payment_type === 'subscription_quarterly' ? 'quarterly' : 'annual';

        await env.DB.prepare(`
          UPDATE users SET
            plan = ?,
            account_type = 'premium',
            plan_starts_at = datetime('now'),
            plan_expires_at = datetime('now', '+${months} months'),
            updated_at = datetime('now')
          WHERE id = ?
        `).bind(planName, payment.user_id).run();

        // If seller, also upgrade managed users
        await env.DB.prepare(`
          UPDATE users SET
            plan = ?,
            account_type = 'premium',
            plan_starts_at = datetime('now'),
            plan_expires_at = datetime('now', '+${months} months'),
            updated_at = datetime('now')
          WHERE seller_owner_id = ?
        `).bind(planName, payment.user_id).run();

        // Remove expiration from products
        await env.DB.prepare(`
          UPDATE products SET expires_at = NULL WHERE user_id = ?
        `).bind(payment.user_id).run();

        const managedUsers = await env.DB.prepare('SELECT id FROM users WHERE seller_owner_id = ?').bind(payment.user_id).all();
        for (const mu of managedUsers.results) {
          await env.DB.prepare('UPDATE products SET expires_at = NULL WHERE user_id = ?').bind(mu.id).run();
        }

      } else if (payment.payment_type === 'product_renewal' && payment.valid_until) {
        const expiredProduct = await env.DB.prepare(`
          SELECT id FROM products
          WHERE user_id = ? AND expires_at IS NOT NULL AND expires_at < datetime('now')
          ORDER BY expires_at DESC LIMIT 1
        `).bind(payment.user_id).first();

        if (expiredProduct) {
          await env.DB.prepare(`
            UPDATE products SET expires_at = datetime('now', '+30 days') WHERE id = ?
          `).bind(expiredProduct.id).run();
        }
      }
    }

    const actionText = action === 'approve' ? 'aprobado' : 'rechazado';
    await env.DB.prepare(
      'INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)'
    ).bind(
      'payment_processed',
      `Pago ${actionText}`,
      `El pago #${payment_id} ($${payment.amount} - ${payment.payment_type}) ha sido ${actionText}`,
      payment_id
    ).run();

    return new Response(JSON.stringify({
      message: `Pago ${actionText} exitosamente`,
      payment_id,
      new_status: newStatus,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Payment verify error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}