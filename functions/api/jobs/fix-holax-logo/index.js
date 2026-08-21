// One-time migration: update all HOLAX jobs with the correct logo
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
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

async function requireAuth(request, env) {
  const jwtSecret = env.JWT_SECRET || 'en-santiago_jwt_secret_2024_secure';
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyJWT(token, jwtSecret);
}

export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const user = await requireAuth(request, env);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Ensure column exists
    try { await env.DB.prepare(`ALTER TABLE job_listings ADD COLUMN business_logo TEXT`).run(); } catch(e) {}

    const LOGO_URL = '/api/serve?key=santiago%2Flogos%2F6%2F1783998320478_Logo_En Santiago.png';

    // Update all HOLAX jobs that have no logo, empty logo, or old default logo
    const result = await env.DB.prepare(
      `UPDATE job_listings SET business_logo = ? WHERE company_name = 'HOLAX' AND (business_logo IS NULL OR business_logo = '' OR business_logo = '/images/En Santiago.png')`
    ).bind(LOGO_URL).run();

    return new Response(JSON.stringify({
      message: 'Logo HOLAX actualizado',
      updated: result.meta.changes
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
