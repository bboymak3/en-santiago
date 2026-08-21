import sys, re

for page in ['new-business.html', 'registro-negocio.html', 'crear-negocio.html']:
    import urllib.request
    try:
        resp = urllib.request.urlopen(f'https://en-santiago.com/{page}')
        html = resp.read().decode()
        scripts = re.findall(r'<script[^>]*src="([^"]+)"', html)
        local = [s for s in scripts if 'js/' in s]
        title = re.search(r'<title>([^<]+)', html)
        print(f"=== {page} === title: {title.group(1) if title else '?'}")
        for s in local:
            print(f"  {s}")
    except Exception as e:
        print(f"=== {page} === ERROR: {e}")
