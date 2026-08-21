// functions/api/points/index.js
// GET: Get current user's points (total + recent log entries)
// GET: Admin get points for any user (?user_id=N)

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

// ─── GET: Get user points ────────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('user_id');

    // If user_id is specified, only admins can view another user's points
    let queryUserId = user.id;
    if (targetUserId) {
      if (user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'No tienes permiso para ver los puntos de otro usuario' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      queryUserId = parseInt(targetUserId);
    }

    // Get total points
    const totalResult = await env.DB.prepare(
      'SELECT COALESCE(SUM(points), 0) as total_points FROM points_log WHERE user_id = ?'
    ).bind(queryUserId).first();

    // Get points breakdown by action
    const breakdown = await env.DB.prepare(`
      SELECT action, SUM(points) as total, COUNT(*) as count
      FROM points_log
      WHERE user_id = ?
      GROUP BY action
    `).bind(queryUserId).all();

    // Pagination for log entries
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 50);
    const offset = (page - 1) * limit;

    // Get recent log entries with business info
    const logEntries = await env.DB.prepare(`
      SELECT
        pl.id,
        pl.points,
        pl.action,
        pl.description,
        pl.created_at,
        b.title as business_name,
        b.id as business_id
      FROM points_log pl
      LEFT JOIN businesses b ON pl.business_id = b.id
      WHERE pl.user_id = ?
      ORDER BY pl.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(queryUserId, limit, offset).all();

    // Total entries count
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM points_log WHERE user_id = ?'
    ).bind(queryUserId).first();

    // Get target user info (for admin viewing)
    let userInfo = null;
    if (targetUserId && user.role === 'admin') {
      userInfo = await env.DB.prepare(
        'SELECT id, name, email, avatar FROM users WHERE id = ?'
      ).bind(queryUserId).first();
    }

    return new Response(JSON.stringify({
      user_id: queryUserId,
      total_points: totalResult.total_points,
      breakdown: breakdown.results,
      recent_log: logEntries.results,
      user: userInfo,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    }), {
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
