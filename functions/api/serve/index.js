// functions/api/serve/index.js
// GET: Serve images from R2 with smart optimization
// - Detects WebP/AVIF support via Accept header
// - Auto-resizes to max 1200px width (banners) or 800px (logos)
// - Caches optimized variants in R2 (cache/img/ prefix)
// - Falls back to original if optimization fails
//
// Usage: /api/serve?key=santiago%2Flogos%2F1%2F123_photo.jpg
// The original /api/serve endpoint is kept for backwards compatibility.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

const CACHE_PREFIX = 'cache/img/';
const MAX_WIDTH_BANNERS = 1600;  // banners can be wider
const MAX_WIDTH_LOGOS = 800;      // logos are smaller
const QUALITY = 80;

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (key.includes('..') || key.startsWith('/')) {
      return new Response('Invalid key format', { status: 400, headers: corsHeaders });
    }

    if (!env.R2) {
      return new Response('R2 not configured', { status: 503, headers: corsHeaders });
    }

    // Detectar formato soportado
    const accept = request.headers.get('Accept') || '';
    let targetFormat = 'jpeg';
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

    // Determinar ancho máximo según tipo de imagen
    const isLogo = key.includes('/logos/');
    const maxWidth = isLogo ? MAX_WIDTH_LOGOS : MAX_WIDTH_BANNERS;

    // 1. Edge cache
    const cache = caches.default;
    const cacheKeyStr = request.url;
    const cachedResponse = await cache.match(cacheKeyStr);
    if (cachedResponse) return cachedResponse;

    // 2. R2 variant cache
    const variantKey = buildVariantKey(key, maxWidth, targetFormat);
    const cachedVariant = await env.R2.get(CACHE_PREFIX + variantKey);
    if (cachedVariant) {
      const contentType = targetFormat === 'avif' ? 'image/avif'
                        : targetFormat === 'webp' ? 'image/webp'
                        : getContentTypeFromKey(key);
      const response = new Response(cachedVariant.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'ETag': cachedVariant.etag || '',
          'Last-Modified': cachedVariant.uploaded ? cachedVariant.uploaded.toUTCString() : '',
          'X-Optimized': '1',
          'X-Cache': 'r2-variant',
        },
      });
      context.waitUntil(cache.put(cacheKeyStr, response.clone()));
      return response;
    }

    // 3. Fetch original from R2
    const original = await env.R2.get(key);
    if (!original) {
      return new Response('Image not found', { status: 404, headers: corsHeaders });
    }

    // 4. Try Cloudflare Image Resizing (if available in the account)
    try {
      const resized = await fetch(request.url, {
        cf: {
          image: {
            width: maxWidth,
            quality: QUALITY,
            fit: 'scale-down',
            format: targetFormat === 'jpeg' ? undefined : targetFormat,
            metadata: 'none',
          },
        },
      });

      if (resized.ok) {
        const optimizedBuffer = await resized.arrayBuffer();
        const contentType = targetFormat === 'avif' ? 'image/avif'
                          : targetFormat === 'webp' ? 'image/webp'
                          : getContentTypeFromKey(key);

        // Guardar en R2 cache
        context.waitUntil(
          env.R2.put(CACHE_PREFIX + variantKey, optimizedBuffer, {
            httpMetadata: { contentType },
            customMetadata: {
              originalKey: key,
              optimizedAt: new Date().toISOString(),
              params: `w=${maxWidth}&q=${QUALITY}&format=${targetFormat}`,
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
            'X-Cache': 'cf-resized',
            'X-Original-Format': ext,
            'X-Target-Format': targetFormat,
            'X-Max-Width': String(maxWidth),
          },
        });
        context.waitUntil(cache.put(cacheKeyStr, response.clone()));
        return response;
      }
    } catch (resizeErr) {
      // Image Resizing not available — fall through to serving original
      console.warn('Image Resizing not available, serving original:', resizeErr.message);
    }

    // 5. Fallback: serve original with long cache
    const response = await serveOriginalStream(original, key);
    context.waitUntil(cache.put(cacheKeyStr, response.clone()));
    return response;

  } catch (error) {
    console.error('Serve image error:', error);
    return new Response('Error serving image', { status: 500, headers: corsHeaders });
  }
}

function buildVariantKey(key, w, format) {
  const parts = key.split('/');
  const filename = parts.pop();
  const dir = parts.join('/');
  const baseName = filename.replace(/\.[^.]+$/, '');
  return `${dir}/${baseName}__w${w}_${format}.${format}`;
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
      'X-Optimized': '0',
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
