#!/usr/bin/env python3
"""Add logo image to navbar in all HTML files, replacing the fa-store icon."""
import os, re, glob

LOGO_HTML = '<img src="images/logoprincipal.jpeg" alt="HOLAX" style="height:32px;width:auto;border-radius:6px;margin-right:4px;">'

# Pattern: inside nav-logo, replace <i class="fas fa-store"></i> with logo img
pattern = re.compile(
    r'(<a\s+href="index\.html"\s+class="nav-logo">\s*)<i\s+class="fas fa-store"></i>(\s*<span\s+class="brand-name")',
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

print(f'\nUpdated {count} files with navbar logo')