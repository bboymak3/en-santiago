// functions/api/business-stats/[businessId].js
// GET: Retrieve analytics stats for a specific business
// Requires auth (JWT). Only business owner or admin can view.

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

function getPeriodDays(period) {
  switch (period) {
    case '7d': return 7;
    case '90d': return 90;
    case '30d':
    default: return 30;
  }
}

export async function onRequestGet(context) {
  try {
    const { request, env, params } = context;
    const { businessId } = params;
    const url = new URL(request.url);
    const periodParam = url.searchParams.get('period') || '30d';
    const allParam = url.searchParams.get('all') === 'true';

    // Auth required
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const user = await verifyJWT(token, env.JWT_SECRET || 'aunclick_default_secret_2024');
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Database unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure table exists
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS business_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        source TEXT,
        ip_hash TEXT NOT NULL,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    // Admin aggregate stats (all=true)
    if (allParam && user.role === 'admin') {
      const days = getPeriodDays(periodParam);
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const [totals, dailyViews, dailyWhatsapp] = await Promise.all([
        env.DB.prepare(`
          SELECT
            COUNT(CASE WHEN event_type = 'view' THEN 1 END) as total_views,
            COUNT(CASE WHEN event_type = 'whatsapp_click' THEN 1 END) as total_whatsapp_clicks,
            COUNT(CASE WHEN event_type = 'website_click' THEN 1 END) as total_website_clicks,
            COUNT(CASE WHEN event_type = 'phone_click' THEN 1 END) as total_phone_clicks,
            COUNT(CASE WHEN event_type = 'share' THEN 1 END) as total_shares
          FROM business_analytics
          WHERE created_at > ?
        `).bind(sinceDate).first(),

        env.DB.prepare(`
          SELECT date(created_at) as date, COUNT(*) as views
          FROM business_analytics
          WHERE event_type = 'view' AND created_at > ?
          GROUP BY date(created_at)
          ORDER BY date(created_at) ASC
        `).bind(sinceDate).all(),

        env.DB.prepare(`
          SELECT date(created_at) as date, COUNT(*) as clicks
          FROM business_analytics
          WHERE event_type = 'whatsapp_click' AND created_at > ?
          GROUP BY date(created_at)
          ORDER BY date(created_at) ASC
        `).bind(sinceDate).all(),
      ]);

      return new Response(JSON.stringify({
        business_id: 0,
        period: periodParam,
        aggregate: true,
        total_views: totals.total_views || 0,
        total_whatsapp_clicks: totals.total_whatsapp_clicks || 0,
        total_website_clicks: totals.total_website_clicks || 0,
        total_phone_clicks: totals.total_phone_clicks || 0,
        total_shares: totals.total_shares || 0,
        daily_views: dailyViews.results || [],
        daily_whatsapp: dailyWhatsapp.results || [],
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single business stats — check ownership
    const businessIdNum = parseInt(businessId);
    if (isNaN(businessIdNum)) {
      return new Response(JSON.stringify({ error: 'ID de negocio inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const business = await env.DB.prepare('SELECT user_id FROM businesses WHERE id = ?').bind(businessIdNum).first();
    if (!business) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user.role !== 'admin' && user.id !== business.user_id) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para ver estas estadísticas' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const days = getPeriodDays(periodParam);
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [totals, dailyViews, dailyWhatsapp] = await Promise.all([
      env.DB.prepare(`
        SELECT
          COUNT(CASE WHEN event_type = 'view' THEN 1 END) as total_views,
          COUNT(CASE WHEN event_type = 'whatsapp_click' THEN 1 END) as total_whatsapp_clicks,
          COUNT(CASE WHEN event_type = 'website_click' THEN 1 END) as total_website_clicks,
          COUNT(CASE WHEN event_type = 'phone_click' THEN 1 END) as total_phone_clicks,
          COUNT(CASE WHEN event_type = 'share' THEN 1 END) as total_shares
        FROM business_analytics
        WHERE business_id = ? AND created_at > ?
      `).bind(businessIdNum, sinceDate).first(),

      env.DB.prepare(`
        SELECT date(created_at) as date, COUNT(*) as views
        FROM business_analytics
        WHERE business_id = ? AND event_type = 'view' AND created_at > ?
        GROUP BY date(created_at)
        ORDER BY date(created_at) ASC
      `).bind(businessIdNum, sinceDate).all(),

      env.DB.prepare(`
        SELECT date(created_at) as date, COUNT(*) as clicks
        FROM business_analytics
        WHERE business_id = ? AND event_type = 'whatsapp_click' AND created_at > ?
        GROUP BY date(created_at)
        ORDER BY date(created_at) ASC
      `).bind(businessIdNum, sinceDate).all(),
    ]);

    return new Response(JSON.stringify({
      business_id: businessIdNum,
      period: periodParam,
      total_views: totals.total_views || 0,
      total_whatsapp_clicks: totals.total_whatsapp_clicks || 0,
      total_website_clicks: totals.total_website_clicks || 0,
      total_phone_clicks: totals.total_phone_clicks || 0,
      total_shares: totals.total_shares || 0,
      daily_views: dailyViews.results || [],
      daily_whatsapp: dailyWhatsapp.results || [],
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