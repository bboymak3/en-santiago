#!/usr/bin/env python3
"""Add side-by-side comparison view for SEO + JSON-LD in admin-edit-business.html"""

import re

filepath = '/home/z/my-project/admin-edit-business.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the SEO section and JSON-LD section to replace them
# We'll match from the SEO comment to just before the Save Button section

old_seo_jsonld = '''            /* ── SEO Meta Description ── */
            '<div class="eb-section">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">' +
                    '<h4 class="eb-section-title" style="margin:0;"><i class="fas fa-search" style="color:#059669;"></i> Meta Description SEO</h4>' +
                    '<div style="display:flex;gap:6px;align-items:center;">' +
                        '<span id="ebSeoDescCount" style="font-size:0.78rem;color:#6b7280;">0/160</span>' +
                        '<button type="button" class="eb-btn eb-btn-danger" onclick="document.getElementById(\'ebSeoDesc\').value=\'\';updateSeoCount();showToast(\'Meta description eliminada\',\'info\');"><i class="fas fa-trash"></i></button>' +
                    '</div>' +
                '</div>' +
                '<p style="font-size:0.82rem;color:#6b7280;margin:0 0 8px;">Texto que aparece en los resultados de Google. Si se deja vacío se genera automáticamente de la descripción del negocio. Max 160 caracteres.</p>' +
                '<textarea id="ebSeoDesc" class="eb-input" style="width:100%;min-height:80px;resize:vertical;font-size:0.9rem;padding:10px 14px;border:2px solid #e5e7eb;border-radius:10px;font-family:inherit;" placeholder="Ej: Tienda Pura Sangre - Ropa deportiva en Mérida. Envíos a todo Venezuela. Horario: Lun-Sáb 9am-6pm" maxlength="200" oninput="updateSeoCount()">' + escH(b.seo_description||'') + '</textarea>' +
                '<div id="ebSeoDescPreview" style="margin-top:8px;padding:10px 14px;background:#f0fdf4;border-radius:8px;border-left:3px solid #059669;font-size:0.85rem;color:#374151;display:none;">' +
                    '<div style="font-size:0.72rem;color:#6b7280;margin-bottom:2px;">Vista previa en Google:</div>' +
                    '<div style="color:#1a0dab;font-size:1.1rem;font-weight:500;">' + escH(b.title||'') + '</div>' +
                    '<div style="color:#006621;font-size:0.82rem;">holax.com.ve › negocio › ...</div>' +
                    '<div id="ebSeoDescPreviewText" style="color:#545454;font-size:0.88rem;">' + escH(b.seo_description || (b.description ? b.description.substring(0,160) : '')) + '</div>' +
                '</div>' +
            '</div>' +

            /* ── Rich Snippets (JSON-LD) ── */
            '<div class="eb-section">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">' +
                    '<h4 class="eb-section-title" style="margin:0;"><i class="fas fa-structured-data fa-puzzle-piece" style="color:#dc2626;"></i> Rich Snippets (JSON-LD)</h4>' +
                    '<div style="display:flex;gap:6px;">' +
                        '<button type="button" class="eb-btn" onclick="ebValidateJsonLd()"><i class="fas fa-check-circle"></i> Validar</button>' +
                        '<button type="button" class="eb-btn eb-btn-danger" onclick="if(confirm(\'Eliminar Rich Snippet personalizado? Se usará el automático.\')){document.getElementById(\'ebCustomJsonLd\').value=\'\';showToast(\'Rich Snippet eliminado, se usará el automático\',\'info\');}"><i class="fas fa-trash"></i> Resetear</button>' +
                    '</div>' +
                '</div>' +
                '<p style="font-size:0.82rem;color:#6b7280;margin:0 0 8px;">JSON-LD personalizado para rich snippets de Google. Si se deja vacío se genera automáticamente (LocalBusiness con datos del negocio). <a href="https://schema.org/LocalBusiness" target="_blank" style="color:#7c3aed;">Ver esquema LocalBusiness</a></p>' +
                '<textarea id="ebCustomJsonLd" class="eb-input eb-html-area" placeholder="{&#10;  \"@context\": \"https://schema.org\",&#10;  \"@type\": \"LocalBusiness\",&#10;  \"name\": \"Nombre del Negocio\",&#10;  \"description\": \"Descripción personalizada...\",&#10;  \"url\": \"https://holax.com.ve/...\",&#10;  \"telephone\": \"+584121234567\",&#10;  \"address\": {&#10;    \"@type\": \"PostalAddress\",&#10;    \"streetAddress\": \"Calle 10, entre 5 y 6\",&#10;    \"addressLocality\": \"Mérida\",&#10;    \"addressRegion\": \"Mérida\",&#10;    \"addressCountry\": \"VE\"&#10;  }&#10;}" oninput="updateJsonLdStatus()">' + escH(b.custom_jsonld||'') + '</textarea>' +
                '<div id="ebJsonLdStatus" style="margin-top:8px;font-size:0.82rem;display:none;padding:8px 12px;border-radius:8px;"></div>' +
            '</div>' +'''

