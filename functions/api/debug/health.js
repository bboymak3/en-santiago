import { requireAdmin, errorResponse, corsHeaders } from '../../_lib/auth.js';

// functions/api/debug/health.js
// GET: System health check - validates D1, R2, bindings, and tables

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const { error: authError } = await requireAdmin(request, env);
  if (authError) return authError;
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {},
    tables: {},
    counts: {},
    config: {},
  };

  // ─── Check D1 Database ──────────────────────────────────────
  try {
    if (!env.DB) {
      health.services.d1 = {
        status: 'error',
        message: 'Binding DB no configurado en Cloudflare Pages',
      };
      health.status = 'degraded';
    } else {
      // Test basic query
      const dbResult = await env.DB.prepare('SELECT 1 as test').first();

      // Check each table
      const tableChecks = {};
      const tables = ['users', 'categories', 'businesses', 'images', 'contacts', 'favorites', 'states'];

      for (const table of tables) {
        try {
          const exists = await env.DB.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          ).bind(table).first();

          if (exists) {
            const countResult = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).first();
            tableChecks[table] = {
              status: 'ok',
              rows: countResult.cnt,
            };
          } else {
            tableChecks[table] = { status: 'missing' };
            health.status = 'degraded';
          }
        } catch (err) {
          tableChecks[table] = { status: 'error', message: err.message };
          health.status = 'degraded';
        }
      }

      health.services.d1 = {
        status: 'ok',
        message: 'Base de datos conectada',
        database_name: 'generico_db',
        database_id: '38dd85ba-03dc-4937-af19-4d1c41a18f27',
      };
      health.tables = tableChecks;

      // Business counts by status
      try {
        const statuses = await env.DB.prepare(
          `SELECT status, COUNT(*) as cnt FROM businesses GROUP BY status`
        ).all();
        health.counts.businesses_by_status = {};
        statuses.results.forEach(r => {
          health.counts.businesses_by_status[r.status] = r.cnt;
        });
      } catch (e) { /* ignore */ }

      // Category count
      try {
        const catCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM categories').first();
        health.counts.categories = catCount.cnt;
      } catch (e) { /* ignore */ }

      // User count
      try {
        const userCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first();
        health.counts.users = userCount.cnt;
      } catch (e) { /* ignore */ }

      // State count
      try {
        const stateCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM states').first();
        health.counts.states = stateCount.cnt;
      } catch (e) { /* ignore */ }
    }
  } catch (error) {
    health.services.d1 = { status: 'error', message: error.message };
    health.status = 'error';
  }

  // ─── Check R2 Storage ────────────────────────────────────────
  try {
    if (!env.R2) {
      health.services.r2 = {
        status: 'error',
        message: 'Binding R2 no configurado en Cloudflare Pages',
      };
      health.status = 'degraded';
    } else {
      // List objects in the aunclick folder to verify access
      const r2Prefix = env.R2_FOLDER || 'merida';
      const listed = await env.R2.list({ prefix: r2Prefix + '/', limit: 5 });
      health.services.r2 = {
        status: 'ok',
        message: 'Almacenamiento R2 conectado',
        bucket: 'my-emdash-media',
        prefix: r2Prefix + '/',
        sample_objects: listed.objects.map(o => ({
          key: o.key,
          size: o.size,
          uploaded: o.uploaded,
        })),
        truncated: listed.truncated,
      };
    }
  } catch (error) {
    health.services.r2 = { status: 'error', message: error.message };
    if (health.status !== 'error') health.status = 'degraded';
  }

  // ─── Check Environment Config ────────────────────────────────
  health.config.has_jwt_secret = !!env.JWT_SECRET;
  health.config.r2_folder = env.R2_FOLDER || 'aunclick';

  // ─── Check API Endpoints ────────────────────────────────────
  health.endpoints = {
    'GET /api/businesses': 'Listar negocios',
    'POST /api/businesses': 'Crear negocio (requiere auth)',
    'GET /api/businesses/:id': 'Detalle de negocio',
    'POST /api/upload': 'Subir imagen a R2 (requiere auth)',
    'GET /api/categories': 'Listar categorías',
    'POST /api/auth/login': 'Login',
    'POST /api/auth/register': 'Registro',
    'GET /api/debug/health': 'Este endpoint de diagnóstico',
  };

  const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 500;

  return new Response(JSON.stringify(health, null, 2), {
    status: statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
