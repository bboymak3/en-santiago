/**
 * Un Click - Admin Panel Module
 * Loaded on admin.html
 */

(function () {
    'use strict';

    // ─── State ──────────────────────────────────────────────────
    let currentTab = 'dashboard';
    let currentDeleteAction = null; // { type, id, callback }
    let currentRejectId = null;

    // Pagination state
    let propsPage = 1;
    let usersPage = 1;
    let msgsPage = 1;
    let jobsPage = 1;
    let inmueblesPage = 1;
    let productsPage = 1;
    const PAGE_LIMIT = 15;

    // ─── DOM Elements ───────────────────────────────────────────
    const adminDate = document.getElementById('adminDate');
    const adminPageTitle = document.getElementById('adminPageTitle');
    const adminSidebarToggle = document.getElementById('adminSidebarToggle');
    const adminSidebar = document.getElementById('adminSidebar');

    // Tab panels
    const tabDashboard = document.getElementById('tabDashboard');
    const tabProperties = document.getElementById('tabProperties');
    const tabUsers = document.getElementById('tabUsers');
    const tabMessages = document.getElementById('tabMessages');
    const tabFacebook = document.getElementById('tabFacebook');
    const tabJobs = document.getElementById('tabJobs');
    const tabInmuebles = document.getElementById('tabInmuebles');
    const tabSettings = document.getElementById('tabSettings');

    // Stat elements
    const adminTotalProps = document.getElementById('adminTotalProps');
    const adminPendingProps = document.getElementById('adminPendingProps');
    const adminTotalUsers = document.getElementById('adminTotalUsers');
    const adminTotalMsgs = document.getElementById('adminTotalMsgs');
    const adminPendingBadge = document.getElementById('adminPendingBadge');
    const adminMsgBadge = document.getElementById('adminMsgBadge');

    // Modals
    const adminDeleteModal = document.getElementById('adminDeleteModal');
    const adminDeleteMsg = document.getElementById('adminDeleteMsg');
    const adminDeleteConfirm = document.getElementById('adminDeleteConfirm');
    const adminDeleteCancel = document.getElementById('adminDeleteCancel');
    const adminDeleteModalClose = document.getElementById('adminDeleteModalClose');

    const adminRejectModal = document.getElementById('adminRejectModal');
    const adminRejectConfirm = document.getElementById('adminRejectConfirm');
    const adminRejectCancel = document.getElementById('adminRejectCancel');
    const adminRejectModalClose = document.getElementById('adminRejectModalClose');
    const rejectReason = document.getElementById('rejectReason');

    const adminUserModal = document.getElementById('adminUserModal');
    const adminUserModalSave = document.getElementById('adminUserModalSave');
    const adminUserModalCancel = document.getElementById('adminUserModalCancel');
    const adminUserModalClose = document.getElementById('adminUserModalClose');

    const adminBusinessModal = document.getElementById('adminBusinessModal');
    const adminPropModalClose = document.getElementById('adminPropModalClose');

    const adminMsgModal = document.getElementById('adminMsgModal');
    const adminMsgModalClose = document.getElementById('adminMsgModalClose');
    const adminMsgModalCloseBtn = document.getElementById('adminMsgModalCloseBtn');

    // Business Edit Modal
    const adminBizEditModal = document.getElementById('adminBusinessEditModal');
    const adminBizEditClose = document.getElementById('adminBizEditClose');
    const adminBizEditSave = document.getElementById('adminBizEditSave');
    const adminBizEditCancel = document.getElementById('adminBizEditCancel');

    // ─── Initialization ─────────────────────────────────────────
    async function init() {
        // Check auth
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Check admin role
        const user = getCachedUser();
        if (!user || user.role !== 'admin') {
            showToast('Acceso denegado. Solo administradores.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            return;
        }

        // Set current date
        if (adminDate) {
            adminDate.textContent = new Date().toLocaleDateString('es-VE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        }

        // Setup event listeners
        setupTabNavigation();
        setupSidebarToggle();
        setupModals();
        setupFilterListeners();
        setupFacebookListeners();
        setupJobListeners();
        setupB2Modal();
        setupBusinessEditModal();
        setupInmueblesListeners();
        loadBusinessesForJobSelect();

        // Load initial data
        loadDashboardTab();
    }

    // ─── Tab Navigation ─────────────────────────────────────────
    function setupTabNavigation() {
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.tab;
                if (tab) switchTab(tab);
            });
        });

        // Also handle data-tab links inside cards
        document.querySelectorAll('[data-tab]').forEach(el => {
            if (el.tagName === 'A') {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tab = el.dataset.tab;
                    if (tab) switchTab(tab);
                });
            }
        });
    }

    function switchTab(tab) {
        currentTab = tab;

        // Update nav links
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tab);
        });

        // Hide all tab panels
        const panels = { dashboard: tabDashboard, businesses: tabProperties, users: tabUsers, messages: tabMessages, facebook: tabFacebook, jobs: tabJobs, inmuebles: tabInmuebles, settings: tabSettings };
        for (const [key, panel] of Object.entries(panels)) {
            if (panel) {
                panel.classList.toggle('hidden', key !== tab);
            }
        }

        // Update page title
        const titles = { dashboard: 'Dashboard', businesses: 'Negocios', users: 'Usuarios', messages: 'Mensajes', facebook: 'Facebook Import', jobs: 'Empleo', inmuebles: 'Inmuebles', settings: 'Configuración' };
        if (adminPageTitle) {
            adminPageTitle.textContent = titles[tab] || 'Dashboard';
        }

        // Load tab data
        switch (tab) {
            case 'dashboard':
                loadDashboardTab();
                break;
            case 'businesses':
                propsPage = 1;
                loadProperties();
                break;
            case 'users':
                usersPage = 1;
                loadUsers();
                break;
            case 'messages':
                msgsPage = 1;
                loadMessages();
                break;
            case 'facebook':
                loadFacebookConfig();
                loadFacebookHistory();
                break;
            case 'products':
                productsPage = 1;
                loadProducts();
                break;
            case 'jobs':
                jobsPage = 1;
                loadJobs();
                break;
            case 'inmuebles':
                inmueblesPage = 1;
                loadInmueblesTab();
                break;
            case 'settings':
                loadSettings();
                break;
        }

        // Close sidebar on mobile
        if (adminSidebar) {
            adminSidebar.classList.remove('active');
        }
    }

    // ─── Sidebar Toggle ─────────────────────────────────────────
    function setupSidebarToggle() {
        if (adminSidebarToggle && adminSidebar) {
            adminSidebarToggle.addEventListener('click', () => {
                adminSidebar.classList.toggle('active');
            });
        }
    }

    // ─── Dashboard Stats ────────────────────────────────────────
    async function loadDashboardStats() {
        try {
            const data = await api.get('/stats');
            if (data.stats) {
                const s = data.stats;
                if (adminTotalProps) adminTotalProps.textContent = s.total_businesses || 0;
                if (adminPendingProps) adminPendingProps.textContent = s.pending_businesses || 0;
                if (adminTotalUsers) adminTotalUsers.textContent = s.total_users || 0;
                if (adminTotalMsgs) adminTotalMsgs.textContent = s.total_contacts || 0;
                if (adminPendingBadge) adminPendingBadge.textContent = s.pending_businesses || 0;
                if (adminMsgBadge) adminMsgBadge.textContent = s.unread_contacts || 0;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async function loadDashboardTab() {
        await loadDashboardStats();
        loadRecentActivity();
        loadRecentProperties();
        loadRecentUsers();
    }

    function loadRecentActivity() {
        // Activity is derived from recent businesses for now
    }

    async function loadRecentProperties() {
        const tbody = document.getElementById('adminRecentProps');
        if (!tbody) return;

        try {
            const data = await api.get('/businesses?status=&limit=5&page=1');
            const businesses = data.businesses || [];

            if (businesses.length === 0) {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="5"><div class="empty-state-sm"><p>No hay propiedades.</p></div></td></tr>';
                return;
            }

            tbody.innerHTML = businesses.map(p => `
                <tr>
                    <td>${truncateText(p.title, 40)}</td>
                    <td>${getBusinessTypeLabel(p.business_type)}</td>
                    <td>${p.owner_name || '--'}</td>
                    <td>${getStatusBadge(p.status)}</td>
                    <td>${formatDate(p.created_at)}</td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5"><div class="empty-state-sm"><p>Error al cargar.</p></div></td></tr>';
        }
    }

    async function loadRecentUsers() {
        const tbody = document.getElementById('adminRecentUsers');
        if (!tbody) return;

        try {
            const data = await api.get('/users?limit=5&page=1');
            const users = data.users || [];

            if (users.length === 0) {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="5"><div class="empty-state-sm"><p>No hay usuarios.</p></div></td></tr>';
                return;
            }

            tbody.innerHTML = users.map(u => `
                <tr>
                    <td>${u.name || '--'}</td>
                    <td>${u.email || '--'}</td>
                    <td><span class="badge badge-${u.role === 'admin' ? 'info' : 'default'}">${u.role === 'admin' ? 'Admin' : 'Usuario'}</span></td>
                    <td>${u.is_active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
                    <td>${formatDate(u.created_at)}</td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5"><div class="empty-state-sm"><p>Error al cargar.</p></div></td></tr>';
        }
    }

    // ─── Properties Management ──────────────────────────────────
    async function loadProperties() {
        const tbody = document.getElementById('adminPropsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr class="empty-row"><td colspan="10"><div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div></td></tr>';

        try {
            // Build query params
            const statusFilter = document.getElementById('adminPropStatusFilter')?.value || '';
            const typeFilter = document.getElementById('adminPropTypeFilter')?.value || '';
            const searchVal = document.getElementById('adminPropSearch')?.value || '';

            let endpoint = `/businesses?status=${statusFilter || ''}&page=${propsPage}&limit=${PAGE_LIMIT}`;
            if (typeFilter) endpoint += `&business_type=${typeFilter}`;
            if (searchVal) endpoint += `&search=${encodeURIComponent(searchVal)}`;

            const data = await api.get(endpoint);
            const businesses = data.businesses || [];

            if (businesses.length === 0) {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="10"><div class="empty-state-sm"><p>No se encontraron propiedades.</p></div></td></tr>';
                return;
            }

            tbody.innerHTML = businesses.map(p => {
                const coverImg = p.cover_image || '';
                return `
                    <tr data-business-id="${p.id}">
                        <td>${p.id}</td>
                        <td>${coverImg ? `<img src="${coverImg}" alt="" class="admin-thumb" onerror="this.style.display='none'">` : '<div class="admin-thumb-placeholder"><i class="fas fa-image"></i></div>'}</td>
                        <td><a href="/negocio/${p.slug || p.id}" target="_blank" title="${p.title}">${truncateText(p.title, 35)}</a></td>
                        <td>${getBusinessTypeLabel(p.business_type)}</td>
                        <td>${p.city || '--'}, ${p.state || '--'}</td>
                        <td>${p.owner_name || '--'}</td>
                        <td>${getStatusBadge(p.status)}</td>
                        <td>${p.featured ? '<i class="fas fa-star text-warning"></i>' : '<i class="far fa-star text-muted"></i>'}</td>
                        <td class="admin-actions">
                            <button class="btn btn-xs btn-outline" onclick="window.admin.viewBusiness(${p.id})" title="Ver"><i class="fas fa-eye"></i></button>
                            <button class="btn btn-xs btn-outline" onclick="window.admin.editBusiness(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
                            ${p.status === 'pending' ? `
                                <button class="btn btn-xs btn-success" onclick="window.admin.approveBusiness(${p.id})" title="Aprobar"><i class="fas fa-check"></i></button>
                                <button class="btn btn-xs btn-danger" onclick="window.admin.rejectBusiness(${p.id})" title="Rechazar"><i class="fas fa-ban"></i></button>
                            ` : ''}
                            <button class="btn btn-xs btn-outline" onclick="window.admin.toggleFeatured(${p.id}, ${p.featured ? 0 : 1})" title="Destacada"><i class="fas fa-star"></i></button>
                            <button class="btn btn-xs btn-danger" onclick="window.admin.deleteBusiness(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Pagination
            renderAdminPagination('adminPropsPagination', data.pagination, (page) => {
                propsPage = page;
                loadProperties();
            });

        } catch (error) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="10"><div class="empty-state-sm"><p>Error al cargar propiedades.</p></div></td></tr>';
            showToast(error.message, 'error');
        }
    }

    async function viewBusiness(businessId) {
        if (!adminBusinessModal) return;

        const modalBody = document.getElementById('adminPropModalBody');
        const modalTitle = document.getElementById('adminPropModalTitle');
        const modalFooter = document.getElementById('adminPropModalFooter');

        if (modalBody) modalBody.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';

        adminBusinessModal.classList.remove('hidden');

        try {
            const business = await api.get(`/businesses/${businessId}`);

            if (modalTitle) modalTitle.textContent = business.title || 'Negocio';

            const images = business.images || [];
            const imgHTML = images.length > 0
                ? images.map(img => `<img src="${img.url}" alt="" class="admin-modal-thumb" onerror="this.style.display='none'">`).join('')
                : '<p class="text-muted">Sin imágenes</p>';

            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="admin-prop-detail">
                        <div class="admin-prop-images">${imgHTML}</div>
                        <div class="admin-prop-info">
                            <div class="detail-row"><strong>Tipo:</strong> ${getBusinessTypeLabel(business.business_type)}</div>
                            <div class="detail-row"><strong>Categoría:</strong> ${business.category_name || '--'}</div>
                            <div class="detail-row"><strong>Dirección:</strong> ${business.address || '--'}</div>
                            <div class="detail-row"><strong>Ubicación:</strong> ${business.city || '--'}, ${business.state || '--'}</div>
                            <div class="detail-row"><strong>Teléfono:</strong> ${business.phone || '--'}</div>
                            <div class="detail-row"><strong>WhatsApp:</strong> ${business.whatsapp || '--'}</div>
                            <div class="detail-row"><strong>Propietario:</strong> ${business.owner_name || '--'} (${business.owner_email || business.owner_phone || '--'})</div>
                            <div class="detail-row"><strong>Estado:</strong> ${getStatusBadge(business.status)}</div>
                            <div class="detail-row"><strong>Vistas:</strong> ${business.views || 0}</div>
                            <div class="detail-row"><strong>Destacada:</strong> ${business.featured ? 'Sí' : 'No'}</div>
                            <div class="detail-row"><strong>Creada:</strong> ${formatDateTime(business.created_at)}</div>
                            <div class="detail-row"><strong>Descripción:</strong> ${business.description || 'Sin descripción'}</div>
                        </div>
                    </div>
                `;
            }

            if (modalFooter) {
                modalFooter.innerHTML = `
                    <button class="btn btn-primary" onclick="document.getElementById('adminBusinessModal').classList.add('hidden'); window.admin.editBusiness(${businessId});">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    ${business.status === 'pending' ? `
                        <button class="btn btn-success" onclick="window.admin.approveBusiness(${businessId}); document.getElementById('adminBusinessModal').classList.add('hidden');">
                            <i class="fas fa-check"></i> Aprobar
                        </button>
                        <button class="btn btn-danger" onclick="window.admin.rejectBusiness(${businessId}); document.getElementById('adminBusinessModal').classList.add('hidden');">
                            <i class="fas fa-ban"></i> Rechazar
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="document.getElementById('adminBusinessModal').classList.add('hidden');">Cerrar</button>
                `;
            }
        } catch (error) {
            if (modalBody) modalBody.innerHTML = `<p class="text-danger">Error al cargar la propiedad: ${error.message}</p>`;
        }
    }

    async function approveBusiness(id) {
        try {
            await api.post(`/businesses/${id}/approve`);
            showToast('Propiedad aprobada exitosamente', 'success');
            loadProperties();
            loadDashboardStats();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    function rejectBusiness(id) {
        currentRejectId = id;
        if (rejectReason) rejectReason.value = '';
        if (adminRejectModal) adminRejectModal.classList.remove('hidden');
    }

    async function confirmReject() {
        if (!currentRejectId) return;

        try {
            await api.post(`/businesses/${currentRejectId}/reject`);
            showToast('Propiedad rechazada', 'info');
            closeRejectModal();
            loadProperties();
            loadDashboardStats();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    function closeRejectModal() {
        if (adminRejectModal) adminRejectModal.classList.add('hidden');
        currentRejectId = null;
    }

    async function toggleFeatured(id, featured) {
        try {
            await api.put(`/businesses/${id}`, { featured: featured ? 1 : 0 });
            showToast(featured ? 'Propiedad marcada como destacada' : 'Propiedad removida de destacadas', 'success');
            loadProperties();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    function deleteBusiness(id) {
        if (adminDeleteMsg) adminDeleteMsg.textContent = '¿Estás seguro de que deseas eliminar esta propiedad? Esta acción no se puede deshacer y se eliminarán todas sus imágenes.';
        currentDeleteAction = { type: 'business', id };
        if (adminDeleteModal) adminDeleteModal.classList.remove('hidden');
    }

    async function confirmDelete() {
        if (!currentDeleteAction) return;

        try {
            if (currentDeleteAction.type === 'business') {
                await api.delete(`/businesses/${currentDeleteAction.id}`);
                showToast('Propiedad eliminada exitosamente', 'success');
                loadProperties();
                loadDashboardStats();
            } else if (currentDeleteAction.type === 'user') {
                await api.delete(`/users/${currentDeleteAction.id}`);
                showToast('Usuario eliminado exitosamente', 'success');
                loadUsers();
                loadDashboardStats();
            }
            closeDeleteModal();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    function closeDeleteModal() {
        if (adminDeleteModal) adminDeleteModal.classList.add('hidden');
        currentDeleteAction = null;
    }

    // ─── Users Management ───────────────────────────────────────
    async function loadUsers() {
        const tbody = document.getElementById('adminUsersTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div></td></tr>';

        try {
            const roleFilter = document.getElementById('adminUserRoleFilter')?.value || '';
            const searchVal = document.getElementById('adminUserSearch')?.value || '';

            let endpoint = `/users?page=${usersPage}&limit=${PAGE_LIMIT}`;
            if (roleFilter) endpoint += `&role=${roleFilter}`;
            if (searchVal) endpoint += `&search=${encodeURIComponent(searchVal)}`;

            const data = await api.get(endpoint);
            const users = data.users || [];

            if (users.length === 0) {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state-sm"><p>No se encontraron usuarios.</p></div></td></tr>';
                return;
            }

            const myUser = getCachedUser();
            const myId = myUser ? myUser.id : null;

            tbody.innerHTML = users.map(u => {
                const initials = (u.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                const avatarHTML = u.avatar
                    ? `<div class="admin-user-avatar"><img src="${u.avatar}" alt=""></div>`
                    : `<div class="admin-user-avatar">${initials}</div>`;
                const isSelf = myId && (String(u.id) === String(myId));
                const currentRole = u.role || 'user';
                const selfLabel = isSelf ? ' <span style="color:#aaa;font-size:0.7rem">(Tú)</span>' : '';

                // Role toggle
                let toggleHTML = `<div class="role-toggle" data-user-id="${u.id}" data-current-role="${currentRole}">`;
                toggleHTML += `<button class="role-toggle-btn ${currentRole === 'admin' ? 'active-admin' : ''} ${isSelf ? 'self-badge' : ''}" data-role="admin" ${isSelf ? 'disabled' : ''}><i class="fas fa-shield-alt"></i> Admin</button>`;
                toggleHTML += `<button class="role-toggle-btn ${currentRole === 'user' ? 'active-user' : ''} ${isSelf ? 'self-badge' : ''}" data-role="user" ${isSelf ? 'disabled' : ''}><i class="fas fa-user"></i> User</button>`;
                toggleHTML += `</div>`;

                return `
                    <tr data-user-id="${u.id}">
                        <td>${u.id}</td>
                        <td>
                            <div class="admin-user-cell">
                                ${avatarHTML}
                                <div>
                                    <div class="admin-user-name">${u.name || '--'}${selfLabel}</div>
                                </div>
                            </div>
                        </td>
                        <td style="font-size:0.83rem; color:#666;">${u.email || '--'}</td>
                        <td style="font-size:0.83rem;">${u.phone || '<span style="color:#ccc">—</span>'}</td>
                        <td>
                            <span class="admin-role-badge-inline role-${currentRole}">
                                <i class="fas ${currentRole === 'admin' ? 'fa-shield-alt' : 'fa-user'}"></i>
                                ${currentRole === 'admin' ? 'Admin' : 'Usuario'}
                            </span>
                        </td>
                        <td>${u.is_active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
                        <td style="text-align:center; font-weight:600;">${u.business_count || 0}</td>
                        <td><span class="admin-user-date">${formatDate(u.created_at)}</span></td>
                        <td>
                            ${toggleHTML}
                            <div style="margin-top:6px; display:flex; gap:4px;">
                                <button class="btn btn-xs btn-outline" onclick="window.admin.editUser(${u.id})" title="Editar usuario"><i class="fas fa-edit"></i> Editar</button>
                                <button class="btn btn-xs btn-danger" onclick="window.admin.deleteUser(${u.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            // Attach role toggle handlers
            tbody.querySelectorAll('.role-toggle-btn:not([disabled])').forEach(btn => {
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

            renderAdminPagination('adminUsersPagination', data.pagination, (page) => {
                usersPage = page;
                loadUsers();
            });

        } catch (error) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state-sm"><p>Error al cargar usuarios.</p></div></td></tr>';
            showToast(error.message, 'error');
        }
    }

    async function toggleUserRole(userId, newRole, toggleEl) {
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

            // Update role badge inline
            const row = toggleEl.closest('tr');
            if (row) {
                const badgeCell = row.querySelectorAll('td')[4];
                if (badgeCell) {
                    badgeCell.innerHTML = `
                        <span class="admin-role-badge-inline role-${newRole}">
                            <i class="fas ${newRole === 'admin' ? 'fa-shield-alt' : 'fa-user'}"></i>
                            ${newRole === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                    `;
                }
            }

            // Refresh stats and dashboard
            loadDashboardStats();
        } catch (error) {
            showToast(error.message || 'Error al cambiar rol', 'error');
            buttons.forEach(b => b.classList.remove('saving-role'));
        }
    }

    async function editUser(userId) {
        if (!adminUserModal) return;

        // Show loading state
        const modalBody = adminUserModal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = '<div class="loading-spinner" style="padding:40px;text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#1a73e8;"></i><p style="margin-top:12px;color:#888;">Cargando datos del usuario...</p></div>';
        }
        adminUserModal.classList.remove('hidden');

        try {
            const user = await api.get(`/users/${userId}`);

            // Rebuild the modal body with the user data
            if (modalBody) {
                const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                const avatarHTML = user.avatar
                    ? `<div class="edit-user-avatar"><img src="${user.avatar}" alt=""></div>`
                    : `<div class="edit-user-avatar"><span>${initials}</span></div>`;
                const date = user.created_at ? new Date(user.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

                modalBody.innerHTML = `
                    <!-- User Header -->
                    <div class="edit-user-header">
                        ${avatarHTML}
                        <div class="edit-user-meta">
                            <div class="edit-user-id">ID: <strong>${user.id}</strong></div>
                            <div class="edit-user-joined"><i class="fas fa-calendar"></i> Registro: ${date}</div>
                            <div class="edit-user-props"><i class="fas fa-building"></i> ${user.business_count || 0} propiedades</div>
                        </div>
                    </div>

                    <form id="adminUserEditForm">
                        <!-- Datos Básicos -->
                        <div class="edit-user-section">
                            <div class="edit-user-section-title"><i class="fas fa-id-card"></i> Datos Básicos</div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editUserName">Nombre Completo</label>
                                    <div class="profile-input-wrapper">
                                        <i class="fas fa-user"></i>
                                        <input type="text" id="editUserName" name="name" class="form-control" required value="${(user.name || '').replace(/"/g, '&quot;')}" placeholder="Nombre del usuario">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editUserEmail">Correo Electrónico</label>
                                    <div class="profile-input-wrapper">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="editUserEmail" name="email" class="form-control" required value="${(user.email || '').replace(/"/g, '&quot;')}" placeholder="correo@ejemplo.com">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Teléfonos -->
                        <div class="edit-user-section">
                            <div class="edit-user-section-title"><i class="fas fa-phone-alt"></i> Teléfonos de Contacto</div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editUserPhone">Teléfono</label>
                                    <div class="profile-input-wrapper">
                                        <i class="fas fa-phone"></i>
                                        <input type="tel" id="editUserPhone" name="phone" class="form-control" value="${(user.phone || '').replace(/"/g, '&quot;')}" placeholder="+58 414 0000000">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editUserWhatsApp"><i class="fab fa-whatsapp" style="color:#25d366"></i> WhatsApp</label>
                                    <div class="profile-input-wrapper">
                                        <i class="fab fa-whatsapp" style="color:#25d366"></i>
                                        <input type="tel" id="editUserWhatsApp" name="whatsapp" class="form-control" value="${(user.whatsapp || '').replace(/"/g, '&quot;')}" placeholder="+58 414 0000000">
                                    </div>
                                    <small class="form-hint">Número visible para compradores</small>
                                </div>
                            </div>
                        </div>

                        <!-- Biografía -->
                        <div class="edit-user-section">
                            <div class="edit-user-section-title"><i class="fas fa-align-left"></i> Biografía</div>
                            <div class="form-group">
                                <textarea id="editUserBio" name="bio" class="form-control" rows="3" placeholder="Descripción del usuario..." maxlength="500">${user.bio || ''}</textarea>
                            </div>
                        </div>

                        <!-- Administración -->
                        <div class="edit-user-section edit-user-section-admin">
                            <div class="edit-user-section-title"><i class="fas fa-shield-alt"></i> Administración</div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editUserRole">Rol</label>
                                    <select id="editUserRole" name="role" class="form-control">
                                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>Usuario</option>
                                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                                        <option value="agent" ${user.role === 'agent' ? 'selected' : ''}>Agente</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="editUserStatus">Estado</label>
                                    <select id="editUserStatus" name="status" class="form-control">
                                        <option value="activo" ${user.is_active ? 'selected' : ''}>Activo</option>
                                        <option value="inactivo" ${!user.is_active ? 'selected' : ''}>Inactivo</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </form>
                `;
            }

            adminUserModal.dataset.userId = userId;
        } catch (error) {
            showToast('Error al cargar datos del usuario', 'error');
            adminUserModal.classList.add('hidden');
        }
    }

    async function saveUser() {
        if (!adminUserModal) return;

        const userId = adminUserModal.dataset.userId;
        if (!userId) return;

        const name = document.getElementById('editUserName')?.value?.trim();
        const email = document.getElementById('editUserEmail')?.value?.trim();
        const phone = document.getElementById('editUserPhone')?.value?.trim();
        const whatsapp = document.getElementById('editUserWhatsApp')?.value?.trim();
        const bio = document.getElementById('editUserBio')?.value?.trim();
        const role = document.getElementById('editUserRole')?.value;
        const statusVal = document.getElementById('editUserStatus')?.value;

        if (!name || !email) {
            showToast('Nombre y email son requeridos', 'error');
            return;
        }

        const saveBtn = document.getElementById('adminUserModalSave');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }

        try {
            await api.put(`/users/${userId}`, {
                name,
                email,
                phone,
                whatsapp,
                bio,
                role,
                is_active: statusVal === 'activo',
            });

            showToast('Usuario actualizado exitosamente', 'success');
            adminUserModal.classList.add('hidden');
            loadUsers();
            loadDashboardStats();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            }
        }
    }

    function deleteUser(id) {
        if (adminDeleteMsg) adminDeleteMsg.textContent = '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer. Las propiedades del usuario serán eliminadas también.';
        currentDeleteAction = { type: 'user', id };
        if (adminDeleteModal) adminDeleteModal.classList.remove('hidden');
    }

    // ─── Business Edit Modal ──────────────────────────────────
    function setupBusinessEditModal() {
        if (adminBizEditClose && adminBizEditModal) adminBizEditClose.addEventListener('click', () => adminBizEditModal.classList.add('hidden'));
        if (adminBizEditCancel && adminBizEditModal) adminBizEditCancel.addEventListener('click', () => adminBizEditModal.classList.add('hidden'));
        if (adminBizEditModal) adminBizEditModal.querySelector('.modal-overlay')?.addEventListener('click', () => adminBizEditModal.classList.add('hidden'));
        if (adminBizEditSave) adminBizEditSave.addEventListener('click', saveBusiness);

        // Image upload handlers for business edit
        const bizFileInput = document.getElementById('bizEditImageFile');
        const bizCameraInput = document.getElementById('bizEditImageCamera');
        if (bizFileInput) bizFileInput.addEventListener('change', (e) => handleBizImageUpload(e.target.files[0]));
        if (bizCameraInput) bizCameraInput.addEventListener('change', (e) => handleBizImageUpload(e.target.files[0]));

        // Image URL handler for business edit
        const bizURLInput = document.getElementById('bizEditImageURL');
        if (bizURLInput) bizURLInput.addEventListener('input', () => {
            const url = bizURLInput.value.trim();
            const preview = document.getElementById('bizEditImagePreview');
            if (preview && url) {
                preview.innerHTML = `<img src="${url}" style="max-width:200px;max-height:150px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">`;
            }
        });
    }

    async function editBusiness(businessId) {
        if (!adminBizEditModal) return;
        adminBizEditModal.classList.remove('hidden');
        adminBizEditModal.dataset.businessId = businessId;

        // Reset form
        const form = document.getElementById('adminBizEditForm');
        if (form) form.reset();

        // Reset image preview
        const preview = document.getElementById('bizEditImagePreview');
        if (preview) preview.innerHTML = '<div style="color:#999;font-size:0.85rem;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

        // Load categories for select
        try {
            const catsData = await api.get('/categories');
            const catSelect = document.getElementById('bizEditCategory');
            if (catSelect && catsData.categories) {
                catSelect.innerHTML = '<option value="">Seleccionar...</option>';
                catsData.categories.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    catSelect.appendChild(opt);
                });
            }
        } catch (err) { console.error('Error loading categories:', err); }

        // Load business data
        try {
            const biz = await api.get(`/businesses/${businessId}`);

            document.getElementById('bizEditTitle').value = biz.title || '';
            document.getElementById('bizEditDescription').value = biz.description || '';
            document.getElementById('bizEditType').value = biz.business_type || 'comercio';
            if (biz.category_id) document.getElementById('bizEditCategory').value = biz.category_id;
            adminBizEditModal.dataset.currentCategoryId = biz.category_id || 1;
            document.getElementById('bizEditPhone').value = biz.phone || '';
            document.getElementById('bizEditWhatsApp').value = biz.whatsapp || '';
            document.getElementById('bizEditEmail').value = biz.email_contact || '';
            document.getElementById('bizEditWebsite').value = biz.website || '';
            document.getElementById('bizEditInstagram').value = biz.instagram || '';
            document.getElementById('bizEditFacebook').value = biz.facebook || '';
            document.getElementById('bizEditAddress').value = biz.address || '';
            document.getElementById('bizEditCity').value = biz.city || '';
            document.getElementById('bizEditState').value = biz.state || '';
            document.getElementById('bizEditSchedule').value = biz.schedule || '';

            // Features
            document.getElementById('bizEditParking').checked = !!biz.has_parking;
            document.getElementById('bizEditWifi').checked = !!biz.has_wifi;
            document.getElementById('bizEditCard').checked = !!biz.has_card;
            document.getElementById('bizEditDelivery').checked = !!biz.has_delivery;
            document.getElementById('bizEditOutdoor').checked = !!biz.has_outdoor;

            // Video URL
            document.getElementById('bizEditVideoUrl').value = biz.video_url || '';

            // Load images gallery
            adminBizEditModal.dataset.imageCount = (biz.images || []).length;
            loadBizEditGallery(businessId);

        } catch (error) {
            showToast('Error al cargar datos del negocio', 'error');
            adminBizEditModal.classList.add('hidden');
        }
    }

    // ─── Image Compression (client-side) ────────────────────────
    // Reduces image resolution before upload to save R2 storage and bandwidth
    // Max longest side: 1920px, JPEG/WebP quality: 0.75
    function compressImage(file, maxSize, quality) {
        maxSize = maxSize || 1920;
        quality = quality || 0.75;
        return new Promise((resolve, reject) => {
            // Don't compress GIFs or tiny files (< 200KB)
            if (file.type === 'image/gif' || file.size < 200 * 1024) {
                resolve(file);
                return;
            }
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = function () {
                URL.revokeObjectURL(url);
                let w = img.width, h = img.height;
                // Only resize if exceeds max dimension
                if (w <= maxSize && h <= maxSize) {
                    resolve(file);
                    return;
                }
                if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
                else { w = Math.round(w * maxSize / h); h = maxSize; }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                // Use WebP if supported, else JPEG
                const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
                const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
                canvas.toBlob(function (blob) {
                    if (!blob) { resolve(file); return; }
                    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.') + ext, { type: mimeType });
                    const pct = Math.round((1 - compressed.size / file.size) * 100);
                    console.log(`Image compressed: ${(file.size/1024/1024).toFixed(1)}MB → ${(compressed.size/1024/1024).toFixed(1)}MB (${pct}% reduction)`);
                    resolve(compressed);
                }, mimeType, quality);
            };
            img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
            img.src = url;
        });
    }

    async function handleBizImageUpload(file) {
        if (!file) return;
        const statusEl = document.getElementById('bizEditImageStatus');
        const businessId = adminBizEditModal?.dataset?.businessId;

        if (!businessId) { showToast('Error: no se identificó el negocio', 'error'); return; }

        if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';

        try {
            // Step 1: Upload file to R2
            const formData = new FormData();
            formData.append('file', file);
            formData.append('business_id', businessId);
            formData.append('product_type', 'business');

            const token = localStorage.getItem(TOKEN_KEY);
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();

            if (!data.url) {
                if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#dc3545;"></i> ' + (data.error || 'Error al subir');
                return;
            }

            // Step 2: Register image in images table
            const imgCount = adminBizEditModal.dataset.imageCount ? parseInt(adminBizEditModal.dataset.imageCount) : 0;
            const isFirst = imgCount === 0;
            await api.post(`/images/${businessId}`, {
                url: data.url,
                is_cover: isFirst ? 1 : 0
            });

            if (statusEl) statusEl.innerHTML = '<i class="fas fa-check" style="color:#28a745;"></i> Imagen subida';
            adminBizEditModal.dataset.imageCount = imgCount + 1;

            // Refresh gallery
            loadBizEditGallery(businessId);
        } catch (error) {
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#dc3545;"></i> ' + error.message;
        }
    }

    // Load business images gallery in edit modal
    async function loadBizEditGallery(businessId) {
        const galleryEl = document.getElementById('bizEditGallery');
        if (!galleryEl || !businessId) return;

        try {
            const biz = await api.get(`/businesses/${businessId}`);
            const images = biz.images || [];
            adminBizEditModal.dataset.imageCount = images.length;

            if (images.length === 0) {
                galleryEl.innerHTML = '<span style="color:#999;font-size:0.85rem;">Sin imágenes</span>';
                return;
            }

            galleryEl.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
                images.map(img => `
                    <div style="position:relative;display:inline-block;border-radius:8px;overflow:hidden;border:2px solid ${img.is_cover ? '#f59e0b' : '#e5e7eb'};">
                        <img src="${img.url}" style="width:100px;height:80px;object-fit:cover;" onerror="this.style.display='none'">
                        ${img.is_cover ? '<span style="position:absolute;top:2px;left:2px;background:#f59e0b;color:#fff;font-size:0.6rem;padding:1px 4px;border-radius:4px;">Portada</span>' : ''}
                        <button type="button" onclick="window._adminDeleteBizImage(${businessId}, ${img.id})" style="position:absolute;top:2px;right:2px;background:rgba(220,53,69,0.9);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:0.65rem;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Eliminar">&times;</button>
                    </div>
                `).join('') +
                '</div>';
        } catch (err) {
            console.error('Error loading gallery:', err);
        }
    }

    // Delete business image
    async function deleteBizImage(businessId, imageId) {
        try {
            await api.delete(`/images/${businessId}?image_id=${imageId}`);
            showToast('Imagen eliminada', 'success');
            loadBizEditGallery(businessId);
        } catch (err) {
            showToast('Error al eliminar: ' + err.message, 'error');
        }
    }
    window._adminDeleteBizImage = deleteBizImage;

    async function saveBusiness() {
        if (!adminBizEditModal) return;
        const businessId = adminBizEditModal.dataset.businessId;
        if (!businessId) return;

        const title = document.getElementById('bizEditTitle')?.value?.trim();
        if (!title) { showToast('El nombre es requerido', 'error'); return; }

        const saveBtn = document.getElementById('adminBizEditSave');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }

        try {
            const body = {
                title,
                description: document.getElementById('bizEditDescription')?.value?.trim() || '',
                business_type: document.getElementById('bizEditType')?.value || 'negocio',
                category_id: parseInt(document.getElementById('bizEditCategory')?.value) || adminBizEditModal.dataset.currentCategoryId || 1,
                phone: document.getElementById('bizEditPhone')?.value?.trim() || '',
                whatsapp: document.getElementById('bizEditWhatsApp')?.value?.trim() || '',
                email_contact: document.getElementById('bizEditEmail')?.value?.trim() || '',
                website: document.getElementById('bizEditWebsite')?.value?.trim() || '',
                instagram: document.getElementById('bizEditInstagram')?.value?.trim() || '',
                facebook: document.getElementById('bizEditFacebook')?.value?.trim() || '',
                address: document.getElementById('bizEditAddress')?.value?.trim() || '',
                city: document.getElementById('bizEditCity')?.value?.trim() || '',
                state: document.getElementById('bizEditState')?.value?.trim() || '',
                schedule: document.getElementById('bizEditSchedule')?.value?.trim() || '',
                has_parking: document.getElementById('bizEditParking')?.checked ? 1 : 0,
                has_wifi: document.getElementById('bizEditWifi')?.checked ? 1 : 0,
                has_card: document.getElementById('bizEditCard')?.checked ? 1 : 0,
                has_delivery: document.getElementById('bizEditDelivery')?.checked ? 1 : 0,
                has_outdoor: document.getElementById('bizEditOutdoor')?.checked ? 1 : 0,
                image: adminBizEditModal.dataset.currentImage || '',
                video_url: document.getElementById('bizEditVideoUrl')?.value?.trim() || '',
            };

            await api.put(`/businesses/${businessId}`, body);
            showToast('Negocio actualizado exitosamente', 'success');
            adminBizEditModal.classList.add('hidden');
            loadProperties();
            loadDashboardStats();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios'; }
        }
    }

    // ─── Messages Management ────────────────────────────────────
    async function loadMessages() {
        const tbody = document.getElementById('adminMsgsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr class="empty-row"><td colspan="8"><div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div></td></tr>';

        try {
            const filterVal = document.getElementById('adminMsgFilter')?.value || '';

            // Use contacts endpoint - we get all, then filter client-side
            // Since there's no specific admin contacts endpoint, use businesses approach
            let endpoint = `/contacts?`;
            // Note: The contacts API only has POST. We'll need to get messages through a workaround.
            // For now, we'll show an appropriate message or use stats data.

            // The API currently only has POST for contacts. Admin messages view would need
            // a GET endpoint. Let's show a placeholder and try.
            try {
                const data = await api.get('/contacts');
                const messages = data.contacts || data || [];

                if (Array.isArray(messages) && messages.length === 0) {
                    tbody.innerHTML = '<tr class="empty-row"><td colspan="8"><div class="empty-state-sm"><p>No hay mensajes.</p></div></td></tr>';
                    return;
                }

                if (Array.isArray(messages)) {
                    tbody.innerHTML = messages.map(m => `
                        <tr>
                            <td>${formatDate(m.created_at)}</td>
                            <td>${m.sender_name || '--'}</td>
                            <td>${m.sender_email || '--'}</td>
                            <td>${m.business_id || '--'}</td>
                            <td>${truncateText(m.message, 60)}</td>
                            <td>${m.sender_phone || '--'}</td>
                            <td>${m.is_read ? '<span class="badge badge-default">Leído</span>' : '<span class="badge badge-warning">Nuevo</span>'}</td>
                            <td>
                                <button class="btn btn-xs btn-outline" onclick="window.admin.viewMessage(${m.id})" title="Ver"><i class="fas fa-eye"></i></button>
                            </td>
                        </tr>
                    `).join('');
                }
            } catch {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="8"><div class="empty-state-sm"><p>No hay mensajes de contacto aún.</p></div></td></tr>';
            }

        } catch (error) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="8"><div class="empty-state-sm"><p>Error al cargar mensajes.</p></div></td></tr>';
        }
    }

    function viewMessage(messageId) {
        // This would need a proper API endpoint to get message by ID
        showToast('Función de detalle de mensaje próximamente disponible', 'info');
    }

    // ─── Modals Setup ───────────────────────────────────────────
    function setupModals() {
        // Delete modal
        if (adminDeleteConfirm) adminDeleteConfirm.addEventListener('click', confirmDelete);
        if (adminDeleteCancel) adminDeleteCancel.addEventListener('click', closeDeleteModal);
        if (adminDeleteModalClose) adminDeleteModalClose.addEventListener('click', closeDeleteModal);
        if (adminDeleteModal) {
            adminDeleteModal.querySelector('.modal-overlay')?.addEventListener('click', closeDeleteModal);
        }

        // Settings save button
        const adminSaveSettingsBtn = document.getElementById('adminSaveSettingsBtn');
        if (adminSaveSettingsBtn) adminSaveSettingsBtn.addEventListener('click', saveSettings);

        // Reject modal
        if (adminRejectConfirm) adminRejectConfirm.addEventListener('click', confirmReject);
        if (adminRejectCancel) adminRejectCancel.addEventListener('click', closeRejectModal);
        if (adminRejectModalClose) adminRejectModalClose.addEventListener('click', closeRejectModal);
        if (adminRejectModal) {
            adminRejectModal.querySelector('.modal-overlay')?.addEventListener('click', closeRejectModal);
        }

        // User edit modal
        if (adminUserModalSave) adminUserModalSave.addEventListener('click', saveUser);
        if (adminUserModalCancel) adminUserModalCancel.addEventListener('click', () => adminUserModal?.classList.add('hidden'));
        if (adminUserModalClose) adminUserModalClose.addEventListener('click', () => adminUserModal?.classList.add('hidden'));
        if (adminUserModal) {
            adminUserModal.querySelector('.modal-overlay')?.addEventListener('click', () => adminUserModal.classList.add('hidden'));
        }

        // Business detail modal
        if (adminPropModalClose) adminPropModalClose.addEventListener('click', () => adminBusinessModal?.classList.add('hidden'));
        if (adminBusinessModal) {
            adminBusinessModal.querySelector('.modal-overlay')?.addEventListener('click', () => adminBusinessModal.classList.add('hidden'));
        }

        // Message detail modal
        if (adminMsgModalClose) adminMsgModalClose.addEventListener('click', () => adminMsgModal?.classList.add('hidden'));
        if (adminMsgModalCloseBtn) adminMsgModalCloseBtn.addEventListener('click', () => adminMsgModal?.classList.add('hidden'));
        if (adminMsgModal) {
            adminMsgModal.querySelector('.modal-overlay')?.addEventListener('click', () => adminMsgModal.classList.add('hidden'));
        }
    }

    // ─── Filter Listeners ───────────────────────────────────────
    function setupFilterListeners() {
        // Business filters
        const propStatusFilter = document.getElementById('adminPropStatusFilter');
        const propTypeFilter = document.getElementById('adminPropTypeFilter');
        const propSearch = document.getElementById('adminPropSearch');

        if (propStatusFilter) propStatusFilter.addEventListener('change', () => { propsPage = 1; loadProperties(); });
        if (propTypeFilter) propTypeFilter.addEventListener('change', () => { propsPage = 1; loadProperties(); });
        if (propSearch) propSearch.addEventListener('input', debounce(() => { propsPage = 1; loadProperties(); }, 400));

        // User filters
        const userRoleFilter = document.getElementById('adminUserRoleFilter');
        const userSearch = document.getElementById('adminUserSearch');

        if (userRoleFilter) userRoleFilter.addEventListener('change', () => { usersPage = 1; loadUsers(); });
        if (userSearch) userSearch.addEventListener('input', debounce(() => { usersPage = 1; loadUsers(); }, 400));

        // Message filter
        const msgFilter = document.getElementById('adminMsgFilter');
        if (msgFilter) msgFilter.addEventListener('change', () => { msgsPage = 1; loadMessages(); });

        // Products filter
        const productStatusFilter = document.getElementById('adminProductStatusFilter');
        if (productStatusFilter) productStatusFilter.addEventListener('change', () => { productsPage = 1; loadProducts(); });
    }

    // ─── Pagination Helper ──────────────────────────────────────
    function renderAdminPagination(containerId, pagination, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container || !pagination) return;

        const { page, totalPages, total } = pagination;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let pagesHTML = '';

        // Previous button
        pagesHTML += `<button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}"><i class="fas fa-chevron-left"></i></button>`;

        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            pagesHTML += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) pagesHTML += '<span class="pagination-dots">...</span>';
        }

        for (let i = startPage; i <= endPage; i++) {
            pagesHTML += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pagesHTML += '<span class="pagination-dots">...</span>';
            pagesHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        pagesHTML += `<button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}"><i class="fas fa-chevron-right"></i></button>`;

        // Total info
        pagesHTML += `<span class="pagination-info">Total: ${total}</span>`;

        container.innerHTML = pagesHTML;

        // Click handlers
        container.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (p && p >= 1 && p <= totalPages) {
                    onPageChange(p);
                }
            });
        });
    }

    // ─── Facebook Integration ───────────────────────────────────
    async function loadFacebookConfig() {
        try {
            const data = await api.get('/facebook/config');
            const config = data.config || {};

            if (config.page_id) document.getElementById('fbPageId').value = config.page_id;
            if (config.page_access_token) document.getElementById('fbAccessToken').value = config.page_access_token;
            if (config.default_city) document.getElementById('fbCity').value = config.default_city;
            if (config.auto_approve === '1') document.getElementById('fbAutoApprove').checked = true;

            const statusEl = document.getElementById('fbConfigStatus');
            if (config.page_id && config.page_access_token) {
                statusEl.innerHTML = '<div style="color:#28a745;"><i class="fas fa-check-circle"></i> Facebook conectado. Token: ' + (config.page_access_token_masked || '***') + '</div>';
            }
        } catch (error) {
            // Config not set yet, that's fine
            const statusEl = document.getElementById('fbConfigStatus');
            if (statusEl) statusEl.innerHTML = '<div style="color:#999;"><i class="fas fa-info-circle"></i> No configurado. Ingresa tu Page ID y Token de Facebook.</div>';
        }
    }

    async function saveFacebookConfig() {
        const pageId = document.getElementById('fbPageId')?.value?.trim();
        const accessToken = document.getElementById('fbAccessToken')?.value?.trim();
        const city = document.getElementById('fbCity')?.value?.trim() || 'Mérida';
        const autoApprove = document.getElementById('fbAutoApprove')?.checked;

        if (!pageId || !accessToken) {
            showToast('Page ID y Token son requeridos', 'error');
            return;
        }

        const statusEl = document.getElementById('fbConfigStatus');
        statusEl.innerHTML = '<div style="color:#1a73e8;"><i class="fas fa-spinner fa-spin"></i> Guardando...</div>';

        try {
            const data = await api.post('/facebook/config', {
                page_id: pageId,
                page_access_token: accessToken,
                default_city: city,
                auto_approve: autoApprove,
            });

            if (data.success) {
                statusEl.innerHTML = '<div style="color:#28a745;"><i class="fas fa-check-circle"></i> ' + data.message + '</div>';
                showToast(data.message, 'success');
            } else {
                statusEl.innerHTML = '<div style="color:#e74c3c;"><i class="fas fa-times-circle"></i> ' + (data.error || 'Error al guardar') + '</div>';
                showToast(data.error || 'Error al guardar', 'error');
            }
        } catch (error) {
            statusEl.innerHTML = '<div style="color:#e74c3c;"><i class="fas fa-times-circle"></i> ' + error.message + '</div>';
            showToast(error.message, 'error');
        }
    }

    async function testFacebookConnection() {
        const pageId = document.getElementById('fbPageId')?.value?.trim();
        const accessToken = document.getElementById('fbAccessToken')?.value?.trim();

        if (!pageId || !accessToken) {
            showToast('Ingresa Page ID y Token primero', 'warning');
            return;
        }

        const statusEl = document.getElementById('fbConfigStatus');
        statusEl.innerHTML = '<div style="color:#1a73e8;"><i class="fas fa-spinner fa-spin"></i> Probando conexion con Facebook...</div>';

        try {
            const resp = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=name,fan_count&access_token=${accessToken}`);
            const data = await resp.json();

            if (data.error) {
                statusEl.innerHTML = '<div style="color:#e74c3c;"><i class="fas fa-times-circle"></i> Error: ' + data.error.message + ' (Codigo: ' + data.error.code + ')</div>';
                showToast('Error de conexion con Facebook', 'error');
            } else {
                const fans = data.fan_count ? ' con ' + data.fan_count.toLocaleString() + ' seguidores' : '';
                statusEl.innerHTML = '<div style="color:#28a745;"><i class="fas fa-check-circle"></i> Conexion exitosa! Pagina: <strong>' + (data.name || pageId) + '</strong>' + fans + '</div>';
                showToast('Conexion exitosa con Facebook!', 'success');
            }
        } catch (error) {
            statusEl.innerHTML = '<div style="color:#e74c3c;"><i class="fas fa-times-circle"></i> Error de conexion: ' + error.message + '</div>';
            showToast('Error al conectar con Facebook', 'error');
        }
    }

    async function importFromFacebook() {
        const statusEl = document.getElementById('fbImportStatus');
        statusEl.innerHTML = '<div style="color:#1a73e8;"><i class="fas fa-spinner fa-spin"></i> Importando posts desde Facebook... esto puede tomar unos segundos.</div>';

        try {
            const data = await api.post('/facebook/import', {});

            if (data.success) {
                let html = '<div style="color:#28a745;"><i class="fas fa-check-circle"></i> ' + data.message + '</div>';
                if (data.results && data.results.length > 0) {
                    html += '<div style="margin-top:12px;">';
                    html += '<table class="admin-table" style="font-size:13px;"><thead><tr><th>Propiedad</th><th>Imagenes</th></tr></thead><tbody>';
                    data.results.forEach(r => {
                        html += '<tr><td><a href="/negocio/' + (r.business_slug || r.business_id) + '" target="_blank">' + (r.title || 'Sin titulo') + '</a></td><td>' + r.images + '</td></tr>';
                    });
                    html += '</tbody></table></div>';
                }
                statusEl.innerHTML = html;
                showToast(data.message, 'success');
                loadFacebookHistory();
                loadDashboardStats();
            } else {
                statusEl.innerHTML = '<div style="color:#e74c3c;"><i class="fas fa-times-circle"></i> ' + (data.error || 'Error en la importacion') + '</div>';
                showToast(data.error || 'Error al importar', 'error');
            }
        } catch (error) {
            statusEl.innerHTML = '<div style="color:#e74c3c;"><i class="fas fa-times-circle"></i> ' + error.message + '</div>';
            showToast(error.message, 'error');
        }
    }

    async function loadFacebookHistory() {
        const container = document.getElementById('fbHistoryContent');
        if (!container) return;

        container.innerHTML = '<p style="color:#999;"><i class="fas fa-spinner fa-spin"></i> Cargando historial...</p>';

        try {
            const data = await api.get('/facebook/history?limit=30');

            if (!data.history || data.history.length === 0) {
                container.innerHTML = '<p style="color:#999;"><i class="fas fa-inbox"></i> No hay importaciones todavia. Configura Facebook y luego haz clic en "Importar Posts Ahora".</p>';
                return;
            }

            let html = '<div style="margin-bottom:8px;color:#666;">';
            html += '<strong>Total procesados:</strong> ' + data.total + ' | ';
            html += '<strong>Importados como propiedad:</strong> ' + data.imported + ' | ';
            html += '<strong>Omitidos (sin foto):</strong> ' + data.skipped;
            html += '</div>';

            html += '<div class="admin-table-responsive"><table class="admin-table" style="font-size:13px;">';
            html += '<thead><tr><th>Fecha</th><th>Post</th><th>Propiedad</th><th>Estado</th></tr></thead><tbody>';

            data.history.forEach(h => {
                const statusHTML = h.business_id
                    ? '<a href="/negocio/' + (h.business_slug || h.business_id) + '" target="_blank" class="badge badge-success">Ver Propiedad</a>'
                    : '<span class="badge badge-warning">Omitido</span>';
                const title = h.business_title || (h.post_message ? truncateText(h.post_message, 40) : 'Post sin texto');
                html += '<tr>';
                html += '<td>' + (h.imported_at ? formatDate(h.imported_at) : '--') + '</td>';
                html += '<td>' + title + '</td>';
                html += '<td>' + (h.business_id ? '#' + h.business_id : '--') + '</td>';
                html += '<td>' + statusHTML + '</td>';
                html += '</tr>';
            });

            html += '</tbody></table></div>';
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<p style="color:#e74c3c;">Error al cargar historial: ' + error.message + '</p>';
        }
    }

    // ─── Productos B2 Modal System ──────────────────────────
    let b2Page = 1;

    function setupB2Modal() {
        const navLink = document.getElementById('adminNavProductsB2');
        const modal = document.getElementById('adminProductsB2Modal');
        if (navLink && modal) {
            navLink.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.remove('hidden');
                b2Page = 1;
                loadB2Products();
            });
        }
        // Close B2 modal
        const b2Close = document.getElementById('adminProductsB2Close');
        if (b2Close && modal) b2Close.addEventListener('click', () => modal.classList.add('hidden'));
        if (modal) modal.querySelector('.modal-overlay')?.addEventListener('click', () => modal.classList.add('hidden'));

        // B2 Edit sub-modal
        const editModal = document.getElementById('b2EditModal');
        const editClose = document.getElementById('b2EditClose');
        const editCancel = document.getElementById('b2EditCancel');
        const editSave = document.getElementById('b2EditSave');
        if (editClose && editModal) editClose.addEventListener('click', () => editModal.classList.add('hidden'));
        if (editCancel && editModal) editCancel.addEventListener('click', () => editModal.classList.add('hidden'));
        if (editModal) editModal.querySelector('.modal-overlay')?.addEventListener('click', () => editModal.classList.add('hidden'));
        if (editSave) editSave.addEventListener('click', saveB2Product);

        // B2 toolbar
        const createBtn = document.getElementById('b2CreateBtn');
        if (createBtn) createBtn.addEventListener('click', () => openB2EditModal(null));

        const refreshBtn = document.getElementById('b2RefreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', loadB2Products);

        const statusFilter = document.getElementById('b2StatusFilter');
        if (statusFilter) statusFilter.addEventListener('change', () => { b2Page = 1; loadB2Products(); });

        const searchInput = document.getElementById('b2SearchInput');
        if (searchInput) searchInput.addEventListener('input', debounce(() => { b2Page = 1; loadB2Products(); }, 400));

        // B2 Image upload handlers
        const b2FileInput = document.getElementById('b2EditImageFile');
        const b2CameraInput = document.getElementById('b2EditImageCamera');
        if (b2FileInput) b2FileInput.addEventListener('change', (e) => handleB2ImageUpload(e.target.files[0]));
        if (b2CameraInput) b2CameraInput.addEventListener('change', (e) => handleB2ImageUpload(e.target.files[0]));

        // B2 Image URL handler
        const b2URLInput = document.getElementById('b2EditImageURL');
        if (b2URLInput) b2URLInput.addEventListener('input', () => {
            const url = b2URLInput.value.trim();
            const preview = document.getElementById('b2EditImagePreview');
            const editModal2 = document.getElementById('b2EditModal');
            if (preview && url) {
                preview.innerHTML = `<img src="${url}" style="max-width:150px;max-height:120px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">`;
                if (editModal2) editModal2.dataset.currentImage = url;
            }
        });
    }

    async function loadB2Products() {
        const tbody = document.getElementById('b2ProductsBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state-sm"><p><i class="fas fa-spinner fa-spin"></i> Cargando...</p></div></td></tr>';

        try {
            const statusVal = document.getElementById('b2StatusFilter')?.value || '';
            const searchVal = document.getElementById('b2SearchInput')?.value || '';
            let endpoint = `/marketplace?page=${b2Page}&limit=15&all=true`;
            if (statusVal) endpoint += `&status=${statusVal}`;
            if (searchVal) endpoint += `&search=${encodeURIComponent(searchVal)}`;

            const data = await api.get(endpoint);
            const products = data.products || [];

            if (products.length === 0) {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state-sm"><p>No hay productos.</p></div></td></tr>';
            } else {
                tbody.innerHTML = products.map(p => {
                    const imgHTML = p.image ? `<img src="${escapeHtml(p.image)}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">` : '<i class="fas fa-box" style="color:#ccc;font-size:1.2rem;"></i>';
                    const statusBadge = getStatusBadge(p.status || 'pending');
                    return `<tr>
                        <td>${p.id}</td>
                        <td><div style="display:flex;align-items:center;gap:8px;">${imgHTML}<span style="font-weight:600;">${escapeHtml(p.name || 'Sin nombre')}</span></div></td>
                        <td>${escapeHtml(p.business_name || '—')}</td>
                        <td><span class="badge badge-default">${escapeHtml(p.category || 'general')}</span></td>
                        <td style="font-weight:600;color:#059669;">$${parseFloat(p.price || 0).toFixed(2)}</td>
                        <td><div style="font-size:0.8rem;">${escapeHtml(p.owner_name || '—')}<br><span style="color:#999;">${escapeHtml(p.owner_email || '')}</span></div></td>
                        <td>${statusBadge}</td>
                        <td style="font-size:0.8rem;color:#888;">${formatDate(p.created_at)}</td>
                        <td>
                            ${p.status === 'pending' ? `<button class="btn btn-xs btn-success" onclick="window._adminB2Approve(${p.id})" title="Aprobar"><i class="fas fa-check"></i></button>` : ''}
                            ${p.status !== 'rejected' ? `<button class="btn btn-xs btn-danger" onclick="window._adminB2Reject(${p.id})" title="Rechazar"><i class="fas fa-ban"></i></button>` : ''}
                            <button class="btn btn-xs btn-outline" onclick="window._adminB2Edit(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-xs btn-danger" onclick="window._adminB2Delete(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                }).join('');
            }

            const countEl = document.getElementById('b2ResultsCount');
            const total = data.pagination?.total || products.length;
            if (countEl) countEl.textContent = `${total} productos`;

            // Update badge
            const badge = document.getElementById('adminProductsBadge');
            if (badge) {
                const pendingCount = products.filter(p => p.status === 'pending').length;
                badge.textContent = pendingCount > 0 ? pendingCount : total;
                badge.style.display = (pendingCount > 0 || total > 0) ? '' : 'none';
            }

            // Pagination
            renderAdminPagination('b2Pagination', data.pagination, (page) => { b2Page = page; loadB2Products(); });
        } catch (error) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state-sm"><p>Error al cargar productos.</p></div></td></tr>';
            showToast(error.message, 'error');
        }
    }

    async function openB2EditModal(productId) {
        const editModal = document.getElementById('b2EditModal');
        if (!editModal) return;

        const title = document.getElementById('b2EditTitle');
        if (productId) {
            title.innerHTML = '<i class="fas fa-edit"></i> Editar Producto';
        } else {
            title.innerHTML = '<i class="fas fa-plus-circle"></i> Crear Producto';
        }

        // Reset image preview
        const preview = document.getElementById('b2EditImagePreview');
        if (preview) preview.innerHTML = '';
        const statusEl = document.getElementById('b2EditImageStatus');
        if (statusEl) statusEl.innerHTML = '';
        editModal.dataset.currentImage = '';

        // Load businesses for selector
        try {
            const bizData = await api.get('/businesses?status=approved&limit=100');
            const bizSelect = document.getElementById('b2EditBusiness');
            if (bizSelect) {
                bizSelect.innerHTML = '<option value="">Sin negocio asociado</option>';
                if (bizData.businesses) {
                    bizData.businesses.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.id;
                        opt.textContent = b.title || b.name || 'Negocio #' + b.id;
                        bizSelect.appendChild(opt);
                    });
                }
            }
        } catch (err) { console.error('Error loading businesses for B2 edit:', err); }

        // If editing, load product data
        if (productId) {
            try {
                const product = await api.get(`/marketplace/${productId}`);
                document.getElementById('b2EditName').value = product.name || '';
                document.getElementById('b2EditPrice').value = product.price || 0;
                document.getElementById('b2EditCategory').value = product.category || 'general';
                document.getElementById('b2EditStatus').value = product.status || 'pending';
                document.getElementById('b2EditDescription').value = product.description || '';
                if (product.business_id) document.getElementById('b2EditBusiness').value = product.business_id;

                // Handle image
                const imageURL = product.image || '';
                const urlInput = document.getElementById('b2EditImageURL');
                if (urlInput) urlInput.value = imageURL;
                editModal.dataset.currentImage = imageURL;
                if (preview && imageURL) {
                    preview.innerHTML = `<img src="${imageURL}" style="max-width:150px;max-height:120px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">`;
                }
            } catch (err) {
                showToast('Error al cargar producto', 'error');
                return;
            }
        } else {
            document.getElementById('b2EditForm').reset();
            // Clear the URL input specifically (reset may not clear all)
            const urlInput = document.getElementById('b2EditImageURL');
            if (urlInput) urlInput.value = '';
        }

        editModal.dataset.productId = productId || '';
        editModal.classList.remove('hidden');
    }

    async function handleB2ImageUpload(file) {
        if (!file) return;
        const statusEl = document.getElementById('b2EditImageStatus');
        const preview = document.getElementById('b2EditImagePreview');
        const editModal = document.getElementById('b2EditModal');

        if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comprimiendo...';

        try {
            // Compress image client-side before upload
            const compressedFile = await compressImage(file);

            if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';

            const formData = new FormData();
            formData.append('file', compressedFile);
            formData.append('product_type', 'marketplace');

            const token = localStorage.getItem(TOKEN_KEY);
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();

            if (data.url) {
                if (preview) preview.innerHTML = `<img src="${data.url}" style="max-width:150px;max-height:120px;border-radius:8px;object-fit:cover;">`;
                if (statusEl) statusEl.innerHTML = '<i class="fas fa-check" style="color:#28a745;"></i> Imagen subida';
                if (editModal) editModal.dataset.currentImage = data.url;
                // Clear URL input when file is uploaded
                const urlInput = document.getElementById('b2EditImageURL');
                if (urlInput) urlInput.value = '';
            } else {
                if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#dc3545;"></i> ' + (data.error || 'Error al subir');
            }
        } catch (error) {
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#dc3545;"></i> Error de conexión';
        }
    }

    async function saveB2Product() {
        const editModal = document.getElementById('b2EditModal');
        const productId = editModal?.dataset?.productId;
        const saveBtn = document.getElementById('b2EditSave');

        const name = document.getElementById('b2EditName')?.value?.trim();
        const price = parseFloat(document.getElementById('b2EditPrice')?.value) || 0;
        const category = document.getElementById('b2EditCategory')?.value || 'general';
        const status = document.getElementById('b2EditStatus')?.value || 'pending';
        const description = document.getElementById('b2EditDescription')?.value?.trim() || '';
        const business_id = document.getElementById('b2EditBusiness')?.value || '';

        // Get image: prefer uploaded file, fallback to URL input
        const uploadedImage = editModal?.dataset?.currentImage || '';
        const urlImage = document.getElementById('b2EditImageURL')?.value?.trim() || '';
        const image = uploadedImage || urlImage;

        if (!name) { showToast('El nombre es requerido', 'error'); return; }

        if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }

        try {
            const body = { name, price, category, image, status, description };
            if (business_id) body.business_id = parseInt(business_id);

            if (productId) {
                await api.put(`/marketplace/${productId}`, body);
                showToast('Producto actualizado', 'success');
            } else {
                await api.post('/marketplace', body);
                showToast('Producto creado', 'success');
            }
            editModal.classList.add('hidden');
            loadB2Products();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar'; }
        }
    }

    async function adminB2Approve(id) {
        try { await api.post(`/marketplace/${id}/approve`); showToast('Producto aprobado', 'success'); loadB2Products(); }
        catch(e) { showToast(e.message, 'error'); }
    }
    async function adminB2Reject(id) {
        try { await api.post(`/marketplace/${id}/reject`); showToast('Producto rechazado', 'info'); loadB2Products(); }
        catch(e) { showToast(e.message, 'error'); }
    }
    function adminB2Edit(id) { openB2EditModal(id); }
    async function adminB2Delete(id) {
        if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
        try { await api.delete(`/marketplace/${id}`); showToast('Producto eliminado', 'success'); loadB2Products(); }
        catch(e) { showToast(e.message, 'error'); }
    }

    // Expose B2 functions for inline onclick handlers
    window._adminB2Approve = adminB2Approve;
    window._adminB2Reject = adminB2Reject;
    window._adminB2Edit = adminB2Edit;
    window._adminB2Delete = adminB2Delete;

    // ─── INMUEBLES (Properties) MANAGEMENT ──────────────────────
    const INMUEBLE_TYPE_LABELS = {
        casa: 'Casa', apartamento: 'Apartamento', terreno: 'Terreno',
        local_comercial: 'Local Comercial', oficina: 'Oficina', hotel: 'Hotel',
        finca: 'Finca', galpon: 'Galpón', estacionamiento: 'Estacionamiento', otro: 'Otro'
    };
    const INMUEBLE_OPERATION_LABELS = { venta: 'Venta', alquiler: 'Alquiler', venta_alquiler: 'Venta y Alquiler' };
    const INMUEBLE_STATUS_COLORS = {
        pending: 'warning', approved: 'success', rejected: 'danger', sold: 'info', rented: 'purple'
    };

    function getPropertyTypeLabel(type) {
        return INMUEBLE_TYPE_LABELS[type] || type || '-';
    }

    function getOperationLabel(op) {
        return INMUEBLE_OPERATION_LABELS[op] || op || '-';
    }

    function getInmuebleStatusBadge(status) {
        const colorMap = { pending: 'warning', approved: 'success', rejected: 'danger', sold: 'info', rented: 'purple' };
        const labelMap = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', sold: 'Vendido', rented: 'Alquilado' };
        const color = colorMap[status] || 'secondary';
        const label = labelMap[status] || status || '-';
        return `<span class="badge badge-${color}">${label}</span>`;
    }

    function formatPrice(price, currency) {
        if (!price && price !== 0) return '-';
        const curr = currency || 'USD';
        const formatted = Number(price).toLocaleString('es-VE');
        return `${formatted} ${curr}`;
    }

    async function loadInmueblesTab() {
        const tbody = document.getElementById('propertiesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr class="empty-row"><td colspan="10"><div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div></td></tr>';

        try {
            const statusFilter = document.getElementById('propStatusFilter')?.value || '';
            const typeFilter = document.getElementById('propTypeFilter')?.value || '';
            const searchVal = document.getElementById('propSearchInput')?.value || '';

            const params = new URLSearchParams({ page: inmueblesPage, limit: PAGE_LIMIT });
            if (statusFilter) params.set('status', statusFilter);
            if (typeFilter) params.set('type', typeFilter);
            if (searchVal) params.set('search', searchVal);

            const data = await api.get(`/properties?${params}`);
            const properties = data.properties || data.results || [];

            if (properties.length === 0) {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="10"><div class="empty-state-sm"><p>No se encontraron inmuebles.</p></div></td></tr>';
                return;
            }

            tbody.innerHTML = properties.map(p => renderInmuebleRow(p)).join('');

            // Pagination
            renderAdminPagination('propertiesPagination', data.pagination, (page) => {
                inmueblesPage = page;
                loadInmueblesTab();
            });
        } catch (error) {
            console.error('Error loading inmuebles:', error);
            tbody.innerHTML = '<tr class="empty-row"><td colspan="10"><div class="empty-state-sm"><p>Error al cargar inmuebles.</p></div></td></tr>';
            showToast(error.message, 'error');
        }
    }

    function renderInmuebleRow(p) {
        const coverImg = p.cover_image || p.images?.[0] || '';
        const imgHTML = coverImg
            ? `<img src="${coverImg}" alt="" class="admin-thumb" onerror="this.style.display='none'">`
            : '<div class="admin-thumb-placeholder"><i class="fas fa-image"></i></div>';
        const titleLink = `<a href="property-detail.html?id=${p.id}" target="_blank" title="${escHtml(p.title)}">${escHtml(truncateText(p.title, 35))}</a>`;
        const featuredIcon = p.featured
            ? '<i class="fas fa-star text-warning"></i>'
            : '<i class="far fa-star text-muted"></i>';

        return `
            <tr>
                <td>${p.id}</td>
                <td>${imgHTML}</td>
                <td>${titleLink}</td>
                <td>${getPropertyTypeLabel(p.property_type || p.type)}</td>
                <td>${getOperationLabel(p.operation)}</td>
                <td>${formatPrice(p.price, p.currency)}</td>
                <td>${escHtml(p.city || '-')}</td>
                <td>${escHtml(p.owner_name || p.user_name || '-')}</td>
                <td>${getInmuebleStatusBadge(p.status)}</td>
                <td class="admin-actions">
                    <button class="btn btn-xs btn-outline" onclick="window._adminViewInmueble(${p.id})" title="Ver"><i class="fas fa-eye"></i></button>
                    ${p.status === 'pending' ? `
                        <button class="btn btn-xs btn-success" onclick="window._adminApproveInmueble(${p.id})" title="Aprobar"><i class="fas fa-check"></i></button>
                        <button class="btn btn-xs btn-danger" onclick="window._adminRejectInmueble(${p.id})" title="Rechazar"><i class="fas fa-ban"></i></button>
                    ` : ''}
                    <button class="btn btn-xs btn-outline" onclick="window._adminToggleInmuebleFeatured(${p.id}, ${p.featured ? 1 : 0})" title="Destacada">${featuredIcon}</button>
                    <button class="btn btn-xs btn-danger" onclick="window._adminDeleteInmueble(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }

    async function approveProperty(id) {
        try {
            await api.post(`/properties/${id}/approve`);
            showToast('Inmueble aprobado exitosamente', 'success');
            loadInmueblesTab();
            loadDashboardTab();
        } catch (error) {
            console.error('Error approving property:', error);
            showToast('Error al aprobar inmueble: ' + error.message, 'error');
        }
    }

    async function rejectProperty(id) {
        try {
            await api.post(`/properties/${id}/reject`);
            showToast('Inmueble rechazado', 'success');
            loadInmueblesTab();
            loadDashboardTab();
        } catch (error) {
            console.error('Error rejecting property:', error);
            showToast('Error al rechazar inmueble: ' + error.message, 'error');
        }
    }

    async function deleteProperty(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este inmueble? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/properties/${id}`);
            showToast('Inmueble eliminado', 'success');
            loadInmueblesTab();
            loadDashboardTab();
        } catch (error) {
            console.error('Error deleting property:', error);
            showToast('Error al eliminar inmueble: ' + error.message, 'error');
        }
    }

    async function togglePropertyFeatured(id, featured) {
        try {
            await api.put(`/properties/${id}`, { featured: !featured });
            showToast('Inmueble actualizado', 'success');
            loadInmueblesTab();
        } catch (error) {
            console.error('Error toggling featured:', error);
            showToast('Error al actualizar inmueble: ' + error.message, 'error');
        }
    }

    function viewInmueble(id) {
        window.open(`property-detail.html?id=${id}`, '_blank');
    }

    function setupInmueblesListeners() {
        const statusFilter = document.getElementById('propStatusFilter');
        const typeFilter = document.getElementById('propTypeFilter');
        const searchInput = document.getElementById('propSearchInput');

        const triggerReload = () => {
            inmueblesPage = 1;
            loadInmueblesTab();
        };

        if (statusFilter) statusFilter.addEventListener('change', triggerReload);
        if (typeFilter) typeFilter.addEventListener('change', triggerReload);
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(triggerReload, 400);
            });
        }
    }

    // Expose inmuebles functions for inline onclick handlers
    window._adminApproveInmueble = approveProperty;
    window._adminRejectInmueble = rejectProperty;
    window._adminDeleteInmueble = deleteProperty;
    window._adminToggleInmuebleFeatured = togglePropertyFeatured;
    window._adminViewInmueble = viewInmueble;
    window._adminInmueblesPage = function(page) {
        inmueblesPage = page;
        loadInmueblesTab();
    };

    // ─── Expose functions for inline onclick handlers ───────────
    window.admin = {
        viewBusiness,
        editBusiness,
        approveBusiness,
        rejectBusiness,
        toggleFeatured,
        deleteBusiness,
        editUser,
        deleteUser,
        viewMessage,
        approveJob,
        rejectJob,
        deleteJob,
    };

    // ─── Facebook Event Listeners (set up in init) ─────────────
    function setupFacebookListeners() {
        const fbSaveConfigBtn = document.getElementById('fbSaveConfig');
        const fbTestConnectionBtn = document.getElementById('fbTestConnection');
        const fbImportNowBtn = document.getElementById('fbImportNow');

        if (fbSaveConfigBtn) fbSaveConfigBtn.addEventListener('click', saveFacebookConfig);
        if (fbTestConnectionBtn) fbTestConnectionBtn.addEventListener('click', testFacebookConnection);
        if (fbImportNowBtn) fbImportNowBtn.addEventListener('click', importFromFacebook);
    }

    // ─── JOBS MANAGEMENT ──────────────────────────────────────
    async function loadJobs() {
        try {
            const statusFilter = document.getElementById('jobStatusFilter')?.value || 'pending';
            const params = new URLSearchParams({ page: jobsPage, limit: PAGE_LIMIT });
            if (statusFilter) params.set('status', statusFilter);
            const data = await api.get(`/jobs?${params}`);
            const tbody = document.getElementById('adminJobsTableBody');
            if (!tbody) return;

            if (!data.jobs || data.jobs.length === 0) {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="7"><div class="empty-state-sm"><p>No hay ofertas de empleo.</p></div></td></tr>';
                return;
            }

            tbody.innerHTML = data.jobs.map(j => `
                <tr>
                    <td>${j.id}</td>
                    <td><strong>${escHtml(j.title)}</strong></td>
                    <td>${escHtml(j.company_name)}</td>
                    <td>${j.state || '-'} / ${j.city || '-'}</td>
                    <td><span class="badge badge-${j.status === 'approved' ? 'success' : j.status === 'rejected' ? 'danger' : 'warning'}">${j.job_type || '-'}</span></td>
                    <td><span class="badge badge-${j.status === 'approved' ? 'success' : j.status === 'rejected' ? 'danger' : 'warning'}">${j.status}</span></td>
                    <td>
                        ${j.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="admin.approveJob(${j.id})"><i class="fas fa-check"></i></button>` : ''}
                        ${j.status !== 'rejected' ? `<button class="btn btn-sm btn-danger" onclick="admin.rejectJob(${j.id})"><i class="fas fa-ban"></i></button>` : ''}
                        <button class="btn btn-sm btn-secondary" onclick="admin.deleteJob(${j.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error loading jobs:', err);
        }
    }

    async function loadBusinessesForJobSelect() {
        const select = document.getElementById('jobCompany');
        if (!select) return;
        try {
            const data = await api.get('/businesses?status=approved&limit=200');
            if (data.businesses) {
                data.businesses.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.title;
                    opt.textContent = `${b.title} (${b.state || '-'})`;
                    select.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Error loading businesses for job select:', err);
        }
    }

    function setupJobListeners() {
        const createBtn = document.getElementById('adminCreateJobBtn');
        const modal = document.getElementById('adminJobModal');
        const closeBtn = document.getElementById('adminJobModalClose');
        const cancelBtn = document.getElementById('adminJobCancel');
        const submitBtn = document.getElementById('adminJobSubmit');

        if (createBtn) createBtn.addEventListener('click', () => { if (modal) modal.classList.remove('hidden'); });
        if (closeBtn) closeBtn.addEventListener('click', () => { if (modal) modal.classList.add('hidden'); });
        if (cancelBtn) cancelBtn.addEventListener('click', () => { if (modal) modal.classList.add('hidden'); });
        if (modal) modal.querySelector('.modal-overlay')?.addEventListener('click', () => modal.classList.add('hidden'));

        if (submitBtn) submitBtn.addEventListener('click', submitJob);

        const jobStatusFilter = document.getElementById('jobStatusFilter');
        if (jobStatusFilter) jobStatusFilter.addEventListener('change', () => { jobsPage = 1; loadJobs(); });
    }

    async function submitJob() {
        const company = document.getElementById('jobCompany')?.value;
        const title = document.getElementById('jobTitle')?.value?.trim();
        const job_type = document.getElementById('jobType')?.value;
        const salary = document.getElementById('jobSalary')?.value?.trim();
        const state = document.getElementById('jobState')?.value?.trim();
        const city = document.getElementById('jobCity')?.value?.trim();
        const description = document.getElementById('jobDescription')?.value?.trim();
        const requirements = document.getElementById('jobRequirements')?.value?.trim();
        const benefits = document.getElementById('jobBenefits')?.value?.trim();
        const contactEmail = document.getElementById('jobContactEmail')?.value?.trim();
        const contactPhone = document.getElementById('jobContactPhone')?.value?.trim();

        if (!company || !title) {
            showToast('Empresa y título son requeridos', 'error');
            return;
        }

        try {
            await api.post('/jobs', {
                company_name: company,
                title,
                job_type: job_type || 'tiempo_completo',
                salary: salary || null,
                state: state || null,
                city: city || null,
                description: description || null,
                requirements: requirements || null,
                benefits: benefits || null,
                contact_email: contactEmail || null,
                contact_phone: contactPhone || null,
            });
            showToast('Oferta de empleo publicada', 'success');
            document.getElementById('adminJobModal')?.classList.add('hidden');
            loadJobs();
        } catch (err) {
            showToast(err.message || 'Error al publicar empleo', 'error');
        }
    }

    function approveJob(id) {
        const token = localStorage.getItem(TOKEN_KEY);
        fetch(`/api/jobs/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'approve' })
        }).then(r => {
            if (r.ok) { showToast('Oferta aprobada', 'success'); loadJobs(); }
            else showToast('Error al aprobar empleo', 'error');
        }).catch(e => showToast(e.message || 'Error', 'error'));
    }

    function rejectJob(id) {
        const token = localStorage.getItem(TOKEN_KEY);
        fetch(`/api/jobs/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'reject' })
        }).then(r => {
            if (r.ok) { showToast('Oferta rechazada', 'success'); loadJobs(); }
            else showToast('Error al rechazar empleo', 'error');
        }).catch(e => showToast(e.message || 'Error', 'error'));
    }

    function deleteJob(id) {
        if (confirm('¿Eliminar esta oferta de empleo?')) {
            const token = localStorage.getItem(TOKEN_KEY);
            fetch(`/api/jobs/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => {
                if (r.ok) { showToast('Oferta eliminada', 'success'); loadJobs(); }
                else showToast('Error al eliminar empleo', 'error');
            }).catch(e => showToast(e.message || 'Error', 'error'));
        }
    }

    function escHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    // Alias used in B2 products section and old products section
    const escapeHtml = escHtml;

    async function executeD1Action(sql, successMsg, callback) {
        try {
            // Use the jobs API with direct approach - we need a direct DB endpoint
            // For now use the businesses approve pattern
            const token = localStorage.getItem(TOKEN_KEY);
            // Call a generic admin action via PATCH to jobs
            const resp = await fetch(`/api/jobs/${sql.split(' ')[2].split('=')[0]}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: sql.includes('DELETE') ? 'delete' : sql.includes('approved') ? 'approve' : 'reject' })
            });
            if (resp.ok) {
                showToast(successMsg, 'success');
                if (callback) callback();
            } else {
                showToast('Error en la acción', 'error');
            }
        } catch (err) {
            showToast(err.message || 'Error', 'error');
        }
    }

    // ─── HTML Escape Helper (aliased above as escapeHtml = escHtml) ──
    // Note: escHtml declared above, escapeHtml is an alias. Do NOT re-declare.

    // ─── Featured Businesses Selector ──────────────────────────
    async function loadFeaturedSelector() {
        const container = document.getElementById('featuredBusinessesContainer');
        if (!container) return;

        try {
            // Get all approved businesses
            const data = await api.get('/businesses?status=approved&limit=200');
            const businesses = data.businesses || [];

            if (businesses.length === 0) {
                container.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;">No hay negocios aprobados.</p>';
                return;
            }

            // Get currently featured businesses from featured_items table
            const featuredData = await api.get('/featured-items?item_type=business');
            const featured = featuredData.featured_items || [];
            const featuredIds = new Set(featured.map(f => f.item_id));

            let html = '<div style="display:flex;flex-direction:column;gap:8px;">';

            // Show currently featured
            html += '<div style="margin-bottom:8px;font-size:0.82rem;color:#6b7280;font-weight:600;">Negocios actualmente destacados:</div>';

            const featuredBusinesses = businesses.filter(b => featuredIds.has(b.id));
            featuredBusinesses.forEach(b => {
                html += `<label style="display:flex;align-items:center;gap:10px;padding:10px;border:2px solid #f59e0b;border-radius:10px;background:#fffbeb;cursor:pointer;">
                    <input type="checkbox" class="featured-checkbox" value="${b.id}" checked style="width:18px;height:18px;accent-color:#f59e0b;">
                    <img src="${b.cover_image || (b.images && b.images[0] && b.images[0].url) || ''}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.88rem;">${escapeHtml(b.title)}</div>
                        <div style="font-size:0.78rem;color:#6b7280;">${escapeHtml(b.category_name || b.city || '')}</div>
                    </div>
                </label>`;
            });

            // Show non-featured
            const nonFeatured = businesses.filter(b => !featuredIds.has(b.id));
            if (nonFeatured.length > 0) {
                html += '<div style="margin-top:12px;margin-bottom:8px;font-size:0.82rem;color:#6b7280;font-weight:600;">Otros negocios (selecciona para destacar):</div>';

                nonFeatured.forEach(b => {
                    html += `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;">
                        <input type="checkbox" class="featured-checkbox" value="${b.id}" style="width:18px;height:18px;accent-color:#f59e0b;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(b.title)}</div>
                            <div style="font-size:0.78rem;color:#6b7280;">${escapeHtml(b.category_name || b.city || '')}</div>
                        </div>
                    </label>`;
                });
            }

            html += '</div>';
            html += '<button class="btn btn-primary" style="margin-top:16px;background:linear-gradient(135deg,#f59e0b,#d97706);" onclick="window._adminSaveFeatured()"><i class="fas fa-save"></i> Guardar Destacados</button>';

            container.innerHTML = html;

            // Limit to 3 checkboxes
            const checkboxes = container.querySelectorAll('.featured-checkbox');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    const checked = container.querySelectorAll('.featured-checkbox:checked');
                    if (checked.length > 3) {
                        cb.checked = false;
                        showToast('Máximo 3 negocios destacados', 'warning');
                    }
                });
            });

        } catch (err) {
            console.error('Error loading featured selector:', err);
            container.innerHTML = '<p style="color:#e74c3c;font-size:0.85rem;">Error al cargar negocios.</p>';
        }
    }

    async function saveFeaturedBusinesses() {
        const container = document.getElementById('featuredBusinessesContainer');
        if (!container) return;

        const checked = container.querySelectorAll('.featured-checkbox:checked');
        const selectedIds = Array.from(checked).map(cb => parseInt(cb.value));

        try {
            // Remove existing business featured items from featured_items table
            const existing = await api.get('/featured-items?item_type=business');
            for (const item of (existing.featured_items || [])) {
                try { await api.delete(`/featured-items/${item.id}`); } catch(e) {}
            }

            // Re-add selected businesses to featured_items table (like products/properties/jobs do)
            for (const id of selectedIds) {
                try { await api.post('/featured-items', { item_type: 'business', item_id: id }); } catch(e) {}
            }

            showToast(`${selectedIds.length} negocio(s) destacado(s) guardado(s)`, 'success');
            loadFeaturedSelector();
        } catch (err) {
            showToast('Error al guardar destacados: ' + err.message, 'error');
        }
    }

    window._adminSaveFeatured = saveFeaturedBusinesses;

    // ─── Settings Functions ───────────────────────────────────
    async function loadSettings() {
        try {
            const data = await api.get('/settings');
            const settings = data.settings || data;

            // Populate toggle checkboxes
            document.querySelectorAll('[data-key]').forEach(el => {
                const key = el.dataset.key;
                const value = settings[key];
                if (el.type === 'checkbox') {
                    el.checked = value === '1' || value === 'true';
                } else {
                    el.value = value || '';
                }
            });
        } catch (error) {
            console.error('Error loading settings:', error);
            showToast('Error al cargar configuración', 'error');
        }

        // Load featured businesses selector
        loadFeaturedSelector();
        // Load featured products & properties selectors
        loadFeaturedProductsSelector();
        loadFeaturedPropertiesSelector();
        loadFeaturedJobsSelector();
    }

    async function saveSettings() {
        try {
            const updates = {};
            document.querySelectorAll('[data-key]').forEach(el => {
                const key = el.dataset.key;
                if (el.type === 'checkbox') {
                    updates[key] = el.checked ? '1' : '0';
                } else {
                    updates[key] = el.value;
                }
            });

            await api.put('/settings', updates);
            showToast('Configuración guardada exitosamente', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showToast('Error al guardar configuración: ' + error.message, 'error');
        }
    }

    // ─── Products Management ────────────────────────────────────
    async function loadProducts() {
        try {
            const filter = document.getElementById('adminProductStatusFilter');
            const statusFilter = filter ? filter.value : '';
            
            let url = `/marketplace?page=${productsPage}&limit=${PAGE_LIMIT}&all=true`;
            if (statusFilter) url += `&status=${statusFilter}`;
            
            const data = await api.get(url);
            const products = data.products || [];
            
            // Update badge
            const pendingCount = await api.get('/marketplace?status=pending&all=true&limit=1');
            const badge = document.getElementById('adminProductsBadge');
            if (badge) badge.textContent = pendingCount.pagination?.total || 0;
            
            const tbody = document.getElementById('adminProductsTableBody');
            if (!tbody) return;
            
            if (products.length === 0) {
                tbody.innerHTML = `<tr class="empty-row"><td colspan="8"><div class="empty-state-sm"><p>No hay productos.</p></div></td></tr>`;
                return;
            }
            
            tbody.innerHTML = products.map(p => {
                const statusClass = p.status === 'approved' ? 'admin-badge-green' : p.status === 'rejected' ? 'admin-badge-red' : 'admin-badge-yellow';
                const statusLabel = p.status === 'approved' ? 'Aprobado' : p.status === 'rejected' ? 'Rechazado' : 'Pendiente';
                const price = p.price ? `$${parseFloat(p.price).toFixed(2)}` : '$0.00';
                const date = p.created_at ? new Date(p.created_at).toLocaleDateString('es-VE') : '-';
                
                let actions = '';
                if (p.status === 'pending') {
                    actions = `
                        <button class="admin-action-btn admin-action-approve" onclick="window._adminApproveProduct(${p.id})" title="Aprobar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="admin-action-btn admin-action-reject" onclick="window._adminRejectProduct(${p.id})" title="Rechazar">
                            <i class="fas fa-times"></i>
                        </button>`;
                } else if (p.status === 'rejected') {
                    actions = `
                        <button class="admin-action-btn admin-action-approve" onclick="window._adminApproveProduct(${p.id})" title="Aprobar">
                            <i class="fas fa-check"></i>
                        </button>`;
                }
                
                return `<tr>
                    <td>${p.id}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                            ${p.image ? `<img src="${p.image}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">` : '<div style="width:40px;height:40px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;"><i class="fas fa-box" style="color:#94a3b8;font-size:0.8rem;"></i></div>'}
                            <div>
                                <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(p.name)}</div>
                                ${p.business_name ? `<div style="font-size:0.72rem;color:#6366f1;"><i class="fas fa-store" style="font-size:0.65rem;"></i> ${escapeHtml(p.business_name)}</div>` : ''}
                                ${p.description ? `<div style="font-size:0.75rem;color:#94a3b8;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.description)}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td><span style="font-size:0.8rem;">${escapeHtml(p.category || 'general')}</span></td>
                    <td style="font-weight:600;color:#059669;">${price}</td>
                    <td style="font-size:0.8rem;">
                        <div>${escapeHtml(p.owner_name || 'Usuario')}</div>
                        ${p.owner_email ? `<div style="font-size:0.7rem;color:#94a3b8;">${escapeHtml(p.owner_email)}</div>` : ''}
                    </td>
                    <td><span class="admin-status-badge ${statusClass}">${statusLabel}</span></td>
                    <td style="font-size:0.78rem;color:#94a3b8;">${date}</td>
                    <td><div style="display:flex;gap:6px;">${actions}</div></td>
                </tr>`;
            }).join('');
            
            // Pagination
            renderProductsPagination(data.pagination);
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Error al cargar productos', 'error');
        }
    }
    
    function renderProductsPagination(pagination) {
        const container = document.getElementById('adminProductsPagination');
        if (!container || !pagination) return;
        
        const { page, totalPages } = pagination;
        let html = '';
        
        if (page > 1) {
            html += `<button class="admin-page-btn" onclick="window._adminProductsPage(${page - 1})"><i class="fas fa-chevron-left"></i></button>`;
        }
        
        for (let i = 1; i <= totalPages; i++) {
            if (totalPages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== totalPages) {
                if (i === page - 3 || i === page + 3) html += '<span style="padding:0 4px;">...</span>';
                continue;
            }
            html += `<button class="admin-page-btn ${i === page ? 'active' : ''}" onclick="window._adminProductsPage(${i})">${i}</button>`;
        }
        
        if (page < totalPages) {
            html += `<button class="admin-page-btn" onclick="window._adminProductsPage(${page + 1})"><i class="fas fa-chevron-right"></i></button>`;
        }
        
        container.innerHTML = html;
    }
    
    async function approveProduct(id) {
        try {
            await api.post(`/marketplace/${id}/approve`);
            showToast('Producto aprobado exitosamente', 'success');
            loadProducts();
            loadDashboardStats();
        } catch (error) {
            console.error('Error approving product:', error);
            showToast('Error al aprobar producto: ' + error.message, 'error');
        }
    }
    
    async function rejectProduct(id) {
        try {
            await api.post(`/marketplace/${id}/reject`);
            showToast('Producto rechazado', 'success');
            loadProducts();
            loadDashboardStats();
        } catch (error) {
            console.error('Error rejecting product:', error);
            showToast('Error al rechazar producto: ' + error.message, 'error');
        }
    }
    
    // Expose for inline onclick
    window._adminApproveProduct = approveProduct;
    window._adminRejectProduct = rejectProduct;
    window._adminProductsPage = function(page) {
        productsPage = page;
        loadProducts();
    };

    // ─── Featured Products Selector ──────────────────────────────
    async function loadFeaturedProductsSelector() {
        const container = document.getElementById('featuredProductsContainer');
        if (!container) return;
        try {
            const [allData, featuredData] = await Promise.all([
                api.get('/marketplace?limit=200&all=true'),
                api.get('/featured-items?item_type=product')
            ]);
            const products = allData.products || [];
            const featured = featuredData.featured_items || [];
            const featuredIds = new Set(featured.map(f => f.item_id));

            if (products.length === 0) {
                container.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;">No hay productos disponibles.</p>';
                return;
            }

            let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
            html += '<div style="margin-bottom:8px;font-size:0.82rem;color:#6b7280;font-weight:600;">Productos actualmente destacados:</div>';

            products.filter(p => featuredIds.has(p.id)).forEach(p => {
                const price = p.price ? `$${parseFloat(p.price).toFixed(2)}` : '';
                html += `<label style="display:flex;align-items:center;gap:10px;padding:10px;border:2px solid #2563eb;border-radius:10px;background:#eff6ff;cursor:pointer;">
                    <input type="checkbox" class="featured-product-checkbox" value="${p.id}" checked style="width:18px;height:18px;accent-color:#2563eb;">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(p.name)}</div>
                        <div style="font-size:0.75rem;color:#6b7280;">${escapeHtml(p.category || '')} ${price ? '· ' + price : ''}</div>
                    </div>
                </label>`;
            });

            const nonFeatured = products.filter(p => !featuredIds.has(p.id));
            if (nonFeatured.length > 0) {
                html += '<div style="margin-top:12px;margin-bottom:8px;font-size:0.82rem;color:#6b7280;font-weight:600;">Otros productos (selecciona para destacar):</div>';
                nonFeatured.slice(0, 30).forEach(p => {
                    const price = p.price ? `$${parseFloat(p.price).toFixed(2)}` : '';
                    html += `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;">
                        <input type="checkbox" class="featured-product-checkbox" value="${p.id}" style="width:18px;height:18px;accent-color:#2563eb;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(p.name)}</div>
                            <div style="font-size:0.75rem;color:#6b7280;">${escapeHtml(p.category || '')} ${price ? '· ' + price : ''}</div>
                        </div>
                    </label>`;
                });
                if (nonFeatured.length > 30) {
                    html += `<p style="font-size:0.78rem;color:#9ca3af;text-align:center;">... y ${nonFeatured.length - 30} más. Usa la sección de productos para ver todos.</p>`;
                }
            }

            html += '</div>';
            html += '<button class="btn btn-primary" style="margin-top:16px;background:linear-gradient(135deg,#2563eb,#1d4ed8);" onclick="window._adminSaveFeaturedProducts()"><i class="fas fa-save"></i> Guardar Productos Destacados</button>';
            container.innerHTML = html;

            container.querySelectorAll('.featured-product-checkbox').forEach(cb => {
                cb.addEventListener('change', () => {
                    const checked = container.querySelectorAll('.featured-product-checkbox:checked');
                    if (checked.length > 6) { cb.checked = false; showToast('Máximo 6 productos destacados', 'warning'); }
                });
            });
        } catch (err) {
            console.error('Error loading featured products:', err);
            container.innerHTML = '<p style="color:#e74c3c;font-size:0.85rem;">Error al cargar productos.</p>';
        }
    }

    async function saveFeaturedProducts() {
        const container = document.getElementById('featuredProductsContainer');
        if (!container) return;
        const checked = container.querySelectorAll('.featured-product-checkbox:checked');
        const selectedIds = Array.from(checked).map(cb => parseInt(cb.value));
        try {
            // Remove existing product featured items
            const existing = await api.get('/featured-items?item_type=product');
            for (const item of (existing.featured_items || [])) {
                try { await api.delete(`/featured-items/${item.id}`); } catch(e) {}
            }
            // Add new featured products
            for (const id of selectedIds) {
                try { await api.post('/featured-items', { item_type: 'product', item_id: id }); } catch(e) {}
            }
            showToast(`${selectedIds.length} producto(s) destacado(s)`, 'success');
            loadFeaturedProductsSelector();
        } catch (err) {
            showToast('Error al guardar productos destacados: ' + err.message, 'error');
        }
    }
    window._adminSaveFeaturedProducts = saveFeaturedProducts;

    // ─── Featured Properties Selector ────────────────────────────
    async function loadFeaturedPropertiesSelector() {
        const container = document.getElementById('featuredPropertiesContainer');
        if (!container) return;
        try {
            const [allData, featuredData] = await Promise.all([
                api.get('/properties?limit=200&all=true'),
                api.get('/featured-items?item_type=property')
            ]);
            const properties = allData.properties || [];
            const featured = featuredData.featured_items || [];
            const featuredIds = new Set(featured.map(f => f.item_id));

            if (properties.length === 0) {
                container.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;">No hay inmuebles disponibles.</p>';
                return;
            }

            let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
            html += '<div style="margin-bottom:8px;font-size:0.82rem;color:#6b7280;font-weight:600;">Inmuebles actualmente destacados:</div>';

            properties.filter(p => featuredIds.has(p.id)).forEach(p => {
                const price = p.price ? `$${parseFloat(p.price).toLocaleString('es-VE')}` : '';
                html += `<label style="display:flex;align-items:center;gap:10px;padding:10px;border:2px solid #059669;border-radius:10px;background:#ecfdf5;cursor:pointer;">
                    <input type="checkbox" class="featured-property-checkbox" value="${p.id}" checked style="width:18px;height:18px;accent-color:#059669;">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(p.title)}</div>
                        <div style="font-size:0.75rem;color:#6b7280;">${escapeHtml(p.property_type || '')} · ${escapeHtml(p.city || '')} ${price ? '· ' + price : ''}</div>
                    </div>
                </label>`;
            });

            const nonFeatured = properties.filter(p => !featuredIds.has(p.id));
            if (nonFeatured.length > 0) {
                html += '<div style="margin-top:12px;margin-bottom:8px;font-size:0.82rem;color:#6b7280;font-weight:600;">Otros inmuebles (selecciona para destacar):</div>';
                nonFeatured.slice(0, 30).forEach(p => {
                    const price = p.price ? `$${parseFloat(p.price).toLocaleString('es-VE')}` : '';
                    html += `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;">
                        <input type="checkbox" class="featured-property-checkbox" value="${p.id}" style="width:18px;height:18px;accent-color:#059669;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(p.title)}</div>
                            <div style="font-size:0.75rem;color:#6b7280;">${escapeHtml(p.property_type || '')} · ${escapeHtml(p.city || '')} ${price ? '· ' + price : ''}</div>
                        </div>
                    </label>`;
                });
                if (nonFeatured.length > 30) {
                    html += `<p style="font-size:0.78rem;color:#9ca3af;text-align:center;">... y ${nonFeatured.length - 30} más. Usa la sección de inmuebles para ver todos.</p>`;
                }
            }

            html += '</div>';
            html += '<button class="btn btn-primary" style="margin-top:16px;background:linear-gradient(135deg,#059669,#047857);" onclick="window._adminSaveFeaturedProperties()"><i class="fas fa-save"></i> Guardar Inmuebles Destacados</button>';
            container.innerHTML = html;

            container.querySelectorAll('.featured-property-checkbox').forEach(cb => {
                cb.addEventListener('change', () => {
                    const checked = container.querySelectorAll('.featured-property-checkbox:checked');
                    if (checked.length > 6) { cb.checked = false; showToast('Máximo 6 inmuebles destacados', 'warning'); }
                });
            });
        } catch (err) {
            console.error('Error loading featured properties:', err);
            container.innerHTML = '<p style="color:#e74c3c;font-size:0.85rem;">Error al cargar inmuebles.</p>';
        }
    }

    async function saveFeaturedProperties() {
        const container = document.getElementById('featuredPropertiesContainer');
        if (!container) return;
        const checked = container.querySelectorAll('.featured-property-checkbox:checked');
        const selectedIds = Array.from(checked).map(cb => parseInt(cb.value));
        try {
            const existing = await api.get('/featured-items?item_type=property');
            for (const item of (existing.featured_items || [])) {
                try { await api.delete(`/featured-items/${item.id}`); } catch(e) {}
            }
            for (const id of selectedIds) {
                try { await api.post('/featured-items', { item_type: 'property', item_id: id }); } catch(e) {}
            }
            showToast(`${selectedIds.length} inmueble(s) destacado(s)`, 'success');
            loadFeaturedPropertiesSelector();
        } catch (err) {
            showToast('Error al guardar inmuebles destacados: ' + err.message, 'error');
        }
    }
    window._adminSaveFeaturedProperties = saveFeaturedProperties;

    // ─── Featured Jobs Selector ──────────────────────────────
    async function loadFeaturedJobsSelector() {
        const container = document.getElementById('featuredJobsContainer');
        if (!container) return;
        try {
            const [allData, featuredData] = await Promise.all([
                api.get('/jobs?limit=200&all=true'),
                api.get('/featured-items?item_type=job')
            ]);
            const jobs = allData.jobs || [];
            const featured = featuredData.featured_items || [];
            const featuredIds = new Set(featured.map(f => f.item_id));

            if (jobs.length === 0) {
                container.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;">No hay empleos disponibles.</p>';
                return;
            }

            let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
            html += '<div style="margin-bottom:8px;font-size:0.82rem;color:#6b7280;font-weight:600;">Empleos actualmente destacados:</div>';

            jobs.filter(j => featuredIds.has(j.id)).forEach(j => {
                const salary = j.salary ? `$${j.salary}` : '';
                html += `<label style="display:flex;align-items:center;gap:10px;padding:10px;border:2px solid #8b5cf6;border-radius:10px;background:#f5f3ff;cursor:pointer;">
                    <input type="checkbox" class="featured-job-checkbox" value="${j.id}" checked style="width:18px;height:18px;accent-color:#8b5cf6;">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(j.title)}</div>
                        <div style="font-size:0.75rem;color:#6b7280;">${escapeHtml(j.company_name || '')} · ${escapeHtml(j.city || '')} ${salary ? '· ' + salary : ''}</div>
                    </div>
                </label>`;
            });

            const nonFeatured = jobs.filter(j => !featuredIds.has(j.id));
            if (nonFeatured.length > 0) {
                html += '<div style="margin-top:12px;margin-bottom:8px;font-size:0.82rem;color:#6b7280;font-weight:600;">Otros empleos (selecciona para destacar):</div>';
                nonFeatured.slice(0, 40).forEach(j => {
                    const salary = j.salary ? `$${j.salary}` : '';
                    html += `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;">
                        <input type="checkbox" class="featured-job-checkbox" value="${j.id}" style="width:18px;height:18px;accent-color:#8b5cf6;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(j.title)}</div>
                            <div style="font-size:0.75rem;color:#6b7280;">${escapeHtml(j.company_name || '')} · ${escapeHtml(j.city || '')} ${salary ? '· ' + salary : ''}</div>
                        </div>
                    </label>`;
                });
                if (nonFeatured.length > 40) {
                    html += `<p style="font-size:0.78rem;color:#9ca3af;text-align:center;">... y ${nonFeatured.length - 40} más.</p>`;
                }
            }

            html += '</div>';
            html += '<button class="btn btn-primary" style="margin-top:16px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);" onclick="window._adminSaveFeaturedJobs()"><i class="fas fa-save"></i> Guardar Empleos Destacados</button>';
            container.innerHTML = html;

            container.querySelectorAll('.featured-job-checkbox').forEach(cb => {
                cb.addEventListener('change', () => {
                    const checked = container.querySelectorAll('.featured-job-checkbox:checked');
                    if (checked.length > 4) { cb.checked = false; showToast('Máximo 4 empleos destacados', 'warning'); }
                });
            });
        } catch (err) {
            console.error('Error loading featured jobs:', err);
            container.innerHTML = '<p style="color:#e74c3c;font-size:0.85rem;">Error al cargar empleos.</p>';
        }
    }

    async function saveFeaturedJobs() {
        const container = document.getElementById('featuredJobsContainer');
        if (!container) return;
        const checked = container.querySelectorAll('.featured-job-checkbox:checked');
        const selectedIds = Array.from(checked).map(cb => parseInt(cb.value));
        try {
            const existing = await api.get('/featured-items?item_type=job');
            for (const item of (existing.featured_items || [])) {
                try { await api.delete(`/featured-items?id=${item.id}`); } catch(e) {}
            }
            for (const id of selectedIds) {
                try { await api.post('/featured-items', { item_type: 'job', item_id: id }); } catch(e) {}
            }
            showToast(`${selectedIds.length} empleo(s) destacado(s)`, 'success');
            loadFeaturedJobsSelector();
        } catch (err) {
            showToast('Error al guardar empleos destacados: ' + err.message, 'error');
        }
    }
    window._adminSaveFeaturedJobs = saveFeaturedJobs;

    // ─── Initialize on DOM Ready ────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
