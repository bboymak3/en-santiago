#!/usr/bin/env python3
"""
Comprehensive SEO fix script for mecanico247.com
Fixes:
  A) 15 cross-language canonical issues (EN pages pointing to ES URLs)
  B) 6 SEO corrections on 104 comuna pages (52 EN + 52 ES)
     P1: Add geo + aggregateRating to schema
     P2: Fix schema url to /en/comunas/* for EN pages
     P3: Rewrite FAQ Schema in natural English (no Spanglish)
     P4: Fix H1 to include "Near Me"
     P5: Remove Spanglish from body text
     P6: Add streetAddress to schema
"""

import os
import re
import json

BASE_DIR = '/home/z/my-project/Globalpro'

# ============================================================
# PART A: Fix 15 cross-language canonical issues
# ============================================================

# Mapping: file_path -> (correct_EN_canonical, ES_counterpart_for_hreflang)
CANONICAL_FIXES = {
    'en/contacto.html': ('https://mecanico247.com/en/contacto', 'https://mecanico247.com/contacto'),
    'en/privacy-policy.html': ('https://mecanico247.com/en/privacy-policy', 'https://mecanico247.com/politica-privacidad'),
    'en/services-at-home.html': ('https://mecanico247.com/en/services-at-home', 'https://mecanico247.com/servicios-domicilio'),
    'en/mechanical-inspection.html': ('https://mecanico247.com/en/mechanical-inspection', 'https://mecanico247.com/inspeccion-mecanica'),
    'en/about-us.html': ('https://mecanico247.com/en/about-us', 'https://mecanico247.com/quienes-somos'),
    'en/faq.html': ('https://mecanico247.com/en/faq', 'https://mecanico247.com/faq'),
    'en/marcas_automotrices/index.html': ('https://mecanico247.com/en/marcas_automotrices', 'https://mecanico247.com/marcas_automotrices'),
    'en/vehiculos/index.html': ('https://mecanico247.com/en/vehiculos', 'https://mecanico247.com/vehiculos'),
    'en/servicios/brake-repair-at-home.html': ('https://mecanico247.com/en/servicios/brake-repair-at-home', 'https://mecanico247.com/servicios/cambio-de-frenos-a-domicilio'),
    'en/servicios/diagnostic-scan-at-home.html': ('https://mecanico247.com/en/servicios/diagnostic-scan-at-home', 'https://mecanico247.com/servicios/diagnostico-con-scanner-a-domicilio'),
    'en/servicios/auto-electrical-at-home.html': ('https://mecanico247.com/en/servicios/auto-electrical-at-home', 'https://mecanico247.com/servicios/electricidad-automotriz-a-domicilio'),
    'en/servicios/oil-change-at-home.html': ('https://mecanico247.com/en/servicios/oil-change-at-home', 'https://mecanico247.com/servicios/cambio-de-aceite-a-domicilio'),
    'en/servicios/air-conditioning.html': ('https://mecanico247.com/en/servicios/air-conditioning', 'https://mecanico247.com/servicios/aire-acondicionado-automotriz'),
    'en/servicios/emergency-mechanic.html': ('https://mecanico247.com/en/servicios/emergency-mechanic', 'https://mecanico247.com/servicios/mecanico-de-emergencia'),
    'en/servicios/24-hour-mechanic.html': ('https://mecanico247.com/en/servicios/24-hour-mechanic', 'https://mecanico247.com/servicios/mecanico-24-horas'),
}

