// functions/api/reviews/[id].js
// GET: Get single review with user info
// PUT: Update review (only own review, auth required)
// DELETE: Delete review (own review or admin, auth required)

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

// ─── GET: Get single review ───────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { id } = params;

    const review = await env.DB.prepare(`
      SELECT
        r.id,
        r.business_id,
        r.user_id,
        r.rating,
        r.comment,
        r.is_active,
        r.created_at,
        u.name as user_name,
        u.avatar as user_avatar
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).bind(id).first();

    if (!review) {
      return new Response(JSON.stringify({ error: 'Reseña no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(review), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── PUT: Update review (only own review) ────────────────────────
export async function onRequestPut(context) {
  try {
    const { request, env, params } = context;
    const { id } = params;

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check review exists
    const review = await env.DB.prepare('SELECT * FROM reviews WHERE id = ?').bind(id).first();
    if (!review) {
      return new Response(JSON.stringify({ error: 'Reseña no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only own review can be updated (or admin)
    if (user.role !== 'admin' && user.id !== review.user_id) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para editar esta reseña' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { rating, comment } = body;

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return new Response(JSON.stringify({ error: 'La calificación debe ser entre 1 y 5' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build dynamic UPDATE query
    const setClauses = [];
    const bindings = [];

    if (rating !== undefined) {
      setClauses.push('rating = ?');
      bindings.push(rating);
    }
    if (comment !== undefined) {
      setClauses.push('comment = ?');
      bindings.push(comment || null);
    }

    if (setClauses.length === 0) {
      return new Response(JSON.stringify({ error: 'No se proporcionaron campos para actualizar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    bindings.push(id);
    await env.DB.prepare(
      `UPDATE reviews SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...bindings).run();

    // Recalculate business rating
    const avgResult = await env.DB.prepare(
      'SELECT COALESCE(AVG(rating), 0) as new_avg FROM reviews WHERE business_id = ? AND is_active = 1'
    ).bind(review.business_id).first();
    await env.DB.prepare(
      'UPDATE businesses SET rating = ? WHERE id = ?'
    ).bind(Math.round(avgResult.new_avg * 10) / 10, review.business_id).run();

    return new Response(JSON.stringify({ message: 'Reseña actualizada exitosamente' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── DELETE: Delete review (own review or admin) ────────────────
export async function onRequestDelete(context) {
  try {
    const { request, env, params } = context;
    const { id } = params;

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check review exists
    const review = await env.DB.prepare('SELECT * FROM reviews WHERE id = ?').bind(id).first();
    if (!review) {
      return new Response(JSON.stringify({ error: 'Reseña no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only own review or admin can delete
    if (user.role !== 'admin' && user.id !== review.user_id) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para eliminar esta reseña' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Soft delete (set is_active = 0)
    await env.DB.prepare(
      'UPDATE reviews SET is_active = 0 WHERE id = ?'
    ).bind(id).run();

    // Recalculate business rating (only active reviews count)
    const avgResult = await env.DB.prepare(
      'SELECT COALESCE(AVG(rating), 0) as new_avg FROM reviews WHERE business_id = ? AND is_active = 1'
    ).bind(review.business_id).first();
    await env.DB.prepare(
      'UPDATE businesses SET rating = ? WHERE id = ?'
    ).bind(Math.round(avgResult.new_avg * 10) / 10, review.business_id).run();

    return new Response(JSON.stringify({ message: 'Reseña eliminada exitosamente' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
