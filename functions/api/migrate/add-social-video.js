// functions/api/migrate/add-social-video.js
// GET: Add social media + video columns to businesses and products tables
// Run once: /api/migrate/add-social-video

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB no disponible' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    // Add columns to businesses table
    const bizColumns = [
      { name: 'twitter', type: 'TEXT' },
      { name: 'tiktok', type: 'TEXT' },
      { name: 'youtube', type: 'TEXT' },
      { name: 'video_url', type: 'TEXT' },
    ];

    for (const col of bizColumns) {
      try {
        await env.DB.prepare(`ALTER TABLE businesses ADD COLUMN ${col.name} ${col.type}`).run();
        results.push({ table: 'businesses', column: col.name, status: 'added' });
      } catch (e) {
        if (e.message && e.message.includes('duplicate column')) {
          results.push({ table: 'businesses', column: col.name, status: 'already exists' });
        } else {
          results.push({ table: 'businesses', column: col.name, status: 'error', error: e.message });
        }
      }
    }

    // Add video_url to products table
    try {
      await env.DB.prepare('ALTER TABLE products ADD COLUMN video_url TEXT').run();
      results.push({ table: 'products', column: 'video_url', status: 'added' });
    } catch (e) {
      if (e.message && e.message.includes('duplicate column')) {
        results.push({ table: 'products', column: 'video_url', status: 'already exists' });
      } else {
        results.push({ table: 'products', column: 'video_url', status: 'error', error: e.message });
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Migracion completada', results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error en migracion', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
