// functions/api/admin/create-user/index.js
// POST: Admin creates a new user account (ADMIN ONLY)

import { corsHeaders, requireAdmin, errorResponse, corsResponse, jsonResponse } from '../../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // REQUIRE ADMIN AUTH
    const { user, error } = await requireAdmin(request, env);
    if (error) return error;

    if (!env.DB) {
      return errorResponse('Base de datos no disponible', 500);
    }

    let body;
    try { body = await request.json(); } catch { return errorResponse('JSON invalido', 400); }
    const { name, email, phone, password, role } = body;

    if (!name || !email || !password) {
      return errorResponse('Nombre, email y contrasena son requeridos', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Formato de email invalido', 400);
    }

    if (password.length < 6) {
      return errorResponse('La contrasena debe tener al menos 6 caracteres', 400);
    }

    // Only admins can assign admin role
    const validRoles = ['user', 'agent'];
    const assignedRole = (user.role === 'admin' && role === 'admin') ? 'admin' : (validRoles.includes(role) ? role : 'user');

    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return errorResponse('Ya existe un usuario con este email', 409);
    }

    const passwordHash = await sha256(password);

    const result = await env.DB.prepare(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, email, phone || null, passwordHash, assignedRole).run();

    const userId = result.meta.last_row_id;

    return jsonResponse({
      message: `Usuario "${name}" creado exitosamente con rol "${assignedRole}"`,
      user: { id: userId, name, email, role: assignedRole, phone },
    }, 201);
  } catch (error) {
    console.error('Admin create user error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}