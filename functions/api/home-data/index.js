// functions/api/home-data/index.js
// GET: Consolidated home page data in a single API call
// Elimina ~15 requests individuales del index, reemplazándolas con 1 sola
//
// Response:
// {
//   settings: { hero_banner_url, hero_logo_url, ... },
//   categories: [{ id, name, slug, icon, color, ... }],
//   tipos_negocio: [{ id, name, slug, categories: [...] }],
//   businesses: [{ id, title, slug, logo, ... }],     // featured businesses
//   medical: [{ id, title, slug, logo, ... }],          // medical featured
//   properties: [{ id, title, ... }],                    // featured properties
//   stats: { total_businesses, total_properties, ... },
// }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB not available' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [
      settingsResult,
      categoriesResult,
      tiposResult,
      businessesResult,
      propertiesResult,
      statsResult,
    ] = await Promise.allSettled([
      getSettings(env.DB),
      getCategories(env.DB),
      getTiposNegocio(env.DB),
      getFeaturedBusinesses(env.DB),
      getFeaturedProperties(env.DB),
      getStats(env.DB),
    ]);

    const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : {};
    const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
    const tipos = tiposResult.status === 'fulfilled' ? tiposResult.value : [];
    const businesses = businessesResult.status === 'fulfilled' ? businessesResult.value : { businesses: [], medical: [] };
    const properties = propertiesResult.status === 'fulfilled' ? propertiesResult.value : [];
    const stats = statsResult.status === 'fulfilled' ? statsResult.value : {};

    return new Response(JSON.stringify({
      settings,
      categories,
      tipos_negocio: tipos,
      businesses: businesses.businesses || [],
      medical: businesses.medical || [],
      properties,
      stats,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Home data error:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function getSettings(db) {
  try {
    const result = await db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of result.results || []) {
      settings[row.key] = row.value;
    }
    return settings;
  } catch (e) { return {}; }
}

async function getCategories(db) {
  try {
    const result = await db.prepare(
      'SELECT id, name, slug, icon, color, sort_order, is_active FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC'
    ).all();
    return result.results || [];
  } catch (e) { return []; }
}

async function getTiposNegocio(db) {
  try {
    const tiposResult = await db.prepare('SELECT id, name, slug FROM tipos_negocio ORDER BY sort_order ASC, name ASC').all();
    const tipos = tiposResult.results || [];
    for (const tipo of tipos) {
      try {
        const catsResult = await db.prepare(
          'SELECT id, name, slug, icon, color FROM categories WHERE tipo_negocio_id = ? AND is_active = 1 ORDER BY sort_order ASC, name ASC'
        ).bind(tipo.id).all();
        tipo.categories = catsResult.results || [];
      } catch (e) { tipo.categories = []; }
    }
    return tipos;
  } catch (e) { return []; }
}

const IMAGES_JOIN = `
  LEFT JOIN (
    SELECT business_id,
           MAX(CASE WHEN is_cover = 1 THEN url END) as cover_image,
           COUNT(*) as image_count
    FROM images
    GROUP BY business_id
  ) img ON img.business_id = b.id
`;

async function getFeaturedBusinesses(db) {
  try {
    const query = `
      SELECT b.id, b.title, b.slug, b.description, b.city, b.state, b.phone, b.whatsapp,
             b.logo, b.business_type, b.featured, b.views, b.especialidad,
             c.name as category_name, c.slug as category_slug,
             img.cover_image
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      ${IMAGES_JOIN}
      WHERE b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != ''
      ORDER BY b.featured DESC, b.views DESC
      LIMIT 12
    `;
    const result = await db.prepare(query).all();
    const allBusinesses = result.results || [];
    const businesses = allBusinesses.filter(b => b.category_slug !== 'medicina-servicio-medico');
    const medical = allBusinesses.filter(b => b.category_slug === 'medicina-servicio-medico');
    return { businesses, medical };
  } catch (e) { return { businesses: [], medical: [] }; }
}

async function getFeaturedProperties(db) {
  try {
    const result = await db.prepare(
      'SELECT id, title, slug, price, currency, city, state, property_type FROM properties WHERE status = \'approved\' ORDER BY created_at DESC LIMIT 6'
    ).all();
    return result.results || [];
  } catch (e) { return []; }
}

async function getStats(db) {
  try {
    const [biz, props, jobs, users] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM businesses WHERE status = \'approved\'').first(),
      db.prepare('SELECT COUNT(*) as count FROM properties WHERE status = \'approved\'').first().catch(() => ({ count: 0 })),
      db.prepare('SELECT COUNT(*) as count FROM job_listings WHERE status = \'approved\'').first().catch(() => ({ count: 0 })),
      db.prepare('SELECT COUNT(*) as count FROM users').first().catch(() => ({ count: 0 })),
    ]);
    return {
      total_businesses: biz?.count || 0,
      total_properties: props?.count || 0,
      total_jobs: jobs?.count || 0,
      total_users: users?.count || 0,
    };
  } catch (e) { return {}; }
}
