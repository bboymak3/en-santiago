// functions/api/featured-items/index.js
// GET: List all featured items
// POST: Create a featured item (admin only)
// DELETE: Remove a featured item (admin only)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

// ─── GET: List featured items ──────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(context.request.url);
    const itemType = url.searchParams.get('item_type'); // business, product, job, property
    const conditions = [];
    const bindings = [];

    // Only show active featured items (not expired)
    conditions.push("(end_date IS NULL OR end_date > datetime('now'))");

    if (itemType) {
      conditions.push('item_type = ?');
      bindings.push(itemType);
    }

    const whereClause = conditions.join(' AND ');
    const query = `SELECT * FROM featured_items WHERE ${whereClause} ORDER BY created_at DESC`;
    const result = await env.DB.prepare(query).bind(...bindings).all();

    // For each featured item, verify the actual item still exists and is approved/active
    const validItems = [];
    for (const item of result.results) {
      try {
        let exists = false;
        if (item.item_type === 'business') {
          const biz = await env.DB.prepare('SELECT id, status FROM businesses WHERE id = ? AND status = ?').bind(item.item_id, 'approved').first();
          exists = !!biz;
        } else if (item.item_type === 'property') {
          const prop = await env.DB.prepare('SELECT id, status FROM properties WHERE id = ? AND status = ?').bind(item.item_id, 'approved').first();
          exists = !!prop;
        } else if (item.item_type === 'product') {
          const prod = await env.DB.prepare('SELECT id, status FROM products WHERE id = ? AND status = ?').bind(item.item_id, 'approved').first();
          exists = !!prod;
        } else if (item.item_type === 'job') {
          const job = await env.DB.prepare('SELECT id, status FROM job_listings WHERE id = ? AND status = ?').bind(item.item_id, 'approved').first();
          exists = !!job;
        }
        if (exists) validItems.push(item);
      } catch(e) {
        // If check fails, skip this item
      }
    }

    return new Response(JSON.stringify({ featured_items: validItems }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create featured item (admin only) ───────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'aunclick_jwt_secret_2024_secure';
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const user = await verifyJWT(token, jwtSecret);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden gestionar destacados' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { item_type, item_id, title, start_date, end_date } = body;

    if (!item_type || !item_id) {
      return new Response(JSON.stringify({ error: 'item_type e item_id son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validTypes = ['business', 'product', 'job', 'property', 'medical'];
    if (!validTypes.includes(item_type)) {
      return new Response(JSON.stringify({ error: `item_type inválido. Valores: ${validTypes.join(', ')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set featured flag on the actual item
    if (item_type === 'business' || item_type === 'medical') {
      try { await env.DB.prepare('UPDATE businesses SET featured = 1 WHERE id = ?').bind(parseInt(item_id)).run(); } catch(e) {}
    } else if (item_type === 'product') {
      try { await env.DB.prepare('UPDATE products SET featured = 1 WHERE id = ?').bind(parseInt(item_id)).run(); } catch(e) {}
    } else if (item_type === 'property') {
      try { await env.DB.prepare('UPDATE properties SET featured = 1 WHERE id = ?').bind(parseInt(item_id)).run(); } catch(e) {}
    } else if (item_type === 'job') {
      try { await env.DB.prepare('UPDATE job_listings SET featured = 1 WHERE id = ?').bind(parseInt(item_id)).run(); } catch(e) {}
    }

    // Also record in featured_items table
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const endDate = end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const result = await env.DB.prepare(`
      INSERT INTO featured_items (item_type, item_id, user_id, title, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      item_type,
      parseInt(item_id),
      user.id,
      title || null,
      start_date || now,
      endDate
    ).run();

    return new Response(JSON.stringify({
      message: 'Elemento destacado guardado exitosamente',
      id: result.meta.last_row_id,
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Featured items POST error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── DELETE: Remove featured item (admin only) ────────────────
export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'aunclick_jwt_secret_2024_secure';
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const user = await verifyJWT(token, jwtSecret);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden gestionar destacados' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id') || url.pathname.split('/').pop();

    if (!id || id === 'featured-items') {
      return new Response(JSON.stringify({ error: 'ID del elemento destacado requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the featured item to know what to un-feature
    const item = await env.DB.prepare('SELECT * FROM featured_items WHERE id = ?').bind(parseInt(id)).first();
    if (item) {
      // Remove featured flag from the actual item
      if (item.item_type === 'business' || item.item_type === 'medical') {
        await env.DB.prepare('UPDATE businesses SET featured = 0, featured_at = NULL WHERE id = ?').bind(item.item_id).run();
      } else if (item.item_type === 'product') {
        await env.DB.prepare('UPDATE products SET featured = 0, featured_at = NULL WHERE id = ?').bind(item.item_id).run();
      } else if (item.item_type === 'property') {
        await env.DB.prepare('UPDATE properties SET featured = 0 WHERE id = ?').bind(item.item_id).run();
      } else if (item.item_type === 'job') {
        await env.DB.prepare('UPDATE job_listings SET featured = 0 WHERE id = ?').bind(item.item_id).run();
      }

      await env.DB.prepare('DELETE FROM featured_items WHERE id = ?').bind(parseInt(id)).run();
    }

    return new Response(JSON.stringify({ message: 'Elemento destacado eliminado' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Featured items DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
