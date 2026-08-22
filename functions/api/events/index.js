// functions/api/events/index.js
// GET: List events (with filters). Increment views when ?id=N is provided.
// POST: Create event (requires auth). Auto-generate slug from name.

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

// ─── Slug generator ──────────────────────────────────────────────
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 120);
}

// ─── GET: List events ────────────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const params = url.searchParams;

    // If ?id=N is provided, increment views for that event and return it
    const viewId = params.get('id');
    if (viewId) {
      const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(viewId).first();
      if (!event) {
        return new Response(JSON.stringify({ error: 'Evento no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Increment views (best effort — graceful if column doesn't exist)
      try {
        await env.DB.prepare('UPDATE events SET views = views + 1 WHERE id = ?').bind(viewId).run();
      } catch (e) {
        // views column may not exist, ignore
      }
      return new Response(JSON.stringify({ event }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List events with filters
    const status = params.get('status'); // 'active', 'inactive', or all
    const state = params.get('state');
    const page = parseInt(params.get('page')) || 1;
    const limit = parseInt(params.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const search = params.get('search');

    const conditions = [];
    const bindings = [];

    if (status === 'active') {
      conditions.push('active = 1');
    } else if (status === 'inactive') {
      conditions.push('active = 0');
    }
    // If no status filter, return all

    if (search) {
      conditions.push('(name LIKE ? OR description LIKE ? OR location LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (state) {
      // Filter by location/state if the table has a state-like column
      // Using location column for state filtering
      conditions.push('location LIKE ?');
      bindings.push(`%${state}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM events ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    // Fetch events
    const query = `SELECT * FROM events ${whereClause} ORDER BY event_date DESC, created_at DESC LIMIT ? OFFSET ?`;
    const events = await env.DB.prepare(query).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      events: events.results,
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
    console.error('Events GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create event ──────────────────────────────────────────
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

    // Check if events feature is enabled in admin_settings
    try {
      const setting = await env.DB.prepare('SELECT value FROM admin_settings WHERE key = ?').bind('events_enabled').first();
      if (setting && setting.value === '0') {
        return new Response(JSON.stringify({ error: 'La función de eventos está desactivada por el administrador' }), {
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
      return new Response(JSON.stringify({ error: 'El nombre del evento es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-generate slug from name
    let slug = body.slug || generateSlug(body.name);

    // Ensure slug uniqueness — append number suffix if collision
    const existingSlug = await env.DB.prepare('SELECT id FROM events WHERE slug = ?').bind(slug).first();
    if (existingSlug) {
      let counter = 2;
      while (true) {
        const candidate = `${slug}-${counter}`;
        const exists = await env.DB.prepare('SELECT id FROM events WHERE slug = ?').bind(candidate).first();
        if (!exists) {
          slug = candidate;
          break;
        }
        counter++;
        if (counter > 100) break; // safety limit
      }
    }

    // Check if events table has user_id column — try to include it
    const hasUserId = await checkColumnExists(env, 'events', 'user_id');

    let result;
    if (hasUserId) {
      result = await env.DB.prepare(`
        INSERT INTO events (slug, name, description, location, event_date, active, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        slug,
        body.name.trim(),
        body.description || '',
        body.location || '',
        body.event_date || '',
        body.active !== undefined ? (body.active ? 1 : 0) : 1,
        user.id
      ).run();
    } else {
      result = await env.DB.prepare(`
        INSERT INTO events (slug, name, description, location, event_date, active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        slug,
        body.name.trim(),
        body.description || '',
        body.location || '',
        body.event_date || '',
        body.active !== undefined ? (body.active ? 1 : 0) : 1
      ).run();
    }

    const eventId = result.meta.last_row_id;

    return new Response(JSON.stringify({
      message: 'Evento creado exitosamente',
      event_id: eventId,
      slug,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Events POST error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de eventos no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message && error.message.includes('UNIQUE constraint failed')) {
      errorMsg = 'Error: Ya existe un evento con ese slug.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── Helper: Check if a column exists in a table ────────────────
async function checkColumnExists(env, table, column) {
  try {
    // SQLite: PRAGMA table_info returns all columns
    const rows = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
    return rows.results.some((row) => row.name === column);
  } catch (e) {
    return false;
  }
}
