#!/usr/bin/env python3
"""
Complete SEO fix for mecanico247.com - Single pass
Fixes schemas (geo, rating, url, FAQ, Spanglish) + H1 + body Spanglish
"""
import re, json, os

BASE = "/home/z/Globalpro-clone"
TAG = '<script type="application/ld+json">'
CLOSE = '</script>'

GEO = {
    "santiago":(-33.4489,-70.6693),"providencia":(-33.4333,-70.6167),
    "las-condes":(-33.4000,-70.5500),"vitacura":(-33.3833,-70.5833),
    "lo-barnechea":(-33.3500,-70.5167),"nunoa":(-33.4500,-70.6000),
    "la-reina":(-33.4333,-70.5500),"puente-alto":(-33.6000,-70.5833),
    "la-florida":(-33.5500,-70.5833),"maipu":(-33.5000,-70.7500),
    "quilicura":(-33.3833,-70.7333),"huechuraba":(-33.3833,-70.6500),
    "recoleta":(-33.4000,-70.6500),"independencia":(-33.4167,-70.6667),
    "estacion-central":(-33.4500,-70.6833),"san-miguel":(-33.5167,-70.6333),
    "san-joaquin":(-33.5000,-70.6333),"la-granja":(-33.5167,-70.6500),
    "la-cisterna":(-33.5333,-70.6667),"san-ramon":(-33.5333,-70.6333),
    "el-bosque":(-33.5333,-70.6667),"pedro-aguirre-cerda":(-33.5000,-70.6500),
    "lo-prado":(-33.4667,-70.7000),"cerrillos":(-33.4833,-70.7167),
    "lo-espejo":(-33.4833,-70.7000),"renca":(-33.4167,-70.7167),
    "cerro-navia":(-33.4167,-70.7000),"conchali":(-33.4167,-70.6667),
    "quinta-normal":(-33.4333,-70.7167),"pudahuel":(-33.4500,-70.7500),
    "lampa":(-33.2833,-70.8833),"colina":(-33.2000,-70.6667),
    "penalolen":(-33.5167,-70.5833),"la-pintana":(-33.5833,-70.6167),
    "san-bernardo":(-33.6000,-70.7000),"buin":(-33.7333,-70.7333),
    "paine":(-33.7167,-70.7333),"talagante":(-33.6500,-70.9167),
    "melipilla":(-33.6833,-71.2167),"calera-de-tango":(-33.7167,-70.9167),
    "padre-hurtado":(-33.5500,-70.8500),"penaflor":(-33.6167,-70.8833),
    "curacavi":(-33.4167,-71.0167),"isla-de-maipo":(-33.8167,-70.8667),
    "el-monte":(-33.6667,-70.9500),"alhue":(-33.8333,-70.7333),
    "maria-pinto":(-33.3167,-70.9167),"san-pedro":(-33.7167,-70.9000),
    "pirque":(-33.6667,-70.5667),"san-jose-de-maipo":(-33.6500,-70.3500),
    "tiltil":(-33.0833,-70.9000),
}

NAMES = {
    "alhue":"Alhué","buin":"Buin","calera-de-tango":"Calera de Tango",
    "cerrillos":"Cerrillos","cerro-navia":"Cerro Navia","colina":"Colina",
    "conchali":"Conchalí","curacavi":"Curacaví","el-bosque":"El Bosque",
    "el-monte":"El Monte","estacion-central":"Estación Central",
    "huechuraba":"Huechuraba","independencia":"Independencia",
    "isla-de-maipo":"Isla de Maipo","la-cisterna":"La Cisterna",
    "la-florida":"La Florida","la-granja":"La Granja",
    "la-pintana":"La Pintana","la-reina":"La Reina","lampa":"Lampa",
    "las-condes":"Las Condes","lo-barnechea":"Lo Barnechea",
    "lo-espejo":"Lo Espejo","lo-prado":"Lo Prado","macul":"Macul",
    "maipu":"Maipú","maria-pinto":"María Pinto","melipilla":"Melipilla",
    "nunoa":"Ñuñoa","padre-hurtado":"Padre Hurtado","paine":"Painé",
    "pedro-aguirre-cerda":"Pedro Aguirre Cerda","penaflor":"Peñaflor",
    "penalolen":"Peñalolén","pirque":"Pirque","providencia":"Providencia",
    "pudahuel":"Pudahuel","puente-alto":"Puente Alto","quilicura":"Quilicura",
    "quinta-normal":"Quinta Normal","recoleta":"Recoleta","renca":"Renca",
    "san-bernardo":"San Bernardo","san-joaquin":"San Joaquín",
    "san-jose-de-maipo":"San José de Maipo","san-miguel":"San Miguel",
    "san-pedro":"San Pedro","san-ramon":"San Ramón","santiago":"Santiago",
    "talagante":"Talagante","tiltil":"Tiltil","vitacura":"Vitacura",
}

