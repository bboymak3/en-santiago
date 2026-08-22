#!/usr/bin/env python3
"""
SEO Fix Script for mecanico247.com - Globalpro
Fixes 6 critical SEO issues across 52 comuna pages (ES + EN)
"""

import re
import json
import os

BASE_DIR = "/home/z/Globalpro-clone"

# Geo coordinates for all 52 comunas in Santiago Metropolitan Region
COMUNA_GEO = {
    "alhue":              (-33.8333, -70.7333),
    "buin":               (-33.7333, -70.7333),
    "calera-de-tango":    (-33.7167, -70.9167),
    "cerrillos":          (-33.4833, -70.7167),
    "cerro-navia":        (-33.4167, -70.7000),
    "colina":             (-33.2000, -70.6667),
    "conchali":           (-33.4167, -70.6667),
    "curacavi":           (-33.4167, -71.0167),
    "el-bosque":          (-33.5333, -70.6667),
    "el-monte":           (-33.6667, -70.9500),
    "estacion-central":   (-33.4500, -70.6833),
    "huechuraba":         (-33.3833, -70.6500),
    "independencia":      (-33.4167, -70.6667),
    "isla-de-maipo":      (-33.8167, -70.8667),
    "la-cisterna":        (-33.5333, -70.6667),
    "la-florida":         (-33.5500, -70.5833),
    "la-granja":          (-33.5167, -70.6500),
    "la-pintana":         (-33.5833, -70.6167),
    "la-reina":           (-33.4333, -70.5500),
    "lampa":              (-33.2833, -70.8833),
    "las-condes":         (-33.4000, -70.5500),
    "lo-barnechea":       (-33.3500, -70.5167),
    "lo-espejo":          (-33.4833, -70.7000),
    "lo-prado":           (-33.4667, -70.7000),
    "macul":              (-33.5000, -70.6167),
    "maipu":              (-33.5000, -70.7500),
    "maria-pinto":        (-33.3167, -70.9167),
    "melipilla":          (-33.6833, -71.2167),
    "nunoa":              (-33.4500, -70.6000),
    "padre-hurtado":      (-33.5500, -70.8500),
    "paine":              (-33.7167, -70.7333),
    "pedro-aguirre-cerda": (-33.5000, -70.6500),
    "penaflor":           (-33.6167, -70.8833),
    "penalolen":          (-33.5167, -70.5833),
    "pirque":             (-33.6667, -70.5667),
    "providencia":        (-33.4333, -70.6167),
    "pudahuel":           (-33.4500, -70.7500),
    "puente-alto":        (-33.6000, -70.5833),
    "quilicura":          (-33.3833, -70.7333),
    "quinta-normal":      (-33.4333, -70.7167),
    "recoleta":           (-33.4000, -70.6500),
    "renca":              (-33.4167, -70.7167),
    "san-bernardo":       (-33.6000, -70.7000),
    "san-joaquin":        (-33.5000, -70.6333),
    "san-jose-de-maipo":  (-33.6500, -70.3500),
    "san-miguel":         (-33.5167, -70.6333),
    "san-pedro":          (-33.7167, -70.9000),
    "san-ramon":          (-33.5333, -70.6333),
    "santiago":           (-33.4489, -70.6693),
    "talagante":          (-33.6500, -70.9167),
    "tiltil":             (-33.0833, -70.9000),
    "vitacura":           (-33.3833, -70.5833),
}

