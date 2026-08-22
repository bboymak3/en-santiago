// functions/api/agent-exam/index.js
// GET: Get exam status
// POST: Submit exam answers - 15 questions, 80% to pass, max 3 attempts

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
    "CREATE TABLE IF NOT EXISTS user_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, badge_type TEXT NOT NULL, badge_name TEXT NOT NULL, badge_description TEXT DEFAULT '', badge_icon TEXT DEFAULT 'fas fa-medal', earned_at TEXT DEFAULT (datetime('now')))",
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

    // Check prerequisites
    const level = calcLevel(profile.xp);

    return new Response(JSON.stringify({
      level,
      exam_passed: profile.exam_passed === 1,
      exam_passed_at: profile.exam_passed_at,
      exam_attempts: profile.exam_attempts || 0,
      max_attempts: 3,
      attempts_remaining: Math.max(0, 3 - (profile.exam_attempts || 0)),
      can_take_exam: level >= 7 && profile.exam_passed !== 1 && (profile.exam_attempts || 0) < 3,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener comuna del examen', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const userId = auth.user.id;
    const body = await context.request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers) || answers.length < 10) {
      return new Response(JSON.stringify({ error: 'Debes responder al menos 10 preguntas' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // BUG #7 FIX: Ensure tables exist
    await ensureTables(env.DB);

    // Get profile
    let profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Perfil de agente no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check level requirement (>= 7)
    const level = calcLevel(profile.xp);
    if (level < 7) {
      return new Response(JSON.stringify({ error: 'Necesitas alcanzar nivel 7 para tomar el examen', required_level: 7, current_level: level }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already passed
    if (profile.exam_passed === 1) {
      return new Response(JSON.stringify({ error: 'Ya aprobaste el examen', exam_passed: true }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check max attempts
    if ((profile.exam_attempts || 0) >= 3) {
      return new Response(JSON.stringify({ error: 'Alcanzaste el maximo de 3 intentos' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all questions from all active classes (pool for exam)
    const { results: allQuestions } = await env.DB.prepare(`
      SELECT cq.* FROM class_questions cq
      JOIN agent_classes ac ON ac.id = cq.class_id
      WHERE ac.is_active = 1
    `).bind().all();

    if (allQuestions.length < 10) {
      return new Response(JSON.stringify({ error: 'No hay suficientes preguntas en el banco para generar el examen (minimo 10)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Grade answers with points
    let totalPoints = 0;
    let maxPoints = 0;
    let correct = 0;

    for (const ans of answers) {
      const q = allQuestions.find(function(q) { return q.id === ans.question_id; });
      if (q) {
        maxPoints += (q.points || 10);
        var isCorrect = String(q.correct_answer).toLowerCase() === String(ans.answer).toLowerCase();
        if (isCorrect) {
          correct++;
          totalPoints += (q.points || 10);
        }
      }
    }

    var scorePercent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
    var passed = scorePercent >= 80;

    // Update exam attempts
    await env.DB.prepare(`
      UPDATE agent_profiles SET
        exam_attempts = COALESCE(exam_attempts, 0) + 1,
        last_exam_at = datetime('now'),
        updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(userId).run();

    if (passed) {
      // BUG #6 FIX: Check for existing badges before inserting (prevent duplicates)
      var existingPassed = await env.DB.prepare("SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = ? AND badge_type = 'exam_passed'").bind(userId).first();

      if (existingPassed.cnt === 0) {
        // Award exam passed badge and partner status
        await env.DB.batch([
          env.DB.prepare(`
            UPDATE agent_profiles SET
              exam_passed = 1,
              exam_passed_at = datetime('now'),
              is_partner = 1,
              partner_at = COALESCE(partner_at, datetime('now')),
              updated_at = datetime('now')
            WHERE user_id = ?
          `).bind(userId),
          env.DB.prepare(`
            INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
            VALUES (?, 'exam_passed', 'Examen Aprobado', 'Aprobaste el examen final con ' + scorePercent + '% de calificacion', 'fas fa-trophy')
          `).bind(userId),
          env.DB.prepare(`
            INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
            VALUES (?, 'partner', 'Partner Digital Certificado', 'Eres un Partner Digital certificado de AunClick', 'fas fa-certificate')
          `).bind(userId),
        ]);
      }
    }

    var newAttempts = (profile.exam_attempts || 0) + 1;

    return new Response(JSON.stringify({
      passed,
      score_percent: scorePercent,
      correct_answers: correct,
      total_questions: answers.length,
      total_points: totalPoints,
      max_points: maxPoints,
      exam_attempts: newAttempts,
      attempts_remaining: Math.max(0, 3 - newAttempts),
      message: passed
        ? 'Felicidades! Aprobaste el examen con ' + scorePercent + '% y eres ahora un Partner Digital Certificado!'
        : 'No aprobaste. Obtuviste ' + scorePercent + '% (necesitas 80%). Intentos restantes: ' + Math.max(0, 3 - newAttempts) + '.',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al procesar examen', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
