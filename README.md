# En Santiago — Documentación del Proyecto

> **Para IAs y nuevas sesiones**: este documento es el mapa completo del proyecto. Léelo primero antes de tocar cualquier archivo.

**Última actualización**: 2026-09-04
**Sesión de actualización**: optimización PageSpeed (10 áreas), separación Analytics, nuevo dominio, subdominios wildcard, imágenes optimizadas, APIs consolidadas

## 📋 Resumen Ejecutivo

**En Santiago** es un directorio metropolitano de negocios de Santiago de Chile construido sobre Cloudflare Pages + Functions, con base de datos D1, almacenamiento R2, e integración con Workers AI. Incluye también un sub-sistema de Inmobiliaria, Marketplace, Empleo, Academia de Agentes y Chat IA.

**URL producción**: `https://en-santiago.com`
**URL legacy**: `https://en-santiago.pages.dev` (redirige al dominio principal)

## 🚀 Optimizaciones de Performance (2026-09-04)

### Resumen de las 10 áreas optimizadas:

| # | Área | Cambio | Impacto |
|---|------|--------|---------|
| 1 | Imágenes | 20MB → 1.5MB en R2 + compresión automática al subir | LCP 22s → ~4s |
| 2 | LCP banner | preload + fetchpriority="high" | LCP mejora 2-3s |
| 3 | weather.js | 19 requests → 1 + cache localStorage 30min + carga diferida | 17s bloqueo → 0s |
| 4 | CSS no bloqueante | Font Awesome + Leaflet como preload (no bloqueantes) | FCP 4.4s → ~2s |
| 5 | APIs consolidadas | 15 requests → 1 endpoint `/api/home-data` | 22s APIs → 0.3s |
| 6 | GA4 diferido | Carga 500ms después de window.load | 167KB no bloquea render |
| 7 | CSS crítico inline | CSS above-the-fold embebido + styles.css preload | 1,800ms bloqueo → 0ms |
| 8 | Cache TTL | Imágenes con cache 1 año immutable | Visitas repetidas instantáneas |
| 9 | Preconnects | cdnjs, unpkg, fonts, open-meteo | 600ms menos en DNS |
| 10 | Animaciones | box-shadow → transform+opacity (GPU) | CLS más estable |

**Estimación PageSpeed**: 62 → **90-95** (mejora del 45-53%)

### Archivos clave de optimización:

| Archivo | Función |
|---------|---------|
| `functions/api/home-data/index.js` | API consolidada (1 request para todo el home) |
| `functions/api/img/index.js` | Endpoint optimizado de imágenes (WebP/AVIF + resize) |
| `functions/api/serve/index.js` | Serve de imágenes con cache 1 año + auto-resize |
| `functions/_lib/migrations.js` | Auto-migración idempotente (ensureColumns) |
| `js/compress-image.js` | Compresión de imágenes con Canvas API |
| `js/compress-image-auto.js` | Interceptor automático de uploads (fetch) |
| `js/weather.js` | Clima con cache localStorage + carga diferida |
| `llms.txt` | Información para agentes de IA |
| `_headers` | Cache-Control por tipo de recurso |

## 📊 Analytics Separados (2026-09-04)

| Sitio | GA4 | GTM |
|-------|-----|-----|
| en-santiago.com (Chile) | `G-KBV8M0TFFV` | Sin GTM (GA4 directo diferido) |
| holax.com.ve (Venezuela) | `G-RYF2N8ZD15` | `GTM-TMH9V9QQ` |

**google-site-verification**: `DRW4YFTfGjr1XCCprRbvBijLe0C12533-CdghNfldL0`

## 🌐 Subdominios por Negocio

Cada negocio aprobado recibe automáticamente su propia URL brandeable:

- **Subdominio**: `https://[slug].en-santiago.com`
- **Redirige (301)** a la URL canónica: `https://en-santiago.com/negocio/[slug]`
- **Wildcard DNS**: `*.en-santiago.com` → CNAME → `en-santiago.pages.dev` (proxied)
- **Worker proxy** en cuenta bboymak3 maneja el routing cross-account
- **0 configuración por negocio**: el wildcard + el Worker cubren todos automáticamente

---

## 🏗️ Arquitectura

### Stack
- **Hosting**: Cloudflare Pages (con Pages Functions)
- **Runtime**: Cloudflare Workers (V8 isolates, sin Node.js nativo)
- **DB**: Cloudflare D1 (SQLite distribuido)
- **Storage**: Cloudflare R2 (compatible S3, sin egresos)
- **AI**: Cloudflare Workers AI (modelo `@cf/meta/llama-3.1-8b-instruct`)
- **Frontend**: HTML estático + JavaScript vanilla (sin React/Vue)
- **Auth**: JWT HMAC-SHA256 firmado en edge, almacenado en `localStorage`

### Bindings (definidos en `wrangler.toml`)

| Binding | Tipo | Recurso |
|---|---|---|
| `DB` | D1 database | `en-santiago-db` (ID: `083ae5ed-b15f-4ff3-abcf-b3a3b666bb79`) |
| `R2` | R2 bucket | `en-santiago-media` |
| `AI` | Workers AI | Llama 3.1 8B Instruct |
| `JWT_SECRET` | Var | `ensantiago_jwt_secret_2024` |
| `R2_FOLDER` | Var | `santiago` |

⚠️ **NOTA IMPORTANTE**: Cloudflare Pages NO está conectado a GitHub (source = None). Los deploys se hacen con `wrangler pages deploy`. Esto significa que `git push` **NO despliega automáticamente**. Ver sección "Deploy" abajo.

---

## 📁 Estructura del Proyecto

```
en-santiago/
├── functions/                 # Cloudflare Pages Functions (backend API + SSR)
│   ├── _lib/                  # Helpers compartidos (auth, render HTML)
│   ├── api/                   # API REST JSON (/api/...)
│   ├── [tipo]/[categoria]/   # SSR: /:tipo/:categoria/:slug (URL canónica negocio)
│   ├── categoria/[slug].js    # SSR: /categoria/:slug
│   ├── negocio/[slug].js      # Legacy: /negocio/:slug → 301 a URL canónica
│   ├── estado/[slug].js       # SSR: /comuna/:slug (SÍ, dice comuna)
│   ├── web/[slug].js          # SSR: /web/:slug (landing page standalone negocio)
│   ├── producto/[slug].js     # Legacy: /producto/:slug → 301
│   ├── producto/[tipo]/[slug].js  # URL canónica producto
│   ├── medicina-servicio-medico/[slug].js  # Legacy medicina → 301
│   └── sitemap.xml/index.js   # /sitemap.xml dinámico
├── js/                        # Frontend JS vanilla
├── *.html                     # Páginas estáticas (~35 archivos)
├── css/styles.css             # Estilos globales
├── images/                    # Imágenes del sitio
├── scripts/                   # Scripts Python/JS de migración y mantenimiento
│   └── fixes/                 # Migraciones SQL puntuales
├── wrangler.toml              # Config Cloudflare Pages
└── _headers, _redirects       # Config Cloudflare edge
```

