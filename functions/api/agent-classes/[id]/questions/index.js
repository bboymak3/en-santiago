// functions/api/agent-classes/[id]/questions/index.js
// GET: List questions for a class
// POST: Add question to a class (admin only)

import { corsHeaders, requireAuth, requireAdmin } from '../../../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env, params } = context;
    const classId = params.id;
    const isAdmin = auth.user.role === 'admin';

    let query;
    if (isAdmin) {
      query = 'SELECT * FROM class_questions WHERE class_id = ? ORDER BY sort_order ASC, id ASC';
    } else {
      query = 'SELECT id, question, option_a, option_b, option_c, option_d, sort_order FROM class_questions WHERE class_id = ? ORDER BY sort_order ASC, id ASC';
    }
    const { results } = await env.DB.prepare(query).bind(classId).all();

    return new Response(JSON.stringify({ questions: results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener preguntas', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;

    const { env, params } = context;
    const classId = params.id;
    const body = await context.request.json();
    const { question, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order } = body;

    if (!question || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
      return new Response(JSON.stringify({ error: 'Todos los campos son requeridos (question, option_a-d, correct_answer)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['a', 'b', 'c', 'd'].includes(correct_answer)) {
      return new Response(JSON.stringify({ error: 'correct_answer debe ser a, b, c o d' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await env.DB.prepare(`
      INSERT INTO class_questions (class_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      classId, question.trim(), option_a.trim(), option_b.trim(), option_c.trim(), option_d.trim(),
      correct_answer, explanation || '', sort_order || 0
    ).run();

    return new Response(JSON.stringify({
      message: 'Pregunta creada exitosamente',
      question_id: result.meta.last_row_id,
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al crear pregunta', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
