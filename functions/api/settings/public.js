// functions/api/settings/public.js
// GET: Public settings endpoint (no auth required)
// Returns only the settings needed by the frontend (ai_chatbot_enabled, ai_chatbot_welcome, etc.)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

// Only expose these keys publicly
const PUBLIC_KEYS = [
  'ai_chatbot_enabled',
  'ai_chatbot_welcome',
  'reviews_enabled',
  'marketplace_enabled',
  'site_name',
  'hero_banner_url',
  'hero_logo_url',
  'marketplace_banner_url',
  'bazar_enabled',
  'video_carousel_enabled',
  'popup_enabled',
  'popup_image_url',
  'popup_link_url',
  'popup_link_type',
  'popup_cta_text',
  'empleo_banner_url',
];

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Servicio no disponible' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch only the public keys
    const placeholders = PUBLIC_KEYS.map(() => '?').join(',');
    const rows = await env.DB.prepare(
      `SELECT key, value FROM admin_settings WHERE key IN (${placeholders})`
    ).bind(...PUBLIC_KEYS).all();

    const settings = {};
    for (const row of rows.results || []) {
      settings[row.key] = row.value;
    }

    // Return with defaults for missing keys
    const defaults = {
      ai_chatbot_enabled: '0',
      ai_chatbot_welcome: '',
      reviews_enabled: '1',
      marketplace_enabled: '1',
      site_name: 'AuNclick',
      hero_banner_url: '',
      hero_logo_url: '',
      marketplace_banner_url: '',
      bazar_enabled: '0',
      video_carousel_enabled: '0',
      popup_enabled: '0',
      popup_image_url: '',
      popup_link_url: '',
      popup_link_type: '',
      popup_cta_text: 'Ver mas',
      empleo_banner_url: '',
    };

    const response = {};
    for (const key of PUBLIC_KEYS) {
      response[key] = settings[key] || defaults[key] || '';
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Settings public GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
