// functions/api/robots/index.js
// GET: Return robots.txt (no auth required)
// Optimizado para GEO: permite crawlers de IA generativa

export async function onRequestGet() {
  const robotsTxt = `# En Santiago - Directorio de Negocios de Santiago de Chile
# https://en-santiago.pages.dev

# === GENERATIVE AI CRAWLERS — ALLOW ALL ===
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Bytespider
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

# === ALL OTHER CRAWLERS ===
User-agent: *
Allow: /

Disallow: /admin.html
Disallow: /admin-edit-business.html
Disallow: /admin-chat.html
Disallow: /admin-vendedores.html
Disallow: /dashboard.html
Disallow: /debug-vendedores.html
Disallow: /api/
Disallow: /functions/

Disallow: /*?q=
Disallow: /*?state=
Disallow: /*?category=
Disallow: /*?page=
Disallow: /*?sort=
Disallow: /*?categoria=
Disallow: /*?business_type=
Disallow: /*?city=

Sitemap: https://en-santiago.pages.dev/sitemap.xml`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
