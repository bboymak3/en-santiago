// functions/api/admin/sellers/index.js
// GET: List all seller profiles (admin only)
// Muestra TODOS los usuarios con rol agent/seller/user, tengan o no perfil en sellers_profiles

import { corsHeaders, requireAdmin, errorResponse, corsResponse, jsonResponse } from '../../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // REQUIRE ADMIN AUTH
    const { user, error } = await requireAdmin(request, env);
    if (error) return error;

    if (!env.DB) {
      return errorResponse('Base de datos no disponible', 500);
    }

    // Verificar si la tabla sellers_profiles existe
    const tableCheck = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sellers_profiles'").first();

    if (!tableCheck) {
      // Si no existe sellers_profiles, listar todos los usuarios agent/user con al menos 1 negocio
      const agentSellers = await env.DB.prepare(`
        SELECT u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role,
               COALESCE(u.plan_type, 'basic') as plan_type,
               u.avatar, u.phone, u.whatsapp,
               (SELECT b.title FROM businesses b WHERE b.user_id = u.id LIMIT 1) as store_name,
               (SELECT COUNT(*) FROM businesses b WHERE b.user_id = u.id) as business_count,
               u.created_at
        FROM users u
        WHERE u.role IN ('agent', 'user')
          AND u.id IN (SELECT DISTINCT user_id FROM businesses)
        ORDER BY u.created_at DESC
      `).all();

      return jsonResponse({ sellers: agentSellers.results || [] });
    }

    // sellers_profiles existe: descubrir columnas disponibles
    const colRows = await env.DB.prepare("PRAGMA table_info(sellers_profiles)").all();
    const existingCols = (colRows.results || []).map(r => r.name);
    const colSet = new Set(existingCols);

    // Construir SELECT para sellers_profiles (con fallbacks si faltan columnas)
    const spSelects = [];
    // user_id siempre viene del JOIN con users, no de sp
    if (colSet.has('store_name')) spSelects.push('sp.store_name');
    else spSelects.push("(SELECT b.title FROM businesses b WHERE b.user_id = u.id LIMIT 1) as store_name");
    if (colSet.has('description')) spSelects.push('sp.description');
    else spSelects.push("'' as description");
    if (colSet.has('avatar')) spSelects.push('sp.avatar');
    else spSelects.push("u.avatar as avatar");
    if (colSet.has('city')) spSelects.push('sp.city');
    else spSelects.push("(SELECT b.city FROM businesses b WHERE b.user_id = u.id LIMIT 1) as city");
    if (colSet.has('state')) spSelects.push('sp.state');
    else spSelects.push("(SELECT b.state FROM businesses b WHERE b.user_id = u.id LIMIT 1) as state");
    if (colSet.has('phone')) spSelects.push('sp.phone');
    else spSelects.push("u.phone as phone");
    if (colSet.has('whatsapp')) spSelects.push('sp.whatsapp');
    else spSelects.push("u.whatsapp as whatsapp");
    if (colSet.has('instagram')) spSelects.push('sp.instagram');
    else spSelects.push("'' as instagram");
    if (colSet.has('facebook')) spSelects.push('sp.facebook');
    else spSelects.push("'' as facebook");
    if (colSet.has('tiktok')) spSelects.push('sp.tiktok');
    else spSelects.push("'' as tiktok");
    if (colSet.has('rating')) spSelects.push('sp.rating');
    else spSelects.push("0 as rating");
    if (colSet.has('total_sales')) spSelects.push('sp.total_sales');
    else spSelects.push("0 as total_sales");
    // created_at: usar el de users si sp no tiene
    if (colSet.has('created_at')) spSelects.push('sp.created_at as profile_created_at');
    else spSelects.push("'' as profile_created_at");

    // QUERY PRINCIPAL: FROM users u LEFT JOIN sellers_profiles sp
    // Esto muestra TODOS los usuarios agent/seller/user, tengan o no perfil en sellers_profiles
    const query = `
      SELECT u.id as user_id,
             COALESCE(u.name, 'Sin nombre') as user_name,
             u.email as user_email,
             u.role as user_role,
             COALESCE(u.plan_type, 'basic') as plan_type,
             u.avatar,
             u.phone,
             u.whatsapp,
             u.is_active,
             u.created_at,
             ${spSelects.join(', ')},
             (SELECT b.title FROM businesses b WHERE b.user_id = u.id LIMIT 1) as store_name,
             (SELECT COUNT(*) FROM businesses b WHERE b.user_id = u.id) as business_count
      FROM users u
      LEFT JOIN sellers_profiles sp ON sp.user_id = u.id
      WHERE u.role IN ('agent', 'seller', 'user')
      ORDER BY u.created_at DESC
    `;

    const sellers = await env.DB.prepare(query).all();
    return jsonResponse({ sellers: sellers.results || [] });
  } catch (error) {
    console.error('Sellers list error:', error);
    return errorResponse('Error interno del servidor: ' + (error.message || 'desconocido'), 500);
  }
}