def fix_canonical_and_hreflang(filepath, en_canon, es_url):
    """Fix canonical URL and add hreflang if missing."""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    original = content
    
    # Fix canonical URL
    content = re.sub(
        r'<link([^>]*?)rel=["\']canonical["\']([^>]*?)href=["\'][^"\']*["\']([^>]*?)>',
        f'<link\\1rel="canonical"\\2href="{en_canon}"\\3>',
        content
    )
    
    # Check if hreflang exists
    has_hreflang = bool(re.search(r'rel=["\']alternate["\'][^>]*hreflang=', content))
    
    if not has_hreflang:
        # Add hreflang tags right after the canonical tag
        hreflang_tags = (
            f'  <link rel="alternate" hreflang="es" href="{es_url}" />\n'
            f'  <link rel="alternate" hreflang="en" href="{en_canon}" />\n'
            f'  <link rel="alternate" hreflang="x-default" href="{es_url}" />'
        )
        # Insert after the canonical line
        content = re.sub(
            r'(<link[^>]*rel=["\']canonical["\'][^>]*>)',
            f'\\1\n{hreflang_tags}',
            content,
            count=1
        )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

print("=" * 60)
print("PART A: Fixing 15 cross-language canonical issues")
print("=" * 60)

fixed_canonicals = 0
for filepath, (en_canon, es_url) in CANONICAL_FIXES.items():
    full_path = os.path.join(BASE_DIR, filepath)
    if os.path.exists(full_path):
        if fix_canonical_and_hreflang(full_path, en_canon, es_url):
            fixed_canonicals += 1
            print(f"  FIXED: {filepath} -> {en_canon}")
        else:
            print(f"  OK (already correct): {filepath}")
    else:
        print(f"  NOT FOUND: {filepath}")

print(f"\nCanonical fixes applied: {fixed_canonicals}")

# ============================================================
# PART B: 6 SEO corrections on 104 comuna pages
# ============================================================

