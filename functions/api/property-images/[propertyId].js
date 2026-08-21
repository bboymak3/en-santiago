// functions/api/property-images/[propertyId].js
// GET: List images for a property
// POST: Add image record (url-based, no file upload)
// DELETE: Delete an image record

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

// GET: List images
export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { propertyId } = params;
    const images = await env.DB.prepare(
      'SELECT * FROM property_images WHERE property_id = ? ORDER BY is_cover DESC, order_index ASC'
    ).bind(propertyId).all();
    return new Response(JSON.stringify({ images: images.results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST: Add image record (url-based)
export async function onRequestPost(context) {
  try {
    const { request, env, params } = context;
    const { propertyId } = params;
    const jwtSecret = env.JWT_SECRET || 'aunclick_jwt_secret_2024';

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify property ownership
    const property = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(propertyId).first();
    if (!property) {
      return new Response(JSON.stringify({ error: 'Propiedad no encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (payload.role !== 'admin' && payload.id !== property.user_id) {
      return new Response(JSON.stringify({ error: 'Sin permisos' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    if (!body.url) {
      return new Response(JSON.stringify({ error: 'URL de imagen requerida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count existing images
    const countResult = await env.DB.prepare('SELECT COUNT(*) as cnt FROM property_images WHERE property_id = ?').bind(propertyId).first();
    const orderIndex = countResult.cnt;

    const isCover = body.is_cover ? 1 : 0;
    if (isCover) {
      await env.DB.prepare('UPDATE property_images SET is_cover = 0 WHERE property_id = ?').bind(propertyId).run();
    }
    if (countResult.cnt === 0) {
      // First image is always cover
      const result = await env.DB.prepare(
        'INSERT INTO property_images (property_id, url, thumbnail_url, is_cover, order_index) VALUES (?, ?, ?, 1, 0)'
      ).bind(propertyId, body.url, body.thumbnail_url || null).run();
      return new Response(JSON.stringify({ id: result.meta.last_row_id, message: 'Imagen agregada (portada)' }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await env.DB.prepare(
      'INSERT INTO property_images (property_id, url, thumbnail_url, is_cover, order_index) VALUES (?, ?, ?, ?, ?)'
    ).bind(propertyId, body.url, body.thumbnail_url || null, isCover, orderIndex).run();

    return new Response(JSON.stringify({ id: result.meta.last_row_id, message: 'Imagen agregada' }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// DELETE: Delete image
export async function onRequestDelete(context) {
  try {
    const { request, env, params } = context;
    const { propertyId } = params;
    const jwtSecret = env.JWT_SECRET || 'aunclick_jwt_secret_2024';

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const imageId = url.searchParams.get('image_id');
    if (!imageId) {
      return new Response(JSON.stringify({ error: 'image_id requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    const property = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(propertyId).first();
    if (payload.role !== 'admin' && payload.id !== property.user_id) {
      return new Response(JSON.stringify({ error: 'Sin permisos' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const img = await env.DB.prepare('SELECT * FROM property_images WHERE id = ? AND property_id = ?').bind(imageId, propertyId).first();
    if (img) {
      // Try delete from R2
      try {
        if (env.R2 && img.url && img.url.includes('key=')) {
          const urlObj = new URL(img.url, 'https://dummy.com');
          const key = urlObj.searchParams.get('key');
          if (key) await env.R2.delete(key);
        }
      } catch (e) {}
      await env.DB.prepare('DELETE FROM property_images WHERE id = ?').bind(imageId).run();
    }

    return new Response(JSON.stringify({ message: 'Imagen eliminada' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
