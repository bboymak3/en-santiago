// functions/api/ai-chat/index.js
// POST: Public AI chatbot endpoint — no auth required

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

// ─── POST: Chat with AI ───────────────────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // ── Parse request body ────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'El cuerpo de la solicitud debe ser JSON válido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, history } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'El campo "message" es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userMessage = message.trim();

    if (userMessage.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'El mensaje es demasiado largo (máximo 2000 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Check if chatbot is enabled ────────────────────────────────
    if (env.DB) {
      try {
        const chatbotSetting = await env.DB
          .prepare("SELECT value FROM admin_settings WHERE key = ?")
          .bind('ai_chatbot_enabled')
          .first();

        if (chatbotSetting && chatbotSetting.value === '0') {
          return new Response(
            JSON.stringify({ error: 'Chatbot deshabilitado' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.warn('Could not check ai_chatbot_enabled setting:', e.message);
      }
    }

    // ── Get welcome message from settings ────────────────────────
    let welcomeContext = '';
    if (env.DB) {
      try {
        const welcomeRow = await env.DB
          .prepare("SELECT value FROM admin_settings WHERE key = ?")
          .bind('ai_chatbot_welcome')
          .first();

        if (welcomeRow && welcomeRow.value) {
          welcomeContext = welcomeRow.value;
        }
      } catch (e) {}
    }

    // ── Build system prompt ───────────────────────────────────────
    const systemPrompt = `Eres un asistente virtual amigable del directorio de negocios "HolaX".
${welcomeContext ? `Contexto del admin: "${welcomeContext}"\n` : ''}
Reglas:
- Siempre responde en español
- Sé conciso (máximo 3-4 oraciones)
- Ayuda a buscar negocios, eventos, cupones
- Si preguntan por un negocio específico, sugiere usar el buscador del sitio
- Si preguntan por publicar un negocio, explica brevemente cómo registrarse
- NO menciones otras plataformas o competidores
- NO inventes datos de negocios
- Si el usuario saluda, responde calidamente
- Mantén tono profesional pero cercano`;

    // ── Build messages array ──────────────────────────────────────
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: String(msg.content || '').trim() });
        }
      }
    }

    messages.push({ role: 'user', content: userMessage });

    // ── Call AI via dynamic import (runtime only, not build-time) ──
    let reply;
    try {
      const ZAI = await import('z-ai-web-dev-sdk');
      const zai = await ZAI.default.create();
      const completion = await zai.chat.completions.create({
        messages,
      });
      reply = completion.choices[0].message.content;
    } catch (sdkError) {
      // Dynamic import may fail in some environments - use fallback
      reply = null;
    }

    // Fallback if SDK not available
    if (!reply) {
      reply = generateFallbackReply(userMessage);
    }

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Lo sentimos, no pude procesar tu mensaje. Intenta de nuevo.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Fallback replies when AI SDK is unavailable ───────────────
function generateFallbackReply(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('hola') || lower.includes('buenas') || lower.includes('hey')) {
    return 'Hola! Soy el asistente de HolaX. Puedo ayudarte a encontrar negocios, eventos y ofertas. Escribe lo que buscas.';
  }
  if (lower.includes('restaurante') || lower.includes('comida') || lower.includes('comer')) {
    return 'Puedes encontrar restaurantes en nuestra sección de búsqueda. Visita la página principal y usa el buscador o filtra por la categoría "Restaurantes".';
  }
  if (lower.includes('negocio') || lower.includes('registrar') || lower.includes('publicar')) {
    return 'Para publicar tu negocio en HolaX, haz clic en "Registrar" en el menú principal. Completa el formulario con los datos de tu negocio y será revisado por un administrador.';
  }
  if (lower.includes('evento') || lower.includes('actividad')) {
    return 'Visita nuestra sección de Eventos para ver las actividades más recientes. Allí encontrarás conciertos, ferias, talleres y más.';
  }
  if (lower.includes('cupon') || lower.includes('descuento') || lower.includes('oferta')) {
    return 'En la sección de Cupones encontrarás ofertas y descuentos exclusivos de negocios locales. Visítala desde el menú principal.';
  }
  if (lower.includes('empleo') || lower.includes('trabajo')) {
    return 'La sección de Empleo te muestra ofertas de trabajo disponibles. Puedes filtrar por estado y tipo de empleo.';
  }
  if (lower.includes('emergencia') || lower.includes('hospital') || lower.includes('farmacia')) {
    return 'La sección de Emergencias tiene números de hospitales, farmacias de guardia, bomberos y policía. Accesible desde el menú principal.';
  }
  return 'Gracias por tu mensaje. Puedo ayudarte a buscar negocios, eventos, cupones de descuento y más en HolaX. Escribe lo que necesitas y te guiaré.';
}
