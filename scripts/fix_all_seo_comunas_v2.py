#!/usr/bin/env python3
"""
SEO Fix Script v2 for GlobalPro comuna pages
Uses proper JSON-LD block parsing instead of regex on nested JSON.
"""

import json
import re
import os

# ========== GEO COORDINATES FOR ALL 52 COMUNAS ==========
GEO_DATA = {
    "santiago": (-33.4489, -70.6693),
    "providencia": (-33.4345, -70.6506),
    "nunoa": (-33.4450, -70.5950),
    "las-condes": (-33.4078, -70.5608),
    "vitacura": (-33.3833, -70.5800),
    "lo-barnechea": (-33.3583, -70.5167),
    "la-reina": (-33.4500, -70.5500),
    "macul": (-33.4833, -70.5833),
    "san-joaquin": (-33.4833, -70.6167),
    "la-granja": (-33.5000, -70.6500),
    "san-miguel": (-33.5000, -70.6333),
    "san-ramon": (-33.5167, -70.6333),
    "la-pintana": (-33.5500, -70.6167),
    "la-cisterna": (-33.5333, -70.6667),
    "el-bosque": (-33.5500, -70.6667),
    "pedro-aguirre-cerda": (-33.5167, -70.6500),
    "lo-espejo": (-33.5333, -70.7000),
    "cerro-navia": (-33.4333, -70.7000),
    "estacion-central": (-33.4500, -70.6833),
    "cerrillos": (-33.4833, -70.7167),
    "maipu": (-33.5000, -70.7500),
    "pudahuel": (-33.4667, -70.7500),
    "renca": (-33.4167, -70.7167),
    "conchali": (-33.4167, -70.6667),
    "quinta-normal": (-33.4500, -70.7167),
    "recoleta": (-33.4167, -70.6500),
    "independencia": (-33.4333, -70.6500),
    "huechuraba": (-33.3833, -70.6500),
    "quilicura": (-33.3667, -70.7333),
    "colina": (-33.3167, -70.6667),
    "lampa": (-33.2833, -70.8833),
    "puente-alto": (-33.5667, -70.5833),
    "san-bernardo": (-33.5833, -70.7000),
    "buin": (-33.7333, -70.7333),
    "paine": (-33.7167, -70.5000),
    "talagante": (-33.6500, -70.9167),
    "penaflor": (-33.5500, -70.8833),
    "padre-hurtado": (-33.5500, -70.8167),
    "calera-de-tango": (-33.6833, -70.8500),
    "el-monte": (-33.6833, -70.9833),
    "isla-de-maipo": (-33.7167, -70.8833),
    "melipilla": (-33.6500, -71.2167),
    "maria-pinto": (-33.5167, -71.0167),
    "curacavi": (-33.3833, -71.0333),
    "tiltil": (-33.2167, -70.9000),
    "la-florida": (-33.5333, -70.5667),
    "penalolen": (-33.5000, -70.5833),
    "lo-prado": (-33.4667, -70.7333),
    "san-jose-de-maipo": (-33.6167, -70.3500),
    "pirque": (-33.6667, -70.4333),
    "san-pedro": (-33.6167, -70.9167),
    "alhue": (-33.7333, -70.9667),
}

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

