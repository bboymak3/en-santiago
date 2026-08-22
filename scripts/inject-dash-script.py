#!/usr/bin/env python3
"""Inject dashboard-subscription.js into dashboard.html"""

path = '/tmp/meridaunclick/dashboard.html'
with open(path, 'r') as f:
    content = f.read()

old = """    <script src="js/dashboard.js"></script>
    <script src="js/chat.js"></script>"""
new = """    <script src="js/dashboard.js"></script>
    <script src="js/dashboard-subscription.js"></script>
    <script src="js/chat.js"></script>"""

content = content.replace(old, new)
with open(path, 'w') as f:
    f.write(content)
print("Injected dashboard-subscription.js")