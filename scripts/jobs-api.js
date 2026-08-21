// functions/api/jobs/index.js
// GET: List job listings (with filters)
// POST: Create job listing (requires auth) - NO business required for sellers

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

// ─── JWT Verification (same as businesses/index.js) ───────────
function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
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

// ─── Valid Job Types ───────────────────────────────────────────
const VALID_JOB_TYPES = ['tiempo_completo', 'medio_tiempo', 'contrato', 'remoto', 'freelance', 'pasantia'];

// ─── GET: List jobs with filters ──────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const params = url.searchParams;

    const all = params.get('all') === 'true';
    const status = params.get('status') || (all ? null : 'approved');
    const state = params.get('state');
    const jobType = params.get('job_type');
    const search = params.get('search');
    const page = parseInt(params.get('page')) || 1;
    const limit = Math.min(parseInt(params.get('limit')) || 12, 50);
    const offset = (page - 1) * limit;
    const sort = params.get('sort') || 'newest';
    const userId = params.get('user_id');

    // Build conditions
    const conditions = [];
    const bindings = [];

    if (status) {
      conditions.push('status = ?');
      bindings.push(status);
    }

    if (userId) {
      conditions.push('user_id = ?');
      bindings.push(parseInt(userId));
    }

    if (state) {
      conditions.push('state = ?');
      bindings.push(state);
    }

    if (jobType) {
      conditions.push('job_type = ?');
      bindings.push(jobType);
    }

    if (search) {
      conditions.push('(title LIKE ? OR company_name LIKE ? OR description LIKE ? OR city LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Sort
    let orderBy = 'created_at DESC';
    if (sort === 'views') orderBy = 'views DESC';
    else if (sort === 'oldest') orderBy = 'created_at ASC';
    else orderBy = 'created_at DESC';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM job_listings WHERE ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    // Fetch jobs
    const query = `
      SELECT *
      FROM job_listings
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const jobs = await env.DB.prepare(query).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      jobs: jobs.results,
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
    console.error('Jobs GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create job listing (requires auth, NO business required) ──
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';

    // Auth required
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    // Required fields: title only
    const { title, company_name, job_type } = body;

    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'El título del empleo es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate job_type if provided
    if (job_type && !VALID_JOB_TYPES.includes(job_type)) {
      return new Response(JSON.stringify({
        error: 'Tipo de empleo inválido',
        validTypes: VALID_JOB_TYPES,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to find matching business (optional, no longer required)
    let businessId = body.business_id ? parseInt(body.business_id) : null;
    const effectiveCompanyName = (company_name || '').trim() || (payload.name || '') || 'Sin nombre';

    if (!businessId && effectiveCompanyName) {
      // Try to match by title but don't fail if not found
      const businessRow = await env.DB.prepare('SELECT id FROM businesses WHERE title = ? AND status = ? LIMIT 1')
        .bind(effectiveCompanyName, 'approved')
        .first();
      if (businessRow) {
        businessId = businessRow.id;
      }
    }

    // Insert job listing
    const result = await env.DB.prepare(`
      INSERT INTO job_listings (
        business_id,
        company_name,
        title,
        description,
        job_type,
        salary,
        state,
        city,
        contact_email,
        contact_phone,
        requirements,
        benefits,
        status,
        user_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      businessId,
      effectiveCompanyName,
      title.trim(),
      body.description || null,
      job_type || 'tiempo_completo',
      body.salary || null,
      body.state || null,
      body.city || null,
      body.contact_email || null,
      body.contact_phone || null,
      body.requirements || null,
      body.benefits || null,
      // Sellers and admins get auto-approved, others go pending
      (payload.role === 'seller' || payload.role === 'admin') ? 'approved' : 'pending',
      payload.id
    ).run();

    const jobId = result.meta.last_row_id;

    return new Response(JSON.stringify({
      message: (payload.role === 'seller' || payload.role === 'admin')
        ? 'Oferta de empleo publicada exitosamente.'
        : 'Oferta de empleo registrada. Está pendiente de aprobación.',
      job_id: jobId,
      business_id: businessId,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Jobs POST error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}