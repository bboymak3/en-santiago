#!/usr/bin/env python3
"""Patch v5: Final cleanup of ALL remaining Spanglish by exact text matching."""

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
        lines = f.readlines()
    
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # === HEATING PARA 2: "We know que each tipo..." ===
        if 'We know que each tipo de transporte' in line:
            new_lines.append(
                f'        <p style="color: #e0e0e0; font-size: 0.92rem; line-height: 1.8; margin: 0 0 15px; text-align: justify;">'
                f'We know that each type of vehicle requires a different technical solution. Our trained technicians handle everything from traditional '
                f'<strong style="color:#ff6b35;">car heating</strong> systems to specialized technology like '
                f'<strong style="color:#ff6b35;">stationary vehicle heaters</strong>, '
                f'<strong style="color:#ff6b35;">truck parking heaters</strong>, and '
                f'<strong style="color:#ff6b35;">diesel engine heaters for motorhomes</strong>. '
                f'For travel and outdoor enthusiasts, we also service '
                f'<strong style="color:#ff6b35;">campervan heaters</strong>, '
                f'<strong style="color:#ff6b35;">12V van heaters</strong>, and '
                f'<strong style="color:#ff6b35;">portable van heaters</strong>, ensuring the ideal climate through specialized systems like '
                f'<strong style="color:#ff6b35;">motorhome diesel heaters</strong>, '
                f'<strong style="color:#ff6b35;">stationary caravan heaters</strong>, and '
                f'<strong style="color:#ff6b35;">motorhome heaters</strong>.</p>\n'
            )
            i += 1
            continue
        
        # === HEATING PARA 3: "Para quienes camperizan sus vehicles..." ===
        if 'Para quienes camperizan sus vehicles' in line:
            new_lines.append(
                f'        <p style="color: #e0e0e0; font-size: 0.92rem; line-height: 1.8; margin: 0 0 15px; text-align: justify;">'
                f'For campervan owners, we deliver efficient solutions for '
                f'<strong style="color:#ff6b35;">vehicle heaters</strong>, '
                f'<strong style="color:#ff6b35;">static van heaters</strong>, '
                f'<strong style="color:#ff6b35;">camper van heaters</strong>, and '
                f'<strong style="color:#ff6b35;">electric van heaters</strong>. '
                f'We diagnose complex energy efficiency issues, evaluating whether your heater consumes excess fuel or whether it is best to install modern alternatives like '
                f'<strong style="color:#ff6b35;">electric car heaters</strong> or '
                f'<strong style="color:#ff6b35;">auxiliary car heaters</strong>. '
                f'We also optimize heavy-duty systems by configuring '
                f'<strong style="color:#ff6b35;">auxiliary van heaters</strong> for continuous performance.</p>\n'
            )
            i += 1
            continue
        
        # === HEATING PARA 4: "El confort termico interior tambien abarca..." ===
        if 'El confort termico interior tambien' in line:
            new_lines.append(
                f'        <p style="color: #e0e0e0; font-size: 0.92rem; line-height: 1.8; margin: 0 0 20px; text-align: justify;">'
                f'Interior thermal comfort also covers electrical components. We repair faults in '
                f'<strong style="color:#ff6b35;">heated car seats</strong> and energy distribution systems including '
                f'<strong style="color:#ff6b35;">car battery heaters</strong>. '
                f'Our mechanics have the equipment to replace specific cabin components, including common climate control failures. '
                f'Don\'t risk your passengers\' comfort — if you want to optimize your '
                f'<strong style="color:#ff6b35;">vehicle heating system</strong> or need a '
                f'<strong style="color:#ff6b35;">portable car heater</strong>, activate your Express Order now.</p>\n'
            )
            i += 1
            continue
        
        # === EMERGENCY BLOCK: "o sufres una emergency mechanics en" ===
        if 'o sufres una emergency mechanics' in line:
            # Get the neighborhoods from the original line
            orig = line
            # Extract neighborhoods
            m_hoods = re.search(r'immediate solutions in ([^.]+)\.', orig)
            hoods = m_hoods.group(1) if m_hoods else display
            
            new_line = (
                f'          <p style="font-size: 0.95rem; color: #555; line-height: 1.8; text-align: justify; margin-bottom: 0;">'
                f'If your vehicle breaks down in {display} or you suffer a mechanical emergency in this area, '
                f'GlobalPro responds 24 hours a day. We are the closest mobile mechanic to you: '
                f'we arrive in under 60 minutes for emergencies. '
                f'From dead batteries to engine failures, our technicians offer immediate solutions in {hoods}. '
                f'No matter the time or place: GlobalPro is your trusted mechanic in {display} for any automotive emergency.</p>\n'
            )
            new_lines.append(new_line)
            i += 1
            continue
        
        new_lines.append(line)
        i += 1
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

print("Patch v5 applied to all 52 EN comuna files")