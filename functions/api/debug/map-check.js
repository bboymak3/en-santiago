import { requireAdmin, errorResponse, corsHeaders } from '../../_lib/auth.js';

// functions/api/debug/map-check.js
// GET: Diagnose map-related issues — check businesses, data integrity, and common errors
// Usage: /api/debug/map-check
//        /api/debug/map-check?business_id=123
//        /api/debug/map-check?check=businesses|database|all

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const { error: authError } = await requireAdmin(request, env);
    if (authError) return authError;
    const url = new URL(request.url);
    const params = url.searchParams;
    const businessId = params.get('business_id');
    const check = params.get('check') || 'all';

    const report = {
      timestamp: new Date().toISOString(),
      url: request.url,
      checks: [],
      errors: [],
      warnings: [],
    };

    // ── Check 1: Database connection ──────────────────────────────
    if (!env.DB) {
      report.errors.push({
        level: 'CRITICAL',
        check: 'database',
        message: 'No hay binding de D1. Verifica que el binding "DB" esté configurado en Cloudflare Pages.',
        fix: 'Ve a Cloudflare Dashboard > Pages > Settings > Functions > D1 bindings y agrega el binding "DB".',
      });
      return new Response(JSON.stringify(report, null, 2), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    report.checks.push({ check: 'database', status: 'OK', message: 'Base de datos D1 conectada correctamente' });

    // ── Check 2: Tables exist ────────────────────────────────────
    if (check === 'all' || check === 'database') {
      try {
        const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const tableNames = tables.results.map(t => t.name);
        const requiredTables = ['businesses', 'users', 'images', 'contacts'];

        requiredTables.forEach(table => {
          if (tableNames.includes(table)) {
            report.checks.push({ check: 'table', table, status: 'OK' });
          } else {
            report.errors.push({
              level: 'CRITICAL',
              check: 'table',
              table,
              message: `La tabla "${table}" no existe en la base de datos.`,
              fix: 'Ejecuta schema.sql en tu base de datos D1.',
            });
          }
        });
      } catch (err) {
        report.errors.push({
          level: 'CRITICAL',
          check: 'database',
          message: 'Error al consultar tablas: ' + err.message,
        });
      }
    }

    // ── Check 3: Properties with coordinates (map markers) ───────
    if (check === 'all' || check === 'businesses') {
      try {
        // Get all approved businesses
        const allProps = await env.DB.prepare(
          "SELECT p.id, p.title, p.lat, p.lng, p.price, p.currency, p.business_type, p.business_type, (SELECT url FROM images WHERE business_id = p.id AND is_cover = 1 LIMIT 1) as cover_image, (SELECT COUNT(*) FROM images WHERE business_id = p.id) as image_count FROM businesses p WHERE p.status = 'approved'"
        ).all();

        const businesses = allProps.results || [];
        const withCoords = businesses.filter(p => p.lat && p.lng);
        const withoutCoords = businesses.filter(p => !p.lat || !p.lng);

        report.checks.push({
          check: 'businesses_total',
          status: businesses.length > 0 ? 'OK' : 'WARNING',
          message: `${businesses.length} propiedades aprobadas en total`,
        });

        report.checks.push({
          check: 'businesses_with_coords',
          status: 'INFO',
          message: `${withCoords.length} con coordenadas (se muestran en el mapa)`,
        });

        if (withoutCoords.length > 0) {
          report.warnings.push({
            check: 'businesses_without_coords',
            message: `${withoutCoords.length} propiedades SIN coordenadas (no aparecen en el mapa):`,
            businesses: withoutCoords.map(p => ({
              id: p.id,
              title: p.title,
              lat: p.lat,
              lng: p.lng,
            })),
          });
        }

        // Check for specific business data issues that break Leaflet popups
        const dataIssues = [];
        businesses.forEach(p => {
          const issues = [];
          if (p.lat !== null && p.lat !== undefined && isNaN(parseFloat(p.lat))) {
            issues.push(`lat inválido: "${p.lat}"`);
          }
          if (p.lng !== null && p.lng !== undefined && isNaN(parseFloat(p.lng))) {
            issues.push(`lng inválido: "${p.lng}"`);
          }
          if (p.title && typeof p.title !== 'string') {
            issues.push(`title no es string: ${typeof p.title}`);
          }
          if (p.cover_image && typeof p.cover_image !== 'string') {
            issues.push(`cover_image no es string: ${typeof p.cover_image} = ${JSON.stringify(p.cover_image)}`);
          }
          if (p.price !== null && p.price !== undefined && isNaN(Number(p.price))) {
            issues.push(`price no es número: "${p.price}"`);
          }
          if (issues.length > 0) {
            dataIssues.push({ id: p.id, title: p.title, issues });
          }
        });

        if (dataIssues.length > 0) {
          report.errors.push({
            level: 'ERROR',
            check: 'data_integrity',
            message: `${dataIssues.length} propiedades con datos que pueden causar errores en el mapa:`,
            details: dataIssues,
            fix: 'Estos campos deben ser corregidos en la base de datos. lat/lng deben ser números, title y cover_image deben ser strings.',
          });
        } else {
          report.checks.push({ check: 'data_integrity', status: 'OK', message: 'Todas las propiedades tienen datos válidos para el mapa' });
        }

        // Business detail if requested
        if (businessId) {
          const prop = businesses.find(p => p.id == businessId);
          if (prop) {
            report.business_detail = {
              id: prop.id,
              title: prop.title,
              lat: prop.lat,
              lng: prop.lng,
              lat_type: typeof prop.lat,
              lng_type: typeof prop.lng,
              price: prop.price,
              price_type: typeof prop.price,
              currency: prop.currency,
              business_type: prop.business_type,
              cover_image: prop.cover_image,
              cover_image_type: typeof prop.cover_image,
              has_valid_coords: !!(prop.lat && prop.lng && !isNaN(parseFloat(prop.lat)) && !isNaN(parseFloat(prop.lng))),
              leaflet_popup_safe: !!(prop.title && typeof prop.title === 'string'),
            };
          } else {
            report.warnings.push({
              check: 'business_lookup',
              message: `No se encontró la propiedad con ID ${businessId}`,
            });
          }
        }

        // Sample business for manual inspection
        if (businesses.length > 0 && !businessId) {
          report.sample_business = {
            id: businesses[0].id,
            title: businesses[0].title,
            lat: businesses[0].lat,
            lng: businesses[0].lng,
            lat_type: typeof businesses[0].lat,
            lng_type: typeof businesses[0].lng,
            price: businesses[0].price,
            currency: businesses[0].currency,
            cover_image: businesses[0].cover_image,
            cover_image_type: typeof businesses[0].cover_image,
          };
        }

      } catch (err) {
        report.errors.push({
          level: 'ERROR',
          check: 'businesses',
          message: 'Error al consultar propiedades: ' + err.message,
        });
      }
    }

    // ── Check 4: Environment variables ──────────────────────────
    report.checks.push({
      check: 'env',
      status: env.DB ? 'OK' : 'ERROR',
      message: env.DB ? 'Binding D1 disponible' : 'Binding D1 NO disponible',
    });

    // ── Summary ──────────────────────────────────────────────────
    const status = report.errors.length > 0
      ? (report.errors.some(e => e.level === 'CRITICAL') ? 'CRITICAL' : 'ERRORS_FOUND')
      : 'OK';

    report.summary = {
      status,
      total_checks: report.checks.length,
      errors_found: report.errors.length,
      warnings_found: report.warnings.length,
    };

    return new Response(JSON.stringify(report, null, 2), {
      status: report.errors.some(e => e.level === 'CRITICAL') ? 500 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error en el endpoint de debug',
      message: error.message,
      stack: error.stack,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
