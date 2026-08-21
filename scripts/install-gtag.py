#!/usr/bin/env python3
"""Install Google Analytics (gtag.js G-RYF2N8ZD15) after GTM in all pages that have GTM."""

import os
import re

GTAG_SNIPPET = '''<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-RYF2N8ZD15"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-RYF2N8ZD15');
</script>'''

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Files with GTM installed (from previous install-gtm.py run)
FILES = [
    'index.html',
    'search.html',
    'business.html',
    'new-business.html',
    'map.html',
    'dashboard.html',
    'login.html',
    'planes.html',
    'contacto.html',
    'quienes-somos.html',
    'privacidad.html',
    'mision-vision.html',
    'marketplace.html',
    'empleo.html',
    'properties.html',
    'new-property.html',
    'property-detail.html',
    'eventos.html',
    'emergencia.html',
    'entretenimiento.html',
    'reservas.html',
    'cupones.html',
    'seller.html',
    'clientes-satisfechos.html',
    'eliminacion-datos.html',
    'functions/_lib/render-business.js',
    'functions/_lib/render-product.js',
    'functions/categoria/[slug].js',
    'functions/estado/[slug].js',
    'functions/web/[slug].js',
]

# Skip the install script itself
GTMarker = '<!-- End Google Tag Manager -->'

updated = 0
skipped = 0
errors = 0

for rel_path in FILES:
    full_path = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(full_path):
        print(f'  SKIP (not found): {rel_path}')
        skipped += 1
        continue

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already has G-RYF2N8ZD15
    if 'G-RYF2N8ZD15' in content:
        print(f'  SKIP (already has gtag): {rel_path}')
        skipped += 1
        continue

    # Check if GTM end marker exists
    if GTMarker not in content:
        print(f'  ERROR (no GTM end marker): {rel_path}')
        errors += 1
        continue

    # Insert gtag.js right after <!-- End Google Tag Manager -->
    new_content = content.replace(GTMarker, GTMarker + '\n' + GTAG_SNIPPET, 1)

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f'  OK: {rel_path}')
    updated += 1

print(f'\n=== Summary ===')
print(f'Updated: {updated}')
print(f'Skipped: {skipped}')
print(f'Errors:  {errors}')
print(f'Total:   {len(FILES)}')
