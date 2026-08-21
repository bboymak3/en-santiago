// functions/api/coupons/[id].js
// GET: Get single coupon with business info
// PATCH: Update coupon status (admin: approve/reject/expired) or fields (owner)
// DELETE: Delete coupon (owner or admin)

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
  const token = authHeader.substring(7);
  return verifyJWT(token, env.JWT_SECRET);
}

// ─── GET: Get single coupon with business info ──────────────────
export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { id } = params;

    // Auto-expire if end_date has passed
    await env.DB.prepare(
      "UPDATE coupons SET status = 'expired' WHERE id = ? AND status IN ('approved', 'pending') AND end_date IS NOT NULL AND end_date < datetime('now')"
    ).bind(id).run();

    const coupon = await env.DB.prepare(`
      SELECT
        c.*,
        b.title as business_name,
        b.slug as business_slug,
        b.phone as business_phone,
        b.website as business_website,
        b.instagram as business_instagram,
        b.city as business_city,
        b.state as business_state,
        b.address as business_address
      FROM coupons c
      LEFT JOIN businesses b ON c.business_id = b.id
      WHERE c.id = ?
    `).bind(id).first();

    if (!coupon) {
      return new Response(JSON.stringify({ error: 'Cupón no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(coupon), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Coupon GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── PATCH: Update coupon status or fields ──────────────────────
export async function onRequestPatch(context) {
  try {
    const { request, env, params } = context;
    const { id } = params;

    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check coupon exists
    const coupon = await env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first();
    if (!coupon) {
      return new Response(JSON.stringify({ error: 'Cupón no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { action } = body;

    // Admin actions: approve, reject, expired
    if (user.role === 'admin' && action) {
      const validActions = ['approve', 'reject', 'expired'];
      if (!validActions.includes(action)) {
        return new Response(JSON.stringify({ error: 'Acción no válida', validActions }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const statusMap = {
        approve: 'approved',
        reject: 'rejected',
        expired: 'expired',
      };

      await env.DB.prepare(
        "UPDATE coupons SET status = ? WHERE id = ?"
      ).bind(statusMap[action], id).run();

      return new Response(JSON.stringify({
        message: `Cupón ${action === 'approve' ? 'aprobado' : action === 'reject' ? 'rechazado' : 'marcado como expirado'} exitosamente`,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Owner or admin can update coupon fields
    const isOwner = await env.DB.prepare('SELECT user_id FROM businesses WHERE id = ?').bind(coupon.business_id).first();
    if (!isOwner && user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Negocio asociado no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user.role !== 'admin' && isOwner.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para editar este cupón' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Allowed fields for owner/admin update
    const allowedFields = [
      'title', 'description', 'code', 'discount', 'discount_type',
      'terms', 'start_date', 'end_date', 'max_uses', 'is_active',
    ];

    const setClauses = [];
    const bindings = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        let value = body[field];
        // Normalize code to uppercase
        if (field === 'code') {
          value = value ? value.trim().toUpperCase() : null;
        }
        // Convert boolean is_active to integer
        if (field === 'is_active') {
          value = value ? 1 : 0;
        }
        if (field === 'max_uses') {
          value = parseInt(value) || 0;
        }
        bindings.push(value);
      }
    }

    if (setClauses.length === 0) {
      return new Response(JSON.stringify({ error: 'No se proporcionaron campos para actualizar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    bindings.push(id);

    await env.DB.prepare(
      `UPDATE coupons SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...bindings).run();

    return new Response(JSON.stringify({ message: 'Cupón actualizado exitosamente' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Coupon PATCH error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── DELETE: Delete coupon (owner or admin) ─────────────────────
export async function onRequestDelete(context) {
  try {
    const { request, env, params } = context;
    const { id } = params;

    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const coupon = await env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first();
    if (!coupon) {
      return new Response(JSON.stringify({ error: 'Cupón no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorization check
    if (user.role !== 'admin') {
      const business = await env.DB.prepare('SELECT user_id FROM businesses WHERE id = ?').bind(coupon.business_id).first();
      if (!business || business.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'No tienes permiso para eliminar este cupón' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    await env.DB.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ message: 'Cupón eliminado exitosamente' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Coupon DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