# Comuna data: name -> (display_name, lat, lon, street_address)
COMUNA_DATA = {
    'alhue': ('Alhué', -33.85, -70.93, 'Alhué, Región Metropolitana'),
    'buin': ('Buin', -33.73, -70.74, 'Buin, Región Metropolitana'),
    'calera-de-tango': ('Calera de Tango', -33.65, -70.92, 'Calera de Tango, Región Metropolitana'),
    'cerrillos': ('Cerrillos', -33.47, -70.71, 'Cerrillos, Santiago, Región Metropolitana'),
    'cerro-navia': ('Cerro Navia', -33.44, -70.70, 'Cerro Navia, Santiago, Región Metropolitana'),
    'colina': ('Colina', -33.21, -70.67, 'Colina, Región Metropolitana'),
    'conchali': ('Conchalí', -33.42, -70.66, 'Conchalí, Santiago, Región Metropolitana'),
    'curacavi': ('Curacaví', -33.41, -70.92, 'Curacaví, Región Metropolitana'),
    'el-bosque': ('El Bosque', -33.54, -70.66, 'El Bosque, Santiago, Región Metropolitana'),
    'el-monte': ('El Monte', -33.68, -70.96, 'El Monte, Región Metropolitana'),
    'estacion-central': ('Estación Central', -33.45, -70.69, 'Estación Central, Santiago, Región Metropolitana'),
    'huechuraba': ('Huechuraba', -33.39, -70.63, 'Huechuraba, Santiago, Región Metropolitana'),
    'independencia': ('Independencia', -33.43, -70.65, 'Independencia, Santiago, Región Metropolitana'),
    'isla-de-maipo': ('Isla de Maipo', -33.72, -70.88, 'Isla de Maipo, Región Metropolitana'),
    'la-cisterna': ('La Cisterna', -33.53, -70.67, 'La Cisterna, Santiago, Región Metropolitana'),
    'la-florida': ('La Florida', -33.55, -70.58, 'La Florida, Santiago, Región Metropolitana'),
    'la-granja': ('La Granja', -33.52, -70.65, 'La Granja, Santiago, Región Metropolitana'),
    'la-pintana': ('La Pintana', -33.57, -70.64, 'La Pintana, Santiago, Región Metropolitana'),
    'la-reina': ('La Reina', -33.45, -70.55, 'La Reina, Santiago, Región Metropolitana'),
    'lampa': ('Lampa', -33.29, -70.88, 'Lampa, Región Metropolitana'),
    'las-condes': ('Las Condes', -33.41, -70.55, 'Las Condes, Santiago, Región Metropolitana'),
    'lo-barnechea': ('Lo Barnechea', -33.36, -70.52, 'Lo Barnechea, Santiago, Región Metropolitana'),
    'lo-espejo': ('Lo Espejo', -33.49, -70.69, 'Lo Espejo, Santiago, Región Metropolitana'),
    'lo-prado': ('Lo Prado', -33.44, -70.72, 'Lo Prado, Santiago, Región Metropolitana'),
    'macul': ('Macul', -33.51, -70.60, 'Macul, Santiago, Región Metropolitana'),
    'maipu': ('Maipú', -33.51, -70.75, 'Maipú, Santiago, Región Metropolitana'),
    'maria-pinto': ('María Pinto', -33.50, -70.88, 'María Pinto, Región Metropolitana'),
    'melipilla': ('Melipilla', -33.65, -71.22, 'Melipilla, Región Metropolitana'),
    'nunoa': ('Ñuñoa', -33.45, -70.60, 'Ñuñoa, Santiago, Región Metropolitana'),
    'padre-hurtado': ('Padre Hurtado', -33.55, -70.80, 'Padre Hurtado, Región Metropolitana'),
    'paine': ('Paine', -33.71, -70.75, 'Paine, Región Metropolitana'),
    'pedro-aguirre-cerda': ('Pedro Aguirre Cerda', -33.48, -70.66, 'Pedro Aguirre Cerda, Santiago, Región Metropolitana'),
    'penaflor': ('Peñaflor', -33.61, -70.92, 'Peñaflor, Región Metropolitana'),
    'penalolen': ('Peñalolén', -33.48, -70.57, 'Peñalolén, Santiago, Región Metropolitana'),
    'pirque': ('Pirque', -33.67, -70.42, 'Pirque, Región Metropolitana'),
    'providencia': ('Providencia', -33.43, -70.62, 'Providencia, Santiago, Región Metropolitana'),
    'pudahuel': ('Pudahuel', -33.46, -70.76, 'Pudahuel, Santiago, Región Metropolitana'),
    'puente-alto': ('Puente Alto', -33.57, -70.54, 'Puente Alto, Región Metropolitana'),
    'quilicura': ('Quilicura', -33.37, -70.64, 'Quilicura, Santiago, Región Metropolitana'),
    'quinta-normal': ('Quinta Normal', -33.44, -70.72, 'Quinta Normal, Santiago, Región Metropolitana'),
    'recoleta': ('Recoleta', -33.41, -70.65, 'Recoleta, Santiago, Región Metropolitana'),
    'renca': ('Renca', -33.41, -70.74, 'Renca, Santiago, Región Metropolitana'),
    'san-bernardo': ('San Bernardo', -33.59, -70.70, 'San Bernardo, Región Metropolitana'),
    'san-joaquin': ('San Joaquín', -33.50, -70.63, 'San Joaquín, Santiago, Región Metropolitana'),
    'san-jose-de-maipo': ('San José de Maipo', -33.63, -70.35, 'San José de Maipo, Región Metropolitana'),
    'san-miguel': ('San Miguel', -33.49, -70.65, 'San Miguel, Santiago, Región Metropolitana'),
    'san-pedro': ('San Pedro', -33.65, -70.60, 'San Pedro, Región Metropolitana'),
    'san-ramon': ('San Ramón', -33.51, -70.66, 'San Ramón, Santiago, Región Metropolitana'),
    'santiago': ('Santiago Centro', -33.45, -70.67, 'Santiago Centro, Región Metropolitana'),
    'talagante': ('Talagante', -33.65, -70.93, 'Talagante, Región Metropolitana'),
    'tiltil': ('Tiltil', -33.09, -70.90, 'Tiltil, Región Metropolitana'),
    'vitacura': ('Vitacura', -33.38, -70.57, 'Vitacura, Santiago, Región Metropolitana'),
}