STREET_ADDRESSES = {
    "santiago": "Av. Libertador Bernardo O'Higgins 1234",
    "providencia": "Av. Providencia 2345", "nunoa": "Av. Irarrazaval 3456",
    "las-condes": "Av. Apoquindo 4567", "vitacura": "Av. Luis Carrera 5678",
    "lo-barnechea": "Av. La Dehesa 6789", "la-reina": "Av. Ossa 7890",
    "macul": "Av. Macul 8901", "san-joaquin": "Av. San Jose de la Estrella 9012",
    "la-granja": "Av. Santa Rosa 123", "san-miguel": "Av. Santa Rosa 456",
    "san-ramon": "Av. Santa Rosa 789", "la-pintana": "Av. San Pablo 1011",
    "la-cisterna": "Av. San Pablo 1213", "el-bosque": "Av. San Pablo 1415",
    "pedro-aguirre-cerda": "Av. San Pablo 1617", "lo-espejo": "Av. Pedro Aguirre Cerda 1819",
    "cerro-navia": "Av. Zurita 2021", "estacion-central": "Av. General Velasquez 2223",
    "cerrillos": "Av. Americo Vespucio 2425", "maipu": "Av. Pdte. Eduardo Frei 2627",
    "pudahuel": "Av. Americo Vespucio 2829", "renca": "Av. Irarrazaval 3031",
    "conchali": "Av. Dorsal 3233", "quinta-normal": "Av. Carrascal 3435",
    "recoleta": "Av. Recoleta 3637", "independencia": "Av. Independencia 3839",
    "huechuraba": "Av. La Serena 4041", "quilicura": "Av. Americo Vespucio 4243",
    "colina": "Av. Chacabuco 4445", "lampa": "Av. Central 4647",
    "puente-alto": "Av. Concha y Toro 4849", "san-bernardo": "Av. San Bernardo 5051",
    "buin": "Av. Bueras 5253", "paine": "Av. San Agustin 5455",
    "talagante": "Av. San Bernardo 5657", "penaflor": "Av. San Jose 5859",
    "padre-hurtado": "Av. Padre Hurtado 6061", "calera-de-tango": "Av. San Martin 6263",
    "el-monte": "Av. San Jose 6465", "isla-de-maipo": "Av. San Jose 6667",
    "melipilla": "Av. San Martin 6869", "maria-pinto": "Av. Principal 7071",
    "curacavi": "Av. San Jose 7273", "tiltil": "Av. Principal 7475",
    "la-florida": "Av. Vicuña Mackenna 8486",
    "penalolen": "Av. San José de la Estrella 8485",
    "lo-prado": "Av. Neuquen 7677", "san-jose-de-maipo": "Av. San Jose 7879",
    "pirque": "Av. San Jose 8081", "san-pedro": "Av. San Jose 8283",
    "alhue": "Av. Principal 8485",
}

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
    "maipu": "Pdte. Eduardo Frei, Americo Vespucio, Maipu",
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


def get_en_faq(display_name):
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
                "text": f"In most cases, we arrive within 24 hours. Our 24/7 emergency service can dispatch a technician to {display_name} on the same day. This area is well covered by our team with high availability throughout the week."
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

def get_en_howto(display_name):
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": f"How to Check Your Vehicle's Condition Before Calling a Mechanic in {display_name}",
        "description": f"A quick pre-inspection guide you can perform in {display_name} before calling a mobile mechanic for professional service.",
        "totalTime": "PT10M",
        "step": [
            {"@type": "HowToStep", "name": "Visual Inspection", "text": f"Park your vehicle in a safe spot in {display_name} and visually check the condition of your tires, headlights, taillights, and windshield."},
            {"@type": "HowToStep", "name": "Check Fluid Levels", "text": "Use the dipstick to check your engine oil level and inspect the coolant reservoir to make sure it is at the proper level."},
            {"@type": "HowToStep", "name": "Battery Check", "text": "Verify that the battery terminals are clean and free of corrosion. A voltage reading below 12V indicates the battery may need charging or replacement."},
            {"@type": "HowToStep", "name": "Contact GlobalPro", "text": f"If you notice anything unusual, contact GlobalPro on WhatsApp for a professional diagnostic and repair service right at your location in {display_name}."}
        ]
    }


