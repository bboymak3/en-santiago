// functions/api/coupons/index.js
// GET: List coupons (with filters, auto-expire, business name)
// POST: Create coupon (auth required, business owner or admin)

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

// ─── GET: List coupons ─────────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible. Verifica el binding D1 en Cloudflare Pages.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const params = url.searchParams;

    const businessId = params.get('business_id');
    const status = params.get('status') || 'approved';
    const page = parseInt(params.get('page')) || 1;
    const limit = Math.min(parseInt(params.get('limit')) || 12, 50);
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    const bindings = [];

    if (status) {
      conditions.push('c.status = ?');
      bindings.push(status);
    }

    if (businessId) {
      conditions.push('c.business_id = ?');
      bindings.push(parseInt(businessId));
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Auto-expire coupons whose end_date has passed
    await env.DB.prepare(
      "UPDATE coupons SET status = 'expired' WHERE status IN ('approved', 'pending') AND end_date IS NOT NULL AND end_date < datetime('now')"
    ).run();

    // Count total matching coupons
    const countQuery = `SELECT COUNT(*) as total FROM coupons c WHERE ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    // Fetch coupons with business name
    const query = `
      SELECT
        c.*,
        b.title as business_name,
        b.slug as business_slug,
        b.phone as business_phone,
        b.city as business_city,
        b.state as business_state
      FROM coupons c
      LEFT JOIN businesses b ON c.business_id = b.id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const coupons = await env.DB.prepare(query).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      coupons: coupons.results,
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
    console.error('Coupons GET error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de coupons no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create coupon (auth required) ─────────────────────────
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

    // Check if coupons feature is enabled
    try {
      const setting = await env.DB.prepare("SELECT value FROM admin_settings WHERE key = 'coupons_enabled'").first();
      if (setting && setting.value === '0') {
        return new Response(JSON.stringify({ error: 'La función de cupones está deshabilitada por el administrador' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // If admin_settings table doesn't exist, proceed anyway
    }

    const body = await request.json();

    // Required fields
    const { business_id, title, code, discount, discount_type } = body;

    if (!business_id) {
      return new Response(JSON.stringify({ error: 'El ID del negocio es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'El título del cupón es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!discount || !discount.toString().trim()) {
      return new Response(JSON.stringify({ error: 'El descuento es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!discount_type || !['percentage', 'fixed', 'free_delivery'].includes(discount_type)) {
      return new Response(JSON.stringify({
        error: 'Tipo de descuento inválido',
        validTypes: ['percentage', 'fixed', 'free_delivery'],
        received: discount_type,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorization check: must be admin or business owner
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const business = await env.DB.prepare('SELECT user_id, status FROM businesses WHERE id = ?').bind(parseInt(business_id)).first();
      if (!business) {
        return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (business.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'No tienes permiso para crear cupones para este negocio' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check unique code (if provided)
    if (code && code.trim()) {
      const existingCode = await env.DB.prepare('SELECT id FROM coupons WHERE code = ? AND is_active = 1').bind(code.trim().toUpperCase()).first();
      if (existingCode) {
        return new Response(JSON.stringify({ error: 'Ya existe un cupón activo con ese código' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Insert coupon
    const result = await env.DB.prepare(`
      INSERT INTO coupons (
        business_id, title, description, code, discount, discount_type,
        terms, start_date, end_date, max_uses, is_active, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      parseInt(business_id),
      title.trim(),
      body.description || null,
      code ? code.trim().toUpperCase() : null,
      discount.toString().trim(),
      discount_type,
      body.terms || null,
      body.start_date || null,
      body.end_date || null,
      body.max_uses ? parseInt(body.max_uses) : 0,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
      isAdmin ? 'approved' : 'pending'
    ).run();

    const couponId = result.meta.last_row_id;

    return new Response(JSON.stringify({
      message: isAdmin ? 'Cupón creado exitosamente.' : 'Cupón registrado exitosamente. Está pendiente de aprobación.',
      coupon_id: couponId,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Coupons POST error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de coupons no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
