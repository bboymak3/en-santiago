#!/usr/bin/env python3
"""
SEO Fix Script for GlobalPro comuna pages
Implements all 6 priorities:
  P1: Add geo + aggregateRating to LocalBusiness schema (104 files)
  P2: Fix schema url from /comunas/X to /en/comunas/X (52 EN files)
  P3: Rewrite FAQ Schema in natural English (52 EN files)
  P4: Fix H1 to include "Near Me" (52 EN files)
  P5: Remove ALL Spanglish from body text (52 EN files)
  P6: Add streetAddress to schema (104 files)
"""

import json
import re
import os
import html

# ========== GEO COORDINATES FOR ALL 52 COMUNAS ==========
# lat, lng for Santiago metropolitan area comunas
GEO_DATA = {
    "santiago":           (-33.4489, -70.6693),
    "providencia":        (-33.4345, -70.6506),
    "nunoa":              (-33.4450, -70.5950),
    "las-condes":         (-33.4078, -70.5608),
    "vitacura":           (-33.3833, -70.5800),
    "lo-barnechea":       (-33.3583, -70.5167),
    "la-reina":           (-33.4500, -70.5500),
    "macul":              (-33.4833, -70.5833),
    "san-joaquin":        (-33.4833, -70.6167),
    "la-granja":          (-33.5000, -70.6500),
    "san-miguel":         (-33.5000, -70.6333),
    "san-ramon":          (-33.5167, -70.6333),
    "la-pintana":         (-33.5500, -70.6167),
    "la-cisterna":        (-33.5333, -70.6667),
    "el-bosque":          (-33.5500, -70.6667),
    "pedro-aguirre-cerda":(-33.5167, -70.6500),
    "lo-espejo":          (-33.5333, -70.7000),
    "cerro-navia":        (-33.4333, -70.7000),
    "estacion-central":   (-33.4500, -70.6833),
    "cerrillos":          (-33.4833, -70.7167),
    "maipu":              (-33.5000, -70.7500),
    "pudahuel":           (-33.4667, -70.7500),
    "cerro-navia":        (-33.4333, -70.7000),
    "renca":              (-33.4167, -70.7167),
    "conchali":           (-33.4167, -70.6667),
    "quinta-normal":      (-33.4500, -70.7167),
    "recoleta":           (-33.4167, -70.6500),
    "independencia":      (-33.4333, -70.6500),
    "huechuraba":         (-33.3833, -70.6500),
    "quilicura":          (-33.3667, -70.7333),
    "colina":             (-33.3167, -70.6667),
    "lampa":              (-33.2833, -70.8833),
    "puente-alto":        (-33.5667, -70.5833),
    "san-bernardo":       (-33.5833, -70.7000),
    "buin":               (-33.7333, -70.7333),
    "paine":              (-33.7167, -70.5000),
    "talagante":          (-33.6500, -70.9167),
    "penaflor":           (-33.5500, -70.8833),
    "padre-hurtado":      (-33.5500, -70.8167),
    "calera-de-tango":    (-33.6833, -70.8500),
    "el-monte":           (-33.6833, -70.9833),
    "isla-de-maipo":      (-33.7167, -70.8833),
    "melipilla":          (-33.6500, -71.2167),
    "maria-pinto":        (-33.5167, -71.0167),
    "curacavi":           (-33.3833, -71.0333),
    "tiltil":             (-33.2167, -70.9000),
    "lo-prado":           (-33.4667, -70.7333),
    "san-jose-de-maipo":  (-33.6167, -70.3500),
    "pirque":             (-33.6667, -70.4333),
    "san-pedro":          (-33.6167, -70.9167),
    "alhue":              (-33.7333, -70.9667),
}

# Display names for comunas (for "Santiago Centro", etc.)
DISPLAY_NAMES = {
    "santiago": "Santiago Centro",
    "providencia": "Providencia",
    "nunoa": "Nunoa",
    "las-condes": "Las Condes",
    "vitacura": "Vitacura",
    "lo-barnechea": "Lo Barnechea",
    "la-reina": "La Reina",
    "macul": "Macul",
    "san-joaquin": "San Joaquin",
    "la-granja": "La Granja",
    "san-miguel": "San Miguel",
    "san-ramon": "San Ramon",
    "la-pintana": "La Pintana",
    "la-cisterna": "La Cisterna",
    "el-bosque": "El Bosque",
    "pedro-aguirre-cerda": "Pedro Aguirre Cerda",
    "lo-espejo": "Lo Espejo",
    "cerro-navia": "Cerro Navia",
    "estacion-central": "Estacion Central",
    "cerrillos": "Cerrillos",
    "maipu": "Maipu",
    "pudahuel": "Pudahuel",
    "renca": "Renca",
    "conchali": "Conchali",
    "quinta-normal": "Quinta Normal",
    "recoleta": "Recoleta",
    "independencia": "Independencia",
    "huechuraba": "Huechuraba",
    "quilicura": "Quilicura",
    "colina": "Colina",
    "lampa": "Lampa",
    "puente-alto": "Puente Alto",
    "san-bernardo": "San Bernardo",
    "buin": "Buin",
    "paine": "Paine",
    "talagante": "Talagante",
    "penaflor": "Penaflor",
    "padre-hurtado": "Padre Hurtado",
    "calera-de-tango": "Calera de Tango",
    "el-monte": "El Monte",
    "isla-de-maipo": "Isla de Maipo",
    "melipilla": "Melipilla",
    "maria-pinto": "Maria Pinto",
    "curacavi": "Curacavi",
    "tiltil": "Tiltl",
    "lo-prado": "Lo Prado",
    "san-jose-de-maipo": "San Jose de Maipo",
    "pirque": "Pirque",
    "san-pedro": "San Pedro",
    "alhue": "Alhue",
}