SPANGLISH = [
    (r'\bService de mobile mechanic\b', 'Mobile mechanic service'),
    (r'\bService de mechanic a home service\b', 'Home mobile mechanic service'),
    (r'\bSi you are looking for\b', 'If you are looking for'),
    (r'\byour car no arranca\b', "your car won't start"),
    (r'\btiene una failure en la via publica\b', 'has a breakdown on the road'),
    (r'\bo sufres una emergency mechanics?\b', 'or you suffer a mechanical emergency'),
    (r'\bGlobalPro responde las 24 horas del dia\.\b', 'GlobalPro responds 24 hours a day.'),
    (r'\bWe are el shop mechanic a home service more nearby a ti,?\s*tu shop mechanic cerca de mi:\s*?llegamos en menos de 60 minutos para emergencys\.\b', 'We are the nearest mobile mechanic to you: we arrive in under 60 minutes for emergencies.'),
    (r'\bpara any emergency automotive\.\b', 'for any automotive emergency.'),
    (r'\bel costo depends del\b', 'the cost depends on the'),
    (r'\brepaires greateres varian segun la complejidad\b', 'major repairs vary depending on complexity'),
    (r'\bQuote no obligation por WhatsApp\b', 'Get a free, no-obligation quote on WhatsApp'),
    (r'\brecibe un estimate transparent\b', 'receive a transparent estimate'),
    (r'\b¿You need un Mobile Mechanic\b', 'Do You Need a Mobile Mechanic'),
    (r'\b¿Puedo solicitar un oil change a home service in\b', 'Can I request an oil change at my location in'),
    (r'\bservice de battery\b', 'battery service'),
    (r'\bemergencys mechanicss\b', 'mechanic emergencies'),
    (r'\belectricall\b', 'electrical'),
    (r'\bmaintenance preventive\b', 'preventive maintenance'),
    (r'\bbelt de distribucion\b', 'timing belt'),
    (r'\bauxilio inmediumto\b', 'immediate roadside assistance'),
    (r'\bun technician estara contigo en menos de 60 minutos\b', 'a technician will be with you in under 60 minutes'),
    (r'\bllamamos o escribe por WhatsApp\b', 'call or message us on WhatsApp'),
    (r'\bQuote por WhatsApp\b', 'Quote on WhatsApp'),
    (r'\bneeds auxilio\b', 'need assistance'),
    (r'\bvehicles ejecutivos\b', 'executive vehicles'),
    (r'\bvehicles de service\b', 'service vehicles'),
    (r'\balls las marcas\b', 'all brands'),
    (r'\by more\b', 'and more'),
    (r'\bTu Mechanic Near Me\b', 'Mechanic Near Me'),
    (r'\bNuestros technicians se desplazan a ([^,]+) con herramientas specializadas para each tipo de vehicle\.\b', r'Our technicians travel to \1 with specialized tools for each type of vehicle.'),
    (r'\bincludesndo\b', 'including'),
    (r'\bcommunes\b', 'common'),
    (r'\bmclimate control mlatestrca\b', 'climate control'),
    (r'\bdistractights\b', 'interior'),
    (r'\bEl confort termico interior tambien abarca los components electricalls distraights\.\b', 'Thermal comfort also encompasses electrical interior components.'),
    (r'\bactiva tu Express Order ahora\.\b', 'activate your Express Order now.'),
    (r'\bNo arriesgues la comodidad de tus pasajeros;\b', "Don't risk your passengers' comfort;"),
    (r'\bsi you are looking for optimizar la\b', 'if you are looking to optimize the'),
    (r'\breyou want una\b', 'or you want a'),
    (r'\bor aa\b', 'or a'),
    (r'\bcontent="Service de mechanic a home service in ([^"]+)"', r'content="Professional home mobile mechanic service in \1"'),
    (r'\bcontent="Service de mobile mechanic in ([^"]+)"', r'content="Professional mobile mechanic service in \1"'),
    (r'"\+5\.000 customers served"', '"5,000+ customers served"'),
    (r'>el mecánico<', '>the mechanic<'),
    (r'>el costo<', '>the cost<'),
    (r'>cuesta<', '>costs<'),
    (r'>demoran<', '>take<'),
    (r'>atienden<', '>offer<'),
    (r'>ofrecen<', '>provide<'),
]

def make_faq(name):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": f"How much does a mobile mechanic cost in {name}?",
             "acceptedAnswer": {"@type": "Answer", "text": f"Pricing depends on the service. An oil change starts at accessible rates, while major repairs vary by complexity. Contact us on WhatsApp for a free quote in {name}."}},
            {"@type": "Question", "name": f"How long for a mechanic to arrive in {name}?",
             "acceptedAnswer": {"@type": "Answer", "text": f"Our mobile mechanics arrive in under 60 minutes to any location in {name}. Emergencies are prioritized for faster response."}},
            {"@type": "Question", "name": f"What services do you offer in {name}?",
             "acceptedAnswer": {"@type": "Answer", "text": f"In {name}: brakes, clutch, electrical, diagnostics, A/C, oil change, alignment, suspension, battery, and preventive maintenance. All 24/7 at your location."}},
            {"@type": "Question", "name": f"Do you offer 24/7 emergency service in {name}?",
             "acceptedAnswer": {"@type": "Answer", "text": f"Yes. GlobalPro provides 24/7 emergency roadside assistance in {name}. Call or message on WhatsApp and a technician arrives in under 60 minutes."}},
            {"@type": "Question", "name": f"What vehicle brands do you service in {name}?",
             "acceptedAnswer": {"@type": "Answer", "text": f"All major brands: Toyota, Hyundai, Kia, Chevrolet, Nissan, Renault, Peugeot, Ford, VW, Honda, Mazda, Suzuki, Subaru, Fiat, MG and more."}},
        ]
    }

