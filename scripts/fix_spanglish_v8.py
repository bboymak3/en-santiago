#!/usr/bin/env python3
"""Patch v8: Generic Spanglish cleanup that works across ALL 52 comunas."""

import os, re

BASE = "/home/z/Globalpro-clone/en/comunas"

DISPLAY_NAMES = {
    "santiago": "Santiago Centro", "providencia": "Providencia", "nunoa": "Nunoa",
    "las-condes": "Las Condes", "vitacura": "Vitacura", "lo-barnechea": "Lo Barnechea",
    "la-reina": "La Reina", "macul": "Macul", "san-joaquin": "San Joaquin",
    "la-granja": "La Granja", "san-miguel": "San Miguel", "san-ramon": "San Ramon",
    "la-pintana": "La Pintana", "la-cisterna": "La Cisterna", "el-bosque": "El Bosque",
    "pedro-aguirre-cerda": "Pedro Aguirre Cerda", "lo-espejo": "Lo Espejo",
    "cerro-navia": "Cerro Navia", "estacion-central": "Estacion Central",
    "cerrillos": "Cerrillos", "maipu": "Maipu", "pudahuel": "Pudahuel",
    "renca": "Renca", "conchali": "Conchali", "quinta-normal": "Quinta Normal",
    "recoleta": "Recoleta", "independencia": "Independencia", "huechuraba": "Huechuraba",
    "quilicura": "Quilicura", "colina": "Colina", "lampa": "Lampa",
    "puente-alto": "Puente Alto", "san-bernardo": "San Bernardo", "buin": "Buin",
    "paine": "Paine", "talagante": "Talagante", "penaflor": "Penaflor",
    "padre-hurtado": "Padre Hurtado", "calera-de-tango": "Calera de Tango",
    "el-monte": "El Monte", "isla-de-maipo": "Isla de Maipo", "melipilla": "Melipilla",
    "maria-pinto": "Maria Pinto", "curacavi": "Curacavi", "tiltil": "Tiltl",
    "lo-prado": "Lo Prado", "san-jose-de-maipo": "San Jose de Maipo",
    "pirque": "Pirque", "san-pedro": "San Pedro", "alhue": "Alhue",
}

for filename in sorted(os.listdir(BASE)):
    if not filename.endswith('.html'):
        continue
    slug = filename.replace('.html', '')
    display = DISPLAY_NAMES.get(slug, slug.replace('-', ' ').title())
    filepath = os.path.join(BASE, filename)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    # CLUTCH BLOCK
    c = re.sub(
        r'El clutch y la belt de distribucion son components criticals que no can failure\. Un clutch desgastado dificulta los cambios de marcha, mientras que una belt rota puede danar irreversibly el engine\. GlobalPro atiende [^<]+ to replace these components with complete OEM-quality kits\. We serve[^<]+con parts certifieds, garantizandor a tralow professional sin tener que remolcar tu vehicle a un shop\.</p>',
        f'<p style="font-size: 0.95rem; color: #555; line-height: 1.8; text-align: justify; margin-bottom: 0;">The clutch and timing belt are critical components that must be maintained in good condition. A worn clutch makes gear changes difficult, while a broken belt can irreversibly damage the engine. GlobalPro handles mechanical emergencies in {display} to replace these components with complete OEM-quality kits. We service all vehicle types with certified parts, guaranteeing professional work without having to tow your vehicle to a shop.</p>',
        c
    )

    # MOBILE MECHANIC BLOCK
    c = re.sub(
        r'brings the mobile mechanic until la puerta de tu hogar',
        f'brings the mechanic shop directly to your doorstep in {display}',
        c
    )
    c = c.replace('No you have que perder tiempo en traslados ni esperas en shopes', 'No need to waste time on commutes or waiting at shops')
    c = re.sub(
        r'our technicians certifieds llegan con herramientas de diagnosis professional y parts de quality para atender [^.]+\.',
        'our certified technicians arrive with professional diagnostic tools and quality parts to service all vehicle types.',
        c
    )

    # OIL CHANGE BLOCK
    c = re.sub(
        r'El oil change periodic es la inversion more important para proteger el engine de tu vehicle\. GlobalPro realiza este mobile service en [^,]+ with',
        lambda m: f"A regular oil change is the most important investment to protect your vehicle's engine. GlobalPro performs this mobile service in {display} with",
        c
    )
    c = re.sub(
        r'Para los [^.]+vehicles ejecutivos[^.]*las condiciones de uso urban requieren intervalos de cambio de between 5\.000 y 10\.000 km\.',
        'For executive sedans, premium vehicles, and fleet vehicles, urban driving conditions require oil change intervals between 5,000 and 10,000 km.',
        c
    )

    # ENGINE BLOCK
    c = re.sub(
        r'sedan premium, SUV y vehicles ejecutivos en [^,]+ with advanced diagnostics',
        lambda m: f'executive sedans, premium SUVs, and fleet vehicles in {display} with advanced diagnostics',
        c
    )

    # GENERIC
    c = c.replace('vehicles ejecutivos', 'executive vehicles')
    c = c.replace('SUV y vehicles', 'SUVs and vehicles')
    c = c.replace('service y reliable', 'service and reliable')
    c = c.replace('fast service y reliable', 'fast and reliable service')
    c = c.replace('emergencies mechanicss', 'mechanical emergencies')
    c = c.replace('GlobalPro atiende', 'GlobalPro handles')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

print("Patch v8 applied")

# VERIFY
spanglish_check = [
    'immediumte', 'electricall', 'optimall', 'failurer', 'Usefulizamos',
    'emergencys', 'solutiones', 'technologys', 'Nuestros technicians',
    'vehicles ejecutivos', 'garantizandor', 'danar irreversibly',
    'MANTENCION', 'MANTENIMIENTO PREVENTIVO',
    'includesndo', 'distraights', 'desperfectos', 'Tralowmos',
    'Bestes', 'Pparts', 'recommendeds', 'avoidss',
    'que no can', 'el clutch y la belt',
    'sin tener que remolcar', 'llegamos en', 'o sufres una',
    'No you have que', 'shopes',
    'manejan a la perfeccion', 'Ademore', 'components criticals',
]

total_errors = 0
for fn in sorted(os.listdir(BASE)):
    if not fn.endswith('.html'):
        continue
    fp = os.path.join(BASE, fn)
    with open(fp) as f:
        content = f.read()
    text = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
    text = re.sub(r'<[^>]+>', ' ', text)
    errs = [p for p in spanglish_check if p.lower() in text.lower()]
    if errs:
        total_errors += len(errs)
        print(f"  {fn.replace('.html','')}: {errs}")

if total_errors == 0:
    print("ALL 52 EN COMUNA FILES ARE CLEAN!")
else:
    print(f"{total_errors} total issues remaining")