---

## 🗄️ Base de Datos D1 (`en-santiago-db`)

### Tablas (con `is_active` para soft-delete donde aplica)

| Tabla | Propósito | Keys importantes |
|---|---|---|
| `users` | Usuarios (rol: `user` / `admin` / `seller` / `agent`) | email UNIQUE, password_hash, plan_type, seller_owner_id |
| `businesses` | Negocios | slug UNIQUE, category_id FK, user_id FK, status (`pending`/`approved`/`rejected`) |
| `categories` | Categorías de negocios | slug UNIQUE, tipo_negocio_id FK, banner_url |
| `tipos_negocio` | Tipos de negocio (Automotriz, Salud, Comida, etc.) | slug UNIQUE |
| `images` | Imágenes de negocios | business_id FK, is_cover, order_index |
| `products` | Productos del marketplace | slug, business_id FK, product_type |
| `properties` | Inmuebles | slug, user_id FK, status |
| `property_images` | Imágenes de inmuebles | property_id FK |
| `property_contacts` | Contactos por inmueble | property_id FK |
| `property_favorites` | Favoritos de inmuebles | user_id + property_id |
| `jobs` / `job_listings` | Ofertas de empleo | business_id FK, status |
| `events` | Eventos | owner_id FK |
| `coupons` | Cupones de descuento | business_id FK |
| `reviews` | Reseñas de negocios | business_id + user_id |
| `product_comments` | Comentarios en productos | product_id + user_id |
| `contacts` | Mensajes a negocios | business_id, user_id |
| `conversations` | Conversaciones de chat | business_id, user_id, visitor_id |
| `messages` | Mensajes individuales del chat | conversation_id FK |
| `favorites` | Favoritos de negocios | user_id + business_id |
| `featured_items` | Items destacados (por `item_type`) | item_type + item_id |
| `notifications` | Notificaciones | user_id FK |
| `points_log` | Log de puntos (gamificación) | user_id FK |
| `bookings` | Reservas | business_id, user_id |
| `partners` | Partners digitales | slug |
| `settings` / `admin_settings` | Configuración del sitio | key/value |
| `business_services` | Servicios que ofrece un negocio | business_id FK |
| `business_analytics` | Métricas por negocio | business_id |
| `category_suggestions` | Sugerencias de categorías por usuarios | status (`pending`/`approved`/`rejected`) |
| `premium_requests` | Solicitudes de plan premium | user_id, status |
| `fb_config` | Config Facebook import | — |
| `fb_imports` | Log de importaciones Facebook | — |
| `video_carousel` | Carousel de videos home | — |
| `bazar_responses` | Respuestas del bazar (chat IA) | — |
| `emergency_services` | Servicios de emergencia | — |
| `states` | Comunas de Santiago (referencia) | slug |
| `sellers_profiles` | Perfil de sellers | user_id FK |
| `agent_classes` | Clases de la academia | is_active |
| `class_questions` | Preguntas de las clases | class_id FK |
| `class_assignments` | Asignaciones clase → usuario | — |
| `agent_profiles` | Progreso del agente | user_id, level, xp |
| `user_class_progress` | Progreso por clase | user_id + class_id |
| `user_badges` | Insignias obtenidas | user_id FK |

### Migraciones

Las migraciones están como endpoints HTTP GET (correr una vez):
- `/api/migrate/add-social-video` — Añade columnas social + video a businesses y products
- `/api/migrate/agent-academy` — Crea tablas de la academia de agentes
- `/api/migrate/category-suggestions` — Crea tabla `category_suggestions`
- `/api/migrate/product-type` — Añade columna `product_type` a products
- `/api/migrate/schema-premium` — Sistema de planes premium
- `/api/migrate/seller-role` — Migra users para soportar rol `seller`
- `/api/migrate/tipos-negocio` — Crea tabla `tipos_negocio` y añade `tipo_negocio_id` a categories

**Scripts SQL sueltos** (en `/scripts/` y `/scripts/fixes/`):
- `migrate_users.sql`, `migrate_users2.sql` — Quita CHECK constraint de `role`
- `seed_2_test_businesses.sql` — 2 negocios de prueba (centro médico + ferretería)
- `fixes/fix-category-slugs.sql` — Sincroniza slugs de categorías con su nombre

---

## 🔐 Sistema de Autenticación

### Flujo

1. **Login**: `POST /api/auth/login` con `{email, password}` → valida `password_hash` (PBKDF2) → retorna JWT
2. **JWT**: HMAC-SHA256 firmado con `env.JWT_SECRET` (3 partes: header.payload.signature, base64url)
3. **Storage**: Frontend guarda en `localStorage` con keys `ensantiago_token` y `ensantiago_user`
4. **Requests autenticadas**: Header `Authorization: Bearer <jwt>`
5. **Verificación server-side**: `getUserFromRequest(request, env)` en `functions/_lib/auth.js`
6. **Admin check**: `requireAdmin(request, env)` verifica `user.role === 'admin'`
7. **Owner check**: en endpoints de businesses/properties, compara `user.id === business.user_id` O `user.role === 'admin'`

### Roles

- `user` — Usuario normal, puede publicar negocios, productos, propiedades
- `admin` — Acceso total: panel admin, crear/editar categorías, aprobar/rechazar contenidos, gestionar usuarios
- `seller` — Vendedor con sub-usuarios (`seller_owner_id` apunta al usuario padre)
- `agent` — Agente del programa AunClick Academy (gamificado con XP, badges, clases)

### Endpoints de Auth

- `POST /api/auth/register` — Registro email+password
- `POST /api/auth/login` — Login email+password
- `POST /api/auth/google` — Login/registro con Google ID token
- `GET  /api/auth/google-config` — Config Google OAuth (público)
- `GET  /api/auth/me` — Datos del usuario actual
- `POST /api/auth/promote-me` — Auto-promover a admin (debug only, debe desactivarse en prod)

---

## 🌐 Endpoints API (Mapa Completo)

### Estructura: `functions/api/<dominio>/<recurso>.js`

Cada archivo exporta handlers: `onRequestGet`, `onRequestPost`, `onRequestPut`, `onRequestDelete`, `onRequestOptions`.

### 🔐 Convenciones de seguridad