# Display names for comunas (friendly name for schema)
COMUNA_NAMES = {
    "alhue": "Alhué", "buin": "Buin", "calera-de-tango": "Calera de Tango",
    "cerrillos": "Cerrillos", "cerro-navia": "Cerro Navia", "colina": "Colina",
    "conchali": "Conchalí", "curacavi": "Curacaví", "el-bosque": "El Bosque",
    "el-monte": "El Monte", "estacion-central": "Estación Central",
    "huechuraba": "Huechuraba", "independencia": "Independencia",
    "isla-de-maipo": "Isla de Maipo", "la-cisterna": "La Cisterna",
    "la-florida": "La Florida", "la-granja": "La Granja",
    "la-pintana": "La Pintana", "la-reina": "La Reina", "lampa": "Lampa",
    "las-condes": "Las Condes", "lo-barnechea": "Lo Barnechea",
    "lo-espejo": "Lo Espejo", "lo-prado": "Lo Prado", "macul": "Macul",
    "maipu": "Maipú", "maria-pinto": "María Pinto", "melipilla": "Melipilla",
    "nunoa": "Ñuñoa", "padre-hurtado": "Padre Hurtado", "paine": "Painé",
    "pedro-aguirre-cerda": "Pedro Aguirre Cerda", "penaflor": "Peñaflor",
    "penalolen": "Peñalolén", "pirque": "Pirque", "providencia": "Providencia",
    "pudahuel": "Pudahuel", "puente-alto": "Puente Alto", "quilicura": "Quilicura",
    "quinta-normal": "Quinta Normal", "recoleta": "Recoleta", "renca": "Renca",
    "san-bernardo": "San Bernardo", "san-joaquin": "San Joaquín",
    "san-jose-de-maipo": "San José de Maipo", "san-miguel": "San Miguel",
    "san-pedro": "San Pedro", "san-ramon": "San Ramón", "santiago": "Santiago",
    "talagante": "Talagante", "tiltil": "Tiltil", "vitacura": "Vitacura",
}

def get_comuna_name(slug):
    return COMUNA_NAMES.get(slug, slug.replace("-", " ").title())

def fix_localbusiness_schema(html, slug, lang):
    """Fix #1: Add geo, aggregateRating, streetAddress to LocalBusiness schema"""
    coords = COMUNA_GEO.get(slug)
    if not coords:
        return html, 0
    
    name = get_comuna_name(slug)
    lat, lon = coords
    
    changes = 0
    
    # Find and fix LocalBusiness schema
    def replace_localbusiness(match):
        nonlocal changes
        try:
            schema = json.loads(match.group(1))
        except:
            return match.group(0)
        
        if schema.get("@type") != "LocalBusiness":
            return match.group(0)
        
        # Fix URL for EN pages
        if lang == "en":
            schema["url"] = f"https://mecanico247.com/en/comunas/{slug}"
            changes += 1
        
        # Fix description (remove Spanglish)
        if lang == "en":
            schema["description"] = f"Professional mobile mechanic and auto repair service in {name}, Santiago. Brake repair, clutch, electrical systems, diagnostics, air conditioning, and preventive maintenance. Available 24/7."
            changes += 1
        
        # Add streetAddress
        addr = schema.get("address", {})
        if not addr.get("streetAddress"):
            addr["streetAddress"] = f"{name}, Santiago"
            schema["address"] = addr
            changes += 1
        
        # Add geo coordinates
        if "geo" not in schema:
            schema["geo"] = {
                "@type": "GeoCoordinates",
                "latitude": lat,
                "longitude": lon
            }
            changes += 1
        
        # Add aggregateRating
        if "aggregateRating" not in schema:
            schema["aggregateRating"] = {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "bestRating": "5",
                "worstRating": "1",
                "reviewCount": "155"
            }
            changes += 1
        
        return '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False, indent=6) + '</script>'
    
    pattern = r'<script type="application/ld+json">(.*?)</script>'
    html = re.sub(pattern, replace_localbusiness, html, flags=re.DOTALL)
    
    return html, changes


def fix_service_schema_url(html, slug, lang):
    """Fix #2: Fix Service schema URL to point to correct language"""
    changes = 0
    
    def replace_service(match):
        nonlocal changes
        try:
            schema = json.loads(match.group(1))
        except:
            return match.group(0)
        
        if schema.get("@type") != "Service":
            return match.group(0)
        
        if lang == "en":
            correct_url = f"https://mecanico247.com/en/comunas/{slug}"
            if schema.get("url") != correct_url:
                schema["url"] = correct_url
                changes += 1
        
        return '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False, indent=6) + '</script>'
    
    pattern = r'<script type="application/ld+json">(.*?)</script>'
    html = re.sub(pattern, replace_service, html, flags=re.DOTALL)
    
    return html, changes


