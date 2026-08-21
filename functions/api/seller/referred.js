// functions/api/seller/referred.js
// GET: List all users referred by the authenticated seller (with pagination + search)

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
      return new Response(JSON.stringify({ error: 'DB no disponible' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = await verifyJWT(authHeader.substring(7), jwtSecret);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token invalido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 100);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || ''; // active, inactive, all
    const offset = (page - 1) * limit;

    // Build query
    let whereClause = 'WHERE u.referred_by = ?';
    const bindings = [user.id];

    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const searchPattern = `%${search}%`;
      bindings.push(searchPattern, searchPattern, searchPattern);
    }

    if (status === 'active') {
      whereClause += ' AND u.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND u.is_active = 0';
    }

    // Get total count
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`
    ).bind(...bindings).first();

    // Get users with their content counts
    const users = await env.DB.prepare(`
      SELECT
        u.id, u.name, u.email, u.phone, u.whatsapp, u.role, u.avatar,
        u.is_active, u.created_at,
        (SELECT COUNT(*) FROM businesses b WHERE b.user_id = u.id) as business_count,
        (SELECT COUNT(*) FROM properties p WHERE p.user_id = u.id) as property_count,
        (SELECT COUNT(*) FROM products p2 WHERE p2.user_id = u.id) as product_count
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      users: users.results,
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        total_pages: Math.ceil((countResult?.total || 0) / limit),
      },
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}