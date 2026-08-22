// functions/api/reviews/index.js
// GET: List reviews for a business (active only, with average rating)
// POST: Create a review (auth required)

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

// ─── GET: List reviews for a business ─────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const businessId = url.searchParams.get('business_id');

    if (!businessId) {
      return new Response(JSON.stringify({ error: 'business_id es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify business exists
    const business = await env.DB.prepare('SELECT id, title FROM businesses WHERE id = ?').bind(businessId).first();
    if (!business) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pagination
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 50);
    const offset = (page - 1) * limit;

    // Count total active reviews
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM reviews WHERE business_id = ? AND is_active = 1'
    ).bind(businessId).first();
    const total = countResult.total;

    // Calculate average rating from active reviews
    const avgResult = await env.DB.prepare(
      'SELECT COALESCE(AVG(rating), 0) as average_rating, COUNT(*) as total_ratings FROM reviews WHERE business_id = ? AND is_active = 1'
    ).bind(businessId).first();

    // Fetch reviews with user info
    const reviews = await env.DB.prepare(`
      SELECT
        r.id,
        r.business_id,
        r.user_id,
        r.rating,
        r.comment,
        r.is_active,
        r.created_at,
        u.name as user_name,
        u.avatar as user_avatar
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.business_id = ? AND r.is_active = 1
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(businessId, limit, offset).all();

    // Rating distribution
    const distribution = await env.DB.prepare(`
      SELECT rating, COUNT(*) as count
      FROM reviews
      WHERE business_id = ? AND is_active = 1
      GROUP BY rating
      ORDER BY rating DESC
    `).bind(businessId).all();

    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const row of distribution.results) {
      ratingBreakdown[row.rating] = row.count;
    }

    return new Response(JSON.stringify({
      reviews: reviews.results,
      average_rating: Math.round(avgResult.average_rating * 10) / 10,
      total_ratings: avgResult.total_ratings,
      rating_distribution: ratingBreakdown,
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
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create review ───────────────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if reviews are enabled
    const reviewsSetting = await env.DB.prepare(
      "SELECT value FROM admin_settings WHERE key = 'reviews_enabled'"
    ).first();
    if (reviewsSetting && reviewsSetting.value === '0') {
      return new Response(JSON.stringify({ error: 'Las reseñas están deshabilitadas temporalmente' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { business_id, rating, comment } = body;

    // Validate required fields
    if (!business_id) {
      return new Response(JSON.stringify({ error: 'business_id es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: 'La calificación debe ser entre 1 y 5' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify business exists
    const business = await env.DB.prepare('SELECT id, user_id as owner_id, title FROM businesses WHERE id = ?').bind(business_id).first();
    if (!business) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already reviewed this business (UNIQUE constraint)
    const existingReview = await env.DB.prepare(
      'SELECT id FROM reviews WHERE business_id = ? AND user_id = ?'
    ).bind(business_id, user.id).first();
    if (existingReview) {
      return new Response(JSON.stringify({ error: 'Ya has dejado una reseña para este negocio' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the review
    const result = await env.DB.prepare(`
      INSERT INTO reviews (business_id, user_id, rating, comment, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).bind(business_id, user.id, rating, comment || null).run();

    const reviewId = result.meta.last_row_id;

    // Recalculate and update business average rating
    const avgResult = await env.DB.prepare(
      'SELECT COALESCE(AVG(rating), 0) as new_avg FROM reviews WHERE business_id = ? AND is_active = 1'
    ).bind(business_id).first();
    await env.DB.prepare(
      'UPDATE businesses SET rating = ? WHERE id = ?'
    ).bind(Math.round(avgResult.new_avg * 10) / 10, business_id).run();

    // Award points if points system is enabled
    try {
      const pointsEnabled = await env.DB.prepare(
        "SELECT value FROM admin_settings WHERE key = 'points_enabled'"
      ).first();
      const pointsPerReview = await env.DB.prepare(
        "SELECT value FROM admin_settings WHERE key = 'points_per_review'"
      ).first();

      if (pointsEnabled && pointsEnabled.value === '1' && pointsPerReview) {
        const points = parseInt(pointsPerReview.value) || 25;
        await env.DB.prepare(`
          INSERT INTO points_log (user_id, business_id, points, action, description)
          VALUES (?, ?, ?, 'review', ?)
        `).bind(user.id, business_id, points, `Reseña creada para "${business.title}"`).run();
      }
    } catch (pointsError) {
      // Don't fail the review creation if points fail
      console.error('Error awarding points:', pointsError);
    }

    // Create notification for business owner
    try {
      if (business.owner_id && business.owner_id !== user.id) {
        await env.DB.prepare(`
          INSERT INTO notifications (user_id, type, title, message, link)
          VALUES (?, 'review', 'Nueva reseña', ?, ?)
        `).bind(
          business.owner_id,
          `${user.name || 'Un usuario'} dejó una reseña de ${rating} estrellas en "${business.title}"`,
          `/negocio/${business_id}`
        ).run();
      }
    } catch (notifError) {
      // Don't fail the review creation if notification fails
      console.error('Error creating notification:', notifError);
    }

    return new Response(JSON.stringify({
      message: 'Reseña creada exitosamente',
      review_id: reviewId,
      rating: rating,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Handle UNIQUE constraint violation
    if (error.message && error.message.includes('UNIQUE')) {
      return new Response(JSON.stringify({ error: 'Ya has dejado una reseña para este negocio' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
