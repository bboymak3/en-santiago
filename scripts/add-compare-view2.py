#!/usr/bin/env python3
"""Replace SEO+JSON-LD sections with side-by-side comparison view using line indices."""

filepath = '/home/z/my-project/admin-edit-business.html'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line numbers for the sections we need to replace
start_line = None
end_line = None

for i, line in enumerate(lines):
    if 'SEO Meta Description' in line and start_line is None:
        start_line = i - 1  # include the comment line
    if start_line is not None and 'Save Button' in line and end_line is None:
        end_line = i - 3  # up to just before the save button comment
        break

print(f'Found SEO section at line {start_line+1}, ending before line {end_line+1}')

if start_line is None or end_line is None:
    print('ERROR: could not find section boundaries')
    exit(1)

# Build the replacement block - we insert it before renderForm is called
# We need to add generateAutoJsonLd function and update the JS functions

new_blocks = []
new_blocks.append("""            /* ── SEO Meta Description (comparativo) ── */
            '<div class="eb-section">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">' +
                    '<h4 class="eb-section-title" style="margin:0;"><i class="fas fa-search" style="color:#059669;"></i> Meta Description SEO</h4>' +
                    '<div style="display:flex;gap:6px;align-items:center;">' +
                        '<span id="ebSeoDescCount" style="font-size:0.78rem;color:#8B0000;">0/160</span>' +
                        '<button type="button" class="eb-btn eb-btn-danger" onclick="document.getElementById(\\'ebSeoDesc\\').value=\\'\\';updateSeoCompare();showToast(\\'Meta description eliminada\\',\\'info\\');"><i class="fas fa-trash"></i></button>' +
                    '</div>' +
                '</div>' +
                '<p style="font-size:0.82rem;color:#8B0000;margin:0 0 12px;">Texto que aparece en los resultados de Google. Si se deja vacio se genera automaticamente. Max 160 caracteres.</p>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
                    '<div>' +
                        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
                            '<span style="background:#8B0000;color:#8B0000;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;">ACTUAL (AUTO)</span>' +
                            '<i class="fas fa-robot" style="color:#8B0000;font-size:0.8rem;"></i>' +
                        '</div>' +
                        '<div style="padding:12px 14px;background:#8B0000;border:1.5px solid #8B0000;border-radius:10px;">' +
                            '<div style="font-size:0.68rem;color:#8B0000;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Vista en Google</div>' +
                            '<div style="color:#8B0000;font-size:1rem;font-weight:500;margin-bottom:2px;">' + escH(b.title||'Negocio') + ' - En-Santiago</div>' +
                            '<div style="color:#006621;font-size:0.78rem;margin-bottom:4px;">en-santiago.com \u203a negocio \u203a ' + escH(b.slug||'...') + '</div>' +
                            '<div style="color:#545454;font-size:0.84rem;line-height:1.4;">' + escH(b.description ? b.description.substring(0,160) : 'Sin descripcion') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div>' +
                        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
                            '<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;">DESPUES DE EDITAR</span>' +
                            '<i class="fas fa-pen" style="color:#059669;font-size:0.8rem;"></i>' +
                        '</div>' +
                        '<div id="ebSeoAfterBox" style="padding:12px 14px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;">' +
                            '<div style="font-size:0.68rem;color:#8B0000;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Vista en Google</div>' +
                            '<div style="color:#8B0000;font-size:1rem;font-weight:500;margin-bottom:2px;">' + escH(b.title||'Negocio') + ' - En-Santiago</div>' +
                            '<div style="color:#006621;font-size:0.78rem;margin-bottom:4px;">en-santiago.com \u203a negocio \u203a ' + escH(b.slug||'...') + '</div>' +
                            '<div id="ebSeoAfterText" style="color:#545454;font-size:0.84rem;line-height:1.4;">' + escH(b.seo_description || (b.description ? b.description.substring(0,160) : 'Igual al actual')) + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<textarea id="ebSeoDesc" class="eb-input" style="width:100%;min-height:70px;resize:vertical;font-size:0.9rem;padding:10px 14px;border:2px solid #8B0000;border-radius:10px;font-family:inherit;margin-top:12px;" placeholder="Ej: Tienda Pura Sangre - Ropa deportiva. Envios a todo Venezuela. Lun-Sab 9am-6pm" maxlength="200" oninput="updateSeoCompare()">' + escH(b.seo_description||'') + '</textarea>' +
                '<p style="font-size:0.72rem;color:#8B0000;margin:4px 0 0;">Escribe aqui la nueva meta description. La columna derecha se actualiza en tiempo real.</p>' +
            '</div>' +""")

new_blocks.append("""

            /* ── Rich Snippets JSON-LD (comparativo) ── */
            '<div class="eb-section">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">' +
                    '<h4 class="eb-section-title" style="margin:0;"><i class="fas fa-puzzle-piece" style="color:#dc2626;"></i> Rich Snippets (JSON-LD)</h4>' +
                    '<div style="display:flex;gap:6px;">' +
                        '<button type="button" class="eb-btn" onclick="ebValidateJsonLd()"><i class="fas fa-check-circle"></i> Validar</button>' +
                        '<button type="button" class="eb-btn eb-btn-danger" onclick="if(confirm(\\'Eliminar Rich Snippet personalizado? Se usara el automatico.\\')){document.getElementById(\\'ebCustomJsonLd\\').value=\\'\\';updateJsonLdCompare();showToast(\\'Rich Snippet eliminado\\',\\'info\\');}"><i class="fas fa-trash"></i> Resetear</button>' +
                    '</div>' +
                '</div>' +
                '<p style="font-size:0.82rem;color:#8B0000;margin:0 0 12px;">JSON-LD personalizado para rich snippets de Google. Si se deja vacio se genera automaticamente. <a href="https://schema.org/LocalBusiness" target="_blank" style="color:#8B0000;">Ver esquema LocalBusiness</a></p>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
                    '<div>' +
                        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
                            '<span style="background:#8B0000;color:#8B0000;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;">ACTUAL (AUTO)</span>' +
                            '<i class="fas fa-robot" style="color:#8B0000;font-size:0.8rem;"></i>' +
                        '</div>' +
                        '<pre id="ebJsonLdAuto" style="margin:0;padding:12px 14px;background:#8B0000;border:1.5px solid #8B0000;border-radius:10px;font-size:0.78rem;color:#334155;white-space:pre-wrap;word-break:break-all;max-height:320px;overflow-y:auto;line-height:1.5;font-family:Monaco,Consolas,monospace;">' + escH(generateAutoJsonLd(b)) + '</pre>' +
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
                '<p style="font-size:0.72rem;color:#8B0000;margin:4px 0 0;">Pega aqui el JSON-LD personalizado. La columna derecha se actualiza al escribir.</p>' +
                '<div id="ebJsonLdStatus" style="margin-top:8px;font-size:0.82rem;display:none;padding:8px 12px;border-radius:8px;"></div>' +
            '</div>' +""")

replacement = '\n'.join(new_blocks)

# Replace the lines
new_lines = lines[:start_line] + [replacement + '\n'] + lines[end_line+1:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'Replaced lines {start_line+1} to {end_line+1} with comparison view')
print(f'Old: {end_line - start_line + 1} lines -> New: 1 block')

