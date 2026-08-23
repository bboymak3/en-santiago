// functions/api/settings/public.js
// GET: Public settings (subset of all settings)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Only expose these keys publicly
const PUBLIC_KEYS = [
  'ai_chatbot_enabled',
  'ai_chatbot_welcome',
  'reviews_enabled',
  'marketplace_enabled',
  'businesses_enabled',
  'jobs_enabled',
  'medical_enabled',
  'properties_enabled',
  'events_enabled',
  'weather_enabled',
  'site_name',
  'site_description',
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
  'whatsapp_number',
  'contact_email',
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

    // Fetch from BOTH settings table and admin_settings table
    const placeholders = PUBLIC_KEYS.map(() => '?').join(',');

    // Try settings table first
    let rows = [];
    try {
      const result = await env.DB.prepare(
        `SELECT key, value FROM settings WHERE key IN (${placeholders})`
      ).bind(...PUBLIC_KEYS).all();
      rows = result.results || [];
    } catch (e) {
      console.warn('settings table query failed, trying admin_settings:', e);
    }

    // Also try admin_settings table
    try {
      const result2 = await env.DB.prepare(
        `SELECT key, value FROM admin_settings WHERE key IN (${placeholders})`
      ).bind(...PUBLIC_KEYS).all();
      // Merge — admin_settings overrides settings
      for (const row of (result2.results || [])) {
        const existing = rows.find(r => r.key === row.key);
        if (existing) {
          existing.value = row.value;
        } else {
          rows.push(row);
        }
      }
    } catch (e) {
      // admin_settings might not have all keys
    }

    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    // Return with defaults for missing keys
    const defaults = {
      ai_chatbot_enabled: '0',
      ai_chatbot_welcome: '',
      reviews_enabled: '1',
      marketplace_enabled: '1',
      businesses_enabled: '1',
      jobs_enabled: '1',
      medical_enabled: '1',
      properties_enabled: '1',
      events_enabled: '1',
      weather_enabled: '1',
      site_name: 'En Santiago',
      site_description: 'Directorio de negocios en Santiago de Chile',
      hero_banner_url: '',
      hero_logo_url: '',
      marketplace_banner_url: '',
      bazar_enabled: '0',
      video_carousel_enabled: '0',
      popup_enabled: '0',
      popup_image_url: '',
      popup_link_url: '',
      popup_link_type: '',
      popup_cta_text: 'Ver más',
      empleo_banner_url: '',
      whatsapp_number: '',
      contact_email: '',
    };

    const response = {};
    for (const key of PUBLIC_KEYS) {
      response[key] = settings[key] !== undefined ? settings[key] : (defaults[key] || '');
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
