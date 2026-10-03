// scripts/cf-audit.mjs
// Auditoría de SOLO LECTURA de D1 y R2 vía API REST de Cloudflare.
// Lo ejecuta .github/workflows/cf-audit.yml con el secret CLOUDFLARE.
// No escribe ni borra nada: solo SELECT en D1 y GET/list en R2.

const TOKEN = process.env.CF_API_TOKEN;
const ACCOUNT = process.env.CF_ACCOUNT_ID || '08c16b2ef77f748599f3ff7db1e28e94';
const DB_ID = process.env.CF_D1_ID || '083ae5ed-b15f-4ff3-abcf-b3a3b666bb79';
const BUCKET = process.env.CF_R2_BUCKET || 'en-santiago-media';
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}`;

if (!TOKEN) { console.error('Falta CF_API_TOKEN'); process.exit(1); }

const auth = { Authorization: `Bearer ${TOKEN}` };
const report = {};

async function d1(sql, params = []) {
  if (!/^\s*(SELECT|WITH)\b/i.test(sql)) throw new Error('Solo SELECT');
  const r = await fetch(`${API}/d1/database/${DB_ID}/query`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(`D1: ${JSON.stringify(j.errors)}`);
  return j.result[0].results;
}

const fmt = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

// ─── 1. Acceso ────────────────────────────────────────────
async function checkAccess() {
  const db = await (await fetch(`${API}/d1/database/${DB_ID}`, { headers: auth })).json();
  const bk = await (await fetch(`${API}/r2/buckets/${BUCKET}`, { headers: auth })).json();
  report.access = {
    d1: db.success ? `${db.result.name} OK` : JSON.stringify(db.errors),
    r2: bk.success ? `${bk.result.name} OK` : JSON.stringify(bk.errors),
  };
  console.log('ACCESO', report.access);
  return db.success && bk.success;
}

// ─── 2. D1 ────────────────────────────────────────────────
const ARTICLES = {
  barberias: ['barber', 'peluquer', 'barbería', 'barbero', 'corte de pelo', 'fade'],
  mecanicos: ['mecánic', 'mecanic', 'taller', 'automotr', 'auto', 'vehícul', 'vehicul', 'frenos', 'scanner', 'neumátic'],
  restaurantes: ['restaurant', 'comida', 'cafeter', 'sushi', 'pizz', 'gastronom', 'café', 'cafe', 'bar ', 'delivery'],
  farmacias: ['farmac', 'droguer', 'botica', 'medicamento'],
};
const MATCH = '(b.title LIKE ? OR b.description LIKE ? OR b.address LIKE ? OR b.especialidad LIKE ?)';

async function auditD1() {
  const cats = await d1(`SELECT c.id, c.name, c.slug,
      (SELECT COUNT(*) FROM businesses b WHERE b.category_id = c.id AND b.status = 'approved') AS aprobados
    FROM categories c WHERE c.is_active = 1 ORDER BY aprobados DESC, c.name`);
  report.categorias = cats;
  console.log('\nCATEGORÍAS ACTIVAS (aprobados)');
  cats.forEach((c) => console.log(`  ${String(c.aprobados).padStart(4)}  ${c.slug}  (${c.name})`));

  const total = await d1(`SELECT status, COUNT(*) n FROM businesses GROUP BY status`);
  console.log('\nNEGOCIOS POR ESTADO', total);

  report.terminos = {};
  for (const [art, terms] of Object.entries(ARTICLES)) {
    console.log(`\nTÉRMINOS ${art}`);
    report.terminos[art] = {};
    for (const t of terms) {
      const p = `%${t}%`;
      const rows = await d1(`SELECT COUNT(*) n FROM businesses b WHERE b.status='approved' AND ${MATCH}`, [p, p, p, p]);
      const byCat = await d1(`SELECT c.slug, COUNT(*) n FROM businesses b LEFT JOIN categories c ON c.id=b.category_id
        WHERE b.status='approved' AND ${MATCH} GROUP BY c.slug ORDER BY n DESC LIMIT 5`, [p, p, p, p]);
      report.terminos[art][t] = { n: rows[0].n, categorias: byCat };
      console.log(`  ${String(rows[0].n).padStart(4)}  "${t}"  → ${byCat.map((x) => `${x.slug}:${x.n}`).join(', ')}`);
    }
  }

  const prov = await d1(`SELECT c.slug, COUNT(*) n FROM businesses b LEFT JOIN categories c ON c.id=b.category_id
    WHERE b.status='approved' AND (b.city LIKE '%providencia%' OR b.address LIKE '%providencia%' OR b.state LIKE '%providencia%')
    GROUP BY c.slug ORDER BY n DESC`);
  report.providencia = prov;

  // Conteo final por artículo con la misma config que blog/*.html (data-terms + data-categories)
  const fs = await import('node:fs');
  report.final = {};
  console.log('\nCONTEO FINAL POR ARTÍCULO (aprobados, términos OR categorías)');
  for (const f of fs.readdirSync('blog').filter((x) => x.endsWith('.html'))) {
    const html = fs.readFileSync(`blog/${f}`, 'utf8');
    const tag = html.match(/<script[^>]*blog-businesses\.js[^>]*>/);
    if (!tag) continue;
    const attr = (name) => ((tag[0].match(new RegExp(`data-${name}="([^"]*)"`)) || [])[1] || '').split('|').filter(Boolean);
    const terms = attr('terms');
    const cats = attr('categories');
    if (!terms.length && !cats.length) continue;
    const conds = [];
    const params = [];
    terms.forEach((t) => { conds.push(MATCH); const p = `%${t}%`; params.push(p, p, p, p); });
    cats.forEach((c) => { conds.push('b.category_id = (SELECT id FROM categories WHERE slug = ?)'); params.push(c); });
    const rows = await d1(`SELECT b.title, c.slug FROM businesses b LEFT JOIN categories c ON c.id=b.category_id
      WHERE b.status='approved' AND (${conds.join(' OR ')})`, params);
    report.final[f] = { terms, cats, n: rows.length, negocios: rows };
    console.log(`  ${String(rows.length).padStart(3)}  ${f}  → ${rows.map((r) => `${r.title} [${r.slug}]`).join(' | ')}`);
  }
  console.log('\nAPROBADOS EN PROVIDENCIA por categoría', prov);
}

