// functions/api/marketplace/index.js
// GET: List all products (no auth needed). Check marketplace_enabled in admin_settings.
// POST: Create product (auth required). Check marketplace_enabled in admin_settings.

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

async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyJWT(token, env.JWT_SECRET);
}

// ─── GET: List all products ─────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if marketplace is enabled
    try {
      const setting = await env.DB.prepare('SELECT value FROM admin_settings WHERE key = ?').bind('marketplace_enabled').first();
      if (setting && setting.value === '0') {
        return new Response(JSON.stringify({ error: 'El marketplace está desactivado por el administrador', products: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // admin_settings table may not exist yet — allow listing
    }

    const url = new URL(request.url);
    const params = url.searchParams;

    const category = params.get('category');
    const page = parseInt(params.get('page')) || 1;
    const limit = parseInt(params.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const search = params.get('search');
    const sort = params.get('sort') || 'newest';
    // Admin mode requires admin authentication
    let allProducts = false;
    if (params.get('all') === 'true') {
      const user = await getUserFromRequest(request, env);
      if (user && user.role === 'admin') {
        allProducts = true;
      }
    }
    const statusFilter = params.get('status');

    const conditions = [];
    const bindings = [];

    // Only show approved products to public (unless admin mode)
    if (!allProducts) {
      conditions.push("(p.status = 'approved' OR p.status IS NULL)");
      // Expired products go to the end, not hidden
    } else if (statusFilter) {
      conditions.push('p.status = ?');
      bindings.push(statusFilter);
    }

    if (category) {
      conditions.push('p.category = ?');
      bindings.push(category);
    }

    const businessId = params.get('business_id');
    if (businessId) {
      conditions.push('p.business_id = ?');
      bindings.push(parseInt(businessId));
    }

    const userId = params.get('user_id');
    if (userId) {
      conditions.push('p.user_id = ?');
      bindings.push(parseInt(userId));
    }

    if (search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sort options — featured products always first
    let orderBy = "p.featured DESC, CASE WHEN p.expires_at IS NOT NULL AND p.expires_at <= datetime('now') THEN 1 ELSE 0 END, p.sort_order ASC, p.created_at DESC";
    if (sort === 'price_asc') orderBy = "p.featured DESC, CASE WHEN p.expires_at IS NOT NULL AND p.expires_at <= datetime('now') THEN 1 ELSE 0 END, p.price ASC";
    else if (sort === 'price_desc') orderBy = "p.featured DESC, CASE WHEN p.expires_at IS NOT NULL AND p.expires_at <= datetime('now') THEN 1 ELSE 0 END, p.price DESC";
    else if (sort === 'oldest') orderBy = "p.featured DESC, CASE WHEN p.expires_at IS NOT NULL AND p.expires_at <= datetime('now') THEN 1 ELSE 0 END, p.created_at ASC";
    else if (sort === 'name_asc') orderBy = "p.featured DESC, CASE WHEN p.expires_at IS NOT NULL AND p.expires_at <= datetime('now') THEN 1 ELSE 0 END, p.name ASC";
    else orderBy = "p.featured DESC, CASE WHEN p.expires_at IS NOT NULL AND p.expires_at <= datetime('now') THEN 1 ELSE 0 END, p.sort_order ASC, p.created_at DESC";

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    // Fetch products
    let query;
    if (allProducts) {
      // Admin mode: include user info
      query = `
        SELECT p.id, p.name, p.price, p.category, p.image, p.description, p.sort_order,
               p.user_id, p.business_id, p.status, p.created_at, p.updated_at, p.expires_at,
               u.name as owner_name, u.email as owner_email, b.title as business_name
        FROM products p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN businesses b ON p.business_id = b.id
        ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    } else {
      query = `
        SELECT p.id, p.name, p.price, p.category, p.image, p.description, p.sort_order,
               p.user_id, p.business_id, p.status, p.created_at, p.updated_at, p.slug, p.expires_at,
               b.title as business_name, b.slug as business_slug,
               b.city as business_city, b.state as business_state,
               b.phone as business_phone, b.whatsapp as business_whatsapp
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    }
    const products = await env.DB.prepare(query).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      products: products.results,
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
    console.error('Marketplace GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create product ────────────────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if marketplace is enabled
    try {
      const setting = await env.DB.prepare('SELECT value FROM admin_settings WHERE key = ?').bind('marketplace_enabled').first();
      if (setting && setting.value === '0') {
        return new Response(JSON.stringify({ error: 'El marketplace está desactivado por el administrador' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // admin_settings table may not exist yet — allow creation
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre del producto es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.price === undefined || body.price === null) {
      return new Response(JSON.stringify({ error: 'El precio del producto es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default category to 'general' if not provided
    const category = body.category || 'general';
    const validCategories = ['general', 'vehiculos', 'inmuebles', 'electronica', 'servicios', 'ropa', 'hogar'];
    if (!validCategories.includes(category)) {
      return new Response(JSON.stringify({ error: 'Categoría inválida', validCategories }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const businessId = body.business_id ? parseInt(body.business_id) : null;

    // Generate unique slug from product name
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
        const existing = await db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').bind(candidate, excludeId || 0).first();
        if (!existing) break;
        candidate = baseSlug + '-' + counter;
        counter++;
      }
      return candidate;
    }

    let slug = generateSlug(body.name);
    if (slug) {
      slug = await ensureUniqueSlug(env.DB, slug, 0);
    }

    const result = await env.DB.prepare(`
      INSERT INTO products (name, slug, price, category, image, description, video_url, sort_order, user_id, business_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      body.name.trim(),
      slug,
      parseInt(body.price),
      category,
      body.image || '',
      body.description || '',
      body.video_url || null,
      body.sort_order !== undefined ? parseInt(body.sort_order) : 0,
      user.id,
      businessId
    ).run();

    const productId = result.meta.last_row_id;

    // Set expiration for basic users (20 days)
    try {
      const userRow = await env.DB.prepare('SELECT plan_type FROM users WHERE id = ?').bind(user.id).first();
      if (userRow && userRow.plan_type !== 'premium') {
        const expiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
        await env.DB.prepare('UPDATE products SET expires_at = ? WHERE id = ?').bind(expiresAt, productId).run();
      }
    } catch (expErr) {
      console.error('Error setting product expiration:', expErr);
    }

    // ── Send notification about new product ──
    try {
      const notifEnabled = await env.DB.prepare("SELECT value FROM admin_settings WHERE key = 'notifications_enabled'").first();
      if (notifEnabled && notifEnabled.value === '1') {
        const prodName = body.name || 'Producto';
        const notifTitle = 'Nuevo producto registrado';
        const notifMsg = `"${prodName}" se ha registrado y está pendiente de aprobación.`;

        // Notify admin(s)
        const admins = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
        if (admins.results && admins.results.length > 0) {
          const adminStmts = admins.results.map(a =>
            env.DB.prepare('INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)')
              .bind(a.id, 'new_product', notifTitle, notifMsg, '/admin.html#bazar')
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
                .bind(u.id, 'new_product', notifTitle, notifMsg, '/bazar.html')
            );
            await env.DB.batch(userStmts);
          }
        }
      }
    } catch (notifErr) {
      console.error('Error sending product notification:', notifErr);
    }

    return new Response(JSON.stringify({
      message: 'Producto creado exitosamente',
      product_id: productId,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Marketplace POST error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de productos no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
