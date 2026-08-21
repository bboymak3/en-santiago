// functions/api/product-comments/index.js
// GET: List comments for a product (?product_id=X)
// POST: Create a comment on a product (auth optional - anonymous allowed)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

async function ensureTable(db) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS product_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_id INTEGER,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch (e) { /* table may exist */ }
  try { await db.prepare('CREATE INDEX IF NOT EXISTS idx_pc_product ON product_comments(product_id)').run(); } catch (e) {}

  // Migration: if table was created with user_id NOT NULL, recreate it
  try {
    // Try inserting a test row with NULL user_id - if it fails, migrate
    const testResult = await db.prepare(
      "INSERT INTO product_comments (product_id, user_id, content) VALUES (0, NULL, '_migrate_check')"
    ).run();
    // If succeeded, delete the test row
    await db.prepare('DELETE FROM product_comments WHERE content = ?').bind('_migrate_check').run();
  } catch (migrateErr) {
    // NOT NULL constraint failed - need to migrate
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS product_comments_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          user_id INTEGER,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      await db.prepare(`
        INSERT INTO product_comments_new (id, product_id, user_id, content, created_at)
        SELECT id, product_id, user_id, content, created_at FROM product_comments
      `).run();
      await db.prepare('DROP TABLE product_comments').run();
      await db.prepare('ALTER TABLE product_comments_new RENAME TO product_comments').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_pc_product ON product_comments(product_id)').run();
    } catch (e) { /* migration failed, will use user_id=0 fallback */ }
  }
}

// GET: List comments for a product
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    await ensureTable(env.DB);

    const url = new URL(request.url);
    const productId = parseInt(url.searchParams.get('product_id'));
    if (!productId) {
      return new Response(JSON.stringify({ error: 'product_id requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 100);
    const offset = (page - 1) * limit;

    const comments = await env.DB.prepare(`
      SELECT pc.id, pc.content, pc.created_at,
             u.name as user_name
      FROM product_comments pc
      LEFT JOIN users u ON pc.user_id = u.id
      WHERE pc.product_id = ?
      ORDER BY pc.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(productId, limit, offset).all();

    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM product_comments WHERE product_id = ?'
    ).bind(productId).first();

    return new Response(JSON.stringify({
      comments: (comments.results || []).map(c => ({
        id: c.id,
        user_name: c.user_name || 'Anonimo',
        content: c.content,
        created_at: c.created_at,
      })),
      total: countResult ? countResult.total : 0,
      page, limit,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ comments: [], total: 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// POST: Create a comment (auth optional - anonymous allowed)
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    await ensureTable(env.DB);

    // Auth is optional - try to get user but don't require it
    let user = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      user = await verifyJWT(token, env.JWT_SECRET);
    }

    const body = await request.json();
    const productId = parseInt(body.product_id);
    const content = (body.content || '').trim();

    if (!productId || !content) {
      return new Response(JSON.stringify({ error: 'producto y comentario son requeridos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (content.length > 1000) {
      return new Response(JSON.stringify({ error: 'El comentario no puede exceder 1000 caracteres' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify product exists
    const product = await env.DB.prepare('SELECT id, name, business_id FROM products WHERE id = ?').bind(productId).first();
    if (!product) {
      return new Response(JSON.stringify({ error: 'Producto no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = user ? user.id : null;

    // Insert comment
    const result = await env.DB.prepare(
      'INSERT INTO product_comments (product_id, user_id, content) VALUES (?, ?, ?)'
    ).bind(productId, userId, content).run();

    // Also send as a chat message to admin/seller chat (works for logged-in AND anonymous)
    if (product.business_id) {
      try {
        const business = await env.DB.prepare('SELECT user_id, title FROM businesses WHERE id = ?').bind(product.business_id).first();
        try {
          await env.DB.prepare(`CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT, business_id INTEGER NOT NULL,
            buyer_id INTEGER NOT NULL, seller_id INTEGER NOT NULL,
            last_message TEXT, last_message_at TEXT,
            buyer_unread INTEGER DEFAULT 0, seller_unread INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(buyer_id, seller_id, business_id)
          )`).run();
        } catch (e) {}
        try {
          await env.DB.prepare(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL, content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
          )`).run();
        } catch (e) {}

        // For anonymous comments, use buyer_id = 0; for logged-in, use their id
        const buyerId = user ? user.id : 0;
        // Use business owner's user_id, or 0 if business has no owner
        const sellerId = (business && business.user_id) ? business.user_id : 0;

        // Skip if logged-in user is the business owner (commenting own product)
        if (buyerId !== 0 && buyerId === sellerId) {
          // commenting own product, skip chat sync
        } else {
          let conv = await env.DB.prepare(
            'SELECT id FROM conversations WHERE buyer_id = ? AND seller_id = ? AND business_id = ?'
          ).bind(buyerId, sellerId, product.business_id).first();

          if (!conv) {
            const convResult = await env.DB.prepare(
              'INSERT INTO conversations (business_id, buyer_id, seller_id, last_message, last_message_at) VALUES (?, ?, ?, ?, datetime(\'now\'))'
            ).bind(product.business_id, buyerId, sellerId, '[COMENTARIO] ' + content).run();
            conv = { id: convResult.meta.last_row_id };
          } else {
            await env.DB.prepare(
              "UPDATE conversations SET last_message = ?, last_message_at = datetime('now'), seller_unread = seller_unread + 1 WHERE id = ?"
            ).bind('[COMENTARIO] ' + content, conv.id).run();
          }

          const senderName = user ? (user.name || 'Usuario') : 'Anonimo';
          const commentMsg = '[COMENTARIO en ' + product.name + '] ' + senderName + ': ' + content;
          const senderId = user ? user.id : 0;
          await env.DB.prepare(
            'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)'
          ).bind(conv.id, senderId, commentMsg).run();
        }
      } catch (chatErr) {
        console.error('Chat sync error:', chatErr);
      }
    }

    return new Response(JSON.stringify({
      comment: {
        id: result.meta.last_row_id,
        product_id: productId,
        user_name: user ? (user.name || 'Anonimo') : 'Anonimo',
        content,
        created_at: new Date().toISOString(),
      },
    }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al crear comentario' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}