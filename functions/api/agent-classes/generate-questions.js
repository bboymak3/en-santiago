// POST: Generate questions from text using AI
// Admin provides text, system generates N multiple-choice questions (A/B/C/D)

import { corsHeaders, requireAdmin } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  try {
    var auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;

    var env = context.env;
    var body = await context.request.json();
    var text = body.text;
    var numQuestions = body.num_questions;

    if (!text || text.length < 50) {
      return new Response(JSON.stringify({ error: 'El texto debe tener al menos 50 caracteres para generar preguntas' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    var n = Math.min(Math.max(numQuestions || 5, 1), 20);

    var prompt = 'Genera ' + n + ' preguntas de opcion multiple basadas en el siguiente texto educativo.\n\n';
    prompt += 'Texto:\n' + text.substring(0, 3000) + '\n\n';
    prompt += 'Responde SOLO con un JSON array, sin texto adicional. Cada pregunta debe tener este formato exacto:\n';
    prompt += '[{"question":"texto de la pregunta","option_a":"opcion A","option_b":"opcion B","option_c":"opcion C","option_d":"opcion D","correct_answer":"a","explanation":"explicacion breve","points":10}]\n';
    prompt += 'Reglas:\n';
    prompt += '- Solo una respuesta correcta por pregunta (a, b, c, o d)\n';
    prompt += '- Variar la dificultad: preguntas faciles (5 pts), medias (10 pts), dificiles (15-20 pts)\n';
    prompt += '- Las opciones incorrectas deben ser plausibles pero claramente incorrectas\n';
    prompt += '- La explicacion debe ser concisa (1 frase)\n';

    // Call AI API
    var aiResponse = null;
    try {
      if (env.AI) {
        var aiResp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
        });
        aiResponse = aiResp.response || aiResp.answer || '';
      }
    } catch(e) {
      console.log('CF AI not available:', e.message);
    }

    if (!aiResponse) {
      aiResponse = generateFallbackQuestions(text, n);
    }

    // Parse JSON from response
    var questions = [];
    try {
      var jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    } catch(e) {
      questions = generateFallbackQuestions(text, n);
      if (typeof questions === 'string') {
        try { questions = JSON.parse(questions); } catch(e2) { questions = []; }
      }
    }

    // Validate and normalize
    var valid = [];
    for (var i = 0; i < questions.length && valid.length < n; i++) {
      var q = questions[i];
      if (q.question && q.option_a && q.option_b && q.correct_answer && ['a','b','c','d'].indexOf(String(q.correct_answer).toLowerCase().charAt(0)) !== -1) {
        valid.push({
          question: q.question.substring(0, 500),
          option_a: String(q.option_a || '').substring(0, 200),
          option_b: String(q.option_b || '').substring(0, 200),
          option_c: String(q.option_c || 'Ninguna de las anteriores').substring(0, 200),
          option_d: String(q.option_d || 'Todas las anteriores').substring(0, 200),
          correct_answer: String(q.correct_answer).toLowerCase().charAt(0),
          explanation: String(q.explanation || '').substring(0, 500),
          points: Math.min(20, Math.max(5, parseInt(q.points) || 10)),
          sort_order: i,
        });
      }
    }

    return new Response(JSON.stringify({
      questions: valid,
      count: valid.length,
      source: env.AI ? 'ai_generated' : 'template_generated',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al generar preguntas', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

function generateFallbackQuestions(text, n) {
  var sentences = text.replace(/\n+/g, '. ').split(/[.!?]+/).filter(function(s) { return s.trim().length > 20; });
  var questions = [];

  for (var i = 0; i < Math.min(n, sentences.length); i++) {
    var sentence = sentences[i].trim();
    questions.push({
      question: 'Cual de las siguientes opciones resume mejor: "' + sentence.substring(0, 200) + '"?',
      option_a: sentence.substring(0, 100) + ' (resumen directo)',
      option_b: 'Una interpretacion alternativa del contenido',
      option_c: 'Un punto de vista opuesto al descrito',
      option_d: 'Ninguna de las anteriores',
      correct_answer: 'a',
      explanation: 'La opcion A corresponde directamente al contenido del texto.',
      points: 10,
    });
  }

  return questions;
}
