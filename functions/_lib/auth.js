// functions/_lib/auth.js
// Shared authentication and authorization utilities

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function corsResponse(data, status = 200, extraHeaders = {}) {
  return new Response(typeof data === 'string' ? data : JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export function base64urlDecode(str) {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    return JSON.parse(atob(base64));
  } catch (e) {
    return null;
  }
}

export async function verifyJWT(token, secret) {
  if (!token || !secret) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = base64urlDecode(parts[0]);
    if (!header || header.alg !== 'HS256') return null;
    const payload = base64urlDecode(parts[1]);
    if (!payload) return null;
    const sigData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sig = new Uint8Array(Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
    const valid = await crypto.subtle.verify('HMAC', key, sig, sigData);
    if (!valid) return null;
    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyJWT(token, env.JWT_SECRET);
}

export async function requireAuth(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return { error: corsResponse({ error: 'Token requerido o invalido' }, 401) };
  return { user };
}

export async function requireAdmin(request, env) {
  const { user, error } = await requireAuth(request, env);
  if (error) return { error };
  if (user.role !== 'admin') return { error: corsResponse({ error: 'Acceso denegado: se requiere rol admin' }, 403) };
  return { user };
}

export function jsonResponse(data, status = 200) {
  return corsResponse(data, status);
}

export function errorResponse(message, status = 500) {
  return corsResponse({ error: message }, status);
}