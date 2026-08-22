// functions/api/contacts/admin-message/index.js
// POST: Admin sends a message to a user (ADMIN ONLY)

import { corsHeaders, requireAdmin, errorResponse, jsonResponse } from '../../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // REQUIRE ADMIN AUTH
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    if (!env.DB) {
      return errorResponse('Base de datos no disponible', 500);
    }

    let body;
    try { body = await request.json(); } catch { return errorResponse('JSON invalido', 400); }
    const { user_id, subject, message } = body;

    if (!user_id || !subject || !message) {
      return errorResponse('user_id, subject y message son requeridos', 400);
    }

    // Get user info for the contact record
    const user = await env.DB.prepare('SELECT name, email, phone FROM users WHERE id = ?').bind(user_id).first();

    // Use correct column names for contacts table (sender_name, sender_email, sender_phone)
    await env.DB.prepare(
      'INSERT INTO contacts (business_id, sender_name, sender_email, sender_phone, message, is_read, status) VALUES (?, ?, ?, ?, ?, 0, ?)'
    ).bind(
      null,
      `Admin -> ${user?.name || 'Usuario'}`,
      user?.email || '',
      user?.phone || '',
      `[${subject}] ${message}`,
      'nuevo'
    ).run();

    return jsonResponse({ message: 'Mensaje enviado correctamente' }, 201);
  } catch (error) {
    console.error('Admin message error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}