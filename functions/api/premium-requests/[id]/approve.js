// functions/api/premium-requests/[id]/approve.js
// POST: Admin approves a premium request

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
    const { request, env, params } = context;

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
    const admin = await verifyJWT(token, jwtSecret);
    if (!admin || admin.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acceso denegado. Solo administradores.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestId = parseInt(params.id);
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'ID de solicitud invalido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the premium request
    const preq = await env.DB.prepare('SELECT * FROM premium_requests WHERE id = ?').bind(requestId).first();
    if (!preq) {
      return new Response(JSON.stringify({ error: 'Solicitud no encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (preq.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Esta solicitud ya fue ${preq.status}. No se puede modificar.` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();

    // Calculate expiration based on plan duration
    let expiresAt = null;
    if (preq.plan_duration === '3_months') {
      expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    } else if (preq.plan_duration === '1_year') {
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Update premium request status
    await env.DB.prepare(`
      UPDATE premium_requests SET status = 'approved', reviewed_at = ?, reviewed_by = ?
      WHERE id = ?
    `).bind(now, admin.id, requestId).run();

    // Update user plan
    if (expiresAt) {
      await env.DB.prepare(`
        UPDATE users SET plan_type = 'premium', plan_expires_at = ?, updated_at = ? WHERE id = ?
      `).bind(expiresAt, now, preq.user_id).run();

      // Remove expiration from user's existing posts (make them permanent)
      const tables = ['businesses', 'properties', 'products', 'job_listings'];
      for (const tbl of tables) {
        try {
          await env.DB.prepare(`UPDATE ${tbl} SET expires_at = NULL WHERE user_id = ? AND status != 'rejected'`)
            .bind(preq.user_id).run();
        } catch (e) {
          // Table might not exist or column might not exist yet
        }
      }
    } else {
      await env.DB.prepare(`
        UPDATE users SET plan_type = 'premium', updated_at = ? WHERE id = ?
      `).bind(now, preq.user_id).run();
    }

    // Create notification for user
    try {
      await env.DB.prepare(`
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (?, 'system', 'Plan Premium Aprobado', 'Tu solicitud de plan Premium ha sido aprobada. Ya puedes disfrutar de todos los beneficios.', 'dashboard.html')
      `).bind(preq.user_id).run();
    } catch (e) {
      // Notification table might not exist
    }

    return new Response(JSON.stringify({
      message: 'Solicitud aprobada exitosamente. El usuario ahora es Premium.',
      plan_expires_at: expiresAt,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Premium approve error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', debug: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}