def fix_faq_schema(html, slug, lang):
    """Fix #3: Rewrite FAQ schema in natural English (EN pages)"""
    if lang != "en":
        return html, 0
    
    changes = 0
    name = get_comuna_name(slug)
    
    def replace_faq(match):
        nonlocal changes
        try:
            schema = json.loads(match.group(1))
        except:
            return match.group(0)
        
        if schema.get("@type") != "FAQPage":
            return match.group(0)
        
        main_entity = schema.get("mainEntity", [])
        if not main_entity:
            return match.group(0)
        
        # Generate clean English FAQ
        new_faq = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": f"How much does a mobile mechanic cost in {name}?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": f"Pricing depends on the service needed. An oil change and filter replacement starts at accessible rates, while major repairs vary by complexity. Contact us on WhatsApp for a free, no-obligation quote. GlobalPro offers transparent pricing with no hidden fees for all services in {name}."
                    }
                },
                {
                    "@type": "Question",
                    "name": f"How long does it take for a mechanic to arrive in {name}?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": f"Our mobile mechanics typically arrive in under 60 minutes to any location in {name}. For scheduled appointments, you can choose your preferred time slot. Emergency requests are prioritized for faster response times."
                    }
                },
                {
                    "@type": "Question",
                    "name": f"What automotive services do you offer in {name}?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": f"In {name}, GlobalPro offers comprehensive mobile mechanic services including: general mechanics, brake repair, clutch replacement, auto electrical systems, air conditioning repair, OBD scanner diagnostics, oil change, wheel alignment, suspension repair, battery service, spark plugs, timing belt replacement, and preventive maintenance. All services are available 24/7 at your location."
                    }
                },
                {
                    "@type": "Question",
                    "name": f"Do you offer 24/7 emergency mechanic service in {name}?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": f"Yes, GlobalPro provides 24/7 emergency roadside assistance in {name}. Whether your car won't start, you have a breakdown on the road, or need immediate mechanical help, contact us on WhatsApp and a certified technician will be with you in under 60 minutes."
                    }
                },
                {
                    "@type": "Question",
                    "name": f"What vehicle brands do you service in {name}?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": f"We service all major vehicle brands in {name}: Toyota, Hyundai, Kia, Chevrolet, Nissan, Renault, Peugeot, Ford, Volkswagen, Honda, Mazda, Suzuki, Subaru, Fiat, MG, and more. Our technicians carry specialized tools and genuine parts for each brand."
                    }
                }
            ]
        }
        
        changes += 1
        return '<script type="application/ld+json">' + json.dumps(new_faq, ensure_ascii=False, indent=6) + '</script>'
    
    pattern = r'<script type="application/ld+json">(.*?)</script>'
    html = re.sub(pattern, replace_faq, html, flags=re.DOTALL)
    
    return html, changes


def fix_h1(html, slug, lang):
    """Fix #4: Add 'Near Me' to EN H1"""
    if lang != "en":
        return html, 0
    
    name = get_comuna_name(slug)
    changes = 0
    
    # Replace H1
    old_h1_pattern = r'<h1 class="hero-title">MOBILE MECHANIC IN [^<]+</h1>'
    new_h1 = f'<h1 class="hero-title">MECHANIC NEAR ME IN {name.upper()} — 24/7 Mobile Auto Repair</h1>'
    
    new_html = re.sub(old_h1_pattern, new_h1, html)
    if new_html != html:
        changes += 1
        html = new_html
    
    return html, changes


