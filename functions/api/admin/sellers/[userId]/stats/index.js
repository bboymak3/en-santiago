// functions/api/admin/sellers/[userId]/stats/index.js
// GET: Estadisticas completas de un vendedor especifico (admin only)
// Incluye: negocios, empleos, propiedades, productos, servicios medicos,
// reviews, contactos, favoritos recibidos, cupones, solicitudes premium

import { corsHeaders, requireAdmin, errorResponse, corsResponse, jsonResponse } from '../../../../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { request, env, params } = context;
    const userId = parseInt(params.userId, 10);

    if (!userId || isNaN(userId)) {
      return errorResponse('ID de vendedor inválido', 400);
    }

    // REQUIRE ADMIN AUTH
    const { user, error } = await requireAdmin(request, env);
    if (error) return error;

    if (!env.DB) {
      return errorResponse('Base de datos no disponible', 500);
    }

    // 1. Datos del vendedor (perfil + info usuario)
    const sellerInfo = await env.DB.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.whatsapp, u.role,
             u.avatar, u.bio, u.is_active, u.plan_type,
             u.plan_starts_at, u.plan_expires_at,
             u.created_at, u.updated_at,
             u.seller_owner_id, u.seller_photo,
             sp.id as profile_id, sp.id_card_photo, sp.commission_rate,
             sp.total_referrals, sp.total_earnings, sp.is_verified,
             sp.notes, sp.created_at as profile_created_at
      FROM users u
      LEFT JOIN sellers_profiles sp ON sp.user_id = u.id
      WHERE u.id = ?
    `).bind(userId).first();

    if (!sellerInfo) {
      return errorResponse('Vendedor no encontrado', 404);
    }

    // 2. Negocios registrados por el vendedor
    const businesses = await env.DB.prepare(`
      SELECT id, title, category_id, business_type, city, state,
             status, featured, views, rating,
             created_at, expires_at, logo, banner
      FROM businesses
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    const businessIds = (businesses.results || []).map(b => b.id);

    // 3. Empleos registrados por el vendedor
    const jobs = await env.DB.prepare(`
      SELECT id, business_id, company_name, title, job_type, salary,
             city, state, status, views, created_at, expires_at
      FROM job_listings
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    // 4. Propiedades registradas por el vendedor
    const properties = await env.DB.prepare(`
      SELECT id, title, property_type, operation_type, price, currency,
             city, state, bedrooms, bathrooms, area, status, featured, views,
             created_at, expires_at
      FROM properties
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    // 5. Productos registrados por el vendedor
    const products = await env.DB.prepare(`
      SELECT id, name, price, category, status, featured, business_id,
             created_at, expires_at
      FROM products
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    // 6. Servicios médicos (registrations con source=medico o similares)
    // Nota: la tabla registrations NO tiene user_id, así que contamos los
    // businesses de categoria médica vinculados al vendedor
    const medicalServices = await env.DB.prepare(`
      SELECT b.id, b.title, b.city, b.state, b.status, b.views, b.rating,
             b.created_at, c.name as category_name
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ?
        AND (c.slug LIKE '%medic%' OR c.slug LIKE '%salud%' OR c.slug LIKE '%doctor%'
             OR c.name LIKE '%medic%' OR c.name LIKE '%salud%' OR c.name LIKE '%doctor%')
      ORDER BY b.created_at DESC
    `).bind(userId).all();

    // 7. Reviews recibidas (en los negocios del vendedor)
    let reviews = { results: [] };
    if (businessIds.length > 0) {
      const placeholders = businessIds.map(() => '?').join(',');
      reviews = await env.DB.prepare(`
        SELECT r.id, r.business_id, b.title as business_title,
               r.user_id, u.name as reviewer_name,
               r.rating, r.comment, r.is_active, r.created_at
        FROM reviews r
        JOIN businesses b ON r.business_id = b.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.business_id IN (${placeholders})
        ORDER BY r.created_at DESC
        LIMIT 100
      `).bind(...businessIds).all();
    }

    // 8. Contactos recibidos (en los negocios del vendedor)
    let contacts = { results: [] };
    if (businessIds.length > 0) {
      const placeholders = businessIds.map(() => '?').join(',');
      contacts = await env.DB.prepare(`
        SELECT c.id, c.business_id, b.title as business_title,
               c.sender_name, c.sender_email, c.sender_phone,
               c.message, c.is_read, c.created_at
        FROM contacts c
        JOIN businesses b ON c.business_id = b.id
        WHERE c.business_id IN (${placeholders})
        ORDER BY c.created_at DESC
        LIMIT 100
      `).bind(...businessIds).all();
    }

    // 9. Favoritos recibidos (cuántos usuarios han marcado como favorito los negocios del vendedor)
    let favoritesReceived = { results: [] };
    let favoritesCount = 0;
    if (businessIds.length > 0) {
      const placeholders = businessIds.map(() => '?').join(',');
      favoritesReceived = await env.DB.prepare(`
        SELECT f.id, f.business_id, b.title as business_title,
               f.user_id, u.name as user_name,
               f.created_at
        FROM favorites f
        JOIN businesses b ON f.business_id = b.id
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.business_id IN (${placeholders})
        ORDER BY f.created_at DESC
        LIMIT 100
      `).bind(...businessIds).all();
      favoritesCount = favoritesReceived.results?.length || 0;
    }

    // 10. Cupones creados (asociados a los negocios del vendedor)
    let coupons = { results: [] };
    if (businessIds.length > 0) {
      const placeholders = businessIds.map(() => '?').join(',');
      coupons = await env.DB.prepare(`
        SELECT id, business_id, title, code, discount, discount_type,
               start_date, end_date, max_uses, current_uses,
               is_active, status, created_at
        FROM coupons
        WHERE business_id IN (${placeholders})
        ORDER BY created_at DESC
      `).bind(...businessIds).all();
    }

    // 11. Solicitudes premium del vendedor
    const premiumRequests = await env.DB.prepare(`
      SELECT id, plan_duration, voucher_url, payment_phone,
             status, admin_notes, created_at, reviewed_at
      FROM premium_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    // 12. Actividad reciente (eventos del vendedor en orden cronológico)
    const recentActivity = [];

    // Agregar negocios a la actividad
    (businesses.results || []).forEach(b => {
      recentActivity.push({
        type: 'business',
        action: 'Registro de negocio',
        title: b.title,
        status: b.status,
        date: b.created_at,
        id: b.id,
        url: `/business.html?id=${b.id}`
      });
    });

    // Agregar empleos
    (jobs.results || []).forEach(j => {
      recentActivity.push({
        type: 'job',
        action: 'Publicación de empleo',
        title: j.title,
        status: j.status,
        date: j.created_at,
        id: j.id
      });
    });

    // Agregar propiedades
    (properties.results || []).forEach(p => {
      recentActivity.push({
        type: 'property',
        action: 'Publicación de propiedad',
        title: p.title,
        status: p.status,
        date: p.created_at,
        id: p.id
      });
    });

    // Agregar productos
    (products.results || []).forEach(p => {
      recentActivity.push({
        type: 'product',
        action: 'Publicación de producto',
        title: p.name,
        status: p.status,
        date: p.created_at,
        id: p.id
      });
    });

    // Agregar reviews recibidos
    (reviews.results || []).forEach(r => {
      recentActivity.push({
        type: 'review',
        action: `Review ${r.rating}★ recibida`,
        title: r.business_title,
        status: r.is_active ? 'activo' : 'inactivo',
        date: r.created_at,
        id: r.id
      });
    });

    // Agregar contactos recibidos
    (contacts.results || []).forEach(c => {
      recentActivity.push({
        type: 'contact',
        action: 'Contacto recibido',
        title: c.business_title,
        status: c.is_read ? 'leído' : 'no leído',
        date: c.created_at,
        id: c.id
      });
    });

    // Agregar solicitudes premium
    (premiumRequests.results || []).forEach(pr => {
      recentActivity.push({
        type: 'premium_request',
        action: `Solicitud Premium (${pr.plan_duration})`,
        title: pr.status === 'approved' ? 'Aprobada' : (pr.status === 'rejected' ? 'Rechazada' : 'Pendiente'),
        status: pr.status,
        date: pr.created_at,
        id: pr.id
      });
    });

    // Ordenar actividad por fecha descendente
    recentActivity.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // 13. Calcular totales y métricas agregadas
    const totalViewsBusinesses = (businesses.results || []).reduce((sum, b) => sum + (b.views || 0), 0);
    const totalViewsJobs = (jobs.results || []).reduce((sum, j) => sum + (j.views || 0), 0);
    const totalViewsProperties = (properties.results || []).reduce((sum, p) => sum + (p.views || 0), 0);
    const totalViews = totalViewsBusinesses + totalViewsJobs + totalViewsProperties;

    const avgRating = (businesses.results || []).length > 0
      ? (businesses.results.reduce((sum, b) => sum + (b.rating || 0), 0) / businesses.results.filter(b => b.rating > 0).length || 0)
      : 0;

    const activeBusinesses = (businesses.results || []).filter(b => b.status === 'approved').length;
    const pendingBusinesses = (businesses.results || []).filter(b => b.status === 'pending').length;

    const activeJobs = (jobs.results || []).filter(j => j.status === 'approved' || j.status === 'active').length;
    const activeProperties = (properties.results || []).filter(p => p.status === 'approved' || p.status === 'active').length;
    const activeProducts = (products.results || []).filter(p => p.status === 'approved' || p.status === 'active').length;

    const unreadContacts = (contacts.results || []).filter(c => !c.is_read).length;
    const totalCouponsUsed = (coupons.results || []).reduce((sum, c) => sum + (c.current_uses || 0), 0);

    // Construir respuesta
    return jsonResponse({
      seller: sellerInfo,
      summary: {
        total_businesses: (businesses.results || []).length,
        total_jobs: (jobs.results || []).length,
        total_properties: (properties.results || []).length,
        total_products: (products.results || []).length,
        total_medical_services: (medicalServices.results || []).length,
        total_reviews: (reviews.results || []).length,
        total_contacts: (contacts.results || []).length,
        total_favorites: favoritesCount,
        total_coupons: (coupons.results || []).length,
        total_premium_requests: (premiumRequests.results || []).length,
        total_views: totalViews,
        total_views_businesses: totalViewsBusinesses,
        total_views_jobs: totalViewsJobs,
        total_views_properties: totalViewsProperties,
        avg_rating: parseFloat(avgRating.toFixed(2)),
        active_businesses: activeBusinesses,
        pending_businesses: pendingBusinesses,
        active_jobs: activeJobs,
        active_properties: activeProperties,
        active_products: activeProducts,
        unread_contacts: unreadContacts,
        total_coupons_used: totalCouponsUsed,
      },
      businesses: businesses.results || [],
      jobs: jobs.results || [],
      properties: properties.results || [],
      products: products.results || [],
      medical_services: medicalServices.results || [],
      reviews: reviews.results || [],
      contacts: contacts.results || [],
      favorites: favoritesReceived.results || [],
      coupons: coupons.results || [],
      premium_requests: premiumRequests.results || [],
      recent_activity: recentActivity.slice(0, 50), // últimas 50 actividades
    });

  } catch (error) {
    console.error('Seller stats error:', error);
    return errorResponse('Error interno del servidor: ' + (error.message || 'desconocido'), 500);
  }
}
