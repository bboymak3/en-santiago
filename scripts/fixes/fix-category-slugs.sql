-- ──────────────────────────────────────────────────────────────────────────
-- FIX: Sincronizar slugs de categorias existentes con su nombre actual.
-- ──────────────────────────────────────────────────────────────────────────
-- PROBLEMA:
--   Cuando se renombraba una categoria via PUT /api/categories/[id],
--   el `slug` NO se regeneraba, dejando la fila inconsistente
--   (name nuevo, slug viejo). Esto rompia /categoria/:slug y los
--   enlaces de negocios que dependen de category_slug por JOIN.
--
--   Ejemplo real:
--     name = 'Tapizar IA'                (nombre nuevo)
--     slug = 'tapizados-de-volantes'     (slug viejo, NO coincide)
--
-- SOLUCION:
--   Recalcula el slug de TODAS las categorias activas a partir de su
--   `name` actual. En caso de colision, se le agrega un sufijo -1, -2, etc.
--
-- USO (Cloudflare D1):
--   wrangler d1 execute <TU_BINDING_D1> --remote --file=scripts/fixes/fix-category-slugs.sql
--
--   (reemplaza <TU_BINDING_D1> por el nombre real de tu binding D1,
--    definido en wrangler.toml bajo [[d1_databases]])
--
-- NOTAS:
--   - Idempotente: puede ejecutarse multiples veces sin danos.
--   - Solo actualiza filas donde el slug actual NO coincide con el
--     slug esperado.
--   - NO borra datos; solo actualiza la columna `slug`.
--   - Cada UPDATE hace UN solo REPLACE (mucho mas legible y robusto
--     que 19 REPLACEs anidados).
-- ──────────────────────────────────────────────────────────────────────────

-- 1) Crear tabla temporal con copia del nombre original.
CREATE TEMP TABLE IF NOT EXISTS _cat_slug_fix AS
SELECT id, name, slug AS current_slug, LOWER(name) AS expected_slug
FROM categories
WHERE is_active = 1;

-- 2) Normalizar acentos y ñ (cada UPDATE hace un REPLACE).
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'á', 'a');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'é', 'e');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'í', 'i');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'ó', 'o');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'ú', 'u');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'ñ', 'n');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'Á', 'a');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'É', 'e');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'Í', 'i');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'Ó', 'o');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'Ú', 'u');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'Ñ', 'n');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'ü', 'u');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, 'Ü', 'u');

-- 3) Espacios y caracteres especiales a guion o vacio.
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, ' ', '-');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '&', 'y');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '.', '');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, ',', '');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, ';', '');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, ':', '');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '(', '-');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, ')', '-');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '"', '');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '''', '');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '¡', '');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '¿', '');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '!', '');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '?', '');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '/', '-');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '@', '-at-');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '#', '');

-- 4) Limpiar dobles guiones y recortar a 80 caracteres.
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '--', '-');
UPDATE _cat_slug_fix SET expected_slug = REPLACE(expected_slug, '--', '-');
UPDATE _cat_slug_fix SET expected_slug = LTRIM(RTRIM(expected_slug, '-'), '-');
UPDATE _cat_slug_fix SET expected_slug = SUBSTR(expected_slug, 1, 80);

-- 5) Preview: cuantas filas necesitan actualizacion.
SELECT
  id,
  name,
  current_slug,
  expected_slug AS new_slug,
  CASE WHEN current_slug = expected_slug THEN 'OK'
       ELSE 'CAMBIA' END AS status
FROM _cat_slug_fix
ORDER BY name;

-- 6) Aplicar la actualizacion con manejo de colisiones (-1, -2, -3).
UPDATE categories
SET slug = CASE
  -- Caso 1: sin colision, usar el esperado tal cual
  WHEN NOT EXISTS (
    SELECT 1 FROM categories c2
    WHERE c2.slug = (SELECT expected_slug FROM _cat_slug_fix f WHERE f.id = categories.id)
      AND c2.id != categories.id
  )
  THEN (SELECT expected_slug FROM _cat_slug_fix f WHERE f.id = categories.id)

  -- Caso 2: colision 1, agregar sufijo -1
  WHEN NOT EXISTS (
    SELECT 1 FROM categories c3
    WHERE c3.slug = ((SELECT expected_slug FROM _cat_slug_fix f WHERE f.id = categories.id) || '-1')
      AND c3.id != categories.id
  )
  THEN ((SELECT expected_slug FROM _cat_slug_fix f WHERE f.id = categories.id) || '-1')

  -- Caso 3: colision 2, agregar sufijo -2
  WHEN NOT EXISTS (
    SELECT 1 FROM categories c4
    WHERE c4.slug = ((SELECT expected_slug FROM _cat_slug_fix f WHERE f.id = categories.id) || '-2')
      AND c4.id != categories.id
  )
  THEN ((SELECT expected_slug FROM _cat_slug_fix f WHERE f.id = categories.id) || '-2')

  -- Caso 4: colision 3, agregar sufijo -3
  WHEN NOT EXISTS (
    SELECT 1 FROM categories c5
    WHERE c5.slug = ((SELECT expected_slug FROM _cat_slug_fix f WHERE f.id = categories.id) || '-3')
      AND c5.id != categories.id
  )
  THEN ((SELECT expected_slug FROM _cat_slug_fix f WHERE f.id = categories.id) || '-3')

  -- Fallback: dejar el slug actual (no deberia llegar aqui casi nunca)
  ELSE categories.slug
END,
updated_at = datetime('now')
WHERE id IN (SELECT id FROM _cat_slug_fix WHERE current_slug != expected_slug)
  AND is_active = 1;

-- 7) Limpiar tabla temporal.
DROP TABLE _cat_slug_fix;

-- 8) Verificacion final.
SELECT id, name, slug, updated_at
FROM categories
WHERE is_active = 1
ORDER BY name;
