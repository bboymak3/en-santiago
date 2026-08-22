#!/usr/bin/env python3
"""Inject admin-subscription.js script tag into admin.html before closing </body>"""

path = '/tmp/meridaunclick/admin.html'
with open(path, 'r') as f:
    content = f.read()

# Add the new script before the SW update script
old = """    <script>
    // Force Service Worker update + cache bust on admin page"""
new = """    <script src="js/admin-subscription.js"></script>
    <script>
    // Force Service Worker update + cache bust on admin page"""

content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)

print("Injected admin-subscription.js script tag")