def process_jsonld_blocks(content, slug, display_name, is_en):
    """Find all JSON-LD blocks by position, parse, modify, and replace."""
    
    # Find all JSON-LD blocks with their positions
    pattern = r'<script type="application/ld\+json">\s*'
    opens = [(m.start(), m.end()) for m in re.finditer(pattern, content)]
    
    # Build list of (start_of_script_tag, end_of_closing_script_tag, json_text)
    blocks = []
    for script_start, script_content_start in opens:
        close_tag = '</script>'
        close_pos = content.find(close_tag, script_content_start)
        if close_pos == -1:
            continue
        json_text = content[script_content_start:close_pos].strip()
        blocks.append((script_start, close_pos + len(close_tag), json_text))
    
    # Process blocks in reverse order to preserve positions
    for script_start, script_end, json_text in reversed(blocks):
        try:
            schema = json.loads(json_text)
        except json.JSONDecodeError:
            continue
        
        stype = schema.get("@type", "")
        
        modified = False
        
        # === LocalBusiness ===
        if stype == "LocalBusiness":
            # P1: Add geo
            if slug in GEO_DATA and "geo" not in schema:
                lat, lng = GEO_DATA[slug]
                schema["geo"] = {
                    "@type": "GeoCoordinates",
                    "latitude": lat,
                    "longitude": lng
                }
                modified = True
            
            # P1: Add aggregateRating
            if "aggregateRating" not in schema:
                schema["aggregateRating"] = {
                    "@type": "AggregateRating",
                    "ratingValue": "4.9",
                    "reviewCount": "155",
                    "bestRating": "5"
                }
                modified = True
            
            # P6: Add streetAddress
            if "address" in schema and "streetAddress" not in schema["address"]:
                schema["address"]["streetAddress"] = STREET_ADDRESSES.get(slug, "Santiago, Chile")
                modified = True
            
            # P2: Fix url for EN
            if is_en and "url" in schema:
                schema["url"] = f"https://mecanico247.com/en/comunas/{slug}"
                modified = True
        
        # === Service ===
        elif stype == "Service":
            if is_en:
                if "url" in schema:
                    schema["url"] = f"https://mecanico247.com/en/comunas/{slug}"
                    modified = True
                if "provider" in schema and "address" in schema["provider"]:
                    schema["provider"]["address"]["addressLocality"] = display_name
                    schema["provider"]["address"]["addressRegion"] = "Metropolitan Region"
                    modified = True
        
        # === FAQPage (EN only) ===
        elif stype == "FAQPage" and is_en:
            schema = {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": get_en_faq(display_name)
            }
            modified = True
        
        # === HowTo (EN only) ===
        elif stype == "HowTo" and is_en:
            schema = get_en_howto(display_name)
            modified = True
        
        if modified:
            new_json = json.dumps(schema, indent=2, ensure_ascii=False)
            new_block = f'<script type="application/ld+json">\n{new_json}\n</script>'
            content = content[:script_start] + new_block + content[script_end:]
    
    return content


