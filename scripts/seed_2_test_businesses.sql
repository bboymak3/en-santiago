-- Crear 2 negocios de prueba con web_page_mode='auto' para validar IA en landing pages
-- 1. Centro Médico Las Condes (medicina / servicios médicos)
-- 2. Ferretería El Tornillo (ferretería)

INSERT INTO businesses (
  slug, title, description, category_id, business_type,
  address, city, state, country, lat, lng,
  phone, whatsapp, website, instagram, facebook,
  email_contact, schedule,
  has_parking, has_wifi, has_card, has_delivery, has_outdoor,
  especialidad, seo_description,
  web_page_mode, web_url, status, featured, user_id, created_at, updated_at
) VALUES
(
  'centro-medico-las-condes',
  'Centro Medico Las Condes',
  'Centro medico multidisciplinario en Las Condes. Atencion de medicina general, kinesiologia, psicologia, nutricion y dental. Equipo de profesionales chilenos con mas de 15 anos de experiencia. Atencion presencial y online con sistema de reserva de horas por WhatsApp. Contamos con equipos de ultima generacion: ecografia, densitometria osea y electrocardiograma.',
  1, 'servicio',
  'Av. Apoquindo 4500, Local 12', 'Las Condes', 'Región Metropolitana', 'Chile',
  -33.4088, -70.5747,
  '+56 2 2345 6789', '+56987654321', 'https://centromedicolascondes.cl', 'https://instagram.com/centromedicolascondes', 'https://facebook.com/centromedicolascondes',
  'contacto@centromedicolascondes.cl',
  'Lunes a Viernes 09:00-20:00, Sabados 10:00-14:00',
  1, 1, 1, 0, 0,
  'Medicina general, Kinesiologia, Psicologia, Nutricion, Odontologia',
  'Centro medico en Las Condes con atencion multidisciplinaria. Reserva tu hora por WhatsApp.',
  'auto', '', 'approved', 1, 1,
  datetime('now'), datetime('now')
),
(
  'ferreteria-el-tornillo',
  'Ferreteria El Tornillo',
  'Ferreteria familiar con mas de 30 anos atendiendo a Santiago. Venta de herramientas electricas, materiales de construccion, plomeria, electricidad, pintura y cerrajeria. Somos distribuidores oficiales de marcas como Bosch, Makita, Sika y Continental. Servicio de corte a medida, entrega a domicilio en toda la Region Metropolitana y asesoria tecnica gratuita para tu proyecto.',
  8, 'tienda',
  'Av. Vicuna Mackenna 2100', 'San Miguel', 'Región Metropolitana', 'Chile',
  -33.4900, -70.6600,
  '+56 2 2555 1234', '+56976543210', 'https://ferreteriaeltornillo.cl', 'https://instagram.com/ferreteriaeltornillo', '',
  'ventas@ferreteriaeltornillo.cl',
  'Lunes a Viernes 08:30-19:00, Sabados 09:00-17:00, Domingos 10:00-13:00',
  1, 0, 1, 1, 0,
  'Herramientas electricas, Materiales de construccion, Plomeria, Pintura, Cerrajeria',
  'Ferreteria en San Miguel con 30 anos de experiencia. Herramientas, materiales y asesoria tecnica.',
  'auto', '', 'approved', 1, 1,
  datetime('now'), datetime('now')
);
