// functions/api/seller/stats.js
// GET: Statistics for the authenticated seller (users referred, averages by month/day/year)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB no disponible' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = await verifyJWT(authHeader.substring(7), jwtSecret);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token invalido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sellerId = user.id;
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'all'; // all, today, week, month, year

    // Total users referred
    const totalResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM users WHERE referred_by = ?'
    ).bind(sellerId).first();

    // Total active users referred
    const activeResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM users WHERE referred_by = ? AND is_active = 1'
    ).bind(sellerId).first();

    // Premium users referred (check if they have any premium-related activity)
    const premiumResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM users WHERE referred_by = ?'
    ).bind(sellerId).first();

    // Filter by period
    let dateFilter = '';
    const now = new Date();
    switch (period) {
      case 'today':
        dateFilter = "AND date(u.created_at) = date('now')";
        break;
      case 'week':
        dateFilter = "AND u.created_at >= datetime('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND u.created_at >= datetime('now', '-1 month')";
        break;
      case 'year':
        dateFilter = "AND u.created_at >= datetime('now', '-1 year')";
        break;
    }

    // Period-filtered count
    const periodResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM users u WHERE u.referred_by = ? ${dateFilter}`
    ).bind(sellerId).first();

    // Averages by month (last 12 months)
    const monthlyAvg = await env.DB.prepare(`
      SELECT
        strftime('%Y-%m', u.created_at) as month,
        COUNT(*) as count
      FROM users u
      WHERE u.referred_by = ? AND u.created_at >= datetime('now', '-12 months')
      GROUP BY strftime('%Y-%m', u.created_at)
      ORDER BY month DESC
    `).bind(sellerId).all();

    const monthlyCounts = monthlyAvg.results.map(r => r.count);
    const avgPerMonth = monthlyCounts.length > 0
      ? (monthlyCounts.reduce((a, b) => a + b, 0) / monthlyCounts.length).toFixed(1)
      : 0;

    // Averages by day of week
    const dayOfWeekAvg = await env.DB.prepare(`
      SELECT
        CAST(strftime('%w', u.created_at) AS INTEGER) as day_of_week,
        COUNT(*) as count
      FROM users u
      WHERE u.referred_by = ?
      GROUP BY day_of_week
      ORDER BY day_of_week
    `).bind(sellerId).all();

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const dayAverages = dayOfWeekAvg.results.map(r => ({
      day: dayNames[r.day_of_week] || 'Desconocido',
      count: r.count
    }));

    // Averages by year
    const yearlyAvg = await env.DB.prepare(`
      SELECT
        strftime('%Y', u.created_at) as year,
        COUNT(*) as count
      FROM users u
      WHERE u.referred_by = ?
      GROUP BY year
      ORDER BY year DESC
    `).bind(sellerId).all();

    // Recent referred users (last 10)
    const recentUsers = await env.DB.prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at
       FROM users u
       WHERE u.referred_by = ?
       ORDER BY u.created_at DESC
       LIMIT 10`
    ).bind(sellerId).all();

    // Content created by referred users (safe queries)
    let contentStats = { total_businesses: 0, total_properties: 0, total_products: 0, total_jobs: 0 };
    try {
      contentStats = await env.DB.prepare(`
        SELECT
          (SELECT COUNT(*) FROM businesses b WHERE b.user_id IN (SELECT id FROM users WHERE referred_by = ?)) as total_businesses,
          (SELECT COUNT(*) FROM properties p WHERE p.user_id IN (SELECT id FROM users WHERE referred_by = ?)) as total_properties,
          (SELECT COUNT(*) FROM products p WHERE p.user_id IN (SELECT id FROM users WHERE referred_by = ?)) as total_products
      `).bind(sellerId, sellerId, sellerId).first();
    } catch(e) { /* tables may not exist yet */ }

    return new Response(JSON.stringify({
      stats: {
        total_referred: totalResult?.total || 0,
        active_referred: activeResult?.total || 0,
        period_referred: periodResult?.total || 0,
        avg_per_month: parseFloat(avgPerMonth),
        monthly_data: monthlyAvg.results,
        day_of_week_data: dayAverages,
        yearly_data: yearlyAvg.results,
        content_by_referrals: {
          businesses: contentStats?.total_businesses || 0,
          properties: contentStats?.total_properties || 0,
          products: contentStats?.total_products || 0,
          jobs: contentStats?.total_jobs || 0,
        },
      },
      recent_users: recentUsers.results,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}