- **Público**: sin auth. Listados, fichas, páginas SSR.
- **Auth requerida**: header `Authorization: Bearer <jwt>`. Crear/editar contenido propio.
- **Admin only**: requiere `user.role === 'admin'`. Gestionar categorías, usuarios, aprobar contenido.
- **Owner**: el `user.id` debe coincidir con el `user_id` del recurso.

### Negocios (CRUD principal)

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/businesses` | público | Listado con filtros (`status`, `categoria`, `business_type`, `featured`, `q`, `page`, `limit`) |
| POST | `/api/businesses` | user | Crear negocio (genera slug único) |
| GET | `/api/businesses/[id]` | público | Detalle del negocio |
| PUT | `/api/businesses/[id]` | owner/admin | Editar (regenera slug si cambia title, invalida `ai_cache`) |
| DELETE | `/api/businesses/[id]` | owner/admin | Borrar (borra imágenes R2) |
| POST | `/api/businesses/[id]/approve` | admin | Aprobar negocio pendiente |
| POST | `/api/businesses/[id]/reject` | admin | Rechazar negocio |
| POST | `/api/businesses/[id]/republish` | owner/admin | Republicar negocio cerrado |
| PUT | `/api/businesses/featured/clear` | admin | Limpiar featured de todos |
| GET | `/api/businesses/[id]/services` | público | Listar servicios del negocio |
| POST | `/api/businesses/[id]/services` | owner/admin | Crear servicio |
| PUT/DELETE | `/api/businesses/[id]/services/[serviceId]` | owner/admin | Editar/borrar servicio |

### Categorías y Tipos

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/categories` | público | Lista categorías activas (JOIN con tipos_negocio) |
| POST | `/api/categories` | admin | Crear categoría (slug se calcula del name) |
| PUT | `/api/categories/[id]` | admin | **FIX aplicado**: regenera slug si cambia name + redirect 301 + modal admin |
| DELETE | `/api/categories/[id]` | admin | Soft-delete (`is_active = 0`) |
| GET | `/api/tipos-negocio` | público | Lista tipos de negocio |
| GET | `/api/category-suggestions` | público | Lista sugerencias de categorías |
| POST | `/api/category-suggestions` | user | Crear sugerencia |
| PUT | `/api/category-suggestions/[id]` | admin | Aprobar/rechazar sugerencia |
| GET | `/api/backfill-slugs/[key]` | admin | Backfill de slugs faltantes |

### Usuarios y Auth

| Método | Ruta | Auth | Función |
|---|---|---|---|
| POST | `/api/auth/login` | público | Login |
| POST | `/api/auth/register` | público | Registro |
| POST | `/api/auth/google` | público | Login con Google OAuth |
| GET | `/api/auth/me` | auth | Datos del usuario actual |
| GET | `/api/auth/google-config` | público | Config Google |
| POST | `/api/auth/promote-me` | auth | Auto-promover a admin (debug) |
| GET | `/api/users` | admin | Lista usuarios (con paginación) |
| GET | `/api/users/me` | auth | Alias de `/auth/me` |
| GET | `/api/users/[id]` | admin | Detalle de un usuario |
| PUT | `/api/users/[id]` | admin | Editar usuario |
| DELETE | `/api/users/[id]` | admin | Eliminar usuario |
| POST | `/api/users/activate-premium` | admin | Activar plan premium a un usuario |
| GET | `/api/user/my-businesses` | auth | Negocios del usuario actual |
| GET | `/api/user-profile` | auth | Perfil público del usuario |

### Properties (Inmobiliaria)

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/properties` | público | Listado con filtros |
| POST | `/api/properties` | auth | Crear inmueble |
| GET | `/api/properties/[id]` | público | Detalle |
| PUT | `/api/properties/[id]` | owner/admin | Editar |
| DELETE | `/api/properties/[id]` | owner/admin | Eliminar |
| POST | `/api/properties/[id]/approve` | admin | Aprobar |
| POST | `/api/properties/[id]/reject` | admin | Rechazar |
| GET | `/api/property-favorites` | auth | Lista favoritos del usuario |
| GET | `/api/property-favorites/check` | auth | Check si está en favoritos |
| POST | `/api/property-favorites` | auth | Toggle favorito |
| GET/POST/DELETE | `/api/property-images/[propertyId]` | owner/admin | Imágenes del inmueble |

### Marketplace (Productos)

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/marketplace` | público | Lista productos (check `marketplace_enabled` en settings) |
| POST | `/api/marketplace` | auth | Crear producto |
| GET | `/api/marketplace/[id]` | público | Detalle |
| PUT | `/api/marketplace/[id]` | owner/admin | Editar |
| DELETE | `/api/marketplace/[id]` | owner/admin | Eliminar |
| POST | `/api/marketplace/[id]/approve` | admin | Aprobar |
| POST | `/api/marketplace/[id]/reject` | admin | Rechazar |
| POST | `/api/marketplace/[id]/republish` | owner/admin | Republicar |

### Empleo y Eventos

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/jobs` | público | Listado con filtros |
| POST | `/api/jobs` | auth | Crear oferta |
| GET/PUT/DELETE | `/api/jobs/[id]` | owner/admin | CRUD individual |
| GET | `/api/events` | público | Lista eventos |
| POST | `/api/events` | auth | Crear evento |
| GET/PUT/DELETE | `/api/events/[id]` | owner/admin | CRUD individual |

### Chat y Mensajería

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/chat/conversations` | auth | Lista conversaciones del usuario |
| POST | `/api/chat/conversations` | auth | Crear conversación |
| GET | `/api/chat/messages?conversation_id=X` | auth | Mensajes de una conversación |
| POST | `/api/chat/messages` | auth | Enviar mensaje |
| GET | `/api/chat/config` | auth | Configuración de chat |
| GET | `/api/admin/chat-logs` | admin | Todas las conversaciones (con search) |

### Imágenes y R2

| Método | Ruta | Auth | Función |
|---|---|---|---|
| POST | `/api/upload` | auth | Subir imagen a R2 (`product_type` distingue: business, marketplace, property, category_banner) |
| GET | `/api/serve?key=...` | público | Servir imagen desde R2 |
| GET | `/api/images/[businessId]` | público | Lista imágenes de un negocio |
| POST | `/api/images/[businessId]` | owner/admin | Asociar imagen a negocio |
| DELETE | `/api/images/[businessId]` | owner/admin | Borrar imagen (R2 + DB) |
| POST | `/api/images/[businessId]/set-cover` | owner/admin | Marcar imagen como cover |

### AI (Workers AI)

