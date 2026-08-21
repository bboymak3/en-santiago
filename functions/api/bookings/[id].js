// functions/api/bookings/[id].js
// GET: Get single booking
// PATCH: Update booking status (confirm/cancel/complete). Owner can confirm/cancel, user can cancel.
// DELETE: Delete booking (own booking or admin)

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

// ─── GET: Get single booking ───────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { id } = params;

    const booking = await env.DB.prepare(`
      SELECT
        b.*,
        biz.title as business_name,
        biz.slug as business_slug,
        biz.phone as business_phone,
        biz.address as business_address,
        biz.city as business_city,
        biz.state as business_state,
        biz.lat as business_lat,
        biz.lng as business_lng,
        u.name as user_name,
        u.phone as user_phone,
        u.email as user_email,
        u.avatar as user_avatar
      FROM bookings b
      LEFT JOIN businesses biz ON b.business_id = biz.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `).bind(id).first();

    if (!booking) {
      return new Response(JSON.stringify({ error: 'Reserva no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(booking), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Booking GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── PATCH: Update booking status ───────────────────────────────
export async function onRequestPatch(context) {
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

    // Check booking exists
    const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
    if (!booking) {
      return new Response(JSON.stringify({ error: 'Reserva no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { action, status } = body;
    const newStatus = action || status;

    if (!newStatus) {
      return new Response(JSON.stringify({ error: 'Se requiere una acción o estado para actualizar la reserva' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validStatuses = ['confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      return new Response(JSON.stringify({ error: 'Estado no válido', validStatuses }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check transition validity
    if (booking.status === 'cancelled') {
      return new Response(JSON.stringify({ error: 'No se puede modificar una reserva cancelada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (booking.status === 'completed' && newStatus !== 'cancelled') {
      return new Response(JSON.stringify({ error: 'No se puede modificar una reserva completada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine user role relative to this booking
    const businessOwner = await env.DB.prepare('SELECT user_id FROM businesses WHERE id = ?').bind(booking.business_id).first();
    const isBookingUser = booking.user_id === user.id;
    const isBusinessOwner = businessOwner && businessOwner.user_id === user.id;
    const isAdmin = user.role === 'admin';

    // Permission checks per action
    if (newStatus === 'confirmed') {
      // Only business owner or admin can confirm
      if (!isBusinessOwner && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Solo el dueño del negocio o un administrador puede confirmar reservas' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (newStatus === 'cancelled') {
      // Booking user, business owner, or admin can cancel
      if (!isBookingUser && !isBusinessOwner && !isAdmin) {
        return new Response(JSON.stringify({ error: 'No tienes permiso para cancelar esta reserva' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (newStatus === 'completed') {
      // Only business owner or admin can mark as completed
      if (!isBusinessOwner && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Solo el dueño del negocio o un administrador puede marcar reservas como completadas' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Update booking status
    await env.DB.prepare(
      "UPDATE bookings SET status = ? WHERE id = ?"
    ).bind(newStatus, id).run();

    const statusMessages = {
      confirmed: 'Reserva confirmada exitosamente',
      cancelled: 'Reserva cancelada exitosamente',
      completed: 'Reserva marcada como completada exitosamente',
    };

    return new Response(JSON.stringify({ message: statusMessages[newStatus] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Booking PATCH error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── DELETE: Delete booking (own booking or admin) ───────────────
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

    const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
    if (!booking) {
      return new Response(JSON.stringify({ error: 'Reserva no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorization check: booking owner or admin
    if (user.role !== 'admin' && booking.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para eliminar esta reserva' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ message: 'Reserva eliminada exitosamente' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Booking DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
