// functions/api/settings/index.js
// GET: Get all settings (admin only, auth required)
// PUT: Update settings (admin only, auth required). Accept body: {key: value, key2: value2}
// POST: Reset settings to defaults (admin only, auth required)

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
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
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

// ─── Default settings ───────────────────────────────────────────
const DEFAULT_SETTINGS = {
  events_enabled: '1',
  marketplace_enabled: '1',
  businesses_enabled: '1',
  jobs_enabled: '1',
  // FIX: Módulos adicionales del sitio que faltaban en allowed_keys
  medical_enabled: '1',
  properties_enabled: '1',
  weather_enabled: '1',
  // FIX: Toggles específicos para secciones destacadas del home
  featured_businesses_enabled: '1',
  featured_medical_enabled: '1',
  featured_properties_enabled: '1',
  featured_products_enabled: '1',
  featured_jobs_enabled: '1',
  // Chat configuration
  chat_enabled: '1',
  chat_mode: 'all', // 'all' | 'premium_only' | 'none'
  registrations_enabled: '1',
  maintenance_mode: '0',
  site_name: 'En Santiago Santiago',
  site_description: 'Directorio de negocios y servicios en Santiago, Santiago de Chile',
  contact_email: '',
  whatsapp_number: '',
  max_businesses_per_user: '10',
  require_approval: '1',
  featured_price: '0',
  // Toggle settings used by admin panel
  ai_chatbot_enabled: '0',
  ai_chatbot_welcome: '',
  reviews_enabled: '1',
  coupons_enabled: '1',
  bookings_enabled: '0',
  points_enabled: '0',
  emergency_enabled: '1',
  anonymous_comments_enabled: '1',
  // Bazar
  bazar_enabled: '0',
  // Video Carousel
  video_carousel_enabled: '0',
  // Popup (Ventana Emergente)
  popup_enabled: '0',
  popup_image_url: '',
  popup_link_url: '',
  // Points configuration
  points_per_visit: '10',
  points_per_review: '20',
  points_per_booking: '15',
  // Hero banner
  hero_banner_url: '',
  // FIX: Banner de la página de búsqueda
  search_banner_url: '',
  // Hero logo (overlays on banner)
  hero_logo_url: '',
  // Marketplace banner
  marketplace_banner_url: '',
  // Notifications
  notifications_enabled: '1',
  notify_all_users: '0',
};

// ─── Allowed setting keys (whitelist) ───────────────────────────
// Also allow hero_logo_url even if it was added after initial seed
const ALLOWED_KEYS = [...Object.keys(DEFAULT_SETTINGS), 'hero_logo_url', 'marketplace_banner_url', 'popup_enabled', 'popup_image_url', 'popup_link_url', 'ensantiago_logo_url', 'empleo_banner_url'];
// Deduplicate
const ALLOWED_KEYS_SET = [...new Set(ALLOWED_KEYS)];

// ─── Ensure the admin_settings table exists ───────────────────────
async function ensureSettingsTable(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `).run();
  } catch (e) {
    // Table may already exist, ignore
  }
}

// ─── Ensure all default settings are seeded ──────────────────────
async function seedDefaults(env) {
  await ensureSettingsTable(env);

  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    try {
      // Only insert if key doesn't exist (upsert-like behavior)
      await env.DB.prepare(
        `INSERT OR IGNORE INTO admin_settings (key, value) VALUES (?, ?)`
      ).bind(key, defaultValue).run();
    } catch (e) {
      // Ignore individual insert errors
    }
  }
}

// ─── GET: Get all settings ───────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin only
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acceso denegado. Solo administradores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure table and defaults exist
    await seedDefaults(env);

    // Fetch all settings
    const rows = await env.DB.prepare('SELECT * FROM admin_settings ORDER BY key ASC').all();

    // Convert rows array to a flat key-value object
    const settings = {};
    for (const row of rows.results) {
      settings[row.key] = row.value;
    }

    return new Response(JSON.stringify({
      settings,
      allowed_keys: ALLOWED_KEYS_SET,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── PUT: Update settings ───────────────────────────────────────
export async function onRequestPut(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin only
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acceso denegado. Solo administradores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure table exists
    await ensureSettingsTable(env);

    const body = await request.json();

    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      return new Response(JSON.stringify({ error: 'No se proporcionaron configuraciones para actualizar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter to allowed keys only
    const updates = {};
    const rejected = [];

    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_KEYS_SET.includes(key)) {
        updates[key] = String(value); // All values stored as TEXT
      } else {
        rejected.push(key);
      }
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No se proporcionaron claves válidas para actualizar', allowed_keys: ALLOWED_KEYS_SET }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apply each update using UPSERT (INSERT OR REPLACE)
    const results = {};
    for (const [key, value] of Object.entries(updates)) {
      try {
        await env.DB.prepare(
          `INSERT INTO admin_settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, key = excluded.key`
        ).bind(key, value).run();
        results[key] = value;
      } catch (e) {
        results[key] = `Error: ${e.message}`;
      }
    }

    // If ensantiago_logo_url was updated, bulk-update all HOLAX jobs
    let ensantiagoJobsUpdated = 0;
    if (updates.ensantiago_logo_url !== undefined && updates.ensantiago_logo_url) {
      try {
        // Ensure business_logo column exists
        try { await env.DB.prepare(`ALTER TABLE job_listings ADD COLUMN business_logo TEXT`).run(); } catch(e) {}
        const upd = await env.DB.prepare(
          `UPDATE job_listings SET business_logo = ? WHERE company_name = 'HOLAX'`
        ).bind(updates.ensantiago_logo_url).run();
        ensantiagoJobsUpdated = upd.meta.changes || 0;
      } catch (e) {
        console.error('Error updating HOLAX jobs logo:', e);
      }
    }

    const response = {
      message: 'Configuraciones actualizadas exitosamente',
      updated: results,
    };
    if (ensantiagoJobsUpdated > 0) {
      response.ensantiago_jobs_updated = ensantiagoJobsUpdated;
      response.message += ` (${ensantiagoJobsUpdated} empleo(s) HOLAX actualizado(s) con el nuevo logo)`;
    }

    if (rejected.length > 0) {
      response.rejected_keys = rejected;
      response.message += ` (${rejected.length} clave(s) ignorada(s))`;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Reset settings to defaults ───────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin only
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acceso denegado. Solo administradores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure table exists
    await ensureSettingsTable(env);

    // Reset all settings to defaults using UPSERT
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      await env.DB.prepare(
        `INSERT INTO admin_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      ).bind(key, defaultValue).run();
    }

    // Fetch and return the reset settings
    const rows = await env.DB.prepare('SELECT * FROM admin_settings ORDER BY key ASC').all();
    const settings = {};
    for (const row of rows.results) {
      settings[row.key] = row.value;
    }

    return new Response(JSON.stringify({
      message: 'Configuraciones restablecidas a los valores por defecto',
      settings,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Settings POST error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