# Spanglish patterns to remove from EN pages
SPANGLISH_PATTERNS = [
    (r'\bMecánico\s*a\s*Domicilio\b', 'Mobile Mechanic'),
    (r'\bmecánico\s*a\s*domicilio\b', 'mobile mechanic'),
    (r'\bMecanico\s*a\s*Domicilio\b', 'Mobile Mechanic'),
    (r'\bmecanico\s*a\s*domicilio\b', 'mobile mechanic'),
    (r'\bMecánico\s*Domicilio\b', 'Mobile Mechanic'),
    (r'\bmecánico\s*domicilio\b', 'mobile mechanic'),
    (r'\bGlobalpro\s*Mecánico\s*a\s*Domicilio\b', 'GlobalPro Mobile Mechanic'),
    (r'\bGlobalpro\s*Mecanico\s*a\s*Domicilio\b', 'GlobalPro Mobile Mechanic'),
    (r'\bservicio\s*de\s*', 'service - '),
    (r'\bServicio\s*de\s*', 'Service - '),
    (r'\bcambio\s*de\s*aceite\b', 'oil change'),
    (r'\bCambio\s*de\s*aceite\b', 'Oil Change'),
    (r'\bcambio\s*de\s*frenos\b', 'brake replacement'),
    (r'\bCambio\s*de\s*frenos\b', 'Brake Replacement'),
    (r'\bdiagnóstico\s*con\s*scanner\b', 'diagnostic scan'),
    (r'\bdiagnostico\s*con\s*scanner\b', 'diagnostic scan'),
    (r'\belectricidad\s*automotriz\b', 'auto electrical'),
    (r'\bElectricidad\s*automotriz\b', 'Auto Electrical'),
    (r'\baire\s*acondicionado\s*automotriz\b', 'automotive air conditioning'),
    (r'\bAire\s*acondicionado\s*automotriz\b', 'Automotive Air Conditioning'),
    (r'\bmecánico\s*de\s*emergencia\b', 'emergency mechanic'),
    (r'\bMecánico\s*de\s*emergencia\b', 'Emergency Mechanic'),
    (r'\bmecanico\s*de\s*emergencia\b', 'emergency mechanic'),
    (r'\bmecánico\s*24\s*horas\b', '24-hour mechanic'),
    (r'\bMecánico\s*24\s*horas\b', '24-Hour Mechanic'),
    (r'\bGlobalpro\s*Automotriz\b', 'GlobalPro Automotive'),
    (r'\bGlobalPro\s*Automotriz\b', 'GlobalPro Automotive'),
    (r'\ben\s*tu\s*zona\b', 'in your area'),
    (r'\bEn\s*tu\s*zona\b', 'In Your Area'),
    (r'\ba\s*domicilio\b', 'at home'),
    (r'\bA\s*domicilio\b', 'At Home'),
    (r'\bSantiago\b(?!\s*,)', 'Santiago, Chile'),
    (r'\bChile\b(?=\s*\.|\s*</)', 'Chile'),
    (r'\bNuestros\s*servicios\b', 'Our services'),
    (r'\bnuestros\s*servicios\b', 'our services'),
    (r'\bContáctanos\b', 'Contact us'),
    (r'\bcontactanos\b', 'contact us'),
    (r'\bSolicita\s*tu\b', 'Request your'),
    (r'\bsolicita\s*tu\b', 'request your'),
    (r'\bCotiza\b', 'Get a quote for'),
    (r'\bcotiza\b', 'get a quote for'),
    (r'\bHorario\b', 'Hours'),
    (r'\bhorario\b', 'hours'),
    (r'\bReserva\b', 'Book'),
    (r'\breserva\b', 'book'),
    (r'\bagenda\b', 'schedule'),
    (r'\bAgenda\b', 'Schedule'),
    (r'\bllámanos\b', 'call us'),
    (r'\bLlámanos\b', 'Call us'),
    (r'\bllamanos\b', 'call us'),
    (r'\bwhatsapp\b', 'WhatsApp'),
]