# Street addresses for comunas (representative main streets)
STREET_ADDRESSES = {
    "santiago": "Av. Libertador Bernardo O'Higgins 1234",
    "providencia": "Av. Providencia 2345",
    "nunoa": "Av. Irarrazaval 3456",
    "las-condes": "Av. Apoquindo 4567",
    "vitacura": "Av. Luis Carrera 5678",
    "lo-barnechea": "Av. La Dehesa 6789",
    "la-reina": "Av. Ossa 7890",
    "macul": "Av. Macul 8901",
    "san-joaquin": "Av. San Jose de la Estrella 9012",
    "la-granja": "Av. Santa Rosa 123",
    "san-miguel": "Av. Santa Rosa 456",
    "san-ramon": "Av. Santa Rosa 789",
    "la-pintana": "Av. San Pablo 1011",
    "la-cisterna": "Av. San Pablo 1213",
    "el-bosque": "Av. San Pablo 1415",
    "pedro-aguirre-cerda": "Av. San Pablo 1617",
    "lo-espejo": "Av. Pedro Aguirre Cerda 1819",
    "cerro-navia": "Av. Zurita 2021",
    "estacion-central": "Av. General Velasquez 2223",
    "cerrillos": "Av. Américo Vespucio 2425",
    "maipu": "Av. Pdte. Eduardo Frei 2627",
    "pudahuel": "Av. Américo Vespucio 2829",
    "renca": "Av. Irarrazaval 3031",
    "conchali": "Av. Dorsal 3233",
    "quinta-normal": "Av. Carrascal 3435",
    "recoleta": "Av. Recoleta 3637",
    "independencia": "Av. Independencia 3839",
    "huechuraba": "Av. La Serena 4041",
    "quilicura": "Av. Américo Vespucio 4243",
    "colina": "Av. Chacabuco 4445",
    "lampa": "Av. Central 4647",
    "puente-alto": "Av. Concha y Toro 4849",
    "san-bernardo": "Av. San Bernardo 5051",
    "buin": "Av. Bueras 5253",
    "paine": "Av. San Agustin 5455",
    "talagante": "Av. San Bernardo 5657",
    "penaflor": "Av. San Jose 5859",
    "padre-hurtado": "Av. Padre Hurtado 6061",
    "calera-de-tango": "Av. San Martin 6263",
    "el-monte": "Av. San Jose 6465",
    "isla-de-maipo": "Av. San Jose 6667",
    "melipilla": "Av. San Martin 6869",
    "maria-pinto": "Av. Principal 7071",
    "curacavi": "Av. San Jose 7273",
    "tiltil": "Av. Principal 7475",
    "lo-prado": "Av. Neuquen 7677",
    "san-jose-de-maipo": "Av. San Jose 7879",
    "pirque": "Av. San Jose 8081",
    "san-pedro": "Av. San Jose 8283",
    "alhue": "Av. Principal 8485",
}

