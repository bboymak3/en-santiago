// GET: List all certified partners
// Public endpoint - no auth required
// Returns empty list if no tables/partners yet

import { corsHeaders } from '../../_lib/auth.js';

async function ensureTables(db) {
  var tables = [
    "CREATE TABLE IF NOT EXISTS agent_profiles (user_id INTEGER PRIMARY KEY, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, xp_to_next_level INTEGER DEFAULT 100, total_classes_completed INTEGER DEFAULT 0, exam_passed INTEGER DEFAULT 0, exam_passed_at TEXT, exam_attempts INTEGER DEFAULT 0, last_exam_at TEXT, is_partner INTEGER DEFAULT 0, partner_at TEXT, graduated INTEGER DEFAULT 0, graduated_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS user_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, badge_type TEXT NOT NULL, badge_name TEXT NOT NULL, badge_description TEXT DEFAULT '', badge_icon TEXT DEFAULT 'fas fa-medal', earned_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS user_class_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, class_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, correct_answers INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0, total_points INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, completed_at TEXT, UNIQUE(user_id, class_id))"
  ];
  for (var i = 0; i < tables.length; i++) {
    try { await db.prepare(tables[i]).run(); } catch(e) {}
  }
  // Ensure columns that may be missing (migration may have created table without these)
  var alters = [
    "ALTER TABLE agent_profiles ADD COLUMN graduated INTEGER DEFAULT 0",
    "ALTER TABLE agent_profiles ADD COLUMN graduated_at TEXT"
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
    var env = context.env;

    // Ensure tables exist
    await ensureTables(env.DB);

    var searchParams = new URL(context.request.url).searchParams;
    var detailed = searchParams.get('detailed') === '1';

    // Safe query: only select columns we know exist, use LEFT JOIN in case agent_profiles has no match
    var result;
    try {
      result = await env.DB.prepare(`
        SELECT
          u.id, u.name, u.avatar,
          COALESCE(ap.level, 1) as level,
          COALESCE(ap.xp, 0) as xp,
          ap.exam_passed_at,
          ap.partner_at,
          ap.graduated,
          ap.graduated_at,
          (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) as badge_count,
          (SELECT COUNT(*) FROM user_class_progress ucp WHERE ucp.user_id = u.id AND ucp.completed = 1) as classes_completed,
          (SELECT COUNT(*) FROM user_class_progress ucp WHERE ucp.user_id = u.id AND ucp.completed = 1) as total_classes_completed
        FROM users u
        INNER JOIN agent_profiles ap ON ap.user_id = u.id
        WHERE ap.is_partner = 1 AND (ap.exam_passed = 1 OR ap.graduated = 1)
        ORDER BY ap.partner_at DESC
      `).bind().all();
    } catch (sqlErr) {
      // If SQL fails (e.g., column doesn't exist), return empty
      console.error('Partners list query error:', sqlErr.message);
      return new Response(JSON.stringify({ partners: [], total: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    var partners = result.results || [];

    // If detailed, also fetch badges for each partner
    if (detailed && partners.length > 0) {
      var userIds = partners.map(function(r) { return r.id; });
      var placeholders = userIds.map(function() { return '?'; }).join(',');

      var badgeResult;
      try {
        badgeResult = await env.DB.prepare(
          'SELECT * FROM user_badges WHERE user_id IN (' + placeholders + ') ORDER BY earned_at DESC'
        ).bind(...userIds).all();
      } catch(e) {
        badgeResult = { results: [] };
      }

      var allBadges = badgeResult.results || [];
      partners = partners.map(function(p) {
        return Object.assign({}, p, {
          badges: allBadges.filter(function(b) { return b.user_id === p.id; }),
          total_badges: allBadges.filter(function(b) { return b.user_id === p.id; }).length,
        });
      });
    }

    return new Response(JSON.stringify({ partners: partners, total: partners.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Partners endpoint error:', error.message);
    // If tables don't exist or any error, return empty list instead of error
    return new Response(JSON.stringify({ partners: [], total: 0 }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
