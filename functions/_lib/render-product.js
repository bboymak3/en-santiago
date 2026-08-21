// functions/_lib/render-product.js
// Extracted from functions/producto/[slug].js — pure rendering logic for a product page.

export function esc(s) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') : ''; }
export function escJs(s) { return s ? s.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n') : ''; }

export function getCatBadge(c) {
  return {general:'badge-general',vehiculos:'badge-vehiculos',inmuebles:'badge-inmuebles',electronica:'badge-electronica',servicios:'badge-servicios',ropa:'badge-ropa',hogar:'badge-hogar'}[c]||'badge-general';
}
export function getCatLabel(c) {
  return {general:'General',vehiculos:'Vehiculos',inmuebles:'Inmuebles',electronica:'Electronica',servicios:'Servicios',ropa:'Ropa',hogar:'Hogar'}[c]||c||'General';
}
export function getCatIcon(c) {
  return {general:'fa-tag',vehiculos:'fa-car',inmuebles:'fa-building',electronica:'fa-laptop',servicios:'fa-wrench',ropa:'fa-tshirt',hogar:'fa-couch'}[c]||'fa-tag';
}
export function fmtDate(d) {
  if(!d) return '';
  try {
    var ds = String(d).trim();
    if (ds.includes('T')) { /* ISO ya tiene T */ }
    else if (ds.includes(' ')) { ds = ds.replace(' ', 'T'); } /* SQLite: 2025-01-15 12:30:00 → 2025-01-15T12:30:00 */
    else { ds = ds + 'T00:00:00'; } /* solo fecha: 2025-01-15 */
    const dt = new Date(ds);
    if (isNaN(dt.getTime())) return d;
    return dt.getDate()+' '+['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][dt.getMonth()]+' '+dt.getFullYear();
  } catch(e) { return d; }
}

export function getVideoEmbed(url) {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
  const ytShortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (ytShortsMatch) return `<iframe src="https://www.youtube.com/embed/${ytShortsMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (ttMatch) return `<iframe data-tiktok src="https://www.tiktok.com/embed/v2/${ttMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return `<video src="${esc(url)}" controls playsinline preload="metadata" style="width:100%;border-radius:12px;background:#000;"></video>`;
  }
  return `<iframe src="${esc(url)}" frameborder="0" allowfullscreen></iframe>`;
}

export async function renderProductPage(env, product, options) {
  const { canonicalUrl, productTypeSlug } = options;

  // Parse image: could be JSON array or plain URL
  let productImages = [];
  let productImage = product.image || '';
  try {
      const parsed = JSON.parse(productImage);
      if (Array.isArray(parsed) && parsed.length > 0) {
          productImages = parsed.filter(u => u && u.trim());
      }
  } catch(e) {}
  if (productImages.length === 0 && productImage) {
      productImages = [productImage];
  }
  const mainImage = productImages[0] || '';

  const baseUrl = 'https://en-santiago.com';
  const title = product.name || 'Producto';
  const price = product.price ? `$${Number(product.price).toLocaleString('es-VE')}` : '';
  const description = product.description
    ? product.description.substring(0, 160)
    : `${title}${price ? ' - ' + price : ''} - Disponible en En-Santiago Marketplace, Venezuela.`;
  const imageUrl = mainImage || `${baseUrl}/logo.png`;

  // Fetch 3 related products - try same category first, fallback to same business, then any
  let relatedProducts = [];
  try {
    if (product.category) {
      const byCategory = await env.DB.prepare(
        `SELECT p.id, p.name, p.price, p.image, p.slug, p.category
         FROM products p
         WHERE p.category = ? AND p.id != ? AND (p.status = 'approved' OR p.status IS NULL)
         ORDER BY RANDOM() LIMIT 3`
      ).bind(product.category, product.id).all();
      relatedProducts = byCategory.results || [];
    }
    if (relatedProducts.length === 0 && product.business_id) {
      const byBusiness = await env.DB.prepare(
        `SELECT p.id, p.name, p.price, p.image, p.slug, p.category
         FROM products p
         WHERE p.business_id = ? AND p.id != ? AND (p.status = 'approved' OR p.status IS NULL)
         ORDER BY RANDOM() LIMIT 3`
      ).bind(product.business_id, product.id).all();
      relatedProducts = byBusiness.results || [];
    }
    if (relatedProducts.length === 0) {
      const anyProducts = await env.DB.prepare(
        `SELECT p.id, p.name, p.price, p.image, p.slug, p.category
         FROM products p
         WHERE p.id != ? AND (p.status = 'approved' OR p.status IS NULL)
         ORDER BY RANDOM() LIMIT 3`
      ).bind(product.id).all();
      relatedProducts = anyProducts.results || [];
    }
  } catch(e) {
    console.error('Related products error:', e);
  }

  const catBadge = getCatBadge(product.category);
  const catLabel = getCatLabel(product.category);
  const catIcon = getCatIcon(product.category);
  const waNumber = product.business_whatsapp ? product.business_whatsapp.replace(/[^0-9]/g, '') : '';
  const waMsg = encodeURIComponent('Hola, estoy interesado en: ' + product.name);
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waMsg}` : '';
  const bizTipo = (product.business_type || 'negocio').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const bizCat = product.category_slug || 'otro';
  const bizLink = product.business_slug ? '/' + bizTipo + '/' + bizCat + '/' + product.business_slug : '';

  // Build related products HTML (compact cards) — links use /producto/${rpCategorySlug}/${rp.slug}
  let relatedHtml = '';
  if (relatedProducts.length > 0) {
    const cards = relatedProducts.map(rp => {
      const rpPrice = rp.price ? `$${Number(rp.price).toLocaleString('es-VE')}` : '';
      const rpSlug = rp.slug || rp.id;
      const rpBadge = getCatBadge(rp.category);
      const rpIcon = getCatIcon(rp.category);
      const rpCategorySlug = rp.category || 'general';
      let rpImg = '';
      if (rp.image) {
        try {
          const parsed = JSON.parse(rp.image);
          if (Array.isArray(parsed) && parsed.length > 0) rpImg = parsed[0];
        } catch(e) {}
        if (!rpImg && String(rp.image).startsWith('http')) rpImg = rp.image;
      }
      return `
          <a href="/producto/${rpCategorySlug}/${rpSlug}" class="rp-card">
            <div class="rp-card-img">
              ${rpImg ? `<img src="${esc(rpImg)}" alt="${esc(rp.name)}" loading="lazy" onerror="this.style.display='none'">` : `<div class="rp-card-ph"><i class="fas fa-image"></i></div>`}
              <span class="rp-badge ${rpBadge}"><i class="fas ${rpIcon}"></i></span>
            </div>
            <div class="rp-card-body">
              <div class="rp-card-name">${esc(rp.name)}</div>
              ${rpPrice ? `<div class="rp-card-price">${rpPrice}</div>` : ''}
            </div>
          </a>`;
    }).join('');

    relatedHtml = `
        <div class="pd-section-related">
          <div class="pd-section-title"><i class="fas fa-boxes-stacked"></i> Productos Relacionados</div>
          <div class="rp-grid">${cards}</div>
        </div>`;
  }

  // Pre-compute escJs values as plain variables (esbuild IIFE limitation)
  const _escTitle = escJs(title);
  const _escDesc = escJs(product.description || title);

  // Build breadcrumb with optional product type
  let breadcrumbHtml = `<a href="/"><i class="fas fa-home"></i></a>
            <span class="sep"><i class="fas fa-chevron-right"></i></span>
            <a href="/marketplace.html"><i class="fas fa-shopping-bag"></i> Marketplace</a>`;
  if (productTypeSlug) {
    const tipoLabel = productTypeSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    breadcrumbHtml += `
            <span class="sep"><i class="fas fa-chevron-right"></i></span>
            <a href="/tipo/${esc(productTypeSlug)}"><i class="fas fa-tag"></i> ${esc(tipoLabel)}</a>`;
  }
  breadcrumbHtml += `
            <span class="sep"><i class="fas fa-chevron-right"></i></span>
            <span>${esc(title)}</span>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TMH9V9QQ');</script>
<!-- End Google Tag Manager -->
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-RYF2N8ZD15"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-RYF2N8ZD15');
</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/jpeg" href="/images/favicon.jpeg">
    <title>${esc(title)}${price ? ' - ' + price : ''} - En-Santiago Marketplace</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:type" content="product">
    <meta property="og:title" content="${esc(title)}${price ? ' - ' + price : ''}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="En-Santiago Marketplace">
    <meta property="og:locale" content="es_VE">
    <meta property="product:price:amount" content="${product.price || '0'}">
    <meta property="product:price:currency" content="USD">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)} - En-Santiago">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${imageUrl}">
    <!-- JSON-LD: Product + BreadcrumbList -->
    <script type="application/ld+json">${JSON.stringify((() => {
      const ld = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": title,
        "description": product.description || description,
        "image": productImages.length > 0 ? productImages : [imageUrl],
        "url": canonicalUrl,
        "brand": product.business_name ? { "@type": "Brand", "name": product.business_name } : undefined,
        "offers": {
          "@type": "Offer",
          "price": product.price || "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "itemCondition": "https://schema.org/NewCondition",
          "seller": {
            "@type": "Organization",
            "name": product.business_name || "En-Santiago"
          }
        }
      };
      return ld;
    })())}</script>
    <script type="application/ld+json">${(() => {
      const crumbs = [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://en-santiago.com/" },
        { "@type": "ListItem", "position": 2, "name": "Marketplace", "item": "https://en-santiago.com/marketplace.html" }
      ];
      if (productTypeSlug) {
        crumbs.push({ "@type": "ListItem", "position": crumbs.length + 1, "name": productTypeSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), "item": "https://en-santiago.com/tipo/" + encodeURIComponent(productTypeSlug) });
      }
      if (product.category) {
        crumbs.push({ "@type": "ListItem", "position": crumbs.length + 1, "name": product.category, "item": "https://en-santiago.com/marketplace.html?categoria=" + encodeURIComponent(product.category) });
      }
      crumbs.push({ "@type": "ListItem", "position": crumbs.length + 1, "name": title, "item": canonicalUrl });
      return JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs });
    })()}</script>
    <link rel="stylesheet" href="/css/styles.css?v=4">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="manifest" href="/manifest.json">
    <style>
        * { box-sizing:border-box; }
        body { background:#f5f5f5; margin:0; font-family:system-ui,-apple-system,sans-serif; }

        /* === NAVBAR (matching main site) === */
        .navbar { background:#fff; position:sticky; top:0; z-index:1000; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
        .nav-container { max-width:1200px; margin:0 auto; padding:0 16px; display:flex; align-items:center; justify-content:space-between; height:60px; position:relative; }
        .nav-logo { display:flex; align-items:center; gap:8px; text-decoration:none; font-size:1.3rem; font-weight:800; color:#8B0000; flex-shrink:0; }
        .nav-logo:hover { opacity:0.9; }
        .nav-logo i { font-size:1.4rem; }
        .brand-name { font-size:1.2rem; font-weight:800; }
        .nav-toggle { display:none; background:none; border:none; font-size:1.4rem; color:#1e293b; cursor:pointer; padding:8px; }
        .nav-menu { display:flex; align-items:center; list-style:none; margin:0; padding:0; gap:2px; }
        .nav-menu li { position:relative; }
        .nav-link { display:flex; align-items:center; gap:5px; padding:8px 14px; color:#8B0000; text-decoration:none; font-size:0.9rem; font-weight:500; border-radius:8px; transition:all .2s; white-space:nowrap; }
        .nav-link:hover { background:#8B0000; color:#8B0000; }
        .nav-link.active { color:#8B0000; font-weight:600; }
        .nav-link.nav-btn { background:#8B0000; color:#fff; font-weight:600; border-radius:8px; padding:8px 18px; }
        .nav-link.nav-btn:hover { background:#8B0000; color:#fff; }
        .nav-dropdown-toggle { display:flex; align-items:center; gap:5px; padding:8px 14px; color:#8B0000; background:none; border:none; font-size:0.9rem; font-weight:500; cursor:pointer; border-radius:8px; transition:all .2s; font-family:inherit; }
        .nav-dropdown-toggle:hover { background:#8B0000; color:#8B0000; }
        .nav-dropdown-toggle i.fa-chevron-down { font-size:0.65rem; transition:transform .2s; }
        .nav-dropdown-menu { display:none; position:absolute; top:100%; left:0; min-width:200px; background:#fff; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.12); border:1px solid #8B0000; padding:6px; list-style:none; z-index:100; }
        .nav-dropdown-menu.active { display:block; }
        .nav-dropdown-menu .nav-link { padding:10px 14px; font-size:0.9rem; border-radius:8px; }
        .nav-dropdown-menu .nav-link i { width:18px; text-align:center; }
        .nav-dropdown-menu .nav-link:hover { background:#8B0000; color:#8B0000; }
        .nav-dropdown-divider { border:none; border-top:1px solid #8B0000; margin:4px 0; }
        .nav-user { display:flex; align-items:center; gap:4px; }
        .nav-user.hidden { display:none; }
        .btn-logout { display:flex; align-items:center; gap:5px; padding:8px 14px; color:#dc3545; background:none; border:none; font-size:0.9rem; cursor:pointer; border-radius:8px; transition:all .2s; font-family:inherit; }
        .btn-logout:hover { background:#fef2f2; }
        .nav-mobile-cta { display:none; }
        @media (max-width:900px) {
            .nav-toggle { display:block; }
            .nav-menu { display:none; position:absolute; top:60px; left:0; right:0; background:#fff; flex-direction:column; padding:12px 16px 16px; box-shadow:0 8px 24px rgba(0,0,0,0.1); border-top:1px solid #8B0000; gap:2px; }
            .nav-menu.active { display:flex; }
            .nav-link { padding:12px 16px; font-size:1rem; width:100%; }
            .nav-link.nav-btn { text-align:center; justify-content:center; margin-top:8px; }
            .nav-dropdown-menu { position:static; box-shadow:none; border:none; padding-left:16px; }
            .nav-dropdown-menu.active { display:block; }
            .nav-mobile-cta { display:block; margin-top:8px; }
            .nav-mobile-cta a { display:flex; align-items:center; justify-content:center; gap:8px; padding:14px; border-radius:10px; font-size:1rem; font-weight:600; text-decoration:none; }
            .nav-mobile-cta-marketplace { background:linear-gradient(135deg,#8B0000,#8B0000); color:#fff; }
            .nav-mobile-cta-marketplace:hover { opacity:0.9; }
        }

        /* === PRODUCT FICHA (large size) === */
        .pd-wrap { max-width:900px; margin:0 auto; padding:24px 21px 72px; }
        .pd-breadcrumb { display:flex; align-items:center; gap:9px; font-size:1rem; color:#8B0000; margin-bottom:21px; flex-wrap:wrap; }
        .pd-breadcrumb a { color:#8B0000; text-decoration:none; font-weight:500; }
        .pd-breadcrumb a:hover { text-decoration:underline; }
        .pd-breadcrumb .sep { color:#8B0000; font-size:0.9rem; }

        /* Main card */
        .pd-card { background:#fff; border-radius:20px; border:1px solid #8B0000; overflow:hidden; box-shadow:0 3px 12px rgba(0,0,0,0.06); }

        /* Image */
        .pd-img { position:relative; width:100%; height:320px; background:#8B0000; overflow:hidden; }
        .pd-img img { width:100%; height:100%; object-fit:cover; display:block; }
        .pd-img-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#8B0000; font-size:3rem; opacity:0.25; }

        /* Category badge */
        .pd-cat-badge { position:absolute; top:15px; left:15px; padding:6px 15px; border-radius:18px; font-size:1rem; font-weight:600; text-transform:uppercase; letter-spacing:0.3px; color:#fff; z-index:2; }
        .badge-general { background:rgba(99,102,241,.85); }
        .badge-vehiculos { background:rgba(239,68,68,.85); }
        .badge-inmuebles { background:rgba(245,158,11,.85); }
        .badge-electronica { background:rgba(14,165,233,.85); }
        .badge-servicios { background:rgba(168,85,247,.85); }
        .badge-ropa { background:rgba(236,72,153,.85); }
        .badge-hogar { background:rgba(0,110,227,.85); }

        /* Card body */
        .pd-body { padding:20px 24px 24px; }
        .pd-biz-name { display:flex; align-items:center; gap:6px; font-size:1.1rem; color:#8B0000; margin-bottom:6px; text-decoration:none; }
        .pd-biz-name:hover { color:#8B0000; }
        .pd-biz-name i { color:#8B0000; font-size:1rem; }
        .pd-title { font-size:1.65rem; font-weight:700; color:#0f172a; margin:0 0 6px; line-height:1.3; letter-spacing:-0.2px; }
        .pd-price { font-size:1.7rem; font-weight:800; color:#8B0000; margin:0 0 12px; }
        .pd-desc { font-size:1.2rem; color:#8B0000; line-height:1.6; margin:0 0 18px; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
        .pd-meta { display:flex; flex-wrap:wrap; gap:9px; margin-bottom:21px; }
        .pd-meta-chip { display:flex; align-items:center; gap:6px; padding:7px 14px; background:#8B0000; border-radius:10px; font-size:1rem; color:#8B0000; border:1px solid #8B0000; }
        .pd-meta-chip i { color:#8B0000; font-size:1rem; }
        .pd-actions { display:flex; gap:12px; flex-wrap:wrap; }
        .pd-btn { display:inline-flex; align-items:center; gap:9px; padding:14px 28px; border-radius:15px; font-size:1.2rem; font-weight:600; text-decoration:none; cursor:pointer; transition:all .25s; font-family:inherit; border:none; }
        .pd-btn-wa { background:linear-gradient(135deg,#25d366,#128c7e); color:#fff; box-shadow:0 3px 12px rgba(37,211,102,.3); }
        .pd-btn-wa:hover { box-shadow:0 6px 21px rgba(37,211,102,.45); transform:translateY(-2px); color:#fff; }
        .pd-btn-out { background:#fff; color:#8B0000; border:2px solid #8B0000; }
        .pd-btn-out:hover { border-color:#8B0000; color:#8B0000; background:#8B0000; }

        /* Business section */
        .pd-divider { border:none; border-top:1px solid #8B0000; margin:0; }
        .pd-biz-section { padding:16px 24px; }
        .pd-biz-section-label { font-size:1rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#8B0000; margin-bottom:12px; }
        .pd-biz-card { display:flex; align-items:center; gap:18px; padding:15px 18px; background:linear-gradient(135deg,#8B0000,#8B0000); border:2px solid #d1fae5; border-radius:18px; text-decoration:none; transition:all .25s; }
        .pd-biz-card:hover { border-color:#8B0000; box-shadow:0 5px 18px rgba(0,110,227,.1); }
        .pd-biz-icon { width:50px; height:50px; border-radius:13px; background:linear-gradient(135deg,#8B0000,#8B0000); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.2rem; flex-shrink:0; }
        .pd-biz-info { flex:1; min-width:0; }
        .pd-biz-name-card { font-size:1.25rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pd-biz-loc { font-size:1rem; color:#8B0000; }
        .pd-biz-arrow { color:#8B0000; font-size:1.05rem; flex-shrink:0; }

        /* === RELATED PRODUCTS (3-col compact grid) === */
        .pd-section-related { margin-top:27px; }
        .pd-section-title { font-size:1.3rem; font-weight:700; color:#0f172a; margin-bottom:15px; display:flex; align-items:center; gap:9px; }
        .pd-section-title i { color:#8B0000; font-size:1.17rem; }
        .rp-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .rp-card { background:#fff; border-radius:15px; border:1px solid #8B0000; overflow:hidden; text-decoration:none; color:inherit; transition:all .25s; }
        .rp-card:hover { border-color:#8B0000; box-shadow:0 5px 15px rgba(0,110,227,.1); transform:translateY(-3px); }
        .rp-card-img { position:relative; width:100%; padding-top:75%; background:#8B0000; overflow:hidden; }
        .rp-card-img img { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; }
        .rp-card-ph { position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#8B0000; font-size:1.65rem; opacity:0.25; }
        .rp-badge { position:absolute; top:8px; left:8px; width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:0.75rem; color:#fff; }
        .rp-card-body { padding:12px 14px 14px; }
        .rp-card-name { font-size:1rem; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
        .rp-card-price { font-size:1.1rem; font-weight:700; color:#8B0000; }

        .pd-video { width:100%; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
        .pd-video iframe { width:100%; aspect-ratio:16/9; display:block; }
        .pd-video iframe[data-tiktok] { aspect-ratio:9/16; max-width:320px; margin:0 auto; }

        /* === LIGHTBOX === */
        .pd-lightbox { display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);align-items:center;justify-content:center;flex-direction:column; }
        .pd-lightbox.active { display:flex; }
        .pd-lightbox img { max-width:92vw;max-height:82vh;object-fit:contain;border-radius:8px; }
        .pd-lightbox-close { position:absolute;top:16px;right:20px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;z-index:10001;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .2s; }
        .pd-lightbox-close:hover { background:rgba(255,255,255,0.15); }
        .pd-lightbox-nav { position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.12);border:none;color:#fff;font-size:1.5rem;cursor:pointer;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background .2s;z-index:10001; }
        .pd-lightbox-nav:hover { background:rgba(255,255,255,0.3); }
        .pd-lightbox-prev { left:16px; }
        .pd-lightbox-next { right:16px; }
        .pd-lightbox-counter { color:rgba(255,255,255,0.7);font-size:0.85rem;margin-top:12px; }

        /* === COMMENTS SECTION === */
        .pd-comments { padding:20px 24px 24px; }
        .pd-comments-title { font-size:1.15rem; font-weight:700; color:#0f172a; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
        .pd-comments-title i { color:#8B0000; }
        .pd-comment-form { display:flex; gap:10px; margin-bottom:20px; }
        .pd-comment-input { flex:1; padding:12px 16px; border:2px solid #8B0000; border-radius:12px; font-size:0.95rem; font-family:inherit; resize:none; outline:none; transition:border-color .2s; min-height:44px; max-height:120px; }
        .pd-comment-input:focus { border-color:#8B0000; }
        .pd-comment-input::placeholder { color:#8B0000; }
        .pd-comment-btn { padding:12px 20px; background:#8B0000; color:#fff; border:none; border-radius:12px; font-size:0.95rem; font-weight:600; cursor:pointer; transition:all .2s; font-family:inherit; white-space:nowrap; }
        .pd-comment-btn:hover { background:#8B0000; }
        .pd-comment-btn:disabled { background:#8B0000; cursor:not-allowed; }
        .pd-comment-login-msg { padding:16px; background:#8B0000; border:1px dashed #8B0000; border-radius:12px; text-align:center; color:#8B0000; font-size:0.95rem; margin-bottom:16px; }
        .pd-comment-login-msg a { color:#8B0000; font-weight:600; text-decoration:none; }
        .pd-comment-login-msg a:hover { text-decoration:underline; }
        .pd-comments-list { display:flex; flex-direction:column; gap:12px; }
        .pd-comment-item { display:flex; gap:12px; padding:14px; background:#8B0000; border-radius:14px; border:1px solid #8B0000; }
        .pd-comment-avatar { width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,#8B0000,#8B0000); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:0.85rem; flex-shrink:0; }
        .pd-comment-body { flex:1; min-width:0; }
        .pd-comment-header { display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap; }
        .pd-comment-name { font-weight:600; font-size:0.9rem; color:#0f172a; }
        .pd-comment-date { font-size:0.78rem; color:#8B0000; }
        .pd-comment-text { font-size:0.95rem; color:#334155; line-height:1.5; word-wrap:break-word; }
        .pd-comment-badge { display:inline-block; padding:2px 8px; background:#8B0000; color:#8B0000; font-size:0.7rem; font-weight:600; border-radius:6px; }
        .pd-comments-empty { text-align:center; padding:24px; color:#8B0000; font-size:0.95rem; }
        .pd-comments-loading { text-align:center; padding:20px; color:#8B0000; font-size:0.9rem; }
        @media (max-width:640px) {
            .pd-wrap { padding:15px 12px 54px; }
            .pd-body { padding:18px 18px 21px; }
            .pd-biz-section { padding:15px 18px; }
            .pd-comments { padding:16px 18px 20px; }
            .pd-title { font-size:1.5rem; }
            .pd-price { font-size:1.55rem; }
            .pd-img { height:270px; }
            .rp-grid { grid-template-columns:repeat(3,1fr); gap:11px; }
            .rp-card-body { padding:10px 12px 12px; }
            .rp-card-name { font-size:0.9rem; }
            .rp-card-price { font-size:1rem; }
            .pd-actions { flex-direction:column; }
            .pd-btn { justify-content:center; }
            .pd-breadcrumb { font-size:0.9rem; }
            .pd-biz-name { font-size:1rem; }
            .pd-desc { font-size:1.1rem; }
            .pd-meta-chip { font-size:0.9rem; padding:6px 12px; }
            .pd-section-title { font-size:1.15rem; }
            .pd-biz-name-card { font-size:1.15rem; }
            .pd-biz-loc { font-size:0.9rem; }
            .pd-cat-badge { font-size:0.9rem; padding:5px 12px; }
            .pd-comment-form { flex-direction:column; }
        }
    </style>
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TMH9V9QQ"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
    <nav class="navbar" id="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo"><img src="/images/favicon.jpeg" alt="En-Santiago" style="height:32px;width:auto;border-radius:6px;margin-right:4px;"> <span class="brand-name">En-Santiago</span></a>
            <button class="nav-toggle" id="navToggle" aria-label="Abrir men\u00fa">
                <i class="fas fa-bars"></i>
            </button>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/" class="nav-link active">Inicio</a></li>
                <li><a href="/marketplace.html" class="nav-link">Marketplace</a></li>
                <li><a href="/empleo.html" class="nav-link">Empleo</a></li>
                <li><a href="/entretenimiento.html" class="nav-link">Entretenimiento</a></li>
                <li><a href="/cupones.html" class="nav-link">Cupones</a></li>
                <li class="nav-dropdown">
                    <button class="nav-dropdown-toggle" aria-label="M\u00e1s opciones">
                        M\u00e1s <i class="fas fa-chevron-down"></i>
                    </button>
                    <ul class="nav-dropdown-menu" id="navbarDropdown">
                        <li><a href="/marketplace.html" class="nav-link"><i class="fas fa-shopping-bag"></i> Marketplace</a></li>
                        <li class="nav-dropdown-divider"></li>
                        <li><a href="/emergencia.html" class="nav-link" style="color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Emergencias</a></li>
                    </ul>
                </li>
                <li id="navLoginItem"><a href="/login.html" class="nav-link nav-btn">Login</a></li>
                <li id="navUserItem" class="nav-user hidden">
                    <a href="/dashboard.html" class="nav-link" id="navUserName">
                        <i class="fas fa-user-circle"></i> Mi Cuenta
                    </a>
                    <button class="nav-link btn-logout" id="navLogout">
                        <i class="fas fa-sign-out-alt"></i> Salir
                    </button>
                </li>
                <li class="nav-mobile-cta">
                    <a href="/marketplace.html" class="nav-mobile-cta-marketplace">
                        <i class="fas fa-shopping-bag"></i> Marketplace
                    </a>
                </li>
            </ul>
        </div>
    </nav>

    <div class="pd-wrap">
        <div class="pd-breadcrumb">
            ${breadcrumbHtml}
        </div>

        <div class="pd-card">
            <div class="pd-body" style="padding-top:24px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
                    ${product.business_logo ? `<img src="${esc(product.business_logo)}" alt="" style="width:32px;height:32px;border-radius:8px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">` : ''}
                    <div>
                        ${bizLink ? `<a href="${bizLink}" class="pd-biz-name" style="margin:0;display:block;"><i class="fas fa-store"></i> ${esc(product.business_name || 'Negocio')}${product.city ? ' · ' + esc(product.city) : ''}</a>` : (product.business_name ? `<div class="pd-biz-name" style="margin:0;display:block;"><i class="fas fa-store"></i> ${esc(product.business_name)}</div>` : '')}
                        ${product.created_at ? (() => { try { var _ds = String(product.created_at).trim(); if (_ds.includes('T')) {} else if (_ds.includes(' ')) { _ds = _ds.replace(' ', 'T'); } else { _ds = _ds + 'T00:00:00'; } const pd = new Date(_ds); const pds = pd.toLocaleDateString('es-VE', { year:'numeric', month:'long', day:'numeric' }); if (!pds.includes('NaN')) return `<div style="font-size:.8rem;color:#8B0000;margin-top:2px;"><i class="far fa-clock"></i> Publicado ${pds}</div>`; } catch(e){} return ''; })() : ''}
                    </div>
                </div>
                <h1 class="pd-title">${esc(title)}</h1>
                ${price ? `<div class="pd-price">${price}</div>` : ''}
            </div>

            <div class="pd-img" id="pdMainImgWrap" onclick="openLightbox(0)" style="cursor:pointer;">
                ${mainImage
                    ? `<img id="pdMainImg" src="${esc(mainImage)}" alt="${esc(title)}" onerror="this.parentElement.innerHTML='<div class=\\'pd-img-ph\\'><i class=\\'fas fa-image\\'></i></div>'">`
                    : `<div class="pd-img-ph"><i class="fas fa-image"></i></div>`}
                <span class="pd-cat-badge ${catBadge}"><i class="fas ${catIcon}"></i> ${catLabel}</span>
            </div>
            ${productImages.length > 1 ? `
            <div style="padding:12px 24px 0;display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;" id="pdThumbs">
                ${productImages.map((img, i) => `
                    <div onclick="event.stopPropagation();document.getElementById('pdMainImg').src='${esc(img).replace(/'/g, "\\'")}';document.querySelectorAll('#pdThumbs .pd-thumb').forEach(function(t){t.style.opacity='0.5';t.style.borderColor='#8B0000';});this.style.opacity='1';this.style.borderColor='#8B0000';window._pdActiveImg=${i};"
                         class="pd-thumb" style="flex-shrink:0;width:64px;height:64px;border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid ${i===0?'#8B0000':'#8B0000'};opacity:${i===0?'1':'0.5'};transition:all .2s;">
                        <img src="${esc(img)}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.display='none'">
                    </div>
                `).join('')}
            </div>` : ''}

            ${(() => {
                let videoHtml = '';
                let vids = [];
                try { const p = JSON.parse(product.video_url); if (Array.isArray(p)) vids = p; } catch(e) {}
                if (vids.length === 0 && product.video_url) vids = [product.video_url];
                if (vids.length > 0) {
                    videoHtml = '<div style="padding:20px 24px 0;">';
                    vids.forEach(v => { videoHtml += '<div class="pd-video" style="max-width:100%;margin-bottom:12px;">' + getVideoEmbed(v) + '</div>'; });
                    videoHtml += '</div>';
                }
                return videoHtml;
            })()}

            <div class="pd-body">
                <p class="pd-desc">${esc(product.description || 'Sin descripcion disponible.')}</p>
                <div class="pd-meta">
                    <div class="pd-meta-chip"><i class="fas fa-tag"></i> ${catLabel}</div>

                    ${waNumber ? `<div class="pd-meta-chip"><i class="fab fa-whatsapp"></i> WhatsApp</div>` : ''}
                </div>
                <div class="pd-actions">
                    ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" class="pd-btn pd-btn-wa"><i class="fab fa-whatsapp"></i> Contactar</a>` : ''}
                    <button class="pd-btn pd-btn-out" onclick="shareProduct()"><i class="fas fa-share-alt"></i> Compartir</button>
                </div>
            </div>

            ${product.business_name ? `
            <hr class="pd-divider">
            <div class="pd-biz-section">
                <div class="pd-biz-section-label"><i class="fas fa-store"></i> Negocio Asociado</div>
                ${bizLink ? `
                <a href="${bizLink}" class="pd-biz-card">
                    ${product.business_logo ? `<img src="${esc(product.business_logo)}" alt="" style="width:50px;height:50px;border-radius:13px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">` : `<div class="pd-biz-icon"><i class="fas fa-store"></i></div>`}
                    <div class="pd-biz-info">
                        <div class="pd-biz-name-card">${esc(product.business_name)}</div>
                        ${product.city ? `<div class="pd-biz-loc"><i class="fas fa-map-marker-alt" style="font-size:0.6rem;"></i> ${esc(product.city)}${product.state ? ', ' + esc(product.state) : ''}</div>` : ''}
                    </div>
                    <div class="pd-biz-arrow"><i class="fas fa-chevron-right"></i></div>
                </a>` : `
                <div class="pd-biz-card" style="cursor:default;">
                    ${product.business_logo ? `<img src="${esc(product.business_logo)}" alt="" style="width:50px;height:50px;border-radius:13px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">` : `<div class="pd-biz-icon"><i class="fas fa-store"></i></div>`}
                    <div class="pd-biz-info">
                        <div class="pd-biz-name-card">${esc(product.business_name)}</div>
                        ${product.city ? `<div class="pd-biz-loc"><i class="fas fa-map-marker-alt" style="font-size:0.6rem;"></i> ${esc(product.city)}${product.state ? ', ' + esc(product.state) : ''}</div>` : ''}
                    </div>
                </div>`}
            </div>` : ''}

            ${(() => { const instagram = product.business_instagram; const facebook = product.business_facebook; const twitter = product.business_twitter; const tiktok = product.business_tiktok; const youtube = product.business_youtube; const hasSocial = instagram || facebook || twitter || tiktok || youtube; const hasWeb = product.business_slug; if (!hasSocial && !hasWeb) return ''; return `
            <hr class="pd-divider">
            <div class="pd-biz-section">
                <div class="pd-biz-section-label" style="font-size:1rem;font-weight:700;color:#0f172a;text-transform:none;letter-spacing:0;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-share-nodes" style="color:#8B0000;"></i> Redes Sociales y Web
                </div>
                <div style="display:flex;gap:15px;flex-wrap:wrap;margin-top:12px;">
                    ${hasWeb ? `<a href="/web/${esc(product.business_slug)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:linear-gradient(135deg,#8B0000,#8B0000);color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fas fa-globe" style="font-size:1.5rem;"></i> Sitio Web</a>` : ''}
                    ${instagram ? `<a href="${esc(instagram)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:linear-gradient(135deg,#8B0000,#fd1d1d,#fcb045);color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-instagram" style="font-size:1.5rem;"></i> Instagram</a>` : ''}
                    ${facebook ? `<a href="${esc(facebook)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#8B0000;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-facebook-f" style="font-size:1.5rem;"></i> Facebook</a>` : ''}
                    ${twitter ? `<a href="${esc(twitter)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#000;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-x-twitter" style="font-size:1.5rem;"></i> X (Twitter)</a>` : ''}
                    ${tiktok ? `<a href="${esc(tiktok)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#010101;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-tiktok" style="font-size:1.5rem;"></i> TikTok</a>` : ''}
                    ${youtube ? `<a href="${esc(youtube)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#ff0000;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-youtube" style="font-size:1.5rem;"></i> YouTube</a>` : ''}
                </div>
            </div>`; })()}

            <hr class="pd-divider">
            <div class="pd-comments" id="pdCommentsSection">
                <div class="pd-comments-title"><i class="fas fa-comments"></i> Comentarios</div>
                <div class="pd-comment-form">
                    <input type="text" class="pd-comment-input" id="pdCommentInput" placeholder="Escribe tu comentario..." maxlength="1000">
                    <button class="pd-comment-btn" id="pdCommentBtn" onclick="submitProductComment()"><i class="fas fa-paper-plane"></i> Enviar</button>
                </div>
                <div class="pd-comments-list" id="pdCommentsList">
                    <div class="pd-comments-loading"><i class="fas fa-spinner fa-spin"></i> Cargando comentarios...</div>
                </div>
            </div>
        </div>

        ${relatedHtml}
    </div>

    <script>
    function shareProduct(){
        if(navigator.share){navigator.share({title:'${_escTitle}',text:'${_escDesc}',url:location.href}).catch(function(){});}
        else{window.open('https://wa.me/?text='+encodeURIComponent('${_escTitle} - En En-Santiago Marketplace')+'%20'+encodeURIComponent(location.href),'_blank');}
    }
    // Navbar dropdown toggle
    document.querySelectorAll('.nav-dropdown-toggle').forEach(function(btn){
        btn.addEventListener('click',function(e){
            e.stopPropagation();
            var menu=this.nextElementSibling;
            if(menu) menu.classList.toggle('active');
            this.classList.toggle('active');
        });
    });
    </script>
    <script src="/js/app.js"></script>
    <script>
    // === PRODUCT COMMENTS ===
    var pdProductId = ${product.id};
    var pdCommentInput = document.getElementById('pdCommentInput');
    var pdCommentBtn = document.getElementById('pdCommentBtn');
    var pdCommentsList = document.getElementById('pdCommentsList');

    function initCommentSection() {
        loadProductComments();
    }

    function loadProductComments() {
        fetch('/api/product-comments?product_id=' + pdProductId)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var list = pdCommentsList;
                list.innerHTML = '';
                if (!data.comments || data.comments.length === 0) {
                    list.innerHTML = '<div class="pd-comments-empty"><i class="far fa-comment-dots" style="font-size:1.5rem;opacity:0.4;display:block;margin-bottom:8px;"></i>Sin comentarios aun. Se el primero en opinar!</div>';
                    return;
                }
                data.comments.forEach(function(c) {
                    var isAnon = !c.user_name || c.user_name === 'Anonimo';
                    var initial = isAnon ? '?' : c.user_name.charAt(0).toUpperCase();
                    var displayName = isAnon ? 'Anonimo' : escapeHtml(c.user_name);
                    var timeAgo = getTimeAgo(c.created_at);
                    var avatarStyle = isAnon ? 'background:#8B0000;' : '';
                    var div = document.createElement('div');
                    div.className = 'pd-comment-item';
                    div.innerHTML = '<div class="pd-comment-avatar" style="' + avatarStyle + '">' + initial + '</div>' +
                        '<div class="pd-comment-body">' +
                            '<div class="pd-comment-header">' +
                                '<span class="pd-comment-name">' + displayName + '</span>' +
                                '<span class="pd-comment-badge">Comentario</span>' +
                                '<span class="pd-comment-date">' + timeAgo + '</span>' +
                            '</div>' +
                            '<div class="pd-comment-text">' + escapeHtml(c.content) + '</div>' +
                        '</div>';
                    list.appendChild(div);
                });
            })
            .catch(function() {
                pdCommentsList.innerHTML = '';
            });
    }

    function submitProductComment() {
        var content = pdCommentInput.value.trim();
        if (!content) return;

        pdCommentBtn.disabled = true;
        pdCommentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        var token = localStorage.getItem('meridaunclick_token') || localStorage.getItem('authToken');
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        fetch('/api/product-comments', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ product_id: pdProductId, content: content })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            pdCommentBtn.disabled = false;
            pdCommentBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar';
            if (data.comment) {
                pdCommentInput.value = '';
                loadProductComments();
            } else if (data.error) {
                alert(data.error);
            }
        })
        .catch(function() {
            pdCommentBtn.disabled = false;
            pdCommentBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar';
            alert('Error al enviar comentario');
        });
    }

    function getTimeAgo(dateStr) {
        if (!dateStr) return '';
        try {
            var now = new Date();
            var _ds2 = String(dateStr).trim(); if (_ds2.includes('T') || _ds2.includes('Z') || _ds2.includes('+')) {} else if (_ds2.includes(' ')) { _ds2 = _ds2.replace(' ', 'T'); } else { _ds2 = _ds2 + 'T00:00:00'; } var d = new Date(_ds2);
            if (isNaN(d.getTime())) return dateStr;
            var diff = Math.floor((now - d) / 1000);
            if (diff < 60) return 'Ahora mismo';
            if (diff < 3600) return Math.floor(diff/60) + ' min';
            if (diff < 86400) return Math.floor(diff/3600) + 'h';
            if (diff < 604800) return Math.floor(diff/86400) + 'd';
            return d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
        } catch(e) { return dateStr; }
    }

    function escapeHtml(s) {
        if (!s) return '';
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Enter key to submit
    if (pdCommentInput) {
        pdCommentInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitProductComment(); }
        });
    }

    initCommentSection();
    </script>
    <script>setTimeout(function(){fetch('/api/business-stats/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business_id:${product.business_id},event_type:'view',source:'product'})}).catch(function(){})},0);</script>

    <!-- Lightbox -->
    <div class="pd-lightbox" id="pdLightbox">
        <button class="pd-lightbox-close" onclick="closeLightbox()">&times;</button>
        <button class="pd-lightbox-nav pd-lightbox-prev" onclick="event.stopPropagation();navLightbox(-1)"><i class="fas fa-chevron-left"></i></button>
        <img id="pdLightboxImg" src="" alt="">
        <button class="pd-lightbox-nav pd-lightbox-next" onclick="event.stopPropagation();navLightbox(1)"><i class="fas fa-chevron-right"></i></button>
        <div class="pd-lightbox-counter" id="pdLightboxCounter"></div>
    </div>

    <footer class="footer">
        <div class="container">
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} En-Santiago. Todos los derechos reservados.</p>
                <p><a href="https://maps.app.goo.gl/Jz2QTADrNNneQtGd9" target="_blank" rel="noopener noreferrer">Página web desarrollada por Grupo 360 Soluciones</a></p>
                <p><a href="http://coporo.pages.dev/" target="_blank" rel="noopener noreferrer">Diseño de páginas webs - SEO Local -</a></p>
            </div>
        </div>
    </footer>

    <script>
    var _pdImages = ${JSON.stringify(productImages)};
    var _pdActiveImg = 0;

    function openLightbox(idx) {
        if (_pdImages.length === 0) return;
        _pdActiveImg = idx || 0;
        updateLightbox();
        document.getElementById('pdLightbox').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
        document.getElementById('pdLightbox').classList.remove('active');
        document.body.style.overflow = '';
    }
    function navLightbox(dir) {
        _pdActiveImg = (_pdActiveImg + dir + _pdImages.length) % _pdImages.length;
        updateLightbox();
    }
    function updateLightbox() {
        var lb = document.getElementById('pdLightbox');
        var img = document.getElementById('pdLightboxImg');
        var ctr = document.getElementById('pdLightboxCounter');
        if (_pdImages[_pdActiveImg]) {
            img.src = _pdImages[_pdActiveImg];
            img.style.display = '';
        } else {
            img.style.display = 'none';
        }
        ctr.textContent = (_pdActiveImg + 1) + ' / ' + _pdImages.length;
        lb.querySelector('.pd-lightbox-prev').style.display = _pdImages.length > 1 ? '' : 'none';
        lb.querySelector('.pd-lightbox-next').style.display = _pdImages.length > 1 ? '' : 'none';
    }
    document.getElementById('pdLightbox').addEventListener('click', function(e) {
        if (e.target === this) closeLightbox();
    });
    document.addEventListener('keydown', function(e) {
        if (!document.getElementById('pdLightbox').classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navLightbox(-1);
        if (e.key === 'ArrowRight') navLightbox(1);
    });
    </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Link': `<${canonicalUrl}>; rel="canonical"`,
      },
    });
}