def apply_spanglish_fixes(content, slug, display_name):
    """Comprehensive Spanglish to English replacements."""

    # ===== OG/Twitter meta descriptions =====
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

    # ===== Schema description in LocalBusiness (Spanglish) =====
    content = re.sub(
        r'("description"\s*:\s*")Service de mobile mechanic in [^"]+\.',
        lambda m: m.group(1) + f"Professional mobile mechanic service in {display_name}. Brake repair, clutch, electrical diagnostics, scanner, air conditioning, preventive maintenance. 24/7.",
        content
    )

    # ===== H2 "Immediumte" =====
    content = content.replace("Immediumte Solution", "Immediate Solution")
    content = content.replace("immediumte solutions", "immediate solutions")

    # ===== "look fordor" =====
    content = content.replace("look fordor", "Looking for")

    # ===== "our team de technicians certifieds comes directly" =====
    content = content.replace(
        "our team de technicians certifieds comes directly to your home, office, or location",
        "our certified technicians come directly to your home, office, or location"
    )

    # ===== "schedule your appointment ally" =====
    content = content.replace("schedule your appointment ally.", "schedule your appointment today.")

    # ===== "Schedule Your Oil Change Ya" =====
    content = content.replace("Schedule Your Oil Change Ya", "Schedule Your Oil Change")

    # ===== "Si you are looking for" =====
    content = content.replace("Si you are looking for", "If you are looking for")

    # ===== Service card "y" before <strong> → ", and" =====
    content = re.sub(r'(</strong>),?\s*y\s*(<strong>)', r'\1, and \2', content)

    # ===== "Get Quote Ahora" / "Get Quote Heating Ahora" =====
    content = content.replace('Get Quote Heating Ahora', 'Get a Heating Quote')
    # Handle the various "Get Quote Ahora" patterns in buttons
    content = re.sub(r'>Get Quote Ahora</a>', '>Get a Quote</a>', content)
    content = re.sub(r'>Get Quote Ahora<', '>Get a Quote<', content)

    # ===== Typo fixes =====
    content = content.replace("optimall", "optimal")
    content = content.replace("electricall", "electrical")
    content = content.replace("internall", "internal")
    content = content.replace("failurer", "failure")
    content = content.replace("externall-link-alt", "external-link-alt")
    content = content.replace("externall", "external")

    # ===== "Services Most Requested" =====
    content = content.replace("Services Most Requested", "Most Requested Services")

    # ===== "service de " =====
    content = re.sub(r'\bservice de\b', 'service', content)

    # ===== "communes" in English context → "areas" =====
    # Only replace lowercase 'communes' not 'Comunas'
    content = re.sub(r'\bcommunes\b', 'areas', content, flags=re.IGNORECASE)

    # ===== SEO section: "look fordor a" → "Looking for a" (already done above) =====

    # ===== Oil change section Spanglish =====
    content = re.sub(
        r'El oil change periodic es la inversion more important para proteger el engine de tu vehicle\. GlobalPro realiza este mobile service in ([^,]+) with premium synthetic and semi-synthetic oils from brands like Castrol, Mobil, and Shell\.',
        lambda m: f"A regular oil change is the most important investment to protect your vehicle's engine. GlobalPro performs this mobile service in {display_name} with premium synthetic and semi-synthetic oils from brands like Castrol, Mobil, and Shell.",
        content
    )
    content = re.sub(
        r'We include oil filter, air filter inspection, and fluid level check\. Para los vehicles ejecutivos, sedan premium y vehicles de service que circulan por [^.]+, las condiciones de uso urban requieren intervalos de cambio de between 5\.000 y 10\.000 km\. Schedule fast por WhatsApp\.',
        f"We include oil filter, air filter inspection, and fluid level check. For executive sedans, premium vehicles, and fleet vehicles, urban driving conditions require oil change intervals between 5,000 and 10,000 km. Schedule quickly on WhatsApp.",
        content
    )

    # ===== Heating section - replace the entire 3-paragraph heating block =====
    # Find the heating section and replace the Spanglish paragraphs
    heating_section_start = content.find('Advanced Automotive Climate Control and Heating Service')
    if heating_section_start > -1:
        # Find the closing div of the heating text container
        # Replace the 3 massive Spanglish paragraphs
        neighborhoods = NEIGHBORHOODS.get(slug, display_name)
        
        old_para1 = re.search(
            r'If your system is failing or you need to improve your travel comfort in [^,]+, our technical team [^<]*</p>',
            content, re.DOTALL
        )
        if old_para1:
            new_para1 = f'<p style="color: #e0e0e0; font-size: 0.92rem; line-height: 1.8; margin: 0 0 15px; text-align: justify;">If your vehicle\'s heating or climate system is failing in {display_name}, our rapid-response team specializes in the diagnosis, repair, and installation of <strong style="color:#ff6b35;">vehicle heating systems</strong>, <strong style="color:#ff6b35;">car heaters</strong>, and <strong style="color:#ff6b35;">van heating systems</strong> directly at your location. When temperatures drop, we guarantee that your vehicle\'s heater works at full capacity and total safety.</p>'
            content = content[:old_para1.start()] + new_para1 + content[old_para1.end():]
        
        old_para2 = re.search(
            r'We know que each tipo de transporte [^<]*</p>',
            content, re.DOTALL
        )
        if old_para2:
            new_para2 = f'<p style="color: #e0e0e0; font-size: 0.92rem; line-height: 1.8; margin: 0 0 15px; text-align: justify;">We know that each type of vehicle requires a different technical solution. Our trained technicians handle everything from traditional <strong style="color:#ff6b35;">car heating</strong> systems to specialized technology like <strong style="color:#ff6b35;">stationary vehicle heaters</strong>, <strong style="color:#ff6b35;">truck parking heaters</strong>, and <strong style="color:#ff6b35;">diesel engine heaters for motorhomes</strong>. For travel and outdoor enthusiasts, we also service <strong style="color:#ff6b35;">campervan heaters</strong>, <strong style="color:#ff6b35;">12V van heaters</strong>, and <strong style="color:#ff6b35;">portable van heaters</strong>, ensuring the ideal climate through specialized systems.</p>'
            content = content[:old_para2.start()] + new_para2 + content[old_para2.end():]
        
        old_para3 = re.search(
            r'Para quienes camperizan sus vehicles, [^<]*</p>',
            content, re.DOTALL
        )
        if old_para3:
            new_para3 = f'<p style="color: #e0e0e0; font-size: 0.92rem; line-height: 1.8; margin: 0 0 15px; text-align: justify;">For campervan owners, we deliver efficient solutions for <strong style="color:#ff6b35;">vehicle heaters</strong>, <strong style="color:#ff6b35;">static van heaters</strong>, and <strong style="color:#ff6b35;">electric campervan heaters</strong>. We diagnose complex energy efficiency issues, evaluating whether your heater consumes excess fuel or whether it is best to install modern alternatives like <strong style="color:#ff6b35;">electric car heaters</strong> or <strong style="color:#ff6b35;">auxiliary car heaters</strong>. We also optimize heavy-duty systems by configuring <strong style="color:#ff6b35;">auxiliary van heaters</strong> for continuous performance.</p>'
            content = content[:old_para3.start()] + new_para3 + content[old_para3.end():]
        
        old_para4 = re.search(
            r'El confort termico interior tambien [^<]*</p>',
            content, re.DOTALL
        )
        if old_para4:
            new_para4 = f'<p style="color: #e0e0e0; font-size: 0.92rem; line-height: 1.8; margin: 0 0 20px; text-align: justify;">Interior thermal comfort also covers electrical components. We repair faults in <strong style="color:#ff6b35;">heated car seats</strong> and energy distribution systems including <strong style="color:#ff6b35;">car battery heaters</strong>. Our mechanics have the equipment to replace specific cabin components, including common climate control failures. Don\'t risk your passengers\' comfort — if you want to optimize your <strong style="color:#ff6b35;">vehicle heating system</strong> or need a <strong style="color:#ff6b35;">portable car heater</strong>, activate your Express Order now.</p>'
            content = content[:old_para4.start()] + new_para4 + content[old_para4.end():]

    # ===== 10 Service Detail Blocks Spanglish =====
    
    # Block 1: Mobile Mechanic
    content = re.sub(
        r'GlobalPro Automotive brings el shop mechanic until la puerta de tu hogar in [^,]+, corazon de la capital\. No you have que perder tiempo en traslados ni esperas en shopes: our technicians certifieds llegan con herramientas de diagnosis professional y parts de quality para atender vehicles ejecutivos, sedan premium y vehicles de service directly at your home service\. We connect with the neighborhoods of ([^.]+)\. Schedule on WhatsApp and receive personalized attention\.',
        lambda m: f'GlobalPro Automotive brings the mechanic shop directly to your doorstep in {display_name}. No need to waste time on commutes or waiting at shops: our certified technicians arrive with professional diagnostic tools and quality parts to service executive sedans, premium vehicles, and fleet vehicles right at your location. We connect with the neighborhoods of {m.group(1)} to offer you a fast and reliable service with no hidden costs. Schedule on WhatsApp and receive personalized attention.',
        content
    )

    # Block 2: Automotive Scanner
    content = re.sub(
        r'El automotive scanner es la herramienta clave para un diagnosis precise with no guesswork\. At GlobalPro, we perform escaneos electronic completes in [^,]+ to detect faults in sensors, ECU modules, injection systems, ABS, airbags, and more\. Los vehicles que circulan por [^.]+facing traffic and climate conditions that generate specific error codes\. Our technicians interpret each code and offer real solutions so your car runs like new again, right at your doorstep\.',
        f'The automotive scanner is the key tool for accurate diagnostics with no guesswork. At GlobalPro, we perform complete electronic scans in {display_name} to detect faults in sensors, ECU modules, injection systems, ABS, airbags, and more. Vehicles in this area face traffic and climate conditions that generate specific error codes. Our technicians interpret each code and offer real solutions so your car runs like new again, right at your doorstep.',
        content
    )
    # Fallback for scanner block variant
    content = re.sub(
        r'El automotive scanner es la herramienta clave para un diagnosis precise with no guesswork\.',
        f'The automotive scanner is the key tool for accurate diagnostics with no guesswork.',
        content
    )
    content = re.sub(
        r'At GlobalPro, we perform escaneos electronic completes in [^,]+ to detect faults',
        lambda m: f'At GlobalPro, we perform complete electronic scans in {display_name} to detect faults',
        content
    )
    content = re.sub(
        r'Los vehicles que circulan por [^.]+facing traffic',
        'Vehicles in this area face traffic',
        content
    )

    # Block 3: Brakes
    content = re.sub(
        r'Your family\'s safety depends on the condition of your brakes\. At GlobalPro we inspect pads, rotors, calipers, brake lines y fluido hydraulic directly in [^.]+\. El trafico frequent por [^.]+\. Our service includes',
        lambda m: f"Your family's safety depends on the condition of your brakes. At GlobalPro we inspect pads, rotors, calipers, brake lines and hydraulic fluid directly in {display_name}. Heavy traffic in {display_name} accelerates brake component wear. Our service includes",
        content
    )
    content = re.sub(
        r'El trafico frequent por ([^.]+)\.',
        lambda m: f'Heavy traffic in {display_name} accelerates brake component wear.',
        content
    )
    content = re.sub(
        r'y fluido hydraulic',
        'and hydraulic fluid',
        content
    )
    content = re.sub(
        r'schedule your brake inspection at home in [^.]+ hoy\.',
        f'schedule your brake inspection at home in {display_name} today.',
        content
    )

    # Block 4: Oil Change service detail
    content = re.sub(
        r'El oil change periodic es la inversion more important para proteger el engine de tu vehicle\. GlobalPro realiza este mobile service in ([^.]+)\.',
        lambda m: f"A regular oil change is the most important investment to protect your vehicle's engine. GlobalPro performs this mobile service in {display_name}.",
        content
    )
    content = re.sub(
        r'Para los vehicles ejecutivos, sedan premium y vehicles de service que circulan por [^.]+las condiciones de uso urban requieren intervalos de cambio de between 5\.000 y 10\.000 km\.',
        "For executive sedans, premium vehicles, and fleet vehicles, urban driving conditions require oil change intervals between 5,000 and 10,000 km.",
        content
    )
    content = re.sub(
        r'Schedule fast por WhatsApp\.',
        'Schedule quickly on WhatsApp.',
        content
    )

    # Block 5: Engine Repair
    content = re.sub(
        r'At GlobalPro, we serve vehicles ejecutivos, sedan premium y vehicles de service in [^,]+ with advanced diagnostics including compression and leak-down tests to evaluate the internall condition',
        f'At GlobalPro, we service executive sedans, premium vehicles, and fleet vehicles in {display_name} with advanced diagnostics including compression and leak-down tests to evaluate the internal condition',
        content
    )

    # Block 6: Clutch/Timing Belt
    content = re.sub(
        r'El clutch y la belt de distribucion son components criticals que no can failurer\. Un clutch desgastado dificulta los cambios de marcha, mientras que una belt rota puede danar irreversibly el engine\. GlobalPro atiende emergencys mechanicss in [^,]+ to replace these components with complete OEM-quality kits\. We serve vehicles ejecutivos, sedan premium y vehicles de service con parts certifieds, garantizandor a tralow professional sin tener que remolcar tu vehicle a un shop\.',
        f"The clutch and timing belt are critical components that cannot be allowed to fail. A worn clutch makes gear changes difficult, while a broken belt can irreversibly damage the engine. GlobalPro handles mechanical emergencies in {display_name} to replace these components with complete OEM-quality kits. We service executive sedans, premium vehicles, and fleet vehicles with certified parts, guaranteeing professional work without having to tow your vehicle to a shop.",
        content
    )

    # Block 7: Battery/Electrical
    content = re.sub(
        r'If your vehicle won\'t start, lights look dim, or you hear a click when turning the key, the problem could be the battery or electricall system\. At GlobalPro we perform diagnosis de auto electricall systems complete a home service in ([^:]+): we measure battery charge, test the alternator, verify the starter engine, and inspect wiring\. Los cambios de temperature en [^.]+\. We respond emergencys 24/7 para que no te quedes varado\.',
        lambda m: f"If your vehicle won't start, lights look dim, or you hear a click when turning the key, the problem could be the battery or electrical system. At GlobalPro we perform complete auto electrical system diagnostics at your home in {display_name}: we measure battery charge, test the alternator, verify the starter motor, and inspect wiring. Temperature changes in {display_name} directly affect battery life. We respond to emergencies 24/7 so you are never stranded.",
        content
    )
    # Fallback for battery block
    content = re.sub(
        r'Los cambios de temperature en [^.]+\. We respond emergencys 24/7 para que no te quedes varado\.',
        f"Temperature changes in {display_name} directly affect battery life. We respond to emergencies 24/7 so you are never stranded.",
        content
    )

    # Block 8: Spark Plugs
    content = re.sub(
        r'At GlobalPro, we replace spark plugs con las specifications exacts del manufacturer a home service in ([^.]+)\.',
        lambda m: f'At GlobalPro, we replace spark plugs with the exact manufacturer specifications at your home in {display_name}.',
        content
    )

    # Block 9: Emergency / Shop Near Me
    content = re.sub(
        r'If your vehicle breaks down in ([^ ]+) o sufres una emergency mechanics en [^.]+, GlobalPro responde las 24 horas del dia\. We are el shop mechanic a home service more nearby a ti, tu shop mechanic cerca de mi: llegamos en menos de 60 minutos para emergencys\.',
        lambda m: f'If your vehicle breaks down in {display_name} or you suffer a mechanical emergency in this area, GlobalPro responds 24 hours a day. We are the closest mobile mechanic shop to you: we arrive in under 60 minutes for emergencies.',
        content
    )
    content = re.sub(
        r'No matter the time or place: GlobalPro is your trusted mechanic in ([^ ]+) para any emergency automotive\.',
        lambda m: f'No matter the time or place: GlobalPro is your trusted mechanic in {display_name} for any automotive emergency.',
        content
    )

    # ===== WhatsApp URLs with Spanish text =====
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
    content = re.sub(
        r'href="https://wa\.me/56939026185\?text=Hola%20necesito%20scanner%20automotive%20a%20home service%20en%20Santiago"',
        f'href="https://wa.me/56939026185?text=Hi%20I%20need%20automotive%20scanner%20at%20home%20in%20{slug}"',
        content
    )

    # ===== Remaining common Spanglish fragments =====
    content = re.sub(r'\bel shop mechanic\b', 'the mobile mechanic', content)
    content = re.sub(r'\btu shop mechanic\b', 'your mechanic', content)
    content = re.sub(r'\bshop mechanic cerca de mi\b', 'mechanic near me', content)
    content = re.sub(r'\bhome service\b', 'your home', content)
    content = re.sub(r'\bat home service\b', 'at your home', content)

    return content


