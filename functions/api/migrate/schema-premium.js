// functions/api/migrate/schema-premium.js
// GET: Add premium plan system columns and tables
// Run once: /api/migrate/schema-premium

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

    // --- Users: add plan columns ---
    const userCols = [
      { name: 'plan_type', def: "TEXT DEFAULT 'basic' CHECK(plan_type IN ('basic', 'premium'))" },
      { name: 'plan_expires_at', def: 'TEXT' },
    ];
    for (const col of userCols) {
      try {
        await env.DB.prepare(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`).run();
        results.push({ table: 'users', column: col.name, status: 'added' });
      } catch (e) {
        if (e.message && e.message.includes('duplicate column')) {
          results.push({ table: 'users', column: col.name, status: 'already exists' });
        } else {
          results.push({ table: 'users', column: col.name, status: 'error', error: e.message });
        }
      }
    }

    // --- Businesses: add expires_at ---
    const tablesNeedingExpiry = ['businesses', 'properties', 'products', 'job_listings'];
    for (const tbl of tablesNeedingExpiry) {
      try {
        await env.DB.prepare(`ALTER TABLE ${tbl} ADD COLUMN expires_at TEXT`).run();
        results.push({ table: tbl, column: 'expires_at', status: 'added' });
      } catch (e) {
        if (e.message && e.message.includes('duplicate column')) {
          results.push({ table: tbl, column: 'expires_at', status: 'already exists' });
        } else if (e.message && e.message.includes('no such table')) {
          results.push({ table: tbl, column: 'expires_at', status: 'table not found (skipped)' });
        } else {
          results.push({ table: tbl, column: 'expires_at', status: 'error', error: e.message });
        }
      }
    }

    // --- Create premium_requests table ---
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS premium_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          plan_duration TEXT NOT NULL CHECK(plan_duration IN ('3_months', '1_year')),
          voucher_url TEXT NOT NULL,
          payment_phone TEXT,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
          admin_notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          reviewed_at TEXT,
          reviewed_by INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (reviewed_by) REFERENCES users(id)
        )
      `).run();
      results.push({ table: 'premium_requests', status: 'created' });
    } catch (e) {
      results.push({ table: 'premium_requests', status: 'error', error: e.message });
    }

    return new Response(JSON.stringify({ success: true, message: 'Migracion premium completada', results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error en migracion premium', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}