// POST: Admin actions on agents - assign classes, graduate, award badges

import { corsHeaders, requireAdmin } from '../../../_lib/auth.js';

async function ensureTables(db) {
  var tables = [
    "CREATE TABLE IF NOT EXISTS agent_profiles (user_id INTEGER PRIMARY KEY, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, xp_to_next_level INTEGER DEFAULT 100, total_classes_completed INTEGER DEFAULT 0, exam_passed INTEGER DEFAULT 0, exam_passed_at TEXT, exam_attempts INTEGER DEFAULT 0, last_exam_at TEXT, is_partner INTEGER DEFAULT 0, partner_at TEXT, graduated INTEGER DEFAULT 0, graduated_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))" ,
    "CREATE TABLE IF NOT EXISTS user_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, badge_type TEXT NOT NULL, badge_name TEXT NOT NULL, badge_description TEXT DEFAULT '', badge_icon TEXT DEFAULT 'fas fa-medal', earned_at TEXT DEFAULT (datetime('now')))" ,
    "CREATE TABLE IF NOT EXISTS class_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, user_id INTEGER NOT NULL, assigned_by INTEGER NOT NULL, status TEXT DEFAULT 'pending', assigned_at TEXT DEFAULT (datetime('now')), UNIQUE(class_id, user_id))"
  ];
  for (var i = 0; i < tables.length; i++) {
    try { await db.prepare(tables[i]).run(); } catch(e) {}
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
    const userId = auth.user.id;
    const body = await context.request.json();
    const { action } = body;

    // Ensure all tables exist
    await ensureTables(env.DB);

    if (action === 'assign_class') {
      // Assign a class to one or more agents
      const { class_id, user_ids } = body;
      if (!class_id || !user_ids || !Array.isArray(user_ids)) {
        return new Response(JSON.stringify({ error: 'class_id y user_ids son requeridos' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      var assigned = 0;
      var skipped = 0;
      for (var i = 0; i < user_ids.length; i++) {
        try {
          await env.DB.prepare(
            "INSERT OR IGNORE INTO class_assignments (class_id, user_id, assigned_by, status) VALUES (?, ?, ?, 'pending')"
          ).bind(class_id, user_ids[i], userId).run();
          assigned++;
        } catch(e) {
          skipped++;
        }
      }

      return new Response(JSON.stringify({
        message: 'Actividad asignada exitosamente',
        assigned: assigned,
        skipped: skipped,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'graduate') {
      // Mark agent as graduated
      const { user_id, badge_name, badge_description } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id es requerido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Ensure agent profile exists
      var existing = await env.DB.prepare('SELECT user_id FROM agent_profiles WHERE user_id = ?').bind(user_id).first();
      if (!existing) {
        await env.DB.prepare('INSERT INTO agent_profiles (user_id) VALUES (?)').bind(user_id).run();
      }

      // Set graduated
      await env.DB.prepare(
        "UPDATE agent_profiles SET graduated = 1, graduated_at = datetime('now'), is_partner = 1, partner_at = COALESCE(partner_at, datetime('now')), updated_at = datetime('now') WHERE user_id = ?"
      ).bind(user_id).run();

      // Award graduation badge (check for duplicates first)
      var gradExists = await env.DB.prepare("SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = ? AND badge_type = 'graduation'").bind(user_id).first();
      var awardedBadges = [];
      if (gradExists.cnt === 0) {
        await env.DB.prepare(
          "INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon) VALUES (?, 'graduation', ?, ?, 'fas fa-graduation-cap')"
        ).bind(
          user_id,
          badge_name || 'Graduado del Programa',
          badge_description || 'Completo exitosamente el programa de capacitacion'
        ).run();
        awardedBadges.push('graduation');
      }

      // Also award partner badge if not already
      var partnerExists = await env.DB.prepare("SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = ? AND badge_type = 'partner'").bind(user_id).first();
      if (partnerExists.cnt === 0) {
        await env.DB.prepare(
          "INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon) VALUES (?, 'partner', 'Partner Digital Certificado', 'Certificado como Partner Digital de AunClick', 'fas fa-certificate')"
        ).bind(user_id).run();
        awardedBadges.push('partner');
      }

      return new Response(JSON.stringify({
        message: 'Agente marcado como graduado exitosamente',
        badges_awarded: awardedBadges,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'award_badge') {
      // Award custom badge to agent (check for duplicates by badge_name + user_id)
      const { user_id, badge_type, badge_name, badge_description, badge_icon } = body;
      if (!user_id || !badge_name) {
        return new Response(JSON.stringify({ error: 'user_id y badge_name son requeridos' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Sanitize badge_icon to prevent XSS
      var safeIcon = String(badge_icon || 'fas fa-medal').replace(/[^a-zA-Z0-9\s\-]/g, '').substring(0, 50);
      if (!safeIcon.trim()) safeIcon = 'fas fa-medal';

      // Check for duplicate badge (same type and user)
      var bType = badge_type || 'custom';
      var dupCheck = await env.DB.prepare('SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = ? AND badge_type = ? AND badge_name = ?').bind(user_id, bType, badge_name).first();
      if (dupCheck.cnt > 0) {
        return new Response(JSON.stringify({ error: 'Este agente ya tiene una medalla con ese nombre', badge_name: badge_name }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await env.DB.prepare(
        "INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon) VALUES (?, ?, ?, ?, ?)"
      ).bind(
        user_id,
        bType,
        badge_name,
        badge_description || '',
        safeIcon
      ).run();

      return new Response(JSON.stringify({
        message: 'Medalla otorgada exitosamente',
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Accion no valida. Usar: assign_class, graduate, award_badge' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error en accion de admin', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