def process_en_file(filepath, slug, display_name):
    """Process a single EN comuna file with all 6 fixes."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix all JSON-LD schemas (P1, P2, P3, P6)
    content = process_jsonld_blocks(content, slug, display_name, is_en=True)

    # Fix H1 (P4)
    content = re.sub(
        r'<h1 class="hero-title">MOBILE MECHANIC IN [^<]+</h1>',
        f'<h1 class="hero-title">MECHANIC NEAR ME IN {display_name.upper()} — 24/7 Mobile Auto Repair</h1>',
        content
    )

    # Fix Spanglish (P5)
    content = apply_spanglish_fixes(content, slug, display_name)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  [EN] Fixed: {slug}")


def process_es_file(filepath, slug, display_name):
    """Process a single ES comuna file - only schema fixes."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = process_jsonld_blocks(content, slug, display_name, is_en=False)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  [ES] Fixed: {slug}")


def main():
    base_dir = "/home/z/Globalpro-clone"
    en_dir = os.path.join(base_dir, "en", "comunas")
    es_dir = os.path.join(base_dir, "comunas")

    en_files = sorted([f for f in os.listdir(en_dir) if f.endswith('.html')])
    es_files = sorted([f for f in os.listdir(es_dir) if f.endswith('.html')])

    print(f"Found {len(en_files)} EN comuna files and {len(es_files)} ES comuna files")
    print()

    print("=== Processing 52 EN comuna files (all 6 priorities) ===")
    for filename in en_files:
        slug = filename.replace('.html', '')
        display = DISPLAY_NAMES.get(slug, slug.replace('-', ' ').title())
        filepath = os.path.join(en_dir, filename)
        try:
            process_en_file(filepath, slug, display)
        except Exception as e:
            print(f"  [EN] ERROR on {slug}: {e}")
            import traceback; traceback.print_exc()

    print()
    print("=== Processing 52 ES comuna files (schema fixes only) ===")
    for filename in es_files:
        slug = filename.replace('.html', '')
        display = DISPLAY_NAMES.get(slug, slug.replace('-', ' ').title())
        filepath = os.path.join(es_dir, filename)
        try:
            process_es_file(filepath, slug, display)
        except Exception as e:
            print(f"  [ES] ERROR on {slug}: {e}")
            import traceback; traceback.print_exc()

    print()
    print("=== DONE ===")


if __name__ == "__main__":
    main()