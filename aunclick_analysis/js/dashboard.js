/**
 * Un Click - Dashboard Module
 * Handles user dashboard and admin panel functionality
 */

(function () {
    'use strict';

    // ─── State ──────────────────────────────────────────────────
    let currentUser = null;
    let userProperties = [];
    let pendingProperties = []; // For admin view
    let deleteTargetId = null;

    // ─── DOM Elements ───────────────────────────────────────────
    const sidebar = document.getElementById('dashboardSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sectionTitle = document.getElementById('sectionTitle');
    const sidebarLinks = document.querySelectorAll('.sidebar-link[data-section]');

    // Dashboard stats
    const dashTotalProps = document.getElementById('dashTotalProps');
    const dashPublishedProps = document.getElementById('dashPublishedProps');
    const dashPendingProps = document.getElementById('dashPendingProps');
    const dashTotalViews = document.getElementById('dashTotalViews');

    // User info
    const dashUserName = document.getElementById('dashUserName');
    const dashUserEmail = document.getElementById('dashUserEmail');
    const userAvatar = document.getElementById('userAvatar');

    // Tables
    const recentPropsBody = document.getElementById('recentPropsBody');
    const allPropsBody = document.getElementById('allPropsBody');
    const dashPropFilter = document.getElementById('dashPropFilter');

    // Messages
    const messagesList = document.getElementById('messagesList');
    const msgBadge = document.getElementById('msgBadge');

    // Favorites
    const favoritesGrid = document.getElementById('favoritesGrid');

    // Profile
    const profileForm = document.getElementById('profileForm');

    // Delete modal
    const deleteModal = document.getElementById('deleteModal');
    const deleteModalClose = document.getElementById('deleteModalClose');
    const deleteModalCancel = document.getElementById('deleteModalCancel');
    const deleteModalConfirm = document.getElementById('deleteModalConfirm');

    // Admin section
    const adminSection = document.getElementById('sectionAdmin');
    const adminPendingBody = document.getElementById('adminPendingBody');
    const adminAllPropsBody = document.getElementById('adminAllPropsBody');
    const adminTabPending = document.getElementById('adminTabPending');
    const adminTabAll = document.getElementById('adminTabAll');
    const adminTabUsers = document.getElementById('adminTabUsers');
    const adminUsersBody = document.getElementById('adminUsersBody');
    const adminUsersSearchInput = document.getElementById('adminUsersSearchInput');

    // ─── Initialize ─────────────────────────────────────────────
    async function initDashboard() {
        if (!requireAuth()) return;

        // Load current user
        currentUser = await getCurrentUser();
        if (!currentUser) {
            removeToken();
            window.location.href = 'login.html';
            return;
        }

        // Auto-promote first user to admin if no admin exists
        if (currentUser.role !== 'admin') {
            try {
                const promoteResult = await api.post('/auth/promote-me', {});
                if (promoteResult.role === 'admin') {
                    // Update cached user and token
                    currentUser.role = 'admin';
                    setCachedUser(currentUser);
                    if (promoteResult.token) setToken(promoteResult.token);
                    showToast('Has sido promovido a Administrador.', 'success');
                }
            } catch (promoteErr) {
                // Silently ignore - not first user or already admin
            }
        }

        // Update user info
        updateUserDisplay();

        // Show admin section if user is admin
        if (currentUser.role === 'admin') {
            setupAdminSection();
            if (typeof setupPremiumAdminTab === 'function') setupPremiumAdminTab();
        }

        // Setup sidebar navigation
        setupSidebar();

        // Setup sidebar toggle (mobile)
        setupSidebarToggle();

        // Setup delete modal
        setupDeleteModal();

        // Setup product modal
        setupProductModal();

        // Setup profile form
        setupProfileForm();

        // Setup premium plan display (badge + buttons)
        setupPremiumModal();
        updatePlanDisplay();

        // Load data for overview section
        await loadOverviewData();

        // Load premium badge count for admin
        if (currentUser.role === 'admin' && adminPremiumBadge) {
            try {
                const pData = await api.get('/premium-requests?status=pending&limit=1');
                const count = pData.pagination?.total || (pData.requests || []).length;
                adminPremiumBadge.textContent = count;
                adminPremiumBadge.style.display = count > 0 ? 'inline' : 'none';
            } catch (e) {}
        }
    }

    // ─── User Display ──────────────────────────────────────────
    function updateUserDisplay() {
        if (!currentUser) return;

        if (dashUserName) dashUserName.textContent = currentUser.name || 'Usuario';
        if (dashUserEmail) dashUserEmail.textContent = currentUser.email || '';
        if (userAvatar) {
            if (currentUser.avatar) {
                userAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="${currentUser.name}">`;
            } else {
                const initials = (currentUser.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                userAvatar.innerHTML = `<span class="avatar-initials">${initials}</span>`;
            }
        }
    }

    // ─── Sidebar Navigation ────────────────────────────────────
    function setupSidebar() {
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                switchSection(section);

                // Update active state
                sidebarLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    function setupSidebarToggle() {
        if (!sidebarToggle || !sidebar) return;

        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarToggle.classList.toggle('active');
        });
    }

    function switchSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.dashboard-section').forEach(s => s.classList.add('hidden'));

        // Show target section
        const target = document.getElementById(`section${capitalize(sectionId)}`);
        if (target) target.classList.remove('hidden');

        // Update title
        const titles = {
            overview: 'Resumen',
            businesses: 'Mis Negocios',
            messages: 'Mensajes',
            favorites: 'Favoritos',
            products: 'Mis Productos',
            'my-properties': 'Mis Inmuebles',
            profile: 'Mi Perfil',
            stats: 'Estadísticas',
            admin: 'Panel de Administracion',
        };
        if (sectionTitle) sectionTitle.textContent = titles[sectionId] || 'Resumen';

        // Load section data
        switch (sectionId) {
            case 'overview':
                loadOverviewData();
                break;
            case 'businesses':
                loadMyProperties();
                break;
            case 'messages':
                loadMessages();
                break;
            case 'favorites':
                loadFavorites();
                break;
            case 'products':
                loadMyProducts();
                break;
            case 'my-properties':
                loadMyInmuebles();
                break;
            case 'stats':
                loadBusinessStats();
                break;
            case 'admin':
                loadAdminData();
                break;
        }
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ─── Overview Data ─────────────────────────────────────────
    async function loadOverviewData() {
        try {
            const userId = currentUser?.id;
            if (!userId) {
                console.error('loadOverviewData: no userId');
                return;
            }

            // Load all 3 status groups in parallel for speed
            const [approvedData, pendingData, rejectedData] = await Promise.all([
                api.get(`/businesses?limit=100&user_id=${userId}&status=approved`).catch(e => { console.warn('approved fetch failed:', e); return { businesses: [] }; }),
                api.get(`/businesses?limit=100&user_id=${userId}&status=pending`).catch(e => { console.warn('pending fetch failed:', e); return { businesses: [] }; }),
                api.get(`/businesses?limit=100&user_id=${userId}&status=rejected`).catch(e => { console.warn('rejected fetch failed:', e); return { businesses: [] }; }),
            ]);

            const approvedProps = approvedData.businesses || [];
            const pendingProps = pendingData.businesses || [];
            const rejectedProps = rejectedData.businesses || [];

            userProperties = [...approvedProps, ...pendingProps, ...rejectedProps];

            // Stats
            const total = userProperties.length;
            const published = userProperties.filter(p => p.status === 'approved').length;
            const pending = userProperties.filter(p => p.status === 'pending').length;
            const views = userProperties.reduce((sum, p) => sum + (p.views || 0), 0);

            if (dashTotalProps) dashTotalProps.textContent = total;
            if (dashPublishedProps) dashPublishedProps.textContent = published;
            if (dashPendingProps) dashPendingProps.textContent = pending;
            if (dashTotalViews) dashTotalViews.textContent = views;

            // Recent businesses table (last 5)
            if (recentPropsBody) {
                const recent = userProperties.slice(0, 5);
                if (recent.length === 0) {
                    recentPropsBody.innerHTML = `
                        <tr class="empty-row">
                            <td colspan="6">
                                <div class="empty-state">
                                    <i class="fas fa-inbox"></i>
                                    <p>No tienes negocios aun.</p>
                                    <a href="new-business.html" class="btn btn-primary btn-sm">Registrar Negocio</a>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    recentPropsBody.innerHTML = recent.map(p => `
                        <tr>
                            <td>
                                <div class="dash-prop-name">
                                    ${(p.cover_image || p.image_count > 0) ? `<img src="${p.cover_image || ''}" alt="" class="dash-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image dash-thumb-placeholder"></i>'}
                                    <span>${truncateText(p.title, 35)}</span>
                                </div>
                            </td>
                            <td>${getBusinessTypeLabel(p.business_type)}</td>
                            <td class="dash-price">${formatPrice(p.price, p.currency)}</td>
                            <td>${getStatusBadge(p.status)}</td>
                            <td>${p.views || 0}</td>
                            <td class="dash-actions">
                                <a href="/negocio/${p.slug || p.id}" class="btn-icon" title="Ver"><i class="fas fa-eye"></i></a>
                                <a onclick="openEditBusinessModal(${p.id})" class="btn-icon" title="Editar"><i class="fas fa-edit"></i></button>
                                <button class="btn-icon btn-icon-danger" onclick="confirmDeleteBusiness(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading overview:', error);
        }
    }

    // ─── My Properties ─────────────────────────────────────────
    async function loadMyProperties(filter) {
        try {
            const userId = currentUser?.id;

            let userPropertiesList;

            if (filter) {
                // Filter by specific status
                const statusMap = { 'publicada': 'approved', 'pendiente': 'pending', 'rechazada': 'rejected' };
                const status = statusMap[filter] || filter;
                const data = await api.get(`/businesses?limit=100&user_id=${userId}&status=${status}`);
                userPropertiesList = data.businesses || [];
            } else {
                // No filter: fetch ALL user businesses (all statuses)
                const [approvedData, pendingData, rejectedData] = await Promise.all([
                    api.get(`/businesses?limit=100&user_id=${userId}&status=approved`),
                    api.get(`/businesses?limit=100&user_id=${userId}&status=pending`),
                    api.get(`/businesses?limit=100&user_id=${userId}&status=rejected`),
                ]);
                userPropertiesList = [
                    ...(approvedData.businesses || []),
                    ...(pendingData.businesses || []),
                    ...(rejectedData.businesses || []),
                ];
            }

            userProperties = userPropertiesList;

            if (allPropsBody) {
                if (userProperties.length === 0) {
                    allPropsBody.innerHTML = `
                        <tr class="empty-row">
                            <td colspan="8">
                                <div class="empty-state">
                                    <i class="fas fa-inbox"></i>
                                    <p>${filter ? 'No hay negocios con ese filtro.' : 'No tienes negocios.'}</p>
                                    <a href="new-business.html" class="btn btn-primary btn-sm">Registrar Negocio</a>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    allPropsBody.innerHTML = userProperties.map(p => `
                        <tr>
                            <td>
                                ${(p.cover_image || p.image_count > 0) ? `<img src="${p.cover_image || ''}" alt="" class="dash-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image dash-thumb-placeholder"></i>'}
                            </td>
                            <td>${truncateText(p.title, 30)}</td>
                            <td>${getBusinessTypeLabel(p.business_type)}</td>
                            <td>${p.city || '--'}, ${p.state || '--'}</td>
                            <td>${getStatusBadge(p.status)}</td>
                            <td>${p.views || 0}</td>
                            <td class="dash-actions">
                                <button class="btn-icon" onclick="openServicesManager(${p.id}, '${escapeAttr(p.title)}')" title="Servicios"><i class="fas fa-concierge-bell" style="color:#f59e0b;"></i></button>
                                <a href="/negocio/${p.slug || p.id}" class="btn-icon" title="Ver"><i class="fas fa-eye"></i></a>
                                <a onclick="openEditBusinessModal(${p.id})" class="btn-icon" title="Editar"><i class="fas fa-edit"></i></button>
                                <button class="btn-icon btn-icon-danger" onclick="confirmDeleteBusiness(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading businesses:', error);
        }
    }

    // Setup business filter
    if (dashPropFilter) {
        dashPropFilter.addEventListener('change', () => {
            loadMyProperties(dashPropFilter.value);
        });
    }

    // ─── Messages ──────────────────────────────────────────────
    async function loadMessages() {
        if (!messagesList) return;

        try {
            const data = await api.get('/contacts');
            const messages = data.contacts || data.messages || [];

            const unreadCount = messages.filter(m => !m.is_read).length;
            if (msgBadge) {
                msgBadge.textContent = unreadCount;
                msgBadge.style.display = unreadCount > 0 ? '' : 'none';
            }

            if (messages.length === 0) {
                messagesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-envelope-open"></i>
                        <p>No tienes mensajes nuevos.</p>
                    </div>
                `;
            } else {
                messagesList.innerHTML = messages.map(m => `
                    <div class="message-item ${m.is_read ? '' : 'unread'}">
                        <div class="message-header">
                            <div class="message-sender">
                                <i class="fas fa-user-circle"></i>
                                <strong>${m.sender_name}</strong>
                                <span class="message-date">${formatDateTime(m.created_at)}</span>
                            </div>
                            <span class="message-business">${m.business_title || `Propiedad #${m.business_id}`}</span>
                        </div>
                        <p class="message-text">${truncateText(m.message, 200)}</p>
                        <div class="message-actions">
                            <a href="mailto:${m.sender_email}" class="btn btn-sm btn-secondary">
                                <i class="fas fa-reply"></i> Responder
                            </a>
                            ${m.sender_phone ? `<a href="tel:${m.sender_phone}" class="btn btn-sm btn-secondary"><i class="fas fa-phone"></i> Llamar</a>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            messagesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error al cargar mensajes.</p>
                </div>
            `;
        }
    }

    // ─── Favorites ─────────────────────────────────────────────
    async function loadFavorites() {
        if (!favoritesGrid) return;

        try {
            const data = await api.get('/favorites');
            const favorites = data.favorites || [];

            if (favorites.length === 0) {
                favoritesGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-heart"></i>
                        <p>No tienes negocios favoritos.</p>
                        <a href="search.html" class="btn btn-primary btn-sm">Explorar Negocios</a>
                    </div>
                `;
            } else {
                favoritesGrid.innerHTML = favorites.map(f => {
                    const prop = f.business || f;
                    return createBusinessCard(prop);
                }).join('');
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
            favoritesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error al cargar favoritos.</p>
                </div>
            `;
        }
    }

    // ─── Profile ───────────────────────────────────────────────
    function setupProfileForm() {
        if (!profileForm || !currentUser) return;

        // Update profile header display
        updateProfileHeader();

        // Populate form fields
        const nameField = document.getElementById('profileName');
        const emailField = document.getElementById('profileEmail');
        const phoneField = document.getElementById('profilePhone');
        const whatsappField = document.getElementById('profileWhatsApp');
        const bioField = document.getElementById('profileBio');
        const bioCharCount = document.getElementById('bioCharCount');

        if (nameField) nameField.value = currentUser.name || '';
        if (emailField) emailField.value = currentUser.email || '';
        if (phoneField) phoneField.value = currentUser.phone || '';
        if (whatsappField) whatsappField.value = currentUser.whatsapp || '';
        if (bioField) {
            bioField.value = currentUser.bio || '';
            updateBioCharCount();
        }

        // Bio character counter
        if (bioField && bioCharCount) {
            bioField.addEventListener('input', updateBioCharCount);
        }

        // Cancel button
        const cancelBtn = document.getElementById('profileCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // Reset form to current values
                if (nameField) nameField.value = currentUser.name || '';
                if (emailField) emailField.value = currentUser.email || '';
                if (phoneField) phoneField.value = currentUser.phone || '';
                if (whatsappField) whatsappField.value = currentUser.whatsapp || '';
                if (bioField) {
                    bioField.value = currentUser.bio || '';
                    updateBioCharCount();
                }
                showToast('Cambios descartados', 'info');
            });
        }

        // Submit handler
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const saveBtn = document.getElementById('profileSaveBtn');
            if (saveBtn) {
                saveBtn.classList.add('saving');
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            }

            try {
                const formData = new FormData(profileForm);
                const data = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    whatsapp: formData.get('whatsapp'),
                    bio: formData.get('bio'),
                };

                await api.put('/users/me', data);
                showToast('Perfil actualizado exitosamente', 'success');

                // Update cache
                currentUser = { ...currentUser, ...data };
                setCachedUser(currentUser);
                updateUserDisplay();
                updateProfileHeader();
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

    function updateProfileHeader() {
        if (!currentUser) return;

        const displayName = document.getElementById('profileDisplayName');
        const displayEmail = document.getElementById('profileDisplayEmail');
        const roleBadge = document.getElementById('profileRoleBadge');
        const avatarLarge = document.getElementById('profileAvatarLarge');

        if (displayName) displayName.textContent = currentUser.name || 'Usuario';
        if (displayEmail) displayEmail.textContent = currentUser.email || '';

        if (roleBadge) {
            const role = currentUser.role || 'user';
            const roleLabels = { admin: 'Administrador', agent: 'Agente', user: 'Usuario' };
            roleBadge.textContent = roleLabels[role] || 'Usuario';
            roleBadge.className = 'profile-role-badge';
            if (role === 'admin') roleBadge.classList.add('role-admin');
            else if (role === 'agent') roleBadge.classList.add('role-agent');
        }

        if (avatarLarge) {
            if (currentUser.avatar) {
                avatarLarge.innerHTML = `<img src="${currentUser.avatar}" alt="${currentUser.name || 'Avatar'}">`;
            } else {
                // Show initials
                const initials = (currentUser.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                avatarLarge.innerHTML = `<span style="font-weight:700; font-size:28px;">${initials}</span>`;
            }
        }
    }

    function updateBioCharCount() {
        const bioField = document.getElementById('profileBio');
        const bioCharCount = document.getElementById('bioCharCount');
        if (bioField && bioCharCount) {
            const len = bioField.value.length;
            bioCharCount.textContent = `${len}/500`;
            bioCharCount.style.color = len > 450 ? '#e74c3c' : len > 350 ? '#f39c12' : '#bbb';
        }
    }

    // ─── Delete Modal ──────────────────────────────────────────
    function setupDeleteModal() {
        if (!deleteModal) return;

        if (deleteModalClose) {
            deleteModalClose.addEventListener('click', () => closeModal());
        }
        if (deleteModalCancel) {
            deleteModalCancel.addEventListener('click', () => closeModal());
        }
        if (deleteModalConfirm) {
            deleteModalConfirm.addEventListener('click', async () => {
                if (deleteTargetId) {
                    await deleteBusiness(deleteTargetId);
                    closeModal();
                }
            });
        }

        // Close on overlay click
        const overlay = deleteModal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => closeModal());
        }
    }

    window.confirmDeleteBusiness = function (id) {
        deleteTargetId = id;
        if (deleteModal) deleteModal.classList.remove('hidden');
    };

    function closeModal() {
        deleteTargetId = null;
        if (deleteModal) deleteModal.classList.add('hidden');
    }

    async function deleteBusiness(id) {
        try {
            await api.delete(`/businesses/${id}`);
            showToast('Negocio eliminado exitosamente', 'success');

            // Reload current section
            const activeSection = document.querySelector('.sidebar-link.active');
            if (activeSection) {
                switchSection(activeSection.dataset.section);
            } else {
                loadOverviewData();
            }
        } catch (error) {
            showToast(error.message || 'Error al eliminar el negocio', 'error');
        }
    }

    // ─── My Products (Marketplace) ──────────────────────────────
    async function loadMyProducts() {
        const container = document.getElementById('myProductsByStore');
        if (!container) return;

        try {
            // Fetch all products belonging to this user (by user_id)
            const data = await api.get('/marketplace?limit=200&all=true&user_id=' + currentUser.id);
            const products = data.products || [];

            if (products.length === 0) {
                container.innerHTML = `
                    <div class="dash-card">
                        <div style="text-align:center;padding:32px 0;color:#94a3b8;">
                            <i class="fas fa-box-open" style="font-size:2.5rem;color:#cbd5e1;"></i>
                            <p style="margin-top:12px;">No tienes productos publicados.</p>
                            <button class="btn btn-primary btn-sm" onclick="openProductModal()" style="display:inline-block;margin-top:12px;"><i class="fas fa-plus"></i> Publicar Producto</button>
                        </div>
                    </div>`;
                return;
            }

            // Group products by business
            const grouped = {};
            let orphanProducts = [];
            products.forEach(p => {
                if (p.business_id && p.business_name) {
                    if (!grouped[p.business_id]) {
                        grouped[p.business_id] = { title: p.business_name, slug: p.business_slug, products: [] };
                    }
                    grouped[p.business_id].products.push(p);
                } else {
                    orphanProducts.push(p);
                }
            });

            let html = '';

            // Render products grouped by business
            for (const bizId in grouped) {
                const biz = grouped[bizId];
                html += buildProductTable(biz.title, biz.slug, biz.products, bizId);
            }

            // Render orphan products (no business)
            if (orphanProducts.length > 0) {
                html += buildProductTable('Productos sin negocio asociado', null, orphanProducts, null);
            }

            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading products:', error);
            container.innerHTML = `
                <div class="dash-card">
                    <div style="text-align:center;padding:32px 0;color:#ef4444;">
                        <i class="fas fa-exclamation-circle" style="font-size:2.5rem;"></i>
                        <p style="margin-top:12px;">Error al cargar productos.</p>
                    </div>
                </div>`;
        }
    }

    function buildProductTable(title, slug, products, bizId) {
        let html = `
            <div class="dash-card" style="margin-bottom:16px;">
                <div class="dash-card-header">
                    <h3 style="display:flex;align-items:center;gap:8px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-store" style="color:#fff;font-size:0.8rem;"></i>
                        </div>
                        ${slug ? `<a href="/negocio/${slug}" style="color:#059669;text-decoration:none;font-weight:700;">${title}</a>` : `<span style="color:#059669;font-weight:700;">${title}</span>`}
                    </h3>
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
            html += `
                                <tr>
                                    <td><div class="dash-prop-name">${p.image ? `<img src="${p.image}" class="dash-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image dash-thumb-placeholder"></i>'}<span>${p.name || 'Sin nombre'}</span></div></td>
                                    <td>${p.category || 'General'}</td>
                                    <td class="dash-price">$${Number(p.price || 0).toLocaleString('es-VE')}</td>
                                    <td>${statusLabel}</td>
                                    <td>${formatDate(p.created_at)}</td>
                                    <td class="dash-actions">
                                        <button class="btn-icon btn-icon-danger" onclick="deleteProduct(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>`;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>`;
        return html;
    }

    // Product Modal
    function setupProductModal() {
        const modal = document.getElementById('productModal');
        if (!modal) return;

        const close = document.getElementById('productModalClose');
        const cancel = document.getElementById('productModalCancel');
        const save = document.getElementById('productModalSave');
        const overlay = modal.querySelector('.modal-overlay');
        const form = document.getElementById('productForm');

        if (close) close.addEventListener('click', () => modal.classList.add('hidden'));
        if (cancel) cancel.addEventListener('click', () => modal.classList.add('hidden'));
        if (overlay) overlay.addEventListener('click', () => modal.classList.add('hidden'));

        if (save) save.addEventListener('click', async () => {
            if (!form.checkValidity()) { form.reportValidity(); return; }

            // Validate business selection
            const businessSelect = document.getElementById('prodBusiness');
            const businessId = businessSelect ? businessSelect.value : '';
            if (!businessId) {
                showToast('Debes seleccionar un negocio. Si no tienes uno, regístralo primero desde "Nuevo Negocio".', 'error');
                return;
            }

            try {
                const fd = new FormData(form);
                const body = {
                    name: fd.get('name'),
                    price: parseFloat(fd.get('price')) || 0,
                    category: fd.get('category') || 'general',
                    image: fd.get('image') || '',
                    description: fd.get('description') || '',
                    video_url: fd.get('video_url') || '',
                    business_id: parseInt(businessId),
                };
                await api.post('/marketplace', body);
                showToast('Producto enviado para aprobación. Será visible una vez aprobado por un administrador.', 'success');
                modal.classList.add('hidden');
                form.reset();
                uploadedImageUrl = '';
                if (uploadPreview) uploadPreview.innerHTML = '';
                loadMyProducts();
            } catch (error) {
                showToast(error.message || 'Error al publicar producto', 'error');
            }
        });

        // ─── Image Upload Handler ─────────────────────────
        const imageFileInput = document.getElementById('prodImageFile');
        const attachFileInput = document.getElementById('prodAttachFile');
        const uploadPreview = document.getElementById('prodUploadPreview');
        const uploadProgress = document.getElementById('prodUploadProgress');
        const prodImageInput = document.getElementById('prodImage');
        let uploadedImageUrl = '';

        function handleImageUpload(file) {
            if (!file) return;
            
            // Validate it's an image
            if (!file.type.startsWith('image/')) {
                showToast('Solo se permiten imágenes', 'error');
                return;
            }
            
            // Show preview immediately
            const reader = new FileReader();
            reader.onload = function(e) {
                if (uploadPreview) {
                    uploadPreview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <div class="prod-upload-filename">
                            <i class="fas fa-check-circle" style="color:#059669;"></i> ${file.name}
                            <button class="prod-upload-remove" type="button" onclick="this.closest('.prod-upload-preview').innerHTML='';uploadedImageUrl='';document.getElementById('prodImage').value='';">&times;</button>
                        </div>`;
                }
            };
            reader.readAsDataURL(file);
            
            // Upload to server
            if (uploadProgress) uploadProgress.classList.remove('hidden');
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('product_type', 'marketplace');
            
            const token = getToken();
            
            fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData,
            })
            .then(res => res.json())
            .then(data => {
                if (uploadProgress) uploadProgress.classList.add('hidden');
                if (data.url) {
                    uploadedImageUrl = data.url;
                    if (prodImageInput) prodImageInput.value = data.url;
                    showToast('Imagen subida correctamente', 'success');
                } else {
                    showToast(data.error || 'Error al subir imagen', 'error');
                }
            })
            .catch(err => {
                if (uploadProgress) uploadProgress.classList.add('hidden');
                showToast('Error de conexión al subir imagen', 'error');
            });
        }
        
        if (imageFileInput) {
            imageFileInput.addEventListener('change', (e) => {
                handleImageUpload(e.target.files[0]);
            });
        }
        
        if (attachFileInput) {
            attachFileInput.addEventListener('change', (e) => {
                handleImageUpload(e.target.files[0]);
            });
        }
    }

    // Wire up header button
    const btnNewProduct = document.getElementById('btnNewProduct');

    window.openProductModal = async function () {
        const modal = document.getElementById('productModal');
        if (modal) modal.classList.remove('hidden');
        
        // Load user's businesses into selector
        try {
            const user = getCachedUser();
            const businessesData = await api.get(`/businesses?user_id=${user.id}&limit=50`);
            const businesses = businessesData.businesses || businessesData.results || businessesData || [];
            const select = document.getElementById('prodBusiness');
            if (select) {
                if (businesses.length === 0) {
                    select.innerHTML = '<option value="">-- Debe registrar un negocio primero --</option>';
                    select.disabled = true;
                } else {
                    select.innerHTML = '<option value="" disabled selected>Selecciona un negocio para publicar</option>';
                    businesses.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.id;
                        opt.textContent = b.title || b.name || `Negocio #${b.id}`;
                        select.appendChild(opt);
                    });
                    select.disabled = false;
                }
            }
        } catch (e) {
            console.log('Could not load businesses for selector:', e);
        }
    };

    if (btnNewProduct) btnNewProduct.addEventListener('click', window.openProductModal);

    // Wire up header button
    const headerBtnNewProduct = document.getElementById('headerBtnNewProduct');
    if (headerBtnNewProduct) headerBtnNewProduct.addEventListener('click', window.openProductModal);

    window.deleteProduct = async function (id) {
        if (!confirm('¿Eliminar este producto?')) return;
        try {
            await api.delete(`/marketplace/${id}`);
            showToast('Producto eliminado', 'success');
            loadMyProducts();
        } catch (error) {
            showToast(error.message || 'Error al eliminar', 'error');
        }
    };

    // ─── Utility: escape HTML attributes ──────────────────────────
    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ═══════════════════════════════════════════════════════════════
    // SERVICES MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    let currentServicesBusinessId = null;

    // Open services manager for a business
    window.openServicesManager = async function(businessId, businessTitle) {
        currentServicesBusinessId = businessId;
        const panel = document.getElementById('servicesManagerPanel');
        const nameEl = document.getElementById('servicesBusinessName');
        if (panel) panel.style.display = '';
        if (nameEl) nameEl.textContent = businessTitle || `Negocio #${businessId}`;

        // Reset form
        resetServiceForm();

        // Load services
        await loadBusinessServicesManager(businessId);
    };

    // Setup services panel close button
    const closeServicesPanel = document.getElementById('closeServicesPanel');
    if (closeServicesPanel) {
        closeServicesPanel.addEventListener('click', () => {
            const panel = document.getElementById('servicesManagerPanel');
            if (panel) panel.style.display = 'none';
            currentServicesBusinessId = null;
            resetServiceForm();
        });
    }

    // Setup cancel edit button
    const cancelServiceBtn = document.getElementById('cancelServiceBtn');
    if (cancelServiceBtn) {
        cancelServiceBtn.addEventListener('click', () => {
            resetServiceForm();
        });
    }

    function resetServiceForm() {
        const editId = document.getElementById('editServiceId');
        const titleInput = document.getElementById('serviceTitleInput');
        const descInput = document.getElementById('serviceDescInput');
        const formTitle = document.getElementById('serviceFormTitle');
        const saveBtn = document.getElementById('saveServiceBtn');
        const cancelBtn = document.getElementById('cancelServiceBtn');

        if (editId) editId.value = '';
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
        if (formTitle) formTitle.textContent = 'Agregar Servicio';
        if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar';
        if (cancelBtn) cancelBtn.style.display = 'none';
    }

    // Load services for a business into the manager
    async function loadBusinessServicesManager(businessId) {
        const container = document.getElementById('businessServicesManager');
        if (!container) return;

        try {
            const data = await api.get(`/businesses/${businessId}/services`);
            const services = data.services || [];

            if (services.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding:30px;">
                        <i class="fas fa-concierge-bell" style="font-size:2rem;color:#ccc;"></i>
                        <p style="margin-top:8px;">Este negocio aún no tiene servicios registrados.</p>
                    </div>`;
                return;
            }

            container.innerHTML = services.map(s => `
                <div class="service-manager-item" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;border:1px solid #e8e8e8;border-radius:10px;margin-bottom:10px;">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.95rem;color:#333;">${escapeHtml_service(s.title)}</div>
                        <div style="font-size:0.85rem;color:#666;margin-top:3px;">${escapeHtml_service(s.description || 'Sin descripción')}</div>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button class="btn-icon" onclick="editService(${s.id}, '${escapeAttr(s.title)}', '${escapeAttr(s.description || '')}')" title="Editar"><i class="fas fa-edit" style="color:#3b82f6;"></i></button>
                        <button class="btn-icon" onclick="deleteService(${s.id})" title="Eliminar"><i class="fas fa-trash" style="color:#e74c3c;"></i></button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading services:', error);
            container.innerHTML = `
                <div class="empty-state" style="padding:30px;">
                    <i class="fas fa-exclamation-circle" style="color:#e74c3c;"></i>
                    <p style="margin-top:8px;">Error al cargar servicios.</p>
                </div>`;
        }
    }

    // Escape HTML helper (not to conflict with any other)
    function escapeHtml_service(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Save (create or update) a service
    const saveServiceBtn = document.getElementById('saveServiceBtn');
    if (saveServiceBtn) {
        saveServiceBtn.addEventListener('click', async () => {
            const titleInput = document.getElementById('serviceTitleInput');
            const descInput = document.getElementById('serviceDescInput');
            const editId = document.getElementById('editServiceId');

            const title = titleInput ? titleInput.value.trim() : '';
            const description = descInput ? descInput.value.trim() : '';

            if (!title) {
                showToast('El nombre del servicio es requerido', 'error');
                return;
            }

            if (!currentServicesBusinessId) {
                showToast('No se ha seleccionado un negocio', 'error');
                return;
            }

            try {
                const body = { title, description };

                if (editId && editId.value) {
                    // Update existing service
                    const serviceId = editId.value;
                    await api.put(`/businesses/${currentServicesBusinessId}/services/${serviceId}`, body);
                    showToast('Servicio actualizado correctamente', 'success');
                } else {
                    // Create new service
                    await api.post(`/businesses/${currentServicesBusinessId}/services`, body);
                    showToast('Servicio agregado correctamente', 'success');
                }

                resetServiceForm();
                await loadBusinessServicesManager(currentServicesBusinessId);
            } catch (error) {
                showToast(error.message || 'Error al guardar servicio', 'error');
            }
        });
    }

    // Edit service - populate form with existing data
    window.editService = function(serviceId, title, description) {
        const editIdEl = document.getElementById('editServiceId');
        const titleInput = document.getElementById('serviceTitleInput');
        const descInput = document.getElementById('serviceDescInput');
        const formTitle = document.getElementById('serviceFormTitle');
        const saveBtn = document.getElementById('saveServiceBtn');
        const cancelBtn = document.getElementById('cancelServiceBtn');

        if (editIdEl) editIdEl.value = serviceId;
        if (titleInput) titleInput.value = title;
        if (descInput) descInput.value = description;
        if (formTitle) formTitle.textContent = 'Editar Servicio';
        if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-check"></i> Actualizar';
        if (cancelBtn) cancelBtn.style.display = '';

        // Scroll to form
        const formArea = document.getElementById('serviceFormArea');
        if (formArea) formArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // Delete service
    window.deleteService = async function(serviceId) {
        if (!confirm('¿Eliminar este servicio?')) return;
        if (!currentServicesBusinessId) return;

        try {
            await api.delete(`/businesses/${currentServicesBusinessId}/services/${serviceId}`);
            showToast('Servicio eliminado', 'success');
            await loadBusinessServicesManager(currentServicesBusinessId);
        } catch (error) {
            showToast(error.message || 'Error al eliminar servicio', 'error');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // ADMIN SECTION - Approve/Reject Properties
    // ═══════════════════════════════════════════════════════════════

    function setupAdminSection() {
        // Add admin link to sidebar
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (sidebarNav && !document.querySelector('.sidebar-link[data-section="admin"]')) {
            const adminLink = document.createElement('a');
            adminLink.href = '#';
            adminLink.className = 'sidebar-link';
            adminLink.dataset.section = 'admin';
            adminLink.innerHTML = '<i class="fas fa-shield-alt"></i> Administrar <span class="badge badge-warning" id="adminPendingBadge">0</span>';
            sidebarNav.appendChild(adminLink);

            // Add event listener
            adminLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchSection('admin');
                sidebarLinks.forEach(l => l.classList.remove('active'));
                adminLink.classList.add('active');
            });
        }

        // Setup admin tabs
        if (adminTabPending) {
            adminTabPending.addEventListener('click', () => {
                activateAdminTab('Pending');
            });
        }

        if (adminTabAll) {
            adminTabAll.addEventListener('click', () => {
                activateAdminTab('All');
                loadAdminAllProperties();
            });
        }

        if (adminTabUsers) {
            adminTabUsers.addEventListener('click', () => {
                activateAdminTab('Users');
                loadAdminUsers();
            });
        }

        // Search users
        if (adminUsersSearchInput) {
            let searchTimeout;
            adminUsersSearchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    loadAdminUsers(adminUsersSearchInput.value.trim());
                }, 350);
            });
        }
    }

    function activateAdminTab(name) {
        [adminTabPending, adminTabAll, adminTabUsers].forEach(t => {
            if (t) t.classList.remove('active');
        });
        const activeTab = document.getElementById('adminTab' + name);
        if (activeTab) activeTab.classList.add('active');

        const panels = ['Pending', 'All', 'Users'];
        panels.forEach(p => {
            const panel = document.getElementById('adminPanel' + p);
            if (panel) {
                if (p === name) panel.classList.remove('hidden');
                else panel.classList.add('hidden');
            }
        });
    }

    // ─── Admin Users Management ─────────────────────────────────
    async function loadAdminUsers(search) {
        if (!adminUsersBody) return;

        try {
            let url = '/users?limit=50';
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const data = await api.get(url);
            const users = data.users || [];

            // Update stats
            const statTotal = document.getElementById('statTotalUsers');
            const statAdmin = document.getElementById('statAdminUsers');
            const statNormal = document.getElementById('statNormalUsers');
            if (statTotal) statTotal.textContent = users.length;
            if (statAdmin) statAdmin.textContent = users.filter(u => u.role === 'admin').length;
            if (statNormal) statNormal.textContent = users.filter(u => u.role !== 'admin' && u.plan_type !== 'premium').length;
            const statPremium = document.getElementById('statPremiumUsers');
            if (statPremium) statPremium.textContent = users.filter(u => u.plan_type === 'premium').length;

            if (users.length === 0) {
                adminUsersBody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="8">
                            <div class="empty-state">
                                <i class="fas fa-users"></i>
                                <p>${search ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            const myId = currentUser ? currentUser.id : null;

            adminUsersBody.innerHTML = users.map(user => {
                const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                const avatarHTML = user.avatar
                    ? `<div class="admin-user-avatar"><img src="${user.avatar}" alt=""></div>`
                    : `<div class="admin-user-avatar">${initials}</div>`;
                const isSelf = myId && (user.id === myId || parseInt(user.id) === parseInt(myId));
                const date = user.created_at ? new Date(user.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                const phone = user.phone || '<span style="color:#ccc">—</span>';

                // Role toggle
                const roleLabels = { admin: 'Admin', user: 'Usuario', agent: 'Agente' };
                const currentRole = user.role || 'user';
                let toggleHTML = `<div class="role-toggle" data-user-id="${user.id}" data-current-role="${currentRole}">`;
                toggleHTML += `<button class="role-toggle-btn ${currentRole === 'admin' ? 'active-admin' : ''} ${isSelf ? 'self-badge' : ''}" data-role="admin" ${isSelf ? 'disabled' : ''}><i class="fas fa-shield-alt"></i> Admin</button>`;
                toggleHTML += `<button class="role-toggle-btn ${currentRole === 'user' ? 'active-user' : ''} ${isSelf ? 'self-badge' : ''}" data-role="user" ${isSelf ? 'disabled' : ''}><i class="fas fa-user"></i> User</button>`;
                toggleHTML += `</div>`;

                const selfLabel = isSelf ? ' <span style="color:#aaa;font-size:0.7rem">(Tú)</span>' : '';

                const planBadge = user.plan_type === 'premium'
                    ? '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:700;background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;border:1px solid #fbbf24;"><i class="fas fa-crown"></i> Premium</span>'
                    : '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;"><i class="fas fa-user"></i> Regular</span>';

                const activateBtn = (!isSelf && user.plan_type !== 'premium')
                    ? `<button class="btn-approve-premium" style="margin-top:4px;" onclick="window._openManualPremium(${user.id}, '${(user.name||'').replace(/'/g, "'")}', '${user.email||''}')"><i class="fas fa-crown"></i> Premium</button>`
                    : '';

                return `
                    <tr>
                        <td>
                            <div class="admin-user-cell">
                                ${avatarHTML}
                                <div>
                                    <div class="admin-user-name">${user.name || 'Sin nombre'}${selfLabel}</div>
                                </div>
                            </div>
                        </td>
                        <td style="font-size:0.83rem; color:#666;">${user.email || '—'}</td>
                        <td style="font-size:0.83rem;">${phone}</td>
                        <td>
                            <span class="admin-role-badge-inline role-${currentRole}">
                                <i class="fas ${currentRole === 'admin' ? 'fa-shield-alt' : currentRole === 'agent' ? 'fa-id-badge' : 'fa-user'}"></i>
                                ${roleLabels[currentRole] || 'Usuario'}
                            </span>
                        </td>
                        <td>${planBadge}${activateBtn}</td>
                        <td style="text-align:center; font-weight:600;">${user.business_count || 0}</td>
                        <td><span class="admin-user-date">${date}</span></td>
                        <td>${toggleHTML}</td>
                    </tr>
                `;
            }).join('');

            // Attach click handlers for role toggle buttons
            adminUsersBody.querySelectorAll('.role-toggle-btn:not([disabled])').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const toggle = btn.closest('.role-toggle');
                    const userId = toggle.dataset.userId;
                    const currentRole = toggle.dataset.currentRole;
                    const newRole = btn.dataset.role;
                    if (newRole !== currentRole) {
                        toggleUserRole(userId, newRole, toggle);
                    }
                });
            });
        } catch (error) {
            adminUsersBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="8">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error al cargar usuarios</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    async function toggleUserRole(userId, newRole, toggleEl) {
        // Add saving state
        const buttons = toggleEl.querySelectorAll('.role-toggle-btn');
        buttons.forEach(b => b.classList.add('saving-role'));

        try {
            await api.put(`/users/${userId}`, { role: newRole });
            showToast(`Rol cambiado a ${newRole === 'admin' ? 'Administrador' : 'Usuario'} exitosamente`, 'success');

            // Update toggle UI
            toggleEl.dataset.currentRole = newRole;
            buttons.forEach(b => {
                b.classList.remove('active-admin', 'active-user', 'active-agent', 'saving-role');
                if (b.dataset.role === newRole) {
                    b.classList.add(newRole === 'admin' ? 'active-admin' : newRole === 'agent' ? 'active-agent' : 'active-user');
                }
            });

            // Update the role badge inline
            const row = toggleEl.closest('tr');
            if (row) {
                const badgeCell = row.querySelectorAll('td')[3];
                if (badgeCell) {
                    const roleLabels = { admin: 'Admin', user: 'Usuario', agent: 'Agente' };
                    badgeCell.innerHTML = `
                        <span class="admin-role-badge-inline role-${newRole}">
                            <i class="fas ${newRole === 'admin' ? 'fa-shield-alt' : newRole === 'agent' ? 'fa-id-badge' : 'fa-user'}"></i>
                            ${roleLabels[newRole] || 'Usuario'}
                        </span>
                    `;
                }
            }

            // Update stats
            loadAdminUsers(adminUsersSearchInput ? adminUsersSearchInput.value.trim() : undefined);
        } catch (error) {
            showToast(error.message || 'Error al cambiar rol', 'error');
            buttons.forEach(b => b.classList.remove('saving-role'));
        }
    }

    async function loadAdminData() {
        await loadAdminPendingProperties();
        loadAdminAllProperties();
    }

    async function loadAdminPendingProperties() {
        if (!adminPendingBody) return;

        try {
            const data = await api.get('/businesses?status=pending&limit=100');
            pendingProperties = data.businesses || [];

            // Update badge
            const badge = document.getElementById('adminPendingBadge');
            if (badge) {
                badge.textContent = pendingProperties.length;
                badge.style.display = pendingProperties.length > 0 ? '' : 'none';
            }

            if (pendingProperties.length === 0) {
                adminPendingBody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="7">
                            <div class="empty-state">
                                <i class="fas fa-check-circle" style="color: #28a745;"></i>
                                <p>No hay propiedades pendientes de aprobacion.</p>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                adminPendingBody.innerHTML = pendingProperties.map(p => `
                    <tr class="admin-pending-row">
                        <td>
                            <div class="dash-prop-name">
                                ${(p.cover_image || p.image_count > 0) ? `<img src="${p.cover_image || ''}" alt="" class="dash-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image dash-thumb-placeholder"></i>'}
                                <span>${truncateText(p.title, 30)}</span>
                            </div>
                        </td>
                        <td>${getBusinessTypeLabel(p.business_type)}</td>
                        <td class="dash-price">${formatPrice(p.price, p.currency)}</td>
                        <td><i class="fas fa-map-marker-alt"></i> ${p.city || 'Mérida'}</td>
                        <td>${formatDate(p.created_at)}</td>
                        <td>${p.owner_name || 'Usuario'}</td>
                        <td class="dash-actions">
                            <button class="btn btn-sm btn-success" onclick="adminApproveBusiness(${p.id})" title="Aprobar">
                                <i class="fas fa-check"></i> Aprobar
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminRejectBusiness(${p.id})" title="Rechazar">
                                <i class="fas fa-times"></i> Rechazar
                            </button>
                            <a href="/negocio/${p.slug || p.id}" class="btn-icon" title="Ver detalle"><i class="fas fa-eye"></i></a>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading admin pending:', error);
            adminPendingBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error al cargar propiedades pendientes.</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    async function loadAdminAllProperties() {
        if (!adminAllPropsBody) return;

        try {
            // Admin sees ALL businesses regardless of status
            const data = await api.get('/businesses?status=approved&limit=100');
            const approvedProps = data.businesses || [];
            // Also fetch pending and rejected
            const pendingData = await api.get('/businesses?status=pending&limit=100');
            const rejectedData = await api.get('/businesses?status=rejected&limit=100');
            const allProps = [...approvedProps, ...(pendingData.businesses || []), ...(rejectedData.businesses || [])];

            if (allProps.length === 0) {
                adminAllPropsBody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="8">
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <p>No hay propiedades registradas.</p>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                adminAllPropsBody.innerHTML = allProps.map(p => `
                    <tr>
                        <td>
                            <div class="dash-prop-name">
                                ${(p.cover_image || p.image_count > 0) ? `<img src="${p.cover_image || ''}" alt="" class="dash-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image dash-thumb-placeholder"></i>'}
                                <span>${truncateText(p.title, 30)}</span>
                            </div>
                        </td>
                        <td>${getBusinessTypeLabel(p.business_type)}</td>
                        <td>${p.city || '--'}, ${p.state || '--'}</td>
                        <td>${getStatusBadge(p.status)}</td>
                        <td>${p.owner_name || 'Usuario'}</td>
                        <td>${formatDate(p.created_at)}</td>
                        <td class="dash-actions">
                            ${p.status === 'pending' ? `
                                <button class="btn btn-sm btn-success" onclick="adminApproveBusiness(${p.id})"><i class="fas fa-check"></i></button>
                                <button class="btn btn-sm btn-danger" onclick="adminRejectBusiness(${p.id})"><i class="fas fa-times"></i></button>
                            ` : ''}
                            <a href="/negocio/${p.slug || p.id}" class="btn-icon" title="Ver"><i class="fas fa-eye"></i></a>
                            <button class="btn-icon btn-icon-danger" onclick="confirmDeleteBusiness(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading admin all businesses:', error);
        }
    }

    // Admin approve business
    window.adminApproveBusiness = async function (id) {
        try {
            await api.post(`/businesses/${id}/approve`, {});
            showToast('Propiedad aprobada exitosamente', 'success');

            // Reload admin data
            loadAdminData();

            // Also update user pending count if visible
            if (dashPendingProps) {
                const pending = pendingProperties.length - 1;
                dashPendingProps.textContent = Math.max(0, pending);
            }
        } catch (error) {
            showToast(error.message || 'Error al aprobar propiedad', 'error');
        }
    };

    // Admin reject business
    window.adminRejectBusiness = async function (id) {
        if (!confirm('¿Estas seguro de que deseas rechazar esta propiedad?')) return;

        try {
            await api.post(`/businesses/${id}/reject`, {});
            showToast('Propiedad rechazada', 'info');

            // Reload admin data
            loadAdminData();
        } catch (error) {
            showToast(error.message || 'Error al rechazar propiedad', 'error');
        }
    };

    // ─── Business Stats ───────────────────────────────────────
    let currentStatsPeriod = '7d';

    async function loadBusinessStats(businessId) {
        try {
            // Get user's businesses first
            const myBiz = await api.get('/user/my-businesses');
            const businesses = myBiz.businesses || myBiz.data || [];

            if (businesses.length === 0) {
                const body = document.getElementById('statsPerBusinessBody');
                if (body) body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">No tienes negocios registrados.</td></tr>';
                return;
            }

            // If no specific business, aggregate all
            let allStats = { total_views: 0, total_whatsapp_clicks: 0, total_website_clicks: 0, total_shares: 0 };
            let rows = [];

            for (const biz of businesses) {
                try {
                    const stats = await api.get(`/business-stats/${biz.id}?period=${currentStatsPeriod}`);
                    allStats.total_views += stats.total_views || 0;
                    allStats.total_whatsapp_clicks += stats.total_whatsapp_clicks || 0;
                    allStats.total_website_clicks += stats.total_website_clicks || 0;
                    allStats.total_shares += stats.total_shares || 0;

                    rows.push(`
                        <tr>
                            <td><a href="/negocio/${biz.slug || biz.id}" style="color:#059669;font-weight:600;text-decoration:none;">${biz.title || 'Sin título'}</a></td>
                            <td><span style="font-weight:700;color:#1e293b;">${(stats.total_views || 0).toLocaleString()}</span></td>
                            <td><span style="font-weight:700;color:#25d366;">${(stats.total_whatsapp_clicks || 0).toLocaleString()}</span></td>
                            <td><span style="font-weight:700;color:#0ea5e9;">${(stats.total_website_clicks || 0).toLocaleString()}</span></td>
                            <td><span style="font-weight:700;color:#8b5cf6;">${(stats.total_shares || 0).toLocaleString()}</span></td>
                        </tr>
                    `);
                } catch(e) {
                    rows.push(`
                        <tr>
                            <td>${biz.title || 'Sin título'}</td>
                            <td colspan="4" style="color:#94a3b8;">Sin datos</td>
                        </tr>
                    `);
                }
            }

            // Update summary cards
            const elViews = document.getElementById('statTotalViews');
            const elWA = document.getElementById('statTotalWA');
            const elWeb = document.getElementById('statTotalWeb');
            const elShares = document.getElementById('statTotalShares');
            if (elViews) elViews.textContent = allStats.total_views.toLocaleString();
            if (elWA) elWA.textContent = allStats.total_whatsapp_clicks.toLocaleString();
            if (elWeb) elWeb.textContent = allStats.total_website_clicks.toLocaleString();
            if (elShares) elShares.textContent = allStats.total_shares.toLocaleString();

            // Update table
            const body = document.getElementById('statsPerBusinessBody');
            if (body) body.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">Sin datos para este período.</td></tr>';

        } catch (error) {
            console.error('Stats error:', error);
            showToast('Error al cargar estadísticas', 'error');
        }
    }

    // Period button handlers
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('period-btn')) {
            currentStatsPeriod = e.target.dataset.period;
            document.querySelectorAll('.period-btn').forEach(b => {
                b.style.background = '#fff';
                b.classList.remove('active');
            });
            e.target.style.background = '#f1f5f9';
            e.target.classList.add('active');
            loadBusinessStats();
        }
    });

    // ─── Initialize on DOM Ready ────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }


    // ─── Edit Business Modal ─────────────────────────────
    let editBizVideoMode = 'file';

    window.openEditBusinessModal = async function(id) {
        const modal = document.getElementById('editBusinessModal');
        const loading = document.getElementById('editBizLoading');
        const form = document.getElementById('editBizForm');
        if (!modal) return;
        modal.classList.remove('hidden');
        loading.style.display = '';
        form.style.display = 'none';

        // Reset features
        document.querySelectorAll('#editBizFeatures .eb-feature').forEach(f => f.classList.remove('checked'));
        document.getElementById('ebVideoPreview').style.display = 'none';
        document.getElementById('ebVideoFileInfo').innerHTML = '';
        document.getElementById('editBizVideoUrlHidden').value = '';
        document.getElementById('editBizVideoUrl').value = '';
        document.getElementById('editBizVideoFileInput').value = '';

        try {
            const data = await api.get('/businesses/' + id);
            const biz = data.business || data;
            document.getElementById('editBizId').value = biz.id;
            populateEditBizForm(biz);
            loading.style.display = 'none';
            form.style.display = '';
        } catch(e) {
            loading.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444;"></i><p>Error al cargar datos del negocio</p>';
        }
    };

    window.closeEditBusinessModal = function() {
        const modal = document.getElementById('editBusinessModal');
        if (modal) modal.classList.add('hidden');
    };

    function populateEditBizForm(biz) {
        const el = (id, val) => { const e = document.getElementById(id); if (e && val) e.value = val; };
        el('editBizTitle', biz.title);
        el('editBizDesc', biz.description);
        el('editBizCat', biz.category || biz.category_id);
        el('editBizType', biz.business_type);
        el('editBizPhone', biz.phone);
        el('editBizWhatsapp', biz.whatsapp);
        el('editBizEmail', biz.email_contact || biz.email);
        el('editBizWebsite', biz.website);
        el('editBizInstagram', biz.instagram);
        el('editBizFacebook', biz.facebook);
        el('editBizTwitter', biz.twitter);
        el('editBizTiktok', biz.tiktok);
        el('editBizYoutube', biz.youtube);
        el('editBizAddress', biz.address);
        el('editBizCity', biz.city);
        el('editBizState', biz.state);
        el('editBizLat', biz.lat || biz.latitude);
        el('editBizLng', biz.lng || biz.longitude);
        el('editBizSchedule', biz.schedule);

        // Features
        const features = biz.features || biz.caracteristicas || '';
        const featList = typeof features === 'string' ? features.split(',') : features;
        document.querySelectorAll('#editBizFeatures .eb-feature').forEach(f => {
            if (featList.includes(f.dataset.feature)) f.classList.add('checked');
        });

        // Video
        if (biz.video_url) {
            document.getElementById('editBizVideoUrlHidden').value = biz.video_url;
            showEditBizVideoPreview(biz.video_url);
            setEditBizVideoMode('url');
            document.getElementById('editBizVideoUrl').value = biz.video_url;
        } else {
            setEditBizVideoMode('file');
        }
    }

    window.setEditBizVideoMode = function(mode) {
        editBizVideoMode = mode;
        document.getElementById('ebVideoTabFile').classList.toggle('active', mode === 'file');
        document.getElementById('ebVideoTabUrl').classList.toggle('active', mode === 'url');
        document.getElementById('ebVideoFileContent').classList.toggle('active', mode === 'file');
        document.getElementById('ebVideoUrlContent').classList.toggle('active', mode === 'url');
    };

    window.handleEditBizVideoFile = function(input) {
        const file = input.files[0];
        if (!file) return;
        if (!file.type.startsWith('video/')) {
            showToast('Solo se permiten archivos de video', 'error');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            showToast('El video no puede superar 50MB', 'error');
            return;
        }

        // Show local preview
        const preview = document.getElementById('ebVideoPreview');
        preview.style.display = 'block';
        preview.innerHTML = '<video src="' + URL.createObjectURL(file) + '" controls></video>';

        document.getElementById('ebVideoFileInfo').innerHTML =
            '<div class="eb-video-file-info"><i class="fas fa-check-circle"></i> ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + 'MB)</div>';

        // Upload
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('product_type', 'video');

        fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData,
        })
        .then(r => r.json())
        .then(data => {
            if (data.url) {
                document.getElementById('editBizVideoUrlHidden').value = data.url;
                showToast('Video subido correctamente', 'success');
            } else {
                showToast(data.error || 'Error al subir video', 'error');
            }
        })
        .catch(() => showToast('Error de conexion al subir video', 'error'));
    };

    function showEditBizVideoPreview(url) {
        if (!url) return;
        const preview = document.getElementById('ebVideoPreview');
        preview.style.display = 'block';
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (ytMatch) {
            preview.innerHTML = '<iframe src="https://www.youtube.com/embed/' + ytMatch[1] + '" allowfullscreen></iframe>';
            return;
        }
        const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
        if (ttMatch) {
            preview.innerHTML = '<iframe src="https://www.tiktok.com/embed/v2/' + ttMatch[1] + '" allowfullscreen></iframe>';
            return;
        }
        preview.innerHTML = '<video src="' + url + '" controls></video>';
    }

    window.saveEditBusiness = async function() {
        const id = document.getElementById('editBizId').value;
        if (!id) return;

        const btn = document.getElementById('editBizSaveBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const features = [];
            document.querySelectorAll('#editBizFeatures .eb-feature.checked').forEach(f => features.push(f.dataset.feature));

            const payload = {
                title: document.getElementById('editBizTitle').value,
                description: document.getElementById('editBizDesc').value,
                category: document.getElementById('editBizCat').value,
                business_type: document.getElementById('editBizType').value,
                phone: document.getElementById('editBizPhone').value,
                whatsapp: document.getElementById('editBizWhatsapp').value,
                email_contact: document.getElementById('editBizEmail').value,
                website: document.getElementById('editBizWebsite').value,
                instagram: document.getElementById('editBizInstagram').value,
                facebook: document.getElementById('editBizFacebook').value,
                twitter: document.getElementById('editBizTwitter').value,
                tiktok: document.getElementById('editBizTiktok').value,
                youtube: document.getElementById('editBizYoutube').value,
                address: document.getElementById('editBizAddress').value,
                city: document.getElementById('editBizCity').value,
                state: document.getElementById('editBizState').value,
                lat: parseFloat(document.getElementById('editBizLat').value) || null,
                lng: parseFloat(document.getElementById('editBizLng').value) || null,
                schedule: document.getElementById('editBizSchedule').value,
                features: features.join(','),
                video_url: document.getElementById('editBizVideoUrlHidden').value || document.getElementById('editBizVideoUrl').value || '',
            };

            await api.put('/businesses/' + id, payload);
            showToast('Negocio actualizado exitosamente', 'success');
            closeEditBusinessModal();
            // Reload current section
            const activeSection = document.querySelector('.sidebar-link.active');
            if (activeSection) switchSection(activeSection.dataset.section);
            else loadOverviewData();
        } catch(e) {
            showToast(e.message || 'Error al guardar', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        }
    };


    // ─── My Inmuebles (Properties) ─────────────────────────────
    const PROPERTY_TYPE_LABELS = {
        casa: 'Casa',
        apartamento: 'Apartamento',
        terreno: 'Terreno',
        local_comercial: 'Local Comercial',
        oficina: 'Oficina',
        hotel: 'Hotel',
        finca: 'Finca',
        galpon: 'Galpón',
        estacionamiento: 'Estacionamiento',
        otro: 'Otro',
    };

    const OPERATION_LABELS = {
        venta: 'Venta',
        alquiler: 'Alquiler',
        venta_alquiler: 'Venta y Alquiler',
    };

    function getPropertyTypeLabel(type) {
        return PROPERTY_TYPE_LABELS[type] || type || '--';
    }

    function getOperationLabel(op) {
        return OPERATION_LABELS[op] || op || '--';
    }

    function getPropertyStatusColor(status) {
        const colors = { approved: '#059669', pending: '#d97706', rejected: '#dc2626' };
        return colors[status] || '#64748b';
    }

    async function loadMyInmuebles(statusFilter) {
        const grid = document.getElementById('myPropertiesGrid');
        if (!grid || !currentUser) return;

        // Show loading
        grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Cargando inmuebles...</p></div>';

        try {
            let url = `/properties?user_id=${currentUser.id}&limit=50`;
            if (statusFilter) url += `&status=${statusFilter}`;

            const data = await api.get(url);
            const properties = data.properties || data.data || [];

            if (properties.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column:1/-1;">
                        <i class="fas fa-home"></i>
                        <p>${statusFilter ? 'No hay inmuebles con ese filtro.' : 'No tienes inmuebles publicados.'}</p>
                        <a href="new-property.html" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> Publicar Inmueble</a>
                    </div>
                `;
                return;
            }

            const placeholderImg = 'data:image/svg+xml,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23e0e0e0"><rect width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="16" font-family="sans-serif">Sin imagen</text></svg>'
            );

            grid.innerHTML = properties.map(p => {
                const cover = p.cover_image || p.images?.[0]?.url || '';
                const imgSrc = cover || placeholderImg;
                const typeLabel = getPropertyTypeLabel(p.property_type || p.type);
                const opLabel = getOperationLabel(p.operation);
                const statusColor = getPropertyStatusColor(p.status);
                const price = p.price ? formatPrice(p.price, p.currency) : 'Precio no disponible';
                const city = p.city || '--';

                return `
                    <article class="business-card" style="display:flex;flex-direction:column;">
                        <div class="business-card-image">
                            <img src="${imgSrc}" alt="${escapeAttr(p.title)}" loading="lazy" onerror="this.src='${placeholderImg}'">
                            <div class="business-card-badges">
                                <span class="card-badge badge-type">${typeLabel}</span>
                                <span class="card-badge" style="background:#6366f1;color:#fff;">${opLabel}</span>
                                <span class="card-badge" style="background:${statusColor};color:#fff;">${getStatusLabel(p.status)}</span>
                            </div>
                        </div>
                        <div class="business-card-body" style="flex:1;display:flex;flex-direction:column;">
                            <h3 class="business-card-title">${truncateText(p.title, 40)}</h3>
                            <p class="business-card-location"><i class="fas fa-map-marker-alt"></i> ${city}</p>
                            <p style="font-size:0.9rem;font-weight:700;color:#059669;margin:4px 0;">${price}</p>
                            <p style="font-size:0.72rem;color:#94a3b8;margin-bottom:8px;"><i class="fas fa-eye"></i> ${p.views || 0} vistas</p>
                            <div style="margin-top:auto;display:flex;gap:6px;flex-wrap:wrap;">
                                <a href="property-detail.html?id=${p.id}" class="btn btn-sm btn-secondary" title="Ver"><i class="fas fa-eye"></i> Ver</a>
                                <a href="new-property.html?id=${p.id}" class="btn btn-sm btn-secondary" title="Editar"><i class="fas fa-edit"></i> Editar</a>
                                <button class="btn btn-sm btn-danger" onclick="deleteMyInmueble(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </article>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading inmuebles:', error);
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error al cargar inmuebles.</p>
                </div>
            `;
        }
    }

    window.deleteMyInmueble = async function (id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este inmueble? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/properties/${id}`);
            showToast('Inmueble eliminado exitosamente', 'success');

            // Reload with current filter
            const filterSelect = document.getElementById('myPropsFilter');
            loadMyInmuebles(filterSelect ? filterSelect.value : '');
        } catch (error) {
            showToast(error.message || 'Error al eliminar el inmueble', 'error');
        }
    };

    // Wire up inmuebles filter
    const myPropsFilter = document.getElementById('myPropsFilter');
    if (myPropsFilter) {
        myPropsFilter.addEventListener('change', () => {
            loadMyInmuebles(myPropsFilter.value);
        });
    }

    // ─── Premium Plan System ──────────────────────────────────
    const planBadge = document.getElementById('planBadge');
    const premiumModal = document.getElementById('premiumModal');
    const premiumModalClose = document.getElementById('premiumModalClose');
    const premiumModalCancel = document.getElementById('premiumModalCancel');
    const premiumModalOverlay = document.getElementById('premiumModalOverlay');
    const premiumSubmitBtn = document.getElementById('premiumSubmitBtn');
    const premiumVoucherDrop = document.getElementById('premiumVoucherDrop');
    const premiumVoucherInput = document.getElementById('premiumVoucherInput');
    const premiumVoucherPreview = document.getElementById('premiumVoucherPreview');
    const premiumVoucherImg = document.getElementById('premiumVoucherImg');
    const premiumVoucherPlaceholder = document.getElementById('premiumVoucherPlaceholder');
    const premiumSubmitError = document.getElementById('premiumSubmitError');
    const premiumRefNumber = document.getElementById('premiumRefNumber');
    const planExpiryInfo = document.getElementById('planExpiryInfo');
    const quickActionProduct = document.getElementById('quickActionProduct');
    const adminTabPremium = document.getElementById('adminTabPremium');
    const adminPremiumBody = document.getElementById('adminPremiumBody');
    const adminPremiumBadge = document.getElementById('adminPremiumBadge');

    let selectedVoucherFile = null;

    function updatePlanDisplay() {
        if (!currentUser) return;
        const planType = currentUser.plan_type || 'basic';
        const isPremium = planType === 'premium';

        if (planBadge) {
            if (isPremium) {
                planBadge.className = 'plan-badge plan-badge-premium';
                planBadge.innerHTML = '<i class="fas fa-crown"></i> Premium';
            } else {
                planBadge.className = 'plan-badge plan-badge-basic';
                planBadge.innerHTML = '<i class="fas fa-user"></i> Basico';
            }
        }

        // Render action buttons dynamically
        const btnsContainer = document.getElementById('planActionBtns');
        if (btnsContainer) {
            if (isPremium) {
                btnsContainer.innerHTML = `
                    <span style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;font-weight:700;font-size:0.82rem;border:1px solid #fbbf24;">
                        <i class="fas fa-crown"></i> Plan Premium Activo
                    </span>`;
            } else {
                btnsContainer.innerHTML = `
                    <button class="btn" id="btnUpgradePremium" style="background:linear-gradient(135deg,#FFD700,#FFA500);color:#333;font-weight:700;font-size:0.85rem;padding:8px 18px;border-radius:8px;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                        <i class="fas fa-crown"></i> Solicitar Premium
                    </button>
                    <a href="planes.html" class="btn" style="background:#f1f5f9;color:#475569;font-weight:600;font-size:0.85rem;padding:8px 18px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
                        <i class="fas fa-star"></i> Ver Ventajas Premium
                    </a>`;
                // Re-bind the premium button
                const newBtn = document.getElementById('btnUpgradePremium');
                if (newBtn && premiumModal) {
                    newBtn.addEventListener('click', () => {
                        premiumModal.style.display = 'flex';
                        selectedVoucherFile = null;
                        if (premiumVoucherPreview) premiumVoucherPreview.style.display = 'none';
                        if (premiumVoucherPlaceholder) premiumVoucherPlaceholder.style.display = 'block';
                        if (premiumSubmitError) premiumSubmitError.style.display = 'none';
                        if (premiumVoucherInput) premiumVoucherInput.value = '';
                        if (premiumRefNumber) premiumRefNumber.value = '';
                        if (premiumPaymentPhone) premiumPaymentPhone.value = '';
                    });
                }
            }
        }

        if (planExpiryInfo) {
            if (isPremium && currentUser.plan_expires_at) {
                const expDate = new Date(currentUser.plan_expires_at);
                const now = new Date();
                if (expDate > now) {
                    const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
                    planExpiryInfo.querySelector('span').textContent = `Tu plan Premium esta vigente. Expira en ${daysLeft} dias (${expDate.toLocaleDateString('es-VE')}). Tus publicaciones nunca caducan.`;
                    planExpiryInfo.style.display = 'block';
                    planExpiryInfo.style.color = '#059669';
                } else {
                    planExpiryInfo.querySelector('span').textContent = 'Tu plan Premium ha expirado. Tus proximas publicaciones caducaran a los 20 dias.';
                    planExpiryInfo.style.display = 'block';
                    planExpiryInfo.style.color = '#d97706';
                }
            } else if (!isPremium) {
                planExpiryInfo.querySelector('span').textContent = 'Con el plan Basico, tus publicaciones caducan a los 20 dias. Mejora a Premium para que nunca caduquen.';
                planExpiryInfo.style.display = 'block';
                planExpiryInfo.style.color = '#64748b';
            }
        }
    }

    function setupPremiumModal() {
        if (!premiumModal) return;

        function openModal() {
            premiumModal.style.display = 'flex';
            selectedVoucherFile = null;
            if (premiumVoucherPreview) premiumVoucherPreview.style.display = 'none';
            if (premiumVoucherPlaceholder) premiumVoucherPlaceholder.style.display = 'block';
            if (premiumSubmitError) premiumSubmitError.style.display = 'none';
            if (premiumVoucherInput) premiumVoucherInput.value = '';
            if (premiumRefNumber) premiumRefNumber.value = '';
            if (premiumPaymentPhone) premiumPaymentPhone.value = '';
        }
        function closeModal() {
            premiumModal.style.display = 'none';
        }

        // Close handlers
        if (premiumModalClose) premiumModalClose.addEventListener('click', closeModal);
        if (premiumModalCancel) premiumModalCancel.addEventListener('click', closeModal);
        if (premiumModalOverlay) premiumModalOverlay.addEventListener('click', closeModal);

        // Upload from gallery button
        const voucherBtn = document.getElementById('premiumVoucherBtn');
        const cameraBtn = document.getElementById('premiumCameraBtn');
        const cameraInput = document.getElementById('premiumCameraInput');
        const voucherRemove = document.getElementById('premiumVoucherRemove');

        if (voucherBtn && premiumVoucherInput) {
            voucherBtn.addEventListener('click', () => premiumVoucherInput.click());
        }
        if (cameraBtn && cameraInput) {
            cameraBtn.addEventListener('click', () => cameraInput.click());
            cameraInput.addEventListener('change', () => {
                const file = cameraInput.files[0];
                if (file) handleVoucherFile(file);
            });
        }
        if (voucherRemove) {
            voucherRemove.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedVoucherFile = null;
                if (premiumVoucherPreview) premiumVoucherPreview.style.display = 'none';
                if (premiumVoucherPlaceholder) premiumVoucherPlaceholder.style.display = 'block';
                if (premiumVoucherInput) premiumVoucherInput.value = '';
                if (cameraInput) cameraInput.value = '';
            });
        }

        // Voucher upload (drag & drop + click on drop zone)
        if (premiumVoucherDrop && premiumVoucherInput) {
            premiumVoucherDrop.addEventListener('click', () => premiumVoucherInput.click());
            premiumVoucherDrop.addEventListener('dragover', (e) => {
                e.preventDefault();
                premiumVoucherDrop.style.borderColor = '#059669';
            });
            premiumVoucherDrop.addEventListener('dragleave', () => {
                premiumVoucherDrop.style.borderColor = '#d1d5db';
            });
            premiumVoucherDrop.addEventListener('drop', (e) => {
                e.preventDefault();
                premiumVoucherDrop.style.borderColor = '#d1d5db';
                const file = e.dataTransfer.files[0];
                if (file) handleVoucherFile(file);
            });
            premiumVoucherInput.addEventListener('change', () => {
                const file = premiumVoucherInput.files[0];
                if (file) handleVoucherFile(file);
            });
        }

        function handleVoucherFile(file) {
            if (!file.type.startsWith('image/')) {
                showError('Solo se permiten imagenes (JPG, PNG).');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showError('La imagen no debe superar 5MB.');
                return;
            }
            selectedVoucherFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                premiumVoucherImg.src = e.target.result;
                premiumVoucherPreview.style.display = 'block';
                premiumVoucherPlaceholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }

        // Submit
        if (premiumSubmitBtn) {
            premiumSubmitBtn.addEventListener('click', async () => {
                if (!selectedVoucherFile) {
                    showError('Debes adjuntar el comprobante de pago.');
                    return;
                }
                const refNumber = document.getElementById('premiumRefNumber');
                if (refNumber && !refNumber.value.trim()) {
                    showError('Debes ingresar el numero de referencia del pago.');
                    return;
                }

                premiumSubmitBtn.disabled = true;
                premiumSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
                premiumSubmitError.style.display = 'none';

                try {
                    const formData = new FormData();
                    formData.append('voucher', selectedVoucherFile);
                    formData.append('plan_duration', document.getElementById('premiumPlanDuration')?.value || '3_months');
                    formData.append('payment_phone', document.getElementById('premiumPaymentPhone')?.value || '');

                    const token = getToken();
                    const response = await fetch('/api/plans/request-upgrade', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData,
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        showError(data.error || 'Error al enviar la solicitud.');
                        return;
                    }

                    closeModal();
                    showToast(data.message || 'Solicitud enviada. Espera la aprobacion del administrador.', 'success');
                } catch (err) {
                    showError('Error de conexion. Intenta de nuevo.');
                } finally {
                    premiumSubmitBtn.disabled = false;
                    premiumSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitud';
                }
            });
        }

        function showError(msg) {
            if (premiumSubmitError) {
                premiumSubmitError.textContent = msg;
                premiumSubmitError.style.display = 'block';
            }
        }
    }

    // Quick action: open product modal
    if (quickActionProduct) {
        quickActionProduct.addEventListener('click', (e) => {
            e.preventDefault();
            const productModal = document.getElementById('productModal');
            if (productModal) {
                productModal.style.display = 'flex';
                const closeBtn = document.getElementById('productModalClose');
                if (closeBtn) closeBtn.click(); // reset
                productModal.style.display = 'flex';
            }
        });
    }

    // Admin: Premium Requests Tab
    function setupPremiumAdminTab() {
        if (!adminTabPremium) return;

        adminTabPremium.addEventListener('click', () => {
            // Deactivate other tabs
            [adminTabPending, adminTabAll, adminTabUsers, adminTabPremium].forEach(t => {
                if (t) t.classList.remove('active');
            });
            adminTabPremium.classList.add('active');

            // Hide other panels
            ['Pending', 'All', 'Users'].forEach(p => {
                const panel = document.getElementById('adminPanel' + p);
                if (panel) panel.classList.add('hidden');
            });
            const premiumPanel = document.getElementById('adminPanelPremium');
            if (premiumPanel) premiumPanel.classList.remove('hidden');

            loadPremiumRequests();
        });
    }

    async function loadPremiumRequests() {
        if (!adminPremiumBody) return;

        try {
            const data = await api.get('/premium-requests?status=pending&limit=50');
            const requests = data.requests || [];

            // Update badge
            if (adminPremiumBadge) {
                adminPremiumBadge.textContent = requests.length;
                adminPremiumBadge.style.display = requests.length > 0 ? 'inline' : 'none';
            }

            if (requests.length === 0) {
                adminPremiumBody.innerHTML = `
                    <tr class="empty-row"><td colspan="6">
                        <div class="empty-state">
                            <i class="fas fa-crown" style="color:#d97706;"></i>
                            <p>No hay solicitudes Premium pendientes.</p>
                        </div>
                    </td></tr>`;
                return;
            }

            adminPremiumBody.innerHTML = requests.map(r => {
                const durationLabel = r.plan_duration === '1_year' ? '1 Anio ($90)' : '3 Meses ($30)';
                const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('es-VE') : '--';
                return `
                    <tr>
                        <td><strong>${escapeHtml(r.user_name || 'Usuario')}</strong></td>
                        <td style="font-size:0.82rem;color:#64748b;">${escapeHtml(r.user_email || '')}</td>
                        <td><span class="badge" style="background:#fef3c7;color:#92400e;">${durationLabel}</span></td>
                        <td>
                            ${r.voucher_url ? `<img src="${r.voucher_url}" class="voucher-thumb" onclick="window._openVoucherLightbox('${r.voucher_url}')" alt="Voucher" onerror="this.style.display='none'">` : '<span style="color:#94a3b8;">Sin voucher</span>'}
                        </td>
                        <td style="font-size:0.82rem;">${dateStr}</td>
                        <td style="display:flex;gap:6px;flex-wrap:wrap;">
                            ${r.voucher_url ? `<button class="btn-view-voucher" onclick="window._openVoucherLightbox('${r.voucher_url}')"><i class="fas fa-eye"></i></button>` : ''}
                            <button class="btn-approve-premium" onclick="window._approvePremium(${r.id})"><i class="fas fa-check"></i> Aprobar</button>
                            <button class="btn-reject-premium" onclick="window._rejectPremium(${r.id})"><i class="fas fa-times"></i> Rechazar</button>
                        </td>
                    </tr>`;
            }).join('');
        } catch (error) {
            console.error('Error loading premium requests:', error);
            adminPremiumBody.innerHTML = `<tr class="empty-row"><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error al cargar solicitudes.</p></div></td></tr>`;
        }
    }

    // Global functions for admin premium actions
    window._openVoucherLightbox = function(url) {
        const lb = document.createElement('div');
        lb.className = 'voucher-lightbox';
        lb.innerHTML = `<button class="voucher-lightbox-close" onclick="this.parentElement.remove()">&times;</button><img src="${url}" alt="Voucher">`;
        lb.addEventListener('click', (e) => { if (e.target === lb) lb.remove(); });
        document.body.appendChild(lb);
    };

    window._approvePremium = async function(id) {
        if (!confirm('¿Aprobar esta solicitud Premium? El usuario tendra acceso inmediato a los beneficios Premium.')) return;
        try {
            await api.post(`/premium-requests/${id}/approve`);
            showToast('Solicitud aprobada. El usuario ahora es Premium.', 'success');
            loadPremiumRequests();
        } catch (err) {
            showToast(err.message || 'Error al aprobar', 'error');
        }
    };

    window._rejectPremium = async function(id) {
        const notes = prompt('Motivo del rechazo (opcional):');
        if (notes === null) return; // cancelled
        try {
            await api.post(`/premium-requests/${id}/reject`, { admin_notes: notes });
            showToast('Solicitud rechazada.', 'info');
            loadPremiumRequests();
        } catch (err) {
            showToast(err.message || 'Error al rechazar', 'error');
        }
    };

    // Premium admin tab is now initialized inside initDashboard() when user is admin

    // ─── Admin: Manual Premium Activation ──────────────────
    let manualPremiumSelectedUser = null;
    const manualModal = document.getElementById('manualPremiumModal');
    const btnManualPremium = document.getElementById('btnManualPremium');

    function openManualPremiumModal(userId, userName, userEmail) {
        if (!manualModal) return;
        manualModal.style.display = 'flex';
        const searchInput = document.getElementById('manualPremiumSearch');
        const resultDiv = document.getElementById('manualPremiumUserResult');
        const actionsDiv = document.getElementById('manualPremiumActions');
        const activateBtn = document.getElementById('manualPremiumActivateBtn');
        const errDiv = document.getElementById('manualPremiumError');

        errDiv.style.display = 'none';

        if (userId) {
            // Called from user row button - pre-fill
            searchInput.value = userEmail || userName || '';
            manualPremiumSelectedUser = { id: userId, name: userName, email: userEmail };
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `<div style="display:flex;align-items:center;gap:10px;"><div style="width:36px;height:36px;border-radius:50%;background:#059669;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${(userName||'U')[0].toUpperCase()}</div><div><strong>${userName}</strong><br><span style="font-size:0.82rem;color:#64748b;">${userEmail}</span></div></div>`;
            actionsDiv.style.display = 'block';
            activateBtn.disabled = false;
        } else {
            searchInput.value = '';
            resultDiv.style.display = 'none';
            actionsDiv.style.display = 'none';
            activateBtn.disabled = true;
            searchInput.focus();
        }
    }

    window._openManualPremium = function(userId, userName, userEmail) {
        openManualPremiumModal(userId, userName, userEmail);
    };

    if (btnManualPremium) {
        btnManualPremium.addEventListener('click', () => openManualPremiumModal());
    }

    // Close handlers
    const manualClose = document.getElementById('manualPremiumClose');
    const manualCancel = document.getElementById('manualPremiumCancelBtn');
    const manualOverlay = document.getElementById('manualPremiumOverlay');
    if (manualClose) manualClose.addEventListener('click', () => { manualModal.style.display = 'none'; });
    if (manualCancel) manualCancel.addEventListener('click', () => { manualModal.style.display = 'none'; });
    if (manualOverlay) manualOverlay.addEventListener('click', () => { manualModal.style.display = 'none'; });

    // Search user
    const manualSearchBtn = document.getElementById('manualPremiumSearchBtn');
    if (manualSearchBtn) {
        manualSearchBtn.addEventListener('click', async () => {
            const query = document.getElementById('manualPremiumSearch').value.trim();
            if (!query) return;
            const resultDiv = document.getElementById('manualPremiumUserResult');
            const actionsDiv = document.getElementById('manualPremiumActions');
            const activateBtn = document.getElementById('manualPremiumActivateBtn');
            const errDiv = document.getElementById('manualPremiumError');
            errDiv.style.display = 'none';

            try {
                const data = await api.get('/users?search=' + encodeURIComponent(query) + '&limit=5');
                const users = data.users || [];
                if (users.length === 0) {
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = '<p style="color:#ef4444;font-size:0.85rem;">No se encontro ningun usuario.</p>';
                    actionsDiv.style.display = 'none';
                    activateBtn.disabled = true;
                    manualPremiumSelectedUser = null;
                    return;
                }
                // Pick first result
                const u = users[0];
                manualPremiumSelectedUser = { id: u.id, name: u.name, email: u.email };
                resultDiv.style.display = 'block';
                const planInfo = u.plan_type === 'premium' ? ' <span style="color:#f59e0b;font-weight:700;">(YA ES PREMIUM)</span>' : '';
                resultDiv.innerHTML = `<div style="display:flex;align-items:center;gap:10px;"><div style="width:36px;height:36px;border-radius:50%;background:#059669;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${(u.name||'U')[0].toUpperCase()}</div><div><strong>${u.name}</strong>${planInfo}<br><span style="font-size:0.82rem;color:#64748b;">${u.email}</span></div></div>`;
                actionsDiv.style.display = u.plan_type !== 'premium' ? 'block' : 'none';
                activateBtn.disabled = u.plan_type === 'premium';
            } catch (e) {
                errDiv.textContent = 'Error al buscar usuario.';
                errDiv.style.display = 'block';
            }
        });
    }

    // Activate premium
    const manualActivateBtn = document.getElementById('manualPremiumActivateBtn');
    if (manualActivateBtn) {
        manualActivateBtn.addEventListener('click', async () => {
            if (!manualPremiumSelectedUser) return;
            if (!confirm(`Activar plan Premium para ${manualPremiumSelectedUser.name}?`)) return;

            manualActivateBtn.disabled = true;
            manualActivateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activando...';

            try {
                const duration = document.getElementById('manualPremiumDuration').value;
                const notes = document.getElementById('manualPremiumNotes').value;
                await api.post('/users/activate-premium', {
                    user_id: manualPremiumSelectedUser.id,
                    duration: duration,
                    admin_notes: notes,
                });
                showToast(`Premium activado para ${manualPremiumSelectedUser.name}`, 'success');
                manualModal.style.display = 'none';
                loadAdminUsers(); // Refresh user list
            } catch (e) {
                const errDiv = document.getElementById('manualPremiumError');
                if (errDiv) { errDiv.textContent = e.message || 'Error al activar Premium'; errDiv.style.display = 'block'; }
            } finally {
                manualActivateBtn.disabled = false;
                manualActivateBtn.innerHTML = '<i class="fas fa-crown"></i> Activar Premium';
            }
        });
    }


})();
