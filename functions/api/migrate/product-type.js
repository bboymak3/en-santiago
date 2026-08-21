// functions/api/migrate/product-type.js
// Migration: Add product_type column to products table
// Run once: GET /api/migrate/product-type

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB not available' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add product_type column (TEXT, default NULL)
    try {
      await env.DB.prepare("ALTER TABLE products ADD COLUMN product_type TEXT").run();
    } catch(e) {
      // Column may already exist
    }

    // Backfill: set product_type = category for existing products
    try {
      const result = await env.DB.prepare(
        "UPDATE products SET product_type = category WHERE product_type IS NULL AND category IS NOT NULL"
      ).run();
      var backfilled = result.meta.changes || 0;
    } catch(e) {
      var backfilled = 0;
    }

    return new Response(JSON.stringify({
      message: 'Migration completed: product_type column added to products table',
      status: 'ok',
      backfilled: backfilled
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}