// functions/api/agent-classes/[id]/questions/[qid].js
// PUT: Update a question (admin only)
// DELETE: Delete a question (admin only)

import { corsHeaders, requireAdmin } from '../../../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPut(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;

    const { env, params } = context;
    const qid = params.qid;
    const body = await context.request.json();
    const { question, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order } = body;

    const existing = await env.DB.prepare('SELECT id FROM class_questions WHERE id = ?').bind(qid).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Pregunta no encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare(`
      UPDATE class_questions SET
        question = COALESCE(?, question),
        option_a = COALESCE(?, option_a),
        option_b = COALESCE(?, option_b),
        option_c = COALESCE(?, option_c),
        option_d = COALESCE(?, option_d),
        correct_answer = COALESCE(?, correct_answer),
        explanation = COALESCE(?, explanation),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).bind(
      question ? question.trim() : null,
      option_a ? option_a.trim() : null,
      option_b ? option_b.trim() : null,
      option_c ? option_c.trim() : null,
      option_d ? option_d.trim() : null,
      correct_answer || null,
      explanation !== undefined ? explanation : null,
      sort_order !== undefined ? sort_order : null,
      qid
    ).run();

    return new Response(JSON.stringify({ message: 'Pregunta actualizada exitosamente' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al actualizar pregunta', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;

    const { env, params } = context;
    const qid = params.qid;

    await env.DB.prepare('DELETE FROM class_questions WHERE id = ?').bind(qid).run();

    return new Response(JSON.stringify({ message: 'Pregunta eliminada exitosamente' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al eliminar pregunta', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
