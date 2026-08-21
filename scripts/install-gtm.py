#!/usr/bin/env python3
"""Install Google Tag Manager on all HTML and SSR template files."""

import re, os, glob

GTM_HEAD = '''<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TMH9V9QQ');</script>
<!-- End Google Tag Manager -->'''

GTM_BODY = '''<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TMH9V9QQ"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->'''

BASE = '/home/z/my-project'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Skip if GTM already installed
    if 'GTM-TMH9V9QQ' in content:
        print(f'  SKIP (already has GTM): {os.path.basename(filepath)}')
        return False
    
    modified = False
    
    # Insert in <head> - after the first meta or title tag, or at start of head
    head_match = re.search(r'(<head[^>]*>)', content)
    if head_match:
        # Insert right after <head> opening tag
        pos = head_match.end()
        content = content[:pos] + '\n' + GTM_HEAD + content[pos:]
        modified = True
    
    # Insert after <body> opening tag
    body_match = re.search(r'(<body[^>]*>)', content)
    if body_match:
        pos = body_match.end()
        content = content[:pos] + '\n' + GTM_BODY + content[pos:]
        modified = True
    
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  ✅ {os.path.basename(filepath)}')
        return True
    else:
        print(f'  ⚠️  No head/body found: {os.path.basename(filepath)}')
        return False

# Static HTML files (skip admin pages - GTM not needed there)
html_files = sorted(glob.glob(os.path.join(BASE, '*.html')))
# Filter out admin-only pages
skip_files = ['admin.html', 'admin-chat.html', 'admin-edit-business.html', 'admin-vendedores.html', 'index_full.html']

print('=== Static HTML files ===')
for f in html_files:
    basename = os.path.basename(f)
    if basename in skip_files:
        print(f'  SKIP (admin/internal): {basename}')
        continue
    process_file(f)

# SSR template files
ssr_files = [
    os.path.join(BASE, 'functions/_lib/render-business.js'),
    os.path.join(BASE, 'functions/_lib/render-product.js'),
    os.path.join(BASE, 'functions/categoria/[slug].js'),
    os.path.join(BASE, 'functions/estado/[slug].js'),
    os.path.join(BASE, 'functions/web/[slug].js'),
]

print('\n=== SSR template files ===')
for f in ssr_files:
    if os.path.exists(f):
        process_file(f)
    else:
        print(f'  NOT FOUND: {f}')

print('\nDone!')