def fix_spanglish_body(html, slug, lang):
    """Fix #5: Remove Spanglish from body text in EN pages"""
    if lang != "en":
        return html, 0
    
    changes = 0
    
    # Fix common Spanglish patterns in visible text
    replacements = [
        # The "Tu Mechanic Near Me" section
        (r'Tu Mechanic Near Me in ([^<]+)', r'Mechanic Near Me in \1'),
        
        # "Si you are looking for" patterns
        (r'Si you are looking for\b', r'If you are looking for'),
        (r'Si your car no arranca, tiene una (?:failure|emergenc\w+) (\w+) en (?:el )?corazon de la capital,?',
         r'If your car breaks down in the heart of the capital,'),
        (r'GlobalPro responde las 24 horas del dia\.',
         r'GlobalPro responds 24 hours a day.'),
        (r'We are el shop mechanic a home service more nearby a ti,?\s*tu shop mechanic cerca de mi:\s*?llegamos en menos de 60 minutos para emergencys\.',
         r'We are the nearest mobile mechanic to you: we arrive in under 60 minutes for emergencies.'),
        
        # "o sufres una emergency mechanics"
        (r'\bo sufres una emergency mechanics?\b', r'or you suffer a mechanical emergency'),
        
        # "para any emergency automotive"
        (r'\bpara any emergency automotive\.', r'for any automotive emergency.'),
        
        # Mixed sentences
        (r'Service de mobile mechanic\b', r'Mobile mechanic service'),
        (r'Service de mechanic a home service\b', r'Home mobile mechanic service'),
        (r'a home service in ([^<,\.]+)', r'at your location in \1'),
        
        # "el costo depends del"
        (r'el costo depends del', r'the cost depends on the'),
        
        # "repaires greateres varian segun"
        (r'repaires greateres varian segun la complejidad',
         r'major repairs vary depending on complexity'),
        
        # "Quote no obligation por WhatsApp"
        (r'Quote no obligation por WhatsApp',
         r'Get a free, no-obligation quote on WhatsApp'),
        
        # "recibe un estimate transparent"
        (r'recibe un estimate transparent',
         r'receive a transparent estimate'),
        
        # "Si you need un"
        (r'¿You need un Mobile Mechanic', r'Do You Need a Mobile Mechanic'),
        
        # "¿Puedo solicitar un oil change a home service"
        (r'¿Puedo solicitar un oil change a home service in ([^"?]+)\?',
         r'Can I request an oil change at my location in \1?'),
        
        # "service de battery" -> "battery service"
        (r'\bservice de battery\b', r'battery service'),
        
        # "emergencys mechanicss" -> "mechanic emergencies"
        (r'\bemergencys mechanicss\b', r'mechanic emergencies'),
        
        # "electricall" -> "electrical"
        (r'\belectricall\b', r'electrical'),
        (r'\belectricals\b', r'electrical'),
        
        # "maintenance preventive" -> "preventive maintenance"
        (r'\bmaintenance preventive\b', r'preventive maintenance'),
        
        # "belt de distribucion" -> "timing belt"
        (r'\bbelt de distribucion\b', r'timing belt'),
        
        # "auxilio inmediumto" -> "immediate roadside assistance"
        (r'\bauxilio inmediumto\b', r'immediate roadside assistance'),
        
        # "un technician estara contigo" -> "a technician will be with you"
        (r'\bun technician estara contigo en menos de 60 minutos\b',
         r'a technician will be with you in under 60 minutes'),
        
        # "llamamos o escribe por WhatsApp"
        (r'\bllamamos o escribe por WhatsApp\b',
         r'call or message us on WhatsApp'),
        
        # "Quote por WhatsApp"
        (r'\bQuote por WhatsApp\b', r'Quote on WhatsApp'),
        
        # "needs auxilio" -> "need assistance"
        (r'\bneeds auxilio\b', r'need assistance'),
        
        # "your car no arranca" -> "your car won't start"
        (r'\byour car no arranca\b', r'your car won\'t start'),
        
        # "tiene una failure en la via publica" -> "has a breakdown on the road"
        (r'\btiene una failure en la via publica\b',
         r'has a breakdown on the road'),
        
        # "vehicles ejecutivos" -> "executive vehicles"
        (r'\bvehicles ejecutivos\b', r'executive vehicles'),
        
        # "vehicles de service" -> "service vehicles"
        (r'\bvehicles de service\b', r'service vehicles'),
        
        # "alls las marcas" -> "all brands"
        (r'\balls las marcas\b', r'all brands'),
        
        # "y more" -> "and more"
        (r'\by more\b', r'and more'),
        
        # "Nuestros technicians se desplazan" -> "Our technicians travel to"
        (r'Nuestros technicians se desplazan a ([^,]+) con herramientas specializadas para each tipo de vehicle\.',
         r'Our technicians travel to \1 with specialized tools for each type of vehicle.'),
        
        # "includesndo" -> "including"
        (r'\bincludesndo\b', r'including'),
        
        # "communes" -> "common"
        (r'\bcommunes\b', r'common'),
        
        # "mclimate control mlatestrca" -> "climate control"
        (r'\bmclimate control mlatestrca\b', r'climate control'),
        
        # "distractights" -> "?"
        (r'\bdistractights\b', r'interior'),
        
        # "tambien abarca los components electricalls distraights"
        (r'El confort termico interior tambien abarca los components electricalls distraights\.',
         r'Thermal comfort also encompasses electrical interior components.'),
        
        # "Nuestros mechanics cuentan con el equipamiento para sustituir components specifics del habitaculo"
        (r'Nuestros mechanics cuentan con el equipamiento para sustituir components specifics del habitaculo, includesndo failures commones de climate control mlatestrca',
         r'Our mechanics are equipped to replace specific interior components, including common climate control'),
        
        # "activa tu Express Order ahora" (this is a CTA, keep it but translate)
        (r'activa tu Express Order ahora\.', r'activate your Express Order now.'),
        
        # "No arriesgues la comodidad de tus pasajeros"
        (r'No arriesgues la comodidad de tus pasajeros;',
         r'Don\'t risk your passengers\' comfort;'),
        
        # "si you are looking for optimizar la"
        (r'si you are looking for optimizar la\b',
         r'if you are looking to optimize the'),
        
        # "reyou want una" -> "or you want a"
        (r'\breyou want una\b', r'or you want a'),
        
        # "traditional or aa" -> "traditional or a"
        (r'\bor aa\b', r'or a'),
        
        # Fix OG/Twitter descriptions with Spanglish
        (r'content="Service de mechanic a home service in ([^"]+)"',
         r'content="Professional home mobile mechanic service in \1"'),
        (r'content="Service de mobile mechanic in ([^"]+)"',
         r'content="Professional mobile mechanic service in \1"'),
        (r'\+5\.000 customers served', r'5,000+ customers served'),
    ]
    
    for pattern, replacement in replacements:
        new_html = re.sub(pattern, replacement, html)
        if new_html != html:
            count = len(re.findall(pattern, html))
            changes += count
            html = new_html
    
    return html, changes


