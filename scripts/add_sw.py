#!/usr/bin/env python3
"""Add service worker registration to all HTML files."""
import glob

SW_CODE = '''
    <script>
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    }
    </script>'''

count = 0
for f in glob.glob('/home/z/my-project/*.html'):
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    if 'serviceWorker' in content and 'sw.js' in content:
        continue  # Already has SW registration
    
    # Add before </body>
    if '</body>' in content and SW_CODE not in content:
        content = content.replace('</body>', SW_CODE + '\n</body>', 1)
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(content)
        count += 1
        print(f'  Updated {f.split("/")[-1]}')

print(f'\nAdded SW registration to {count} files')