#!/usr/bin/env python3
"""Patch script v3: Fix remaining Spanglish fragments in EN comuna files."""

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

for filename in sorted(os.listdir(BASE)):
    if not filename.endswith('.html'):
        continue
    slug = filename.replace('.html', '')
    display = DISPLAY_NAMES.get(slug, slug.replace('-', ' ').title())
    hoods = NEIGHBORHOODS.get(slug, display)
    filepath = os.path.join(BASE, filename)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # === Fix remaining heating paragraph 1 ===
    # The original text has "in Santiago" (comuna slug capitalized), not display_name
    # Replace the whole heating para 1 
    c = re.sub(
        r'If your system is failing or you need to improve your travel comfort in [A-Z][^,]+, our technical team cuenta con rapid response units\. We specialize in the diagnosis, repair, and installation of <strong style="color:#ff6b35;">heating para vehicles</strong>, <strong style="color:#ff6b35;">heating para autos</strong> y <strong style="color:#ff6b35;">heating para furgoneta</strong> directly at your location\. Cuando las lows temperatures se hacen sentir, we guarantee que la heating en el coche o la heating de coche funcione a su maximum capacidad y con total safety\.</p>',
        f'If your vehicle\'s heating or climate system is failing in {display}, our rapid-response team specializes in the diagnosis, repair, and installation of <strong style="color:#ff6b35;">vehicle heating systems</strong>, <strong style="color:#ff6b35;">car heaters</strong>, and <strong style="color:#ff6b35;">van heating systems</strong> directly at your location. When temperatures drop, we guarantee that your vehicle\'s heater works at full capacity with total safety.</p>',
        c
    )
    
    # === Fix scanner block "Los vehicles que circulan por corazon de la capital" ===
    c = re.sub(
        r'Los vehicles que circulan por corazon de la capital enfrentan condiciones de trafico y clima que generate codes de error specifics\. Our technicians',
        'Vehicles in this area face traffic and climate conditions that generate specific error codes. Our technicians',
        c
    )
    
    # === Fix clutch block - remaining Spanglish ===
    c = re.sub(
        r'El clutch y la belt de distribucion son components criticals que no can failure\. Un clutch desgastado dificulta los cambios de marcha, mientras que una belt rota puede danar irreversibly el engine\. GlobalPro atiende emergencys mechanicss in [^,]+ to replace these components with complete OEM-quality kits\. We serve vehicles ejecutivos, sedan premium y vehicles de service con parts certifieds, garantizandor a tralow professional sin tener que remolcar tu vehicle a un shop\.',
        f"The clutch and timing belt are critical components that must be maintained in good condition. A worn clutch makes gear changes difficult, while a broken belt can irreversibly damage the engine. GlobalPro handles mechanical emergencies in {display} to replace these components with complete OEM-quality kits. We service executive sedans, premium vehicles, and fleet vehicles with certified parts, guaranteeing professional work without having to tow your vehicle to a shop.",
        c
    )
    
    # === Fix emergency block ===
    c = re.sub(
        r'If your vehicle breaks down in [^ ]+ o sufres una emergency mechanics en corazon de la capital, GlobalPro responde las 24 horas del dia\. We are the mobile mechanic a your home more nearby a ti, your mechanic cerca de mi: llegamos en menos de 60 minutos para emergencys\. From dead batteries to engine failures, our technicians offer immediate solutions in ([^.]+)\. No matter the time or place: GlobalPro is your trusted mechanic in [^ ]+ para any emergency automotive\.',
        lambda m: f'If your vehicle breaks down in {display} or you suffer a mechanical emergency in this area, GlobalPro responds 24 hours a day. We are the closest mobile mechanic to you: we arrive in under 60 minutes for emergencies. From dead batteries to engine failures, our technicians offer immediate solutions in {m.group(1)}. No matter the time or place: GlobalPro is your trusted mechanic in {display} for any automotive emergency.',
        c
    )
    
    # === Fix "immediumte" (all remaining) ===
    c = c.replace("immediumte", "immediate")
    
    # === Fix footer/contact section Spanglish ===
    c = c.replace("<!-- Service de Urgencia -->", "<!-- Emergency Service -->")
    c = c.replace(">Service de Urgencia 24/7<", ">24/7 Emergency Service<")
    c = c.replace(">Attention a your home o tralow<", ">Service at your home or on the road<")
    c = c.replace(">Auxilio en carretera<", ">Roadside Assistance<")
    c = c.replace(">Problems de starter<", ">Starter problems<")
    c = c.replace(">Failures electricals repentinas<", ">Sudden electrical failures<")
    c = c.replace(">Repair of engine y transmission<", ">Engine and transmission repair<")
    c = c.replace(">Brakes, suspension y steering<", ">Brakes, suspension, and steering<")
    c = c.replace(">Maintenance preventive<", ">Preventive maintenance<")
    c = c.replace(">System electrical computerized<", ">Computerized electrical systems<")
    c = c.replace(">Services maines<", ">Main Services<")
    c = c.replace(">Horario<", ">Hours<")
    
    # === Fix remaining "y " before service names ===
    c = re.sub(r'>([^<]+) y (</[^>]+>)', lambda m: m.group(1).rstrip() + ', and ' + m.group(2), c)
    
    # === Fix any remaining Spanglish fragments ===
    c = c.replace("corazon de la capital", "the heart of the capital")
    c = c.replace("cuenta con", "has")
    c = c.replace("electricalls", "electrical")
    
    # Fix "y <strong>" → "and <strong>" 
    c = re.sub(r'>\s*y\s+<strong', '> and <strong', c)
    
    # Fix "o en" context
    c = c.replace("home service en", "home in")
    
    # Fix "region" in English footer
    c = c.replace("Region Metropolitan", "Metropolitan Region")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

print("Patch v3 applied to all 52 EN comuna files")