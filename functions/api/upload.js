// functions/api/upload.js
// POST: Upload image to R2 bucket

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB (compression applied client-side)
// Images are served through our own /api/serve/ endpoint (no public R2 access needed)
// The key is stored in DB; the serve endpoint reads from R2 binding
const R2_SERVE_BASE = '/api/serve';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!env.R2) {
      return new Response(JSON.stringify({ error: 'Almacenamiento R2 no disponible.', debug: 'R2 binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';

    // Auth required
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const user = await verifyJWT(token, jwtSecret);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    const businessId = formData.get('business_id');
    const propertyId = formData.get('property_id');
    const productType = formData.get('product_type'); // 'marketplace', 'business', 'property', 'video', 'logo', 'banner'

    if (!file) {
      return new Response(JSON.stringify({ error: 'No se proporcionó ningún archivo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ALLOWED_PRODUCT_TYPES = ['marketplace', 'video', 'logo', 'banner', 'business', 'business_image', 'property', 'job', 'popup', 'category_banner', 'avatar'];
    if (!businessId && !propertyId && !ALLOWED_PRODUCT_TYPES.includes(productType)) {
      return new Response(JSON.stringify({ error: 'business_id, property_id es requerido o product_type debe ser ' + ALLOWED_PRODUCT_TYPES.join('/') }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    const fileName = file.name;
    const extension = fileName.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return new Response(JSON.stringify({ error: `Formato de archivo no soportado. Formatos permitidos: ${ALLOWED_EXTENSIONS.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate content type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Tipo de contenido no soportado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'El archivo excede el tamaño máximo de 50MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership based on product_type
    if (productType === 'marketplace' || productType === 'video' || productType === 'job' || productType === 'popup') {
      // Marketplace/video/job uploads - any authenticated user can upload
    } else if (productType === 'logo' || productType === 'banner' || productType === 'category_banner' || productType === 'avatar') {
      // Logo/banner/category_banner/avatar uploads - any authenticated user (admin) can upload, no business_id required
    } else if (productType === 'property' || propertyId) {
      // Property uploads - verify property ownership
      const property = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(propertyId).first();
      if (!property) {
        return new Response(JSON.stringify({ error: 'Propiedad no encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (user.role !== 'admin' && user.id !== property.user_id) {
        return new Response(JSON.stringify({ error: 'No tienes permiso para subir imágenes a esta propiedad' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (businessId) {
      // Business uploads
      const business = await env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(businessId).first();
      if (!business) {
        return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (user.role !== 'admin' && user.id !== business.user_id) {
        return new Response(JSON.stringify({ error: 'No tienes permiso para subir imágenes a este negocio' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();

    // Generate unique key
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Folder = env.R2_FOLDER || 'merida';
    let key;
    if (productType === 'marketplace') {
      key = `${r2Folder}/marketplace/${user.id}/${timestamp}_${sanitizedName}`;
    } else if (productType === 'video') {
      key = `${r2Folder}/videos/${user.id}/${timestamp}_${sanitizedName}`;
    } else if (productType === 'logo') {
      key = `${r2Folder}/logos/${businessId || user.id}/${timestamp}_${sanitizedName}`;
    } else if (productType === 'banner') {
      key = `${r2Folder}/banners/${timestamp}_${sanitizedName}`;
    } else if (productType === 'property' || propertyId) {
      key = `${r2Folder}/properties/${propertyId}/${timestamp}_${sanitizedName}`;
    } else if (productType === 'job') {
      key = `${r2Folder}/jobs/${user.id}/${timestamp}_${sanitizedName}`;
    } else if (productType === 'popup') {
      key = `${r2Folder}/popup/${timestamp}_${sanitizedName}`;
    } else if (productType === 'category_banner') {
      key = `${r2Folder}/banners/categories/${timestamp}_${sanitizedName}`;
    } else if (productType === 'avatar') {
      key = `${r2Folder}/avatars/${user.id}/${timestamp}_${sanitizedName}`;
    } else {
      // 'business', 'business_image', or fallback
      key = `${r2Folder}/businesses/${businessId || user.id}/${timestamp}_${sanitizedName}`;
    }

    // Upload to R2
    await env.R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Use our own serve endpoint URL (works without public R2 access)
    const publicUrl = `${R2_SERVE_BASE}?key=${encodeURIComponent(key)}`;

    return new Response(JSON.stringify({
      message: 'Imagen subida exitosamente',
      url: publicUrl,
      key,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload error:', error);
    const debugMsg = error.message || 'Unknown error';
    let errorMsg = 'Error interno del servidor';
    // Provide more specific error messages for common issues
    if (debugMsg.includes('R2 binding') || debugMsg.includes('R2_BUCKET') || debugMsg.includes('binding')) {
      errorMsg = 'Almacenamiento R2 no configurado correctamente';
    } else if (debugMsg.includes('size') || debugMsg.includes('too large')) {
      errorMsg = 'El archivo es demasiado grande';
    } else if (debugMsg.includes('network') || debugMsg.includes('fetch') || debugMsg.includes('connect')) {
      errorMsg = 'Error de conexión al almacenamiento';
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: debugMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
