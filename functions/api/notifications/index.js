// functions/api/notifications/index.js
// GET: List notifications for logged-in user (with unread count)
// POST: Create notification (admin only)
// PATCH: Mark notifications as read / mark all / update settings
// DELETE: Delete notification (own) or all (admin)
// GET ?action=unread_count — just the unread badge count
// GET ?action=settings — get notification settings (admin only)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

async function requireAuth(request, env) {
  const jwtSecret = env.JWT_SECRET || 'aunclick_jwt_secret_2024_secure';
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyJWT(token, jwtSecret);
}

// ─── GET: Notifications list / unread count / settings ──────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const user = await requireAuth(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // ── Unread count only (lightweight for polling) ──
    if (action === 'unread_count') {
      const row = await env.DB.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
        .bind(user.id).first();
      return new Response(JSON.stringify({ count: row?.count || 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Settings (admin only) ──
    if (action === 'settings') {
      if (user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Solo admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const settings = await env.DB.prepare('SELECT key, value FROM admin_settings WHERE key IN (?, ?, ?)')
        .bind('notifications_enabled', 'notify_all_users', 'notify_admin_only').all();
      const map = {};
      (settings.results || []).forEach(r => { map[r.key] = r.value; });
      return new Response(JSON.stringify({ settings: map }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Full notifications list ──
    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
    const limit = Math.min(50, parseInt(url.searchParams.get('limit')) || 20);
    const unreadOnly = url.searchParams.get('unread') === '1';
    const viewAll = url.searchParams.get('all') === '1' && user.role === 'admin';
    const offset = (page - 1) * limit;

    let where, bindings;
    if (viewAll) {
      // Admin can see all notifications in the system
      where = unreadOnly ? 'WHERE is_read = 0' : 'WHERE 1=1';
      bindings = [];
    } else {
      where = 'WHERE user_id = ?';
      bindings = [user.id];
      if (unreadOnly) {
        where += ' AND is_read = 0';
      }
    }

    const countRow = await env.DB.prepare(`SELECT COUNT(*) as total FROM notifications ${where}`)
      .bind(...bindings).first();
    const total = countRow?.total || 0;

    const notifications = await env.DB.prepare(
      `SELECT id, ${viewAll ? 'user_id,' : ''} type, title, message, link, is_read, created_at
       FROM notifications ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...bindings, limit, offset).all();

    const unreadCount = await env.DB.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
      .bind(user.id).first();

    return new Response(JSON.stringify({
      notifications: notifications.results || [],
      total,
      unread_count: unreadCount?.count || 0,
      page,
      limit
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ─── POST: Create notification (admin only) ─────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const user = await requireAuth(request, env);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo admin puede crear notificaciones' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const { target_user_ids, type, title, message, link } = body;

    if (!title) {
      return new Response(JSON.stringify({ error: 'Título requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // target_user_ids: array of user IDs, or "all" for all users
    let inserted = 0;
    if (target_user_ids === 'all') {
      const users = await env.DB.prepare('SELECT id FROM users WHERE is_active = 1').all();
      if (users.results && users.results.length > 0) {
        const stmts = users.results.map(u =>
          env.DB.prepare('INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)')
            .bind(u.id, type || 'custom', title, message || '', link || null)
        );
        await env.DB.batch(stmts);
        inserted = users.results.length;
      }
    } else if (Array.isArray(target_user_ids) && target_user_ids.length > 0) {
      const stmts = target_user_ids.map(uid =>
        env.DB.prepare('INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)')
          .bind(uid, type || 'custom', title, message || '', link || null)
      );
      await env.DB.batch(stmts);
      inserted = target_user_ids.length;
    } else {
      return new Response(JSON.stringify({ error: 'target_user_ids requerido (array o "all")' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: 'Notificación enviada', inserted }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ─── PATCH: Mark as read / mark all / update settings ────────────
export async function onRequestPatch(context) {
  try {
    const { request, env } = context;
    const user = await requireAuth(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const { action, notification_id, settings } = body;

    // ── Mark single as read ──
    if (action === 'mark_read' && notification_id) {
      await env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
        .bind(notification_id, user.id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Mark all as read ──
    if (action === 'mark_all_read') {
      await env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
        .bind(user.id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Update notification settings (admin only) ──
    if (action === 'update_settings') {
      if (user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Solo admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!settings || typeof settings !== 'object') {
        return new Response(JSON.stringify({ error: 'settings object requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const allowedKeys = ['notifications_enabled', 'notify_all_users', 'notify_admin_only'];
      for (const key of allowedKeys) {
        if (key in settings) {
          await env.DB.prepare("INSERT INTO admin_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?")
            .bind(key, String(settings[key]), String(settings[key])).run();
        }
      }
      return new Response(JSON.stringify({ success: true, message: 'Configuración actualizada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Acción no reconocida. Usar: mark_read, mark_all_read, update_settings' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ─── DELETE: Delete notification(s) ────────────────────────────
export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const user = await requireAuth(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const deleteAll = url.searchParams.get('all') === '1';

    // Admin can delete any notification (single or all)
    if (user.role === 'admin') {
      if (deleteAll) {
        await env.DB.prepare('DELETE FROM notifications').run();
        return new Response(JSON.stringify({ success: true, message: 'Todas las notificaciones eliminadas' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (id) {
        await env.DB.prepare('DELETE FROM notifications WHERE id = ?').bind(parseInt(id)).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Especificar id o all=1' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Regular user can only delete their own
    if (id) {
      await env.DB.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').bind(parseInt(id), user.id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
