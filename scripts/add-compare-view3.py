#!/usr/bin/env python3
"""Step 1: Add generateAutoJsonLd function before renderForm. Step 2: Update JS functions."""

filepath = '/home/z/my-project/admin-edit-business.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add generateAutoJsonLd function before renderForm
generate_fn = '''        // Generate auto JSON-LD for comparison preview
        function generateAutoJsonLd(b) {
            var isMedical = b.category_name && (b.category_name.toLowerCase().includes('m\u00e9dic') || b.category_name.toLowerCase().includes('medic'));
            var ld = {
                "@context": "https://schema.org",
                "@type": isMedical ? "MedicalBusiness" : "LocalBusiness",
                "name": b.title || 'Negocio',
                "url": "https://holax.com.ve/negocio/" + (b.slug || ''),
                "description": b.description ? b.description.substring(0, 160) : ''
            };
            if (b.category_name) ld.category = b.category_name;
            if (b.especialidad) ld.medicalSpecialty = b.especialidad;
            var wa = (b.whatsapp || b.phone || '').replace(/[^0-9]/g, '');
            if (wa) ld.telephone = '+' + wa;
            if (b.address) {
                ld.address = {
                    "@type": "PostalAddress",
                    "streetAddress": b.address,
                    "addressLocality": b.city || undefined,
                    "addressRegion": b.state || undefined,
                    "addressCountry": "VE"
                };
            }
            if (b.logo) ld.logo = b.logo;
            var sameAs = [];
            if (b.instagram) sameAs.push('https://www.instagram.com/' + b.instagram.replace(/^@/, ''));
            if (b.facebook) sameAs.push('https://www.facebook.com/' + b.facebook.replace(/^@/, ''));
            if (b.website) sameAs.push(b.website);
            if (sameAs.length) ld.sameAs = sameAs;
            if (b.schedule) ld.openingHours = b.schedule;
            return JSON.stringify(ld, null, 2);
        }

'''

# Insert before renderForm
content = content.replace(
    '        function renderForm(b) {',
    generate_fn + '        function renderForm(b) {'
)
print('Step 1: Added generateAutoJsonLd function')

# Step 2: Replace the updateSeoCount and updateJsonLdStatus functions with combined compare versions
old_seo_fn = '''        // ─── SEO Description counter + preview ──────────────────
        window.updateSeoCount = function() {
            var ta = document.getElementById('ebSeoDesc');
            var countEl = document.getElementById('ebSeoDescCount');
            var preview = document.getElementById('ebSeoDescPreview');
            var previewText = document.getElementById('ebSeoDescPreviewText');
            if (!ta) return;
            var len = ta.value.length;
            if (countEl) {
                countEl.textContent = len + '/160';
                countEl.style.color = len > 160 ? '#dc2626' : (len > 140 ? '#d97706' : '#6b7280');
            }
            if (preview && previewText) {
                preview.style.display = ta.value.trim() ? '' : 'none';
                previewText.textContent = ta.value || '';
            }
        };'''

new_seo_fn = '''        // ─── SEO Description comparison ──────────────────────
        window.updateSeoCompare = function() {
            var ta = document.getElementById('ebSeoDesc');
            var countEl = document.getElementById('ebSeoDescCount');
            var afterText = document.getElementById('ebSeoAfterText');
            if (!ta) return;
            var len = ta.value.length;
            if (countEl) {
                countEl.textContent = len + '/160';
                countEl.style.color = len > 160 ? '#dc2626' : (len > 140 ? '#d97706' : '#6b7280');
            }
            if (afterText) {
                afterText.textContent = ta.value || (currentBiz && currentBiz.description ? currentBiz.description.substring(0,160) : '');
            }
        };'''

if old_seo_fn in content:
    content = content.replace(old_seo_fn, new_seo_fn)
    print('Step 2a: Replaced updateSeoCount with updateSeoCompare')
else:
    print('Step 2a: WARNING - old updateSeoCount not found exactly')

old_jsonld_fn = '''        // ─── JSON-LD validation ─────────────────────────────────
        window.updateJsonLdStatus = function() {
            var ta = document.getElementById('ebCustomJsonLd');
            var statusEl = document.getElementById('ebJsonLdStatus');
            if (!ta || !statusEl) return;
            var val = ta.value.trim();
            if (!val) { statusEl.style.display = 'none'; return; }
            try {
                JSON.parse(val);
                statusEl.style.display = 'block';
                statusEl.style.background = '#f0fdf4';
                statusEl.style.color = '#059669';
                statusEl.style.border = '1px solid #bbf7d0';
                statusEl.innerHTML = '<i class="fas fa-check-circle"></i> JSON v\u00e1lido';
            } catch(e) {
                statusEl.style.display = 'block';
                statusEl.style.background = '#fef2f2';
                statusEl.style.color = '#dc2626';
                statusEl.style.border = '1px solid #fecaca';
                statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Error: ' + escH(e.message);
            }
        };'''

new_jsonld_fn = '''        // ─── JSON-LD comparison + validation ──────────────────
        window.updateJsonLdCompare = function() {
            var ta = document.getElementById('ebCustomJsonLd');
            var statusEl = document.getElementById('ebJsonLdStatus');
            var afterEl = document.getElementById('ebJsonLdAfter');
            if (!ta) return;
            var val = ta.value.trim();
            // Update after-panel
            if (afterEl) {
                afterEl.textContent = val || (currentBiz ? generateAutoJsonLd(currentBiz) : '');
            }
            // Validate
            if (!statusEl) return;
            if (!val) { statusEl.style.display = 'none'; return; }
            try {
                JSON.parse(val);
                statusEl.style.display = 'block';
                statusEl.style.background = '#f0fdf4';
                statusEl.style.color = '#059669';
                statusEl.style.border = '1px solid #bbf7d0';
                statusEl.innerHTML = '<i class="fas fa-check-circle"></i> JSON v\u00e1lido';
            } catch(e) {
                statusEl.style.display = 'block';
                statusEl.style.background = '#fef2f2';
                statusEl.style.color = '#dc2626';
                statusEl.style.border = '1px solid #fecaca';
                statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Error: ' + escH(e.message);
            }
        };'''

if old_jsonld_fn in content:
    content = content.replace(old_jsonld_fn, new_jsonld_fn)
    print('Step 2b: Replaced updateJsonLdStatus with updateJsonLdCompare')
else:
    print('Step 2b: WARNING - old updateJsonLdStatus not found exactly')

# Step 3: Update the init calls at the bottom of renderForm
content = content.replace(
    "if (typeof updateSeoCount === 'function') updateSeoCount();",
    "if (typeof updateSeoCompare === 'function') updateSeoCompare();"
)
content = content.replace(
    "if (typeof updateJsonLdStatus === 'function') updateJsonLdStatus();",
    "if (typeof updateJsonLdCompare === 'function') updateJsonLdCompare();"
)
print('Step 3: Updated init calls')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done!')
