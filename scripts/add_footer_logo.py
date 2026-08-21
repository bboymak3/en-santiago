#!/usr/bin/env python3
"""Add logo image to footer in all HTML files, replacing the fa-store icon in footer-logo."""
import os, re, glob

LOGO_HTML = '<img src="images/logoprincipal.jpeg" alt="HOLAX" style="height:28px;width:auto;border-radius:6px;margin-right:6px;">'

# Pattern: footer-logo with fa-store
pattern = re.compile(
    r'(<a\s+href="index\.html"\s+class="footer-logo">\s*)<i\s+class="fas fa-store"></i>(\s*<span>)',
    re.DOTALL
)

count = 0
for f in glob.glob('/home/z/my-project/*.html'):
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    new_content = pattern.sub(r'\1' + LOGO_HTML + r'\2', content)
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(new_content)
        count += 1
        print(f'  Updated {os.path.basename(f)}')

print(f'\nUpdated {count} files with footer logo')