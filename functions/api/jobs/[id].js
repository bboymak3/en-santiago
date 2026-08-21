// functions/api/jobs/[id].js
// GET: single job (HTML for browsers, JSON for API)
// PATCH: approve/reject job | DELETE: delete job

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
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

async function requireAuth(request, env) {
  const jwtSecret = env.JWT_SECRET || 'aunclick_jwt_secret_2024_secure';
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyJWT(token, jwtSecret);
}

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function embedVideo(url) {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen loading="lazy"></iframe>`;
  if (url.match(/\.(mp4|webm|ogg)$/i)) return `<video src="${url}" controls preload="metadata"></video>`;
  return `<iframe src="${url}" frameborder="0" allowfullscreen loading="lazy"></iframe>`;
}

function renderJobHTML(job) {
  const typeLabels = { 'tiempo_completo':'Tiempo Completo', 'medio_tiempo':'Medio Tiempo', 'contrato':'Contrato', 'remoto':'Remoto', 'freelance':'Freelance' };
  const typeColors = { 'tiempo_completo':'#4f46e5', 'medio_tiempo':'#0891b2', 'contrato':'#d97706', 'remoto':'#059669', 'freelance':'#7c3aed' };
  const typeLabel = typeLabels[job.job_type] || job.job_type || 'No especificado';
  const typeColor = typeColors[job.job_type] || '#4f46e5';
  const location = [job.city, job.state].filter(Boolean).join(', ') || 'Venezuela';
  const postedDate = job.created_at ? new Date(job.created_at + 'Z').toLocaleDateString('es-VE', { year:'numeric', month:'long', day:'numeric' }) : '';
  const salaryText = job.salary || 'No especificado';
  const companyInitials = (job.company_name || 'E').substring(0, 2).toUpperCase();
  const whatsappMsg = encodeURIComponent(`Hola, vi la oferta de empleo "${job.title}" en HolaX y me interesa aplicar.`);
  const whatsappLink = job.business_whatsapp ? `https://wa.me/${job.business_whatsapp.replace(/[^0-9]/g,'')}?text=${whatsappMsg}` : job.contact_phone ? `https://wa.me/${job.contact_phone.replace(/[^0-9]/g,'')}?text=${whatsappMsg}` : null;
  const businessLink = job.business_slug ? (() => {
    var tipo = (job.business_type || 'negocio').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    var cat = job.category_slug || 'otro';
    return '/' + tipo + '/' + cat + '/' + job.business_slug;
  })() : null;

  let jobImages = [];
  if (job.images) { try { const p = JSON.parse(job.images); if (Array.isArray(p)) jobImages = p.filter(u => u && u.trim()); } catch(e) { if (job.images.trim()) jobImages = [job.images.trim()]; } }

  let jobVideos = [];
  if (job.video_url) { try { const p = JSON.parse(job.video_url); if (Array.isArray(p)) jobVideos = p.filter(u => u && u.trim()); } catch(e) { if (job.video_url.trim()) jobVideos = [job.video_url.trim()]; } }

  let galleryHtml = '';
  if (jobImages.length > 0) {
    galleryHtml = `<div class="ej-gallery"><div class="ej-gallery-main"><img src="${jobImages[0]}" alt="${esc(job.title)}" id="ejMainImg" onclick="openEjLb(0)"></div>${jobImages.length > 1 ? `<div class="ej-gallery-thumbs">${jobImages.map((img,i) => `<img src="${img}" class="ej-thumb ${i===0?'active':''}" onclick="chgEjImg(${i},this)">`).join('')}</div>` : ''}</div>`;
  }
  let videoHtml = jobVideos.length > 0 ? `<div class="ej-videos">${jobVideos.map(v => embedVideo(v)).join('')}</div>` : '';

  let reqHtml = '';
  if (job.requirements) { const reqs = job.requirements.split('\n').filter(r => r.trim()); reqHtml = `<div class="ej-section"><h3><i class="fas fa-list-check"></i> Requisitos</h3><ul>${reqs.map(r => `<li>${esc(r.trim())}</li>`).join('')}</ul></div>`; }
  let benHtml = '';
  if (job.benefits) { const bens = job.benefits.split('\n').filter(b => b.trim()); benHtml = `<div class="ej-section"><h3><i class="fas fa-gift"></i> Beneficios</h3><ul>${bens.map(b => `<li>${esc(b.trim())}</li>`).join('')}</ul></div>`; }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><link rel="icon" type="image/jpeg" href="/images/favicon.jpeg"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${esc((job.description||job.title).substring(0,160))}">
<title>${esc(job.title)} - ${esc(job.company_name)} - HolaX</title>
<link rel="stylesheet" href="/css/styles.css?v=4"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
.ej-wrap{max-width:800px;margin:0 auto;padding:calc(var(--navbar-height,64px)+32px) 20px 60px}
.ej-bc{display:flex;align-items:center;gap:8px;font-size:.85rem;color:#64748b;margin-bottom:24px;flex-wrap:wrap}.ej-bc a{color:#4f46e5;text-decoration:none}
.ej-card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 24px rgba(0,0,0,.04);overflow:hidden;margin-bottom:24px}
.ej-hd{padding:32px 28px 24px;border-bottom:1px solid #f1f5f9}
.ej-co-row{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.ej-co-logo{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;color:#4f46e5;flex-shrink:0;overflow:hidden}
.ej-co-logo img{width:100%;height:100%;object-fit:cover}
.ej-co-name{font-size:.95rem;font-weight:600;color:#1e293b}.ej-co-name a{color:inherit;text-decoration:none}.ej-co-name a:hover{color:#4f46e5}
.ej-posted{font-size:.8rem;color:#94a3b8;margin-top:2px}
.ej-title{font-size:1.6rem;font-weight:700;color:#0f172a;margin:0 0 16px;line-height:1.3}
.ej-badges{display:flex;flex-wrap:wrap;gap:10px}
.ej-badge{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:10px;font-size:.82rem;font-weight:500}
.ej-bt{background:${typeColor}12;color:${typeColor}}.ej-bl{background:#f1f5f9;color:#475569}.ej-bs{background:#ecfdf5;color:#059669;font-weight:600}.ej-bv{background:#f8fafc;color:#94a3b8}
.ej-body{padding:28px}.ej-section{margin-bottom:28px}.ej-section h3{font-size:1.05rem;font-weight:700;color:#1e293b;margin:0 0 12px;display:flex;align-items:center;gap:8px}.ej-section h3 i{font-size:.9rem;color:#4f46e5}
.ej-section p{color:#475569;line-height:1.75;font-size:.92rem;margin:0;white-space:pre-wrap}
.ej-section ul{padding-left:0;list-style:none;margin:0}.ej-section ul li{padding:6px 0 6px 24px;position:relative;color:#475569;font-size:.9rem;line-height:1.6}
.ej-section ul li::before{content:'\\f00c';font-family:'Font Awesome 6 Free';font-weight:900;position:absolute;left:0;color:#4f46e5;font-size:.75rem;top:8px}
.ej-cta{padding:24px 28px;background:linear-gradient(135deg,#f8faff,#eef2ff);border-top:1px solid #e0e7ff;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ej-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:12px;font-size:.9rem;font-weight:600;text-decoration:none;cursor:pointer;border:none;transition:all .2s}
.ej-btn:hover{transform:translateY(-1px)}.ej-bw{background:#25D366;color:#fff}.ej-bw:hover{background:#1da851;box-shadow:0 4px 14px rgba(37,211,102,.35)}
.ej-be{background:#fff;color:#4f46e5;border:2px solid #e0e7ff}.ej-be:hover{background:#eef2ff}
.ej-bp{background:#fff;color:#475569;border:2px solid #e2e8f0}.ej-bp:hover{background:#f8fafc}
.ej-gallery{margin-bottom:24px}.ej-gallery-main{border-radius:16px;overflow:hidden;background:#f8fafc;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;cursor:pointer}.ej-gallery-main img{width:100%;height:100%;object-fit:cover}
.ej-gallery-thumbs{display:flex;gap:8px;margin-top:10px;overflow-x:auto;padding-bottom:4px}
.ej-thumb{width:72px;height:54px;border-radius:8px;object-fit:cover;cursor:pointer;border:2px solid transparent;opacity:.65;transition:all .2s;flex-shrink:0}.ej-thumb.active,.ej-thumb:hover{border-color:#4f46e5;opacity:1}
.ej-videos{margin-bottom:24px}.ej-videos iframe,.ej-videos video{width:100%;border-radius:12px;margin-bottom:12px;aspect-ratio:16/9}
.ej-lb{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);align-items:center;justify-content:center;flex-direction:column}
.ej-lb.active{display:flex}.ej-lb img{max-width:92vw;max-height:82vh;object-fit:contain;border-radius:8px}
.ej-lb-x{position:absolute;top:16px;right:20px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;z-index:10001;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%}.ej-lb-x:hover{background:rgba(255,255,255,.15)}
.ej-lb-n{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.12);border:none;color:#fff;font-size:1.5rem;cursor:pointer;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:10001}.ej-lb-n:hover{background:rgba(255,255,255,.3)}
.ej-lb-p{left:16px}.ej-lb-nx{right:16px}.ej-lb-c{color:rgba(255,255,255,.7);font-size:.85rem;margin-top:12px}
</style>
</head>
<body>
<nav class="navbar" id="navbar"><div class="nav-container"><a href="/index.html" class="nav-logo"><img src="/images/favicon.jpeg" alt="HolaX" style="height:32px;width:auto;border-radius:6px;margin-right:4px"><span class="brand-name">HolaX</span></a><button class="nav-toggle" id="navToggle"><i class="fas fa-bars"></i></button><ul class="nav-menu" id="navMenu"><li><a href="/index.html" class="nav-link">Inicio</a></li><li><a href="/search.html" class="nav-link">Negocios</a></li><li><a href="/properties.html" class="nav-link">Inmuebles</a></li><li><a href="/empleo" class="nav-link active">Empleo</a></li><li><a href="/marketplace.html" class="nav-link">Marketplace</a></li><li id="navLoginItem"><a href="/login.html" class="nav-link nav-btn">Login</a></li></ul></div></nav>
<div class="ej-wrap">
<div class="ej-bc"><a href="/"><i class="fas fa-home"></i> Inicio</a><i class="fas fa-chevron-right" style="font-size:.65rem"></i><a href="/empleo">Empleo</a><i class="fas fa-chevron-right" style="font-size:.65rem"></i><span>${esc(job.title)}</span></div>
${galleryHtml}${videoHtml}
<div class="ej-card">
<div class="ej-hd">
<div class="ej-co-row"><div class="ej-co-logo">${job.business_logo ? `<img src="${job.business_logo}" alt="${esc(job.company_name)}">` : companyInitials}</div><div><div class="ej-co-name">${businessLink ? `<a href="${businessLink}">${esc(job.company_name)}</a>` : esc(job.company_name)}</div><div class="ej-posted"><i class="far fa-clock"></i> Publicado ${postedDate}</div></div></div>
<h1 class="ej-title">${esc(job.title)}</h1>
<div class="ej-badges"><span class="ej-badge ej-bt"><i class="fas fa-briefcase"></i> ${typeLabel}</span><span class="ej-badge ej-bl"><i class="fas fa-map-marker-alt"></i> ${esc(location)}</span><span class="ej-badge ej-bs"><i class="fas fa-dollar-sign"></i> ${esc(salaryText)}</span><span class="ej-badge ej-bv"><i class="far fa-eye"></i> ${job.views||0} vistas</span></div>
</div>
${job.description ? `<div class="ej-body"><div class="ej-section"><h3><i class="fas fa-align-left"></i> Descripcion</h3><p>${esc(job.description)}</p></div>${reqHtml}${benHtml}</div>` : ''}
${(whatsappLink||job.contact_email||job.contact_phone) ? `<div class="ej-cta">${whatsappLink ? `<a href="${whatsappLink}" target="_blank" class="ej-btn ej-bw"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}${job.contact_email ? `<a href="mailto:${esc(job.contact_email)}" class="ej-btn ej-be"><i class="fas fa-envelope"></i> Email</a>` : ''}${job.contact_phone ? `<a href="tel:${esc(job.contact_phone)}" class="ej-btn ej-bp"><i class="fas fa-phone"></i> Llamar</a>` : ''}</div>` : ''}
</div></div>
<div class="ej-lb" id="ejLb"><button class="ej-lb-x" onclick="closeEjLb()">&times;</button><button class="ej-lb-n ej-lb-p" onclick="event.stopPropagation();navEjLb(-1)"><i class="fas fa-chevron-left"></i></button><button class="ej-lb-n ej-lb-nx" onclick="event.stopPropagation();navEjLb(1)"><i class="fas fa-chevron-right"></i></button><div class="ej-lb-c" id="ejLbC"></div></div>
<footer class="footer"><div class="container"><div class="footer-bottom">
<p>&copy; ${new Date().getFullYear()} HolaX. Todos los derechos reservados.</p>
<p><a href="https://maps.app.goo.gl/Jz2QTADrNNneQtGd9" target="_blank" rel="noopener noreferrer">Página web desarrollada por Grupo 360 Soluciones</a></p>
<p><a href="http://coporo.pages.dev/" target="_blank" rel="noopener noreferrer">Diseño de páginas webs - SEO Local -</a></p>
</div></div></footer>
<script src="/js/app.js"></script>
<script>
const _ei=${JSON.stringify(jobImages)};
function chgEjImg(i,t){document.getElementById('ejMainImg').src=_ei[i];document.querySelectorAll('.ej-thumb').forEach(t=>t.classList.remove('active'));if(t)t.classList.add('active')}
let _li=0;function openEjLb(i){_li=i;document.getElementById('ejLb').classList.add('active');rEjLb()}
function closeEjLb(){document.getElementById('ejLb').classList.remove('active')}
function navEjLb(d){_li=(_li+d+_ei.length)%_ei.length;rEjLb()}
function rEjLb(){const lb=document.getElementById('ejLb');let img=lb.querySelector('img');if(!img){img=document.createElement('img');lb.insertBefore(img,lb.querySelector('.ej-lb-x'))}img.src=_ei[_li];document.getElementById('ejLbC').textContent=_ei.length>1?(_li+1)+' / '+_ei.length:'';lb.querySelector('.ej-lb-p').style.display=_ei.length>1?'':'none';lb.querySelector('.ej-lb-nx').style.display=_ei.length>1?'':'none'}
document.getElementById('ejLb').addEventListener('click',function(e){if(e.target===this)closeEjLb()});
document.addEventListener('keydown',function(e){if(!document.getElementById('ejLb').classList.contains('active'))return;if(e.key==='Escape')closeEjLb();if(e.key==='ArrowLeft')navEjLb(-1);if(e.key==='ArrowRight')navEjLb(1)});
</script></body></html>`;
}

export async function onRequestGet(context) {
  try {
    const { env, request, params } = context;
    const id = params.id;

    // Ensure business_logo column exists
    try { await env.DB.prepare(`ALTER TABLE job_listings ADD COLUMN business_logo TEXT`).run(); } catch(e) {}

    const job = await env.DB.prepare(
      `SELECT j.*,
              COALESCE(j.business_logo, b.logo) as business_logo,
              b.title as business_title, b.slug as business_slug, b.business_type,
              b.phone as business_phone, b.whatsapp as business_whatsapp,
              c.slug as category_slug
       FROM job_listings j
       LEFT JOIN businesses b ON j.business_id = b.id
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE j.id = ?`
    ).bind(id).first();

    if (!job) {
      const accept = request.headers.get('Accept') || '';
      if (accept.includes('text/html')) {
        return new Response('<h1>Empleo no encontrado</h1><p>La oferta que buscas no existe.</p><a href="/empleo">Ver empleos</a>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
      return new Response(JSON.stringify({ error: 'Empleo no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Increment views
    try { await env.DB.prepare('UPDATE job_listings SET views = views + 1 WHERE id = ?').bind(id).run(); } catch(e) {}

    // Return HTML for browser requests, JSON for API
    const accept = request.headers.get('Accept') || '';
    if (accept.includes('text/html') && !accept.includes('application/json')) {
      return new Response(renderJobHTML(job), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return new Response(JSON.stringify(job), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

export async function onRequestPatch(context) {
  try {
    const { env, request } = context;
    const user = await requireAuth(request, env);
    if (!user || (user.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const id = context.params.id;
    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      await env.DB.prepare("UPDATE job_listings SET status = 'approved', updated_at = datetime('now') WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ message: 'Oferta aprobada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else if (action === 'reject') {
      await env.DB.prepare("UPDATE job_listings SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ message: 'Oferta rechazada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else if (action === 'edit') {
      const { title, company_name, job_type, salary, state, city, description, requirements, benefits, contact_email, contact_phone, business_logo } = body;
      // Ensure business_logo column exists
      try { await env.DB.prepare(`ALTER TABLE job_listings ADD COLUMN business_logo TEXT`).run(); } catch(e) {}
      // Build dynamic UPDATE
      const fields = [];
      const values = [];
      if (title !== undefined) { fields.push('title = ?'); values.push(title.trim()); }
      if (company_name !== undefined) {
        fields.push('company_name = ?');
        values.push(company_name.trim());
        // Also update business_id if company changed
        const bizRow = await env.DB.prepare('SELECT id FROM businesses WHERE title = ? AND status = ? LIMIT 1').bind(company_name.trim(), 'approved').first();
        if (bizRow) { fields.push('business_id = ?'); values.push(bizRow.id); }
      }
      if (business_logo !== undefined) { fields.push('business_logo = ?'); values.push(business_logo || null); }
      if (job_type !== undefined) { fields.push('job_type = ?'); values.push(job_type); }
      if (salary !== undefined) { fields.push('salary = ?'); values.push(salary || null); }
      if (state !== undefined) { fields.push('state = ?'); values.push(state || null); }
      if (city !== undefined) { fields.push('city = ?'); values.push(city || null); }
      if (description !== undefined) { fields.push('description = ?'); values.push(description || null); }
      if (requirements !== undefined) { fields.push('requirements = ?'); values.push(requirements || null); }
      if (benefits !== undefined) { fields.push('benefits = ?'); values.push(benefits || null); }
      if (contact_email !== undefined) { fields.push('contact_email = ?'); values.push(contact_email || null); }
      if (contact_phone !== undefined) { fields.push('contact_phone = ?'); values.push(contact_phone || null); }
      if (fields.length === 0) {
        return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await env.DB.prepare(`UPDATE job_listings SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
      return new Response(JSON.stringify({ message: 'Oferta actualizada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      return new Response(JSON.stringify({ error: 'Accion no valida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

export async function onRequestDelete(context) {
  try {
    const { env, request } = context;
    const user = await requireAuth(request, env);
    if (!user || (user.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const id = context.params.id;
    await env.DB.prepare('DELETE FROM job_listings WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ message: 'Oferta eliminada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}