// functions/api/migrate/seller-role.js
// GET: Migrate users table to support 'seller' role
// Run once: /api/migrate/seller-role

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

    // Step 1: Add columns if not exist
    for (const col of [
      { name: 'referred_by', def: 'INTEGER' },
      { name: 'seller_photo', def: 'TEXT' },
    ]) {
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

    // Step 2: Try to test if 'seller' role works by attempting a dry approach
    // Check current CHECK constraint by inspecting table SQL
    const tableInfo = await env.DB.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").first();
    const currentSql = tableInfo ? tableInfo.sql : '';

    if (currentSql.includes("'seller'")) {
      results.push({ action: 'check_constraint', status: 'already_has_seller', message: 'CHECK constraint already includes seller role' });
    } else {
      // Need to recreate table - use D1 batch for transactional safety
      try {
        // Drop dependent table first
        try { await env.DB.prepare('DROP TABLE IF EXISTS sellers_profiles').run(); } catch(e) {}
        try { await env.DB.prepare('DROP TABLE IF EXISTS users_new').run(); } catch(e) {}

        // Use batch to run all operations atomically with FK off
        // Use batch with prepare() objects for atomic table recreation
        const createSQL = `CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            whatsapp TEXT,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user', 'agent', 'seller')),
            avatar TEXT, bio TEXT, is_active INTEGER DEFAULT 1,
            google_id TEXT, auth_provider TEXT DEFAULT 'email',
            referred_by INTEGER, seller_photo TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          )`;
        const copySQL = `INSERT INTO users_new (id, name, email, phone, whatsapp, password_hash, role, avatar, bio, is_active, google_id, auth_provider, referred_by, seller_photo, created_at, updated_at)
           SELECT id, name, email, phone, whatsapp, password_hash, role, avatar, bio, is_active,
                  google_id, COALESCE(auth_provider, 'email'), referred_by, seller_photo, created_at, updated_at
           FROM users`;

        await env.DB.batch([
          env.DB.prepare(createSQL),
          env.DB.prepare(copySQL),
          env.DB.prepare('DROP TABLE users'),
          env.DB.prepare('ALTER TABLE users_new RENAME TO users'),
          env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'),
          env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)'),
          env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_users_referred ON users(referred_by)'),
        ]);

        results.push({ action: 'recreate_users_table', status: 'success', message: 'Users table recreated with seller role support' });
      } catch (e) {
        try { await env.DB.prepare('DROP TABLE IF EXISTS users_new').run(); } catch(x) {}
        try { await env.DB.prepare('PRAGMA foreign_keys = ON').run(); } catch(x) {}
        results.push({ action: 'recreate_users_table', status: 'error', error: e.message });
      }
    }

    // Step 3: Create sellers_profiles table
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS sellers_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          id_card_photo TEXT,
          commission_rate REAL DEFAULT 0,
          total_referrals INTEGER DEFAULT 0,
          total_earnings REAL DEFAULT 0,
          is_verified INTEGER DEFAULT 0,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      results.push({ table: 'sellers_profiles', status: 'created' });
    } catch (e) {
      results.push({ table: 'sellers_profiles', status: 'error', error: e.message });
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