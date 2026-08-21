#!/usr/bin/env python3
"""Replace all .jpg references with .webp in all HTML files, for images that were converted."""

import os
import glob

REPO = "/home/z/my-project/llanocar"
IMAGES_DIR = os.path.join(REPO, "images")

# Get set of jpg filenames that were converted (without extension)
converted_basenames = set()
for f in os.listdir(IMAGES_DIR):
    if f.endswith(".webp"):
        converted_basenames.add(f.replace(".webp", ""))

print(f"Converted image basenames: {len(converted_basenames)}")

total_changes = 0
files_modified = 0

html_files = glob.glob(os.path.join(REPO, "**", "*.html"), recursive=True)
print(f"HTML files to scan: {len(html_files)}")

for html_path in html_files:
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    modified_content = content
    for basename in sorted(converted_basenames):
        modified_content = modified_content.replace(f"{basename}.jpg", f"{basename}.webp")
        modified_content = modified_content.replace(f"{basename}.JPG", f"{basename}.webp")

    if modified_content != original:
        # Count changes
        diff = sum(1 for a, b in zip(original, modified_content) if a != b)
        changes = diff // 3  # rough: .jpg (4 chars) -> .webp (5 chars), net +1 per change
        total_changes += changes
        files_modified += 1
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(modified_content)

print(f"\nArchivos HTML modificados: {files_modified}")
print(f"Total referencias actualizadas (aprox): {total_changes}")