new_seo_jsonld = '''            /* ── SEO Meta Description (comparativo) ── */
            '<div class="eb-section">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">' +
                    '<h4 class="eb-section-title" style="margin:0;"><i class="fas fa-search" style="color:#059669;"></i> Meta Description SEO</h4>' +
                    '<div style="display:flex;gap:6px;align-items:center;">' +
                        '<span id="ebSeoDescCount" style="font-size:0.78rem;color:#6b7280;">0/160</span>' +
                        '<button type="button" class="eb-btn eb-btn-danger" onclick="document.getElementById(\'ebSeoDesc\').value=\'\';updateSeoCompare();showToast(\'Meta description eliminada\',\'info\');"><i class="fas fa-trash"></i></button>' +
                    '</div>' +
                '</div>' +
                '<p style="font-size:0.82rem;color:#6b7280;margin:0 0 12px;">Texto que aparece en los resultados de Google. Si se deja vacio se genera automaticamente. Max 160 caracteres.</p>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
                    '<div>' +
                        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
                            '<span style="background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;">ACTUAL (AUTO)</span>' +
                            '<i class="fas fa-robot" style="color:#94a3b8;font-size:0.8rem;" title="Generado automaticamente"></i>' +
                        '</div>' +
                        '<div style="padding:12px 14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;">' +
                            '<div style="font-size:0.68rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Vista en Google</div>' +
                            '<div style="color:#1a0dab;font-size:1rem;font-weight:500;margin-bottom:2px;">' + escH(b.title||'Negocio') + ' - HolaX</div>' +
                            '<div style="color:#006621;font-size:0.78rem;margin-bottom:4px;">holax.com.ve › negocio › ' + escH(b.slug||'...') + '</div>' +
                            '<div style="color:#545454;font-size:0.84rem;line-height:1.4;">' + escH(b.description ? b.description.substring(0,160) : 'Sin descripcion') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div>' +
                        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
                            '<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;">DESPUES DE EDITAR</span>' +
                            '<i class="fas fa-pen" style="color:#059669;font-size:0.8rem;"></i>' +
                        '</div>' +
                        '<div id="ebSeoAfterBox" style="padding:12px 14px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;">' +
                            '<div style="font-size:0.68rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Vista en Google</div>' +
                            '<div style="color:#1a0dab;font-size:1rem;font-weight:500;margin-bottom:2px;">' + escH(b.title||'Negocio') + ' - HolaX</div>' +
                            '<div style="color:#006621;font-size:0.78rem;margin-bottom:4px;">holax.com.ve › negocio › ' + escH(b.slug||'...') + '</div>' +
                            '<div id="ebSeoAfterText" style="color:#545454;font-size:0.84rem;line-height:1.4;">' + escH(b.seo_description || (b.description ? b.description.substring(0,160) : 'Igual al actual')) + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<textarea id="ebSeoDesc" class="eb-input" style="width:100%;min-height:70px;resize:vertical;font-size:0.9rem;padding:10px 14px;border:2px solid #e5e7eb;border-radius:10px;font-family:inherit;margin-top:12px;" placeholder="Ej: Tienda Pura Sangre - Ropa deportiva. Envios a todo Venezuela. Lun-Sab 9am-6pm" maxlength="200" oninput="updateSeoCompare()">' + escH(b.seo_description||'') + '</textarea>' +
                '<p style="font-size:0.72rem;color:#94a3b8;margin:4px 0 0;">Escribe aqui la nueva meta description. La columna derecha se actualiza en tiempo real.</p>' +
            '</div>' +

            /* ── Rich Snippets JSON-LD (comparativo) ── */
            '<div class="eb-section">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">' +
                    '<h4 class="eb-section-title" style="margin:0;"><i class="fas fa-puzzle-piece" style="color:#dc2626;"></i> Rich Snippets (JSON-LD)</h4>' +
                    '<div style="display:flex;gap:6px;">' +
                        '<button type="button" class="eb-btn" onclick="ebValidateJsonLd()"><i class="fas fa-check-circle"></i> Validar</button>' +
                        '<button type="button" class="eb-btn eb-btn-danger" onclick="if(confirm(\'Eliminar Rich Snippet personalizado? Se usara el automatico.\')){document.getElementById(\'ebCustomJsonLd\').value=\'\';updateJsonLdCompare();showToast(\'Rich Snippet eliminado\',\'info\');}"><i class="fas fa-trash"></i> Resetear</button>' +
                    '</div>' +
                '</div>' +
                '<p style="font-size:0.82rem;color:#6b7280;margin:0 0 12px;">JSON-LD personalizado para rich snippets de Google. Si se deja vacio se genera automaticamente. <a href="https://schema.org/LocalBusiness" target="_blank" style="color:#7c3aed;">Ver esquema LocalBusiness</a></p>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
                    '<div>' +
                        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
                            '<span style="background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;">ACTUAL (AUTO)</span>' +
                            '<i class="fas fa-robot" style="color:#94a3b8;font-size:0.8rem;"></i>' +
                        '</div>' +
                        '<pre id="ebJsonLdAuto" style="margin:0;padding:12px 14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.78rem;color:#334155;white-space:pre-wrap;word-break:break-all;max-height:320px;overflow-y:auto;line-height:1.5;font-family:Monaco,Consolas,monospace;">' + escH(generateAutoJsonLd(b)) + '</pre>' +
                    '</div>' +
                    '<div>' +
                        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
                            '<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;">DESPUES DE EDITAR</span>' +
                            '<i class="fas fa-pen" style="color:#059669;font-size:0.8rem;"></i>' +
                        '</div>' +
                        '<pre id="ebJsonLdAfter" style="margin:0;padding:12px 14px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;font-size:0.78rem;color:#334155;white-space:pre-wrap;word-break:break-all;max-height:320px;overflow-y:auto;line-height:1.5;font-family:Monaco,Consolas,monospace;">' + escH(b.custom_jsonld || generateAutoJsonLd(b)) + '</pre>' +
                    '</div>' +
                '</div>' +
                '<textarea id="ebCustomJsonLd" class="eb-input eb-html-area" style="margin-top:12px;" placeholder="{ ... }" oninput="updateJsonLdCompare()">' + escH(b.custom_jsonld||'') + '</textarea>' +
                '<p style="font-size:0.72rem;color:#94a3b8;margin:4px 0 0;">Pega aqui el JSON-LD personalizado. La columna derecha se actualiza al escribir.</p>' +
                '<div id="ebJsonLdStatus" style="margin-top:8px;font-size:0.82rem;display:none;padding:8px 12px;border-radius:8px;"></div>' +
            '</div>' +'''

if old_seo_jsonld in content:
    content = content.replace(old_seo_jsonld, new_seo_jsonld)
    print('OK: replaced SEO + JSON-LD sections')
else:
    print('ERROR: old text not found')
    # Debug: find nearby text
    idx = content.find('SEO Meta Description')
    if idx >= 0:
        print(f'Found SEO Meta Description at index {idx}')
        print(repr(content[idx:idx+100]))
    else:
        print('SEO Meta Description not found at all')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
