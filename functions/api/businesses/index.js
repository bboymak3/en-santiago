// functions/api/businesses/index.js
// GET: List businesses (with filters)
// POST: Create business (requires auth)

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

// ─── GET: List businesses ───────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible. Verifica el binding D1 en Cloudflare Pages.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-migrate: ensure expires_at and logo columns exist
    try { await env.DB.prepare('ALTER TABLE businesses ADD COLUMN expires_at TEXT').run(); } catch(e) { /* column may exist */ }
    try { await env.DB.prepare("ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT 'basic'").run(); } catch(e) { /* column may exist */ }
    try { await env.DB.prepare("ALTER TABLE businesses ADD COLUMN logo TEXT").run(); } catch(e) { /* column may exist */ }
    try { await env.DB.prepare("ALTER TABLE businesses ADD COLUMN custom_html TEXT").run(); } catch(e) { /* column may exist */ }
    try { await env.DB.prepare("ALTER TABLE businesses ADD COLUMN banner TEXT").run(); } catch(e) { /* column may exist */ }
    try { await env.DB.prepare("ALTER TABLE businesses ADD COLUMN especialidad TEXT").run(); } catch(e) { /* column may exist */ }

    const url = new URL(request.url);
    const params = url.searchParams;

    const businessType = params.get('business_type');
    const categorySlug = params.get('categoria');
    const city = params.get('city');
    const state = params.get('state');
    let status = params.get('status') || 'approved';
    const page = parseInt(params.get('page')) || 1;
    const limit = Math.min(parseInt(params.get('limit')) || 12, 500);
    const offset = (page - 1) * limit;
    const search = params.get('search');
    const sort = params.get('sort') || 'newest';
    const userId = params.get('user_id');
    const featured = params.get('featured');
    const especialidad = params.get('especialidad');

    const conditions = [];
    const bindings = [];

    // Support comma-separated statuses (e.g. status=approved,pending,rejected)
    if (status.includes(',')) {
      const statusList = status.split(',').map(s => s.trim()).filter(Boolean);
      const placeholders = statusList.map(() => '?').join(', ');
      conditions.push(`p.status IN (${placeholders})`);
      bindings.push(...statusList);
    } else {
      conditions.push('p.status = ?');
      bindings.push(status);
    }

    if (userId) {
      conditions.push('p.user_id = ?');
      bindings.push(parseInt(userId));
    }

    if (businessType) {
      conditions.push('p.business_type = ?');
      bindings.push(businessType);
    }
    if (categorySlug) {
      // Support both slug and numeric id
      if (!isNaN(categorySlug)) {
        conditions.push('p.category_id = ?');
        bindings.push(parseInt(categorySlug));
      } else {
        conditions.push('p.category_id = (SELECT id FROM categories WHERE slug = ?)');
        bindings.push(categorySlug);
      }
    }
    if (state) {
      conditions.push('p.state = ?');
      bindings.push(state);
    }
    if (city) {
      conditions.push('p.city LIKE ?');
      bindings.push(`%${city}%`);
    }
    if (featured === '1') {
      conditions.push('p.featured = 1');
    }
    if (especialidad) {
      conditions.push('p.especialidad LIKE ?');
      bindings.push(`%${especialidad}%`);
    }
    // Expired posts go to the end, not hidden
    // No filter — expired posts are sorted last via ORDER BY
    if (search) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.address LIKE ? OR p.especialidad LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Sort options — featured businesses always first, then premium, then newest
    let orderBy = 'p.created_at DESC';
    if (sort === 'views_desc') orderBy = 'p.featured DESC, p.views DESC';
    else if (sort === 'price_asc') orderBy = 'p.featured DESC, p.price ASC';
    else if (sort === 'price_desc') orderBy = 'p.featured DESC, p.price DESC';
    else if (sort === 'oldest') orderBy = 'p.featured DESC, p.created_at ASC';
    else orderBy = "p.featured DESC, (SELECT CASE WHEN u.plan_type = 'premium' THEN 0 ELSE 1 END FROM users u WHERE u.id = p.user_id), CASE WHEN p.expires_at IS NOT NULL AND p.expires_at <= datetime('now') THEN 1 ELSE 0 END, p.created_at DESC";

    // Count total matching businesses
    const countQuery = `SELECT COUNT(*) as total FROM businesses p WHERE ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    // Fetch businesses — try with tipos_negocio JOIN, fallback without
    let businesses;
    try {
      const queryWithTipo = `
        SELECT 
          p.*,
          c.name as category_name, c.slug as category_slug,
          tn.slug as tipo_negocio_slug, tn.name as tipo_negocio_name,
          u.name as owner_name, u.phone as owner_phone, u.whatsapp as owner_whatsapp, u.avatar as owner_avatar,
          (SELECT url FROM images WHERE business_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
          (SELECT COUNT(*) FROM images WHERE business_id = p.id) as image_count
        FROM businesses p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;
      businesses = await env.DB.prepare(queryWithTipo).bind(...bindings, limit, offset).all();
    } catch (joinErr) {
      const querySimple = `
        SELECT 
          p.*,
          c.name as category_name, c.slug as category_slug,
          u.name as owner_name, u.phone as owner_phone, u.whatsapp as owner_whatsapp, u.avatar as owner_avatar,
          (SELECT url FROM images WHERE business_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
          (SELECT COUNT(*) FROM images WHERE business_id = p.id) as image_count
        FROM businesses p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;
      businesses = await env.DB.prepare(querySimple).bind(...bindings, limit, offset).all();
    }

    return new Response(JSON.stringify({
      businesses: businesses.results,
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
    console.error('Businesses GET error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de businesses no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create business ──────────────────────────────────────
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

    // Auto-migrate: ensure all required columns exist (same as GET handler)
    try { await env.DB.prepare('ALTER TABLE businesses ADD COLUMN expires_at TEXT').run(); } catch(e) { /* column may exist */ }
    try { await env.DB.prepare("ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT 'basic'").run(); } catch(e) { /* column may exist */ }
    try { await env.DB.prepare("ALTER TABLE businesses ADD COLUMN logo TEXT").run(); } catch(e) { /* column may exist */ }
    try { await env.DB.prepare("ALTER TABLE businesses ADD COLUMN custom_html TEXT").run(); } catch(e) { /* column may exist */ }
    try { await env.DB.prepare("ALTER TABLE businesses ADD COLUMN banner TEXT").run(); } catch(e) { /* column may exist */ }
    try { await env.DB.prepare("ALTER TABLE businesses ADD COLUMN especialidad TEXT").run(); } catch(e) { /* column may exist */ }

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

    // Check user plan type for business limits
    const userRow = await env.DB.prepare('SELECT plan_type FROM users WHERE id = ?').bind(payload.id).first();
    const isPremium = userRow && userRow.plan_type === 'premium';

    // Basic users: max 10 businesses
    if (!isPremium) {
      const countResult = await env.DB.prepare('SELECT COUNT(*) as cnt FROM businesses WHERE user_id = ?').bind(payload.id).first();
      if (countResult && countResult.cnt >= 10) {
        return new Response(JSON.stringify({
          error: 'Has alcanzado el límite de 10 negocios para el plan Básico. Mejora a Premium para publicaciones ilimitadas.',
          code: 'LIMIT_REACHED',
          current: countResult.cnt,
          limit: 10,
          upgrade_url: '/planes.html'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await request.json();

    // Required fields - title is mandatory, category and business_type have defaults
    const { title, category_id, business_type } = body;
    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'El título es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default category to 'variedades' if not provided
    const catInput = category_id || 'variedades';

    // Resolve category_id: accept numeric ID or slug string
    let resolvedCategoryId = catInput;
    if (isNaN(parseInt(catInput))) {
      // It's a slug - look up the numeric ID
      const catRow = await env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(catInput).first();
      if (catRow) {
        resolvedCategoryId = catRow.id;
      } else {
        // Category not in DB - try to create it
        try {
          const slugName = catInput.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const insertResult = await env.DB.prepare(
            'INSERT INTO categories (name, slug, icon, color, sort_order) VALUES (?, ?, ?, ?, 99)'
          ).bind(slugName, catInput, 'fas fa-store', '#8B0000').run();
          resolvedCategoryId = insertResult.meta.last_row_id;
        } catch (insertErr) {
          // If still can't insert, default to first category
          const fallback = await env.DB.prepare('SELECT id FROM categories ORDER BY sort_order LIMIT 1').first();
          resolvedCategoryId = fallback ? fallback.id : 1;
        }
      }
    } else {
      resolvedCategoryId = parseInt(catInput);
    }

    // Derive business_type from category's tipo_negocio (for SEO slug URLs)
    // Allowed by old CHECK constraint: negocio, profesional, servicio, restaurante, tienda, otro
    const ALLOWED_TYPES = ['negocio', 'profesional', 'servicio', 'restaurante', 'tienda', 'otro'];
    let finalBusinessType = business_type;
    if (!finalBusinessType || ['negocio', 'otro'].includes(finalBusinessType)) {
      try {
        const catTipo = await env.DB.prepare(
          'SELECT tn.slug FROM categories c JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id WHERE c.id = ?'
        ).bind(resolvedCategoryId).first();
        const derived = catTipo ? catTipo.slug : 'negocio';
        // If constraint still exists, fall back to allowed value
        finalBusinessType = ALLOWED_TYPES.includes(derived) ? derived : 'negocio';
      } catch (e) {
        finalBusinessType = 'negocio';
      }
    } else if (!ALLOWED_TYPES.includes(finalBusinessType)) {
      // New tipo slug sent but CHECK constraint may still exist — map to closest allowed
      finalBusinessType = 'negocio';
    }

    // Generate unique slug from title
    function generateSlug(text) {
      return (text || '').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 120);
    }

    async function ensureUniqueSlug(db, baseSlug, excludeId) {
      let candidate = baseSlug;
      let counter = 1;
      while (counter <= 100) {
        const existing = await db.prepare('SELECT id FROM businesses WHERE slug = ? AND id != ?').bind(candidate, excludeId || 0).first();
        if (!existing) break;
        candidate = baseSlug + '-' + counter;
        counter++;
      }
      return candidate;
    }

    let slug = generateSlug(title);
    if (slug) {
      slug = await ensureUniqueSlug(env.DB, slug, 0);
    }

    const result = await env.DB.prepare(`
      INSERT INTO businesses (
        user_id, title, slug, description, category_id, business_type,
        address, city, state, country, lat, lng,
        phone, whatsapp, website, instagram, facebook, twitter, tiktok, youtube, email_contact, schedule,
        has_parking, has_wifi, has_card, has_delivery, has_outdoor,
        video_url, logo, banner, especialidad,
        status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      payload.id,
      title,
      slug,
      body.description || null,
      resolvedCategoryId,
      finalBusinessType,
      body.address || null,
      body.city || 'Mérida',
      body.state || 'Mérida',
      body.country || 'Venezuela',
      body.lat || null,
      body.lng || null,
      body.phone || null,
      body.whatsapp || null,
      body.website || null,
      body.instagram || null,
      body.facebook || null,
      body.twitter || null,
      body.tiktok || null,
      body.youtube || null,
      body.email_contact || null,
      body.schedule || null,
      body.has_parking ? 1 : 0,
      body.has_wifi ? 1 : 0,
      body.has_card ? 1 : 0,
      body.has_delivery ? 1 : 0,
      body.has_outdoor ? 1 : 0,
      body.video_url || null,
      body.logo || null,
      body.banner || null,
      body.especialidad || null,
      'pending'
    ).run();

    const businessId = result.meta.last_row_id;

    // Apply plan-based rules
    // Basic: 20-day expiration
    // Premium: no expiration
    try {
      if (!isPremium) {
        const expiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
        await env.DB.prepare('UPDATE businesses SET expires_at = ? WHERE id = ?').bind(expiresAt, businessId).run();
      }
      // Premium: expires_at stays NULL (never expires)
    } catch (expErr) {
      console.error('Error setting business expiration:', expErr);
    }

    // ── Send notification about new business ──
    try {
      const notifSetting = await env.DB.prepare("SELECT value FROM admin_settings WHERE key = 'notifications_enabled'").first();
      if (notifSetting && notifSetting.value === '1') {
        const businessTitle = body.titulo || body.title || 'Negocio';
        const notifTitle = 'Nuevo negocio registrado';
        const notifMsg = `"${businessTitle}" se ha registrado y está pendiente de aprobación.`;

        // Always notify admin(s)
        const admins = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
        if (admins.results && admins.results.length > 0) {
          const adminStmts = admins.results.map(a =>
            env.DB.prepare('INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)')
              .bind(a.id, 'new_business', notifTitle, notifMsg, `/admin.html#businesses`)
          );
          await env.DB.batch(adminStmts);
        }

        // Optionally notify all users
        const notifyAll = await env.DB.prepare("SELECT value FROM admin_settings WHERE key = 'notify_all_users'").first();
        if (notifyAll && notifyAll.value === '1') {
          const allUsers = await env.DB.prepare('SELECT id FROM users WHERE is_active = 1 AND role != ?').bind('admin').all();
          if (allUsers.results && allUsers.results.length > 0) {
            const userStmts = allUsers.results.map(u =>
              env.DB.prepare('INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)')
                .bind(u.id, 'new_business', notifTitle, notifMsg, `/negocio/${businessId}`)
            );
            await env.DB.batch(userStmts);
          }
        }
      }
    } catch (notifErr) {
      console.error('Error sending notification:', notifErr);
      // Don't fail the business creation if notification fails
    }

    return new Response(JSON.stringify({
      message: 'Negocio registrado exitosamente. Está pendiente de aprobación.' + (isPremium ? '' : ' Tu plan Básico tiene una duración de 20 días. Renueva publicando nuevamente o mejora a Premium para que nunca caduque.'),
      business_id: businessId,
      plan: isPremium ? 'premium' : 'basic',
      expires_in_days: isPremium ? null : 20,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Businesses POST error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de businesses no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

