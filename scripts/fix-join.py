#!/usr/bin/env python3
"""Fix marketplace double-join bug"""

mp_path = '/tmp/meridaunclick/functions/api/marketplace/index.js'
with open(mp_path, 'r') as f:
    content = f.read()

content = content.replace(
    'LEFT JOIN users b ON p.business_id = b.id',
    'LEFT JOIN businesses b ON p.business_id = b.id'
)

with open(mp_path, 'w') as f:
    f.write(content)

print("Fixed marketplace join bug")