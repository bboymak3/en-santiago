#!/usr/bin/env python3
"""Inject subscription-gating.js into marketplace.html and business.html"""

# 1. marketplace.html - add before </body>
mp_path = '/tmp/meridaunclick/marketplace.html'
with open(mp_path, 'r') as f:
    content = f.read()

if 'subscription-gating.js' not in content:
    content = content.replace('</body>', '    <script src="js/subscription-gating.js"></script>\n</body>')
    with open(mp_path, 'w') as f:
        f.write(content)
    print("Patched marketplace.html")

# 2. business.html - add before </body> and patch WhatsApp button data attributes
biz_path = '/tmp/meridaunclick/business.html'
with open(biz_path, 'r') as f:
    content = f.read()

if 'subscription-gating.js' not in content:
    content = content.replace('</body>', '    <script src="js/subscription-gating.js"></script>\n</body>')
    with open(biz_path, 'w') as f:
        f.write(content)
    print("Patched business.html")

# Also add data attributes to WhatsApp button in business.html
with open(biz_path, 'r') as f:
    content = f.read()

old_wa = 'class="btn btn-whatsapp btn-full btn-lg" id="mainWhatsApp" style="display:none;"'
new_wa = 'class="btn btn-whatsapp btn-full btn-lg" id="mainWhatsApp" data-owner-role="" data-owner-type="" style="display:none;"'
content = content.replace(old_wa, new_wa)
with open(biz_path, 'w') as f:
    f.write(content)

print("Added data attributes to WhatsApp button")

# 3. Also inject into index.html (main page with business cards)
idx_path = '/tmp/meridaunclick/index.html'
try:
    with open(idx_path, 'r') as f:
        content = f.read()
    if 'subscription-gating.js' not in content:
        content = content.replace('</body>', '    <script src="js/subscription-gating.js"></script>\n</body>')
        with open(idx_path, 'w') as f:
            f.write(content)
        print("Patched index.html")
except:
    print("index.html not found or error")

print("\nAll gating injections done!")