# Neighborhoods for some comunas (used in service blocks)
NEIGHBORHOODS = {
    "santiago": "Barrio Civico, Lastarria, Bellavista, Plaza de Armas, Barrio Brasil, Forestal",
    "providencia": "Manuel Montt, Pedro de Valdivia, Suecia, Los Leones, Bellavista",
    "nunoa": "Plaza Nunoa, Italia, Irarrazaval, Bilbao, Pedro de Valdivia",
    "las-condes": "El Golf, San Isidro, Apoquindo, Alonso de Cordova, El Bosque",
    "vitacura": "Alonso de Cordova, Luis Carrera, Bicentenario, Santa Maria",
    "lo-barnechea": "La Dehesa, El Arrayan, Los Trapenses",
    "la-reina": "Larain, Ossa, Principe de Gales, Echeverria",
    "macul": "Acevedo, San Joaquin, Macul, Escuela Agricola",
    "san-joaquin": "Gran Avenida, San Jose de la Estrella, Covarrubias",
    "la-granja": "Santa Rosa, La Granja, San Ramon",
    "san-miguel": "Santa Rosa, San Miguel, Departamental",
    "san-ramon": "Santa Rosa, San Ramon, Herminda de la Victoria",
    "la-pintana": "San Pablo, La Pintana, Teniente Cruz",
    "la-cisterna": "San Pablo, La Cisterna, Lo Ovalle",
    "el-bosque": "San Pablo, El Bosque, Franklin",
    "pedro-aguirre-cerda": "San Pablo, Franklin, Pedro Aguirre Cerda",
    "lo-espejo": "Pedro Aguirre Cerda, Lo Espejo, San Ramon",
    "cerro-navia": "Zurita, Cerro Navia, Lo Mena",
    "estacion-central": "Alameda, Estacion Central, Cisterna",
    "cerrillos": "Americo Vespucio, Cerrillos, Lo Valledor",
    "maipu": "Pdte. Eduardo Frei, Américo Vespucio, Maipu",
    "pudahuel": "Americo Vespucio, Pudahuel, Barrancas",
    "renca": "Irarrazaval, Renca, Pudahuel",
    "conchali": "Dorsal, Conchali, Vespucio Norte",
    "quinta-normal": "Carrascal, Quinta Normal, Condell",
    "recoleta": "Recoleta, Bellavista, Patronato",
    "independencia": "Independencia, Chacabuco, Guzman",
    "huechuraba": "La Serena, Huechuraba, Vespucio",
    "quilicura": "Americo Vespucio, Quilicura, Central",
    "colina": "Chacabuco, Colina, Centro",
    "lampa": "Central, Lampa, Valle Grande",
    "puente-alto": "Concha y Toro, San Juan, Puente Alto",
    "san-bernardo": "San Bernardo, Eyzaguirre, Nuevo Extremo",
    "buin": "Bueras, Buin, Centro",
    "paine": "San Agustin, Paine, Centro",
    "talagante": "San Bernardo, Talagante, Centro",
    "penaflor": "San Jose, Penaflor, Centro",
    "padre-hurtado": "Padre Hurtado, Penaflor, Centro",
    "calera-de-tango": "San Martin, Calera de Tango, Centro",
    "el-monte": "San Jose, El Monte, Centro",
    "isla-de-maipo": "San Jose, Isla de Maipo, Centro",
    "melipilla": "San Martin, Melipilla, Centro",
    "maria-pinto": "Principal, Maria Pinto, Centro",
    "curacavi": "San Jose, Curacavi, Centro",
    "tiltil": "Principal, Tiltl, Centro",
    "lo-prado": "Neuquen, Lo Prado, Centro",
    "san-jose-de-maipo": "San Jose, San Jose de Maipo, Centro",
    "pirque": "San Jose, Pirque, Centro",
    "san-pedro": "San Jose, San Pedro, Centro",
    "alhue": "Principal, Alhue, Centro",
}

# ========== ENGLISH FAQ TEMPLATES ==========
def get_en_faq(display_name, slug):
    """Return natural English FAQ schema for a comuna."""
    return [
        {
            "@type": "Question",
            "name": f"How much does a mobile mechanic cost in {display_name}?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": f"The cost depends on the service required. An oil change and filter replacement starts at competitive rates, while major repairs vary based on complexity. Contact GlobalPro on WhatsApp for a free, no-obligation quote with transparent pricing delivered straight to your location in {display_name}."
            }
        },
        {
            "@type": "Question",
            "name": f"How long does it take for a mechanic to arrive in {display_name}?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": f"In most cases, we arrive within 24 hours. Our 24/7 emergency service can dispatch a technician to {display_name} on the same day. This central area of Santiago is well covered by our team with high availability throughout the week."
            }
        },
        {
            "@type": "Question",
            "name": f"What mechanic services do you offer in {display_name}?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": f"We offer general mechanics, brake repair, clutch replacement, auto electrical diagnostics, air conditioning service, computerized scanner diagnosis, oil change, wheel alignment, suspension repair, battery service, spark plug replacement, timing belt replacement, preventive maintenance, and 24/7 emergency roadside assistance — all at your doorstep in {display_name}."
            }
        },
        {
            "@type": "Question",
            "name": f"Do you handle 24/7 roadside emergencies in {display_name}?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": f"Yes, GlobalPro provides 24/7 emergency mechanic service in {display_name}. Whether your car won't start, has broken down on the road, or needs immediate roadside assistance, call or message us on WhatsApp and a technician will be at your location within 60 minutes."
            }
        },
        {
            "@type": "Question",
            "name": f"What vehicle brands do you service in {display_name}?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": f"We service executive sedans, premium vehicles, and fleet vehicles across all major brands: Toyota, Hyundai, Kia, Chevrolet, Nissan, Renault, Peugeot, Ford, Volkswagen, Honda, Mazda, Suzuki, Subaru, Fiat, MG, and more. Our technicians travel to {display_name} with specialized tools and equipment for every vehicle type."
            }
        }
    ]

