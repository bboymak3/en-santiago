// functions/api/categories/[id].js
// PUT: Update category (admin only)
// DELETE: Soft-delete / deactivate category (admin only)

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
  const jwtSecret = env.JWT_SECRET || 'en-santiago_default_secret_2024';
  const user = await verifyJWT(token, jwtSecret);
  if (!user || user.role !== 'admin') return null;
  return user;
}

// ─── PUT: Update category ───────────────────────────────────
// FIX: Cuando se cambia el `name`, se regenera el `slug` (manteniéndolo único).
// Antes el slug NO se actualizaba, lo que dejaba la categoría inconsistente
// (mostraba el nombre nuevo pero el slug viejo, rompiendo /categoria/:slug
// y los enlaces de negocios que dependen de category_slug por JOIN).
export async function onRequestPut(context) {
  try {
    const { request, env, params } = context;
    const admin = await requireAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ error: 'No autorizado.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const catId = parseInt(params.id);
    if (isNaN(catId)) {
      return new Response(JSON.stringify({ error: 'ID invalido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { name, slug: explicitSlug, icon, color, sort_order, is_active, banner_url } = body;

    // Auto-migrate: add banner_url column if missing
    try { await env.DB.prepare('ALTER TABLE categories ADD COLUMN banner_url TEXT').run(); } catch(e) {}

    const existing = await env.DB.prepare('SELECT id, name, slug FROM categories WHERE id = ?').bind(catId).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Categoria no encontrada.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Slug regeneration logic ─────────────────────────────────
    // 1) Si el admin pasa un `slug` explícito en el body, se usa tal cual (sanitizado).
    // 2) Si no, y el `name` cambió, se regenera a partir del nuevo nombre.
    // 3) Si el `name` no cambió y no hay slug explícito, NO se toca el slug.
    function slugify(text) {
      return (text || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80);
    }

    let newSlug = null;
    let slugSource = null; // 'explicit' | 'regenerated'
    if (explicitSlug !== undefined && typeof explicitSlug === 'string' && explicitSlug.trim()) {
      newSlug = slugify(explicitSlug);
      slugSource = 'explicit';
    } else if (name !== undefined && name.trim() && name.trim() !== existing.name) {
      newSlug = slugify(name);
      slugSource = 'regenerated';
    }

    // Validate uniqueness only if slug is changing
    if (newSlug && newSlug !== existing.slug) {
      let candidate = newSlug;
      let counter = 1;
      while (counter <= 100) {
        const dup = await env.DB.prepare(
          'SELECT id FROM categories WHERE slug = ? AND id != ?'
        ).bind(candidate, catId).first();
        if (!dup) break;
        candidate = newSlug + '-' + counter;
        counter++;
      }
      newSlug = candidate;
    } else if (newSlug && newSlug === existing.slug) {
      // No change needed
      newSlug = null;
      slugSource = null;
    }

    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
    if (newSlug !== null) {
      updates.push('slug = ?');
      values.push(newSlug);
      updates.push("updated_at = datetime('now')");
    }
    if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(parseInt(sort_order)); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (banner_url !== undefined) { updates.push('banner_url = ?'); values.push(banner_url); }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No se proporcionaron campos para actualizar.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    values.push(catId);
    await env.DB.prepare('UPDATE categories SET ' + updates.join(', ') + ' WHERE id = ?').bind(...values).run();

    const updated = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(catId).first();

    return new Response(JSON.stringify({
      message: 'Categoria actualizada',
      category: updated,
      slug_changed: newSlug !== null,
      previous_slug: newSlug !== null ? existing.slug : null,
      new_slug: newSlug,
      slug_source: slugSource,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Category PUT error:', error);
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── DELETE: Deactivate category (soft delete) ──────────────
export async function onRequestDelete(context) {
  try {
    const { request, env, params } = context;
    const admin = await requireAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ error: 'No autorizado.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const catId = parseInt(params.id);
    if (isNaN(catId)) {
      return new Response(JSON.stringify({ error: 'ID invalido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Soft delete: set is_active = 0
    await env.DB.prepare('UPDATE categories SET is_active = 0 WHERE id = ?').bind(catId).run();

    return new Response(JSON.stringify({ message: 'Categoria desactivada exitosamente' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Category DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}