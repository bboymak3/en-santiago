#!/usr/bin/env python3
"""Verify no broken .jpg references remain for converted images."""

import os
import glob
import re

REPO = "/home/z/my-project/llanocar"
IMAGES_DIR = os.path.join(REPO, "images")

# Get existing jpg files in images/
existing_jpgs = set(f for f in os.listdir(IMAGES_DIR) if f.lower().endswith(".jpg"))
# Get existing webp files
existing_webp = set(f for f in os.listdir(IMAGES_DIR) if f.endswith(".webp"))

print(f"JPGs restantes en images/: {len(existing_jpgs)}")
print(f"WebPs en images/: {len(existing_webp)}")

# Find all .jpg references in HTML
jpg_refs = set()
for html_path in glob.glob(os.path.join(REPO, "**", "*.html"), recursive=True):
    with open(html_path, "r", encoding="utf-8") as f:
        for line in f:
            # Extract filenames from URLs
            for match in re.finditer(r'([\w\-]+\.jpg)', line, re.IGNORECASE):
                jpg_refs.add(match.group(1).lower())

print(f"\nReferencias .jpg en HTML: {len(jpg_refs)}")

# Check which referenced JPGs don't exist as files
broken = []
for ref in sorted(jpg_refs):
    if ref not in existing_jpgs and ref.replace(".jpg", ".webp") in existing_webp:
        broken.append(ref)
    elif ref not in existing_jpgs:
        broken.append(f"{ref} (NO webp either!)")

if broken:
    print(f"\n⚠️ Referencias .jpg a archivos que ya no existen como JPG ({len(broken)}):")
    for b in broken[:20]:
        print(f"  - {b}")
else:
    print("\n✅ Todas las referencias .jpg apuntan a archivos que existen!")

# Also check for any remaining .jpg refs that COULD be webp
potentially_convertible = []
for ref in sorted(jpg_refs):
    basename = ref.replace(".jpg", "")
    if basename + ".webp" in existing_webp and ref in existing_jpgs:
        potentially_convertible.append(ref)

if potentially_convertible:
    print(f"\nℹ️ JPGs que existen como archivo PERO también tienen versión webp ({len(potentially_convertible)}):")
    for p in potentially_convertible[:10]:
        print(f"  - {p}")
    print("  (Estos son correctos - el .webp se usa en HTML, el .jpg queda como backup)")