// functions/api/jobs/index.js
// GET: List job listings (with filters)
// POST: Create job listing (requires auth)
// v2 - fixed ambiguous column + auto-create missing columns

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
  const pad = base64.length % 4;
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
const VALID_JOB_TYPES = ['tiempo_completo', 'medio_tiempo', 'contrato', 'remoto', 'freelance'];

// ─── GET: List jobs with filters ──────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible. Verifica el binding D1 en Cloudflare Pages.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure required columns exist
    try { await env.DB.prepare(`ALTER TABLE job_listings ADD COLUMN status TEXT DEFAULT 'pending'`).run(); } catch(e) {}
    try { await env.DB.prepare('ALTER TABLE job_listings ADD COLUMN views INTEGER DEFAULT 0').run(); } catch(e) {}
    try { await env.DB.prepare("ALTER TABLE job_listings ADD COLUMN expires_at TEXT").run(); } catch(e) {}
    try { await env.DB.prepare('ALTER TABLE job_listings ADD COLUMN images TEXT').run(); } catch(e) {}
    try { await env.DB.prepare('ALTER TABLE job_listings ADD COLUMN video_url TEXT').run(); } catch(e) {}

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
    const businessId = params.get('business_id');

    // Build conditions — use full table name to avoid ambiguity in JOINs
    const conditions = [];
    const bindings = [];

    if (status) {
      conditions.push('j.status = ?');
      bindings.push(status);
    }
    // Expired posts go to the end, not hidden

    if (businessId) {
      conditions.push('j.business_id = ?');
      bindings.push(parseInt(businessId));
    }

    if (userId) {
      conditions.push('j.user_id = ?');
      bindings.push(parseInt(userId));
    }

    if (state) {
      conditions.push('j.state = ?');
      bindings.push(state);
    }

    if (jobType) {
      conditions.push('j.job_type = ?');
      bindings.push(jobType);
    }

    if (search) {
      conditions.push('(j.title LIKE ? OR j.company_name LIKE ? OR j.description LIKE ? OR j.city LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Sort — featured jobs always first, expired last
    let orderBy = "j.featured DESC, CASE WHEN j.expires_at IS NOT NULL AND j.expires_at <= datetime('now') THEN 1 ELSE 0 END, j.created_at DESC";
    if (sort === 'views') orderBy = "j.featured DESC, CASE WHEN j.expires_at IS NOT NULL AND j.expires_at <= datetime('now') THEN 1 ELSE 0 END, j.views DESC";
    else if (sort === 'oldest') orderBy = "j.featured DESC, CASE WHEN j.expires_at IS NOT NULL AND j.expires_at <= datetime('now') THEN 1 ELSE 0 END, j.created_at ASC";
    else orderBy = "j.featured DESC, CASE WHEN j.expires_at IS NOT NULL AND j.expires_at <= datetime('now') THEN 1 ELSE 0 END, j.created_at DESC";

    // Count total (no JOIN, so strip alias)
    const countWhere = whereClause.replace(/j\./g, 'job_listings.');
    const countQuery = `SELECT COUNT(*) as total FROM job_listings WHERE ${countWhere}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    // Fetch jobs with business info
    const query = `
      SELECT j.*,
             COALESCE(j.business_logo, b.logo) as business_logo,
             b.title as business_title, b.slug as business_slug
      FROM job_listings j
      LEFT JOIN businesses b ON j.business_id = b.id
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
    console.error('Jobs GET error v3:', error);
    let errorMsg = 'Error interno del servidor v3';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de job_listings no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create job listing (requires auth) ──────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Check D1 binding
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible. Verifica el binding D1 en Cloudflare Pages.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'en-santiago_jwt_secret_2024_secure';

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

    // Required fields: title, company_name, job_type
    const { title, company_name, job_type } = body;

    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'El título del empleo es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!company_name || !company_name.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre de la empresa es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!job_type || !VALID_JOB_TYPES.includes(job_type)) {
      return new Response(JSON.stringify({
        error: 'Tipo de empleo inválido',
        validTypes: VALID_JOB_TYPES,
        received: job_type,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Special handling for HOLAX virtual company
    const HOLAX_NAME = 'HOLAX';
    let businessId;
    let companyNameFinal = company_name.trim();

    if (companyNameFinal === HOLAX_NAME) {
      // HOLAX is a virtual/placeholder company — auto-create if not exists
      let en-santiagoRow = await env.DB.prepare('SELECT id FROM businesses WHERE title = ? LIMIT 1')
        .bind(HOLAX_NAME).first();
      if (!en-santiagoRow) {
        // Ensure logo column exists
        try { await env.DB.prepare('ALTER TABLE businesses ADD COLUMN logo TEXT').run(); } catch(e) {}
        try { await env.DB.prepare('ALTER TABLE businesses ADD COLUMN banner TEXT').run(); } catch(e) {}
        // Find a valid category_id (look for 'General', fallback to first available)
        let en-santiagoCatId = await env.DB.prepare('SELECT id FROM categories WHERE slug = ? LIMIT 1')
          .bind('general').first();
        const catId = en-santiagoCatId ? en-santiagoCatId.id : (await env.DB.prepare('SELECT id FROM categories ORDER BY id LIMIT 1').first()).id;
        const en-santiagoInsert = await env.DB.prepare(`
          INSERT INTO businesses (user_id, title, slug, status, category_id, logo, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          payload.id,
          HOLAX_NAME,
          'en-santiago',
          'approved',
          catId,
          '/images/En Santiago.png',
          'Plataforma En Santiago – Directorio comercial e inmobiliario de Santiago de Chile'
        ).run();
        businessId = en-santiagoInsert.meta.last_row_id;
      } else {
        businessId = en-santiagoRow.id;
      }
    } else {
      // Verify that company_name exists in the businesses table
      const businessRow = await env.DB.prepare('SELECT id, user_id, title FROM businesses WHERE title = ? AND status = ? LIMIT 1')
        .bind(companyNameFinal, 'approved')
        .first();

      if (!businessRow) {
        return new Response(JSON.stringify({
          error: `La empresa "${companyNameFinal}" no está registrada o no está aprobada en el directorio. Solo puedes publicar empleos para negocios registrados.`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      businessId = businessRow.id;
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
        user_id,
        images,
        video_url
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      businessId,
      companyNameFinal,
      title.trim(),
      body.description || null,
      job_type,
      body.salary || null,
      body.state || null,
      body.city || null,
      body.contact_email || null,
      body.contact_phone || null,
      body.requirements || null,
      body.benefits || null,
      'pending',
      payload.id,
      body.images || null,
      body.video_url || null
    ).run();

    const jobId = result.meta.last_row_id;

    // Ensure images and video_url columns exist
    try { await env.DB.prepare(`ALTER TABLE job_listings ADD COLUMN images TEXT`).run(); } catch(e) {}
    try { await env.DB.prepare(`ALTER TABLE job_listings ADD COLUMN video_url TEXT`).run(); } catch(e) {}
    try { await env.DB.prepare(`ALTER TABLE job_listings ADD COLUMN business_logo TEXT`).run(); } catch(e) {}

    // Set business_logo for the job (use provided or default for HOLAX)
    const jobLogo = body.business_logo || (companyNameFinal === HOLAX_NAME ? '/api/serve?key=santiago%2Flogos%2F6%2F1783998320478_Logo_En Santiago.png' : null);
    if (jobLogo) {
      try { await env.DB.prepare('UPDATE job_listings SET business_logo = ? WHERE id = ?').bind(jobLogo, jobId).run(); } catch(e) {}
    }

    // Set expiration for basic users (20 days)
    try {
      const userRow = await env.DB.prepare('SELECT plan_type FROM users WHERE id = ?').bind(payload.id).first();
      if (userRow && userRow.plan_type !== 'premium') {
        const expiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
        await env.DB.prepare('UPDATE job_listings SET expires_at = ? WHERE id = ?').bind(expiresAt, jobId).run();
      }
    } catch (expErr) {
      console.error('Error setting job expiration:', expErr);
    }

    // ── Send notification to admin about new job ──
    try {
      const notifEnabled = await env.DB.prepare("SELECT value FROM admin_settings WHERE key = 'notifications_enabled'").first();
      if (notifEnabled && notifEnabled.value === '1') {
        const admins = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
        if (admins.results && admins.results.length > 0) {
          const stmts = admins.results.map(a =>
            env.DB.prepare('INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)')
              .bind(a.id, 'new_job', 'Nuevo empleo registrado', `"${title.trim()}" en ${companyNameFinal} — pendiente de aprobación.`, '/admin.html#jobs')
          );
          await env.DB.batch(stmts);
        }
      }
    } catch (notifErr) {
      console.error('Error sending job notification:', notifErr);
    }

    return new Response(JSON.stringify({
      message: 'Oferta de empleo registrada exitosamente. Está pendiente de aprobación.',
      job_id: jobId,
      business_id: businessId,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Jobs POST error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de job_listings no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
