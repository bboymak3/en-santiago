import { requireAdmin, errorResponse, corsHeaders } from '../../_lib/auth.js';

// functions/api/debug/index.js
// GET /api/debug - Comprehensive system diagnostic endpoint

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  return JSON.parse(atob(base64));
}

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  let sigBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
  const sigPad = sigBase64.length % 4;
  if (sigPad) sigBase64 += '='.repeat(4 - sigPad);
  const sigBytes = Uint8Array.from(atob(sigBase64), (c) => c.charCodeAt(0));
  const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
  if (!isValid) return null;
  const payload = base64urlDecode(payloadB64);
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

async function safeQuery(db, sql, label) {
  try {
    const result = await db.prepare(sql).all();
    return { status: 'OK', data: result.results };
  } catch (e) {
    return { status: 'ERROR', error: e.message };
  }
}

async function safeFirst(db, sql, label) {
  try {
    const result = await db.prepare(sql).first();
    return { status: 'OK', data: result };
  } catch (e) {
    return { status: 'ERROR', error: e.message };
  }
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const { error: authError } = await requireAdmin(request, env);
  if (authError) return authError;
  const startTime = Date.now();

  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      platform: 'Cloudflare Pages Functions',
      region: request.cf?.region || 'unknown',
    },
    checks: {},
    tables: {},
    status_breakdown: {},
    api_endpoints: [],
    auth: {},
    settings: {},
    recent_products: [],
    schema_issues: [],
    performance_ms: 0,
  };

  // ─── 1. Database Connection Check ────────────────────────────
  if (!env.DB) {
    results.checks.database = { status: 'CRITICAL', message: 'DB binding not found. Check wrangler.toml or Cloudflare Pages settings.' };
    results.schema_issues.push('No D1 database binding available');
    return new Response(JSON.stringify(results, null, 2), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const dbTest = await safeFirst(env.DB, 'SELECT 1 as test', 'DB connection');
  if (dbTest.status === 'OK') {
    results.checks.database = { status: 'OK', message: 'Database connection successful' };
  } else {
    results.checks.database = { status: 'ERROR', message: dbTest.error };
    results.schema_issues.push(`Database error: ${dbTest.error}`);
  }

  // ─── JWT Secret Check ────────────────────────────────────────
  results.checks.jwt_secret = env.JWT_SECRET
    ? { status: 'OK', message: 'JWT_SECRET is configured' }
    : { status: 'WARNING', message: 'JWT_SECRET not set - auth will not work' };

  // ─── 2. Table Counts ─────────────────────────────────────────
  const tableNames = [
    'users', 'businesses', 'products', 'categories', 'images',
    'contacts', 'favorites', 'states', 'reviews', 'coupons',
    'events', 'bookings', 'notifications', 'settings', 'admin_settings',
    'jobs', 'job_applications',
  ];

  for (const table of tableNames) {
    const result = await safeFirst(env.DB, `SELECT COUNT(*) as count FROM ${table}`, table);
    if (result.status === 'OK') {
      results.tables[table] = { status: 'OK', count: result.data.count };
    } else {
      results.tables[table] = { status: 'NOT FOUND', error: result.error };
      if (result.error && !result.error.includes('no such table')) {
        results.schema_issues.push(`Table "${table}": ${result.error}`);
      }
    }
  }

  // ─── 3. Products Breakdown by Status ─────────────────────────
  const productsByStatus = await safeQuery(env.DB,
    `SELECT COALESCE(status, 'NULL') as status, COUNT(*) as count FROM products GROUP BY status`,
    'products_by_status'
  );
  if (productsByStatus.status === 'OK') {
    results.status_breakdown.products = productsByStatus.data.map(r => ({
      status: r.status,
      count: r.count,
    }));
  } else {
    results.status_breakdown.products = { error: productsByStatus.error };
  }

  // ─── 4. Businesses Breakdown by Status ───────────────────────
  const businessesByStatus = await safeQuery(env.DB,
    `SELECT COALESCE(status, 'NULL') as status, COUNT(*) as count FROM businesses GROUP BY status`,
    'businesses_by_status'
  );
  if (businessesByStatus.status === 'OK') {
    results.status_breakdown.businesses = businessesByStatus.data.map(r => ({
      status: r.status,
      count: r.count,
    }));
  } else {
    results.status_breakdown.businesses = { error: businessesByStatus.error };
  }

  // ─── 5. Jobs Breakdown by Status ─────────────────────────────
  const jobsByStatus = await safeQuery(env.DB,
    `SELECT COALESCE(status, 'NULL') as status, COUNT(*) as count FROM jobs GROUP BY status`,
    'jobs_by_status'
  );
  if (jobsByStatus.status === 'OK') {
    results.status_breakdown.jobs = jobsByStatus.data.map(r => ({
      status: r.status,
      count: r.count,
    }));
  } else {
    results.status_breakdown.jobs = { error: jobsByStatus.error };
  }

  // ─── 6. API Endpoint Availability ────────────────────────────
  // List all known endpoints based on the functions directory structure
  const knownEndpoints = [
    { path: '/api/businesses', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    { path: '/api/users', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    { path: '/api/products', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    { path: '/api/categories', methods: ['GET'] },
    { path: '/api/reviews', methods: ['GET', 'POST'] },
    { path: '/api/contacts', methods: ['GET', 'POST'] },
    { path: '/api/favorites', methods: ['GET', 'POST', 'DELETE'] },
    { path: '/api/events', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    { path: '/api/bookings', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    { path: '/api/jobs', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    { path: '/api/coupons', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    { path: '/api/marketplace', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    { path: '/api/settings', methods: ['GET', 'PUT'] },
    { path: '/api/points', methods: ['GET', 'POST'] },
    { path: '/api/notifications', methods: ['GET', 'POST', 'PUT'] },
    { path: '/api/emergency', methods: ['GET', 'POST'] },
    { path: '/api/ai-chat', methods: ['POST'] },
    { path: '/api/serve', methods: ['GET'] },
    { path: '/api/debug', methods: ['GET'] },
  ];
  results.api_endpoints = knownEndpoints;

  // ─── 7. Auth System Check ────────────────────────────────────
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    if (!env.JWT_SECRET) {
      results.auth = { status: 'ERROR', message: 'Cannot verify token - JWT_SECRET not configured' };
    } else {
      try {
        const user = await verifyJWT(authHeader.substring(7), env.JWT_SECRET);
        if (user) {
          results.auth = {
            status: 'OK',
            message: 'Token valid',
            user_id: user.id,
            email: user.email,
            role: user.role,
            exp: new Date(user.exp * 1000).toISOString(),
          };
        } else {
          results.auth = { status: 'INVALID', message: 'Token is invalid or expired' };
        }
      } catch (e) {
        results.auth = { status: 'ERROR', message: e.message };
      }
    }
  } else {
    results.auth = { status: 'NO_TOKEN', message: 'No Bearer token provided. Debug endpoint works without auth.' };
  }

  // Check admin user count
  const adminCount = await safeFirst(env.DB,
    `SELECT COUNT(*) as count FROM users WHERE role = 'admin'`,
    'admin_count'
  );
  if (adminCount.status === 'OK') {
    results.auth.admin_users = adminCount.data.count;
    if (adminCount.data.count === 0) {
      results.schema_issues.push('CRITICAL: No admin users found in database');
    }
  }

  // ─── 8. Settings Values ──────────────────────────────────────
  const settingsResult = await safeQuery(env.DB,
    `SELECT key, value FROM admin_settings ORDER BY key`,
    'settings'
  );
  if (settingsResult.status === 'OK') {
    // Parse known boolean/numeric settings
    results.settings = {};
    for (const row of settingsResult.data) {
      try {
        results.settings[row.key] = JSON.parse(row.value);
      } catch {
        results.settings[row.key] = row.value;
      }
    }
  } else {
    results.settings = { error: settingsResult.error };
  }

  // Also check legacy settings table
  const legacySettings = await safeQuery(env.DB,
    `SELECT key, value FROM settings ORDER BY key`,
    'legacy_settings'
  );
  if (legacySettings.status === 'OK' && legacySettings.data.length > 0) {
    results.legacy_settings = {};
    for (const row of legacySettings.data) {
      try {
        results.legacy_settings[row.key] = JSON.parse(row.value);
      } catch {
        results.legacy_settings[row.key] = row.value;
      }
    }
  }

  // ─── 9. Recent Products (last 10) ────────────────────────────
  const recentProducts = await safeQuery(env.DB,
    `SELECT id, name, price, status, business_id, business_name, category, created_at
     FROM products
     ORDER BY created_at DESC
     LIMIT 10`,
    'recent_products'
  );
  if (recentProducts.status === 'OK') {
    results.recent_products = recentProducts.data;
  } else {
    results.recent_products = { error: recentProducts.error };
  }

  // ─── 10. Schema Checks ───────────────────────────────────────
  // Check products table schema for expected columns
  const productsSchema = await safeQuery(env.DB, `PRAGMA table_info(products)`, 'products_schema');
  if (productsSchema.status === 'OK') {
    const columns = productsSchema.data.map(c => c.name);
    const expectedColumns = ['id', 'name', 'description', 'price', 'status', 'business_id', 'business_name', 'category', 'image_url', 'created_at'];
    const missing = expectedColumns.filter(c => !columns.includes(c));
    if (missing.length > 0) {
      results.schema_issues.push(`Products table missing columns: ${missing.join(', ')}`);
    }
    results.tables.products_columns = columns;
  }

  // Check businesses table schema
  const businessesSchema = await safeQuery(env.DB, `PRAGMA table_info(businesses)`, 'businesses_schema');
  if (businessesSchema.status === 'OK') {
    const columns = businessesSchema.data.map(c => c.name);
    const expectedColumns = ['id', 'name', 'category', 'address', 'city', 'state', 'phone', 'email', 'status', 'owner_id', 'created_at'];
    const missing = expectedColumns.filter(c => !columns.includes(c));
    if (missing.length > 0) {
      results.schema_issues.push(`Businesses table missing columns: ${missing.join(', ')}`);
    }
    results.tables.businesses_columns = columns;
  }

  // Check users table schema
  const usersSchema = await safeQuery(env.DB, `PRAGMA table_info(users)`, 'users_schema');
  if (usersSchema.status === 'OK') {
    const columns = usersSchema.data.map(c => c.name);
    const expectedColumns = ['id', 'name', 'email', 'password', 'role', 'created_at'];
    const missing = expectedColumns.filter(c => !columns.includes(c));
    if (missing.length > 0) {
      results.schema_issues.push(`Users table missing columns: ${missing.join(', ')}`);
    }
    results.tables.users_columns = columns;
  }

  // Check jobs table schema
  const jobsSchema = await safeQuery(env.DB, `PRAGMA table_info(jobs)`, 'jobs_schema');
  if (jobsSchema.status === 'OK') {
    const columns = jobsSchema.data.map(c => c.name);
    results.tables.jobs_columns = columns;
  }

  // Check for orphaned records (products with missing business)
  const orphanedProducts = await safeFirst(env.DB,
    `SELECT COUNT(*) as count FROM products WHERE business_id IS NOT NULL AND business_id NOT IN (SELECT id FROM businesses)`,
    'orphaned_products'
  );
  if (orphanedProducts.status === 'OK' && orphanedProducts.data.count > 0) {
    results.schema_issues.push(`${orphanedProducts.data.count} products reference non-existent businesses (orphaned)`);
  }

  // Check for users without proper roles
  const invalidRoles = await safeFirst(env.DB,
    `SELECT COUNT(*) as count FROM users WHERE role NOT IN ('user', 'admin', 'business_owner')`,
    'invalid_roles'
  );
  if (invalidRoles.status === 'OK' && invalidRoles.data.count > 0) {
    results.schema_issues.push(`${invalidRoles.data.count} users have invalid roles`);
  }

  // ─── Performance ─────────────────────────────────────────────
  results.performance_ms = Date.now() - startTime;

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}