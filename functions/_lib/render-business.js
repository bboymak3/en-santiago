// functions/_lib/render-business.js
// Shared business page renderer — used by /negocio/[slug] and other section routes

/**
 * Escape a string for safe HTML attribute / text interpolation.
 */
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape a string for safe JS single-quoted string interpolation.
 */
export function escapeJs(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '');
}

/**
 * Normalize a social-media handle or partial URL into a full URL.
 */
export function normalizeSocialUrl(value, platform) {
  if (!value) return '';
  const v = value.trim();
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  let clean = v.replace(/^@/, '');
  clean = clean.replace(/^(facebook\.com\/?|www\.facebook\.com\/?|facebook\/)/i, '');
  clean = clean.replace(/^(instagram\.com\/?|www\.instagram\.com\/?|instagram\/)/i, '');
  clean = clean.replace(/^(x\.com\/?|twitter\.com\/?|www\.twitter\.com\/?|twitter\/)/i, '');
  clean = clean.replace(/^(tiktok\.com\/?|www\.tiktok\.com\/?|tiktok\/)/i, '');
  clean = clean.replace(/^(youtube\.com\/?|www\.youtube\.com\/?|youtube\/)/i, '');
  clean = clean.replace(/^@/, '');
  switch (platform) {
    case 'instagram': return `https://www.instagram.com/${clean}`;
    case 'facebook': return `https://www.facebook.com/${clean}`;
    case 'twitter': return `https://x.com/${clean}`;
    case 'tiktok': return `https://www.tiktok.com/@${clean}`;
    case 'youtube': return `https://www.youtube.com/@${clean}`;
    default: return v;
  }
}

/**
 * Return an <iframe> or <video> embed string for a given video URL.
 */
