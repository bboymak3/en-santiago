// functions/api/business-stats/track.js
// POST: Track business analytics events (page views, WhatsApp clicks, etc.)
// Public endpoint — no auth required. Rate-limited by IP hash.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

const VALID_EVENT_TYPES = ['view', 'whatsapp_click', 'website_click', 'phone_click', 'share'];
const VALID_SOURCES = ['ficha', 'landing', 'product'];
const RATE_LIMIT_PER_MINUTE = 10;

async function hashIP(ip, secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + '|' + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { business_id, event_type, source } = body;

    // Validate
    if (!business_id || !VALID_EVENT_TYPES.includes(event_type)) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validatedSource = VALID_SOURCES.includes(source) ? source : null;
    const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';

    // Get client IP
    const clientIP = request.headers.get('CF-Connecting-IP')
      || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
      || 'unknown';

    // Hash IP for privacy
    const ipHash = await hashIP(clientIP, jwtSecret);

    // Rate limit: max RATE_LIMIT_PER_MINUTE events per business_id per IP hash per minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const rateCheck = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM business_analytics
       WHERE business_id = ? AND ip_hash = ? AND created_at > ?`
    ).bind(business_id, ipHash, oneMinuteAgo).first();

    if (rateCheck && rateCheck.count >= RATE_LIMIT_PER_MINUTE) {
      // Silently drop — return 200 OK
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user agent (truncated for storage)
    const userAgent = (request.headers.get('User-Agent') || '').substring(0, 500);

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

    // Insert event
    await env.DB.prepare(`
      INSERT INTO business_analytics (business_id, event_type, source, ip_hash, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(business_id, event_type, validatedSource, ipHash, userAgent).run();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Always return 200 to not break page rendering
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}