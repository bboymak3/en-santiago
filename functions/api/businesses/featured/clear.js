// functions/api/businesses/featured/clear.js
// PUT: Clear all featured businesses (ADMIN ONLY)

import { corsHeaders, requireAdmin, errorResponse, jsonResponse } from '../../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPut(context) {
  try {
    const { request, env } = context;

    // REQUIRE ADMIN AUTH
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    if (!env.DB) {
      return errorResponse('DB not available', 500);
    }

    await env.DB.prepare('UPDATE businesses SET featured = 0 WHERE featured = 1').run();
    return jsonResponse({ message: 'Featured cleared' });
  } catch (err) {
    console.error('Featured clear error:', err);
    return errorResponse('Error interno del servidor', 500);
  }
}