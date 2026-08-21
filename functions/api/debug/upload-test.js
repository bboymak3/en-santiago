// functions/api/debug/upload-test.js
// GET: Diagnóstico de R2 y D1 - abre con ?token=TU_TOKEN
// Muestra estado de bindings, objetos R2, imágenes recientes, y prueba de escritura

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
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

export async function onRequestGet(context) {
  const { env, request } = context;
  const startTime = Date.now();
  const url = new URL(request.url);

  // Auth via query param ?token= or Authorization header
  let token = url.searchParams.get('token');
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.substring(7);
  }

  const report = {
    _titulo: 'Diagnostic R2 + D1 - HolaX',
    _timestamp: new Date().toISOString(),
    _ejecucion_ms: 0,
  };

  // ─── Auth ──────────────────────────────────────────────
  if (!token) {
    report.auth = { status: 'NO_TOKEN', mensaje: 'Pasa ?token=TU_TOKEN en la URL' };
  } else if (!env.JWT_SECRET) {
    report.auth = { status: 'ERROR', mensaje: 'JWT_SECRET no configurado en el entorno' };
  } else {
    const user = await verifyJWT(token, env.JWT_SECRET);
    if (user) {
      report.auth = { status: 'OK', user_id: user.id, email: user.email, role: user.role };
    } else {
      report.auth = { status: 'INVALID', mensaje: 'Token invalido o expirado' };
    }
  }

  // ─── D1 Check ──────────────────────────────────────────
  try {
    if (!env.DB) {
      report.d1 = { status: 'ERROR', mensaje: 'Binding DB no existe. Revisa wrangler.toml y Cloudflare Pages settings.' };
    } else {
      const test = await env.DB.prepare('SELECT 1 as ok').first();
      report.d1 = { status: 'OK', mensaje: 'D1 conectado', database: 'generico_db' };

      // Tablas y conteos
      const tables = ['users', 'businesses', 'images', 'products', 'categories', 'properties'];
      const tableInfo = {};
      for (const t of tables) {
        try {
          const r = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM ${t}`).first();
          tableInfo[t] = r.cnt;
        } catch (e) {
          tableInfo[t] = 'ERROR: ' + e.message;
        }
      }
      report.d1.tablas = tableInfo;

      // Imagenes recientes (para ver si se registran en DB)
      try {
        const recentImages = await env.DB.prepare(
          'SELECT i.id, i.business_id, i.url, i.is_cover, i.created_at, b.title as business_name FROM images i LEFT JOIN businesses b ON b.id = i.business_id ORDER BY i.id DESC LIMIT 10'
        ).all();
        report.d1.ultimas_imagenes = recentImages.results;
      } catch (e) {
        report.d1.ultimas_imagenes = 'ERROR: ' + e.message;
      }

      // Ultimos negocios creados
      try {
        const recentBiz = await env.DB.prepare(
          'SELECT id, title, status, logo, banner, created_at FROM businesses ORDER BY id DESC LIMIT 5'
        ).all();
        report.d1.ultimos_negocios = recentBiz.results;
      } catch (e) {
        report.d1.ultimos_negocios = 'ERROR: ' + e.message;
      }
    }
  } catch (e) {
    report.d1 = { status: 'ERROR', mensaje: e.message };
  }

  // ─── R2 Check ──────────────────────────────────────────
  try {
    if (!env.R2) {
      report.r2 = { status: 'ERROR', mensaje: 'Binding R2 no existe. Revisa wrangler.toml y Cloudflare Pages settings.' };
    } else {
      const r2Folder = env.R2_FOLDER || 'merida';
      report.r2 = {
        status: 'OK',
        mensaje: 'R2 conectado',
        bucket: 'my-emdash-media',
        folder: r2Folder,
      };

      // Listar objetos por carpeta
      const folders = ['banners', 'businesses', 'logos', 'marketplace', 'videos', 'properties', 'jobs'];
      const folderCounts = {};
      const allObjects = [];

      for (const folder of folders) {
        const prefix = `${r2Folder}/${folder}/`;
        try {
          const listed = await env.R2.list({ prefix, limit: 100 });
          folderCounts[folder] = listed.count;
          listed.objects.forEach(o => {
            allObjects.push({ key: o.key, size: o.size, uploaded: o.uploaded.toISOString() });
          });
        } catch (e) {
          folderCounts[folder] = 'ERROR: ' + e.message;
        }
      }
      report.r2.objetos_por_carpeta = folderCounts;

      // Total
      try {
        const all = await env.R2.list({ prefix: r2Folder + '/', limit: 500 });
        report.r2.total_objetos = all.count;
        report.r2.truncated = all.truncated;
      } catch (e) { /* ignore */ }

      // Últimos 10 objetos (más recientes primero)
      allObjects.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
      report.r2.ultimos_objetos = allObjects.slice(0, 10);

      // ─── Test de escritura R2 ───────────────────────────
      try {
        const testKey = `${r2Folder}/_debug/test_${Date.now()}.txt`;
        const testData = 'HolaX R2 test - ' + new Date().toISOString();
        await env.R2.put(testKey, testData, { httpMetadata: { contentType: 'text/plain' } });

        // Leer de vuelta
        const readBack = await env.R2.get(testKey);
        const readText = await readBack.text();

        // Limpiar
        await env.R2.delete(testKey);

        if (readText === testData) {
          report.r2.test_escritura = { status: 'OK', mensaje: 'Write + Read + Delete exitoso' };
        } else {
          report.r2.test_escritura = { status: 'WARNING', mensaje: 'Datos leidos no coinciden' };
        }
      } catch (e) {
        report.r2.test_escritura = { status: 'ERROR', mensaje: 'Fallo write/read/delete: ' + e.message };
      }
    }
  } catch (e) {
    report.r2 = { status: 'ERROR', mensaje: e.message };
  }

  // ─── Negocio específico (si pasan ?business=ID) ────────
  const businessId = url.searchParams.get('business');
  if (businessId && env.DB) {
    try {
      const biz = await env.DB.prepare('SELECT id, title, status, logo, banner FROM businesses WHERE id = ?').bind(businessId).first();
      if (biz) {
        report.negocio = biz;
        const imgs = await env.DB.prepare('SELECT id, url, is_cover, order_index, created_at FROM images WHERE business_id = ? ORDER BY order_index').bind(businessId).all();
        report.negocio.imagenes_en_db = imgs.results;
        report.negocio.total_imagenes = imgs.results.length;
      } else {
        report.negocio = { error: 'Negocio no encontrado' };
      }
    } catch (e) {
      report.negocio = { error: e.message };
    }

    // Buscar objetos R2 para este negocio
    if (env.R2) {
      try {
        const r2Folder = env.R2_FOLDER || 'merida';
        const prefix = `${r2Folder}/businesses/${businessId}/`;
        const listed = await env.R2.list({ prefix, limit: 50 });
        report.negocio.imagenes_en_r2 = listed.objects.map(o => ({ key: o.key, size: o.size }));
        report.negocio.total_en_r2 = listed.count;
      } catch (e) {
        report.negocio.imagenes_en_r2 = 'ERROR: ' + e.message;
      }
    }
  }

  // ─── Config del entorno ────────────────────────────────
  report.config = {
    R2_FOLDER: env.R2_FOLDER || '(no set, default: merida)',
    JWT_SECRET: env.JWT_SECRET ? '***configurado***' : '(NO CONFIGURADO - auth no funciona)',
    DB_binding: env.DB ? 'OK' : 'MISSING',
    R2_binding: env.R2 ? 'OK' : 'MISSING',
  };

  report._ejecucion_ms = Date.now() - startTime;

  // ─── También generar HTML legible ──────────────────────
  const acceptHtml = request.headers.get('Accept') || '';
  if (acceptHtml.includes('text/html')) {
    const html = generateHTMLReport(report);
    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(JSON.stringify(report, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateHTMLReport(r) {
  const icon = (status) => {
    if (status === 'OK') return '<span style="color:#16a34a;font-weight:bold;">OK</span>';
    if (status === 'ERROR' || status === 'INVALID') return '<span style="color:#dc2626;font-weight:bold;">ERROR</span>';
    if (status === 'WARNING') return '<span style="color:#f59e0b;font-weight:bold;">WARN</span>';
    return `<span style="color:#6b7280;">${status}</span>`;
  };

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HolaX Debug - R2 + D1</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;padding:20px;max-width:900px;margin:0 auto}
h1{font-size:1.4rem;margin-bottom:4px;color:#38bdf8}h2{font-size:1.1rem;margin:20px 0 8px;color:#94a3b8;border-bottom:1px solid #1e293b;padding-bottom:6px}
.card{background:#1e293b;border-radius:10px;padding:14px 18px;margin-bottom:12px;border:1px solid #334155}
.card.ok{border-color:#16a34a44}.card.err{border-color:#dc262644}
.row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e293b}
.row:last-child{border-bottom:none}label{color:#94a3b8;font-size:0.85rem}value{color:#e2e8f0;font-size:0.85rem;font-family:monospace;max-width:60%;text-align:right;word-break:break-all}
table{width:100%;border-collapse:collapse;font-size:0.8rem;margin-top:6px}th{text-align:left;color:#94a3b8;padding:4px 8px;border-bottom:1px solid #334155}td{padding:4px 8px;border-bottom:1px solid #1e293b;word-break:break-all;max-width:400px}
.meta{color:#475569;font-size:0.75rem;margin-top:20px;text-align:center}
</style></head><body>
<h1>HolaX - Diagnostico R2 + D1</h1>
<p style="color:#64748b;font-size:0.85rem;margin-bottom:16px">${r._timestamp} | ${r._ejecucion_ms}ms</p>

<h2>Auth</h2>
<div class="card ${r.auth.status==='OK'?'ok':r.auth.status==='ERROR'||r.auth.status==='INVALID'?'err':''}">
  <div class="row"><label>Estado</label><value>${icon(r.auth.status)}</value></div>
  ${r.auth.email ? `<div class="row"><label>Email</label><value>${r.auth.email}</value></div>` : ''}
  ${r.auth.role ? `<div class="row"><label>Rol</label><value>${r.auth.role}</value></div>` : ''}
  ${r.auth.mensaje ? `<div class="row"><label>Mensaje</label><value>${r.auth.mensaje}</value></div>` : ''}
</div>

<h2>D1 Database</h2>
<div class="card ${r.d1.status==='OK'?'ok':'err'}">
  <div class="row"><label>Estado</label><value>${icon(r.d1.status)}</value></div>
  <div class="row"><label>Database</label><value>${r.d1.database || '-'}</value></div>
  ${r.d1.tablas ? `<table><tr><th>Tabla</th><th>Registros</th></tr>${Object.entries(r.d1.tablas).map(([t,c])=>`<tr><td>${t}</td><td>${c}</td></tr>`).join('')}</table>` : ''}
</div>

<h2>R2 Storage</h2>
<div class="card ${r.r2.status==='OK'?'ok':'err'}">
  <div class="row"><label>Estado</label><value>${icon(r.r2.status)}</value></div>
  <div class="row"><label>Bucket</label><value>${r.r2.bucket || '-'}</value></div>
  <div class="row"><label>Carpeta</label><value>${r.r2.folder || '-'}</value></div>
  <div class="row"><label>Total objetos</label><value>${r.r2.total_objetos || 0}</value></div>
  ${r.r2.objetos_por_carpeta ? `<table><tr><th>Carpeta R2</th><th>Objetos</th></tr>${Object.entries(r.r2.objetos_por_carpeta).map(([f,c])=>`<tr><td>${f}/</td><td>${c}</td></tr>`).join('')}</table>` : ''}
  <div style="margin-top:10px"><strong>Test escritura:</strong> ${r.r2.test_escritura ? icon(r.r2.test_escritura.status) + ' ' + r.r2.test_escritura.mensaje : 'N/A'}</div>
</div>

${r.r2.ultimos_objetos && r.r2.ultimos_objetos.length > 0 ? `
<h2>Ultimos objetos en R2</h2>
<div class="card"><table><tr><th>Key</th><th>Tamano</th><th>Fecha</th></tr>
${r.r2.ultimos_objetos.map(o=>`<tr><td>${o.key}</td><td>${(o.size/1024).toFixed(1)} KB</td><td>${o.uploaded}</td></tr>`).join('')}
</table></div>` : ''}

${r.negocio ? `
<h2>Negocio #${r.negocio.id || ''} ${r.negocio.title ? '- ' + r.negocio.title : ''}</h2>
<div class="card">
  <div class="row"><label>Estado</label><value>${r.negocio.status || '-'}</value></div>
  <div class="row"><label>Logo</label><value>${r.negocio.logo || 'SIN LOGO'}</value></div>
  <div class="row"><label>Banner</label><value>${r.negocio.banner || 'SIN BANNER'}</value></div>
  <div class="row"><label>Imagenes en DB</label><value>${r.negocio.total_imagenes || 0}</value></div>
  <div class="row"><label>Imagenes en R2</label><value>${r.negocio.total_en_r2 || 0}</value></div>
  ${r.negocio.imagenes_en_db && r.negocio.imagenes_en_db.length > 0 ? `<table style="margin-top:8px"><tr><th>ID</th><th>URL</th><th>Portada</th><th>Fecha</th></tr>${r.negocio.imagenes_en_db.map(i=>`<tr><td>${i.id}</td><td>${i.url}</td><td>${i.is_cover?'Si':'No'}</td><td>${i.created_at}</td></tr>`).join('')}</table>` : '<p style="color:#f59e0b;margin-top:8px;font-size:0.85rem">Sin imagenes en la base de datos</p>'}
  ${r.negocio.imagenes_en_r2 && Array.isArray(r.negocio.imagenes_en_r2) && r.negocio.imagenes_en_r2.length > 0 ? `<p style="margin-top:8px;font-size:0.85rem;color:#94a3b8">Archivos R2 encontrados:</p><table>${r.negocio.imagenes_en_r2.map(i=>`<tr><td>${i.key}</td><td>${(i.size/1024).toFixed(1)} KB</td></tr>`).join('')}</table>` : r.negocio.total_en_r2 === 0 ? '<p style="color:#dc2626;margin-top:8px;font-size:0.85rem">NO hay archivos en R2 para este negocio</p>' : ''}
</div>` : '<p style="color:#64748b;font-size:0.82rem;margin-top:10px">Tip: Agrega &business=ID para ver detalle de un negocio especifico</p>'}

<h2>Configuracion</h2>
<div class="card">
  ${Object.entries(r.config).map(([k,v])=>`<div class="row"><label>${k}</label><value>${v}</value></div>`).join('')}
</div>

<p class="meta">HolaX Debug Endpoint - Eliminar despues de diagnosticar</p>
</body></html>`;
}