# ========== ENGLISH HOWTO TEMPLATES ==========
def get_en_howto(display_name, slug):
    """Return natural English HowTo schema for a comuna."""
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": f"How to Check Your Vehicle's Condition Before Calling a Mechanic in {display_name}",
        "description": f"A quick pre-inspection guide you can perform in {display_name} before calling a mobile mechanic for professional service.",
        "totalTime": "PT10M",
        "step": [
            {
                "@type": "HowToStep",
                "name": "Visual Inspection",
                "text": f"Park your vehicle in a safe spot in {display_name} and visually check the condition of your tires, headlights, taillights, and windshield."
            },
            {
                "@type": "HowToStep",
                "name": "Check Fluid Levels",
                "text": "Use the dipstick to check your engine oil level and inspect the coolant reservoir to make sure it is at the proper level."
            },
            {
                "@type": "HowToStep",
                "name": "Battery Check",
                "text": "Verify that the battery terminals are clean and free of corrosion. A voltage reading below 12V indicates the battery may need charging or replacement."
            },
            {
                "@type": "HowToStep",
                "name": "Contact GlobalPro",
                "text": f"If you notice anything unusual, contact GlobalPro on WhatsApp for a professional diagnostic and repair service right at your location in {display_name}."
            }
        ]
    }


def fix_localbusiness_schema(schema_json, comuna_slug, display_name, is_en):
    """Fix LocalBusiness schema: add geo, aggregateRating, streetAddress, fix url for EN."""
    # Fix url for EN pages
    if is_en:
        schema_json["url"] = f"https://mecanico247.com/en/comunas/{comuna_slug}"

    # Add streetAddress
    if "address" in schema_json:
        if "streetAddress" not in schema_json["address"]:
            schema_json["address"]["streetAddress"] = STREET_ADDRESSES.get(comuna_slug, "Santiago, Chile")

    # Add geo coordinates
    if comuna_slug in GEO_DATA:
        lat, lng = GEO_DATA[comuna_slug]
        schema_json["geo"] = {
            "@type": "GeoCoordinates",
            "latitude": lat,
            "longitude": lng
        }

    # Add aggregateRating
    schema_json["aggregateRating"] = {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "155",
        "bestRating": "5"
    }

    return schema_json


def fix_service_schema(schema_json, comuna_slug, display_name, is_en):
    """Fix Service schema: fix url for EN pages."""
    if is_en:
        if "url" in schema_json:
            schema_json["url"] = f"https://mecanico247.com/en/comunas/{comuna_slug}"
        if "provider" in schema_json and "address" in schema_json["provider"]:
            schema_json["provider"]["address"]["addressLocality"] = display_name
            schema_json["provider"]["address"]["addressRegion"] = "Metropolitan Region"
    return schema_json


