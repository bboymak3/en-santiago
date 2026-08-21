// functions/api/tipos-negocio/index.js
// GET: List all active tipos de negocio (with category counts)
// POST: Create new tipo (admin only)

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
  const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';
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

// GET: List all active tipos de negocio, optionally with their categories
export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const includeCategories = url.searchParams.get('include_categories') === '1';

    const tipos = await env.DB.prepare(
      'SELECT * FROM tipos_negocio WHERE is_active = 1 ORDER BY sort_order ASC, name ASC'
    ).all();

    if (includeCategories) {
      const enriched = [];
      for (const tipo of tipos.results) {
        const cats = await env.DB.prepare(
          `SELECT c.*, (SELECT COUNT(*) FROM businesses b WHERE b.category_id = c.id AND b.status = 'approved') as business_count
           FROM categories c WHERE c.tipo_negocio_id = ? AND c.is_active = 1 ORDER BY c.sort_order ASC, c.name ASC`
        ).bind(tipo.id).all();
        enriched.push({ ...tipo, categories: cats.results });
      }
      return new Response(JSON.stringify({ tipos: enriched }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const withCounts = await Promise.all(tipos.results.map(async (tipo) => {
      const countRow = await env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM categories c WHERE c.tipo_negocio_id = ? AND c.is_active = 1'
      ).bind(tipo.id).first();
      return { ...tipo, category_count: countRow ? countRow.cnt : 0 };
    }));

    return new Response(JSON.stringify({ tipos: withCounts }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error al obtener tipos de negocio', debug: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST: Create new tipo (admin only)
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const admin = await requireAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ error: 'No autorizado. Se requiere rol de administrador.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { name, icon, color, description, sort_order } = body;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre del tipo de negocio es requerido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slug = slugify(name);
    const existing = await env.DB.prepare('SELECT id FROM tipos_negocio WHERE slug = ?').bind(slug).first();
    if (existing) {
      return new Response(JSON.stringify({ error: 'Ya existe un tipo de negocio con un slug similar.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await env.DB.prepare(
      'INSERT INTO tipos_negocio (name, slug, icon, color, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      name.trim(), slug,
      icon || 'fas fa-briefcase',
      color || '#607d8b',
      description || null,
      sort_order !== undefined ? parseInt(sort_order) : 99
    ).run();

    const newTipo = await env.DB.prepare('SELECT * FROM tipos_negocio WHERE id = ?').bind(result.meta.last_row_id).first();

    return new Response(JSON.stringify({ message: 'Tipo de negocio creado exitosamente', tipo: newTipo }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}