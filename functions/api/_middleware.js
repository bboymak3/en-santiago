// functions/api/_middleware.js
// Falla cerrado si falta JWT_SECRET: sin el secreto no se firman ni se
// verifican tokens (antes cada endpoint usaba una clave por defecto conocida).

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.JWT_SECRET && request.method !== 'OPTIONS') {
    const url = new URL(request.url);
    const usesAuth = request.headers.has('Authorization')
      || url.pathname.startsWith('/api/auth/')
      || url.searchParams.has('token');
    if (usesAuth) {
      return new Response(JSON.stringify({ error: 'Error de configuración: JWT_SECRET no está definido.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }
  return context.next();
}