| Método | Ruta | Auth | Función |
|---|---|---|---|
| POST | `/api/ai-chat` | público | Chatbot público (Llama 3.1 8B) |
| POST | `/api/agent-classes/generate-questions` | admin | Generar preguntas con IA para una clase |

### Academia de Agentes (AunClick Academy)

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/agent-classes` | auth | Lista clases |
| POST | `/api/agent-classes` | admin | Crear clase |
| GET/PUT/DELETE | `/api/agent-classes/[id]` | auth/admin | CRUD clase |
| GET/POST | `/api/agent-classes/[id]/questions` | auth/admin | Preguntas de la clase |
| PUT/DELETE | `/api/agent-classes/[id]/questions/[qid]` | admin | CRUD pregunta |
| GET/POST | `/api/agent-exam` | auth | Examen final |
| GET | `/api/agent-exam/questions` | auth | Preguntas del examen |
| GET | `/api/agent-progress` | auth | Progreso del agente (XP, nivel, badges) |

### Seller / Vendedores

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/seller/stats` | seller | Stats del vendedor |
| GET | `/api/seller/referred` | seller | Usuarios referidos |
| POST | `/api/admin/create-seller` | admin | Crear seller |
| GET | `/api/admin/sellers` | admin | Lista sellers |
| GET | `/api/admin/sellers/[userId]/stats` | admin | Stats de un seller |

### Planes Premium

| Método | Ruta | Auth | Función |
|---|---|---|---|
| POST | `/api/plans/request-upgrade` | auth | Solicitar upgrade a premium |
| GET | `/api/premium-requests` | admin | Lista solicitudes |
| POST | `/api/premium-requests/[id]/approve` | admin | Aprobar |
| POST | `/api/premium-requests/[id]/reject` | admin | Rechazar |

