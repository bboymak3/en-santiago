# En-Santiago - Directorio Nacional de Negocios de Venezuela

> Plataforma web progresiva (PWA) para descubrir, registrar y gestionar negocios en Venezuela. Incluye directorio con mapa interactivo, marketplace de productos, bolsa de empleo, gestion de inmuebles, reservas, cupones, chat en tiempo real, IA chatbot, seccion dedicada de servicios medicos y mas.

**URL en produccion:** [https://en-santiago.com](https://en-santiago.com)

---

## Caracteristicas Principales

- **Directorio de Negocios** — Busqueda por categoria, estado/ciudad, tipo de negocio. Fichas detalladas con galeria, mapa, servicios, productos, videos y contactos por WhatsApp.
- **URLs SEO Canonicas** — Cada negocio tiene URL amigable: `/:tipo/:categoria/:slug` (ej: `/salud-bienestar/medicina-servicio-medico/dr-mario-leon`). Rutas antiguas redirigen con 301.
- **Seccion de Servicios Medicos** — Categoria dedicada "Medicina / Servicio Medico" con seccion propia en la homepage y selector de destacados independiente en el panel admin.
- **Tipos de Negocio** — Clasificacion en 10 tipos (Salud, Comida, Belleza, Automotriz, Hogar, Profesionales, Tiendas, Educacion, Turismo, Servicios Varios) con paginas de categoria dedicadas y filtro en el formulario de registro.
- **Paginas Web Automaticas** — Cada negocio aprobado genera automaticamente una landing page profesional en `/web/:slug` con banner, logo, productos, FAQ, galeria, mapa y contacto. Marca En-Santiago.
- **Paginas de Estado** — Directorio por estado: `/estado/merida` muestra todos los negocios de ese estado.
- **Mapa Interactivo** — Visualizacion geolocalizada de negocios con Leaflet/OpenStreetMap.
- **Marketplace** — Publicacion y busqueda de productos con multiples fotos, videos (URL y archivo adjunto), filtros por categoria/precio. Contacto directo por WhatsApp. Banner configurable desde el panel admin con recorte optimizado.
- **Gestion de Inmuebles** — Publicacion de propiedades (venta/alquiler) con multiples fotos, videos, mapa, 6 pasos de formulario, galeria con lightbox.
- **Bolsa de Empleo** — Publicacion de ofertas laborales vinculadas a negocios.
- **Gestion de Servicios** — Cada negocio puede registrar los servicios que ofrece, editables desde el panel del usuario.
- **Importacion desde Facebook** — Import automatico de publicaciones de Facebook como negocios (cron configurable). Parsea precio, tipo de propiedad, habitaciones, banos, area.
- **Reservas y Cupones** — Modulos para reservar citas y gestionar cupones/promociones.
- **Entretenimiento y Eventos** — Directorio de opciones de entretenimiento.
- **Emergencias** — Directorio de numeros de emergencia por estado.
- **Chat en Tiempo Real** — Sistema de mensajeria entre usuarios y negocios con WebSocket.
- **IA Chatbot** — Asistente virtual integrado para ayudar a los usuarios (OpenAI API).
- **Sistema de Puntos** — Los usuarios ganan puntos por visitas, reservas y resenas. Canjeable por beneficios premium.
- **Resenas y Calificaciones** — Sistema de resenas con estrellas para negocios y productos.
- **PWA (Progressive Web App)** — Instalable en movil y escritorio. Funciona offline con Service Worker.
- **Panel de Usuario** — Dashboard para gestionar negocios, productos, inmuebles, mensajes, favoritos y perfil.
- **Panel de Administracion** — Aprobacion de negocios pendientes, gestion de usuarios, contenido, configuracion del sitio (banners, logos, modulos), seleccion de destacados por categoria (negocios, servicios medicos, inmuebles, productos, empleos), gestion de categorias y tipos de negocio.
- **SEO Completo** — Sitemap XML dinamico, robots.txt, meta tags Open Graph, Twitter Cards, datos estructurados (JSON-LD) para cada ficha. Google Search Console verificado.
- **Sistema de Planes** — Plan basico (gratuito, 20 dias expiracion) y plan premium (sin expiracion, mas visibilidad).

---

## Arquitectura Tecnica

### Stack

| Componente | Tecnologia | Detalle |
|---|---|---|
| Frontend | HTML5 + CSS3 + JavaScript (Vanilla) | Sin frameworks. JS modular por archivos |
| Backend | Cloudflare Pages Functions | Serverless, Edge Computing |
| Base de Datos | Cloudflare D1 (SQLite) | Binding: `DB` |
| Almacenamiento | Cloudflare R2 | Imagenes, videos, logos, banners |
| Mapas | Leaflet + OpenStreetMap + Nominatim | Geocodificacion y mapa interactivo |
| Autenticacion | JWT (HMAC-SHA256) | Configurado via variable de entorno |
| Cache | Service Worker | cache-first + stale-while-revalidate |
| Despliegue | Cloudflare Pages | CI/CD automatico desde GitHub (`git push origin main`) |
| Dominio | `en-santiago.com` | Custom domain en Cloudflare Pages |
| Fonts | Google Fonts (Inter) | Cargado desde CDN |
| Iconos | Font Awesome 6.5.1 | Cargado desde cdnjs |
| PWA | manifest.json + sw.js | Instalable, cache offline |

### Flujo de Despliegue

```
git push origin main
  → GitHub recibe el push
    → Cloudflare Pages detecta el cambio
      → Build automatico (no requiere build step)
        → Deploy a produccion
          → URL: https://en-santiago.com
```

No hay paso de build. Los archivos HTML/CSS/JS se sirven directamente. Las `functions/` se ejecutan como Workers serverless en el edge.

---

## Estructura del Proyecto

```
meridaunclick/
├── index.html                  # Homepage (hero, categorias, negocios destacados, servicios medicos)
├── search.html                 # Busqueda de negocios con filtros
├── map.html                    # Mapa interactivo completo
├── marketplace.html            # Marketplace de productos (banner configurable)
├── properties.html             # Listado de inmuebles
├── empleo.html                 # Bolsa de empleo
├── entretenimiento.html        # Entretenimiento
├── eventos.html                # Eventos
├── reservas.html               # Reservas
├── cupones.html                # Cupones y promociones
├── emergencia.html             # Emergencias
├── planes.html                 # Planes (basico/premium)
├── dashboard.html              # Panel del usuario (gestion completa)
├── login.html                  # Login / Registro
├── admin.html                  # Panel de administracion
├── admin-chat.html             # Panel de chat admin
├── admin-vendedores.html       # Panel de vendedores
├── new-business.html           # Formulario registro negocio (paso a paso)
├── new-property.html           # Formulario registro inmueble (6 pasos)
├── property-detail.html        # Ficha de inmueble (detalle)
├── contacto.html               # Formulario de contacto
├── privacidad.html             # Politica de privacidad
├── eliminacion-datos.html      # Eliminacion de datos (GDPR)
├── quienes-somos.html          # Quienes somos
├── mision-vision.html          # Mision y vision
├── clientes-satisfechos.html   # Testimonios
├── manifest.json               # PWA Manifest
├── sw.js                       # Service Worker (cache offline)
├── robots.txt                  # Robots.txt estatico (redirige a /api/robots)
├── _redirects                  # Redirecciones Cloudflare Pages (301 antiguas URLs, www→apex)
├── _headers                    # Headers de seguridad Cloudflare Pages
├── wrangler.toml               # Configuracion Cloudflare (D1 + R2 bindings)
│
├── css/
│   └── styles.css              # Estilos principales (~3000+ lineas)
│
├── js/
│   ├── app.js                  # Modulo principal (API helper, auth, UI, nav, hero banner/logo, destacados medicos)
│   ├── dashboard.js            # Dashboard usuario (negocios, productos, inmuebles, empleos)
│   ├── admin.js                # Panel admin (todas las tabs, CRUD, settings, banners, logos, destacados por categoria, gestion de categorias)
│   ├── business-detail.js      # Ficha de negocio (galeria, productos, servicios, mapa, lightbox)
│   ├── business-form.js        # Formulario registro negocio (anti-doble-submit, selector de tipo de negocio)
│   ├── property-form.js        # Formulario registro inmueble (6 pasos, fotos, videos)
│   ├── property-detail.js      # Ficha de inmueble (galeria, videos, lightbox)
│   ├── auth.js                 # Login y registro
│   ├── chat.js                 # Chat en tiempo real (WebSocket)
│   ├── review-widget.js        # Widget de resenas
│   ├── ai-chatbot.js           # Chatbot con IA (OpenAI)
│   ├── home-map.js             # Mapa de la homepage
│   └── map.js                  # Pagina de mapa completo
│
├── images/
│   ├── En-Santiago.png               # Logo principal En-Santiago (Open Graph)
│   ├── favicon.jpeg            # Logo/Favicon principal
│   ├── logoprincipal.jpeg      # Logo principal
│   ├── PWA.jpeg                # Icono PWA (512x512)
│   └── favicom.jpeg            # Favicon alternativo
│
├── functions/
│   ├── [tipo]/[categoria]/[slug].js  # Ficha de negocio SSR (URL canonica: /:tipo/:categoria/:slug)
│   ├── categoria/[slug].js           # Pagina de categoria (lista negocios por tipo de negocio)
│   ├── estado/[slug].js              # Pagina de estado (lista negocios por estado)
│   ├── negocio/[slug].js             # Ficha de negocio (legacy, 301 → URL canonica)
│   ├── medicina-servicio-medico/[slug].js  # Ficha medica (legacy, 301 → URL canonica)
│   ├── producto/[tipo]/[slug].js     # Ficha de producto SSR (URL canonica: /producto/:tipo/:slug)
│   ├── producto/[slug].js            # Ficha de producto (legacy, 301 → URL canonica)
│   ├── web/[slug].js                 # Landing page automatica por negocio (SSR, marca En-Santiago)
│   │
│   ├── _lib/
│   │   ├── render-business.js        # Motor de renderizado de fichas de negocio (HTML, JSON-LD, galeria, mapa, negocios similares)
│   │   ├── render-product.js         # Motor de renderizado de fichas de producto
│   │   └── auth.js                   # Helpers de autenticacion
│   │
│   └── api/
│       ├── admin/              # Admin (sellers, chat-logs, create-user)
│       ├── auth/               # Autenticacion (login, register, me, promote-me, google, google-config)
│       ├── ai-chat/            # Chatbot IA
│       ├── backfill-slugs/     # Utilidad de migracion de slugs
│       ├── bookings/           # Reservas
│       ├── business-stats/     # Estadisticas de negocios (vistas, tracking)
│       ├── businesses/         # CRUD negocios
│       │   ├── index.js        #   GET (listar/buscar), POST (crear)
│       │   └── [id]/           #   GET/PUT/DELETE + approve.js, reject.js
│       │       └── services/   #   CRUD servicios por negocio
│       ├── categories/         # Categorias de negocios (CRUD admin, listado publico con tipos)
│       ├── chat/               # Chat en tiempo real (conversations, messages, config)
│       ├── contacts/           # Formulario de contacto (+ admin-message)
│       ├── coupons/            # Cupones y promociones
│       ├── debug/              # Utilidades de depuracion (health, chat-status, premium-check, map-check)
│       ├── emergency/          # Directorio de emergencias
│       ├── events/             # Eventos
│       ├── facebook/           # Integracion Facebook (import, config, history)
│       ├── favorites/          # Sistema de favoritos (negocios) + check
│       ├── featured-items/     # Elementos destacados (business, product, job, property, medical)
│       ├── images/             # Gestion de imagenes de negocios + set-cover
│       ├── jobs/               # Ofertas de empleo
│       ├── marketplace/        # CRUD de productos (+ approve/reject)
│       ├── migrate/            # Migraciones de DB
│       │   ├── schema-premium.js      # Plan premium
│       │   ├── seller-role.js         # Rol vendedor
│       │   ├── category-suggestions.js # Sugerencias de categorias
│       │   ├── add-social-video.js    # Campos sociales y video
│       │   ├── product-type.js        # Tipo de producto
│       │   └── tipos-negocio.js       # Tipos de negocio + eliminacion de CHECK constraint
│       ├── notifications/      # Notificaciones push
│       ├── plans/              # Planes (request-upgrade)
│       ├── points/             # Sistema de puntos
│       ├── premium-requests/   # Solicitudes de plan premium (+ approve/reject)
│       ├── product-comments/   # Comentarios en productos
│       ├── properties/         # CRUD de inmuebles (+ approve/reject)
│       ├── property-favorites/ # Favoritos de inmuebles + check
│       ├── property-images/    # Gestion de imagenes de inmuebles
│       ├── reviews/            # Resenas de negocios
│       ├── robots/             # Robots.txt dinamico
│       ├── serve/              # Servidor de archivos R2 (imagenes, videos)
│       ├── settings/           # Configuracion del admin
│       │   ├── index.js        #   GET/PUT/POST (admin only)
│       │   └── public.js       #   GET (publico, subset de keys)
│       ├── sitemap/            # Sitemap XML dinamico
│       ├── stats.js            # Estadisticas generales
│       ├── tipo-negocio/       # API publica de tipos de negocio
│       ├── upload.js           # Subida de archivos a R2 (imagenes, videos, banners, logos)
│       ├── user/               # Perfil de usuario (my-businesses)
│       └── users/              # Gestion de usuarios (admin) + activate-premium
│
└── worklog.md                  # Log de trabajo de desarrollo
```

---

## Base de Datos (D1 - SQLite)

### Tablas Principales

| Tabla | Descripcion | Campos Clave |
|---|---|---|
| `users` | Usuarios del sistema | id, name, email, phone, password_hash, role (user/admin/seller), plan (basic/premium) |
| `businesses` | Negocios registrados | id, user_id, title, slug, description, category_id, business_type, logo, banner, address, city, state, lat, lng, phone, whatsapp, website, instagram, facebook, twitter, tiktok, youtube, video_url, schedule, status, featured, views, custom_html, price, currency, bedrooms, bathrooms, area |
| `business_services` | Servicios por negocio | id, business_id, name, description, price |
| `images` | Imagenes de negocios | id, business_id, url, thumbnail_url, is_cover, order_index |
| `products` | Productos del marketplace | id, business_id, name, slug, description, price, currency, image, video_url, category, product_type, status, views |
| `properties` | Inmuebles | id, user_id, title, slug, property_type, operation_type, price, address, city, lat, lng, bedrooms, bathrooms, area, video_url, status, featured, views |
| `property_images` | Imagenes de inmuebles | id, property_id, url, is_cover, order_index |
| `jobs` | Ofertas de empleo | id, business_id, title, description, company, location, salary, type, status |
| `contacts` | Mensajes de contacto | id, business_id, name, email, phone, message |
| `favorites` | Negocios favoritos | id, user_id, business_id |
| `property_favorites` | Inmuebles favoritos | id, user_id, property_id |
| `reviews` | Resenas de negocios | id, business_id, user_id, rating, comment |
| `categories` | Categorias de negocios | id, name, slug, icon, sort_order, is_active, tipo_negocio_id (FK → tipos_negocio) |
| `tipos_negocio` | Tipos de negocio (grupos) | id, name, slug, icon, color, description, sort_order, is_active |
| `featured_items` | Elementos destacados | id, item_type, item_id, user_id, title, start_date, end_date |
| `admin_settings` | Configuracion del sitio | key (TEXT PK), value (TEXT) |
| `coupons` | Cupones y promociones | id, business_id, code, discount, expires_at |
| `bookings` | Reservas | id, business_id, user_id, date, time, status |
| `points_transactions` | Transacciones de puntos | id, user_id, points, type, reference_id |
| `chat_rooms` | Salas de chat | id, business_id, user_id |
| `chat_messages` | Mensajes de chat | id, room_id, sender_id, message, read |
| `fb_config` | Configuracion Facebook import | id, key, value |
| `fb_imports` | Registro de imports | id, fb_post_id, business_id, post_message, post_url, raw_data |

### Tipos de Negocio (tipos_negocio)

| Slug | Nombre | Icono |
|---|---|---|
| `salud-bienestar` | Salud y Bienestar | fa-heartbeat |
| `comida-bebidas` | Comida y Bebidas | fa-utensils |
| `belleza-cuidado-personal` | Belleza y Cuidado Personal | fa-spa |
| `automotriz` | Automotriz | fa-car |
| `hogar-construccion` | Hogar y Construccion | fa-home |
| `servicios-profesionales` | Servicios Profesionales | fa-briefcase |
| `tiendas-comercio` | Tiendas y Comercio | fa-shopping-bag |
| `educacion` | Educacion | fa-graduation-cap |
| `turismo-hospedaje` | Turismo y Hospedaje | fa-plane |
| `servicios-varios` | Servicios Varios | fa-concierge-bell |

### Tipos de item_type en featured_items

| Tipo | Descripcion | Maximo destacados |
|---|---|---|
| `business` | Negocios generales | 4 |
| `medical` | Servicios medicos (categoria: medicina-servicio-medico) | 4 |
| `property` | Inmuebles | 4 |
| `product` | Productos del marketplace | 4 |
| `job` | Ofertas de empleo | 4 |

### Campos de Configuracion (admin_settings)

| Key | Default | Descripcion |
|---|---|---|
| `site_name` | `En-Santiago` | Nombre del sitio |
| `site_description` | `Directorio de negocios y servicios en Venezuela` | Descripcion del sitio |
| `contact_email` | `""` | Email de contacto |
| `whatsapp_number` | `""` | Numero de WhatsApp |
| `hero_banner_url` | `""` | URL del banner principal (homepage) |
| `hero_logo_url` | `""` | URL del logo sobre el banner (homepage) |
| `marketplace_banner_url` | `""` | URL del banner del marketplace |
| `businesses_enabled` | `1` | Modulo de negocios activo |
| `marketplace_enabled` | `1` | Modulo de marketplace activo |
| `jobs_enabled` | `1` | Modulo de empleo activo |
| `events_enabled` | `1` | Modulo de eventos activo |
| `chat_enabled` | `1` | Chat activo |
| `chat_mode` | `all` | `all` / `premium_only` / `none` |
| `reviews_enabled` | `1` | Resenas activas |
| `coupons_enabled` | `1` | Cupones activos |
| `bookings_enabled` | `0` | Reservas activas |
| `points_enabled` | `0` | Sistema de puntos activo |
| `ai_chatbot_enabled` | `0` | Chatbot IA activo |
| `ai_chatbot_welcome` | `""` | Mensaje de bienvenida del chatbot |
| `anonymous_comments_enabled` | `1` | Comentarios anonimos permitidos |
| `require_approval` | `1` | Negocios requieren aprobacion admin |
| `registrations_enabled` | `1` | Registro de usuarios habilitado |
| `maintenance_mode` | `0` | Modo mantenimiento |
| `emergency_enabled` | `1` | Modulo de emergencias activo |
| `featured_price` | `0` | Precio para ser destacado |
| `max_businesses_per_user` | `10` | Max negocios por usuario |
| `points_per_visit` | `10` | Puntos por visita |
| `points_per_review` | `20` | Puntos por resena |
| `points_per_booking` | `15` | Puntos por reserva |

---

## Rutas y URLs

### Paginas Estaticas

| Ruta | Archivo |
|---|---|
| `/` | `index.html` |
| `/buscar` | `search.html` |
| `/mapa` | `map.html` |
| `/marketplace` | `marketplace.html` |
| `/inmuebles` | `properties.html` |
| `/empleo` | `empleo.html` |
| `/entretenimiento` | `entretenimiento.html` |
| `/eventos` | `eventos.html` |
| `/reservas` | `reservas.html` |
| `/cupones` | `cupones.html` |
| `/emergencia` | `emergencia.html` |
| `/planes` | `plans.html` |
| `/dashboard` | `dashboard.html` |
| `/login` | `login.html` |
| `/admin` | `admin.html` |
| `/registro-negocio` | `new-business.html` |

### Paginas Dinamicas (SSR con SEO)

| Ruta | Descripcion |
|---|---|
| `/:tipo/:categoria/:slug` | Ficha de negocio (canonica) — ej: `/salud-bienestar/medicina-servicio-medico/dr-mario-leon` |
| `/producto/:tipo/:slug` | Ficha de producto (canonica) — ej: `/producto/ropa/camisa-polo` |
| `/categoria/:slug` | Pagina de categoria — ej: `/categoria/salud-bienestar` |
| `/estado/:slug` | Pagina de estado — ej: `/estado/merida` |
| `/web/:slug` | Landing page automatica del negocio — ej: `/web/dr-mario-leon` |
| `/negocio/:slug` | Redireccion 301 a URL canonica |
| `/producto/:slug` (sin tipo) | Redireccion 301 a URL canonica |

### Redirecciones

- `/negocio/:slug` → 301 a `/:tipo/:categoria/:slug`
- `/medicina-servicio-medico/:slug` → 301 a `/:tipo/:categoria/:slug`
- `aunclick.pages.dev/*` → 301 a `en-santiago.com/*`
- `www.en-santiago.com/*` → 301 a `en-santiago.com/*`

---

## APIs Principales

### Autenticacion

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/auth/login` | POST | No | Login (email + password) → JWT |
| `/api/auth/register` | POST | No | Registro de usuario |
| `/api/auth/me` | GET | Si | Datos del usuario actual |
| `/api/auth/promote-me` | POST | Si | Solicitar plan premium |
| `/api/auth/google` | POST | No | Login con Google |
| `/api/auth/google-config` | GET | No | Configuracion de Google OAuth |

### Negocios

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/businesses` | GET | No | Listar/buscar negocios (filtros: category, city, state, search, featured, tipo, etc.) |
| `/api/businesses` | POST | Si | Crear negocio |
| `/api/businesses/:id` | GET | No | Detalle de negocio (con imagenes, servicios) |
| `/api/businesses/:id` | PUT | Si | Editar negocio (owner/admin) |
| `/api/businesses/:id` | DELETE | Si | Eliminar negocio (owner/admin) |
| `/api/businesses/:id/approve` | POST | Admin | Aprobar negocio |
| `/api/businesses/:id/reject` | POST | Admin | Rechazar negocio |
| `/api/businesses/:id/services` | GET | No | Listar servicios |
| `/api/businesses/:id/services` | POST | Si | Crear servicio |
| `/api/businesses/:id/services/:sid` | PUT | Si | Editar servicio |
| `/api/businesses/:id/services/:sid` | DELETE | Si | Eliminar servicio |
| `/api/businesses/:id/stats` | GET | No | Estadisticas de vistas |
| `/api/businesses/:id/stats/track` | POST | No | Registrar vista |

### Categorias y Tipos

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/categories` | GET | No | Lista de categorias (con tipo de negocio) |
| `/api/tipo-negocio` | GET | No | Lista de tipos de negocio |
| `/api/categories` | POST | Admin | Crear categoria |
| `/api/categories/:id` | PUT | Admin | Editar categoria |
| `/api/categories/:id` | DELETE | Admin | Eliminar categoria |
| `/api/categories/suggestions` | POST | Si | Sugerir nueva categoria |

### Productos (Marketplace)

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/marketplace` | GET | No | Listar productos (filtros: business_id, category, search, status) |
| `/api/marketplace` | POST | Si | Crear producto |
| `/api/marketplace/:id` | GET | No | Detalle de producto |
| `/api/marketplace/:id` | PUT | Si | Editar producto |
| `/api/marketplace/:id` | DELETE | Si | Eliminar producto |
| `/api/marketplace/:id/approve` | POST | Admin | Aprobar producto |
| `/api/marketplace/:id/reject` | POST | Admin | Rechazar producto |

### Inmuebles

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/properties` | GET | No | Listar inmuebles (filtros: type, operation, city, price, etc.) |
| `/api/properties` | POST | Si | Crear inmueble |
| `/api/properties/:id` | GET | No | Detalle (con imagenes) |
| `/api/properties/:id` | PUT | Si | Editar inmueble |
| `/api/properties/:id` | DELETE | Si | Eliminar inmueble |
| `/api/properties/:id/approve` | POST | Admin | Aprobar inmueble |
| `/api/properties/:id/reject` | POST | Admin | Rechazar inmueble |
| `/api/property-images/:propertyId` | GET | No | Listar imagenes |
| `/api/property-images/:propertyId` | POST | Si | Agregar imagen |
| `/api/property-images/:propertyId` | DELETE | Si | Eliminar imagen |

### Empleo

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/jobs` | GET | No | Listar ofertas |
| `/api/jobs` | POST | Si | Crear oferta |
| `/api/jobs/:id` | PUT/DELETE | Si | Editar/eliminar |

### Elementos Destacados

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/featured-items` | GET | No | Listar destacados (filtro: `?item_type=business\|medical\|product\|property\|job`) |
| `/api/featured-items` | POST | Admin | Agregar destacado |
| `/api/featured-items/:id` | DELETE | Admin | Eliminar destacado |

### Otros

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/upload` | POST | Si | Subir archivo a R2 (image/*, video/* hasta 50MB) |
| `/api/serve` | GET | No | Servir archivos desde R2 |
| `/api/settings` | GET/PUT | Admin | Configuracion completa del sitio |
| `/api/settings` | POST | Admin | Restablecer configuracion a defaults |
| `/api/settings/public` | GET | No | Settings publicos |
| `/api/favorites` | GET/POST/DELETE | Si | Favoritos de negocios |
| `/api/favorites/check` | GET | Si | Verificar si un negocio es favorito |
| `/api/property-favorites` | GET/POST/DELETE | Si | Favoritos de inmuebles |
| `/api/property-favorites/check` | GET | Si | Verificar si un inmueble es favorito |
| `/api/reviews` | GET/POST | Varia | Resenas |
| `/api/product-comments` | GET/POST | Varia | Comentarios en productos |
| `/api/contacts` | POST | No | Enviar mensaje de contacto |
| `/api/contacts/admin-message` | POST | No | Mensaje directo al admin |
| `/api/coupons` | GET/POST/DELETE | Varia | Cupones |
| `/api/bookings` | GET/POST | Varia | Reservas |
| `/api/notifications` | GET/PATCH | Si | Notificaciones del usuario (PATCH para marcar como leida) |
| `/api/points` | GET | Si | Balance de puntos |
| `/api/plans/request-upgrade` | POST | Si | Solicitar upgrade a premium |
| `/api/premium-requests` | GET | Admin | Solicitudes premium pendientes |
| `/api/sitemap` | GET | No | Sitemap XML dinamico |
| `/api/robots` | GET | No | Robots.txt dinamico |
| `/api/ai-chat` | POST | No | Chatbot IA (streaming) |
| `/api/user/my-businesses` | GET | Si | Negocios del usuario actual |
| `/api/users` | GET | Admin | Listar usuarios |
| `/api/users/:id` | GET/PUT | Admin | Detalle/editar usuario |
| `/api/users/:id/activate-premium` | POST | Admin | Activar premium manualmente |
| `/api/admin/sellers` | GET | Admin | Lista de vendedores |
| `/api/admin/chat-logs` | GET | Admin | Logs de chat |
| `/api/emergency` | GET | No | Directorio de emergencias |
| `/api/events` | GET/POST | Varia | Eventos |
| `/api/facebook/import` | POST/GET | Admin | Importar desde Facebook (cron o manual) |
| `/api/facebook/config` | GET/PUT | Admin | Configuracion de Facebook |
| `/api/stats` | GET | No | Estadisticas generales del sitio |
| `/api/migrate/tipos-negocio` | GET | Admin | Migracion: tipos de negocio |

---

## Paginas Dinamicas (Server-Side Rendered)

Todas las paginas SSR se generan en el servidor (Cloudflare Pages Functions) con HTML completo y SEO optimizado:

- **Ficha de negocio** (`/:tipo/:categoria/:slug`) — Banner, logo, galeria con lightbox, productos, servicios, empleos, mapa, resenas, JSON-LD, negocios similares (compactos tipo clima).
- **Pagina de categoria** (`/categoria/:slug`) — Lista de negocios del tipo, banner, contador, grid de fichas.
- **Pagina de estado** (`/estado/:slug`) — Lista de negocios del estado, grid de fichas.
- **Ficha de producto** (`/producto/:tipo/:slug`) — Imagenes, videos, descripcion, negocio vinculado.
- **Landing page** (`/web/:slug`) — Pagina web automatica del negocio con marca En-Santiago, CTA WhatsApp, FAQ, galeria, mapa.

Todas incluyen: `<title>`, `<meta description>`, Open Graph (`og:image` con En-Santiago.png), Twitter Cards, canonical URL (`en-santiago.com`), y datos estructurados (JSON-LD).

---

## Diseno y UX

### Fichas de Negocio (Cards)
- **Layout vertical** con proporcion de imagen `aspect-ratio: 3/4` y `object-fit: contain` para mostrar la foto completa sin recortes.
- **Grid responsivo:** 4 columnas en desktop, 3 en tablet, 2 en movil.
- **Badge de destacado** centrado en la parte superior de cada ficha, visible en todos los dispositivos.
- **Maximo 4 destacados** por categoria (negocios, servicios medicos, inmuebles, productos, empleos).

### Negocios Similares
- Fichas compactas estilo widget de clima: imagen pequena centrada (110px), texto centrado, 4 columnas.
- Sin botones de accion (WhatsApp, favoritos, video) para no saturar la vista.
- Estilos encapsulados con selector `#similarGrid` para no afectar las fichas principales.

### Banners
- **Banner hero (homepage):** Configurable desde el panel admin (`hero_banner_url`). Recorte automatico: 15% arriba y abajo en desktop, 10% en movil.
- **Banner marketplace:** Configurable desde el panel admin (`marketplace_banner_url`). Mismo comportamiento de recorte.

### Busqueda
- **Modal de busqueda:** Cuando esta abierto, los elementos flotantes se ocultan con `visibility: hidden` para evitar superposicion en moviles.

---

## Sistema de Upload (R2)

El endpoint `/api/upload` acepta archivos via `FormData`:
- **Campo:** `file` (el archivo)
- **Campo opcional:** `product_type` (banner, logo, property, etc.)
- **Campo opcional:** `property_id` — para imagenes de inmuebles
- **Tipos permitidos:** image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm, video/quicktime
- **Tamano maximo:** 50MB
- **Auth:** Bearer JWT requerido
- **R2 key pattern:** `{R2_FOLDER}/{product_type}/{timestamp}_{filename}`
- **Respuesta:** `{ url: "/api/serve?key=...", key: "..." }`

---

## Sitemap y SEO

- **Sitemap dinamico:** `/sitemap.xml` → `/api/sitemap` — incluye paginas estaticas, negocios aprobados, productos aprobados, categorias, estados. Dominio: `en-santiago.com`.
- **Robots.txt dinamico:** `/robots.txt` → `/api/robots`
- **Google Search Console:** Meta tag de verificacion en `index.html`.
- **Open Graph:** Todas las paginas incluyen `og:title`, `og:description`, `og:image` (En-Santiago.png), `og:url`, `og:type`.
- **Twitter Cards:** Todas las paginas incluyen `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`.
- **JSON-LD:** Fichas de negocio incluyen `LocalBusiness` o `MedicalBusiness` schema.
- **Canonical:** Todas las paginas tienen `<link rel="canonical">`.
- **301 Redirects:** `_redirects` redirige URLs antiguas al dominio nuevo.

---

## Sistema de Chat

- WebSocket en `/api/chat`
- Salas por negocio-usuario
- Mensajes en tiempo real
- Configurable: `all` (todos), `premium_only`, `none`
- Panel de chat para admin en `admin-chat.html`

---

## Integracion Facebook

- Configuracion: `page_id` y `page_access_token` en `/api/facebook/config`
- Import manual (POST) o automatico via cron (GET con header `X-Cron-Secret`)
- Parsea publicaciones de Facebook: titulo, descripcion, precio, tipo de propiedad, habitaciones, banos, area
- Registra posts ya importados para evitar duplicados
- Los negocios importados se crean con `business_type = 'negocio'` y estatus configurable (auto-aprobar)

---

## Migraciones

Las migraciones se ejecutan via GET al endpoint correspondiente (requieren autenticacion admin):

| Endpoint | Descripcion |
|---|---|
| `/api/migrate/tipos-negocio` | Crea tabla tipos_negocio, asigna categorias a tipos, elimina CHECK constraint en business_type |
| `/api/migrate/product-type` | Agrega columna product_type a productos |
| `/api/migrate/schema-premium` | Agrega campos de plan premium |
| `/api/migrate/seller-role` | Agrega rol vendedor |
| `/api/migrate/category-suggestions` | Tabla de sugerencias de categorias |
| `/api/migrate/add-social-video` | Campos redes sociales y video |

---

## Despliegue

### Requisitos

- Cuenta de Cloudflare con Pages, D1 y R2 habilitados
- Dominio personalizado configurado en Cloudflare Pages
- GitHub repo conectado a Cloudflare Pages
- Variables de entorno configuradas en Cloudflare

### Variables de Entorno (Cloudflare Pages)

| Variable | Descripcion |
|---|---|
| `JWT_SECRET` | Secreto para firmar JWT tokens |
| `OPENAI_API_KEY` | Clave API de OpenAI (para chatbot IA, opcional) |
| `GOOGLE_MAPS_KEY` | API key de Google Maps (geocoding, opcional) |
| `CRON_SECRET` | Secreto para autenticar llamadas cron (Facebook import) |

### Configuracion en Cloudflare

1. **D1 Database:** Binding name `DB` → base de datos creada en el dashboard de Cloudflare
2. **R2 Bucket:** Binding name `R2` (y/o `MEDIA_BUCKET`) → bucket creado en el dashboard
3. **Pages Project:** Conectado al repositorio de GitHub, rama `main`
4. **Custom Domain:** `en-santiago.com` configurado en Pages > Custom domains

### Flujo

```bash
git add -A
git commit -m "descripcion del cambio"
git push origin main
# Cloudflare Pages detecta el push y despliega automaticamente
# Verificar: https://en-santiago.com
```

---

## Registro de Actualizaciones

### 2026-07-29 — Destacados siempre primero en todos los listados

**Cambio principal:**

- **Ordenamiento prioritario de destacados** — Los negocios, productos, empleos e inmuebles marcados como destacados (`featured = 1`) ahora aparecen SIEMPRE en las primeras posiciones de TODOS los listados, sin importar el tipo de ordenamiento seleccionado por el usuario. Esto aplica en: busquedas con filtros, "ver todos" desde el homepage, paginas de categoria, paginas de estado, marketplace y bolsa de empleo.
- **Antes:** El ordenamiento por defecto priorizaba usuarios premium, luego fecha de creacion. Los destacados solo se veian primero en la pagina de inicio (grid especial) y en las paginas de categoria/estado.
- **Ahora:** En TODOS los endpoints de listado, `featured DESC` es el primer criterio de ordenamiento, seguido del criterio que el usuario seleccione (precio, vistas, fecha, etc.).

**Archivos modificados:**

| Archivo | Cambio |
|---|---|
| `functions/api/businesses/index.js` | Todas las opciones de ORDER BY ahora incluyen `p.featured DESC` como primer criterio |
| `functions/api/marketplace/index.js` | Todas las opciones de ORDER BY ahora incluyen `p.featured DESC` como primer criterio |
| `functions/api/jobs/index.js` | Todas las opciones de ORDER BY ahora incluyen `j.featured DESC` como primer criterio |
| `functions/estado/[slug].js` | Agregado orden secundario `b.created_at DESC` despues de `b.featured DESC` |

**Nota:** Las paginas de categoria (`functions/categoria/[slug].js`) y el API de inmuebles (`functions/api/properties/index.js`) ya tenian `featured DESC` correcto. No requirieron cambios.

---

### 2026-07-28 — Notificaciones y Panel Admin

**Nuevas funcionalidades:**

- **Notificaciones automaticas al registrar contenido** — Cuando un usuario publica un nuevo Inmueble, Producto (Bazar) o Servicio Medico, se genera automaticamente una notificacion en el sistema para el administrador. Las notificaciones incluyen titulo, mensaje descriptivo, enlace directo al modulo correspondiente y tipo diferenciado (`new_property`, `new_product`).
- **Modal de detalle de notificacion en panel admin** — Al hacer clic en una fila de la tabla de notificaciones se abre un modal que muestra el contenido completo: tipo (con badge de color), titulo, mensaje, destinatario, fecha, enlace directo y opciones de accion (ir al recurso, eliminar, cerrar). Tipos soportados: `new_business`, `new_property`, `new_product`, `new_medical`, `system`, `premium`.
- **Marcado de notificaciones como leidas (Dashboard)** — Al hacer clic en una notificacion desde la campanita del dashboard del usuario, la notificacion se marca como leida con feedback visual (cambio de opacidad y texto "Leida" inline). Esto requirio agregar el metodo `api.patch()` que faltaba en `js/app.js`.
- **Iconos diferenciados por tipo de notificacion** — Cada tipo de notificacion en el dashboard muestra un icono Font Awesome especifico: `fa-house` para inmuebles, `fa-box` para productos, `fa-briefcase-medical` para servicios medicos, entre otros.

**Correcciones de bugs:**

- **`api.patch()` faltante en `js/app.js`** — El objeto `api` solo tenia `get`, `post`, `put`, `delete` y `postFormData`. El metodo `patch` no existia, lo que causaba que las notificaciones nunca se marcaran como leidas al hacer clic. Se agrego el metodo `patch(url, data)` que usa `method: 'PATCH'` con body JSON.
- **Variable duplicada `window._adminNotifList` en seccion Bazar de `admin.js`** — Un script de reemplazo automatico inserto una segunda asignacion de `window._adminNotifList = notifs` en la seccion equivocada del archivo admin.js, donde la variable `notifs` no estaba definida. Esto causaba un `ReferenceError` que colapsaba toda la funcion IIFE (5,919 lineas en un solo scope), impidiendo que se renderizaran las estadisticas del panel. Se elimino la linea duplicada.
- **Error de sintaxis: comilla de cierre faltante** — Un script Python de reemplazo de strings elimino accidentalmente una comilla simple en `'#8B0000;` (falta la `'` de cierre). Esto causaba error de sintaxis y rompia la ejecucion de todo el archivo JavaScript. Corregido a `'#8B0000';`.

**Mejoras de mantenibilidad:**

- **Comentarios de seccion en `admin.js`** — Se agregaron 17 bloques de comentarios (`// ====`) a lo largo del archivo `js/admin.js` para identificar y documentar cada seccion funcional: notificaciones, configuracion, destacados, estadisticas, usuarios, Bazar, inmuebles, servicios medicos, empleos, chat, etc. Cada bloque indica el proposito de la seccion, funciones principales y exports de `window`.

**Validacion:**

- Se valido la sintaxis de los 3 archivos JS principales (`app.js`, `admin.js`, `dashboard.js`) con `node -c` antes de cada cambio.
- Se comparo con la version en produccion `9804226b.aunclick.pages.dev` para confirmar que los bugs eran introducidos por cambios recientes.

**Archivos modificados:**

| Archivo | Cambio |
|---|---|
| `js/app.js` | Agregado metodo `api.patch()` |
| `js/admin.js` | Modal `openNotifDetail()`, labels por tipo, 17 comentarios de seccion, correccion de duplicado y sintaxis |
| `js/dashboard.js` | Iconos `fa-house` y `fa-box` en mapa de tipos, feedback visual al marcar leida |
| `admin.html` | Modal `#notifDetailModal` con badge tipo, contenido completo, botones de accion |
| `functions/api/properties/index.js` | Trigger de notificacion `new_property` al crear inmueble |
| `functions/api/marketplace/index.js` | Trigger de notificacion `new_product` al crear producto |

---

## Equipo de Desarrollo

- **Desarrollador:** @bboymak3
- **Plataforma:** Cloudflare Pages + D1 + R2
- **Repo:** [github.com/bboymak3/meridaunclick](https://github.com/bboymak3/meridaunclick)

---

## Licencia

Proyecto privado. Todos los derechos reservados.
