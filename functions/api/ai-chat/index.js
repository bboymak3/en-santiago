// functions/api/ai-chat/index.js
// POST: Public AI chatbot — usa Cloudflare Workers AI nativo (no requiere SDK externo)
// Modelo: @cf/meta/llama-3.1-8b-instruct (gratis hasta 10k req/día)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

// Modelo de IA a usar (Llama 3.1 8B - versión actualizada, no deprecada)
// Si falla, intenta con un modelo alternativo más reciente
const MODEL_ID = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FALLBACK_MODELS = [
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/meta/llama-3-8b-instruct',
  '@cf/mistral/mistral-7b-instruct-v0.2',
];

// System prompt específico para En Santiago
const SYSTEM_PROMPT = `Eres "Santi", el asistente virtual de En Santiago (https://en-santiago.com), el directorio de negocios de Santiago de Chile.

SOBRE EN SANTIAGO:
- Directorio metropolitano de negocios, productos, inmuebles y empleos en Santiago de Chile
- Negocios en todas las comunas: Maipú, Las Condes, Providencia, Santiago Centro, Ñuñoa, etc.
- Categorías: restaurantes, barberías, mecánicos, farmacias, salud, belleza, servicios, etc.
- Los usuarios pueden registrar su negocio gratis en /registrar-negocio.html
- Planes premium disponibles en /planes.html

TUS FUNCIONES:
1. Ayudar a encontrar negocios por categoría, comuna o palabra clave
2. Explicar cómo registrar un negocio o usar el sitio
3. Informar sobre planes premium y beneficios
4. Responder sobre comunas de Santiago y qué servicios hay en cada una

REGLAS:
- Responde en español chileno, amable y directo
- Máximo 3-4 frases por respuesta
- Si no sabes algo específico, deriva al buscador en /search.html
- NO inventes datos de negocios específicos que no conoces
- Si preguntan por algo no relacionado con el sitio, redirige amablemente

Ejemplos:
Usuario: "Busco restaurante en Providencia"
Tú: "Visita /search.html?categoria=restaurantes&comuna=providencia para ver restaurantes disponibles en Providencia. También puedes filtrar por tipo de cocina."

Usuario: "Cómo registro mi negocio"
Tú: "Ve a /registrar-negocio.html, completa el formulario con datos de tu negocio (nombre, categoría, comuna, contacto) y será revisado. Es gratis."`;

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const userMessage = (body.message || '').trim();
    const history = body.history || [];

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: 'Mensaje vacío' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir messages array con contexto
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Agregar historial reciente (máx 10 mensajes)
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: String(msg.content || '').trim() });
        }
      }
    }

    messages.push({ role: 'user', content: userMessage });

    // ── Verificar si Workers AI está disponible ──
    console.log('AI binding check:', typeof env.AI, env.AI ? 'available' : 'NOT available');
    if (!env.AI) {
      console.warn('Workers AI binding not available, using fallback');
      const reply = generateFallbackReply(userMessage);
      return new Response(
        JSON.stringify({ reply, fallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Llamar a Workers AI (con fallback a modelos alternativos) ──
    let reply;
    let aiErrorInfo = null;
    let usedModel = null;
    const modelsToTry = [MODEL_ID, ...FALLBACK_MODELS];

    for (const model of modelsToTry) {
      try {
        console.log(`Trying model: ${model}, messages: ${messages.length}`);
        const aiResponse = await env.AI.run(model, {
          messages,
          max_tokens: 500,
          temperature: 0.7,
        });
        console.log(`Model ${model} response keys:`, Object.keys(aiResponse || {}));
        reply = aiResponse.response || aiResponse.choices?.[0]?.message?.content;
        if (reply) {
          usedModel = model;
          console.log(`Success with model ${model}, reply: ${reply.substring(0, 100)}`);
          break;
        }
      } catch (modelError) {
        console.warn(`Model ${model} failed:`, modelError.message);
        aiErrorInfo = { message: modelError.message, model };
        // Intentar siguiente modelo
      }
    }

    // Fallback si todos los modelos fallan
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

// ─── Fallback replies when Workers AI is unavailable ───────────
function generateFallbackReply(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('hola') || lower.includes('buenas') || lower.includes('hey')) {
    return '¡Hola! Soy Santi, el asistente de En Santiago. Puedo ayudarte a encontrar negocios, eventos y ofertas. Escribe lo que buscas (ej: "restaurantes en Maipú", "barbería en Providencia").';
  }
  if (lower.includes('restaurante') || lower.includes('comida') || lower.includes('comer')) {
    return 'Puedes buscar restaurantes en /search.html filtrando por categoría "Restaurantes" y la comuna que prefieras.';
  }
  if (lower.includes('barber') || lower.includes('peluquer') || lower.includes('corte')) {
    return 'Para barberías y peluquerías, visita /search.html y filtra por categoría "Belleza" o busca "barbería" + tu comuna.';
  }
  if (lower.includes('negocio') || lower.includes('registrar') || lower.includes('publicar')) {
    return 'Para registrar tu negocio gratis, ve a /registrar-negocio.html y completa el formulario. Será revisado por un administrador.';
  }
  if (lower.includes('plan') || lower.includes('premium') || lower.includes('pago')) {
    return 'Los planes premium te dan más visibilidad. Mira opciones en /planes.html — desde $10/mes con 3 meses o 1 año.';
  }
  if (lower.includes('evento') || lower.includes('actividad')) {
    return 'Visita /entretenimiento.html para ver eventos y actividades en Santiago.';
  }
  if (lower.includes('cupon') || lower.includes('descuento') || lower.includes('oferta')) {
    return 'En /cupones.html encontrarás descuentos exclusivos de negocios locales de Santiago.';
  }
  if (lower.includes('empleo') || lower.includes('trabajo')) {
    return 'La sección /empleo.html muestra ofertas de trabajo disponibles en Santiago. Puedes filtrar por comuna y tipo.';
  }
  if (lower.includes('emergencia') || lower.includes('hospital') || lower.includes('farmacia')) {
    return 'Para emergencias (hospitales, farmacias de guardia, bomberos, policía) visita /emergencia.html.';
  }
  return 'Puedo ayudarte a buscar negocios, registrar tu negocio o informarte sobre Santiago. Escribe lo que necesitas (ej: "farmacia en Las Condes", "cómo registro").';
}
