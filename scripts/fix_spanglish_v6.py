#!/usr/bin/env python3
"""Patch v6: Fix ALL remaining Spanglish sections in EN comuna files."""

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

    # === 1. Oil Change y Filter box (mileage section) ===
    c = re.sub(
        r'<strong>Oil Change y Filter:</strong> Usefulizamos el Oil indicado por el manufacturer o el indicado por el cliente\. Usamos el Filter de Oil de la Marca o el Alternativo de best quality\.',
        '<strong>Oil Change and Filter:</strong> We use the oil recommended by the manufacturer or the oil specified by the customer. We use OEM or best-quality alternative filters.',
        c
    )

    # === 2. WhatsApp URL Spanglish in mileage section ===
    c = re.sub(
        r'href="https://wa\.me/56939026185\?text=Hola%20quiero%20get a quote%20una%20maintenance%20por%20kilometraje%20en%20Santiago"',
        f'href="https://wa.me/56939026185?text=Hi%20I%20want%20a%20quote%20for%20mileage-based%20maintenance%20in%20{slug}"',
        c
    )

    # === 3. MANTENIMIENTO PREVENTIVO section - complete rewrite ===
    old_mant = r'<!-- MANTENIMIENTO PREVENTIVO -->.*?<!-- MARCAS -->'
    new_mant = f'''<!-- PREVENTIVE MAINTENANCE -->
<!-- ======================================================================= -->
<section class="py-5" style="background:#fff;" id="maintenance-preventive">
  <div class="container">
    <div class="text-center mb-5">
      <h2 class="section-title">Preventive Maintenance: Take Care of Your Car and Save Money in {display}</h2>
      <p class="section-subtitle">The best repair is the one you never need. With regular preventive maintenance in {display}, you avoid costly failures and extend the useful life of your vehicle.</p>
    </div>
    <div class="row g-4">
      <div class="col-lg-4 col-md-6">
        <div class="card service-card">
          <div class="card-body text-center p-4">
            <div class="service-icon"><i class="fas fa-oil-can"></i></div>
            <h3 class="service-title">Oil Change and Filter</h3>
            <p>Regular oil changes are essential to protect your engine. We use oils recommended by the manufacturer for optimal performance.</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div class="card service-card">
          <div class="card-body text-center p-4">
            <div class="service-icon"><i class="fas fa-compact-disc"></i></div>
            <h3 class="service-title">Brakes and Safety</h3>
            <p>Complete brake system inspection: pads, rotors, fluid, and ABS. Your safety is our top priority.</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div class="card service-card">
          <div class="card-body text-center p-4">
            <div class="service-icon"><i class="fas fa-bolt"></i></div>
            <h3 class="service-title">Electrical System</h3>
            <p>Battery, alternator, lights inspection, and starter system. Avoid getting stranded by an electrical failure.</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div class="card service-card">
          <div class="card-body text-center p-4">
            <div class="service-icon"><i class="fas fa-snowflake"></i></div>
            <h3 class="service-title">Air Conditioning</h3>
            <p>Gas recharge, compressor inspection, and climate control service. Keep your vehicle comfortable in any season.</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div class="card service-card">
          <div class="card-body text-center p-4">
            <div class="service-icon"><i class="fas fa-microchip"></i></div>
            <h3 class="service-title">Scanner Diagnosis</h3>
            <p>Complete computerized diagnostics to detect faults before they become major problems.</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div class="card service-card">
          <div class="card-body text-center p-4">
            <div class="service-icon"><i class="fas fa-car"></i></div>
            <h3 class="service-title">Technical Inspection Preparation</h3>
            <p>We inspect all critical points so your vehicle passes the technical inspection without any rejections.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ======================================================================= -->
<!-- BRANDS -->
<!-- ======================================================================= -->'''
    c = re.sub(old_mant, new_mant, c, flags=re.DOTALL)

    # === 4. "Tralowmos con las Bestes Marcas" → "We Work With the Best Brands" ===
    c = c.replace("Tralowmos con las Bestes Marcas", "We Work With the Best Brands")
    c = c.replace("Pparts and accessories de marcas reconocidas a level mundial", "Quality parts and accessories from world-recognized brands")
    c = c.replace("Tralowmos con alls las marcas", "We work with all brands")

    # === 5. Vehicles section header ===
    c = re.sub(
        r'Vehicles que We serve in [A-Z][^<]+',
        f'Vehicles We Service in {display}',
        c
    )
    c = c.replace(
        'Selecciona tu vehicle para ver los services disponibles. Haz clic en la foto para ampliarla.',
        'Select your vehicle to see available services. Click on the photo to enlarge.'
    )

    # === 6. Footer text ===
    c = re.sub(
        r'We are leaders en <strong>Mobile Mechanic</strong> in [A-Z][^.]+\. We offer service automotive comprehensive con technology de punta y professionals certifieds\. Tu vehicle en las bestes manos, donde you you are\.',
        lambda m: f'We are leaders in <strong>Mobile Mechanic</strong> in {display}. We offer comprehensive automotive services with cutting-edge technology and certified professionals. Your vehicle in the best hands, wherever you are.',
        c
    )

    # === 7. "Mileage-Based Maintenance in Santiago" title ===
    c = re.sub(
        r'>Mileage-Based Maintenance in [A-Z][^<]+</h2>',
        lambda m: f'>Mileage-Based Maintenance in {display}</h2>',
        c
    )
    c = re.sub(
        r'We check all the points indicated in your vehicle\'s maintenance schedule according to its mileage, right in [^.]+\.',
        lambda m: f"We check all the points indicated in your vehicle's maintenance schedule according to its mileage, right in {display}.",
        c
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

print("Patch v6 applied to all 52 EN comuna files")