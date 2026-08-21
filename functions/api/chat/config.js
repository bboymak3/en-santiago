// functions/api/chat/config.js
// GET: Public endpoint — returns chat configuration (no auth required)
// Used by chat.js widget to decide whether to show the chat button

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ chat_enabled: false, chat_mode: 'none' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    // Read settings from admin_settings table
    const settings = {};
    try {
      const rows = await env.DB.prepare(
        "SELECT key, value FROM admin_settings WHERE key IN ('chat_enabled', 'chat_mode')"
      ).all();
      for (const row of (rows.results || [])) {
        settings[row.key] = row.value;
      }
    } catch (e) {
      // Table may not exist yet
    }

    const chatEnabled = settings.chat_enabled !== '0';
    const chatMode = settings.chat_mode || 'all'; // default: all

    return new Response(JSON.stringify({
      chat_enabled: chatEnabled,
      chat_mode: chatMode,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error) {
    // On error, allow chat by default
    return new Response(JSON.stringify({ chat_enabled: true, chat_mode: 'all' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}