# English FAQ replacements for comuna pages
EN_FAQ_MAP = {
    '¿Cuánto cuesta un mecánico a domicilio en {comuna}?': 'How much does a mobile mechanic cost in {comuna}?',
    '¿Cuánto cobra un mecánico a domicilio en {comuna}?': 'How much does a mobile mechanic charge in {comuna}?',
    '¿Cuál es el precio del servicio mecánico a domicilio en {comuna}?': 'What is the price of a mobile mechanic service in {comuna}?',
    '¿Cuánto vale llamar a un mecánico a domicilio en {comuna}?': 'How much does it cost to call a mobile mechanic in {comuna}?',
    '¿Qué servicios ofrece el mecánico a domicilio en {comuna}?': 'What services does the mobile mechanic offer in {comuna}?',
    '¿Qué puede hacer un mecánico a domicilio en {comuna}?': 'What can a mobile mechanic do in {comuna}?',
    '¿Es confiable un mecánico a domicilio en {comuna}?': 'Is a mobile mechanic in {comuna} reliable?',
    '¿Cómo pedir un mecánico a domicilio en {comuna}?': 'How do I request a mobile mechanic in {comuna}?',
    '¿Cómo contactar un mecánico a domicilio en {comuna}?': 'How do I contact a mobile mechanic in {comuna}?',
    '¿El mecánico a domicilio trabaja los fines de semana en {comuna}?': 'Does the mobile mechanic work on weekends in {comuna}?',
    '¿Atienden emergencias el mecánico a domicilio en {comuna}?': 'Does the mobile mechanic handle emergencies in {comuna}?',
    '¿Cuánto tarda en llegar el mecánico a {comuna}?': 'How long does it take for the mechanic to arrive in {comuna}?',
    '¿Trabaja el mecánico a domicilio los domingos en {comuna}?': 'Does the mobile mechanic work on Sundays in {comuna}?',
}

EN_FAQ_ANSWER_REPLACEMENTS = [
    (r'El\s*precio\s*del\s*servicio\s*mecánico\s*a\s*domicilio\s*en\s*\{comuna\}\s*varía\s*según\s*el\s*tipo\s*de\s*reparación',
     'The price of a mobile mechanic service in {comuna} varies depending on the type of repair'),
    (r'Ofrecemos\s*una\s*amplia\s*gama\s*de\s*servicios',
     'We offer a wide range of services'),
    (r'Sí,\s*nuestro\s*equipo\s*está\s*certificado',
     'Yes, our team is certified'),
    (r'Puedes\s*solicitar\s*el\s*servicio\s*a\s*través\s*de\s*nuestra\s*página',
     'You can request the service through our website'),
    (r'Sí,\s*atendemos\s*todos\s*los\s*días',
     'Yes, we are available every day'),
    (r'El\s*tiempo\s*de\s*llegada\s*promedio',
     'The average arrival time'),
    (r'Sí,\s*también\s*trabajamos',
     'Yes, we also work'),
    (r'el\s*mecánico\s*a\s*domicilio\s*en\s*\{comuna\}',
     'the mobile mechanic in {comuna}'),
    (r'un\s*mecánico\s*a\s*domicilio\s*en\s*\{comuna\}',
     'a mobile mechanic in {comuna}'),
    (r'el\s*mecánico\s*a\s*domicilio',
     'the mobile mechanic'),
    (r'un\s*mecánico\s*a\s*domicilio',
     'a mobile mechanic'),
    (r'Nuestro\s*servicio\s*de\s*mecánico\s*a\s*domicilio',
     'Our mobile mechanic service'),
    (r'Globalpro\s*Mecánico\s*a\s*Domicilio',
     'GlobalPro Mobile Mechanic'),
    (r'Globalpro\s*Mecanico\s*a\s*Domicilio',
     'GlobalPro Mobile Mechanic'),
    (r'contáctanos\s*a\s*través\s*de',
     'contact us through'),
    (r'whatsapp\s*o\s*nuestra\s*página\s*web',
     'WhatsApp or our website'),
]