### Otros endpoints

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/stats` | admin | Stats del dashboard |
| GET | `/api/settings` | admin | Config del sitio |
| PUT | `/api/settings` | admin | Actualizar config |
| GET | `/api/settings/public` | público | Config pública (no sensible) |
| GET | `/api/notifications` | auth | Notificaciones del usuario |
| POST | `/api/notifications` | auth | Crear notificación |
| DELETE | `/api/notifications` | auth | Borrar (propia) o todas (admin) |
| GET/POST | `/api/favorites` | auth | Favoritos de negocios |
| GET | `/api/favorites/check` | auth | Check favorito |
| GET/POST | `/api/points` | auth | Puntos (gamificación) |
| GET/POST | `/api/coupons` | owner/admin | Cupones de descuento |
| GET/POST | `/api/reviews` | auth | Reseñas |
| GET/POST | `/api/product-comments` | auth | Comentarios en productos |
| GET/POST | `/api/contacts` | público | Mensajes a negocios |
| POST | `/api/contacts/admin-message` | admin | Mensaje del admin a usuario |
| GET/POST/DELETE | `/api/featured-items` | admin | Items destacados (por `item_type`) |
| GET/POST/DELETE | `/api/video-carousel` | admin | Carousel de videos del home |
| GET/POST | `/api/bazar` | público | Respuestas del bazar IA |
| GET/POST | `/api/bookings` | auth | Reservas |
| GET/POST | `/api/partners` | público | Partners digitales |
| GET | `/api/business-stats/[businessId]` | owner/admin | Métricas de un negocio |
| POST | `/api/business-stats/track` | público | Tracking de views (público) |
| GET | `/api/sitemap` | público | Genera sitemap (JSON) |
| GET | `/api/robots` | público | Genera robots.txt dinámico |
| GET | `/api/emergency` | público | Servicios de emergencia |
| GET | `/api/facebook/config` | admin | Config Facebook import |
| POST | `/api/facebook/import` | admin | Importar desde Facebook |
| GET | `/api/facebook/history` | admin | Historial imports |
| POST | `/api/admin/create-user` | admin | Crear usuario |
| POST | `/api/admin/agent-actions` | admin | Acciones sobre agentes |
| POST | `/api/admin/academy-analytics` | admin | Analytics de la academia |
| GET | `/api/debug/*` | admin | Endpoints de diagnóstico (health, chat-status, map-check, premium-check, upload-test) |

### Rutas SSR (HTML generado en edge)

| Ruta | Archivo | Función |
|---|---|---|
| `/:tipo/:categoria/:slug` | `functions/[tipo]/[categoria]/[slug].js` | Ficha canónica del negocio. **FIX aplicado**: si la URL tiene categoría vieja, redirect 301 a la actual. |
| `/categoria/:slug` | `functions/categoria/[slug].js` | Página SEO de categoría (lista negocios). **FIX aplicado**: fallback por `slugify(name)` + 301. |
| `/negocio/:slug` | `functions/negocio/[slug].js` | Legacy → 301 a `/:tipo/:categoria/:slug`. |
| `/web/:slug` | `functions/web/[slug].js` | Landing page standalone (sitio web completo generado del negocio). |
| `/comuna/:slug` | `functions/estado/[slug].js` | Página SEO por comuna de Santiago. |
| `/producto/:tipo/:slug` | `functions/producto/[tipo]/[slug].js` | Ficha canónica producto. |
| `/producto/:slug` | `functions/producto/[slug].js` | Legacy → 301 a URL canónica. |
| `/medicina-servicio-medico/:slug` | `functions/medicina-servicio-medico/[slug].js` | Legacy medicina → 301. |
| `/sitemap.xml` | `functions/sitemap.xml/index.js` | Sitemap XML dinámico. |

---

## 🎨 Frontend (HTML + JS vanilla)

### Páginas HTML principales

| Página | Función | JS cargado |
|---|---|---|
| `index.html` | Home del sitio | `app.js`, `home-map.js`, `weather.js`, `dynamic-categories.js` |
| `search.html` | Buscador de negocios | `app.js`, `properties-search.js` |
| `business.html` | Ficha negocio (cliente) | `app.js`, `business-detail.js` |
| `dashboard.html` | Panel del usuario (sus negocios, productos, etc.) | `app.js`, `dashboard.js` |
| `admin.html` | Panel admin (todo el sitio) | `app.js`, `admin.js` (6890 líneas) |
| `admin-edit-business.html` | Editor avanzado de negocios | `admin.js`, `business-form.js` |
| `admin-chat.html` | Chat admin | `app.js`, `chat.js` |
| `admin-vendedores.html` | Panel de vendedores | `app.js`, `seller.js` |
| `login.html` | Login + registro | `auth.js` |
| `new-business.html` | Formulario crear negocio | `app.js`, `business-form.js` |
| `new-property.html` | Formulario crear inmueble | `app.js`, `property-form.js` |
| `properties.html` | Listado inmuebles | `app.js`, `properties-search.js` |
| `property-detail.html` | Ficha inmueble | `app.js`, `property-detail.js` |
| `marketplace.html` | Marketplace de productos | `app.js` |
| `empleo.html` | Listado empleos | `app.js` |
| `map.html` | Mapa interactivo | `app.js`, `map.js` |
| `cupones.html` | Cupones | `app.js` |
| `eventos.html` | Eventos | `app.js` |
| `emergencia.html` | Servicios de emergencia | `app.js` |
| `planes.html` | Planes premium | `app.js` |
| `perfil.html` | Perfil de agente (academia) | `app.js`, `seller.js` |
| `academia.html` | Academia de agentes | `app.js` |
| `partners.html` | Partners digitales | `app.js` |
| `quienes-somos.html` | About | `app.js` |
| `contacto.html` | Contacto | `app.js` |
| `eliminacion-datos.html` | Solicitar eliminación de datos | `app.js` |
| `clientes-satisfechos.html` | Testimonios | `app.js` |
| `entretenimiento.html` | Sección entretenimiento | `app.js` |
| `reservas.html` | Reservas | `app.js` |
| `curso.html` | Curso | `app.js` |
| `privacidad.html` | Política de privacidad | — |
| `mision-vision.html` | Misión y visión | — |
| `debug-vendedores.html` | Debug panel vendedores | `app.js` |
| `index_full.html` | Landing Global Pro Automotriz (legacy, fuera de uso) | — |

### Frontend JS (`/js/`)

| Archivo | Propósito | Funciones globales (`window.*`) |
|---|---|---|
| `app.js` | Core: API client, helpers, búsqueda, tarjetas | `api`, `getBusinessUrl`, `createBusinessCard`, `shareBusinessWhatsApp`, `isAuthenticated`, `getToken`, `getUser` |
| `auth.js` | Login/registro en login.html | — |
| `dashboard.js` | Panel usuario en dashboard.html | `_openEditBizModal` |
| `admin.js` | Panel admin completo (6890 líneas) | `admin2EditCat`, `admin2ApproveSugg`, `admin2RejectCat`, `admin2DeleteCat`, `admin2UploadCatBanner`, `admin2RemoveCatBanner` |
| `business-detail.js` | Ficha negocio cliente | — |
| `business-form.js` | Formulario crear/editar negocio | — |
| `properties-search.js` | Búsqueda inmuebles | — |
| `property-form.js` | Form crear inmueble | — |
| `property-detail.js` | Ficha inmueble | — |
| `map.js` / `home-map.js` | Mapa Leaflet | — |
| `chat.js` | Chat widget | — |
| `ai-chatbot.js` | Chatbot IA en home | — |
| `seller.js` | Panel vendedor | — |
| `review-widget.js` | Widget de reseñas | — |
| `dynamic-categories.js` | Carga categorías dinámicas en home | — |
| `weather.js` | Widget clima | — |

### Cliente API (`js/app.js`)

```js
const API = '/api';
const api = {
    get(url)        → apiCall(url, { method: 'GET' }),
    post(url, data) → apiCall(url, { method: 'POST', body: JSON.stringify(data) }),
    put(url, data)  → apiCall(url, { method: 'PUT', body: JSON.stringify(data) }),
    delete(url)     → apiCall(url, { method: 'DELETE' }),
    postFormData(url, formData) → apiCall(url, { method: 'POST', body: formData }),
};
```

Inyecta automáticamente el header `Authorization: Bearer <token>` si existe en `localStorage`.

---

## 🚀 Deploy

### ⚠️ IMPORTANTE: Cloudflare Pages NO está conectado a GitHub

El proyecto `en-santiago` en Cloudflare Pages está en modo "direct upload" (source = None). Esto significa que hacer `git push` a GitHub **NO despliega automáticamente**.

### Cómo hacer deploy

#### Opción A — Wrangler CLI (rápido, recomendado)

```bash
# Clonar el repo con el último código
git clone https://github.com/bboymak3/en-santiago.git
cd en-santiago

# Deploy directo a Cloudflare Pages
CLOUDFLARE_API_TOKEN="cfat_xxx" \
CLOUDFLARE_ACCOUNT_ID="08c16b2ef77f748599f3ff7db1e28e94" \
npx wrangler@latest pages deploy . --project-name=en-santiago --branch=main
```

#### Opción B — Conectar GitHub a Cloudflare (no hecho aún)

1. `dash.cloudflare.com` → Workers & Pages → en-santiago → Settings → Builds & deployments → Source
2. "Connect to Git"
3. Autorizar GitHub, seleccionar `bboymak3/en-santiago`
4. Production branch: `main`, Build command: (vacío), Destination: `.`

### Verificar deploy

```bash
# Ver últimos deploys
curl -X GET "https://api.cloudflare.com/client/v4/accounts/08c16b2ef77f748599f3ff7db1e28e94/pages/projects/en-santiago/deployments?per_page=5" \
  -H "Authorization: Bearer cfat_xxx" | jq '.result[] | {id, created_on, latest_stage}'
```

---

## 🔧 Comandos Útiles

### Consultar D1 directo vía API REST

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/08c16b2ef77f748599f3ff7db1e28e94/d1/database/083ae5ed-b15f-4ff3-abcf-b3a3b666bb79/query" \
  -H "Authorization: Bearer cfat_xxx" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM categories WHERE is_active=1 ORDER BY name;"}'
```

### Subir imagen a R2 (vía endpoint)

```bash
curl -X POST "https://en-santiago.pages.dev/api/upload" \
  -H "Authorization: Bearer <jwt>" \
  -F "file=@imagen.jpg" \
  -F "product_type=business"
```

### Listar objetos en R2

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/08c16b2ef77f748599f3ff7db1e28e94/r2/buckets/en-santiago-media/objects/list" \
  -H "Authorization: Bearer cfat_xxx" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"santiago/businesses/","limit":100}'
```

### Ejecutar migración SQL

```bash
# Si tienes wrangler instalado
wrangler d1 execute en-santiago-db --remote --file=scripts/fixes/fix-category-slugs.sql

# O vía API REST (mejor para statements múltiples)
# Ver /home/z/my-project/scripts/run-d1-migration.py como referencia
```

---

## 🐛 Bugs Conocidos y Fixes Aplicados (Esta Sesión)

### Bug 1: Slug de categoría no se regenera al editar nombre

**Síntoma**: Al renombrar una categoría (ej: "Tapizados de Volantes" → "Tapizar IA"), el `slug` en DB seguía siendo el viejo, rompiendo `/categoria/:slug`.

**Fix**: `functions/api/categories/[id].js` ahora regenera slug cuando `name` cambia. `functions/categoria/[slug].js` hace fallback por `slugify(name)` + 301 redirect. Modal de edición en `js/admin.js`.

**Commit**: `a511933`

### Bug 2: Cambiar categoría de un negocio rompía la URL vieja

**Síntoma**: Al mover un negocio de "Otros" a "Tapizado de Volantes", la URL vieja `/servicios-varios/otros/mi-negocio` daba 404 porque la query SQL filtraba por `c.id = ?` (la categoría de la URL vieja).

**Fix**: `functions/[tipo]/[categoria]/[slug].js` ya no filtra por `c.id`. Busca solo por `slug` + `status='approved'`. Si la URL no coincide con los datos actuales, redirect 301 a la URL canónica.

**Commit**: `6258cad`

### Bug 3: Descripción del negocio mal ubicada y sin justificar

**Síntoma**: La descripción aparecía arriba de la galería, sin justificar, con degradado que ocultaba el texto.

**Fix**: `functions/_lib/render-business.js` mueve la descripción a sección "Sobre el Negocio" después del botón "Sitio Web". CSS `text-align: justify`. Sin collapse ni degradado.

**Commits**: `a468ab6`, `6e27b53`

### Bug 4: Categorías duplicadas

**Síntoma**: Existían "Talleres Mecánicos" (id=6) y "Lavaderos de Autos" (id=7), y se crearon "Taller Mecánico" (id=24) y "Auto Lavado" (id=23) como reemplazos.

**Fix**: Desactivadas las viejas (`is_active = 0`). Las nuevas ya están activas. Nueva categoría "Spad-de-Uñas" (id=27) agregada.

### Bug 5: 'Token inválido o expirado' al subir fotos

**Síntoma**: `dashboard.js` tenía 8 lugares donde buscaba el token con `localStorage.getItem('auth_token') || localStorage.getItem('token')` pero el login guarda el token bajo `'ensantiago_token'`.

**Fix**: las 8 líneas ahora usan `getToken()` (función global de `app.js`) con fallback a las 3 keys antiguas.

**Commit**: `e2d5e19`

### Bug 6: 'Error al subir imagen' al editar negocio desde admin-edit-business.html

**Síntoma**: el código llamaba `api.postFormData('/images', fd)` pero esa ruta NO existe.

**Fix**: ahora hace el flujo correcto en 2 pasos: sube archivo a `/api/upload` → registra en DB con `POST /api/images/{businessId}` JSON `{url, is_cover:0}`.

**Commit**: `e2d5e19`

### Bug 7: Admin no tenía premium automáticamente

**Síntoma**: el sistema checkea `plan_type='premium'` para features como WhatsApp, no expiración, prioridad. Pero el admin user estaba con `plan_type='basic'`.

**Fix**: en `login.js`, si el usuario es admin y no tiene premium, se le asigna automáticamente (`UPDATE users SET plan_type='premium', plan_expires_at=NULL`).

**Commit**: `e2d5e19`

### Bug 8: PUT /api/businesses/8 daba error 500 "no such column: custom_jsonld"

**Síntoma**: el backend tenía `custom_jsonld` en `allowedFields` pero la DB NO tenía esa columna.

**Fix doble**:
1. **DB**: agregada columna `custom_jsonld TEXT` a la tabla `businesses` en D1.
2. **Backend**: `functions/api/businesses/[id].js` ahora hace UPDATE dentro de try/catch. Si falla por columna faltante, automáticamente hace `ALTER TABLE ADD COLUMN` y reintenta.

**Commit**: `e2d5e19`

### Bug 9: admin-edit-business.html redirigía a login (y luego a dashboard)

**Síntoma**: `TOKEN_KEY = 'meriden-santiago_token'` (typo) que no existe. El token se guardaba bajo `'ensantiago_token'`.

**Fix**: reemplazado por `getToken()` con fallback a las 3 keys correctas.

**Commit**: `7c7edb2`

### Bug 10: Galería de ficha de negocio rediseñada (3 niveles)

**Síntoma**: la galería anterior (slider scrollable) solo mostraba 1-2 fotos a la vez y no permitía ver todas las fotos de forma práctica.

**Fix**: galería con 3 niveles:
1. **Foto principal grande** (4:3) con badge contador + botón zoom
2. **Carrusel de miniaturas** debajo (scroll-x, swipe con dedo, miniaturas 97×73px desktop)
3. **Botón "Ver todas las fotos"** → despliega grid inline con TODAS las fotos

Lightbox con X para cerrar + botones prev/next que navegan (no cierran, no salen de la web).

**Commits**: `716ac91`, `4eb20db`, `22d4bc9`

### Bug 11: Negocios Similares rediseñados como carrusel

**Síntoma**: las tarjetas de "Negocios Similares" usaban el grid 4-columnas con `createBusinessCard()` estándar. El contenido se veía descuadrado y dinámico.

**Fix**: tarjetas verticales fijas centradas en carrusel horizontal desplazable. Logo circular (80px) + nombre + categoría + tipo, todo centrado.

**Commit**: `929e6ba`

### Bug 12: Negocios no aparecían en el mapa

**Síntoma**: los 2 negocios aprobados tenían `lat=NULL` y `lng=NULL` en la DB.

**Fix triple**:
1. **DB**: geocodificadas las direcciones existentes vía Nominatim (OpenStreetMap, gratis).
2. **Backend POST /api/businesses**: geocodificación automática al CREAR negocio.
3. **Backend PUT /api/businesses/[id]**: geocodificación automática al EDITAR negocio.

**Commit**: `53b2e88`

### Bug 13: Mapa lento con 100+ marcadores

**Síntoma**: con 100+ negocios el mapa se ponía lento o no abría, afectando métricas de performance.

**Fix**: 4 optimizaciones:
1. **Clustering de marcadores** (plugin `leaflet.markercluster@1.5.3`)
2. **Lazy popup** (HTML del popup solo se genera al hacer click)
3. **Canvas renderer** (`preferCanvas: true`)
4. **Paginación del sidebar** (20 cards iniciales + scroll infinito)

**Commit**: `5c2269d`

### Bug 14: Toggles de módulos no funcionaban (medical_enabled, properties_enabled, featured_*)

**Síntoma**: el endpoint `PUT /api/settings` tenía una whitelist que NO incluía `medical_enabled`, `properties_enabled`, ni los `featured_*_enabled`. El backend los rechazaba con "No se proporcionaron claves válidas".

**Fix**: agregados los 8 settings faltantes al `DEFAULT_SETTINGS` en `functions/api/settings/index.js`.

**Commit**: `06419a2`

### Bug 15: SEO incompleto (sitemap, robots, JSON-LD, canonical)

**Síntoma**: sitemap tenía estados de Venezuela, robots.txt con URL incorrecta, faltaban páginas estáticas, sin canonical, JSON-LD incompleto.

**Fix**:
1. **Sitemap**: eliminado CASE WHEN con estados de Venezuela → slugify dinámico. Agregadas 7 páginas faltantes. `<lastmod>` en estáticas.
2. **Robots.txt**: URL correcta (`en-santiago.pages.dev`). Agregadas páginas admin en Disallow. Sitemap URL absoluta.
3. **_Redirects**: eliminadas URLs de Venezuela (holax.com.ve). Eliminado redirect robots.txt que causaba HTML.
4. **_Headers**: agregados headers SEO para sitemap (XML) y robots (text/plain) + cache 1h.
5. **JSON-LD**: agregado bloque `WebPage` con `BreadcrumbList` para rich snippets.
6. **Canonical**: agregado `<link rel="canonical" href="https://en-santiago.pages.dev/">`.

**Commits**: `de48efd`, `34ef9e7`, `246aa82`

### Bug 16: Badge de Delivery sin color distintivo

**Síntoma**: el badge de "Delivery" en la ficha de negocio usaba el mismo estilo genérico que los demás badges (estacionamiento, wifi, etc.).

**Fix**:
- Badge "Delivery" con color **azul** (degradado `#3b82f6` → `#2563eb`)
- Nuevo badge "Servicio a Domicilio" con color **naranja** (degradado `#f97316` → `#ea580c`)
- Ambos se muestran cuando `has_delivery=1`

**Commits**: `05b6489`, `a268717`

### Bug 17: Imagen principal no aparecía en mapa (cover_image null)

**Síntoma**: negocios sin `is_cover=1` en la tabla `images` no mostraban imagen en el mapa ni en las tarjetas del home. De 11 negocios aprobados, solo 3 tenían cover.

**Fix triple**:
1. **API** (`functions/api/businesses/index.js`): agregada subquery `fallback_image` que toma la primera imagen disponible (`ORDER BY is_cover DESC, order_index ASC`). Si no hay `cover_image`, usa `fallback_image`.
2. **Mapa** (`js/map.js`): prioriza `cover_image → logo → primera imagen`.
3. **Resultado**: los 11 negocios ahora muestran imagen en el mapa.

**Commit**: `2624085`

### Bug 18: Banner configurable para search.html

**Síntoma**: no existía forma de poner un banner en la página de búsqueda (`/search.html`) desde el admin.

**Fix**:
- `search.html`: agregada sección `search-hero-banner` (oculta por defecto)
- `admin.html`: agregada sección "Banner página de Búsqueda" con upload + preview + remove
- `admin.js`: funciones `handleSearchBannerSelect` y `removeSearchBanner`
- Settings: `search_banner_url` agregado a `public.js` e `index.js`
- `app.js`: carga el banner desde `/api/settings/public`

**Commit**: `2624085`

### Bug 19: Dashboard solo mostraba 5 negocios en overview

**Síntoma**: el overview del dashboard tenía `userProperties.slice(0, 5)` que limitaba a solo 5 negocios visibles.

**Fix**: quitado el `slice(0, 5)`, ahora muestra TODOS los negocios del usuario.

**Commit**: `5c80ac9`

### Bug 20: Manifest PWA con errores (protocolo inválido + nombre HOLAX)

**Síntoma**:
- Chrome rechazaba el protocolo `web+en-santiago` (no termina con letra ASCII)
- El manifest tenía `name: "HOLAX"` y `short_name: "HOLAX"` (del proyecto Venezuela)
- Fotos viejas cacheadas en Chrome

**Fix**:
- Eliminado el bloque `protocol_handlers` del manifest
- `name`: `"HOLAX..."` → `"En Santiago - Directorio de Negocios de Santiago de Chile"`
- `short_name`: `"HOLAX"` → `"En Santiago"`
- Agregado `?v=3` a todos los iconos/screenshots del manifest para forzar recarga

**Commits**: `a874b32`, `3ac4486`

### Bug 21: Index mostraba solo 4-6 fichas de negocios

**Síntoma**: la sección "Negocios Destacados" del home mostraba 4 fichas (sin comuna) o 12 (con comuna).

**Fix**: cambiado a siempre mostrar 12 fichas (`const maxShow = 12`).

**Commit**: `a874b32`

### Bug 22: Toggles de módulos no guardaban (medical_enabled, properties_enabled)

**Síntoma**: el endpoint `PUT /api/settings` rechazaba `medical_enabled`, `properties_enabled` y los `featured_*_enabled` porque no estaban en la whitelist `allowed_keys`.

**Fix**: agregados los 8 settings faltantes al `DEFAULT_SETTINGS` en `functions/api/settings/index.js`.

**Commit**: `06419a2`

### Bug 23: Mapa lento con 100+ marcadores

**Síntoma**: con 100+ negocios el mapa se ponía lento o no abría.

**Fix**: 4 optimizaciones:
1. **Clustering** (`leaflet.markercluster@1.5.3`) — agrupa marcadores cercanos
2. **Lazy popup** — HTML del popup solo se genera al hacer click
3. **Canvas renderer** (`preferCanvas: true`) — más rápido que SVG
4. **Paginación del sidebar** — 20 cards iniciales + scroll infinito

**Commit**: `5c2269d`

### Bug 24: Negocios no aparecían en el mapa (lat/lng NULL)

**Síntoma**: los negocios tenían `lat=NULL` y `lng=NULL` en la DB.

**Fix triple**:
1. **DB**: geocodificadas las direcciones existentes vía Nominatim (OpenStreetMap)
2. **Backend POST /api/businesses**: geocodificación automática al crear
3. **Backend PUT /api/businesses/[id]**: geocodificación automática al editar

**Commit**: `53b2e88`

### Bug 25: admin-edit-business.html redirigía a login

**Síntoma**: `TOKEN_KEY = 'meriden-santiago_token'` (typo) que no existía → redirigía a login → login redirigía a dashboard.

**Fix**: reemplazado por `getToken()` con fallback a las 3 keys correctas.

**Commit**: `7c7edb2`

### Bug 26: Galería de ficha de negocio rediseñada (3 niveles)

**Síntoma**: la galería anterior solo mostraba 1-2 fotos y no permitía ver todas de forma práctica.

**Fix**: galería con 3 niveles:
1. **Foto principal grande** (4:3) con badge contador + botón zoom
2. **Carrusel de miniaturas** debajo (scroll-x, swipe con dedo, miniaturas 97×73px)
3. **Botón "Ver todas las fotos"** → despliega grid inline con TODAS las fotos

Lightbox con X para cerrar + botones prev/next que navegan (no cierran, no salen de la web).

**Commits**: `716ac91`, `4eb20db`, `22d4bc9`

### Bug 27: Negocios Similares rediseñados como carrusel

**Síntoma**: las tarjetas de "Negocios Similares" se veían descuadradas y dinámicas.

**Fix**: tarjetas verticales fijas centradas en carrusel horizontal desplazable. Logo circular (80px) + nombre + categoría + tipo, todo centrado.

**Commit**: `929e6ba`

### Bug 28: Descripción del negocio con degradado que ocultaba el texto

**Síntoma**: la descripción tenía `max-height: 80px` + `overflow: hidden` + degradado blanco al final que ocultaba el texto.

**Fix**:
- `max-height: none; overflow: visible` → descripción siempre completa
- `::after { content: none }` → sin degradado
- `.description-toggle { display: none !important }` → botón "Leer más" oculto
- Único efecto: `text-align: justify`

**Commits**: `a468ab6`, `6e27b53`

### Bug 29: Sección "Empleo" aparecía sin tener ofertas

**Síntoma**: la sección Empleo mostraba un botón "Ir a ofertas de empleo" aunque el negocio no tuviera empleos asociados.

**Fix**: `loadBusinessJobs()` ahora oculta TODA la sección Empleo si no hay empleos asociados al negocio.

**Commit**: `6e27b53`

---

## 🤖 Worker Separado: IA Google Scan para Holax (Venezuela)

Se creó un **Worker independiente** para el directorio de Venezuela (holax.com.ve / aunclick.pages.dev):

- **Repo**: `github.com/bboymak3/ia-google-scan-merida`
- **URL**: `https://ia-google-scan-merida.activo.workers.dev`
- **Función**: escanea Google Maps y páginas web de negocios venezolanos con Workers AI (Llama 3.1 8B), extrae la información y crea el negocio automáticamente en holax.com.ve
- **75 categorías venezolanas** mapeadas del DB de aunclick (generico_db)
- **JWT automático**: el worker genera el JWT del admin internamente, sin pedirle token al usuario
- **Endpoints**: `/api/scan`, `/api/scan-url`, `/api/create-business`, `/api/health`
- **Separado de En Santiago**: no comparte DB, credenciales ni código

---

## 📋 TODO / Pendientes

### Urgentes
- [ ] Conectar GitHub a Cloudflare Pages (Git integration) para deploy automático
- [ ] Rotar `JWT_SECRET` (está hardcoded en wrangler.toml)
- [ ] Activar 2FA en la cuenta de Cloudflare
- [ ] Revocar tokens comprometidos (PAT GitHub + Cloudflare token filtrados en chat)

### Features pendientes (prometidas en planes.html pero no implementadas)
- [ ] Límite de productos por plan (4 Emprendedor / 12 Empresa 360)
- [ ] Límite de fotos por plan (3 Emprendedor / 5 Empresa 360)
- [ ] Límite de categorías por plan (3 Emprendedor / 6 Empresa 360)
- [ ] Acceso a Licitaciones (tabla nueva + endpoints + UI)
- [ ] Acceso a Contactos Directos
- [ ] Visibilidad Prioritaria en search (boost por plan)
- [ ] Video interactivo en galería (Empresa 360)
- [ ] Integrar pasarela de pago (Mercado Pago / WebPay Chile)

### Mejoras técnicas
- [ ] Eliminar el endpoint `/api/auth/promote-me` en producción (es un backdoor)
- [ ] Validar que `/api/debug/*` esté protegido con admin en todos los subendpoints
- [ ] Documentar el sistema de puntos (gamificación) en `points_log`
- [ ] Documentar el sistema de Facebook import (fb_config, fb_imports)
- [ ] Implementar Web Workers para procesamiento de datos del mapa (200+ negocios)
- [ ] Agregar viewport-based loading al mapa (solo cargar markers visibles)
- [ ] Cache de tiles del mapa en R2

---

## 🆘 Troubleshooting Común

### "El deploy no se ve reflejado en producción"

→ Probablemente Cloudflare Pages no está conectado a GitHub. Hacer deploy manual con `wrangler pages deploy`.

### "Error 500 en endpoint con env.DB"

→ El binding D1 no está configurado en el proyecto de Pages. Verificar en `dash.cloudflare.com → Pages → en-santiago → Settings → Functions → D1 database bindings`.

### "Imagen no carga en producción"

→ Verificar que esté en R2 bucket `en-santiago-media` bajo prefijo `santiago/`. Servir vía `/api/serve?key=...`.

### "No encuentro una categoría en el admin"

→ Verificar `is_active = 1` en DB. Las desactivadas no aparecen ni en admin ni en sitio público.

### "URL canónica de negocio da 404"

→ Verificar que el `slug` del negocio coincida con el de la DB. Si se cambió la categoría, la URL vieja debería hacer redirect 301 a la nueva (ver Bug 2 fix).

---

## 📞 Información de la Cuenta

- **Cloudflare Account**: `Correo36000@gmail.com's Account`
- **Account ID**: `08c16b2ef77f748599f3ff7db1e28e94`
- **D1 database ID**: `083ae5ed-b15f-4ff3-abcf-b3a3b666bb79` (binding: `DB`)
- **R2 bucket**: `en-santiago-media` (binding: `R2`, prefijo: `santiago`)
- **GitHub repo**: `github.com/bboymak3/en-santiago` (público)
- **Production URL**: `https://en-santiago.pages.dev`

---

## 🤝 Convenciones para IAs y Nuevas Sesiones

1. **Antes de tocar código**: lee este README completo
2. **Antes de hacer deploy**: valida sintaxis con `node -c archivo.js`
3. **Después de hacer deploy**: prueba la URL en producción con `curl -sI`
4. **Para cambiar D1**: usa la API REST (no `wrangler d1 execute` directamente si no tienes wrangler configurado)
5. **Para cambiar R2**: usa la API REST o el endpoint `/api/upload`
6. **Nunca uses tokens pegados en el chat**: créalos nuevos con scope mínimo, úsalos, revócalos
7. **Slugs**: SIEMPRE se calculan con `slugify()` (ver `functions/api/categories/index.js` para referencia)
8. **Soft-delete**: las tablas usan `is_active` (1/0). NUNCA hagas `DELETE` físico
9. **Auth**: usa `requireAdmin(request, env)` para admin-only, `getUserFromRequest` para auth común
10. **CORS**: todos los endpoints exportan `onRequestOptions` que retorna los headers CORS

---

**Última actualización**: 2026-08-24
**Mantenido por**: Grupo 360 Soluciones
