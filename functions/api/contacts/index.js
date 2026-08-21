// functions/api/contacts/index.js
// GET: List contact messages (auth required)
// POST: Send contact message for a business

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

// ─── GET: List contact messages (auth required) ───────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';

    // Auth required
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorizacion requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const user = await verifyJWT(token, jwtSecret);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token invalido o expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get messages for businesses owned by the user (or all if admin)
    let query;
    let bindings;

    if (user.role === 'admin') {
      query = `
        SELECT c.*, p.title as business_title, p.user_id as business_owner_id
        FROM contacts c
        LEFT JOIN businesses p ON c.business_id = p.id
        ORDER BY c.created_at DESC
        LIMIT 100
      `;
      bindings = [];
    } else {
      query = `
        SELECT c.*, p.title as business_title, p.user_id as business_owner_id
        FROM contacts c
        LEFT JOIN businesses p ON c.business_id = p.id
        WHERE p.user_id = ?
        ORDER BY c.created_at DESC
        LIMIT 100
      `;
      bindings = [user.id];
    }

    const result = await env.DB.prepare(query).bind(...bindings).all();

    return new Response(JSON.stringify({
      contacts: result.results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contacts GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Send contact message ───────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const { business_id, sender_name, sender_email, sender_phone, message } = body;

    // Validation
    if (!business_id || !sender_name || !sender_email || !message) {
      return new Response(JSON.stringify({ error: 'business_id, nombre, email y mensaje son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sender_email)) {
      return new Response(JSON.stringify({ error: 'Formato de email inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check business exists
    const business = await env.DB.prepare('SELECT id, title FROM businesses WHERE id = ? AND status = ?').bind(business_id, 'approved').first();
    if (!business) {
      return new Response(JSON.stringify({ error: 'Propiedad no encontrada o no disponible' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert contact message
    const result = await env.DB.prepare(
      'INSERT INTO contacts (business_id, sender_name, sender_email, sender_phone, message) VALUES (?, ?, ?, ?, ?)'
    ).bind(business_id, sender_name, sender_email, sender_phone || null, message).run();

    const contactId = result.meta.last_row_id;

    return new Response(JSON.stringify({
      message: 'Mensaje enviado exitosamente',
      contact_id: contactId,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