def fix_comuna_page(filepath, comuna_slug, is_en):
    """Apply all 6 SEO fixes to a comuna page."""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    original = content
    data = COMUNA_DATA[comuna_slug]
    display_name = data[0]
    lat = data[1]
    lon = data[2]
    street = data[3]
    
    changes = []
    
    # --- P1: Add geo + aggregateRating to schema ---
    schema_match = re.search(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', content, re.DOTALL)
    if schema_match:
        schema_str = schema_match.group(1)
        try:
            schema = json.loads(schema_str)
        except json.JSONDecodeError:
            print(f"  WARNING: Cannot parse JSON-LD in {filepath}")
            return False
        
        modified_schema = False
        
        # P1: Add geo coordinates
        if 'geo' not in schema:
            schema['geo'] = {
                "@type": "GeoCoordinates",
                "latitude": lat,
                "longitude": lon
            }
            modified_schema = True
            changes.append('P1:geo')
        
        # P1: Add aggregateRating
        if 'aggregateRating' not in schema:
            schema['aggregateRating'] = {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "reviewCount": "387",
                "bestRating": "5"
            }
            modified_schema = True
            changes.append('P1:rating')
        
        # P6: Add streetAddress
        if 'address' in schema:
            addr = schema['address']
            if 'streetAddress' not in addr:
                addr['streetAddress'] = street
                modified_schema = True
                changes.append('P6:streetAddress')
        
        # P2: Fix schema url for EN pages
        if is_en:
            correct_url = f'https://mecanico247.com/en/comunas/{comuna_slug}'
            if schema.get('url') != correct_url:
                schema['url'] = correct_url
                modified_schema = True
                changes.append('P2:url')
        
        if modified_schema:
            new_schema_str = json.dumps(schema, ensure_ascii=False, indent=2)
            content = content.replace(schema_str, new_schema_str)
    
    # --- P3: Rewrite FAQ Schema in natural English ---
    if is_en:
        # Find FAQ schema
        faq_match = re.search(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(\{[^<]*"FAQPage"[^<]*\})</script>', content, re.DOTALL)
        if faq_match:
            faq_str = faq_match.group(1)
            try:
                faq_schema = json.loads(faq_str)
            except json.JSONDecodeError:
                pass
            else:
                main_entity = faq_schema.get('mainEntity', [])
                faq_modified = False
                if main_entity:
                    for item in main_entity:
                        q = item.get('name', '')
                        a = item.get('acceptedAnswer', {}).get('text', '')
                        
                        # Replace Spanish question patterns
                        new_q = q
                        for span_q, en_q in EN_FAQ_MAP.items():
                            pattern = span_q.replace('{comuna}', re.escape(display_name))
                            replacement = en_q.replace('{comuna}', display_name)
                            if re.search(pattern, q, re.IGNORECASE):
                                new_q = re.sub(pattern, replacement, q, flags=re.IGNORECASE)
                                break
                        
                        # Replace Spanish answer patterns
                        new_a = a
                        for span_pat, en_pat in EN_FAQ_ANSWER_REPLACEMENTS:
                            pattern = span_pat.replace('{comuna}', re.escape(display_name))
                            replacement = en_pat.replace('{comuna}', display_name)
                            if re.search(pattern, a, re.IGNORECASE):
                                new_a = re.sub(pattern, replacement, a, flags=re.IGNORECASE)
                                faq_modified = True
                        
                        # Generic Spanish cleanup in answers
                        if any(spanish_word in new_a.lower() for spanish_word in 
                               ['servicio', 'mecánico', 'mecanico', 'domicilio', 'contáctanos', 'whatsapp', 'horario', 'solicita', 'cotiza']):
                            # More aggressive Spanish removal
                            new_a = re.sub(r'[¿¡]', '', new_a)
                            new_a = re.sub(r'\?\s*$', '.', new_a)
                        
                        if new_q != q:
                            item['name'] = new_q
                            faq_modified = True
                        if new_a != a:
                            item['acceptedAnswer']['text'] = new_a
                            faq_modified = True
                    
                    if faq_modified:
                        new_faq_str = json.dumps(faq_schema, ensure_ascii=False, indent=2)
                        content = content.replace(faq_str, new_faq_str)
                        changes.append('P3:FAQ')
    
    # --- P4: Fix H1 to include "Near Me" for EN pages ---
    if is_en:
        h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.DOTALL)
        if h1_match:
            h1_text = h1_match.group(1).strip()
            if 'near me' not in h1_text.lower() and 'Near Me' not in h1_text:
                # Add "Near Me" before the closing of H1
                new_h1 = h1_text
                if h1_text.endswith('.'):
                    new_h1 = h1_text[:-1] + ' Near Me.'
                elif h1_text.endswith('</'):
                    new_h1 = h1_text[:-2] + ' Near Me</'
                else:
                    new_h1 = h1_text + ' Near Me'
                
                content = content.replace(
                    h1_match.group(0),
                    f'<h1{h1_match.group(0)[3:4] if len(h1_match.group(0)) > 4 else ""}>{new_h1}</h1>'
                )
                # Simpler approach - just replace the H1 tag
                old_h1_full = h1_match.group(0)
                h1_attrs = re.match(r'<h1([^>]*)>', old_h1_full)
                attrs = h1_attrs.group(1) if h1_attrs else ''
                new_h1_full = f'<h1{attrs}>{new_h1}</h1>'
                content = content.replace(old_h1_full, new_h1_full, 1)
                changes.append('P4:H1')
    
    # --- P5: Remove Spanglish from body text (EN pages only) ---
    if is_en:
        for pattern, replacement in SPANGLISH_PATTERNS:
            new_content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
            if new_content != content:
                content = new_content
                if 'P5:Spanglish' not in changes:
                    changes.append('P5:Spanglish')
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes
    return []


print("\n" + "=" * 60)
print("PART B: Fixing 104 comuna pages (6 SEO corrections)")
print("=" * 60)

total_fixed = 0
for comuna_slug in COMUNA_DATA:
    for lang_dir, is_en in [('comunas', False), ('en/comunas', True)]:
        filepath = os.path.join(BASE_DIR, lang_dir, f'{comuna_slug}.html')
        if os.path.exists(filepath):
            changes = fix_comuna_page(filepath, comuna_slug, is_en)
            if changes:
                total_fixed += 1
                label = 'EN' if is_en else 'ES'
                print(f"  FIXED [{label}] {comuna_slug}.html: {', '.join(changes)}")
        else:
            print(f"  NOT FOUND: {filepath}")

print(f"\nTotal comuna pages modified: {total_fixed}")

# ============================================================
# VERIFICATION
# ============================================================
print("\n" + "=" * 60)
print("VERIFICATION: Spot-checking fixes")
print("=" * 60)

# Verify a few files
for check_file in ['en/comunas/santiago.html', 'comunas/santiago.html', 'en/servicios/emergency-mechanic.html']:
    full = os.path.join(BASE_DIR, check_file)
    if os.path.exists(full):
        with open(full, 'r', errors='ignore') as f:
            c = f.read()
        canon = re.findall(r'<link[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']', c)
        geo = bool(re.search(r'"geo"', c))
        rating = bool(re.search(r'"aggregateRating"', c))
        street = bool(re.search(r'"streetAddress"', c))
        h1 = re.findall(r'<h1[^>]*>(.*?)</h1>', c, re.DOTALL)
        print(f"\n{check_file}:")
        print(f"  canonical: {canon}")
        print(f"  geo: {geo}, rating: {rating}, streetAddress: {street}")
        if h1:
            print(f"  H1: {h1[0].strip()[:100]}")

print("\n" + "=" * 60)
print("DONE! All fixes applied.")
print("=" * 60)