def process(filepath, slug, lang):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    
    name = NAMES.get(slug, slug.replace("-"," ").title())
    coords = GEO.get(slug)
    changes = 0
    
    # --- STEP 1: Fix schemas by splitting on TAG ---
    parts = html.split(TAG)
    if len(parts) <= 1:
        # No schemas, just do body fixes
        if lang == "en":
            for pat, rep in SPANGLISH:
                new = re.sub(pat, rep, html)
                if new != html:
                    changes += len(re.findall(pat, html))
                    html = new
        if changes > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html)
        return changes
    
    new_parts = [parts[0]]
    
    for part in parts[1:]:
        ci = part.find(CLOSE)
        if ci == -1:
            new_parts.append(TAG + part)
            continue
        
        raw = part[:ci]
        rest = part[ci+len(CLOSE):]
        
        try:
            schema = json.loads(raw)
        except:
            # Not valid JSON, keep as-is
            new_parts.append(TAG + part)
            continue
        
        st = schema.get("@type","")
        if isinstance(st, list): st = st[0]
        mod = False
        
        if st == "LocalBusiness":
            addr = schema.setdefault("address", {})
            if not addr.get("streetAddress"):
                addr["streetAddress"] = f"{name}, Santiago"
                mod = True
            if coords and "geo" not in schema:
                schema["geo"] = {"@type":"GeoCoordinates","latitude":coords[0],"longitude":coords[1]}
                mod = True
            if "aggregateRating" not in schema:
                schema["aggregateRating"] = {"@type":"AggregateRating","ratingValue":"4.9","bestRating":"5","worstRating":"1","reviewCount":"155"}
                mod = True
            if lang == "en":
                cu = f"https://mecanico247.com/en/comunas/{slug}"
                if schema.get("url") != cu:
                    schema["url"] = cu
                schema["description"] = f"Professional mobile mechanic and auto repair in {name}, Santiago. Brakes, clutch, electrical, diagnostics, A/C, preventive maintenance. 24/7."
                mod = True
        
        elif st == "Service" and lang == "en":
            cu = f"https://mecanico247.com/en/comunas/{slug}"
            if schema.get("url") != cu:
                schema["url"] = cu
                mod = True
        
        elif st == "FAQPage" and lang == "en":
            schema = make_faq(name)
            mod = True
        
        elif st == "HowTo" and lang == "en":
            txt = json.dumps(schema)
            for w, r in [("a home service","at your location"),("por WhatsApp","on WhatsApp")]:
                if w in txt:
                    txt = txt.replace(w, r)
                    mod = True
            if mod:
                schema = json.loads(txt)
        
        if mod:
            changes += 1
            new_parts.append(TAG + json.dumps(schema, ensure_ascii=False, indent=6) + CLOSE + rest)
        else:
            new_parts.append(TAG + part)
    
    html = "".join(new_parts)
    
    # --- STEP 2: Fix H1 (EN) ---
    if lang == "en":
        old = f'<h1 class="hero-title">MOBILE MECHANIC IN {name.upper()}</h1>'
        new = f'<h1 class="hero-title">MECHANIC NEAR ME IN {name.upper()} \u2014 24/7 Mobile Auto Repair</h1>'
        if old in html:
            html = html.replace(old, new)
            changes += 1
    
    # --- STEP 3: Fix body Spanglish (EN) ---
    if lang == "en":
        for pat, rep in SPANGLISH:
            n = re.sub(pat, rep, html)
            if n != html:
                c = len(re.findall(pat, html))
                changes += c
                html = n
    
    if changes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)
    
    return changes

# --- MAIN ---
total_es = total_en = 0
for fn in sorted(os.listdir(f"{BASE}/en/comunas")):
    if not fn.endswith('.html'): continue
    slug = fn[:-5]
    c = process(f"{BASE}/en/comunas/{fn}", slug, "en")
    total_en += c
    if c: print(f"  EN {slug}: {c}")

for fn in sorted(os.listdir(f"{BASE}/comunas")):
    if not fn.endswith('.html'): continue
    slug = fn[:-5]
    c = process(f"{BASE}/comunas/{fn}", slug, "es")
    total_es += c
    if c: print(f"  ES {slug}: {c}")

print(f"\nTotal: ES={total_es} EN={total_en} Grand={total_es+total_en}")