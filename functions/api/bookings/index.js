// functions/api/bookings/index.js
// GET: List bookings (auth required, users see own, admins see all)
// POST: Create booking (auth required, check bookings_enabled, validate date)

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

// ─── GET: List bookings ─────────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible. Verifica el binding D1 en Cloudflare Pages.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const params = url.searchParams;

    const businessId = params.get('business_id');
    const status = params.get('status');
    const page = parseInt(params.get('page')) || 1;
    const limit = Math.min(parseInt(params.get('limit')) || 20, 50);
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    const bindings = [];

    // Users see their own bookings; admins see all
    if (user.role !== 'admin') {
      conditions.push('b.user_id = ?');
      bindings.push(user.id);
    }

    if (businessId) {
      conditions.push('b.business_id = ?');
      bindings.push(parseInt(businessId));
    }

    if (status) {
      conditions.push('b.status = ?');
      bindings.push(status);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Count total matching bookings
    const countQuery = `SELECT COUNT(*) as total FROM bookings b WHERE ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    // Fetch bookings with business and user info
    const query = `
      SELECT
        b.*,
        biz.title as business_name,
        biz.slug as business_slug,
        biz.phone as business_phone,
        biz.address as business_address,
        biz.city as business_city,
        biz.state as business_state,
        u.name as user_name,
        u.phone as user_phone,
        u.email as user_email
      FROM bookings b
      LEFT JOIN businesses biz ON b.business_id = biz.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const bookings = await env.DB.prepare(query).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      bookings: bookings.results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bookings GET error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de bookings no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create booking (auth required) ──────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible. Verifica el binding D1 en Cloudflare Pages.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if bookings feature is enabled
    try {
      const setting = await env.DB.prepare("SELECT value FROM admin_settings WHERE key = 'bookings_enabled'").first();
      if (setting && setting.value === '0') {
        return new Response(JSON.stringify({ error: 'La función de reservas está deshabilitada por el administrador' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // If admin_settings table doesn't exist, proceed anyway
    }

    const body = await request.json();

    // Required fields
    const { business_id, booking_date, booking_time } = body;

    if (!business_id) {
      return new Response(JSON.stringify({ error: 'El ID del negocio es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify business exists and is approved
    const business = await env.DB.prepare('SELECT id, title, status FROM businesses WHERE id = ?').bind(parseInt(business_id)).first();
    if (!business) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (business.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'No se pueden hacer reservas en negocios no aprobados' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!booking_date || !booking_date.trim()) {
      return new Response(JSON.stringify({ error: 'La fecha de la reserva es requerida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate booking_date is in the future
    const bookingDate = new Date(booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(bookingDate.getTime())) {
      return new Response(JSON.stringify({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (bookingDate < today) {
      return new Response(JSON.stringify({ error: 'La fecha de la reserva debe ser en el futuro' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!booking_time || !booking_time.trim()) {
      return new Response(JSON.stringify({ error: 'La hora de la reserva es requerida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert booking
    const result = await env.DB.prepare(`
      INSERT INTO bookings (
        business_id, user_id, booking_date, booking_time,
        duration_minutes, service_name, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      parseInt(business_id),
      user.id,
      booking_date.trim(),
      booking_time.trim(),
      body.duration_minutes ? parseInt(body.duration_minutes) : 30,
      body.service_name || null,
      body.notes || null,
      'pending'
    ).run();

    const bookingId = result.meta.last_row_id;

    return new Response(JSON.stringify({
      message: 'Reserva creada exitosamente. Está pendiente de confirmación.',
      booking_id: bookingId,
      business_name: business.title,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bookings POST error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de bookings no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
