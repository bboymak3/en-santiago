/**
 * Un Click - Seller Panel Module
 * IIFE injected into dashboard.html for seller users
 * Adds: 4 publish buttons (NO business required), seller profile with avatar upload
 */
(function () {
    'use strict';

    // Don't run if not a seller
    const token = localStorage.getItem('meridaunclick_token');
    if (!token) return;

    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.role !== 'seller') return;
    } catch (e) { return; }

    let sellerProfile = null;

    // ─── Modify Dashboard for Seller ───────────────────────────
    function initSellerPanel() {
        modifySidebar();
        modifyHeaderButtons();
        modifyProductModal();
        modifyLoadMyProducts();
        modifyProfileSection();
        loadSellerProfile();
    }

    // ─── Sidebar: Rename profile link ──────────────────────────
    function modifySidebar() {
        const nav = document.querySelector('.sidebar-nav');
        if (!nav) return;
        const existingProfile = nav.querySelector('[data-section="profile"]');
        if (existingProfile) {
            existingProfile.innerHTML = '<i class="fas fa-store"></i> Mi Perfil Vendedor';
        }
    }

    // ─── Header: 4 publish buttons ─────────────────────────────
    function modifyHeaderButtons() {
        const headerActions = document.querySelector('.dashboard-header-actions');
        if (!headerActions) return;

        headerActions.innerHTML = `
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <button class="btn btn-sm" onclick="window.sellerPanel.openProductModal()" style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;font-weight:700;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.82rem;box-shadow:0 3px 10px rgba(217,119,6,0.3);">
                    <i class="fas fa-box"></i> Publicar Producto
                </button>
                <a href="new-business.html" class="btn btn-sm" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:700;border:none;padding:8px 14px;border-radius:8px;text-decoration:none;font-size:0.82rem;box-shadow:0 3px 10px rgba(5,150,105,0.3);">
                    <i class="fas fa-building"></i> Publicar Negocio
                </a>
                <button class="btn btn-sm" onclick="window.sellerPanel.openJobForm()" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;font-weight:700;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.82rem;box-shadow:0 3px 10px rgba(124,58,237,0.3);">
                    <i class="fas fa-briefcase"></i> Publicar Empleo
                </button>
                <a href="new-property.html" class="btn btn-sm" style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;font-weight:700;border:none;padding:8px 14px;border-radius:8px;text-decoration:none;font-size:0.82rem;box-shadow:0 3px 10px rgba(37,99,235,0.3);">
                    <i class="fas fa-home"></i> Publicar Propiedad
                </a>
            </div>
        `;
    }

    // ─── Modify Product Modal: remove business requirement ─────
    function modifyProductModal() {
        // Wait a bit for DOM to be ready
        setTimeout(() => {
            // Hide the business selector section entirely for sellers
            const bizSection = document.querySelector('#productForm .profile-form-section:first-child');
            if (bizSection && bizSection.querySelector('#prodBusiness')) {
                bizSection.style.display = 'none';
            }

            // Override the save handler to not require business_id
            const modal = document.getElementById('productModal');
            if (!modal) return;

            const saveBtn = document.getElementById('productModalSave');
            if (!saveBtn) return;

            // Clone to remove old listeners
            const newBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newBtn, saveBtn);

            newBtn.addEventListener('click', async () => {
                const form = document.getElementById('productForm');
                if (!form) return;
                if (!form.checkValidity()) { form.reportValidity(); return; }

                const nameField = form.querySelector('[name="name"]');
                const priceField = form.querySelector('[name="price"]');

                if (!nameField || !nameField.value.trim()) {
                    showToast('El nombre del producto es requerido', 'error');
                    return;
                }

                newBtn.disabled = true;
                newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';

                try {
                    const body = {
                        name: nameField.value.trim(),
                        price: parseFloat(priceField?.value) || 0,
                        category: form.querySelector('[name="category"]')?.value || 'general',
                        image: form.querySelector('[name="image"]')?.value || '',
                        description: form.querySelector('[name="description"]')?.value || '',
                        video_url: form.querySelector('[name="video_url"]')?.value || '',
                    };

                    // If a business is selected, include it (optional)
                    const bizSelect = document.getElementById('prodBusiness');
                    if (bizSelect && bizSelect.value) {
                        body.business_id = parseInt(bizSelect.value);
                    }

                    await api.post('/marketplace', body);
                    showToast('Producto publicado exitosamente', 'success');
                    modal.classList.add('hidden');
                    form.reset();

                    // Reload products
                    const container = document.getElementById('myProductsByStore');
                    if (container) loadSellerProducts(container);

                    // Update overview
                    if (window.loadOverviewData) window.loadOverviewData();
                } catch (err) {
                    showToast(err.message || 'Error al publicar producto', 'error');
                } finally {
                    newBtn.disabled = false;
                    newBtn.innerHTML = '<i class="fas fa-save"></i> Publicar';
                }
            });
        }, 500);
    }

    // ─── Override loadMyProducts for sellers (no business required) ──
    function modifyLoadMyProducts() {
        // Override the function so when seller clicks "Mis Productos" it uses our version
        const origSwitch = window.switchSection;
        if (origSwitch) {
            // We'll just hook into the products section load
            const observer = new MutationObserver(() => {
                const container = document.getElementById('myProductsByStore');
                if (container && container.querySelector('.fa-spinner')) {
                    // It's loading, override it
                    loadSellerProducts(container);
                }
            });
            setTimeout(() => {
                const container = document.getElementById('myProductsByStore');
                if (container) {
                    observer.observe(container, { childList: true });
                }
            }, 1000);
        }
    }

    // ─── Load Seller Products (by user_id, no business filter) ──
    async function loadSellerProducts(container) {
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#f59e0b;"></i><p style="margin-top:8px;">Cargando productos...</p></div>';

        try {
            const cachedUser = getCachedUser();
            const userId = cachedUser?.id;
            if (!userId) throw new Error('No se encontró el usuario');

            const data = await api.get(`/marketplace?user_id=${userId}&all=true&limit=100`);
            const products = data.products || [];

            if (products.length === 0) {
                container.innerHTML = `
                    <div class="dash-card">
                        <div style="text-align:center;padding:32px 0;color:#94a3b8;">
                            <i class="fas fa-box-open" style="font-size:2.5rem;color:#cbd5e1;"></i>
                            <p style="margin-top:12px;">No tienes productos publicados.</p>
                            <button class="btn btn-primary btn-sm" onclick="window.sellerPanel.openProductModal()" style="display:inline-block;margin-top:12px;"><i class="fas fa-plus"></i> Publicar Producto</button>
                        </div>
                    </div>`;
                return;
            }

            let html = `
                <div class="dash-card">
                    <div class="dash-card-header">
                        <h3><i class="fas fa-box" style="color:#d97706;"></i> Mis Productos</h3>
                        <span style="font-size:0.75rem;color:#94a3b8;background:#f1f5f9;padding:4px 10px;border-radius:12px;">${products.length} producto${products.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="dash-table-responsive">
                        <table class="dash-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Categoría</th>
                                    <th>Precio</th>
                                    <th>Estatus</th>
                                    <th>Fecha</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>`;

            products.forEach(p => {
                const statusLabel = p.status === 'approved' ? '<span class="status-badge status-approved">Activo</span>' : p.status === 'pending' ? '<span class="status-badge status-pending">Pendiente</span>' : p.status === 'rejected' ? '<span class="status-badge status-rejected">Rechazado</span>' : '<span class="status-badge">' + (p.status || '-') + '</span>';
                const bizLabel = p.business_name ? `<div style="font-size:0.72rem;color:#94a3b8;margin-top:2px;"><i class="fas fa-store"></i> ${p.business_name}</div>` : '';
                html += `
                    <tr>
                        <td><div class="dash-prop-name">${p.image ? `<img src="${p.image}" class="dash-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image dash-thumb-placeholder"></i>'}<div><span>${p.name || 'Sin nombre'}</span>${bizLabel}</div></div></td>
                        <td>${p.category || 'General'}</td>
                        <td class="dash-price">$${Number(p.price || 0).toLocaleString('es-VE')}</td>
                        <td>${statusLabel}</td>
                        <td style="font-size:0.8rem;color:#94a3b8;">${formatDateShort(p.created_at)}</td>
                        <td class="dash-actions">
                            <button class="btn-icon btn-icon-danger" onclick="deleteProduct(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
            });

            html += `</tbody></table></div></div>`;
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading seller products:', error);
            container.innerHTML = `
                <div class="dash-card">
                    <div style="text-align:center;padding:32px 0;color:#ef4444;">
                        <i class="fas fa-exclamation-circle" style="font-size:2.5rem;"></i>
                        <p style="margin-top:12px;">Error al cargar productos.</p>
                    </div>
                </div>`;
        }
    }

    // ─── Open Product Modal (seller version) ───────────────────
    function openProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.classList.remove('hidden');
            // Load business options (optional, for association)
            loadBusinessOptionsForSeller();
        }
    }

    // ─── Load business options for the select (optional association) ──
    async function loadBusinessOptionsForSeller() {
        const select = document.getElementById('prodBusiness');
        if (!select) return;

        try {
            // Show the section since seller might want to associate
            const bizSection = select.closest('.profile-form-section');
            if (bizSection) {
                bizSection.style.display = 'block';
                const title = bizSection.querySelector('.profile-form-section-title span');
                if (title) title.textContent = 'Asociar a Negocio (opcional)';
                const hint = bizSection.querySelector('.profile-input-hint');
                if (hint) hint.textContent = 'Opcional: puedes asociar el producto a un negocio existente. Si no seleccionas ninguno, se publicará como vendedor independiente.';
            }

            // Load ALL approved businesses so seller can pick any
            const data = await api.get('/businesses?status=approved&limit=100');
            const businesses = data.businesses || [];

            // Keep current selection
            const currentVal = select.value;
            select.innerHTML = '<option value="">Publicar como vendedor independiente</option>';

            // Group by owner first, then others
            const cachedUser = getCachedUser();
            const myBiz = businesses.filter(b => String(b.user_id) === String(cachedUser?.id));
            const otherBiz = businesses.filter(b => String(b.user_id) !== String(cachedUser?.id));

            if (myBiz.length > 0) {
                const optGroup = document.createElement('optgroup');
                optGroup.label = 'Mis Negocios';
                myBiz.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.id;
                    opt.textContent = b.title;
                    optGroup.appendChild(opt);
                });
                select.appendChild(optGroup);
            }

            if (otherBiz.length > 0) {
                const optGroup = document.createElement('optgroup');
                optGroup.label = 'Otros Negocios';
                otherBiz.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.id;
                    opt.textContent = b.title;
                    optGroup.appendChild(opt);
                });
                select.appendChild(optGroup);
            }

            if (currentVal) select.value = currentVal;
        } catch (e) {
            console.warn('Could not load business options:', e);
        }
    }

    // ─── Profile Section: Add avatar upload and seller fields ──
    function modifyProfileSection() {
        const profileSection = document.getElementById('sectionProfile');
        if (!profileSection) return;

        const profileForm = document.getElementById('profileForm');
        if (!profileForm) return;

        // Add avatar upload before the form
        const formCard = profileForm.closest('.profile-form-card');
        if (formCard) {
            const avatarUploadHTML = `
                <div class="seller-avatar-upload-section" style="margin-bottom:20px;padding:20px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px dashed #a7f3d0;border-radius:16px;text-align:center;">
                    <h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#065f46;font-weight:700;">
                        <i class="fas fa-camera"></i> Foto de Perfil del Vendedor
                    </h4>
                    <p style="margin:0 0 16px 0;font-size:0.82rem;color:#047857;">Esta foto se mostrará en tu perfil público de vendedor</p>
                    <div id="sellerAvatarPreview" style="width:100px;height:100px;border-radius:50%;border:3px solid #a7f3d0;margin:0 auto 12px auto;overflow:hidden;background:#e2e8f0;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-user" style="font-size:36px;color:#94a3b8;"></i>
                    </div>
                    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                        <label for="sellerAvatarInput" class="btn btn-sm" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;">
                            <i class="fas fa-camera"></i> Subir Foto
                        </label>
                        <input type="file" id="sellerAvatarInput" accept="image/*" style="display:none;">
                        <input type="url" id="sellerAvatarUrl" class="form-control" placeholder="O pega URL de imagen" style="flex:1;min-width:180px;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:0.82rem;max-width:280px;">
                    </div>
                    <div id="sellerAvatarProgress" style="display:none;margin-top:8px;color:#059669;font-size:0.82rem;">
                        <i class="fas fa-spinner fa-spin"></i> Subiendo foto...
                    </div>
                </div>
            `;

            const cardHeader = formCard.querySelector('.profile-form-card-header');
            if (cardHeader && cardHeader.nextSibling) {
                cardHeader.insertAdjacentHTML('afterend', avatarUploadHTML);
            } else {
                formCard.insertAdjacentHTML('afterbegin', avatarUploadHTML);
            }

            setupAvatarHandlers();
        }

        // Add store name and social media fields
        const bioSection = profileForm.querySelector('.profile-form-section:nth-child(3)');
        if (bioSection) {
            const sellerFieldsHTML = `
                <div class="profile-form-section" id="sellerStoreSection" style="display:none;">
                    <div class="profile-form-section-title">
                        <i class="fas fa-store"></i>
                        <span>Información de la Tienda</span>
                    </div>
                    <div class="profile-input-group">
                        <label for="sellerStoreName">Nombre de la Tienda</label>
                        <div class="profile-input-wrapper">
                            <i class="fas fa-store"></i>
                            <input type="text" id="sellerStoreName" name="store_name" placeholder="Ej: Tienda de Juan">
                        </div>
                    </div>
                    <div class="profile-input-group">
                        <label for="sellerStoreDesc">Descripción de la Tienda</label>
                        <div class="profile-textarea-wrapper">
                            <textarea id="sellerStoreDesc" name="store_description" rows="3" placeholder="Describe tu tienda y lo que ofreces..." maxlength="500"></textarea>
                        </div>
                    </div>
                </div>
                <div class="profile-form-section" id="sellerSocialSection" style="display:none;">
                    <div class="profile-form-section-title">
                        <i class="fas fa-share-alt"></i>
                        <span>Redes Sociales</span>
                    </div>
                    <div class="form-row">
                        <div class="profile-input-group">
                            <label for="sellerInstagram"><i class="fab fa-instagram" style="color:#E1306C"></i> Instagram</label>
                            <div class="profile-input-wrapper">
                                <i class="fab fa-instagram"></i>
                                <input type="text" id="sellerInstagram" name="instagram" placeholder="@tu_usuario">
                            </div>
                        </div>
                        <div class="profile-input-group">
                            <label for="sellerFacebook"><i class="fab fa-facebook" style="color:#1877F2"></i> Facebook</label>
                            <div class="profile-input-wrapper">
                                <i class="fab fa-facebook"></i>
                                <input type="text" id="sellerFacebook" name="facebook" placeholder="facebook.com/tu_pagina">
                            </div>
                        </div>
                    </div>
                    <div class="profile-input-group">
                        <label for="sellerTiktok"><i class="fab fa-tiktok" style="color:#000"></i> TikTok</label>
                        <div class="profile-input-wrapper">
                            <i class="fab fa-tiktok"></i>
                            <input type="text" id="sellerTiktok" name="tiktok" placeholder="@tu_usuario_tiktok">
                        </div>
                    </div>
                </div>
            `;
            bioSection.insertAdjacentHTML('afterend', sellerFieldsHTML);
        }

        modifyProfileSaveHandler();
    }

    // ─── Avatar Handlers ───────────────────────────────────────
    function setupAvatarHandlers() {
        const fileInput = document.getElementById('sellerAvatarInput');
        const urlInput = document.getElementById('sellerAvatarUrl');
        const preview = document.getElementById('sellerAvatarPreview');

        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const progress = document.getElementById('sellerAvatarProgress');
                if (progress) progress.style.display = 'block';

                try {
                    const formData = new FormData();
                    formData.append('avatar', file);
                    const resp = await fetch('/api/upload-avatar', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('meridaunclick_token')}` },
                        body: formData,
                    });
                    const data = await resp.json();
                    if (data.url) {
                        if (preview) preview.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:cover;">`;
                        if (urlInput) urlInput.value = data.url;
                        const sidebarAvatar = document.getElementById('userAvatar');
                        if (sidebarAvatar) sidebarAvatar.innerHTML = `<img src="${data.url}" alt="Avatar">`;
                        showToast('Foto de perfil actualizada', 'success');
                    } else {
                        showToast(data.error || 'Error al subir foto', 'error');
                    }
                } catch (err) {
                    showToast('Error al subir foto', 'error');
                } finally {
                    if (progress) progress.style.display = 'none';
                }
            });
        }

        if (urlInput) {
            urlInput.addEventListener('change', () => {
                const url = urlInput.value.trim();
                if (!url) return;
                if (preview) preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
            });
        }
    }

    // ─── Modify Profile Save Handler ───────────────────────────
    function modifyProfileSaveHandler() {
        const profileForm = document.getElementById('profileForm');
        if (!profileForm) return;

        const newForm = profileForm.cloneNode(true);
        profileForm.parentNode.replaceChild(newForm, profileForm);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('profileSaveBtn');
            if (saveBtn) {
                saveBtn.classList.add('saving');
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            }

            try {
                const formData = new FormData(newForm);
                const data = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    whatsapp: formData.get('whatsapp'),
                    bio: formData.get('bio'),
                };

                await api.put('/users/me', data);

                // Save seller profile
                const avatarUrl = document.getElementById('sellerAvatarUrl')?.value?.trim();
                const storeName = document.getElementById('sellerStoreName')?.value?.trim();
                const storeDesc = document.getElementById('sellerStoreDesc')?.value?.trim();
                const instagram = document.getElementById('sellerInstagram')?.value?.trim();
                const facebook = document.getElementById('sellerFacebook')?.value?.trim();
                const tiktok = document.getElementById('sellerTiktok')?.value?.trim();

                const profileData = {};
                if (storeName) profileData.store_name = storeName;
                if (storeDesc) profileData.description = storeDesc;
                if (avatarUrl) profileData.avatar = avatarUrl;
                if (instagram) profileData.instagram = instagram;
                if (facebook) profileData.facebook = facebook;
                if (tiktok) profileData.tiktok = tiktok;

                if (Object.keys(profileData).length > 0) {
                    try { await api.put('/seller-profile', profileData); } catch (err) { console.warn(err); }
                }

                showToast('Perfil de vendedor actualizado exitosamente', 'success');
                const cached = getCachedUser();
                if (cached) {
                    Object.assign(cached, data);
                    if (avatarUrl) cached.avatar = avatarUrl;
                    setCachedUser(cached);
                }
            } catch (error) {
                showToast(error.message || 'Error al actualizar perfil', 'error');
            } finally {
                if (saveBtn) {
                    saveBtn.classList.remove('saving');
                    saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> Guardar Cambios';
                }
            }
        });
    }

    // ─── Load Seller Profile ───────────────────────────────────
    async function loadSellerProfile() {
        try {
            const data = await api.get('/seller-profile');
            sellerProfile = data.profile || {};

            const storeSection = document.getElementById('sellerStoreSection');
            const socialSection = document.getElementById('sellerSocialSection');
            if (storeSection) storeSection.style.display = 'block';
            if (socialSection) socialSection.style.display = 'block';

            if (sellerProfile.store_name) { const f = document.getElementById('sellerStoreName'); if (f) f.value = sellerProfile.store_name; }
            if (sellerProfile.description) { const f = document.getElementById('sellerStoreDesc'); if (f) f.value = sellerProfile.description; }
            if (sellerProfile.instagram) { const f = document.getElementById('sellerInstagram'); if (f) f.value = sellerProfile.instagram; }
            if (sellerProfile.facebook) { const f = document.getElementById('sellerFacebook'); if (f) f.value = sellerProfile.facebook; }
            if (sellerProfile.tiktok) { const f = document.getElementById('sellerTiktok'); if (f) f.value = sellerProfile.tiktok; }

            const avatar = sellerProfile.avatar || data.user?.avatar;
            if (avatar) {
                const preview = document.getElementById('sellerAvatarPreview');
                if (preview) preview.innerHTML = `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">`;
                const urlInput = document.getElementById('sellerAvatarUrl');
                if (urlInput) urlInput.value = avatar;
            }
        } catch (err) {
            try { await api.post('/seller-profile'); } catch (e2) {}
        }
    }

    // ─── Job Form (NO business required) ───────────────────────
    function openJobForm() {
        const existing = document.getElementById('sellerJobModal');
        if (existing) { existing.classList.remove('hidden'); return; }

        const cachedUser = getCachedUser();
        const userName = cachedUser?.name || '';

        const modal = document.createElement('div');
        modal.id = 'sellerJobModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';
        modal.innerHTML = `
            <div style="background:#fff;border-radius:16px;width:90%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
                    <h3 style="margin:0;font-size:1.1rem;color:#1e293b;"><i class="fas fa-briefcase" style="color:#7c3aed;"></i> Publicar Empleo</h3>
                    <button onclick="document.getElementById('sellerJobModal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#94a3b8;">&times;</button>
                </div>
                <div style="padding:24px;">
                    <form id="sellerJobForm">
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Título del Empleo *</label>
                            <input type="text" id="sellerJobTitle" required placeholder="Ej: Vendedor de tienda" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Nombre de la Empresa / Vendedor</label>
                            <input type="text" id="sellerJobCompany" value="${userName.replace(/"/g, '&quot;')}" placeholder="Tu nombre o empresa" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            <small style="font-size:0.75rem;color:#94a3b8;">No necesitas tener un negocio registrado. Usa tu nombre o el de tu empresa.</small>
                        </div>
                        <div style="display:flex;gap:12px;margin-bottom:16px;">
                            <div style="flex:1;">
                                <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Tipo de Empleo</label>
                                <select id="sellerJobType" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                                    <option value="tiempo_completo">Tiempo Completo</option>
                                    <option value="medio_tiempo">Medio Tiempo</option>
                                    <option value="freelance">Freelance</option>
                                    <option value="contrato">Por Contrato</option>
                                    <option value="remoto">Remoto</option>
                                    <option value="pasantia">Pasantía</option>
                                </select>
                            </div>
                            <div style="flex:1;">
                                <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Salario</label>
                                <input type="text" id="sellerJobSalary" placeholder="Ej: $500 - $800" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            </div>
                        </div>
                        <div style="display:flex;gap:12px;margin-bottom:16px;">
                            <div style="flex:1;">
                                <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Estado</label>
                                <input type="text" id="sellerJobState" value="Mérida" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div style="flex:1;">
                                <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Ciudad</label>
                                <input type="text" id="sellerJobCity" value="Mérida" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            </div>
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Descripción del Empleo</label>
                            <textarea id="sellerJobDesc" rows="4" placeholder="Describe el puesto, responsabilidades..." style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;resize:vertical;"></textarea>
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Requisitos</label>
                            <textarea id="sellerJobReqs" rows="2" placeholder="Requisitos mínimos..." style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;resize:vertical;"></textarea>
                        </div>
                        <div style="display:flex;gap:12px;margin-bottom:16px;">
                            <div style="flex:1;">
                                <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Email de Contacto</label>
                                <input type="email" id="sellerJobEmail" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div style="flex:1;">
                                <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Teléfono / WhatsApp</label>
                                <input type="tel" id="sellerJobPhone" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            </div>
                        </div>
                        <div style="display:flex;gap:12px;justify-content:flex-end;">
                            <button type="button" onclick="document.getElementById('sellerJobModal').remove()" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:0.9rem;font-weight:600;color:#64748b;">Cancelar</button>
                            <button type="submit" style="padding:10px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;cursor:pointer;font-size:0.9rem;font-weight:700;box-shadow:0 3px 10px rgba(124,58,237,0.3);">
                                <i class="fas fa-paper-plane"></i> Publicar Empleo
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#sellerJobForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = modal.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';

            try {
                const resp = await api.post('/jobs', {
                    title: document.getElementById('sellerJobTitle').value.trim(),
                    company_name: document.getElementById('sellerJobCompany').value.trim(),
                    job_type: document.getElementById('sellerJobType').value,
                    salary: document.getElementById('sellerJobSalary').value.trim(),
                    state: document.getElementById('sellerJobState').value.trim(),
                    city: document.getElementById('sellerJobCity').value.trim(),
                    description: document.getElementById('sellerJobDesc').value.trim(),
                    requirements: document.getElementById('sellerJobReqs').value.trim(),
                    contact_email: document.getElementById('sellerJobEmail').value.trim(),
                    contact_phone: document.getElementById('sellerJobPhone').value.trim(),
                });
                const msg = resp.message || 'Empleo publicado exitosamente';
                showToast(msg, 'success');
                modal.remove();
            } catch (err) {
                showToast(err.message || 'Error al publicar empleo', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Empleo';
            }
        });
    }

    // ─── Helpers ───────────────────────────────────────────────
    function getCachedUser() {
        try { const u = localStorage.getItem('meridaunclick_user'); return u ? JSON.parse(u) : null; } catch (e) { return null; }
    }
    function setCachedUser(user) {
        try { localStorage.setItem('meridaunclick_user', JSON.stringify(user)); } catch (e) {}
    }
    function showToast(msg, type) {
        if (window.showToast) { window.showToast(msg, type); return; }
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;top:20px;right:20px;z-index:99999;padding:12px 20px;border-radius:10px;color:#fff;font-size:0.85rem;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2);background:${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#2563eb'};transition:opacity 0.3s;`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
    }
    function formatDateShort(dateStr) {
        if (!dateStr) return '—';
        try { return new Date(dateStr).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }); } catch (e) { return dateStr; }
    }

    // Expose
    window.sellerPanel = { openJobForm, openProductModal, loadSellerProducts };

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSellerPanel);
    } else {
        initSellerPanel();
    }
})();