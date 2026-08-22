#!/usr/bin/env python3
"""Patch business-detail.js to pass owner_role/owner_type to WhatsApp button"""

path = '/tmp/meridaunclick/js/business-detail.js'
with open(path, 'r') as f:
    content = f.read()

old = """    const mainWhatsApp = document.getElementById('mainWhatsApp');
    if (mainWhatsApp) {
        const waNumber = b.whatsapp || b.phone || b.owner_whatsapp || '';
        if (waNumber) {
            const cleanNumber = waNumber.replace(/[^0-9+]/g, '');
            const msg = encodeURIComponent(`Hola, vi tu negocio "${b.title}" en Un Click y me interesa saber más.`);
            mainWhatsApp.href = `https://wa.me/${cleanNumber}?text=${msg}`;
            mainWhatsApp.style.display = '';
        } else {
            mainWhatsApp.style.display = 'none';
        }
    }"""

new = """    const mainWhatsApp = document.getElementById('mainWhatsApp');
    if (mainWhatsApp) {
        // Pass owner info for subscription gating
        mainWhatsApp.dataset.ownerRole = b.owner_role || 'user';
        mainWhatsApp.dataset.ownerType = b.owner_account_type || 'free';

        const waNumber = b.whatsapp || b.phone || b.owner_whatsapp || '';
        if (waNumber) {
            const cleanNumber = waNumber.replace(/[^0-9+]/g, '');
            const msg = encodeURIComponent(`Hola, vi tu negocio "${b.title}" en Un Click y me interesa saber más.`);
            mainWhatsApp.href = `https://wa.me/${cleanNumber}?text=${msg}`;
            mainWhatsApp.style.display = '';
        } else {
            mainWhatsApp.style.display = 'none';
        }
    }"""

content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)

print("Patched business-detail.js with owner_role/owner_type")