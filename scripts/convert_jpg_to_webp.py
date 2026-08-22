#!/usr/bin/env python3
"""Convert all JPG images in /home/z/my-project/llanocar/images/ (root only) to WebP."""

import os
from PIL import Image

IMAGES_DIR = "/home/z/my-project/llanocar/images"

converted = 0
skipped = 0
errors = []
total_saved = 0

for fname in sorted(os.listdir(IMAGES_DIR)):
    if not fname.lower().endswith((".jpg", ".jpeg")):
        continue

    src = os.path.join(IMAGES_DIR, fname)
    dst = os.path.join(IMAGES_DIR, os.path.splitext(fname)[0] + ".webp")

    try:
        with Image.open(src) as img:
            # Convert RGBA to RGB if necessary (WebP supports both, but simpler as RGB for photos)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            elif img.mode != "RGB":
                img = img.convert("RGB")

            img.save(dst, "webp", quality=80, method=4)

        original_size = os.path.getsize(src)
        new_size = os.path.getsize(dst)
        saved = original_size - new_size
        total_saved += saved
        pct = (saved / original_size) * 100 if original_size > 0 else 0

        converted += 1
        if converted <= 10 or converted % 50 == 0:
            print(f"  [{converted}] {fname} → .webp  ({original_size//1024}KB → {new_size//1024}KB, -{pct:.0f}%)")

    except Exception as e:
        errors.append((fname, str(e)))
        print(f"  ERROR: {fname} → {e}")

print(f"\n{'='*60}")
print(f"Convertidas: {converted}")
print(f"Ahorrado total: {total_saved / 1024 / 1024:.1f} MB")
if errors:
    print(f"Errores: {len(errors)}")
    for f, e in errors[:5]:
        print(f"  - {f}: {e}")