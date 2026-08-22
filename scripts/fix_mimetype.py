#!/usr/bin/env python3
"""Fix type="image/jpeg" to type="image/webp" where href points to .webp"""

import os
import glob

REPO = "/home/z/my-project/llanocar"
total = 0

for html_path in glob.glob(os.path.join(REPO, "**", "*.html"), recursive=True):
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    # Fix: type="image/jpeg" href="...webp" -> type="image/webp"
    content = content.replace('type="image/jpeg" href="', 'type="image/webp" href="')

    if content != original:
        count = content.count('type="image/webp"') - original.count('type="image/webp"')
        total += count
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(content)

print(f"Corregidos type image/jpeg -> image/webp: {total} en archivos HTML")