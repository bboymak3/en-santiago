// functions/api/categories/index.js
// GET: List all active categories (public)
// POST: Create new category (admin only)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

// ─── JWT helpers ─────────────────────────────────────────────
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
  const data = headerB64 + '.' + payloadB64;
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

async function requireAdmin(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const jwtSecret = env.JWT_SECRET || 'en-santiago_default_secret_2024';
  const user = await verifyJWT(token, jwtSecret);
  if (!user || user.role !== 'admin') return null;
  return user;
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// ─── GET: List all active categories ───────────────────────
export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-migrate: add banner_url column if missing
    try { await env.DB.prepare('ALTER TABLE categories ADD COLUMN banner_url TEXT').run(); } catch(e) {}

    // Try with tipos_negocio JOIN first; fallback to simple query if table doesn't exist
    let categories;
    try {
      categories = await env.DB.prepare(
        `SELECT c.*, 
          tn.name as tipo_negocio_name, tn.slug as tipo_negocio_slug, tn.icon as tipo_negocio_icon,
          (SELECT COUNT(*) FROM businesses b WHERE b.category_id = c.id AND b.status = 'approved') as business_count 
         FROM categories c 
         LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
         WHERE c.is_active = 1 ORDER BY c.sort_order ASC, c.name ASC`
      ).all();
    } catch (joinErr) {
      // tipos_negocio table may not exist yet (migration pending)
      categories = await env.DB.prepare(
        `SELECT c.*,
          (SELECT COUNT(*) FROM businesses b WHERE b.category_id = c.id AND b.status = 'approved') as business_count 
         FROM categories c 
         WHERE c.is_active = 1 ORDER BY c.sort_order ASC, c.name ASC`
      ).all();
    }

    return new Response(JSON.stringify({ categories: categories.results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error al obtener categorias', debug: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create new category (admin only) ────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const admin = await requireAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ error: 'No autorizado. Se requiere rol de administrador.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { name, icon, color, sort_order, tipo_negocio_id } = body;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre de la categoria es requerido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slug = slugify(name);

    // Check slug uniqueness
    const existing = await env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(slug).first();
    if (existing) {
      return new Response(JSON.stringify({ error: 'Ya existe una categoria con un slug similar.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await env.DB.prepare(
      'INSERT INTO categories (name, slug, icon, color, sort_order, is_active, tipo_negocio_id) VALUES (?, ?, ?, ?, ?, 1, ?)'
    ).bind(
      name.trim(),
      slug,
      icon || 'fas fa-store',
      color || '#607d8b',
      sort_order !== undefined ? parseInt(sort_order) : 99,
      tipo_negocio_id ? parseInt(tipo_negocio_id) : null
    ).run();

    const newCat = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(result.meta.last_row_id).first();

    return new Response(JSON.stringify({ message: 'Categoria creada exitosamente', category: newCat }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Category POST error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}