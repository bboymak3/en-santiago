// scripts/lh-summary.mjs — resume reportes de Lighthouse (lh-*.json) en el log
import fs from 'node:fs';
const kb = (b) => (b / 1024).toFixed(0) + ' KB';
for (const f of fs.readdirSync('.').filter((x) => /^lh-.*\.json$/.test(x))) {
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  const a = r.audits;
  console.log(`\n===== ${r.finalDisplayedUrl} (móvil) =====`);
  console.log('Score perf:', Math.round(r.categories.performance.score * 100));
  for (const k of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'interactive'])
    console.log(`  ${k}: ${a[k].displayValue}`);
  console.log('  Peso total:', a['total-byte-weight'].displayValue, '| Requests:', a['network-requests'].details.items.length);
  const lcp = a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet;
  if (lcp) console.log('  Elemento LCP:', lcp.slice(0, 160));
  console.log('  Oportunidades:');
  Object.values(a).filter((x) => x.details?.type === 'opportunity' && (x.numericValue || 0) > 0)
    .sort((x, y) => y.numericValue - x.numericValue).slice(0, 10)
    .forEach((x) => console.log(`    - ${x.title}: ${x.displayValue || ''}`));
  console.log('  Diagnósticos:');
  for (const k of ['render-blocking-resources', 'unused-css-rules', 'unused-javascript', 'bootup-time', 'mainthread-work-breakdown', 'uses-long-cache-ttl', 'font-display', 'third-party-summary', 'dom-size'])
    if (a[k] && a[k].score !== null && a[k].score < 0.9) console.log(`    - ${a[k].title}: ${a[k].displayValue || ''}`);
  console.log('  Recursos más pesados:');
  a['network-requests'].details.items.sort((x, y) => y.transferSize - x.transferSize).slice(0, 12)
    .forEach((i) => console.log(`    ${kb(i.transferSize).padStart(8)}  ${i.resourceType}  ${i.url.slice(0, 140)}`));
  const cache = a['uses-long-cache-ttl']?.details?.items || [];
  if (cache.length) console.log('  Caché corta:', cache.slice(0, 8).map((i) => `${i.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 60)} (${Math.round(i.cacheLifetimeMs / 1000)}s)`).join(' | '));
}
