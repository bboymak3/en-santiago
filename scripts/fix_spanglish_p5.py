#!/usr/bin/env python3
"""
Fix P5: Remove Spanglish from EN comuna pages.
- Fix LocalBusiness description: "Service de mobile mechanic en {Comuna}, Santiago." -> "Professional mobile mechanic service in {Comuna}, Santiago."
- Fix Service description: "Service mechanic a your home en {Comuna}, Santiago. Scanner automotive, brakes, oil, clutch, suspension, electrical, spark plugs, maintenance preventive and emergencies 24/7." -> "Mobile mechanic service at your location in {Comuna}, Santiago. Computerized diagnostics, brake repair, oil change, clutch replacement, suspension repair, electrical diagnostics, spark plug replacement, preventive maintenance, and 24/7 emergency service."
"""
import os, re, json

BASE = "/home/z/Globalpro-clone"
EN_DIR = f"{BASE}/en/comunas"

# Comuna display names (slug -> display name)
DISPLAY_NAMES = {
    "alhue": "Alhué", "buin": "Buín", "calera-de-tango": "Calera de Tango",
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
    "nunoa": "Ñuñoa", "padre-hurtado": "Padre Hurtado", "paine": "Paine",
    "pedro-aguirre-cerda": "Pedro Aguirre Cerda", "penaflor": "Peñaflor",
    "penalolen": "Peñalolén", "pirque": "Pirque", "providencia": "Providencia",
    "pudahuel": "Pudahuel", "puente-alto": "Puente Alto", "quilicura": "Quilicura",
    "quinta-normal": "Quinta Normal", "recoleta": "Recoleta", "renca": "Renca",
    "san-bernardo": "San Bernardo", "san-joaquin": "San Joaquín",
    "san-jose-de-maipo": "San José de Maipo", "san-miguel": "San Miguel",
    "san-pedro": "San Pedro", "san-ramon": "San Ramón", "santiago": "Santiago Centro",
    "talagante": "Talagante", "tiltil": "Tile", "vitacura": "Vitacura"
}

# The new Service description (constant for all comunas, only the comuna name changes)
# We use Santiago for the region context since all comunas are in the Santiago metro area
SVC_DESC_TEMPLATE = (
    "Mobile mechanic service at your location in {comuna}, Santiago. "
    "Computerized diagnostics, brake repair, oil change, clutch replacement, "
    "suspension repair, electrical diagnostics, spark plug replacement, "
    "preventive maintenance, and 24/7 emergency roadside assistance."
)

LB_DESC_TEMPLATE = (
    "Professional mobile mechanic service in {comuna}, Santiago. "
    "Brake repair, clutch replacement, auto electrical diagnostics, "
    "computerized scanner diagnosis, air conditioning service, oil change, "
    "and preventive maintenance. Available 24/7."
)


def fix_spanglish_in_file(filepath, slug):
    """Fix Spanglish in schema descriptions for one EN comuna page."""
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    comuna_display = DISPLAY_NAMES.get(slug, slug.replace('-', ' ').title())
    
    # Check if this file has the Spanglish pattern
    has_spanglish_lb = 'Service de mobile mechanic en' in html or 'Service de mobile mechanic' in html
    has_spanglish_svc = 'Service mechanic a your home en' in html or 'Scanner automotive' in html
    
    if not has_spanglish_lb and not has_spanglish_svc:
        return False, "no Spanglish found"
    
    original = html
    
    # Fix LocalBusiness description
    # Pattern: "Service de mobile mechanic en {Comuna}, Santiago. Repair of brakes, clutch, electrical, scanner, air conditioning, preventive maintenance. 24/7."
    new_lb_desc = LB_DESC_TEMPLATE.format(comuna=comuna_display)
    
    # Replace the old LB description in JSON-LD
    # We need to handle this carefully since it's inside JSON
    old_lb_pattern = r'"description":\s*"Service de mobile mechanic en [^"]+?"'
    html = re.sub(old_lb_pattern, f'"description": "{new_lb_desc}"', html)
    
    # Also handle "Service de mobile mechanic en" with Santiago Centro specifically
    old_lb_pattern2 = r'"description":\s*"Service de mobile mechanic en [^"]+?"'
    if 'Service de mobile mechanic en' in html:
        # Find the JSON-LD block containing it
        html = re.sub(
            r'"description":\s*"Service de mobile mechanic en[^"]*?"',
            f'"description": "{new_lb_desc}"',
            html
        )
    
    # Fix Service description
    new_svc_desc = SVC_DESC_TEMPLATE.format(comuna=comuna_display)
    
    # Old pattern: "Service mechanic a your home en {Comuna}, Santiago. Scanner automotive, brakes, oil, clutch, suspension, electrical, spark plugs, maintenance preventive and emergencies 24/7."
    old_svc_pattern = r'"description":\s*"Service mechanic a your home en[^"]*?"'
    html = re.sub(old_svc_pattern, f'"description": "{new_svc_desc}"', html)
    
    if html != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)
        return True, "fixed"
    return False, "pattern not matched"


def verify_fix(filepath, slug):
    """Verify that Spanglish was removed from a file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    
    issues = []
    
    # Check schemas
    schemas = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL)
    for s in schemas:
        try:
            d = json.loads(s)
            desc = d.get('description', '')
            # Check for Spanglish patterns
            spanglish = [
                'Service de ', ' en ' + DISPLAY_NAMES.get(slug, ''),
                'Scanner automotive', 'maintenance preventive',
                'a your home en', 'Service mechanic a'
            ]
            for sp in spanglish:
                if sp in desc:
                    issues.append(f"{d.get('@type')}: found '{sp}' in description")
        except:
            pass
    
    return issues


def main():
    fixed = 0
    skipped = 0
    errors = []
    
    en_files = sorted([f for f in os.listdir(EN_DIR) if f.endswith('.html')])
    
    print(f"Processing {len(en_files)} EN comuna pages...")
    
    for fname in en_files:
        slug = fname.replace('.html', '')
        filepath = os.path.join(EN_DIR, fname)
        
        try:
            was_fixed, msg = fix_spanglish_in_file(filepath, slug)
            if was_fixed:
                # Verify
                issues = verify_fix(filepath, slug)
                if issues:
                    errors.append(f"{slug}: {issues}")
                    print(f"  WARN {slug}: fixed but has issues: {issues}")
                else:
                    fixed += 1
                    print(f"  OK {slug}: {msg}")
            else:
                skipped += 1
                print(f"  SKIP {slug}: {msg}")
        except Exception as e:
            errors.append(f"{slug}: {e}")
            print(f"  ERR {slug}: {e}")
    
    print(f"\n=== RESULTS ===")
    print(f"Fixed: {fixed}")
    print(f"Skipped (already clean): {skipped}")
    print(f"Errors: {len(errors)}")
    if errors:
        for e in errors:
            print(f"  - {e}")


if __name__ == '__main__':
    main()