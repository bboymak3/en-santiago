// functions/api/featured-items/[id].js
// DELETE: Remove featured item (admin only)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
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
  let base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  const payload = JSON.parse(atob(base64));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

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

    const user = await verifyJWT(authHeader.substring(7), jwtSecret);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden eliminar destacados' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get ID from URL path: /api/featured-items/123
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const itemId = parseInt(pathParts[pathParts.length - 1]);
    if (!itemId || isNaN(itemId)) {
      return new Response(JSON.stringify({ error: 'ID inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get item info before deleting
    const item = await env.DB.prepare('SELECT * FROM featured_items WHERE id = ?').bind(itemId).first();
    if (!item) {
      return new Response(JSON.stringify({ error: 'Item destacado no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete featured item
    await env.DB.prepare('DELETE FROM featured_items WHERE id = ?').bind(itemId).run();

    // Unset featured flag on the actual item
    try {
      if (item.item_type === 'business') {
        await env.DB.prepare('UPDATE businesses SET featured = 0 WHERE id = ?').bind(item.item_id).run();
      } else if (item.item_type === 'product') {
        await env.DB.prepare('UPDATE products SET featured = 0 WHERE id = ?').bind(item.item_id).run();
      } else if (item.item_type === 'property') {
        await env.DB.prepare('UPDATE properties SET featured = 0 WHERE id = ?').bind(item.item_id).run();
      } else if (item.item_type === 'job') {
        await env.DB.prepare('UPDATE job_listings SET featured = 0 WHERE id = ?').bind(item.item_id).run();
      }
    } catch (e) {
      // Ignore errors on featured flag update
    }

    return new Response(JSON.stringify({ message: 'Item destacado eliminado' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Featured items DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
