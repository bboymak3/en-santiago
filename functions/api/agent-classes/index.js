// GET: List all classes (admin gets all, agents get active only)
// POST: Create new class (admin only)

import { corsHeaders, requireAuth, requireAdmin } from '../../_lib/auth.js';

async function ensureTables(db) {
  var tables = [
    "CREATE TABLE IF NOT EXISTS agent_classes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, content TEXT DEFAULT '', xp_reward INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS class_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, question TEXT NOT NULL, option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT DEFAULT '', option_d TEXT DEFAULT '', correct_answer TEXT NOT NULL, explanation TEXT DEFAULT '', points INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS user_class_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, class_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, correct_answers INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0, total_points INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, completed_at TEXT, UNIQUE(user_id, class_id))",
    "CREATE TABLE IF NOT EXISTS agent_profiles (user_id INTEGER PRIMARY KEY, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, xp_to_next_level INTEGER DEFAULT 100, total_classes_completed INTEGER DEFAULT 0, exam_passed INTEGER DEFAULT 0, exam_passed_at TEXT, exam_attempts INTEGER DEFAULT 0, last_exam_at TEXT, is_partner INTEGER DEFAULT 0, partner_at TEXT, graduated INTEGER DEFAULT 0, graduated_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS user_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, badge_type TEXT NOT NULL, badge_name TEXT NOT NULL, badge_description TEXT DEFAULT '', badge_icon TEXT DEFAULT 'fas fa-medal', earned_at TEXT DEFAULT (datetime('now')))"
  ];
  for (var i = 0; i < tables.length; i++) {
    try { await db.prepare(tables[i]).run(); } catch(e) {}
  }
  // Ensure columns added by later migrations exist (migration may have created tables without these)
  var alters = [
    "ALTER TABLE class_questions ADD COLUMN points INTEGER DEFAULT 10",
    "ALTER TABLE user_class_progress ADD COLUMN total_points INTEGER DEFAULT 0",
    "ALTER TABLE agent_classes ADD COLUMN module TEXT DEFAULT 'General'",
    "ALTER TABLE agent_classes ADD COLUMN module_order INTEGER DEFAULT 0"
  ];
  for (var j = 0; j < alters.length; j++) {
    try { await db.prepare(alters[j]).run(); } catch(e) { /* column already exists */ }
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    var auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    var env = context.env;
    var isAdmin = auth.user.role === 'admin';

    await ensureTables(env.DB);

    var query, params;
    if (isAdmin) {
      query = "SELECT ac.*, (SELECT COUNT(*) FROM class_questions WHERE class_id = ac.id) as question_count, (SELECT COUNT(*) FROM user_class_progress WHERE class_id = ac.id AND completed = 1) as completions FROM agent_classes ac ORDER BY ac.sort_order ASC, ac.id ASC";
      params = [];
    } else {
      query = "SELECT ac.id, ac.title, ac.description, ac.content, ac.xp_reward, ac.sort_order, (SELECT COUNT(*) FROM class_questions WHERE class_id = ac.id) as question_count, COALESCE((SELECT completed FROM user_class_progress WHERE class_id = ac.id AND user_id = ?), 0) as is_completed FROM agent_classes ac WHERE ac.is_active = 1 ORDER BY ac.sort_order ASC, ac.id ASC";
      params = [auth.user.id];
    }

    var stmt = env.DB.prepare(query);
    var result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
    return new Response(JSON.stringify({ classes: result.results || [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // BUG #1 FIX: Return 500 so frontend shows error, NOT 200 with empty classes
    console.error('GET /agent-classes error:', error.message);
    return new Response(JSON.stringify({ error: 'Error al cargar clases', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  try {
    var auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;

    var env = context.env;
    var body = await context.request.json();
    var title = body.title;
    var description = body.description;
    var content = body.content;
    var xp_reward = body.xp_reward;
    var sort_order = body.sort_order;
    var is_active = body.is_active;
    var module = body.module;
    var module_order = body.module_order;

    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'El titulo es requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await ensureTables(env.DB);

    // BUG #8 FIX: Use !== undefined instead of || to allow explicit 0 values
    var result = await env.DB.prepare(
      'INSERT INTO agent_classes (title, description, content, xp_reward, sort_order, is_active, module, module_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      title.trim(),
      description || '',
      content || '',
      xp_reward !== undefined ? xp_reward : 10,
      sort_order !== undefined ? sort_order : 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      module || 'General',
      module_order !== undefined ? module_order : 0
    ).run();

    return new Response(JSON.stringify({
      message: 'Clase creada exitosamente',
      class_id: result.meta.last_row_id,
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al crear clase', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
