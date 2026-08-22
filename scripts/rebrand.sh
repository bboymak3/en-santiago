#!/bin/bash
cd /home/z/my-project
FILES=$(grep -rl "#059669" --include="*.html" --include="*.js" --include="*.css" . 2>/dev/null | grep -v ".git/")
echo "=== Replacing #059669 → #006EE3 in $(echo "$FILES" | wc -l) files ==="
echo "$FILES" | while read f; do
    sed -i 's/#059669/#006EE3/g' "$f"
    echo "  $f"
done

FILES=$(grep -rl "#10b981" --include="*.html" --include="*.js" --include="*.css" . 2>/dev/null | grep -v ".git/")
echo "=== Replacing #10b981 → #3B9AFF in $(echo "$FILES" | wc -l) files ==="
echo "$FILES" | while read f; do
    sed -i 's/#10b981/#3B9AFF/g' "$f"
    echo "  $f"
done

FILES=$(grep -rl "#047857" --include="*.html" --include="*.js" --include="*.css" . 2>/dev/null | grep -v ".git/")
echo "=== Replacing #047857 → #005BB5 in $(echo "$FILES" | wc -l) files ==="
echo "$FILES" | while read f; do
    sed -i 's/#047857/#005BB5/g' "$f"
    echo "  $f"
done

FILES=$(grep -rl "#065f46" --include="*.html" --include="*.js" --include="*.css" . 2>/dev/null | grep -v ".git/")
echo "=== Replacing #065f46 → #004899 in $(echo "$FILES" | wc -l) files ==="
echo "$FILES" | while read f; do
    sed -i 's/#065f46/#004899/g' "$f"
    echo "  $f"
done

FILES=$(grep -rl "rgba(5,150,105" --include="*.html" --include="*.js" --include="*.css" . 2>/dev/null | grep -v ".git/")
echo "=== Replacing rgba(5,150,105 → rgba(0,110,227 in $(echo "$FILES" | wc -l) files ==="
echo "$FILES" | while read f; do
    sed -i 's/rgba(5,150,105/rgba(0,110,227/g' "$f"
    echo "  $f"
done

FILES=$(grep -rl "#ecfdf5" --include="*.html" --include="*.js" --include="*.css" . 2>/dev/null | grep -v ".git/")
echo "=== Replacing #ecfdf5 → #EFF6FF in $(echo "$FILES" | wc -l) files ==="
echo "$FILES" | while read f; do
    sed -i 's/#ecfdf5/#EFF6FF/g' "$f"
    echo "  $f"
done

FILES=$(grep -rl "#f0fdf4" --include="*.html" --include="*.js" --include="*.css" . 2>/dev/null | grep -v ".git/")
echo "=== Replacing #f0fdf4 → #EFF6FF in $(echo "$FILES" | wc -l) files ==="
echo "$FILES" | while read f; do
    sed -i 's/#f0fdf4/#EFF6FF/g' "$f"
    echo "  $f"
done

FILES=$(grep -rl "#bbf7d0" --include="*.html" --include="*.js" --include="*.css" . 2>/dev/null | grep -v ".git/")
echo "=== Replacing #bbf7d0 → #BFDBFE in $(echo "$FILES" | wc -l) files ==="
echo "$FILES" | while read f; do
    sed -i 's/#bbf7d0/#BFDBFE/g' "$f"
    echo "  $f"
done

echo ""
FILES=$(grep -rl "OLAX" --include="*.html" --include="*.js" --include="*.css" . 2>/dev/null | grep -v ".git/")
echo "=== Replacing OLAX → HOLAX in $(echo "$FILES" | wc -l) files ==="
echo "$FILES" | while read f; do
    sed -i 's/OLAX/HOLAX/g' "$f"
    echo "  $f"
done

echo ""
echo "=== DONE ==="