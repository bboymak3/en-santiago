// functions/api/migrate/tipos-negocio.js
// Migration: Create tipos_negocio table, add tipo_negocio_id to categories,
// backfill existing categories with their tipo, and update business.business_type
// Run once: GET /api/migrate/tipos-negocio

export async function onRequestGet(context) {
  try {
    const { env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB not available' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    // 1. Create tipos_negocio table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS tipos_negocio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        icon TEXT DEFAULT 'fas fa-briefcase',
        color TEXT DEFAULT '#607d8b',
        description TEXT,
        sort_order INTEGER DEFAULT 99,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    results.push('tabla tipos_negocio creada');

    // 2. Add tipo_negocio_id to categories (if not exists)
    try {
      await env.DB.prepare('ALTER TABLE categories ADD COLUMN tipo_negocio_id INTEGER REFERENCES tipos_negocio(id)').run();
      results.push('columna tipo_negocio_id agregada a categories');
    } catch (e) {
      results.push('columna tipo_negocio_id ya existe en categories');
    }

    // 3. Seed tipos_negocio with the main business type groups
    // These map to the existing category sort_order groupings
    const tipos = [
      { name: 'Salud y Bienestar', slug: 'salud-bienestar', icon: 'fas fa-heartbeat', color: '#e74c3c', description: 'Farmacias, clinicas, medicos, gimnasios y relacionados', sort_order: 1 },
      { name: 'Comida y Bebidas', slug: 'comida-bebidas', icon: 'fas fa-utensils', color: '#e91e63', description: 'Restaurantes, bares, cafeterias, panaderias y relacionados', sort_order: 2 },
      { name: 'Belleza y Cuidado Personal', slug: 'belleza-cuidado-personal', icon: 'fas fa-spa', color: '#9c27b0', description: 'Barberias, salones, joyerias, perfumerias y relacionados', sort_order: 3 },
      { name: 'Automotriz', slug: 'automotriz', icon: 'fas fa-car', color: '#ff9800', description: 'Talleres, repuestos, lavados, concesionarios y relacionados', sort_order: 4 },
      { name: 'Hogar y Construccion', slug: 'hogar-construccion', icon: 'fas fa-home', color: '#795548', description: 'Ferreterias, mueblerias, electricos, pinturas y relacionados', sort_order: 5 },
      { name: 'Servicios Profesionales', slug: 'servicios-profesionales', icon: 'fas fa-briefcase', color: '#2196f3', description: 'Inmobiliarias, juridicos, publicidad, fotografia y relacionados', sort_order: 6 },
      { name: 'Tiendas y Comercio', slug: 'tiendas-comercio', icon: 'fas fa-shopping-bag', color: '#4caf50', description: 'Ropas, zapaterias, tecnologia, celulares y relacionados', sort_order: 7 },
      { name: 'Educacion', slug: 'educacion', icon: 'fas fa-graduation-cap', color: '#3f51b5', description: 'Academias, colegios, librerias, universidades y relacionados', sort_order: 8 },
      { name: 'Turismo y Hospedaje', slug: 'turismo-hospedaje', icon: 'fas fa-plane', color: '#00bcd4', description: 'Hoteles, agencias de viaje, artesanias y relacionados', sort_order: 9 },
      { name: 'Servicios Varios', slug: 'servicios-varios', icon: 'fas fa-concierge-bell', color: '#607d8b', description: 'Encomiendas, domicilios, lavanderias, bicicletas y relacionados', sort_order: 10 },
    ];

    // Build a map of slug -> id for backfill
    const tipoMap = {};

    for (const tipo of tipos) {
      try {
        const r = await env.DB.prepare(
          'INSERT OR IGNORE INTO tipos_negocio (name, slug, icon, color, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(tipo.name, tipo.slug, tipo.icon, tipo.color, tipo.description, tipo.sort_order).run();
        // Fetch the id (whether inserted or already existed)
        const row = await env.DB.prepare('SELECT id FROM tipos_negocio WHERE slug = ?').bind(tipo.slug).first();
        if (row) tipoMap[tipo.slug] = row.id;
      } catch (e) {
        results.push('error insertando tipo ' + tipo.slug + ': ' + e.message);
      }
    }
    results.push('tipos_negocio sembrados: ' + Object.keys(tipoMap).length);

    // 4. Backfill: assign tipo_negocio_id to existing categories based on sort_order ranges
    // sort_order 1-8   -> salud-bienestar
    // sort_order 10-16 -> comida-bebidas
    // sort_order 20-22 -> belleza-cuidado-personal
    // sort_order 30-34 -> automotriz
    // sort_order 40-45 -> hogar-construccion
    // sort_order 50-56 -> servicios-profesionales
    // sort_order 57+   -> tiendas-comercio (celulares, tecnologia, etc.)
    // sort_order 60-63 -> educacion
    // sort_order 70-73 -> turismo-hospedaje
    // sort_order 80+   -> servicios-varios

    const backfillRules = [
      { min: 1, max: 8, tipo: 'salud-bienestar' },
      { min: 10, max: 16, tipo: 'comida-bebidas' },
      { min: 20, max: 22, tipo: 'belleza-cuidado-personal' },
      { min: 30, max: 34, tipo: 'automotriz' },
      { min: 40, max: 45, tipo: 'hogar-construccion' },
      { min: 50, max: 56, tipo: 'servicios-profesionales' },
      { min: 57, max: 59, tipo: 'tiendas-comercio' },
      { min: 60, max: 63, tipo: 'educacion' },
      { min: 70, max: 73, tipo: 'turismo-hospedaje' },
      { min: 80, max: 999, tipo: 'servicios-varios' },
    ];

    let backfillCount = 0;
    for (const rule of backfillRules) {
      const tipoId = tipoMap[rule.tipo];
      if (!tipoId) continue;
      const r = await env.DB.prepare(
        'UPDATE categories SET tipo_negocio_id = ? WHERE tipo_negocio_id IS NULL AND sort_order >= ? AND sort_order <= ? AND is_active = 1'
      ).bind(tipoId, rule.min, rule.max).run();
      backfillCount += r.meta.changes;
    }

    // Handle the special "Medicina Servicio Medico" (id 170, sort_order 99) -> salud-bienestar
    const medUpdate = await env.DB.prepare(
      'UPDATE categories SET tipo_negocio_id = ? WHERE id = 170 AND tipo_negocio_id IS NULL'
    ).bind(tipoMap['salud-bienestar']).run();
    backfillCount += medUpdate.meta.changes;

    // Handle "Restaurante" (id 169, sort_order 99) -> comida-bebidas
    const restUpdate = await env.DB.prepare(
      'UPDATE categories SET tipo_negocio_id = ? WHERE id = 169 AND tipo_negocio_id IS NULL'
    ).bind(tipoMap['comida-bebidas']).run();
    backfillCount += restUpdate.meta.changes;

    // Any remaining categories without tipo -> servicios-varios
    const fallbackUpdate = await env.DB.prepare(
      'UPDATE categories SET tipo_negocio_id = ? WHERE tipo_negocio_id IS NULL AND is_active = 1'
    ).bind(tipoMap['servicios-varios']).run();
    backfillCount += fallbackUpdate.meta.changes;

    results.push('categorias asignadas a tipos: ' + backfillCount);

    // 5. Remove CHECK constraint on business_type (only allows old values)
    // Strategy: get the original CREATE TABLE SQL from sqlite_master,
    // strip the CHECK clause with regex, then rename old table and create new one
    let constraintRemoved = false;
    try {
      // Clean up from a previous failed migration attempt
      try {
        await env.DB.prepare('DROP TABLE IF EXISTS _businesses_backup').run();
        await env.DB.prepare('DROP TABLE IF EXISTS businesses_new').run();
      } catch (cleanupErr) {
        // ignore
      }

      // Get the original CREATE TABLE SQL
      const sqlInfo = await env.DB.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='businesses'").first();
      if (!sqlInfo || !sqlInfo.sql) {
        throw new Error('No se encontro el schema de la tabla businesses');
      }

      const originalSQL = sqlInfo.sql;

      // Check if CHECK constraint exists
      if (!originalSQL.includes('CHECK')) {
        results.push('CHECK constraint no existe (ya fue eliminada previamente)');
        constraintRemoved = true;
      } else {
        results.push('CHECK constraint detectada, procediendo a eliminar...');
        results.push('SQL original tiene ' + originalSQL.length + ' caracteres');

        // Remove CHECK constraints from the SQL using regex
        // The CHECK has nested parens: CHECK(business_type IN ('a', 'b', ...))
        // Pattern: (?:[^()]|\([^()]*\))*  handles one level of nesting
        const checkPattern = /CHECK\s*\((?:[^()]|\([^()]*\))*\)/gi;

        // Remove table-level CHECK (preceded by comma, before closing paren)
        let newSQL = originalSQL.replace(/,\s*CHECK\s*\((?:[^()]|\([^()]*\))*\)/gi, '');
        // Remove inline CHECK (after column def, no comma before)
        newSQL = newSQL.replace(/\s+CHECK\s*\((?:[^()]|\([^()]*\))*\)/gi, '');

        // Verify the regex worked
        if (newSQL.includes('CHECK')) {
          results.push('ADVERTENCIA: no se pudo remover todo CHECK del SQL');
        }

        results.push('SQL modificado tiene ' + newSQL.length + ' caracteres');

        // Rename old table (SQLite updates FK refs in child tables automatically)
        await env.DB.prepare('ALTER TABLE businesses RENAME TO _businesses_backup').run();

        // Create new table with the CHECK-stripped SQL
        await env.DB.prepare(newSQL).run();

        // Copy all data using SELECT * (same column structure, just no CHECK)
        await env.DB.prepare('INSERT INTO businesses SELECT * FROM _businesses_backup').run();

        // Recreate indexes (safe to use IF NOT EXISTS)
        try { await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug_unique ON businesses(slug)').run(); } catch(e) {}
        try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug)').run(); } catch(e) {}
        try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id)').run(); } catch(e) {}
        try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status)').run(); } catch(e) {}
        try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id)').run(); } catch(e) {}

        // Try to drop backup table (may fail due to FK refs from child tables — that's OK)
        try {
          await env.DB.prepare('DROP TABLE _businesses_backup').run();
          results.push('CHECK constraint eliminada, backup eliminado');
        } catch (dropErr) {
          results.push('CHECK constraint eliminada (backup _businesses_backup conservado por FK)');
        }

        constraintRemoved = true;
      }
    } catch (e) {
      results.push('error eliminando CHECK constraint: ' + e.message);
      // Try to recover: rename backup back if the original table is gone
      try {
        const checkOriginal = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='businesses'").first();
        if (!checkOriginal) {
          await env.DB.prepare('ALTER TABLE _businesses_backup RENAME TO businesses').run();
          results.push('recuperacion exitosa: tabla original restaurada');
        }
      } catch (recoverErr) {
        results.push('error en recuperacion: ' + recoverErr.message);
      }
    }

    // 6. Backfill business.business_type from category -> tipo_negocio
    // Only run if the CHECK constraint was successfully removed (or didn't exist)
    if (constraintRemoved) {
      try {
        const updatedBiz = await env.DB.prepare(`
          UPDATE businesses
          SET business_type = (
            SELECT tn.slug
            FROM categories c
            JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
            WHERE c.id = businesses.category_id
          )
          WHERE business_type IN ('negocio', 'otro', NULL)
            AND category_id IN (SELECT id FROM categories WHERE tipo_negocio_id IS NOT NULL)
        `).run();
        results.push('businesses actualizados con tipo correcto: ' + updatedBiz.meta.changes);
      } catch (e) {
        results.push('error actualizando business_type: ' + e.message);
      }
    } else {
      results.push('paso 6 omitido: CHECK constraint aun existe, ejecuta la migracion de nuevo');
    }

    // 7. Verify results
    const verify = await env.DB.prepare(`
      SELECT tn.name as tipo_nombre, tn.slug as tipo_slug, COUNT(c.id) as cat_count
      FROM tipos_negocio tn
      LEFT JOIN categories c ON c.tipo_negocio_id = tn.id AND c.is_active = 1
      GROUP BY tn.id
      ORDER BY tn.sort_order
    `).all();

    return new Response(JSON.stringify({
      message: 'Migracion tipos_negocio completada',
      status: 'ok',
      steps: results,
      summary: verify.results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message, status: 'error', stack: error.stack
    }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}