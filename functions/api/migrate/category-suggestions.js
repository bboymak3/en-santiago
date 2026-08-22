// functions/api/migrate/category-suggestions.js
// One-time migration: create category_suggestions table
// Run once: GET /api/migrate/category-suggestions

export async function onRequestGet(context) {
  try {
    const { env } = context;
    if (!env.DB) {
      return new Response('DB not available', { status: 500 });
    }

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS category_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        category_name TEXT NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        resolved_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `).run();

    return new Response(JSON.stringify({
      message: 'Table category_suggestions created successfully',
      status: 'ok'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      status: 'error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}