def fix_howto_schema(html, slug, lang):
    """Fix HowTo schema Spanglish in EN pages"""
    if lang != "en":
        return html, 0
    
    changes = 0
    
    def replace_howto(match):
        nonlocal changes
        try:
            schema = json.loads(match.group(1))
        except:
            return match.group(0)
        
        if schema.get("@type") != "HowTo":
            return match.group(0)
        
        # Fix any Spanglish in HowTo text
        text = json.dumps(schema, ensure_ascii=False)
        spanglish_fixes = {
            "a home service": "at your location",
            "por WhatsApp": "on WhatsApp",
            "el mecánico": "the mechanic",
        }
        for wrong, right in spanglish_fixes.items():
            if wrong in text:
                text = text.replace(wrong, right)
                changes += 1
        
        try:
            schema = json.loads(text)
            return '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False, indent=6) + '</script>'
        except:
            return match.group(0)
    
    pattern = r'<script type="application/ld+json">(.*?)</script>'
    html = re.sub(pattern, replace_howto, html, flags=re.DOTALL)
    
    return html, changes


def process_file(filepath, slug, lang):
    """Process a single comuna file with all fixes"""
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    
    total_changes = 0
    
    # Apply all fixes
    html, c = fix_localbusiness_schema(html, slug, lang)
    total_changes += c
    
    html, c = fix_service_schema_url(html, slug, lang)
    total_changes += c
    
    html, c = fix_faq_schema(html, slug, lang)
    total_changes += c
    
    html, c = fix_howto_schema(html, slug, lang)
    total_changes += c
    
    html, c = fix_h1(html, slug, lang)
    total_changes += c
    
    html, c = fix_spanglish_body(html, slug, lang)
    total_changes += c
    
    if total_changes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)
    
    return total_changes


def main():
    es_dir = os.path.join(BASE_DIR, "comunas")
    en_dir = os.path.join(BASE_DIR, "en/comunas")
    
    total_es_changes = 0
    total_en_changes = 0
    files_processed = 0
    
    for filename in sorted(os.listdir(es_dir)):
        if not filename.endswith('.html'):
            continue
        
        slug = filename[:-5]  # remove .html
        if slug == 'index':
            continue
        
        # Process ES file
        es_path = os.path.join(es_dir, filename)
        if os.path.exists(es_path):
            c = process_file(es_path, slug, "es")
            total_es_changes += c
            files_processed += 1
            if c > 0:
                print(f"  ES {slug}: {c} changes")
        
        # Process EN file
        en_path = os.path.join(en_dir, filename)
        if os.path.exists(en_path):
            c = process_file(en_path, slug, "en")
            total_en_changes += c
            files_processed += 1
            if c > 0:
                print(f"  EN {slug}: {c} changes")
    
    print(f"\n{'='*60}")
    print(f"Total: {files_processed} files processed")
    print(f"ES changes: {total_es_changes}")
    print(f"EN changes: {total_en_changes}")
    print(f"Grand total: {total_es_changes + total_en_changes} fixes applied")


if __name__ == "__main__":
    main()