#!/usr/bin/env python3
"""Download all 104 comuna pages + index + blog from mecanico247.com for SEO fixes."""
import os, subprocess, time

BASE = "/home/z/Globalpro-clone"
EN_COMUNAS = [
    "alhue","buin","calera-de-tango","cerrillos","cerro-navia","colina","conchali",
    "curacavi","el-bosque","el-monte","estacion-central","huechuraba","independencia",
    "isla-de-maipo","la-cisterna","la-florida","la-granja","la-pintana","la-reina",
    "lampa","las-condes","lo-barnechea","lo-espejo","lo-prado","macul","maipu",
    "maria-pinto","melipilla","nunoa","padre-hurtado","paine","pedro-aguirre-cerda",
    "penaflor","penalolen","pirque","providencia","pudahuel","puente-alto",
    "quilicura","quinta-normal","recoleta","renca","san-bernardo","san-joaquin",
    "san-jose-de-maipo","san-miguel","san-pedro","san-ramon","santiago","talagante",
    "tiltil","vitacura"
]

def download(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return  # skip already downloaded
    r = subprocess.run(
        ["curl", "-sL", "--max-time", "20", url, "-o", dest],
        capture_output=True, text=True, timeout=30
    )
    size = os.path.getsize(dest) if os.path.exists(dest) else 0
    status = "OK" if size > 1000 else f"SMALL({size})"
    return status

# Download EN comunas
print("Downloading 52 EN comuna pages...")
for i, c in enumerate(EN_COMUNAS):
    url = f"https://mecanico247.com/en/comunas/{c}"
    dest = f"{BASE}/en/comunas/{c}.html"
    st = download(url, dest)
    if i % 10 == 0:
        print(f"  {i+1}/52 {c}: {st}")

# Download ES comunas
print("Downloading 52 ES comuna pages...")
for i, c in enumerate(EN_COMUNAS):
    url = f"https://mecanico247.com/comunas/{c}"
    dest = f"{BASE}/comunas/{c}.html"
    st = download(url, dest)
    if i % 10 == 0:
        print(f"  {i+1}/52 {c}: {st}")

# Download root pages
print("Downloading root and index pages...")
for url, dest in [
    ("https://mecanico247.com/", f"{BASE}/index.html"),
    ("https://mecanico247.com/en/", f"{BASE}/en/index.html"),
    ("https://mecanico247.com/robots.txt", f"{BASE}/robots.txt"),
    ("https://mecanico247.com/sitemap.xml", f"{BASE}/sitemap.xml"),
    ("https://mecanico247.com/_redirects", f"{BASE}/_redirects"),
]:
    download(url, dest)
    size = os.path.getsize(dest) if os.path.exists(dest) else 0
    print(f"  {dest.split('/')[-1]}: {size} bytes")

# Count what we have
en_count = len([f for f in os.listdir(f"{BASE}/en/comunas") if f.endswith('.html') and os.path.getsize(f"{BASE}/en/comunas/{f}") > 1000])
es_count = len([f for f in os.listdir(f"{BASE}/comunas") if f.endswith('.html') and os.path.getsize(f"{BASE}/comunas/{f}") > 1000])
print(f"\nDone: {en_count} EN pages, {es_count} ES pages")