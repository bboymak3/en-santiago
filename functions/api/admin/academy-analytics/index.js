// POST: Academy analytics for admin dashboard
// Returns statistics about academy performance

import { corsHeaders, requireAdmin } from '../../../_lib/auth.js';

async function ensureTables(db) {
  var tables = [
    "CREATE TABLE IF NOT EXISTS agent_classes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, content TEXT DEFAULT '', xp_reward INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, module TEXT DEFAULT 'General', module_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))" ,
    "CREATE TABLE IF NOT EXISTS class_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, question TEXT NOT NULL, option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT DEFAULT '', option_d TEXT DEFAULT '', correct_answer TEXT NOT NULL, explanation TEXT DEFAULT '', points INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))" ,
    "CREATE TABLE IF NOT EXISTS user_class_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, class_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, correct_answers INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0, total_points INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, completed_at TEXT, UNIQUE(user_id, class_id))" ,
    "CREATE TABLE IF NOT EXISTS agent_profiles (user_id INTEGER PRIMARY KEY, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, xp_to_next_level INTEGER DEFAULT 100, total_classes_completed INTEGER DEFAULT 0, exam_passed INTEGER DEFAULT 0, exam_passed_at TEXT, exam_attempts INTEGER DEFAULT 0, last_exam_at TEXT, is_partner INTEGER DEFAULT 0, partner_at TEXT, graduated INTEGER DEFAULT 0, graduated_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))" ,
    "CREATE TABLE IF NOT EXISTS user_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, badge_type TEXT NOT NULL, badge_name TEXT NOT NULL, badge_description TEXT DEFAULT '', badge_icon TEXT DEFAULT 'fas fa-medal', earned_at TEXT DEFAULT (datetime('now')))"
  ];
  for (var i = 0; i < tables.length; i++) {
    try { await db.prepare(tables[i]).run(); } catch(e) {}
  }
  var alters = [
    "ALTER TABLE class_questions ADD COLUMN points INTEGER DEFAULT 10",
    "ALTER TABLE user_class_progress ADD COLUMN total_points INTEGER DEFAULT 0",
    "ALTER TABLE agent_classes ADD COLUMN module TEXT DEFAULT 'General'",
    "ALTER TABLE agent_classes ADD COLUMN module_order INTEGER DEFAULT 0"
  ];
  for (var j = 0; j < alters.length; j++) {
    try { await db.prepare(alters[j]).run(); } catch(e) {}
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;
    const { env } = context;
    await ensureTables(env.DB);

    // 1. Overview stats
    var classCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM agent_classes').first();
    var questionCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM class_questions').first();
    var agentCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM agent_profiles').first();
    var totalCompletions = await env.DB.prepare('SELECT COUNT(*) as cnt FROM user_class_progress WHERE completed = 1').first();
    var totalAttempts = await env.DB.prepare('SELECT COUNT(*) as cnt FROM user_class_progress').first();
    var examPassed = await env.DB.prepare('SELECT COUNT(*) as cnt FROM agent_profiles WHERE exam_passed = 1').first();
    var examAttempts = await env.DB.prepare('SELECT COALESCE(SUM(exam_attempts), 0) as cnt FROM agent_profiles WHERE exam_attempts > 0').first();
    var partners = await env.DB.prepare('SELECT COUNT(*) as cnt FROM agent_profiles WHERE is_partner = 1').first();

    // 2. Pass rate per class
    var classStats = await env.DB.prepare(`
      SELECT ac.id, ac.title, ac.module,
        COUNT(ucp.id) as total_attempts,
        SUM(CASE WHEN ucp.completed = 1 THEN 1 ELSE 0 END) as passed,
        ROUND(100.0 * SUM(CASE WHEN ucp.completed = 1 THEN 1 ELSE 0 END) / MAX(COUNT(ucp.id), 1), 1) as pass_rate
      FROM agent_classes ac
      LEFT JOIN user_class_progress ucp ON ucp.class_id = ac.id
      GROUP BY ac.id
      ORDER BY pass_rate ASC
    `).all();

    // 3. Level distribution
    var levelDist = await env.DB.prepare(`
      SELECT level, COUNT(*) as count FROM agent_profiles GROUP BY level ORDER BY level
    `).all();

    // 4. Most failed questions (highest fail rate with 3+ attempts)
    var failedQuestions = await env.DB.prepare(`
      SELECT cq.id, cq.question, ac.title as class_title,
        COUNT(ucp.id) as times_answered,
        SUM(CASE WHEN ucp.completed = 1 THEN 1 ELSE 0 END) as times_correct
      FROM class_questions cq
      JOIN agent_classes ac ON ac.id = cq.class_id
      LEFT JOIN user_class_progress ucp ON ucp.class_id = cq.class_id
      GROUP BY cq.id
      HAVING times_answered >= 3
      ORDER BY (times_correct * 1.0 / times_answered) ASC
      LIMIT 10
    `).all();

    // 5. Module completion stats
    var moduleStats = await env.DB.prepare(`
      SELECT ac.module, COUNT(DISTINCT ac.id) as classes,
        COUNT(DISTINCT ucp.id) as total_completions
      FROM agent_classes ac
      LEFT JOIN user_class_progress ucp ON ucp.class_id = ac.id AND ucp.completed = 1
      WHERE ac.is_active = 1
      GROUP BY ac.module
      ORDER BY ac.module
    `).all();

    return new Response(JSON.stringify({
      overview: {
        total_classes: classCount.cnt || 0,
        total_questions: questionCount.cnt || 0,
        total_agents: agentCount.cnt || 0,
        total_completions: totalCompletions.cnt || 0,
        total_attempts: totalAttempts.cnt || 0,
        overall_pass_rate: totalAttempts.cnt > 0 ? Math.round(100 * totalCompletions.cnt / totalAttempts.cnt) : 0,
        exam_pass_rate: examAttempts.cnt > 0 ? Math.round(100 * examPassed.cnt / examAttempts.cnt) : 0,
        total_exam_passed: examPassed.cnt || 0,
        total_partners: partners.cnt || 0,
      },
      class_stats: classStats.results || [],
      level_distribution: levelDist.results || [],
      failed_questions: (failedQuestions.results || []).map(function(q) {
        return {
          id: q.id,
          question: q.question.substring(0, 100) + (q.question.length > 100 ? '...' : ''),
          class_title: q.class_title,
          times_answered: q.times_answered,
          times_correct: q.times_correct,
          fail_rate: Math.round(100 * (1 - q.times_correct / q.times_answered)),
        };
      }),
      module_stats: moduleStats.results || [],
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener analíticas', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
