#!/usr/bin/env python3
"""Patch v4: Fix ALL remaining Spanglish in EN comuna files."""

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

    # ===== H3 titles: "Electricall" → "Electrical" =====
    c = c.replace("Electromechanical & Electricall", "Electromechanical & Electrical")
    c = c.replace("Battery and Electricall Service", "Battery and Electrical Service")
    c = c.replace("Electricall System", "Electrical System")

    # ===== Footer: emergency service items =====
    c = c.replace("> Attention a your home o tralow<br>", "> Service at your home or on the road<br>")
    c = c.replace("> Auxilio en carretera<br>", "> Roadside assistance<br>")
    c = c.replace("> Problems de starter<br>", "> Starter problems<br>")
    c = c.replace("> Failures electricals repentinas", "> Sudden electrical failures")

    # ===== Footer: "Services maines" comment and title =====
    c = c.replace("<!-- Services maines -->", "<!-- Main Services -->")
    c = c.replace(">Main Services<", ">Main Services<")  # already fixed
    c = c.replace("<!-- Services maines -->", "<!-- Main Services -->")
    c = c.replace(">Main Services<", ">Main Services<")
    
    # Check if "Services maines" still in title div
    if ">Services maines<" in c:
        c = c.replace(">Services maines<", ">Main Services<")
    if "<!-- Services maines -->" in c:
        c = c.replace("<!-- Services maines -->", "<!-- Main Services -->")

    # ===== Footer: service list items =====
    c = c.replace("> Repair of engine y transmission<br>", "> Engine and transmission repair<br>")
    c = c.replace("> Brakes, suspension y steering<br>", "> Brakes, suspension, and steering<br>")
    c = c.replace("> Maintenance preventive<", "> Preventive maintenance<")

    # ===== "Horario" → "Hours" =====
    c = c.replace("<!-- Horario -->", "<!-- Hours -->")
    c = c.replace(">Horario<", ">Hours<")
    if ">Horario<" in c:
        c = c.replace(">Horario<", ">Hours<")

    # ===== "155+ opiniones en Google" → "155+ Google reviews" =====
    c = c.replace("155+ opiniones en Google", "155+ Google reviews")

    # ===== "Nueas Guarantees" → "Our Guarantees" =====
    c = c.replace("Nueas Guarantees", "Our Guarantees")

    # ===== "At-Home Service en all Santiago" =====
    c = re.sub(
        r'At-Home Service en all [A-Z][^<]+<',
        lambda m: f'At-Home Service throughout {display}<',
        c
    )

    # ===== Heating para 2, 3, 4 - the "We know que" and "Para quienes" paragraphs =====
    # These paragraphs are in the heating section. Find and replace them by their content.
    
    # Para 2: "We know que each tipo de transporte..."
    c = re.sub(
        r'We know que each tipo de transporte requiere una solution technical diferente\. That is why, our technicians traineds manejan a la perfeccion from systems traditional de <strong style="color:#ff6b35;">heating coche</strong> until technologys specific como la <strong style="color:#ff6b35;">heating stationary coche</strong>, <strong style="color:#ff6b35;">heating stationary para camiones</strong> y <strong style="color:#ff6b35;">heating para camion</strong>\. Ademore, si eres amante de los viajes y la vida en ruta, we solve any problem de <strong style="color:#ff6b35;">heating furgoneta</strong>, <strong style="color:#ff6b35;">heating furgoneta 12v</strong> y <strong style="color:#ff6b35;">heating portable furgoneta</strong>, garantizando el clima ideal through systems specializados como la <strong style="color:#ff6b35;">heating diesel enginehome</strong>, <strong style="color:#ff6b35;">heating stationary caravana</strong>, <strong style="color:#ff6b35;">heating para autocaravana</strong> y <strong style="color:#ff6b35;">heating para casa rodante</strong>\.</p>',
        '<p style="color: #e0e0e0; font-size: 0.92rem; line-height: 1.8; margin: 0 0 15px; text-align: justify;">We know that each type of vehicle requires a different technical solution. Our trained technicians handle everything from traditional <strong style="color:#ff6b35;">car heating</strong> systems to specialized technology like <strong style="color:#ff6b35;">stationary vehicle heaters</strong>, <strong style="color:#ff6b35;">truck parking heaters</strong>, and <strong style="color:#ff6b35;">diesel engine heaters for motorhomes</strong>. For travel and outdoor enthusiasts, we also service <strong style="color:#ff6b35;">campervan heaters</strong>, <strong style="color:#ff6b35;">12V van heaters</strong>, and <strong style="color:#ff6b35;">portable van heaters</strong>, ensuring the ideal climate through specialized systems like <strong style="color:#ff6b35;">motorhome diesel heaters</strong>, <strong style="color:#ff6b35;">stationary caravan heaters</strong>, and <strong style="color:#ff6b35;">motorhome heaters</strong>.</p>',
        c
    )

    # Para 3: "Para quienes camperizan sus vehicles..."
    c = re.sub(
        r'<p style="color: #e0e0e0; font-size: 0\.92rem; line-height: 1\.8; margin: 0 0 15px; text-align: justify;">Para quienes camperizan sus vehicles, we deliver solutiones efficients en <strong style="color:#ff6b35;">heating de vehicles</strong>, <strong style="color:#ff6b35;">heating static furgoneta</strong>, <strong style="color:#ff6b35;">heating para furgonetas camper</strong> y <strong style="color:#ff6b35;">heating electrical furgoneta</strong>\. We serve failures complexs de efficiency energetica, evaluando si la heating coche consume gasoline en exceso o si es best implementar alternativas moderns como la <strong style="color:#ff6b35;">heating electrical para automobilees</strong>, <strong style="color:#ff6b35;">heating electrical para coche</strong> or aa <strong style="color:#ff6b35;">heating auxiliary para coche</strong>\. Asisame, we optimize systems pesados configurando <strong style="color:#ff6b35;">heating auxiliary para furgonetas</strong> y <strong style="color:#ff6b35;">heating autonomousus coche</strong> para un performance continuous\.</p>',
        '<p style="color: #e0e0e0; font-size: 0.92rem; line-height: 1.8; margin: 0 0 15px; text-align: justify;">For campervan owners, we deliver efficient solutions for <strong style="color:#ff6b35;">vehicle heaters</strong>, <strong style="color:#ff6b35;">static van heaters</strong>, <strong style="color:#ff6b35;">camper van heaters</strong>, and <strong style="color:#ff6b35;">electric van heaters</strong>. We diagnose complex energy efficiency issues, evaluating whether your heater consumes excess fuel or whether it is best to install modern alternatives like <strong style="color:#ff6b35;">electric car heaters</strong> or <strong style="color:#ff6b35;">auxiliary car heaters</strong>. We also optimize heavy-duty systems by configuring <strong style="color:#ff6b35;">auxiliary van heaters</strong> for continuous performance.</p>',
        c
    )

    # Para 4: "El confort termico interior tambien abarca..."
    c = re.sub(
        r'<p style="color: #e0e0e0; font-size: 0\.92rem; line-height: 1\.8; margin: 0 0 20px; text-align: justify;">El confort termico interior tambien abarca los components electricalls distraights\. We solve desperfectos en la <strong style="color:#ff6b35;">heating asiento coche</strong>, <strong style="color:#ff6b35;">heating en asientos coche</strong> y en la distribucion de energia como la <strong style="color:#ff6b35;">heating battery coche</strong>\. Nuestros mechanics cuentan con el equipamiento para sustituir components specifics del habitaculo, includesndo failures commones de climate control mlatestrca como la <strong style="color:#ff6b35;">resistencia heating peugeot 207</strong>\. No arriesgues la comodidad de tus pasajeros; si you are looking for optimizar la <strong style="color:#ff6b35;">heating de autos</strong>, <strong style="color:#ff6b35;">heating autos</strong>, <strong style="color:#ff6b35;">heating carro</strong>, <strong style="color:#ff6b35;">heating vehicles</strong> o reyou want una <strong style="color:#ff6b35;">heating para coche</strong> traditional or aa <strong style="color:#ff6b35;">heating para autos portable</strong>, activa tu Express Order ahora\.</p>',
        '<p style="color: #e0e0e0; font-size: 0.92rem; line-height: 1.8; margin: 0 0 20px; text-align: justify;">Interior thermal comfort also covers electrical components. We repair faults in <strong style="color:#ff6b35;">heated car seats</strong> and energy distribution systems including <strong style="color:#ff6b35;">car battery heaters</strong>. Our mechanics have the equipment to replace specific cabin components, including common climate control failures. Don\'t risk your passengers\' comfort — if you want to optimize your <strong style="color:#ff6b35;">vehicle heating system</strong> or need a <strong style="color:#ff6b35;">portable car heater</strong>, activate your Express Order now.</p>',
        c
    )

    # ===== Engine repair block: "vehicles ejecutivos, sedan premium y vehicles de service" =====
    c = re.sub(
        r'we serve vehicles ejecutivos, sedan premium y vehicles de service in [^,]+ with advanced diagnostics',
        lambda m: f'we service executive sedans, premium vehicles, and fleet vehicles in {display} with advanced diagnostics',
        c
    )

    # ===== Emergency block: remaining Spanglish =====
    # The v3 already fixed "corazon de la capital" to "the heart of the capital" but the block
    # pattern didn't match because of the intermediate change. Fix what remains:
    c = re.sub(
        r' breaks down in [^ ]+ o sufres una emergency mechanics en the heart of the capital, GlobalPro responde las 24 horas del dia\. We are the mobile mechanic a your home more nearby a ti, your mechanic cerca de mi: llegamos en menos de 60 minutos para emergencys\.',
        lambda m: f' breaks down in {display} or you suffer a mechanical emergency in this area, GlobalPro responds 24 hours a day. We are the closest mobile mechanic to you: we arrive in under 60 minutes for emergencies.',
        c
    )
    c = re.sub(
        r' in [^ ]+ para any emergency automotive\.',
        lambda m: f' in {display} for any automotive emergency.',
        c
    )

    # ===== "y" before <strong> remaining cases =====
    c = re.sub(r' y <strong', ' and <strong', c)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

print("Patch v4 applied to all 52 EN comuna files")