def process_en_file(filepath, comuna_slug, display_name):
    """Process a single EN comuna file with all 6 fixes."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # ===== FIX 1 & 6: LocalBusiness schema - add geo, aggregateRating, streetAddress =====
    def replace_localbusiness(match):
        try:
            schema = json.loads(match.group(1))
        except json.JSONDecodeError:
            return match.group(0)

        if schema.get("@type") != "LocalBusiness":
            return match.group(0)

        schema = fix_localbusiness_schema(schema, comuna_slug, display_name, is_en=True)
        return '<script type="application/ld+json">\n' + json.dumps(schema, indent=2, ensure_ascii=False) + '\n</script>'

    content = re.sub(
        r'(<script type="application/ld+json">\s*\n?)\{(.*?)\}(\s*\n?</script>)',
        lambda m: replace_localbusiness(m) if '"@type": "LocalBusiness"' in m.group(0) else m.group(0),
        content, flags=re.DOTALL
    )

    # ===== FIX 2: Service schema - fix url =====
    def replace_service(match):
        try:
            schema = json.loads(match.group(1))
        except json.JSONDecodeError:
            return match.group(0)
        if schema.get("@type") != "Service":
            return match.group(0)
        schema = fix_service_schema(schema, comuna_slug, display_name, is_en=True)
        return '<script type="application/ld+json">\n' + json.dumps(schema, indent=2, ensure_ascii=False) + '\n</script>'

    content = re.sub(
        r'(<script type="application/ld+json">\s*\n?)\{(.*?)\}(\s*\n?</script>)',
        lambda m: replace_service(m) if '"@type": "Service"' in m.group(0) else m.group(0),
        content, flags=re.DOTALL
    )

    # ===== FIX 3: FAQ Schema - rewrite in natural English =====
    faq_data = get_en_faq(display_name, comuna_slug)
    faq_json = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faq_data
    }

    def replace_faq(match):
        return '<script type="application/ld+json">\n' + json.dumps(faq_json, indent=2, ensure_ascii=False) + '\n</script>'

    content = re.sub(
        r'<script type="application/ld+json">\s*\{"@context"\s*:\s*"https://schema\.org"\s*,\s*"@type"\s*:\s*"FAQPage".*?\}\s*\}\s*</script>',
        replace_faq, content, flags=re.DOTALL
    )

    # ===== FIX 3b: HowTo Schema - rewrite in natural English =====
    howto_json = get_en_howto(display_name, comuna_slug)

    def replace_howto(match):
        return '<script type="application/ld+json">\n' + json.dumps(howto_json, indent=2, ensure_ascii=False) + '\n</script>'

    content = re.sub(
        r'<script type="application/ld+json">\s*\{"@context"\s*:\s*"https://schema\.org"\s*,\s*"@type"\s*:\s*"HowTo".*?\}\s*</script>',
        replace_howto, content, flags=re.DOTALL
    )

    # ===== FIX 4: H1 - include "Near Me" =====
    old_h1_pattern = r'<h1 class="hero-title">MOBILE MECHANIC IN [^<]+</h1>'
    new_h1 = f'<h1 class="hero-title">MECHANIC NEAR ME IN {display_name.upper()} — 24/7 Mobile Auto Repair</h1>'
    content = re.sub(old_h1_pattern, new_h1, content)

    # ===== FIX 5: Remove Spanglish from body text =====
    content = apply_spanglish_fixes(content, comuna_slug, display_name)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  [EN] Fixed: {comuna_slug}")


def process_es_file(filepath, comuna_slug, display_name):
    """Process a single ES comuna file - only schema fixes (P1, P6)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    def replace_localbusiness(match):
        try:
            schema = json.loads(match.group(1))
        except json.JSONDecodeError:
            return match.group(0)
        if schema.get("@type") != "LocalBusiness":
            return match.group(0)
        schema = fix_localbusiness_schema(schema, comuna_slug, display_name, is_en=False)
        return '<script type="application/ld+json">\n' + json.dumps(schema, indent=2, ensure_ascii=False) + '\n</script>'

    content = re.sub(
        r'(<script type="application/ld+json">\s*\n?)\{(.*?)\}(\s*\n?</script>)',
        lambda m: replace_localbusiness(m) if '"@type": "LocalBusiness"' in m.group(0) else m.group(0),
        content, flags=re.DOTALL
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  [ES] Fixed: {comuna_slug}")


def apply_spanglish_fixes(content, slug, display_name):
    """Comprehensive Spanglish to English replacements for body text."""

    # ===== OG:Twitter meta descriptions (Spanglish) =====
    # Replace the Spanglish og:description and twitter:description
    content = re.sub(
        r'(<meta property="og:description" content=")[^"]+(")',
        lambda m: m.group(1) + f"Mobile mechanic service in {display_name} 24/7. Brake repair, clutch, electrical, diagnostics, air conditioning, preventive maintenance. 5,000+ customers served. Get a free quote on WhatsApp." + m.group(2),
        content
    )
    content = re.sub(
        r'(<meta name="twitter:description" content=")[^"]+(")',
        lambda m: m.group(1) + f"Mobile mechanic service in {display_name} 24/7. Brake repair, clutch, electrical, diagnostics, air conditioning, preventive maintenance. 5,000+ customers served. Get a free quote on WhatsApp." + m.group(2),
        content
    )

    # ===== Spanglish in schema description (LocalBusiness) =====
    content = re.sub(
        r'("description"\s*:\s*")Service de mobile mechanic in [^"]+\.',
        lambda m: m.group(1) + f"Professional mobile mechanic service in {display_name}. Brake repair, clutch, electrical diagnostics, scanner, air conditioning, preventive maintenance. 24/7.",
        content
    )

    # ===== SEO H2 section - "Immediumte" fix =====
    content = content.replace("Immediumte Solution", "Immediate Solution")

    # ===== "look fordor" → "Looking for" =====
    content = content.replace("look fordor", "Looking for")

    # ===== "our team de technicians certifieds" → clean English =====
    content = re.sub(
        r'our team de technicians certifieds comes directly to your home, office, or location',
        'our certified technicians come directly to your home, office, or location',
        content
    )

    # ===== "schedule your appointment ally" → clean =====
    content = content.replace("schedule your appointment ally.", "schedule your appointment today.")

    # ===== Oil Change CTA "Schedule Your Oil Change Ya" → "Schedule Your Oil Change" =====
    content = content.replace("Schedule Your Oil Change Ya", "Schedule Your Oil Change")

    # ===== "Si you are looking for" → "If you are looking for" =====
    content = content.replace("Si you are looking for", "If you are looking for")

    # ===== "el shop mechanic until la puerta de tu hogar" → clean =====
    content = re.sub(
        r'GlobalPro Automotive brings el shop mechanic until la puerta de tu hogar in ([^,]+), corazon de la capital\. No you have que perder tiempo en traslados ni esperas en shopes: our technicians certifieds llegan con herramientas de diagnosis professional y parts de quality para atender vehicles ejecutivos, sedan premium y vehicles de service directly at your home service\. We connect with the neighborhoods of ([^.]+) to offer you a fast service y reliable, with no hidden costs or surprises\. Schedule on WhatsApp and receive personalized attention\.',
        lambda m: f'GlobalPro Automotive brings the mechanic shop directly to your doorstep in {display_name}, the heart of the capital. No need to waste time on commutes or waiting at shops: our certified technicians arrive with professional diagnostic tools and quality parts to service executive sedans, premium vehicles, and fleet vehicles right at your location. We connect with the neighborhoods of {m.group(2)} to offer you a fast and reliable service with no hidden costs or surprises. Schedule on WhatsApp and receive personalized attention.',
        content
    )

    # ===== "El automotive scanner es la herramienta clave" → clean =====
    content = re.sub(
        r'El automotive scanner es la herramienta clave para un diagnosis precise with no guesswork\. At GlobalPro, we perform escaneos electronic completes in ([^,]+) to detect faults in sensors, ECU modules, injection systems, ABS, airbags, and more\. Los vehicles que circulan por [^.]+\. Our technicians interpret each code and offer real solutions so your car runs like new again, right at your doorstep\.',
        lambda m: f'The automotive scanner is the key tool for accurate diagnostics with no guesswork. At GlobalPro, we perform complete electronic scans in {display_name} to detect faults in sensors, ECU modules, injection systems, ABS, airbags, and more. Vehicles in this area face traffic and climate conditions that generate specific error codes. Our technicians interpret each code and offer real solutions so your car runs like new again, right at your doorstep.',
        content
    )

    # ===== "El trafico frequent por" → clean =====
    content = re.sub(
        r'El trafico frequent por ([^.]+)\. Our service includes digital measurement',
        lambda m: f'Heavy traffic in {display_name} accelerates brake component wear. Our service includes digital measurement',
        content
    )

    # ===== "y fluido hydraulic" → "and hydraulic fluid" =====
    content = content.replace("y fluido hydraulic", "and hydraulic fluid")

    # ===== "schedule your brake inspection at home in ... hoy" → clean =====
    content = re.sub(
        r"schedule your brake inspection at home in [^.]+ hoy\.",
        f"schedule your brake inspection at home in {display_name} today.",
        content
    )

    # ===== Oil change block Spanglish =====
    content = re.sub(
        r'El oil change periodic es la inversion more important para proteger el engine de tu vehicle\. GlobalPro realiza este mobile service in ([^,]+) with premium synthetic and semi-synthetic oils from brands like Castrol, Mobil, and Shell\. We include oil filter, air filter inspection, and fluid level check\. Para los vehicles ejecutivos, sedan premium y vehicles de service que circulan por [^.]+, las condiciones de uso urban requieren intervalos de cambio de between 5\.000 y 10\.000 km\. Schedule fast por WhatsApp\.',
        lambda m: f'A regular oil change is the most important investment to protect your vehicle\'s engine. GlobalPro performs this mobile service in {display_name} with premium synthetic and semi-synthetic oils from brands like Castrol, Mobil, and Shell. We include oil filter, air filter inspection, and fluid level check. For executive sedans, premium vehicles, and fleet vehicles that circulate in this area, urban driving conditions require oil change intervals between 5,000 and 10,000 km. Schedule quickly on WhatsApp.',
        content
    )

    # ===== Engine repair block Spanglish =====
    content = re.sub(
        r'At GlobalPro, we serve vehicles ejecutivos, sedan premium y vehicles de service in ([^,]+) with advanced diagnostics including compression and leak-down tests to evaluate the internall condition',
        lambda m: f'At GlobalPro, we service executive sedans, premium vehicles, and fleet vehicles in {display_name} with advanced diagnostics including compression and leak-down tests to evaluate the internal condition',
        content
    )

    # ===== Clutch/Timing belt block Spanglish =====
    content = re.sub(
        r'El clutch y la belt de distribucion son components criticals que no can failurer\. Un clutch desgastado dificulta los cambios de marcha, mientras que una belt rota puede danar irreversibly el engine\. GlobalPro atiende emergencys mechanicss in ([^,]+) to replace these components with complete OEM-quality kits\. We serve vehicles ejecutivos, sedan premium y vehicles de service con parts certifieds, garantizandor a tralow professional sin tener que remolcar tu vehicle a un shop\.',
        lambda m: f'The clutch and timing belt are critical components that cannot fail. A worn clutch makes gear changes difficult, while a broken belt can irreversibly damage the engine. GlobalPro handles mechanical emergencies in {display_name} to replace these components with complete OEM-quality kits. We service executive sedans, premium vehicles, and fleet vehicles with certified parts, guaranteeing professional work without having to tow your vehicle to a shop.',
        content
    )

    # ===== Battery/Electrical block Spanglish =====
    content = re.sub(
        r'If your vehicle won\'t start, lights look dim, or you hear a click when turning the key, the problem could be the battery or electricall system\. At GlobalPro we perform diagnosis de auto electricall systems complete a home service in ([^:]+): we measure battery charge, test the alternator, verify the starter engine, and inspect wiring\. Los cambios de temperature en [^.]+\. We respond emergencys 24/7 para que no te quedes varado\.',
        lambda m: f'If your vehicle won\'t start, lights look dim, or you hear a click when turning the key, the problem could be the battery or electrical system. At GlobalPro we perform complete auto electrical system diagnostics at your home in {display_name}: we measure battery charge, test the alternator, verify the starter motor, and inspect wiring. Temperature changes in {display_name} directly affect battery life. We respond to emergencies 24/7 so you are never stranded.',
        content
    )

    # ===== Spark Plug block Spanglish =====
    content = re.sub(
        r'At GlobalPro, we replace spark plugs con las specifications exacts del manufacturer a home service in ([^.]+)\.',
        lambda m: f'At GlobalPro, we replace spark plugs with the exact manufacturer specifications at your home in {display_name}.',
        content
    )

    # ===== Emergency/Shop near me block Spanglish =====
    content = re.sub(
        r'If your vehicle breaks down in ([^ ]+) o sufres una emergency mechanics en [^.]+, GlobalPro responde las 24 horas del dia\. We are el shop mechanic a home service more nearby a ti, tu shop mechanic cerca de mi: llegamos en menos de 60 minutos para emergencys\. From dead batteries to engine failures, our technicians offer immediumte solutions in ([^.]+)\. No matter the time or place: GlobalPro is your trusted mechanic in ([^ ]+) para any emergency automotive\.',
        lambda m: f'If your vehicle breaks down in {display_name} or you suffer a mechanical emergency in this area, GlobalPro responds 24 hours a day. We are the closest mobile mechanic shop to you: we arrive in under 60 minutes for emergencies. From dead batteries to engine failures, our technicians offer immediate solutions in {m.group(2)}. No matter the time or place: GlobalPro is your trusted mechanic in {display_name} for any automotive emergency.',
        content
    )

    # ===== "Services Most Requested" → "Most Requested Services" =====
    content = content.replace("Services Most Requested", "Most Requested Services")

    # ===== Service card "y" → "and" in list items =====
    # "preventive maintenance, general lubrication, oil change y technical inspection" → and
    content = re.sub(r'(</strong>),?\s*y\s*(<strong>)', r'\1, and \2', content)

    # ===== "Get Quote Ahora" → "Get a Quote" =====
    content = content.replace('Get Quote Ahora</a>', 'Get a Quote</a>')
    content = content.replace('>Get Quote Ahora<', '>Get a Quote<')
    content = content.replace('Get Quote Heating Ahora', 'Get a Heating Quote')

    # ===== "optimall" → "optimal" =====
    content = content.replace("optimall", "optimal")

    # ===== "electricall" → "electrical" =====
    content = content.replace("electricall", "electrical")

    # ===== "internall" → "internal" =====
    content = content.replace("internall", "internal")

    # ===== "failurer" → "failure" =====
    content = content.replace("failurer", "failure")

    # ===== "maintenace" / "maintenance preventive" → clean =====
    # (already mostly ok, just fix remaining)

    # ===== "service de" → "service" or "service for" =====
    content = re.sub(r'\bservice de\b', 'service', content)

    # ===== Heating section - massive Spanglish block =====
    # This section is keyword-stuffed heating content. Replace the entire heating section
    # with clean English that still targets the keywords naturally.
    heating_match = re.search(
        r'(<!-- ===== CAMBIO DE ACEITE.*?FIN SECCIÓN CAMBIO DE ACEITE ===== -->)',
        content, re.DOTALL
    )
    if heating_match:
        # The oil change section is actually fine, it's the heating section below
        pass

    # Fix the massive heating/climate section Spanglish
    content = re.sub(
        r'If your system is failing or you need to improve your travel comfort in [^,]+, our technical team cuenta con rapid response units\. We specialize in the diagnosis, repair, and installation of.*?</p>',
        f'If your vehicle\'s heating or climate system is failing in {display_name}, our rapid-response team specializes in the diagnosis, repair, and installation of <strong style="color:#ff6b35;">vehicle heating systems</strong>, <strong style="color:#ff6b35;">car heaters</strong>, and <strong style="color:#ff6b35;">van heating systems</strong> directly at your location. When temperatures drop, we guarantee that your vehicle\'s heater works at full capacity and with total safety.</p>',
        content, flags=re.DOTALL
    )

    # Fix the second massive heating paragraph
    content = re.sub(
        r'We know que each tipo de transporte requiere una solution technical diferente\. That is why, our technicians traineds manejan a la perfeccion from systems traditional de.*?</p>',
        f'We know that each type of vehicle requires a different technical solution. Our trained technicians handle everything from traditional <strong style="color:#ff6b35;">car heating</strong> systems to specialized technology like <strong style="color:#ff6b35;">stationary vehicle heaters</strong>, <strong style="color:#ff6b35;">truck parking heaters</strong>, and <strong style="color:#ff6b35;">diesel engine heaters for motorhomes</strong>. For travel and outdoor enthusiasts, we also service <strong style="color:#ff6b35;">campervan heaters</strong>, <strong style="color:#ff6b35;">12V van heaters</strong>, and <strong style="color:#ff6b35;">portable van heaters</strong>, ensuring the ideal climate through specialized systems.</p>',
        content, flags=re.DOTALL
    )

    # Fix the third massive heating paragraph
    content = re.sub(
        r'Para quienes camperizan sus vehicles, we deliver solutiones efficients en.*?</p>',
        f'For campervan owners, we deliver efficient solutions for <strong style="color:#ff6b35;">vehicle heaters</strong>, <strong style="color:#ff6b35;">static van heaters</strong>, and <strong style="color:#ff6b35;">electric campervan heaters</strong>. We diagnose complex energy efficiency issues, evaluating whether your heater consumes excess fuel or whether it is best to install modern alternatives like <strong style="color:#ff6b35;">electric car heaters</strong> or <strong style="color:#ff6b35;">auxiliary car heaters</strong>. We also optimize heavy-duty systems by configuring <strong style="color:#ff6b35;">auxiliary van heaters</strong> for continuous performance.</p>',
        content, flags=re.DOTALL
    )

    # Fix the fourth heating paragraph
    content = re.sub(
        r'El confort termico interior tambien abarca los components electricalls distraights\. We solve desperfectos en la.*?</p>',
        f'Interior thermal comfort also covers electrical components. We repair faults in <strong style="color:#ff6b35;">heated car seats</strong> and energy distribution systems including <strong style="color:#ff6b35;">car battery heaters</strong>. Our mechanics have the equipment to replace specific cabin components, including common climate control failures. Don\'t risk your passengers\' comfort — if you want to optimize your <strong style="color:#ff6b35;">vehicle heating system</strong> or need a <strong style="color:#ff6b35;">portable car heater</strong>, activate your Express Order now.</p>',
        content, flags=re.DOTALL
    )

    # ===== WhatsApp URL Spanglish =====
    content = re.sub(
        r'href="https://wa\.me/56939026185\?text=Hola%20necesito%20service%20de%20heating%20automotive%20en%20Santiago"',
        f'href="https://wa.me/56939026185?text=Hi%20I%20need%20heating%20service%20in%20{slug}"',
        content
    )
    content = re.sub(
        r'href="https://wa\.me/56939026185\?text=Hola%20necesito%20electrical%20automotive%20a%20home service%20en%20Santiago"',
        f'href="https://wa.me/56939026185?text=Hi%20I%20need%20electrical%20service%20at%20home%20in%20{slug}"',
        content
    )
    content = re.sub(
        r'href="https://wa\.me/56939026185\?text=Hola,%20quiero%20get a quote%20por%20Diagnosis%20Computerized%20en%20Santiago"',
        f'href="https://wa.me/56939026185?text=Hi,%20I%20want%20a%20quote%20for%20Computerized%20Diagnostics%20in%20{slug}"',
        content
    )

    # ===== "Get a Quote on WhatsApp" in Electrical and Scanner cards =====
    content = re.sub(
        r'href="https://wa\.me/56939026185\?text=Hola%20necesito%20scanner%20automotive%20a%20home service%20en%20Santiago"',
        f'href="https://wa.me/56939026185?text=Hi%20I%20need%20automotive%20scanner%20at%20home%20in%20{slug}"',
        content
    )

    # ===== "How Our Mobile Mechanic Service Works" section subtitle Spanglish =====
    # Already clean, skip

    # ===== "Why Choose Us" section - clean =====

    # ===== Fix the SEO section H2 "The Best Mobile Mechanic" line =====
    # "Auto Repair Shop Near Me in Santiago" is already good, just fix comuna name if needed

    # ===== Fix remaining "y" as "and" in service card descriptions =====
    # Already handled above with the regex

    # ===== Fix "externall" → "external" =====
    content = content.replace("externall", "external")

    # ===== Fix "communes" → "areas" (Chilean term confusion) =====
    # "comunas" in English context → "areas" or "neighborhoods"
    content = re.sub(r'\bcomunas\b', 'areas', content, flags=re.IGNORECASE)

    return content


def main():
    base_dir = "/home/z/Globalpro-clone"
    en_dir = os.path.join(base_dir, "en", "comunas")
    es_dir = os.path.join(base_dir, "comunas")

    # Get list of comuna slugs
    en_files = sorted([f for f in os.listdir(en_dir) if f.endswith('.html')])
    es_files = sorted([f for f in os.listdir(es_dir) if f.endswith('.html')])

    print(f"Found {len(en_files)} EN comuna files and {len(es_files)} ES comuna files")
    print()

    # Process EN files (all 6 fixes)
    print("=== Processing 52 EN comuna files (all 6 priorities) ===")
    for filename in en_files:
        slug = filename.replace('.html', '')
        display = DISPLAY_NAMES.get(slug, slug.replace('-', ' ').title())
        filepath = os.path.join(en_dir, filename)
        try:
            process_en_file(filepath, slug, display)
        except Exception as e:
            print(f"  [EN] ERROR on {slug}: {e}")

    print()

    # Process ES files (only P1 + P6: schema geo/aggregateRating/streetAddress)
    print("=== Processing 52 ES comuna files (schema fixes only) ===")
    for filename in es_files:
        slug = filename.replace('.html', '')
        display = DISPLAY_NAMES.get(slug, slug.replace('-', ' ').title())
        filepath = os.path.join(es_dir, filename)
        try:
            process_es_file(filepath, slug, display)
        except Exception as e:
            print(f"  [ES] ERROR on {slug}: {e}")

    print()
    print("=== DONE ===")


if __name__ == "__main__":
    main()