// functions/api/admin/chat-logs/index.js
// GET: List ALL conversations with search (admin only)
// GET with ?conversation_id=X: Get messages for a specific conversation

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

async function ensureTables(db) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, business_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL, seller_id INTEGER NOT NULL,
      last_message TEXT, last_message_at TEXT,
      buyer_unread INTEGER DEFAULT 0, seller_unread INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(buyer_id, seller_id, business_id)
    )`).run();
  } catch (e) {}
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL, content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    )`).run();
  } catch (e) {}
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.substring(7);
    const user = await verifyJWT(token, env.JWT_SECRET || 'aunclick_jwt_secret_2024_secure');
    if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Solo administradores' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await ensureTables(env.DB);

    const url = new URL(request.url);
    const params = url.searchParams;

    // ─── Debug mode: show raw table info ─────────
    if (params.get('debug') === '1') {
      let tableInfo = {};
      try {
        const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('conversations','messages','product_comments')").all();
        tableInfo.tables = tables.results.map(t => t.name);
      } catch(e) { tableInfo.tables_error = e.message; }

      try {
        const convCount = await env.DB.prepare('SELECT COUNT(*) as c FROM conversations').first();
        tableInfo.conversations_count = convCount ? convCount.c : 0;
      } catch(e) { tableInfo.conversations_error = e.message; }

      try {
        const msgCount = await env.DB.prepare('SELECT COUNT(*) as c FROM messages').first();
        tableInfo.messages_count = msgCount ? msgCount.c : 0;
      } catch(e) { tableInfo.messages_error = e.message; }

      try {
        const pcCount = await env.DB.prepare('SELECT COUNT(*) as c FROM product_comments').first();
        tableInfo.product_comments_count = pcCount ? pcCount.c : 0;
      } catch(e) { tableInfo.product_comments_error = e.message; }

      try {
        const sample = await env.DB.prepare('SELECT c.id, c.buyer_id, c.seller_id, c.business_id, c.last_message, c.last_message_at FROM conversations ORDER BY c.id DESC LIMIT 3').all();
        tableInfo.sample_conversations = sample.results;
      } catch(e) { tableInfo.sample_error = e.message; }

      try {
        const convInfo = await env.DB.prepare("PRAGMA table_info(conversations)").all();
        tableInfo.conversations_columns = convInfo.results.map(r => r.name);
      } catch(e) { tableInfo.columns_error = e.message; }

      return new Response(JSON.stringify({ debug: tableInfo, user_role: user.role }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── If conversation_id provided, return messages ─────────
    const conversationId = params.get('conversation_id');
    if (conversationId) {
      const convId = parseInt(conversationId);
      if (!convId) {
        return new Response(JSON.stringify({ error: 'ID inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get conversation info
      const conv = await env.DB.prepare(`
        SELECT c.*,
               b.title as business_title, b.slug as business_slug,
               ub.name as buyer_name, ub.email as buyer_email,
               us.name as seller_name, us.email as seller_email
        FROM conversations c
        LEFT JOIN businesses b ON c.business_id = b.id
        LEFT JOIN users ub ON c.buyer_id = ub.id
        LEFT JOIN users us ON c.seller_id = us.id
        WHERE c.id = ?
      `).bind(convId).first();

      if (!conv) {
        return new Response(JSON.stringify({ error: 'Conversación no encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get all messages (LEFT JOIN to include anonymous sender_id=0)
      const msgs = await env.DB.prepare(`
        SELECT m.id, m.sender_id, m.content, m.is_read, m.created_at,
               u.name as sender_name
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
      `).bind(convId).all();

      // Detect if this is a product comment conversation
      const isComment = (conv.last_message || '').startsWith('[COMENTARIO]');

      return new Response(JSON.stringify({
        conversation: {
          id: conv.id,
          business_id: conv.business_id,
          business_title: conv.business_title,
          business_slug: conv.business_slug,
          is_comment,
          buyer: { id: conv.buyer_id, name: conv.buyer_id === 0 ? 'Anonimo' : (conv.buyer_name || 'Anonimo'), email: conv.buyer_email },
          seller: { id: conv.seller_id, name: conv.seller_name, email: conv.seller_email },
          created_at: conv.created_at,
          last_message_at: conv.last_message_at,
          message_count: msgs.results.length,
        },
        messages: msgs.results.map(m => ({
          id: m.id,
          sender_id: m.sender_id,
          sender_name: m.sender_name || (m.sender_id === 0 ? 'Anonimo' : 'Usuario'),
          content: m.content,
          is_read: m.is_read,
          created_at: m.created_at,
        })),
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── List all conversations with search and filter ────────
    const search = params.get('search') || '';
    const filterType = params.get('filter') || 'all'; // all | comment | business
    const page = parseInt(params.get('page')) || 1;
    const limit = Math.min(parseInt(params.get('limit')) || 20, 50);
    const offset = (page - 1) * limit;

    const conditions = [];
    const bindings = [];

    // Filter by source type
    if (filterType === 'comment') {
      conditions.push(`c.last_message LIKE '[COMENTARIO]%'`);
    } else if (filterType === 'business') {
      conditions.push(`(c.last_message IS NULL OR c.last_message NOT LIKE '[COMENTARIO]%')`);
    }

    if (search) {
      conditions.push(`(
        ub.name LIKE ? OR us.name LIKE ? OR
        ub.email LIKE ? OR us.email LIKE ? OR
        b.title LIKE ? OR c.last_message LIKE ?
      )`);
      const s = `%${search}%`;
      bindings.push(s, s, s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Simple count (no joins needed for counting)
    let total = 0;
    try {
      if (conditions.length === 0) {
        const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM conversations').first();
        total = countResult ? countResult.total : 0;
      } else {
        const countResult = await env.DB.prepare(`
          SELECT COUNT(*) as total FROM conversations c
          LEFT JOIN users ub ON c.buyer_id = ub.id
          LEFT JOIN users us ON c.seller_id = us.id
          LEFT JOIN businesses b ON c.business_id = b.id
          ${whereClause}
        `).bind(...bindings).first();
        total = countResult ? countResult.total : 0;
      }
    } catch (e) {
      // Fallback simple count
      try {
        const cr = await env.DB.prepare('SELECT COUNT(*) as total FROM conversations').first();
        total = cr ? cr.total : 0;
      } catch (e2) { total = 0; }
    }

    // Fetch conversations (NULLS LAST not supported in SQLite, use COALESCE instead)
    let conversations = { results: [] };
    try {
      conversations = await env.DB.prepare(`
        SELECT c.id, c.business_id, c.buyer_id, c.seller_id,
               c.last_message, c.last_message_at, c.created_at,
               c.buyer_unread, c.seller_unread,
               b.title as business_title, b.slug as business_slug,
               ub.name as buyer_name, ub.email as buyer_email,
               us.name as seller_name, us.email as seller_email,
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
        FROM conversations c
        LEFT JOIN users ub ON c.buyer_id = ub.id
        LEFT JOIN users us ON c.seller_id = us.id
        LEFT JOIN businesses b ON c.business_id = b.id
        ${whereClause}
        ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
        LIMIT ? OFFSET ?
      `).bind(...bindings, limit, offset).all();
    } catch (e) {
      // Fallback: simpler query without optional columns
      try {
        conversations = await env.DB.prepare(`
          SELECT c.id, c.business_id, c.buyer_id, c.seller_id,
                 c.last_message, c.last_message_at, c.created_at,
                 b.title as business_title, b.slug as business_slug,
                 ub.name as buyer_name, ub.email as buyer_email,
                 us.name as seller_name, us.email as seller_email,
                 (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
          FROM conversations c
          LEFT JOIN users ub ON c.buyer_id = ub.id
          LEFT JOIN users us ON c.seller_id = us.id
          LEFT JOIN businesses b ON c.business_id = b.id
          ORDER BY c.id DESC
          LIMIT ? OFFSET ?
        `).bind(limit, offset).all();
      } catch (e2) {
        // Last resort: bare minimum query
        try {
          conversations = await env.DB.prepare('SELECT c.*, (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count FROM conversations c ORDER BY c.id DESC LIMIT ? OFFSET ?').bind(limit, offset).all();
        } catch (e3) { /* give up */ }
      }
    }

    // Stats
    let allTotal = total;
    let commentTotal = 0;
    let pcTotal = 0;
    try {
      const allCountResult = await env.DB.prepare('SELECT COUNT(*) as total FROM conversations').first();
      allTotal = allCountResult ? allCountResult.total : 0;
      const commentCountResult = await env.DB.prepare("SELECT COUNT(*) as total FROM conversations WHERE last_message LIKE '[COMENTARIO]%'").first();
      commentTotal = commentCountResult ? commentCountResult.total : 0;
      const pcCountResult = await env.DB.prepare('SELECT COUNT(*) as total FROM product_comments').first();
      pcTotal = pcCountResult ? pcCountResult.total : 0;
    } catch (e) {}

    // Also fetch product_comments that don't have a conversation (orphan comments)
    let orphanComments = [];
    if (filterType === 'all' || filterType === 'comment') {
      try {
        const pcFilter = search
          ? 'AND (u.name LIKE ? OR p.name LIKE ? OR pc.content LIKE ?)'
          : '';
        const pcBindings = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

        orphanComments = await env.DB.prepare(`
          SELECT pc.id, pc.content, pc.created_at,
                 pc.product_id, pc.user_id as buyer_id,
                 0 as seller_id, pc.product_id as business_id,
                 p.name as product_name, p.business_id as real_business_id,
                 b.title as business_title, b.slug as business_slug,
                 u.name as buyer_name, u.email as buyer_email,
                 1 as message_count,
                 '[COMENTARIO] ' || pc.content as last_message,
                 pc.created_at as last_message_at
          FROM product_comments pc
          LEFT JOIN products p ON pc.product_id = p.id
          LEFT JOIN businesses b ON p.business_id = b.id
          LEFT JOIN users u ON pc.user_id = u.id
          WHERE 1=1 ${pcFilter}
          ORDER BY pc.created_at DESC
          LIMIT 20
        `).bind(...pcBindings).all();
        orphanComments = (orphanComments.results || []).map(c => ({
          ...c,
          business_id: c.real_business_id || c.business_id,
          seller_name: null,
          seller_email: null,
        }));
      } catch (e) { /* ignore */ }
    }

    // Merge: conversations + orphan comments (conversations first, then orphan by date)
    const allConvs = [...(conversations.results || []), ...orphanComments];
    // Sort merged results by date
    allConvs.sort((a, b) => {
      const da = a.last_message_at || a.created_at || '';
      const db = b.last_message_at || b.created_at || '';
      return db.localeCompare(da);
    });
    // Paginate merged results
    const paginatedConvs = allConvs.slice(offset, offset + limit);
    const mergedTotal = allConvs.length;

    return new Response(JSON.stringify({
      conversations: paginatedConvs,
      pagination: { page, limit, total: mergedTotal, totalPages: Math.ceil(mergedTotal / limit) || 1 },
      stats: { total_conversations: total, all_conversations: allTotal, comment_conversations: commentTotal + pcTotal, business_conversations: allTotal - commentTotal, product_comments_total: pcTotal },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Admin chat-logs error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor: ' + error.message, debug: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}