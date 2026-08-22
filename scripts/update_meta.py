#!/usr/bin/env python3
"""Update meta tags and favicon in all HTML files."""
import os, re, glob

DOMAIN = "https://holax.com"

# Common replacements
replacements = [
    # Favicon - add if not exists, replace old ones
    (r'<link\s+rel="[^"]*icon[^"]*"[^>]*>', '<link rel="icon" type="image/jpeg" href="/images/favicon.jpeg">'),
    # Apple touch icon
    (r'<link\s+rel="apple-touch-icon"[^>]*>', '<link rel="apple-touch-icon" href="/images/PWA.jpeg">'),
    # Theme color
    (r'<meta\s+name="theme-color"\s+content="[^"]*">', '<meta name="theme-color" content="#006EE3">'),
    # OG image - add after og:url or og:type
    # We'll handle this separately
]

count = 0
for f in glob.glob('/home/z/my-project/*.html'):
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    original = content
    
    # Add favicon if not already present
    if 'images/favicon.jpeg' not in content:
        # Remove any existing favicon links
        content = re.sub(r'<link\s+rel="[^"]*icon[^"]*"[^>]*>\s*\n?', '', content)
        # Add new favicon after <meta charset>
        content = content.replace(
            '<meta charset="UTF-8">',
            '<meta charset="UTF-8">\n    <link rel="icon" type="image/jpeg" href="/images/favicon.jpeg">'
        , 1)
    
    # Add apple-touch-icon if not present
    if 'apple-touch-icon' not in content:
        content = content.replace(
            '<link rel="manifest"',
            '<link rel="apple-touch-icon" href="/images/PWA.jpeg">\n    <link rel="manifest"'
        , 1)
    
    # Update theme-color
    content = re.sub(
        r'<meta\s+name="theme-color"\s+content="[^"]*">',
        '<meta name="theme-color" content="#006EE3">',
        content
    )
    
    # Add OG image if og: tags exist but no og:image
    if 'og:title' in content and 'og:image' not in content:
        content = content.replace(
            '<meta property="og:url" content="',
            '<meta property="og:image" content="/images/logoprincipal.jpeg">\n    <meta property="og:url" content="'
        , 1)
    
    # Add twitter:image if twitter:card exists but no twitter:image
    if 'twitter:card' in content and 'twitter:image' not in content:
        content = content.replace(
            '<meta name="twitter:card"',
            '<meta name="twitter:image" content="/images/logoprincipal.jpeg">\n    <meta name="twitter:card"'
        , 1)
    elif 'og:title' in content and 'twitter:card' not in content and 'twitter:image' not in content:
        # Add twitter meta tags after og tags
        content = content.replace(
            '</head>',
            '    <meta name="twitter:card" content="summary_large_image">\n    <meta name="twitter:image" content="/images/logoprincipal.jpeg">\n</head>'
        , 1)
    
    # Update og:url domain references
    content = content.replace('https://aunclick.pages.dev', DOMAIN)
    
    if content != original:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(content)
        count += 1
        print(f'  Updated {os.path.basename(f)}')

print(f'\nUpdated {count} files with meta tags')