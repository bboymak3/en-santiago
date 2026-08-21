#!/usr/bin/env python3
"""Patch existing API files for subscription system"""

import re

REPO = '/tmp/meridaunclick'

# 1. Patch login.js - add plan info to response
login_path = f'{REPO}/functions/api/auth/login.js'
with open(login_path, 'r') as f:
    content = f.read()

old_login_resp = """return new Response(JSON.stringify({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
    }), {"""

new_login_resp = """// Determine premium status
    let isPremium = user.role === 'admin' || user.role === 'user_premium';
    if (user.plan && user.plan_expires_at && new Date(user.plan_expires_at) > new Date()) {
      isPremium = true;
    }

    return new Response(JSON.stringify({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        account_type: user.account_type || 'free',
        plan: user.plan,
        plan_expires_at: user.plan_expires_at,
        is_premium: isPremium,
      },
    }), {"""

content = content.replace(old_login_resp, new_login_resp)
with open(login_path, 'w') as f:
    f.write(content)
print("Patched login.js")

# 2. Patch businesses GET - add owner_role and owner_account_type
biz_path = f'{REPO}/functions/api/businesses/index.js'
with open(biz_path, 'r') as f:
    content = f.read()

old_biz_select = """u.avatar as owner_avatar,
        (SELECT url FROM images WHERE business_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,"""

new_biz_select = """u.avatar as owner_avatar,
        u.role as owner_role,
        u.account_type as owner_account_type,
        (SELECT url FROM images WHERE business_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,"""

content = content.replace(old_biz_select, new_biz_select)
with open(biz_path, 'w') as f:
    f.write(content)
print("Patched businesses/index.js - added owner_role")

# 3. Patch marketplace GET - add owner_role, owner_account_type, expires_at
mp_path = f'{REPO}/functions/api/marketplace/index.js'
with open(mp_path, 'r') as f:
    content = f.read()

# Patch admin mode query
old_mp_admin = """query = `
        SELECT p.id, p.name, p.price, p.category, p.image, p.description, p.sort_order,
               p.user_id, p.business_id, p.status, p.created_at, p.updated_at,
               u.name as owner_name, u.email as owner_email, b.title as business_name
        FROM products p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN businesses b ON p.business_id = b.id
        ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;"""

new_mp_admin = """query = `
        SELECT p.id, p.name, p.price, p.category, p.image, p.description, p.sort_order,
               p.user_id, p.business_id, p.status, p.created_at, p.updated_at,
               p.expires_at,
               u.name as owner_name, u.email as owner_email, u.role as owner_role,
               b.title as business_name
        FROM products p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN businesses b ON p.business_id = b.id
        ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;"""

content = content.replace(old_mp_admin, new_mp_admin)

# Patch public query
old_mp_public = """query = `
        SELECT p.id, p.name, p.price, p.category, p.image, p.description, p.sort_order,
               p.user_id, p.business_id, p.status, p.created_at, p.updated_at, p.slug,
               b.title as business_name, b.slug as business_slug,
               b.city as business_city, b.state as business_state,
               b.phone as business_phone, b.whatsapp as business_whatsapp
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;"""

new_mp_public = """query = `
        SELECT p.id, p.name, p.price, p.category, p.image, p.description, p.sort_order,
               p.user_id, p.business_id, p.status, p.created_at, p.updated_at, p.slug,
               p.expires_at,
               u.role as owner_role, u.account_type as owner_account_type,
               b.title as business_name, b.slug as business_slug,
               b.city as business_city, b.state as business_state,
               b.phone as business_phone, b.whatsapp as business_whatsapp
        FROM products p
        LEFT JOIN users b ON p.business_id = b.id
        LEFT JOIN users u ON p.user_id = u.id
        ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;"""

content = content.replace(old_mp_public, new_mp_public)
with open(mp_path, 'w') as f:
    f.write(content)
print("Patched marketplace/index.js - added owner_role, expires_at")

# 4. Patch users GET - include plan info
users_path = f'{REPO}/functions/api/users/index.js'
with open(users_path, 'r') as f:
    content = f.read()

old_users_select = """let query = 'SELECT id, name, email, phone, whatsapp, bio, role, avatar, is_active, created_at, updated_at FROM users WHERE 1=1';"""

new_users_select = """let query = 'SELECT id, name, email, phone, whatsapp, bio, role, avatar, is_active, created_at, updated_at, account_type, plan, plan_starts_at, plan_expires_at, seller_owner_id FROM users WHERE 1=1';"""

content = content.replace(old_users_select, new_users_select)
with open(users_path, 'w') as f:
    f.write(content)
print("Patched users/index.js - added plan fields to GET")

# 5. Patch marketplace POST - set expires_at for free users (7 days)
with open(mp_path, 'r') as f:
    content = f.read()

old_mp_insert = """const result = await env.DB.prepare(`
      INSERT INTO products (name, slug, price, category, image, description, video_url, sort_order, user_id, business_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind("""

new_mp_insert = """// Check if user is premium
    const dbUser = await env.DB.prepare('SELECT account_type, plan, plan_expires_at FROM users WHERE id = ?').bind(user.id).first();
    let isUserPremium = false;
    if (dbUser) {
      if (user.role === 'admin' || user.role === 'user_premium') isUserPremium = true;
      if (dbUser.plan && dbUser.plan_expires_at && new Date(dbUser.plan_expires_at) > new Date()) isUserPremium = true;
    }

    // Free users: products expire in 7 days
    const expiresAt = isUserPremium ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    const result = await env.DB.prepare(`
      INSERT INTO products (name, slug, price, category, image, description, video_url, sort_order, user_id, business_id, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind("""

content = content.replace(old_mp_insert, new_mp_insert)

# Add expiresAt to the bind
old_mp_bind_end = """body.sort_order !== undefined ? parseInt(body.sort_order) : 0,
      user.id,
      businessId
    ).run();"""

new_mp_bind_end = """body.sort_order !== undefined ? parseInt(body.sort_order) : 0,
      user.id,
      businessId,
      expiresAt
    ).run();"""

content = content.replace(old_mp_bind_end, new_mp_bind_end)
with open(mp_path, 'w') as f:
    f.write(content)
print("Patched marketplace/index.js - added expires_at for free users on POST")

print("\nAll patches applied successfully!")