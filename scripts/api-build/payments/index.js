// functions/api/payments/index.js
// GET: List payments (admin: all, user: own)
// POST: Create payment with proof upload

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

// GET: List payments
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const currentUser = await verifyJWT(token, env.JWT_SECRET || 'aunclick_default_secret_2024');
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const statusFilter = url.searchParams.get('status');
    const paymentType = url.searchParams.get('payment_type');

    let whereClause = 'WHERE 1=1';
    const bindings = [];

    if (currentUser.role === 'admin') {
      // Admin sees all payments
    } else {
      whereClause += ' AND p.user_id = ?';
      bindings.push(currentUser.id);
    }

    if (statusFilter) {
      whereClause += ' AND p.status = ?';
      bindings.push(statusFilter);
    }

    if (paymentType) {
      whereClause += ' AND p.payment_type = ?';
      bindings.push(paymentType);
    }

    const countQuery = `SELECT COUNT(*) as total FROM payments p ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    const query = `
      SELECT p.*,
             u.name as user_name, u.email as user_email, u.role as user_role,
             u.plan as user_plan
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const payments = await env.DB.prepare(query).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      payments: payments.results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Payments GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST: Create payment
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const currentUser = await verifyJWT(token, jwtSecret);
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { amount, payment_type, proof_url, notes, product_id } = body;

    if (!amount || !payment_type) {
      return new Response(JSON.stringify({ error: 'Monto y tipo de pago son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validTypes = ['subscription_quarterly', 'subscription_annual', 'product_renewal', 'seller_fee'];
    if (!validTypes.includes(payment_type)) {
      return new Response(JSON.stringify({ error: 'Tipo de pago inválido', validTypes }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validAmounts = { subscription_quarterly: 30, subscription_annual: 100, product_renewal: 1 };
    if (validAmounts[payment_type] && parseFloat(amount) !== validAmounts[payment_type]) {
      return new Response(JSON.stringify({
        error: `El monto para ${payment_type} debe ser $${validAmounts[payment_type]}`
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!proof_url) {
      return new Response(JSON.stringify({ error: 'Debes adjuntar el comprobante de pago' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let validUntil = null;
    if (payment_type === 'subscription_quarterly') {
      validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    } else if (payment_type === 'subscription_annual') {
      validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    } else if (payment_type === 'product_renewal' && product_id) {
      validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const result = await env.DB.prepare(`
      INSERT INTO payments (user_id, amount, currency, payment_type, status, proof_url, notes, valid_until)
      VALUES (?, ?, 'USD', ?, 'pending', ?, ?, ?)
    `).bind(
      currentUser.id,
      parseFloat(amount),
      payment_type,
      proof_url,
      notes || null,
      validUntil
    ).run();

    const paymentId = result.meta.last_row_id;

    const typeLabels = {
      subscription_quarterly: 'Suscripción Trimestral ($30)',
      subscription_annual: 'Suscripción Anual ($100)',
      product_renewal: 'Renovación de Producto ($1)',
      seller_fee: 'Pago de Vendedor',
    };
    await env.DB.prepare(
      'INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)'
    ).bind(
      'new_payment',
      'Nuevo comprobante de pago',
      `${typeLabels[payment_type] || payment_type} - Usuario ID: ${currentUser.id}`,
      paymentId
    ).run();

    return new Response(JSON.stringify({
      message: 'Comprobante de pago enviado. Esperando verificación del administrador.',
      payment_id: paymentId,
      status: 'pending',
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Payments POST error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}