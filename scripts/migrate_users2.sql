PRAGMA foreign_keys=OFF;
CREATE TABLE IF NOT EXISTS users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  whatsapp TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  avatar TEXT,
  bio TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  account_type TEXT DEFAULT 'free',
  user_type TEXT DEFAULT 'business',
  whatsapp_enabled INTEGER DEFAULT 1,
  google_id TEXT,
  auth_provider TEXT DEFAULT 'email',
  plan TEXT,
  plan_starts_at TEXT,
  plan_expires_at TEXT,
  seller_owner_id INTEGER
);
INSERT OR IGNORE INTO users_new SELECT * FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
PRAGMA foreign_keys=ON;
