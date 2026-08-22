import { requireAdmin, errorResponse, corsHeaders } from '../../_lib/auth.js';

// functions/api/debug/premium-check.js
// GET: Validate premium vs basic plan logic for a business
// Usage: /api/debug/premium-check?business_id=16
//        /api/debug/premium-check?slug=tienda-pura-sangre

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const { error: authError } = await requireAdmin(request, env);
    if (authError) return authError;
    const url = new URL(context.request.url);
    const businessId = url.searchParams.get('business_id');
    const slug = url.searchParams.get('slug');

    if (!businessId && !slug) {
      return new Response(JSON.stringify({
        error: 'Especifica business_id o slug',
        usage: '/api/debug/premium-check?business_id=16  o  /api/debug/premium-check?slug=tienda-pura-sangre'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get business + owner info
    let business;
    if (businessId) {
      business = await env.DB.prepare(`
        SELECT b.id, b.title, b.slug, b.whatsapp, b.phone, b.user_id, b.status,
               u.id as owner_id, u.name as owner_name, u.email as owner_email, u.role as owner_role,
               u.plan_type as owner_plan_type, u.plan_expires_at
        FROM businesses b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.id = ?
      `).bind(businessId).first();
    } else {
      business = await env.DB.prepare(`
        SELECT b.id, b.title, b.slug, b.whatsapp, b.phone, b.user_id, b.status,
               u.id as owner_id, u.name as owner_name, u.email as owner_email, u.role as owner_role,
               u.plan_type as owner_plan_type, u.plan_expires_at
        FROM businesses b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.slug = ?
      `).bind(slug).first();
    }

    if (!business) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isPremium = business.owner_plan_type === 'premium';
    const hasWhatsApp = !!(business.whatsapp || business.phone);

    // Check pending premium requests
    let premiumRequest = null;
    if (!isPremium && business.owner_id) {
      premiumRequest = await env.DB.prepare(
        "SELECT id, status, plan_duration, created_at FROM premium_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
      ).bind(business.owner_id).first();
    }

    // Simulate frontend logic
    const frontendLogic = {
      whatsapp_shown: hasWhatsApp && isPremium,
      email_shown: !isPremium && !!(business.owner_email || business.whatsapp),
      badge_type: isPremium ? 'premium' : 'basic',
      badge_color: isPremium ? 'gold' : 'green',
      badge_label: isPremium ? 'Premium' : 'HOLAX',
    };

    return new Response(JSON.stringify({
      business: {
        id: business.id,
        title: business.title,
        slug: business.slug,
        status: business.status,
        whatsapp: business.whatsapp,
        phone: business.phone,
      },
      owner: {
        id: business.owner_id,
        name: business.owner_name,
        email: business.owner_email,
        role: business.owner_role,
        plan_type: business.owner_plan_type || 'basic (null → basic)',
        plan_expires_at: business.plan_expires_at || null,
      },
      premium_request: premiumRequest || 'No hay solicitudes pendientes',
      frontend_simulation: frontendLogic,
      rules: {
        basic: {
          max_businesses: 10,
          expiration_days: 20,
          whatsapp_button: false,
          email_button: true,
          search_priority: 'normal',
        },
        premium: {
          max_businesses: 'unlimited',
          expiration_days: 'never',
          whatsapp_button: true,
          email_button: false,
          search_priority: 'high (shown first)',
        }
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}