// ─── 3. R2 ────────────────────────────────────────────────
async function listAll(prefix) {
  const out = [];
  let cursor = '';
  do {
    const u = new URL(`${API}/r2/buckets/${BUCKET}/objects`);
    u.searchParams.set('prefix', prefix);
    u.searchParams.set('per_page', '1000');
    if (cursor) u.searchParams.set('cursor', cursor);
    const j = await (await fetch(u, { headers: auth })).json();
    if (!j.success) throw new Error(`R2 list ${prefix}: ${JSON.stringify(j.errors)}`);
    out.push(...j.result);
    cursor = j.result_info?.is_truncated ? j.result_info.cursor : '';
  } while (cursor);
  return out;
}

async function head16(key) {
  const r = await fetch(`${API}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`, {
    headers: { ...auth, Range: 'bytes=0-15' },
  });
  const buf = Buffer.from(await r.arrayBuffer()).subarray(0, 16);
  return buf;
}

function sniff(b) {
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (b.length >= 12 && b.toString('ascii', 4, 8) === 'ftyp' && /avi[fs]/.test(b.toString('ascii', 8, 12))) return 'avif';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpeg';
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return 'png';
  if (b.toString('ascii', 0, 3) === 'GIF') return 'gif';
  return 'otro';
}

async function auditR2() {
  report.r2 = {};
  for (const prefix of ['santiago/logos/', 'santiago/banners/']) {
    const objs = await listAll(prefix);
    const sum = objs.reduce((a, o) => a + (o.size || 0), 0);
    const top = [...objs].sort((a, b) => b.size - a.size).slice(0, 10);
    report.r2[prefix] = { count: objs.length, bytes: sum, top: top.map((o) => ({ key: o.key, bytes: o.size })) };
    console.log(`\nR2 ${prefix}: ${objs.length} objetos, ${fmt(sum)}`);
    top.forEach((o) => console.log(`  ${fmt(o.size).padStart(10)}  ${o.key}`));
  }

  const variants = await listAll('cache/img/');
  const sumAll = variants.reduce((a, o) => a + (o.size || 0), 0);
  console.log(`\nR2 cache/img/: ${variants.length} variantes, ${fmt(sumAll)}`);

  const bad = [];
  const byReal = {};
  for (const o of variants) {
    let real;
    try { real = sniff(await head16(o.key)); } catch { real = 'error'; }
    byReal[real] = byReal[real] || { count: 0, bytes: 0 };
    byReal[real].count++; byReal[real].bytes += o.size || 0;
    if (real !== 'webp' && real !== 'avif') bad.push({ key: o.key, bytes: o.size, real, ct: o.http_metadata?.contentType });
  }
  const badSum = bad.reduce((a, o) => a + (o.bytes || 0), 0);
  report.r2.cache = { count: variants.length, bytes: sumAll, porFormatoReal: byReal, noWebpAvif: { count: bad.length, bytes: badSum } };
  console.log('  Por formato real:', Object.entries(byReal).map(([k, v]) => `${k}: ${v.count} (${fmt(v.bytes)})`).join(' | '));
  console.log(`  NO WebP/AVIF reales: ${bad.length} variantes, ${fmt(badSum)}`);
  bad.sort((a, b) => b.bytes - a.bytes).slice(0, 15)
    .forEach((o) => console.log(`    ${fmt(o.bytes).padStart(10)}  ${o.real}  ct=${o.ct}  ${o.key}`));
}

const ok = await checkAccess();
if (!ok) process.exit(1);
await auditD1();
await auditR2();
const fs = await import('node:fs');
fs.writeFileSync('cf-audit-report.json', JSON.stringify(report, null, 2));
console.log('\nListo (solo lectura).');
