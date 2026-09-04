// functions/api/img/index.js
// GET: Serve optimized images with on-the-fly WebP/AVIF conversion + resizing
// Usage: /api/img?key=businesses/123/1234_photo.jpg&w=400&h=400&q=80
//        /api/img?key=...&w=800   (solo ancho, mantiene aspect ratio)
//        /api/img?key=...         (sin parametros: optimiza formato, sin resize)
//
// Estrategia:
// 1. Detecta Accept header del cliente (avif > webp > original)
// 2. Genera clave de cache única: key + dimensiones + formato
// 3. Si existe en R2 cache -> sirve directo
// 4. Si no existe -> usa Cloudflare Image Resizing (cf.image)
// 5. Guarda la versión optimizada en R2 cache para próximas requests

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

const CACHE_PREFIX = 'cache/img/';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);

    if (!env.R2) {
      return new Response('R2 storage not configured', { status: 503, headers: corsHeaders });
    }

    const key = url.searchParams.get('key');
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (key.includes('..') || key.startsWith('/')) {
      return new Response('Invalid key', { status: 400, headers: corsHeaders });
    }

    const w = Math.min(parseInt(url.searchParams.get('w')) || 0, 2000);
    const h = Math.min(parseInt(url.searchParams.get('h')) || 0, 2000);
    const q = Math.min(Math.max(parseInt(url.searchParams.get('q')) || 80, 30), 95);
    const fit = url.searchParams.get('fit') || 'scale-down';

    const accept = request.headers.get('Accept') || '';
    let targetFormat = 'original';
    if (accept.includes('image/avif')) {
      targetFormat = 'avif';
    } else if (accept.includes('image/webp')) {
      targetFormat = 'webp';
    }

    const ext = key.split('.').pop().toLowerCase();
    const skipOptimization = ext === 'svg' || ext === 'ico' || ext === 'gif';

    if (skipOptimization) {
      return await serveOriginal(env, request, key);
    }

    const cache = caches.default;
    const cacheKeyUrl = new URL(request.url);
    cacheKeyUrl.searchParams.sort();
    const cacheKeyStr = cacheKeyUrl.toString();
    const cachedResponse = await cache.match(cacheKeyStr);
    if (cachedResponse) return cachedResponse;

    const variantKey = buildVariantKey(key, w, h, q, fit, targetFormat);
    const cachedVariant = await env.R2.get(CACHE_PREFIX + variantKey);
    if (cachedVariant) {
      const response = buildResponse(cachedVariant.body, {
        format: targetFormat,
        etag: cachedVariant.etag,
        uploaded: cachedVariant.uploaded,
      });
      context.waitUntil(cache.put(cacheKeyStr, response.clone()));
      return response;
    }

    const original = await env.R2.get(key);
    if (!original) {
      return new Response('Image not found', { status: 404, headers: corsHeaders });
    }

    if (!w && !h && targetFormat === 'original') {
      const response = await serveOriginalStream(original, key);
      context.waitUntil(cache.put(cacheKeyStr, response.clone()));
      return response;
    }

    try {
      const resized = await fetch(request.url, {
        cf: {
          image: {
            width: w || undefined,
            height: h || undefined,
            quality: q,
            fit: fit,
            format: targetFormat === 'original' ? undefined : targetFormat,
            metadata: 'none',
          },
        },
      });

      if (!resized.ok) {
        throw new Error('Image resizing failed: ' + resized.status);
      }

      const optimizedBuffer = await resized.arrayBuffer();

      const contentType = targetFormat === 'avif' ? 'image/avif'
                        : targetFormat === 'webp' ? 'image/webp'
                        : getContentTypeFromKey(key);

      context.waitUntil(
        env.R2.put(CACHE_PREFIX + variantKey, optimizedBuffer, {
          httpMetadata: { contentType },
          customMetadata: {
            originalKey: key,
            optimizedAt: new Date().toISOString(),
            params: `w=${w}&h=${h}&q=${q}&fit=${fit}&format=${targetFormat}`,
          },
        })
      );

      const response = new Response(optimizedBuffer, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Optimized': '1',
          'X-Original-Format': ext,
          'X-Target-Format': targetFormat,
        },
      });

      context.waitUntil(cache.put(cacheKeyStr, response.clone()));
      return response;

    } catch (resizeError) {
      console.error('Resize error, serving original:', resizeError.message);
      const response = await serveOriginalStream(original, key);
      context.waitUntil(cache.put(cacheKeyStr, response.clone()));
      return response;
    }
  } catch (error) {
    console.error('img endpoint error:', error);
    return new Response('Error processing image', {
      status: 500,
      headers: corsHeaders,
    });
  }
}

function buildVariantKey(key, w, h, q, fit, format) {
  const parts = key.split('/');
  const filename = parts.pop();
  const dir = parts.join('/');
  const baseName = filename.replace(/\.[^.]+$/, '');
  const suffix = [w && `w${w}`, h && `h${h}`, `q${q}`, fit, format]
    .filter(Boolean).join('_');
  const ext = format === 'original' ? filename.split('.').pop() : format;
  return `${dir}/${baseName}__${suffix}.${ext}`;
}

function buildResponse(body, { format, etag, uploaded }) {
  const contentType = format === 'avif' ? 'image/avif'
                    : format === 'webp' ? 'image/webp'
                    : 'image/jpeg';
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': etag || '',
      'Last-Modified': uploaded ? uploaded.toUTCString() : '',
      'X-Optimized': '1',
    },
  });
}

async function serveOriginal(env, request, key) {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const object = await env.R2.get(key);
  if (!object) {
    return new Response('Image not found', { status: 404, headers: corsHeaders });
  }

  const contentType = object.httpMetadata?.contentType || getContentTypeFromKey(key);
  const response = new Response(object.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': object.etag || '',
      'Last-Modified': object.uploaded.toUTCString(),
    },
  });

  return response;
}

async function serveOriginalStream(object, key) {
  const contentType = object.httpMetadata?.contentType || getContentTypeFromKey(key);
  return new Response(object.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': object.etag || '',
      'Last-Modified': object.uploaded.toUTCString(),
    },
  });
}

function getContentTypeFromKey(key) {
  const ext = key.split('.').pop().toLowerCase();
  const types = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    ico: 'image/x-icon', avif: 'image/avif',
  };
  return types[ext] || 'application/octet-stream';
}