export function getVideoEmbed(url) {
  if (!url) return '';
  // YouTube: youtube.com/watch?v=XXX or youtu.be/XXX
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
  // YouTube Shorts: youtube.com/shorts/XXX
  const ytShortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (ytShortsMatch) return `<iframe src="https://www.youtube.com/embed/${ytShortsMatch[1]}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
  // TikTok: tiktok.com/@user/video/XXX
  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (ttMatch) return `<iframe src="https://www.tiktok.com/embed/v2/${ttMatch[1]}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
  // Direct video files (R2 uploads): .mp4, .webm, .ogg, .mov
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return `<video src="${escapeHtml(url)}" controls playsinline preload="metadata" style="width:100%;border-radius:12px;background:#000;"></video>`;
  }
  // Other URLs: use as-is iframe
  return `<iframe src="${escapeHtml(url)}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
}

/**
 * Render the full business detail page HTML and return a Response.
 *
 * @param {object}  env           – Cloudflare env (kept for API consistency / future use)
 * @param {object}  business      – Row from the businesses table
 * @param {object}  options
 * @param {string}  [options.pathPrefix]       – e.g. '/servicio/medicina-servicio-medico'
 * @param {string}  [options.canonicalUrl]      – Full canonical URL (overrides pathPrefix-based)
 * @param {string}  [options.sectionLabel]      – Breadcrumb label for the section
 * @param {{name:string,url:string}} [options.categoryBreadcrumb] – Override category breadcrumb
 * @param {{name:string,url:string}} [options.tipoBreadcrumb] – Breadcrumb for business type
 * @param {string}  [options.tipoLabel]         – Display label for business type
 * @returns {Response}
 */
export function renderBusinessPage(env, business, options = {}) {
  const {
    pathPrefix = null,
    canonicalUrl = null,
    categoryBreadcrumb = null,
    sectionLabel = null,
    tipoBreadcrumb = null,
    tipoLabel = null,
    reviews = [],
    avgRating = 0,
    reviewCount = 0,
  } = options;

  const baseUrl = 'https://en-santiago.pages.dev';
  const title = business.title || 'Negocio';
  // Use custom SEO description if provided, otherwise auto-generate
  const description = business.seo_description
    ? business.seo_description.substring(0, 160)
    : business.description
      ? business.description.substring(0, 160)
      : `Información sobre ${title} en ${business.city || 'Santiago de Chile'}. Dirección, contacto, servicios y más.`;
  const imageUrl = business.cover_image || `${baseUrl}/images/En Santiago.png`;
  const finalCanonical = canonicalUrl || `${baseUrl}${pathPrefix || '/negocio'}/${business.slug}`;

  // Breadcrumb helpers
  const sectionBreadcrumbText = sectionLabel || 'Negocios';
  const categoryLinkHtml = categoryBreadcrumb
    ? `<a href="${escapeHtml(categoryBreadcrumb.url)}">${escapeHtml(categoryBreadcrumb.name)}</a>`
    : (business.category_name
        ? `<a href="/categoria/${encodeURIComponent((business.category_name || '').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, '-').replace(/^-|-$/g, ''))}">${escapeHtml(business.category_name)}</a>`
        : '');

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
    <meta name="description" content="${escapeHtml(description)}">
    <title>${escapeHtml(title)} - En Santiago | Directorio de Negocios en Santiago de Chile</title>
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${finalCanonical}">

    <!-- Open Graph -->
    <meta property="og:type" content="business.business">
    <meta property="og:title" content="${escapeHtml(title)} - En Santiago">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${finalCanonical}">
    <meta property="og:site_name" content="En Santiago">
    <meta property="og:locale" content="es_CL">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)} - En Santiago">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${imageUrl}">

    <!-- Location -->
    <meta property="business:contact_data:street_address" content="${escapeHtml(business.address || '')}">
    <meta property="business:contact_data:locality" content="${escapeHtml(business.city || '')}">
    <meta property="business:contact_data:region" content="${escapeHtml(business.state || '')}">
    <meta property="business:contact_data:country_name" content="${escapeHtml(business.country || 'Santiago de Chile')}">

    <!-- JSON-LD: Rich Snippets -->
    ${business.custom_jsonld
      ? '<script type="application/ld+json">' + business.custom_jsonld + '</script>'
      : '<script type="application/ld+json">' + JSON.stringify((() => {
      const isMedical = business.category_name && (business.category_name.toLowerCase().includes('médic') || business.category_name.toLowerCase().includes('medic'));
      const ld = {
        "@context": "https://schema.org",
        "@type": isMedical ? "MedicalBusiness" : "LocalBusiness",
        "name": title,
        "url": finalCanonical,
        "image": imageUrl,
        "description": description
      };
      if (business.category_name) ld.category = business.category_name;
      if (business.especialidad) ld.medicalSpecialty = business.especialidad;
      const phoneClean = (business.phone || '').replace(/[^0-9]/g, '');
      const waClean = (business.whatsapp || business.phone || '').replace(/[^0-9]/g, '');
      if (waClean) ld.telephone = '+' + waClean;
      if (business.address) {
        ld.address = {
          "@type": "PostalAddress",
          "streetAddress": business.address,
          "addressLocality": business.city || undefined,
          "addressRegion": business.state || undefined,
          "addressCountry": "CL"
        };
      }
      if (business.lat || business.latitude) {
        ld.geo = {
          "@type": "GeoCoordinates",
          "latitude": Number(business.lat || business.latitude),
          "longitude": Number(business.lng || business.longitude)
        };
      }
      if (business.logo) ld.logo = business.logo;
      const sameAs = [];
      if (business.instagram) sameAs.push(normalizeSocialUrl(business.instagram, 'instagram'));
      if (business.facebook) sameAs.push(normalizeSocialUrl(business.facebook, 'facebook'));
      if (business.twitter) sameAs.push(normalizeSocialUrl(business.twitter, 'twitter'));
      if (business.tiktok) sameAs.push(normalizeSocialUrl(business.tiktok, 'tiktok'));
      if (business.youtube) sameAs.push(normalizeSocialUrl(business.youtube, 'youtube'));
      if (business.website) sameAs.push(business.website);
      if (sameAs.length) ld.sameAs = sameAs;
      if (business.schedule) ld.openingHours = business.schedule;
      // AggregateRating + Reviews for rich snippets
      if (reviewCount > 0) {
        ld.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": Math.round(avgRating * 10) / 10,
          "bestRating": 5,
          "worstRating": 1,
          "reviewCount": reviewCount
        };
        const reviewItems = reviews.filter(r => r.comment).slice(0, 5).map(r => ({
          "@type": "Review",
          "author": { "@type": "Person", "name": r.name || 'Anónimo' },
          "reviewRating": { "@type": "Rating", "ratingValue": r.rating, "bestRating": 5 },
          "reviewBody": r.comment
        }));
        if (reviewItems.length > 0) ld.review = reviewItems;
      }
      return ld;
    })()) + '</script>'
    }
    <script type="application/ld+json">${(() => {
      const crumbs = [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://en-santiago.pages.dev/" },
        { "@type": "ListItem", "position": 2, "name": sectionBreadcrumbText, "item": "https://en-santiago.pages.dev/search.html" }
      ];
      if (categoryBreadcrumb) {
        crumbs.push({ "@type": "ListItem", "position": 3, "name": categoryBreadcrumb.name, "item": categoryBreadcrumb.url.startsWith('http') ? categoryBreadcrumb.url : "https://en-santiago.pages.dev" + categoryBreadcrumb.url });
      } else if (business.category_name) {
        const catSlug = (business.category_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        crumbs.push({ "@type": "ListItem", "position": 3, "name": business.category_name, "item": "https://en-santiago.pages.dev/categoria/" + catSlug });
      }
      crumbs.push({ "@type": "ListItem", "position": crumbs.length + 1, "name": title, "item": finalCanonical });
      return JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs });
    })()}</script>

    <link rel="stylesheet" href="/css/styles.css?v=4">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/jpeg" href="/images/favicon.jpeg">
    <style>
/* === Business Ficha - 30% Larger === */
.business-detail-page .compact-info-card {
    padding: 22px;
}
.business-detail-page .compact-title {
    font-size: 1.95rem;
    line-height: 1.35;
}
.business-detail-page .compact-address {
    font-size: 1.14rem;
    margin-bottom: 12px;
}
.business-detail-page .compact-address i {
    font-size: 1rem;
}
.business-detail-page .feature-chips {
    gap: 10px;
    margin-bottom: 14px;
}
.business-detail-page .feature-chip {
    padding: 8px 15px;
    font-size: 0.95rem;
    gap: 7px;
}
.business-detail-page .feature-chip i {
    font-size: 1rem;
}
.business-detail-page .compact-description {
    font-size: 1.05rem;
    line-height: 1.75;
}
.business-detail-page .compact-description.collapsed {
    max-height: 104px;
}
.business-detail-page .compact-description.collapsed::after {
    height: 52px;
}
.business-detail-page .compact-top-row {
    margin-bottom: 8px;
}
.business-detail-page .btn-favorite {
    width: 40px;
    height: 40px;
    font-size: 1.15rem;
}
.business-detail-page .compact-price {
    font-size: 2.4rem;
}
.business-detail-page .description-toggle {
    font-size: 1rem;
}
.business-detail-page .business-section-title {
    font-size: 1.3rem;
}

/* Top spacing for ficha */
.business-detail-page .business-content {
    padding-top: 10px;
}

/* === Compact Business Cards (for similar businesses) === */
/* Hide action buttons in similar section */
.business-detail-page #similarGrid .business-card-fav,
.business-detail-page #similarGrid .btn-share-wa-card {
    display: none !important;
}
.business-detail-page .business-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
}
.business-detail-page .business-card {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: transform 0.2s, box-shadow 0.2s;
}
.business-detail-page .business-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.business-detail-page .business-card-image {
    height: 110px;
    overflow: hidden;
    position: relative;
    background: #f3f4f6;
}
.business-detail-page .business-card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.business-detail-page .business-card-badges {
    position: absolute;
    top: 5px;
    left: 5px;
    display: flex;
    gap: 3px;
    z-index: 2;
}
.business-detail-page .business-card-badges .card-badge {
    font-size: 0.52rem;
    padding: 2px 6px;
    border-radius: 5px;
    font-weight: 600;
}
.business-detail-page .business-card-body {
    padding: 8px 8px 10px;
    text-align: center;
}
.business-detail-page .business-card-title {
    font-size: 0.72rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 3px;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.business-detail-page .business-card-location {
    font-size: 0.6rem;
    color: #94a3b8;
    margin: 0 auto 2px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
}
.business-detail-page .business-card-location i { font-size: 0.52rem; }
.business-detail-page .business-card-desc {
    font-size: 0.6rem;
    color: #b0b8c4;
    line-height: 1.35;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-align: center;
}
.business-detail-page .business-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
}

/* === Compact Product Cards (for business products) === */
.products-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}
.product-card {
    background: #fff;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: transform 0.2s, box-shadow 0.2s;
    text-decoration: none;
    color: inherit;
}
.product-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
    border-color: #006EE3;
}
.product-card img {
    width: 100%;
    height: 120px;
    object-fit: cover;
}
.product-card-body {
    padding: 8px 10px 10px;
}
.product-card-name {
    font-weight: 600;
    font-size: 0.75rem;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #1e293b;
}
.product-card-price {
    color: #006EE3;
    font-weight: 700;
    font-size: 0.82rem;
}

/* Section styling */
.business-detail-page .section {
    margin-top: 24px;
}
.business-detail-page .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
}
.business-detail-page .section-title {
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
}

/* Compact gallery */
.business-detail-page .gallery-main {
    aspect-ratio: 16/9;
    max-height: 300px;
}

@media (max-width: 640px) {
    .business-detail-page .business-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
    .business-detail-page .business-card-image {
        height: 85px;
    }
    .business-detail-page .business-card-body {
        padding: 6px 5px 8px;
    }
    .products-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
    .product-card img {
        height: 100px;
    }
}
.jobs-list .job-item {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 14px;
}
.job-item-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: #eff6ff;
    color: #1a73e8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
}
.job-item-info {
    flex: 1;
    min-width: 0;
}
.job-item-title {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 2px;
}
.job-item-meta {
    font-size: 0.8rem;
    color: #6b7280;
}
.services-list .service-item {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 12px;
    border-left: 4px solid #f59e0b;
}
.service-item h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: #1f2937;
}
.service-item p {
    font-size: 0.88rem;
    color: #6b7280;
    line-height: 1.5;
    margin: 0;
}
.section-link {
    font-size: 0.85rem;
    color: #1a73e8;
    text-decoration: none;
    font-weight: 600;
}
.section-link:hover {
    text-decoration: underline;
}
</style>
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TMH9V9QQ"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
    <!-- Navigation -->
    <nav class="navbar" id="navbar">
        <div class="nav-container">
            <a href="/index.html" class="nav-logo">
                <img src="/images/favicon.jpeg" alt="En Santiago" style="height:32px;width:auto;border-radius:6px;margin-right:4px;">
                <span class="brand-name"><span id="brandCity"></span> En Santiago</span>
            </a>
            <div class="location-selector" id="locationSelector">
                <button class="location-btn" id="locationBtn" aria-label="Seleccionar ubicación">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="location-label" id="locationLabel">Todo Santiago de Chile</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="location-dropdown hidden" id="locationDropdown">
                    <div class="location-search">
                        <input type="text" id="locationSearchInput" placeholder="Buscar comuna..." autocomplete="off">
                    </div>
                    <div class="location-option" data-state="" data-city="">
                        <i class="fas fa-globe-americas"></i>
                        <span>Todo Santiago de Chile</span>
                    </div>
                    <div class="location-divider"></div>
                    <div class="location-list" id="locationList"></div>
                </div>
            </div>
            <button class="nav-toggle" id="navToggle" aria-label="Abrir menú">
                <i class="fas fa-bars"></i>
            </button>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/index.html" class="nav-link">Inicio</a></li>
                <li><a href="/search.html" class="nav-link">Negocios</a></li>
                <li><a href="/map.html" class="nav-link">Mapa</a></li>
                <li><a href="/entretenimiento.html" class="nav-link">Entretenimiento</a></li>
                <li><a href="/empleo.html" class="nav-link">Empleo</a></li>
                <li class="nav-dropdown">
                    <button class="nav-dropdown-toggle" aria-label="Más opciones">Más <i class="fas fa-chevron-down"></i></button>
                    <ul class="nav-dropdown-menu">
                        <li><a href="/marketplace.html" class="nav-link"><i class="fas fa-shopping-bag"></i> Marketplace</a></li>
                        <li class="nav-dropdown-divider"></li>
                        <li><a href="/emergencia.html" class="nav-link" style="color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Emergencias</a></li>
                    </ul>
                </li>
                <li id="navLoginItem"><a href="/login.html" class="nav-link nav-btn">Login</a></li>
                <li id="navUserItem" class="nav-user hidden">
                    <a href="/dashboard.html" class="nav-link" id="navUserName"><i class="fas fa-user-circle"></i> Mi Cuenta</a>
                    <button class="nav-link btn-logout" id="navLogout"><i class="fas fa-sign-out-alt"></i> Salir</button>
                </li>
                <li class="nav-mobile-cta">
                    <a href="/marketplace.html" class="nav-mobile-cta-marketplace"><i class="fas fa-shopping-bag"></i> Marketplace</a>
                </li>
            </ul>
        </div>
    </nav>

    <!-- Business Detail -->
    <main class="business-detail-page">
        <div class="container">
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a href="/index.html"><i class="fas fa-home"></i> Inicio</a>
                <a href="/search.html">${escapeHtml(sectionBreadcrumbText)}</a>
                ${categoryLinkHtml}
                <span id="breadcrumbTitle">${escapeHtml(title)}</span>
            </nav>

            <div class="loading-spinner" id="businessLoading">
                <i class="fas fa-spinner fa-spin fa-3x"></i>
                <p>Cargando negocio...</p>
            </div>

            <div class="error-state hidden" id="businessError">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <h2>Negocio no encontrado</h2>
                <p>El negocio que buscas no existe o ha sido eliminado.</p>
                <a href="/search.html" class="btn btn-primary">Explorar Negocios</a>
            </div>

            <div class="business-content hidden" id="businessContent">
                <!-- Banner de Portada (tipo Facebook) -->
                <div id="businessBannerWrap" style="display:none;margin:-22px -22px 0;border-radius:16px 16px 0 0;overflow:hidden;position:relative;max-height:420px;min-height:220px;background:linear-gradient(135deg,#1e3a5f,#2563eb,#7c3aed);">
                    <img id="businessBanner" src="" alt="Portada" style="width:100%;height:100%;object-fit:cover;display:block;">
                </div>

                <!-- Logo (se superpone sobre el banner si existe) -->
                <div id="businessLogoWrap" style="display:none;text-align:center;padding:24px 0 8px;${business.banner ? 'margin-top:-60px;position:relative;z-index:2;' : 'margin-bottom:24px;'}">
                    <img id="businessLogo" src="" alt="Logo" style="max-height:200px;max-width:420px;object-fit:contain;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,0.10);${business.banner ? 'border:4px solid #fff;' : ''}">
                </div>

                <div class="compact-info-card">
                    <div class="compact-top-row">
                        <div class="compact-price-row"><span id="propDetailBadges"></span></div>
                        <button class="btn-favorite" id="btnFavorite" aria-label="Agregar a favoritos" data-business-id=""><i class="far fa-heart"></i></button>
                    </div>
                    <h1 class="compact-title" id="propDetailTitle">${escapeHtml(title)}</h1>
                    <div class="compact-price" id="propDetailPrice" style="display:none;">--</div>
                    <div class="compact-address" id="propDetailLocation">
                        <i class="fas fa-map-marker-alt"></i> <span>${escapeHtml(business.city || '')}${business.state ? ', ' + escapeHtml(business.state) : ''}</span>
                    </div>
                    <div class="feature-chips">
                        <div class="feature-chip" id="statStateCityWrap" title="Comuna / Ciudad"><i class="fas fa-map-marker-alt"></i> <span id="statStateCity">${escapeHtml((business.city || '') + (business.state ? ', ' + business.state : ''))}</span></div>
                        <div class="feature-chip" id="statCategoriaWrap" title="Categoría"><i class="fas fa-tag"></i> <span id="statCategoria">${escapeHtml(business.category_name || '--')}</span></div>
                        ${reviewCount > 0 ? `<div class="feature-chip" style="background:linear-gradient(135deg,#fff8e1,#fff3cd);color:#f57f17;border:1px solid #ffd54f;" title="Calificación"><i class="fas fa-star" style="color:#ffc107;"></i> <span>${Math.round(avgRating * 10) / 10} (${reviewCount} reseña${reviewCount !== 1 ? 's' : ''})</span></div>` : ''}
                        ${business.especialidad ? `<div class="feature-chip" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;" title="Especialidad"><i class="fas fa-stethoscope"></i> <span>${escapeHtml(business.especialidad)}</span></div>` : ''}
                        <div class="feature-chip" id="statScheduleWrap" style="display:none;" title="Horario"><i class="fas fa-clock"></i> <span id="statSchedule">--</span></div>
                        <div class="feature-chip" id="statPhoneWrap" style="display:none;" title="Teléfono"><i class="fas fa-phone"></i> <span id="statPhone">--</span></div>
                        <div class="feature-chip" id="statWhatsAppWrap" style="display:none;" title="WhatsApp"><i class="fab fa-whatsapp"></i> <span id="statWhatsApp">WhatsApp</span></div>
                        <div class="feature-chip" id="statFeatureParking" style="display:none;" title="Estacionamiento"><i class="fas fa-parking"></i> <span>Estacionamiento</span></div>
                        <div class="feature-chip" id="statFeatureWifi" style="display:none;" title="WiFi"><i class="fas fa-wifi"></i> <span>WiFi</span></div>
                        <div class="feature-chip" id="statFeatureCards" style="display:none;" title="Acepta tarjetas"><i class="fas fa-credit-card"></i> <span>Tarjetas</span></div>
                        <div class="feature-chip" id="statFeatureDelivery" style="display:none;" title="Delivery"><i class="fas fa-motorcycle"></i> <span>Delivery</span></div>
                        <div class="feature-chip" id="statFeatureOutdoor" style="display:none;" title="Área al aire libre"><i class="fas fa-umbrella-beach"></i> <span>Exterior</span></div>
                    </div>
                    <div class="compact-description collapsed" id="propDescription">
                        <p>${escapeHtml(business.description || 'Sin descripción disponible.')}</p>
                    </div>
                    <button class="description-toggle" id="descriptionToggle" style="display:none;">Leer más <i class="fas fa-chevron-down"></i></button>
                </div>

                <div class="business-gallery" id="businessGallery">
                    <div class="gallery-main">
                        <img id="mainImage" src="" alt="" class="gallery-main-img" style="cursor:zoom-in;" onclick="document.getElementById('lightbox').classList.remove('hidden')">
                        <button class="gallery-nav gallery-prev" id="galleryPrev" aria-label="Anterior"><i class="fas fa-chevron-left"></i></button>
                        <button class="gallery-nav gallery-next" id="galleryNext" aria-label="Siguiente"><i class="fas fa-chevron-right"></i></button>
                        <div class="gallery-counter"><span id="galleryCurrent">1</span> / <span id="galleryTotal">1</span></div>
                        <button class="gallery-fullscreen" id="galleryFullscreen" aria-label="Pantalla completa"><i class="fas fa-expand"></i></button>
                        <div class="gallery-badges" id="galleryBadges"></div>
                    </div>
                    <div class="gallery-thumbnails" id="galleryThumbnails"></div>
                </div>

                <div class="business-section hidden" id="featuresSection">
                    <h2 class="business-section-title">Características</h2>
                    <div class="features-list" id="featuresList"></div>
                </div>

                <div class="business-section map-section-wrapper hidden" id="mapSection">
                    <h2 class="business-section-title">Ubicación</h2>
                    <div class="business-map" id="businessMap"></div>
                    <button class="open-map-modal-btn" id="openMapModalBtn"><i class="fas fa-expand"></i> Ver en Mapa Completo</button>
                </div>

                <div class="business-section contact-section">
                    <h2 class="business-section-title">Contactar al Negocio</h2>
                    <div class="contact-actions" id="contactActions">
                        <a href="#" class="btn btn-whatsapp btn-full btn-lg" id="mainWhatsApp" style="display:none;" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Contactar por WhatsApp</a>
                        <a href="#" class="btn btn-full btn-lg" id="emailContactBtn" style="display:none;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;font-weight:600;border-radius:12px;text-align:center;text-decoration:none;padding:14px 24px;font-size:1rem;"><i class="fas fa-envelope"></i> Contactar por Email</a>
                        ${business.google_maps_url ? `<a href="${business.google_maps_url}" target="_blank" rel="noopener" class="btn btn-full btn-lg" style="display:block;margin-top:8px;background:linear-gradient(135deg,#4285F4,#34A853,#FBBC04,#EA4335);color:#fff;font-weight:700;border-radius:12px;text-align:center;text-decoration:none;padding:14px 24px;font-size:1rem;"><i class="fab fa-google"></i> Ver Perfil de Google</a>` : ''}
                        <button class="btn btn-primary btn-full btn-lg" id="openChatBtn" style="margin-top:8px;"><i class="fas fa-comment-dots"></i> Enviar Mensaje</button>
                        <button class="btn btn-full btn-lg" id="shareWhatsAppBtn" style="display:none;margin-top:8px;background:#fff;color:#111;border:2px solid #111;font-weight:600;border-radius:12px;text-align:center;padding:14px 24px;font-size:1rem;cursor:pointer;"><i class="fab fa-whatsapp" style="color:#25d366;"></i> Compartir por WhatsApp</button>
                    </div>
                </div>

                ${(() => { const instagram = normalizeSocialUrl(business.instagram, 'instagram'); const facebook = normalizeSocialUrl(business.facebook, 'facebook'); const twitter = normalizeSocialUrl(business.twitter, 'twitter'); const tiktok = normalizeSocialUrl(business.tiktok, 'tiktok'); const youtube = normalizeSocialUrl(business.youtube, 'youtube'); const hasSocial = instagram || facebook || twitter || tiktok || youtube; if (!hasSocial && !business.slug) return ''; return `
                <div class="pd-social-section" style="padding:20px 24px;">
                  <div style="font-size:1.1rem;font-weight:700;color:#0f172a;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-share-nodes" style="color:#006EE3;"></i> Redes Sociales y Web
                  </div>
                  <div style="display:flex;gap:15px;flex-wrap:wrap;">
                    ${business.slug ? `<a href="/web/${escapeHtml(business.slug)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:linear-gradient(135deg,#006EE3,#0ea5e9);color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fas fa-globe" style="font-size:1.5rem;"></i> Sitio Web</a>` : ''}
                    ${instagram ? `<a href="${escapeHtml(instagram)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-instagram" style="font-size:1.5rem;"></i> Instagram</a>` : ''}
                    ${facebook ? `<a href="${escapeHtml(facebook)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#1877f2;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-facebook-f" style="font-size:1.5rem;"></i> Facebook</a>` : ''}
                    ${twitter ? `<a href="${escapeHtml(twitter)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#000;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-x-twitter" style="font-size:1.5rem;"></i> X (Twitter)</a>` : ''}
                    ${tiktok ? `<a href="${escapeHtml(tiktok)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#010101;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-tiktok" style="font-size:1.5rem;"></i> TikTok</a>` : ''}
                    ${youtube ? `<a href="${escapeHtml(youtube)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#ff0000;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-youtube" style="font-size:1.5rem;"></i> YouTube</a>` : ''}
                  </div>
                </div>`; })()}

                ${(() => {
                    const raw = business.video_url;
                    if (!raw) return '';
                    let urls = [];
                    if (raw.startsWith('[')) { try { urls = JSON.parse(raw); } catch(e) { urls = [raw]; } }
                    else { urls = [raw]; }
                    urls = urls.filter(u => u);
                    if (!urls.length) return '';
                    return `
                <div style="padding:16px 20px;">
                  <div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                    <i class="fas fa-play-circle" style="color:#006EE3;"></i> Video${urls.length > 1 ? 's' : ''} (${urls.length})
                  </div>
                  <div style="display:${urls.length > 1 ? 'grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;' : 'block;max-width:320px;margin:0 auto;'}border-radius:16px;overflow:hidden;">
                    ${urls.map(u => '<div style="border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">' + getVideoEmbed(u) + '</div>').join('')}
                  </div>
                </div>`;
                })()}

                <section class="business-section" id="productsSection" style="display:none;">
                    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h2 class="business-section-title"><i class="fas fa-boxes-stacked" style="color:#006EE3;"></i> Productos</h2>
                        <a href="/marketplace.html" class="section-link" id="viewAllProducts">Ver más <i class="fas fa-arrow-right"></i></a>
                    </div>
                    <div class="products-grid" id="businessProductsGrid"></div>
                </section>

                <section class="business-section" id="jobsSection" style="display:none;">
                    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h2 class="business-section-title"><i class="fas fa-briefcase" style="color:#1a73e8;"></i> Empleo</h2>
                        <a href="/empleo.html" class="section-link" id="viewAllJobs" style="display:none;">Ver más <i class="fas fa-arrow-right"></i></a>
                    </div>
                    <div class="jobs-list" id="businessJobsList"></div>
                    <div id="businessJobsEmpty" style="display:none;text-align:center;padding:24px 16px;">
                        <a href="/empleo.html" class="btn btn-secondary" style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;font-size:0.92rem;border-radius:10px;text-decoration:none;width:100%;max-width:400px;justify-content:center;"><i class="fas fa-briefcase"></i> Ir a ofertas de empleo</a>
                    </div>
                </section>

                <section class="business-section" id="servicesSection" style="display:none;">
                    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h2 class="business-section-title"><i class="fas fa-concierge-bell" style="color:#f59e0b;"></i> Servicios</h2>
                    </div>
                    <div class="services-list" id="businessServicesList"></div>
                </section>
            </div>

            <section class="section hidden" id="similarSection" style="margin-top:28px;">
                <div class="section-header">
                    <h2 class="section-title" style="display:flex;align-items:center;gap:8px;"><i class="fas fa-store" style="color:#006EE3;font-size:0.9rem;"></i> Negocios Similares</h2>
                    <a href="/search.html" class="section-link" style="font-size:0.8rem;">Ver más <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="business-grid" id="similarGrid"></div>
            </section>
        </div>
    </main>

    <div class="lightbox hidden" id="lightbox">
        <button class="lightbox-close" id="lightboxClose">&times;</button>
        <button class="lightbox-nav lightbox-prev" id="lightboxPrev"><i class="fas fa-chevron-left"></i></button>
        <img id="lightboxImage" src="" alt="" class="lightbox-img">
        <button class="lightbox-nav lightbox-next" id="lightboxNext"><i class="fas fa-chevron-right"></i></button>
        <div class="lightbox-counter" id="lightboxCounter"></div>
    </div>

    <div class="map-modal" id="mapModal">
        <div class="map-modal-header">
            <h3><i class="fas fa-map-marker-alt"></i> Ubicación del Negocio</h3>
            <button class="map-modal-close" id="mapModalClose" aria-label="Cerrar mapa"><i class="fas fa-times"></i></button>
        </div>
        <div class="map-modal-body"><div id="mapModalMap"></div></div>
    </div>

    <div class="toast-container" id="toastContainer"></div>
    <footer class="footer">
        <div class="container">
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} En Santiago. Todos los derechos reservados.</p>
                <p><a href="https://maps.app.goo.gl/Jz2QTADrNNneQtGd9" target="_blank" rel="noopener noreferrer">Página web desarrollada por Grupo 360 Soluciones</a></p>
                <p><a href="http://coporo.pages.dev/" target="_blank" rel="noopener noreferrer">Diseño de páginas webs - SEO Local -</a></p>
            </div>
        </div>
    </footer>
    <script src="/js/app.js?v=7"></script>
    <script>window.__BUSINESS_ID = ${business.id}; window.__BUSINESS_SLUG = '${escapeJs(business.slug)}';</script>
    <script src="/js/business-detail.js?v=9"></script>
    <script src="/js/chat.js?v=3"></script>
    <script src="/js/review-widget.js?v=3"></script>
    <script src="/js/ai-chatbot.js?v=3"></script>
    <script>setTimeout(function(){fetch('/api/business-stats/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business_id:${business.id},event_type:'view',source:'ficha'})}).catch(function(){})},0);</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Link': `<${finalCanonical}>; rel="canonical"`,
    },
  });
}