import { requireAdmin, errorResponse, corsHeaders } from '../../../_lib/auth.js';

// functions/api/debug/chat-status/index.js
// Debug endpoint to check chat tables status (admin only)

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const { error: authError } = await requireAdmin(request, env);
    if (authError) return authError;
    const info = {};

    // Check tables exist
    try {
      const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('conversations','messages','product_comments')").all();
      info.tables = tables.results.map(t => t.name);
    } catch(e) { info.tables_error = e.message; }

    // Conversations count
    try {
      const r = await env.DB.prepare('SELECT COUNT(*) as c FROM conversations').first();
      info.conversations_count = r ? r.c : 0;
    } catch(e) { info.conversations_error = e.message; }

    // Messages count
    try {
      const r = await env.DB.prepare('SELECT COUNT(*) as c FROM messages').first();
      info.messages_count = r ? r.c : 0;
    } catch(e) { info.messages_error = e.message; }

    // Product comments count
    try {
      const r = await env.DB.prepare('SELECT COUNT(*) as c FROM product_comments').first();
      info.product_comments_count = r ? r.c : 0;
    } catch(e) { info.product_comments_error = e.message; }

    // Conversation columns
    try {
      const r = await env.DB.prepare("PRAGMA table_info(conversations)").all();
      info.conversations_columns = r.results.map(c => c.name + ' (' + c.type + ')');
    } catch(e) { info.columns_error = e.message; }

    // Messages columns
    try {
      const r = await env.DB.prepare("PRAGMA table_info(messages)").all();
      info.messages_columns = r.results.map(c => c.name + ' (' + c.type + ')');
    } catch(e) { info.msg_columns_error = e.message; }

    // Sample conversations
    try {
      const r = await env.DB.prepare('SELECT c.id, c.buyer_id, c.seller_id, c.business_id, substr(c.last_message,1,80) as last_msg, c.last_message_at FROM conversations ORDER BY c.id DESC LIMIT 5').all();
      info.sample_conversations = r.results;
    } catch(e) { info.sample_error = e.message; }

    // Sample messages
    try {
      const r = await env.DB.prepare('SELECT m.id, m.conversation_id, m.sender_id, substr(m.content,1,80) as content, m.created_at FROM messages ORDER BY m.id DESC LIMIT 5').all();
      info.sample_messages = r.results;
    } catch(e) { info.sample_msgs_error = e.message; }

    // Test the actual admin query
    try {
      const r = await env.DB.prepare(`
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
        ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
        LIMIT 5 OFFSET 0
      `).all();
      info.admin_query_ok = true;
      info.admin_query_results = r.results.length;
      info.admin_query_sample = r.results;
    } catch(e) {
      info.admin_query_ok = false;
      info.admin_query_error = e.message;
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Chat Debug - HolaX</title>
<style>
body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;max-width:900px;margin:auto;}
h1{color:#00d4ff;border-bottom:2px solid #00d4ff;padding-bottom:10px;}
h2{color:#f59e0b;margin-top:24px;}
pre{background:#0d1117;border:1px solid #333;border-radius:8px;padding:14px;overflow-x:auto;font-size:0.85rem;line-height:1.6;}
.ok{color:#25d366;font-weight:bold;}
.err{color:#dc2626;font-weight:bold;}
.warn{color:#f59e0b;}
</style></head><body>
<h1>Chat Debug - HolaX</h1>
<p>Estado de tablas y datos de chat en la base de datos</p>

<h2>1. Tablas</h2>
<pre>${info.tables && info.tables.length > 0
  ? info.tables.map(t => '<span class="ok">&#10003; ' + t + '</span>').join('\n')
  : '<span class="err">&#10007; No se encontraron tablas de chat</span>' + (info.tables_error ? '\nError: ' + info.tables_error : '')}
</pre>

<h2>2. Conteos</h2>
<pre>Conversaciones: <strong>${info.conversations_count !== undefined ? info.conversations_count : '<span class="err">Error: ' + (info.conversations_error||'') + '</span>'}</strong>
Mensajes:       <strong>${info.messages_count !== undefined ? info.messages_count : '<span class="err">Error: ' + (info.messages_error||'') + '</span>'}</strong>
Comentarios:    <strong>${info.product_comments_count !== undefined ? info.product_comments_count : '<span class="err">Error: ' + (info.product_comments_error||'') + '</span>'}</strong>
</pre>

<h2>3. Columnas de conversations</h2>
<pre>${info.conversations_columns ? info.conversations_columns.join('\n') : '<span class="err">' + (info.columns_error||'No disponible') + '</span>'}</pre>

<h2>4. Columnas de messages</h2>
<pre>${info.messages_columns ? info.messages_columns.join('\n') : '<span class="err">' + (info.msg_columns_error||'No disponible') + '</span>'}</pre>

<h2>5. Query Admin (prueba real)</h2>
<pre>${info.admin_query_ok
  ? '<span class="ok">&#10003; Query ejecutado correctamente</span>\nResultados: ' + info.admin_query_results
  : '<span class="err">&#10007; Query fallo: ' + (info.admin_query_error||'') + '</span>'}
</pre>

${info.admin_query_ok && info.admin_query_results > 0 ? `
<h2>6. Muestra del query admin</h2>
<pre>${JSON.stringify(info.admin_query_sample, null, 2)}</pre>` : `
<h2 class="warn">6. Sin datos en conversaciones</h2>
<p>No hay conversaciones en la base de datos. Los chats apareceran cuando:</p>
<ul>
  <li>Alguien use el chat flotante para contactar a un vendedor</li>
  <li>Alguien deje un comentario en un producto (se crea conversacion automatica)</li>
</ul>`}

${info.sample_conversations && info.sample_conversations.length > 0 ? `
<h2>7. Ultimas conversaciones (raw)</h2>
<pre>${JSON.stringify(info.sample_conversations, null, 2)}</pre>` : ''}

${info.sample_messages && info.sample_messages.length > 0 ? `
<h2>8. Ultimos mensajes (raw)</h2>
<pre>${JSON.stringify(info.sample_messages, null, 2)}</pre>` : ''}

</body></html>`;

    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    return new Response('<h1>Error</h1><pre>' + error.message + '</pre>', { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}