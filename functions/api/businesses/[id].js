// functions/api/businesses/[id].js
// GET: Get business by ID
// PUT: Update business (owner or admin only)
// DELETE: Delete business (owner or admin only)

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

// ─── GET: Get business by ID ────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { id } = params;

    const business = await env.DB.prepare(`
      SELECT p.*, u.name as owner_name, u.phone as owner_phone, u.whatsapp as owner_whatsapp, u.email as owner_email, u.avatar as owner_avatar, u.bio as owner_bio, u.plan_type as owner_plan_type,
        c.name as category_name, c.slug as category_slug
      FROM businesses p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).bind(id).first();

    if (!business) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all images for this business
    const images = await env.DB.prepare(
      'SELECT * FROM images WHERE business_id = ? ORDER BY is_cover DESC, order_index ASC'
    ).bind(id).all();

    // Increment views
    await env.DB.prepare("UPDATE businesses SET views = views + 1 WHERE id = ? AND status = 'approved'").bind(id).run();

    return new Response(JSON.stringify({
      ...business,
      images: images.results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── PUT: Update business ───────────────────────────────────────
export async function onRequestPut(context) {
  try {
    const { request, env, params } = context;
    const { id } = params;

    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check business exists
    const business = await env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(id).first();
    if (!business) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check authorization: owner or admin
    if (user.role !== 'admin' && user.id !== business.user_id) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para editar este negocio' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    // Validate business_type against CHECK constraint
    const ALLOWED_BIZ_TYPES = ['negocio', 'profesional', 'servicio', 'restaurante', 'tienda', 'otro'];
    if (body.business_type !== undefined && !ALLOWED_BIZ_TYPES.includes(body.business_type)) {
      body.business_type = 'negocio';
    }

    // Resolve category_id: accept numeric ID or slug string
    if (body.category_id !== undefined && isNaN(parseInt(body.category_id))) {
      const catRow = await env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(body.category_id).first();
      if (catRow) {
        body.category_id = catRow.id;
      } else {
        delete body.category_id; // invalid slug — skip
      }
    } else if (body.category_id !== undefined) {
      body.category_id = parseInt(body.category_id);
    }

    // Build dynamic UPDATE query — only business-relevant fields
    const allowedFields = [
      'title', 'description', 'category_id', 'business_type',
      'address', 'city', 'state', 'country', 'lat', 'lng',
      'phone', 'whatsapp', 'website', 'instagram', 'facebook',
      'twitter', 'tiktok', 'youtube', 'video_url', 'logo', 'banner',
      'email_contact', 'schedule',
      'has_parking', 'has_wifi', 'has_card', 'has_delivery', 'has_outdoor',
      'custom_html', 'especialidad', 'seo_description', 'custom_jsonld',
      'web_url', 'web_page_mode',
    ];

    const setClauses = [];
    const bindings = [];

    // Admin-only fields: featured, status
    if (user.role === 'admin') {
      if (body.featured !== undefined) {
        setClauses.push('featured = ?');
        bindings.push(body.featured ? 1 : 0);
      }
      if (body.status !== undefined) {
        setClauses.push('status = ?');
        bindings.push(body.status);
      }
    }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        let value = body[field];
        // Convert boolean fields to integers
        if (field.startsWith('has_') || field === 'featured') {
          value = value ? 1 : 0;
        }
        bindings.push(value);
      }
    }

    // Regenerate slug if title changed
    if (body.title && body.title !== business.title) {
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

      let newSlug = generateSlug(body.title);
      if (newSlug) {
        newSlug = await ensureUniqueSlug(env.DB, newSlug, parseInt(id));
        setClauses.push('slug = ?');
        bindings.push(newSlug);
      }
    }

    if (setClauses.length === 0) {
      return new Response(JSON.stringify({ error: 'No se proporcionaron campos para actualizar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    setClauses.push("updated_at = datetime('now')");
    bindings.push(id);

    await env.DB.prepare(
      `UPDATE businesses SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...bindings).run();

    return new Response(JSON.stringify({ message: 'Negocio actualizado exitosamente' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── DELETE: Delete business ────────────────────────────────────
export async function onRequestDelete(context) {
  try {
    const { request, env, params } = context;
    const { id } = params;

    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const business = await env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(id).first();
    if (!business) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user.role !== 'admin' && user.id !== business.user_id) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para eliminar este negocio' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete images from R2 bucket (best effort)
    try {
      const images = await env.DB.prepare('SELECT url FROM images WHERE business_id = ?').bind(id).all();
      for (const img of images.results) {
        try {
          // Extract key from URL
          const urlObj = new URL(img.url);
          const key = urlObj.pathname.substring(1); // remove leading slash
          await env.R2.delete(key);
        } catch (e) {
          // Ignore R2 deletion errors
        }
      }
    } catch (e) {
      // Ignore errors
    }

    // Delete related records that lack ON DELETE CASCADE
    try { await env.DB.prepare('DELETE FROM contacts WHERE business_id = ?').bind(id).run(); } catch (e) {}
    try { await env.DB.prepare('DELETE FROM favorites WHERE business_id = ?').bind(id).run(); } catch (e) {}
    try { await env.DB.prepare('DELETE FROM conversations WHERE business_id = ?').bind(id).run(); } catch (e) {}

    // Now safe to delete business (images cascade automatically due to FK)
    await env.DB.prepare('DELETE FROM businesses WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ message: 'Negocio eliminado exitosamente' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
