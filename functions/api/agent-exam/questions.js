// GET: Get 15 random exam questions (without correct answers)
// Requirements: level >= 7, not passed, max 3 attempts

import { corsHeaders, requireAuth } from '../../_lib/auth.js';

function calcLevel(xp) {
  const LECLL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
  let level = 1;
  for (let i = LECLL_XP.length - 1; i >= 0; i--) {
    if (xp >= LECLL_XP[i]) { level = i + 1; break; }
  }
  return Math.min(level, 10);
}

async function ensureTables(db) {
  var tables = [
    "CREATE TABLE IF NOT EXISTS agent_profiles (user_id INTEGER PRIMARY KEY, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, xp_to_next_level INTEGER DEFAULT 100, total_classes_completed INTEGER DEFAULT 0, exam_passed INTEGER DEFAULT 0, exam_passed_at TEXT, exam_attempts INTEGER DEFAULT 0, last_exam_at TEXT, is_partner INTEGER DEFAULT 0, partner_at TEXT, graduated INTEGER DEFAULT 0, graduated_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS agent_classes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, content TEXT DEFAULT '', xp_reward INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS class_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, question TEXT NOT NULL, option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT DEFAULT '', option_d TEXT DEFAULT '', correct_answer TEXT NOT NULL, explanation TEXT DEFAULT '', points INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))"
  ];
  for (var i = 0; i < tables.length; i++) {
    try { await db.prepare(tables[i]).run(); } catch(e) {}
  }
  // Ensure points column exists (migration may have created table without it)
  try { await db.prepare("ALTER TABLE class_questions ADD COLUMN points INTEGER DEFAULT 10").run(); } catch(e) {}
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const userId = auth.user.id;

    // BUG #7 FIX: Ensure tables exist
    await ensureTables(env.DB);

    // Get profile
    let profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    if (!profile) {
      await env.DB.prepare('INSERT INTO agent_profiles (user_id) VALUES (?)').bind(userId).run();
      profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    }

    // Check prerequisites: level >= 7
    const level = calcLevel(profile.xp);
    if (level < 7) {
      return new Response(JSON.stringify({ error: 'Necesitas nivel 7 para ver las preguntas del examen', required_level: 7, current_level: level }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.exam_passed === 1) {
      return new Response(JSON.stringify({ error: 'Ya aprobaste el examen', exam_passed: true }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Max 3 attempts
    if (profile.exam_attempts >= 3 && !profile.exam_passed) {
      return new Response(JSON.stringify({ error: 'Alcanzaste el maximo de 3 intentos. Contacta al admin.', max_attempts: 3 }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all questions from active classes
    const { results: allQuestions } = await env.DB.prepare(`
      SELECT cq.id, cq.question, cq.option_a, cq.option_b, cq.option_c, cq.option_d, cq.points, ac.title as class_name
      FROM class_questions cq
      JOIN agent_classes ac ON ac.id = cq.class_id
      WHERE ac.is_active = 1
    `).bind().all();

    if (allQuestions.length < 10) {
      return new Response(JSON.stringify({ error: 'No hay suficientes preguntas (minimo 10 requeridas)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Shuffle and pick 15 (Fisher-Yates)
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const examQuestions = shuffled.slice(0, 15);

    return new Response(JSON.stringify({
      questions: examQuestions,
      total_available: allQuestions.length,
      attempts_remaining: 3 - profile.exam_attempts,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener preguntas', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
