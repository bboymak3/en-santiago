#!/usr/bin/env python3
"""Fix all OG/meta tags to use absolute URLs, fix PWA manifest, fix all pages."""
import os, re, glob

BASE = "https://holax.com.ve"

count = 0
for f in glob.glob('/home/z/my-project/*.html'):
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    original = content

    # Fix og:image — must be absolute URL
    content = re.sub(
        r'<meta\s+property="og:image"\s+content="[^"]*"',
        f'<meta property="og:image" content="{BASE}/images/logoprincipal.jpeg"',
        content
    )

    # Fix og:url — use absolute URL with actual page path
    # Get the filename for this page
    fname = os.path.basename(f)
    page_url = BASE + '/' + fname
    if fname == 'index.html':
        page_url = BASE + '/'
    content = re.sub(
        r'<meta\s+property="og:url"\s+content="[^"]*"',
        f'<meta property="og:url" content="{page_url}"',
        content
    )

    # Fix twitter:image — must be absolute URL
    content = re.sub(
        r'<meta\s+name="twitter:image"\s+content="[^"]*"',
        f'<meta name="twitter:image" content="{BASE}/images/logoprincipal.jpeg"',
        content
    )

    # Ensure og:site_name exists
    if 'og:site_name' not in content:
        content = content.replace(
            '<meta property="og:type"',
            '<meta property="og:site_name" content="HOLAX">\n    <meta property="og:type"'
        , 1)

    # Ensure og:locale
    if 'og:locale' not in content:
        content = content.replace(
            '<meta property="og:type"',
            '<meta property="og:locale" content="es_VE">\n    <meta property="og:type"'
        , 1)

    # Fix manifest link to use absolute path
    content = content.replace(
        'href="/manifest.json"',
        f'href="{BASE}/manifest.json"'
    )

    # Fix apple-touch-icon to absolute
    content = content.replace(
        'href="/images/PWA.jpeg"',
        f'href="{BASE}/images/PWA.jpeg"'
    )

    # Fix favicon to absolute
    content = content.replace(
        'href="/images/favicon.jpeg"',
        f'href="{BASE}/images/favicon.jpeg"'
    )

    # Ensure twitter:title and twitter:description exist
    if 'twitter:title' not in content:
        title_match = re.search(r'<meta\s+property="og:title"\s+content="([^"]*)"', content)
        if title_match:
            content = content.replace(
                '<meta name="twitter:card"',
                f'<meta name="twitter:title" content="{title_match.group(1)}">\n    <meta name="twitter:card"'
            , 1)
    
    if 'twitter:description' not in content:
        desc_match = re.search(r'<meta\s+property="og:description"\s+content="([^"]*)"', content)
        if desc_match:
            content = content.replace(
                '<meta name="twitter:card"',
                f'<meta name="twitter:description" content="{desc_match.group(1)}">\n    <meta name="twitter:card"'
            , 1)

    if content != original:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(content)
        count += 1
        print(f'  {os.path.basename(f)}')

print(f'\nFixed {count} files')