// functions/api/plans/request-upgrade.js
// POST: User requests premium upgrade with voucher image

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorizacion requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Token invalido o expirado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('voucher');
    const planDuration = formData.get('plan_duration');
    const paymentPhone = formData.get('payment_phone');

    if (!planDuration || !['3_months', '1_year'].includes(planDuration)) {
      return new Response(JSON.stringify({ error: 'Duracion de plan invalida. Usa 3_months o 1_year' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!file || !file.name) {
      return new Response(JSON.stringify({ error: 'Debes adjuntar el comprobante de pago (voucher)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already has a pending request
    const existingRequest = await env.DB.prepare(
      "SELECT id FROM premium_requests WHERE user_id = ? AND status = 'pending'"
    ).bind(payload.id).first();

    if (existingRequest) {
      return new Response(JSON.stringify({ error: 'Ya tienes una solicitud de Premium pendiente. Espera a que sea revisada.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload voucher to R2
    let voucherUrl = '';
    if (env.R2) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
        const key = `premium-vouchers/${payload.id}_${Date.now()}.${ext}`;
        await env.R2.put(key, arrayBuffer, { httpMetadata: { contentType: file.type || 'image/jpeg' } });
        voucherUrl = `/api/serve?key=${encodeURIComponent(key)}`;
      } catch (uploadErr) {
        console.error('Voucher upload error:', uploadErr);
        return new Response(JSON.stringify({ error: 'Error al subir el comprobante de pago. Intenta de nuevo.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Insert premium request
    const result = await env.DB.prepare(`
      INSERT INTO premium_requests (user_id, plan_duration, voucher_url, payment_phone, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).bind(payload.id, planDuration, voucherUrl, paymentPhone || null).run();

    const requestId = result.meta.last_row_id;

    // ── Notify admin about new premium request ──
    try {
      const notifEnabled = await env.DB.prepare("SELECT value FROM admin_settings WHERE key = 'notifications_enabled'").first();
      if (notifEnabled && notifEnabled.value === '1') {
        const admins = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
        if (admins.results && admins.results.length > 0) {
          const userName = payload.name || payload.email || 'Un usuario';
          const stmts = admins.results.map(a =>
            env.DB.prepare('INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)')
              .bind(a.id, 'premium_request', 'Nueva solicitud Premium', `${userName} solicitó upgrade a Premium — pendiente de revisión.`, '/admin.html#premium')
          );
          await env.DB.batch(stmts);
        }
      }
    } catch (notifErr) {
      console.error('Error sending premium notification:', notifErr);
    }

    return new Response(JSON.stringify({
      message: 'Solicitud de Premium enviada exitosamente. Tu comprobante sera revisado por un administrador.',
      request_id: requestId,
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Plan upgrade request error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', debug: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}