/**
 * Un Click - Admin Panel Module
 * Loaded on admin.html
 */

// ─── Multi-video helpers (global, must be outside IIFE) ──────
if (!window._editBizVideos) window._editBizVideos = [];
if (!window._parseVideoUrls) {
    window._parseVideoUrls = function(video_url) {
        if (!video_url) return [];
        if (video_url.startsWith('[')) { try { return JSON.parse(video_url); } catch(e) { return [video_url]; } }
        return [video_url];
    };
}
if (!window._getVideoUrlsJSON) {
    window._getVideoUrlsJSON = function() {
        return JSON.stringify(window._editBizVideos.map(function(v) { return v.url; }));
    };
}
if (!window._renderVideoList) {
    window._renderVideoList = function(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        window._editBizVideos.forEach(function(v, i) {
            var item = document.createElement('div');
            item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;background:#8B0000;border:1px solid #8B0000;border-radius:10px;font-size:0.82rem;';
            var label = v.url.length > 60 ? v.url.substring(0, 60) + '...' : v.url;
            if (v.type === 'file') { var m = v.url.match(/([^/]+)$/); label = m ? m[1] : v.url; }
            var numSpan = document.createElement('span');
            numSpan.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#8B0000;color:#8B0000;font-size:0.72rem;font-weight:700;flex-shrink:0;';
            numSpan.textContent = (i + 1);
            var textSpan = document.createElement('span');
            textSpan.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#334155;font-family:monospace;';
            textSpan.textContent = label;
            textSpan.title = v.url;
            var removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:none;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:0.8rem;flex-shrink:0;';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', function() {
                window._editBizVideos.splice(i, 1);
                window._renderVideoList(containerId);
            });
            item.appendChild(numSpan);
            item.appendChild(textSpan);
            item.appendChild(removeBtn);
            container.appendChild(item);
        });
    };
}

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    //  ESTADO GLOBAL - Variables compartidas entre secciones
    // ═══════════════════════════════════════════════════════════

    // ─── State ──────────────────────────────────────────────────
    let currentTab = 'dashboard';
    let currentDeleteAction = null; // { type, id, callback }
    let currentRejectId = null;

    // Pagination state
    let propsPage = 1;
    let usersPage = 1;
    let msgsPage = 1;
    let jobsPage = 1;
    let editingJobId = null;
    let inmueblesPage = 1;
    let productsPage = 1;
    let premiumPage = 1;
    let notifPage = 1;
    let premiumFilter = 'pending';
    let premiumActivateUserId = null;
    const PAGE_LIMIT = 15;

    // ═══════════════════════════════════════════════════════════
    //  ELEMENTOS DEL DOM - Referencias a elementos HTML
    // ═══════════════════════════════════════════════════════════

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
    const tabPremium = document.getElementById('tabPremium');
    const tabProducts = document.getElementById('tabProducts');
    const tabEditBiz = document.getElementById('tabEditBiz');
    const tabPopup = document.getElementById('tabPopup');
    const tabBazar = document.getElementById('tabBazar');
    const tabCarousel = document.getElementById('tabCarousel');
    const tabNotifications = document.getElementById('tabNotifications');
    const tabAcademy = document.getElementById('tabAcademy');

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

    // Premium modals
    const premiumVoucherModal = document.getElementById('premiumVoucherModal');
    const premiumActivateModal = document.getElementById('premiumActivateModal');

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

    // ─── Agent Read-Only Mode ────────────────────────────────
    function applyReadOnlyMode() {
        // Disable all action buttons (delete, save, approve, reject, create, etc.)
        document.querySelectorAll('button').forEach(btn => {
            const text = (btn.textContent || '').toLowerCase();
            const icon = btn.querySelector('i');
            const hasDangerIcon = icon && (icon.classList.contains('fa-trash') || icon.classList.contains('fa-ban'));
            const isAction = text.includes('eliminar') || text.includes('borrar') || text.includes('eliminar')
                || text.includes('aprobar') || text.includes('rechazar') || text.includes('guardar')
                || text.includes('crear') || text.includes('agregar') || text.includes('eliminar')
                || text.includes('activar') || text.includes('desactivar') || text.includes('importar')
                || hasDangerIcon;

            // Allow profile editing and navigation
            const isProfileBtn = btn.closest('#sectionProfile') || text.includes('perfil');
            const isNavBtn = btn.closest('.admin-sidebar') || btn.closest('.admin-tabs') || text.includes('volver');

            if (isAction && !isProfileBtn && !isNavBtn) {
                btn.disabled = true;
                btn.style.opacity = '0.4';
                btn.style.cursor = 'not-allowed';
                btn.style.pointerEvents = 'none';
            }
        });

        // Disable all inputs/textarea/selects EXCEPT in profile section
        document.querySelectorAll('input, textarea, select').forEach(el => {
            if (!el.closest('#sectionProfile')) {
                if (el.type !== 'hidden' && el.type !== 'search') {
                    el.disabled = true;
                    el.style.opacity = '0.6';
                }
            }
        });

        // Disable role toggles for agents
        document.querySelectorAll('.role-toggle-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.4';
            btn.style.cursor = 'not-allowed';
            btn.style.pointerEvents = 'none';
        });

        // Add read-only banner
        const header = document.querySelector('.admin-main') || document.querySelector('.admin-content');
        if (header) {
            const banner = document.createElement('div');
            banner.style.cssText = 'background:linear-gradient(135deg,#8B0000,#8B0000);color:#8B0000;padding:10px 16px;border-radius:10px;margin-bottom:16px;font-size:0.88rem;font-weight:600;display:flex;align-items:center;gap:8px;';
            banner.innerHTML = '<i class="fas fa-eye"></i> Modo Agente — Solo lectura. Puedes ver la información pero no modificarla. Usa "Mi Perfil" para editar tus datos.';
            header.insertBefore(banner, header.firstChild);
        }

        // Hide certain tabs that agents shouldn't see
        const hideTabs = ['tabUsers', 'tabMessages', 'tabPremium', 'tabEditBiz'];
        hideTabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) tab.style.display = 'none';
        });

        // Also hide sidebar items for hidden tabs
        hideTabs.forEach(tabId => {
            const sideLink = document.querySelector(`.admin-sidebar a[data-tab="${tabId}"]`);
            if (sideLink) sideLink.closest('li')?.remove();
        });

        showToast('Modo Agente: Vista de solo lectura activada', 'info');
    }

    // ─── Initialization ─────────────────────────────────────────
    async function init() {
        // Check auth
        if (!isAuthenticated()) {
            window.location.href = '/login.html';
            return;
        }

        // Check admin or agent role
        const user = getCachedUser();
        const isAgent = user && user.role === 'agent';

        if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
            showToast('Acceso denegado. Solo administradores o agentes.', 'error');
            setTimeout(() => {
                    window.location.href = '/index.html';
            }, 1500);
            return;
        }

        // Agent read-only mode
        if (isAgent) {
            applyReadOnlyMode();
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
        setupInmuebleEditModal();
        loadBusinessesForJobSelect();
        setupPremiumListeners();

        // Load initial data
        loadDashboardTab();

        // One-time: fix En-Santiago jobs logo in background
        fetch('/api/jobs/fix-En-Santiago-logo', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem(TOKEN_KEY), 'Content-Type': 'application/json' }
        }).then(r => r.json()).then(d => {
            if (d.updated > 0) console.log('En-Santiago logo migration: ' + d.updated + ' jobs updated');
        }).catch(() => {});
    }

    // ─── Tab Navigation ─────────────────────────────────────────
    function setupTabNavigation() {
        document.querySelectorAll('.admin-nav-link:not(.admin-nav-external)').forEach(link => {
            link.addEventListener('click', (e) => {
                const tab = link.dataset.tab;
                if (tab) {
                    e.preventDefault();
                    switchTab(tab);
                }
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

    // ═══════════════════════════════════════════════════════════
    //  NAVEGACIÓN DE TABS - Sistema de pestañas del panel admin
    //  Cada case activa una sección del sidebar y carga su contenido
    // ═══════════════════════════════════════════════════════════

    function switchTab(tab) {
        currentTab = tab;

        // Update nav links
        document.querySelectorAll('.admin-nav-link:not(.admin-nav-external)').forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tab);
        });

        // Hide all tab panels
        const panels = { dashboard: tabDashboard, businesses: tabProperties, products: tabProducts, users: tabUsers, messages: tabMessages, facebook: tabFacebook, jobs: tabJobs, inmuebles: tabInmuebles, settings: tabSettings, premium: tabPremium, editbiz: tabEditBiz, categories: document.getElementById('tabCategories'), popup: tabPopup, bazar: tabBazar, carousel: tabCarousel, notifications: tabNotifications, academy: tabAcademy };
        for (const [key, panel] of Object.entries(panels)) {
            if (panel) {
                panel.classList.toggle('hidden', key !== tab);
            }
        }

        // Update page title
        const titles = { dashboard: 'Dashboard', businesses: 'Negocios', users: 'Usuarios', messages: 'Mensajes', facebook: 'Facebook Import', jobs: 'Empleo', inmuebles: 'Inmuebles', settings: 'Configuración', premium: 'Pagos Premium', editbiz: 'Editar Negocios', categories: 'Categorías', popup: 'Ventana Emergente', bazar: 'Bazar', carousel: 'Carrusel de Videos', notifications: 'Notificaciones', academy: 'Academia' };
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
                loadAdminMsgUserDropdown();
                setupAdminSendMsg();
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
            case 'premium':
                premiumPage = 1;
                loadPremiumTab();
                break;
            case 'editbiz':
                loadEditBizList();
                break;
            case 'categories':
                loadAdmin2Categories();
                loadAdmin2CatSuggestions();
                break;
            case 'popup':
                loadPopupTab();
                break;
            case 'bazar':
                loadBazarTab();
                break;
            case 'carousel':
                loadCarouselTab();
                break;
            case 'notifications':
                notifPage = 1;
                loadAdminNotifications();
                break;
            case 'academy':
                loadAcademyTab();
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

    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: DASHBOARD - Estadísticas generales
    //  Muestra totales de usuarios, negocios, mensajes, pendientes
    //  Funciones: loadDashboardStats(), loadDashboardTab(),
    //            loadRecentProperties(), loadRecentUsers()
    // ═══════════════════════════════════════════════════════════

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
    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: NEGOCIOS - Gestión de negocios registrados
    //  Listar, aprobar, rechazar, editar, eliminar negocios
    //  Funciones: loadProperties(), loadUsers(), loadBizEditGallery()
    //  Exporta: window.admin (edición inline), window._adminSetCover,
    //            window._adminDeleteBizImage
    // ═══════════════════════════════════════════════════════════

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
                toggleHTML += `<button class="role-toggle-btn ${currentRole === 'agent' ? 'active-agent' : ''} ${isSelf ? 'self-badge' : ''}" data-role="agent" ${isSelf ? 'disabled' : ''}><i class="fas fa-store"></i> Agente</button>`;
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
                                <i class="fas ${currentRole === 'admin' ? 'fa-shield-alt' : currentRole === 'agent' ? 'fa-store' : 'fa-user'}"></i>
                                ${currentRole === 'admin' ? 'Admin' : currentRole === 'agent' ? 'Agente' : 'Usuario'}
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
            showToast(`Rol cambiado a ${newRole === 'admin' ? 'Administrador' : newRole === 'agent' ? 'Agente' : 'Usuario'} exitosamente`, 'success');

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
                            <i class="fas ${newRole === 'admin' ? 'fa-shield-alt' : newRole === 'agent' ? 'fa-store' : 'fa-user'}"></i>
                            ${newRole === 'admin' ? 'Admin' : newRole === 'agent' ? 'Agente' : 'Usuario'}
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
            modalBody.innerHTML = '<div class="loading-spinner" style="padding:40px;text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#8B0000;"></i><p style="margin-top:12px;color:#888;">Cargando datos del usuario...</p></div>';
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

        // Banner upload handlers
        const bannerFileInput = document.getElementById('bizEditBannerFile');
        const bannerCameraInput = document.getElementById('bizEditBannerCamera');
        if (bannerFileInput) bannerFileInput.addEventListener('change', (e) => handleBizBannerUpload(e.target.files[0]));
        if (bannerCameraInput) bannerCameraInput.addEventListener('change', (e) => handleBizBannerUpload(e.target.files[0]));

        // Banner remove button
        const bannerRemoveBtn = document.getElementById('bizEditBannerRemove');
        if (bannerRemoveBtn) bannerRemoveBtn.addEventListener('click', () => {
            document.getElementById('bizEditBannerUrl').value = '';
            document.getElementById('bizEditBannerPreview').innerHTML = '';
            bannerRemoveBtn.style.display = 'none';
        });

        // ─── Multi-video handlers for admin edit ───
        const videoAddBtn = document.getElementById('bizEditVideoAddBtn');
        const videoUrlInput = document.getElementById('bizEditVideoUrl');
        const videoFileInput = document.getElementById('bizEditVideoFileInput');
        if (videoAddBtn && videoUrlInput) {
            videoAddBtn.addEventListener('click', () => {
                const url = videoUrlInput.value.trim();
                if (!url) return;
                window._editBizVideos.push({ url, type: 'url' });
                videoUrlInput.value = '';
                window._renderVideoList('bizEditVideosList');
            });
            videoUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); videoAddBtn.click(); }
            });
        }
        if (videoFileInput) {
            videoFileInput.addEventListener('change', function() {
                const files = this.files;
                if (!files || !files.length) return;
                const infoDiv = document.getElementById('bizEditVideoFileInfo');
                Array.from(files).forEach(file => {
                    if (!file.type.startsWith('video/')) { showToast(file.name + ': Solo video', 'error'); return; }
                    if (file.size > 50 * 1024 * 1024) { showToast(file.name + ': Max 50MB', 'error'); return; }
                    if (infoDiv) infoDiv.innerHTML += '<div style="padding:4px 8px;background:#8B0000;border-radius:6px;margin-top:4px;font-size:0.82rem;" id="adminUp_' + file.name.replace(/[^a-zA-Z0-9]/g, '_') + '"><i class="fas fa-spinner fa-spin"></i> ' + file.name + ' - Subiendo...</div>';
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('product_type', 'video');
                    api.postFormData('/upload', fd)
                    .then(data => {
                        if (data.url) {
                            window._editBizVideos.push({ url: data.url, type: 'file' });
                            window._renderVideoList('bizEditVideosList');
                            showToast(file.name + ' subido', 'success');
                        } else { showToast(data.error || 'Error al subir ' + file.name, 'error'); }
                        const el = document.getElementById('adminUp_' + file.name.replace(/[^a-zA-Z0-9]/g, '_'));
                        if (el) el.remove();
                    })
                    .catch(() => {
                        showToast('Error de conexion', 'error');
                        const el = document.getElementById('adminUp_' + file.name.replace(/[^a-zA-Z0-9]/g, '_'));
                        if (el) el.remove();
                    });
                });
                this.value = '';
            });
            // Upload button is now in HTML (bizEditVideoUploadBtn), no need to create dynamically
        }

        // ─── Gallery image handlers (add multiple) ───
        const galleryFiles = document.getElementById('bizEditGalleryFiles');
        const galleryCamera = document.getElementById('bizEditGalleryCamera');
        const galleryURL = document.getElementById('bizEditGalleryURL');
        const galleryURLBtn = document.getElementById('bizEditGalleryURLBtn');
        const galleryStatus = document.getElementById('bizEditGalleryStatus');

        async function uploadGalleryFile(file) {
            if (!adminBizEditModal.dataset.businessId) return;
            if (galleryStatus) galleryStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo ' + file.name + '...';
            try {
                const compressed = await compressImage(file);
                const fd = new FormData();
                fd.append('file', compressed);
                fd.append('business_id', adminBizEditModal.dataset.businessId);
                fd.append('product_type', 'business');
                const data = await api.postFormData('/upload', fd);
                if (!data.url) throw new Error(data.error || 'Error al subir');
                await api.post(`/images/${adminBizEditModal.dataset.businessId}`, { url: data.url, is_cover: 0 });
                showToast('Imagen agregada', 'success');
                loadBizEditGallery(parseInt(adminBizEditModal.dataset.businessId));
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
            if (galleryStatus) galleryStatus.innerHTML = '';
        }

        if (galleryFiles) {
            galleryFiles.addEventListener('change', function() {
                Array.from(this.files).forEach(file => uploadGalleryFile(file));
                this.value = '';
            });
        }
        if (galleryCamera) {
            galleryCamera.addEventListener('change', function() {
                if (this.files[0]) uploadGalleryFile(this.files[0]);
                this.value = '';
            });
        }
        if (galleryURL && galleryURLBtn) {
            const showBtn = () => { galleryURLBtn.style.display = galleryURL.value.trim() ? 'inline-block' : 'none'; };
            galleryURL.addEventListener('input', showBtn);
            galleryURL.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); galleryURLBtn.click(); } });
            galleryURLBtn.addEventListener('click', async () => {
                const url = galleryURL.value.trim();
                if (!url || !adminBizEditModal.dataset.businessId) return;
                galleryURLBtn.disabled = true;
                galleryURLBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Agregando...';
                try {
                    await api.post(`/images/${adminBizEditModal.dataset.businessId}`, { url, is_cover: 0 });
                    showToast('Imagen agregada por URL', 'success');
                    galleryURL.value = '';
                    galleryURLBtn.style.display = 'none';
                    loadBizEditGallery(parseInt(adminBizEditModal.dataset.businessId));
                } catch (err) {
                    showToast('Error: ' + err.message, 'error');
                }
                galleryURLBtn.disabled = false;
                galleryURLBtn.innerHTML = '<i class="fas fa-plus"></i> Agregar URL';
            });
        }
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

        // Reset banner
        const bannerPreview = document.getElementById('bizEditBannerPreview');
        const bannerUrl = document.getElementById('bizEditBannerUrl');
        const bannerRemove = document.getElementById('bizEditBannerRemove');
        if (bannerPreview) bannerPreview.innerHTML = '';
        if (bannerUrl) bannerUrl.value = '';
        if (bannerRemove) bannerRemove.style.display = 'none';

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
            document.getElementById('bizEditType').value = biz.business_type || 'negocio';
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

            // Video URL (multi)
            window._editBizVideos = [];
            if (biz.video_url) {
                const urls = window._parseVideoUrls ? window._parseVideoUrls(biz.video_url) : [biz.video_url];
                urls.forEach(u => { if (u) window._editBizVideos.push({ url: u, type: 'url' }); });
            }
            window._renderVideoList('bizEditVideosList');

            // Banner
            if (biz.banner) {
                const bPreview = document.getElementById('bizEditBannerPreview');
                const bUrl = document.getElementById('bizEditBannerUrl');
                const bRemove = document.getElementById('bizEditBannerRemove');
                if (bPreview) bPreview.innerHTML = '<img src="' + biz.banner + '" style="width:100%;height:180px;object-fit:cover;border-radius:10px;" onerror="this.parentElement.innerHTML=\'\'">';
                if (bUrl) bUrl.value = biz.banner;
                if (bRemove) bRemove.style.display = 'inline-flex';
            }

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

    // Handle banner upload for business edit modal
    async function handleBizBannerUpload(file) {
        if (!file) return;
        const statusEl = document.getElementById('bizEditBannerStatus');
        const removeBtn = document.getElementById('bizEditBannerRemove');
        const previewEl = document.getElementById('bizEditBannerPreview');
        const urlInput = document.getElementById('bizEditBannerUrl');

        if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo banner...';

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('product_type', 'banner');

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

            if (urlInput) urlInput.value = data.url;
            if (previewEl) previewEl.innerHTML = '<img src="' + data.url + '" style="width:100%;height:180px;object-fit:cover;border-radius:10px;" onerror="this.parentElement.innerHTML=\'\'">';
            if (removeBtn) removeBtn.style.display = 'inline-flex';
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-check" style="color:#28a745;"></i> Banner subido';
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
                galleryEl.innerHTML = '<div style="text-align:center;padding:16px;border:2px dashed #8B0000;border-radius:10px;color:#8B0000;font-size:0.85rem;"><i class="fas fa-images" style="font-size:1.5rem;display:block;margin-bottom:6px;"></i>Sin imágenes en la galería.<br><small>Usa los botones de abajo para agregar.</small></div>';
                return;
            }

            galleryEl.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
                images.map(img => `
                    <div style="position:relative;display:inline-block;border-radius:8px;overflow:hidden;border:2px solid ${img.is_cover ? '#f59e0b' : '#8B0000'};transition:border-color 0.2s;">
                        <img src="${img.url}" style="width:100px;height:80px;object-fit:cover;" onerror="this.style.display='none'" loading="lazy">
                        ${img.is_cover ? '<span style="position:absolute;top:2px;left:2px;background:#f59e0b;color:#fff;font-size:0.6rem;padding:1px 4px;border-radius:4px;">Portada</span>' : `<button type="button" onclick="window._adminSetCover(${businessId}, ${img.id})" style="position:absolute;top:2px;left:2px;background:rgba(0,110,227,0.85);color:#fff;border:none;border-radius:4px;font-size:0.55rem;padding:1px 4px;cursor:pointer;" title="Poner como portada"><i class="fas fa-star"></i></button>`}
                        <button type="button" onclick="window._adminDeleteBizImage(${businessId}, ${img.id})" style="position:absolute;bottom:2px;right:2px;background:rgba(220,53,69,0.9);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                `).join('') +
                '</div>';
        } catch (err) {
            console.error('Error loading gallery:', err);
        }
    }

    // Set image as cover
    async function setCoverImage(businessId, imageId) {
        try {
            await api.put(`/images/${businessId}?image_id=${imageId}`, { is_cover: 1 });
            showToast('Portada actualizada', 'success');
            loadBizEditGallery(businessId);
            // Also refresh the main image preview
            const biz = await api.get(`/businesses/${businessId}`);
            if (biz.image) {
                const prev = document.getElementById('bizEditImagePreview');
                if (prev) prev.innerHTML = '<img src="' + biz.image + '" style="width:100%;height:150px;object-fit:cover;border-radius:10px;">';
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }
    window._adminSetCover = setCoverImage;

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
                video_url: (typeof window._getVideoUrlsJSON === 'function') ? window._getVideoUrlsJSON() : '',
                banner: document.getElementById('bizEditBannerUrl')?.value?.trim() || '',
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
    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: MENSAJES - Contactos y mensajes de usuarios
    //  Funciones: loadMessages()
    // ═══════════════════════════════════════════════════════════

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
        const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
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
    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: FACEBOOK IMPORT - Importación desde Facebook
    //  Configuración e historial de importaciones
    //  Funciones: loadFacebookConfig(), loadFacebookHistory()
    // ═══════════════════════════════════════════════════════════

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
        statusEl.innerHTML = '<div style="color:#8B0000;"><i class="fas fa-spinner fa-spin"></i> Guardando...</div>';

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
        statusEl.innerHTML = '<div style="color:#8B0000;"><i class="fas fa-spinner fa-spin"></i> Probando conexion con Facebook...</div>';

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
        statusEl.innerHTML = '<div style="color:#8B0000;"><i class="fas fa-spinner fa-spin"></i> Importando posts desde Facebook... esto puede tomar unos segundos.</div>';

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

        // B2 Add Video button
        const b2AddVideoBtn = document.getElementById('b2AddVideoBtn');
        if (b2AddVideoBtn) {
            b2AddVideoBtn.addEventListener('click', () => {
                const list = document.getElementById('b2EditVideoList');
                const div = document.createElement('div');
                div.className = 'profile-input-group';
                div.style.cssText = 'margin-bottom:8px;display:flex;gap:6px;align-items:center;';
                div.innerHTML = '<div class="profile-input-wrapper" style="flex:1;"><i class="fas fa-video"></i><input type="url" class="b2-video-url" placeholder="Otro video..."></div><button type="button" onclick="this.parentElement.remove()" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-times"></i></button>';
                list.appendChild(div);
            });
        }

        // B2 Upload Video File
        const b2VideoFileInput = document.getElementById('b2EditVideoFile');
        if (b2VideoFileInput) {
            b2VideoFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const statusEl = document.getElementById('b2EditVideoStatus');
                if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo video...';
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('product_type', 'video');
                    const token = localStorage.getItem(TOKEN_KEY);
                    const resp = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    const data = await resp.json();
                    if (data.url) {
                        const list = document.getElementById('b2EditVideoList');
                        const div = document.createElement('div');
                        div.className = 'profile-input-group';
                        div.style.cssText = 'margin-bottom:8px;display:flex;gap:6px;align-items:center;';
                        div.innerHTML = `<div class="profile-input-wrapper" style="flex:1;"><i class="fas fa-film"></i><input type="url" class="b2-video-url" value="${escapeHtml(data.url)}" readonly style="background:#f0fdf4;"></div><button type="button" onclick="this.parentElement.remove()" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-times"></i></button>`;
                        list.appendChild(div);
                        if (statusEl) statusEl.innerHTML = '<i class="fas fa-check" style="color:#28a745;"></i> Video subido correctamente';
                    } else {
                        if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#dc3545;"></i> ' + (data.error || 'Error al subir');
                    }
                } catch(err) {
                    if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#dc3545;"></i> Error de conexión';
                }
                e.target.value = '';
            });
        }

        // B2 Image upload handlers
        const b2FileInput = document.getElementById('b2EditImageFile');
        const b2CameraInput = document.getElementById('b2EditImageCamera');
        if (b2FileInput) b2FileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(f => handleB2ImageUpload(f));
            e.target.value = '';
        });
        if (b2CameraInput) b2CameraInput.addEventListener('change', (e) => handleB2ImageUpload(e.target.files[0]));

        // B2 Image URL handler
        const b2URLInput = document.getElementById('b2EditImageURL');
        if (b2URLInput) b2URLInput.addEventListener('input', () => {
            const url = b2URLInput.value.trim();
            if (!url) return;
            const editModal2 = document.getElementById('b2EditModal');
            const preview = document.getElementById('b2EditImagePreview');
            // Add URL to images array
            let images = [];
            try { images = JSON.parse(editModal2?.dataset?.currentImages || '[]'); } catch(e) {}
            if (!images.includes(url)) {
                images.push(url);
                editModal2.dataset.currentImages = JSON.stringify(images);
                editModal2.dataset.currentImage = images[0] || '';
            }
            // Show preview
            if (preview) {
                preview.innerHTML = images.map((img, i) => `
                    <div style="display:inline-block;position:relative;margin:4px;">
                        <img src="${escapeHtml(img)}" style="width:120px;height:100px;object-fit:cover;border-radius:8px;border:2px solid ${i===0?'#8B0000':'#8B0000'};" onerror="this.parentElement.remove()">
                        ${i === 0 ? '<span style="position:absolute;top:2px;left:2px;background:#8B0000;color:#fff;font-size:0.6rem;padding:1px 6px;border-radius:4px;">Principal</span>' : ''}
                        <button type="button" onclick="window._b2RemoveImage(${i})" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:0.7rem;cursor:pointer;line-height:20px;text-align:center;">&times;</button>
                    </div>
                `).join('');
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: BAZAR/PRODUCTOS (B2) - Listado de productos
    //  Aprobar, rechazar, editar, eliminar productos del marketplace
    //  Funciones: loadB2Products(), loadBazarTab()
    //  Exporta: window._adminB2Approve/Reject/Edit/Delete
    // ═══════════════════════════════════════════════════════════

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
                    // Parse image: could be JSON array or plain URL
                    let thumbUrl = p.image || '';
                    try { const parsed = JSON.parse(thumbUrl); if (Array.isArray(parsed) && parsed.length > 0) thumbUrl = parsed[0]; } catch(e) {}
                    const imgHTML = thumbUrl ? `<img src="${escapeHtml(thumbUrl)}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">` : '<i class="fas fa-box" style="color:#ccc;font-size:1.2rem;"></i>';
                    const statusBadge = getStatusBadge(p.status || 'pending');
                    return `<tr>
                        <td>${p.id}</td>
                        <td><div style="display:flex;align-items:center;gap:8px;">${imgHTML}<span style="font-weight:600;">${escapeHtml(p.name || 'Sin nombre')}</span></div></td>
                        <td>${escapeHtml(p.business_name || '—')}</td>
                        <td><span class="badge badge-default">${escapeHtml(p.category || 'general')}</span></td>
                        <td style="font-weight:600;color:#8B0000;">$${parseFloat(p.price || 0).toFixed(2)}</td>
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
        editModal.dataset.currentImages = '[]';

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
                const data = await api.get(`/marketplace/${productId}`);
                const product = data.product || data;
                document.getElementById('b2EditName').value = product.name || '';
                document.getElementById('b2EditPrice').value = product.price || 0;
                document.getElementById('b2EditCategory').value = product.category || 'general';
                document.getElementById('b2EditStatus').value = product.status || 'pending';
                document.getElementById('b2EditDescription').value = product.description || '';
                if (product.business_id) document.getElementById('b2EditBusiness').value = product.business_id;

                // Load existing videos
                let existingVideos = [];
                try { const p = JSON.parse(product.video_url || '[]'); if (Array.isArray(p)) existingVideos = p.filter(v => v && v.trim()); } catch(e) { if (product.video_url && product.video_url.trim()) existingVideos = [product.video_url]; }
                const videoList = document.getElementById('b2EditVideoList');
                if (videoList) {
                    if (existingVideos.length > 0) {
                        videoList.innerHTML = existingVideos.map(v => `<div class="profile-input-group" style="margin-bottom:8px;display:flex;gap:6px;align-items:center;"><div class="profile-input-wrapper" style="flex:1;"><i class="fas fa-video"></i><input type="url" class="b2-video-url" value="${escapeHtml(v)}" placeholder="URL de video..."></div><button type="button" onclick="this.parentElement.remove()" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-times"></i></button></div>`).join('');
                    } else {
                        videoList.innerHTML = '<div class="profile-input-group" style="margin-bottom:8px;"><div class="profile-input-wrapper"><i class="fas fa-video"></i><input type="url" class="b2-video-url" placeholder="YouTube, TikTok o URL de video directo..."></div></div>';
                    }
                }

                // Handle image - parse JSON array or single URL
                let images = [];
                const rawImage = product.image || '';
                try {
                    const parsed = JSON.parse(rawImage);
                    if (Array.isArray(parsed)) images = parsed.filter(u => u && u.trim());
                } catch(e) {}
                if (images.length === 0 && rawImage) images = [rawImage];

                // Store all images in dataset
                editModal.dataset.currentImages = JSON.stringify(images);
                editModal.dataset.currentImage = images[0] || '';

                // Show all images as previews with delete buttons
                if (preview && images.length > 0) {
                    preview.innerHTML = images.map((img, i) => `
                        <div style="display:inline-block;position:relative;margin:4px;">
                            <img src="${escapeHtml(img)}" style="width:120px;height:100px;object-fit:cover;border-radius:8px;border:2px solid ${i===0?'#8B0000':'#8B0000'};" onerror="this.parentElement.remove()">
                            ${i === 0 ? '<span style="position:absolute;top:2px;left:2px;background:#8B0000;color:#fff;font-size:0.6rem;padding:1px 6px;border-radius:4px;">Principal</span>' : ''}
                            <button type="button" onclick="window._b2RemoveImage(${i})" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:0.7rem;cursor:pointer;line-height:20px;text-align:center;">&times;</button>
                        </div>
                    `).join('');
                }
            } catch (err) {
                showToast('Error al cargar producto', 'error');
                return;
            }
        } else {
            document.getElementById('b2EditForm').reset();
            const urlInput = document.getElementById('b2EditImageURL');
            if (urlInput) urlInput.value = '';
            // Reset video list to single input
            const vl = document.getElementById('b2EditVideoList');
            if (vl) vl.innerHTML = '<div class="profile-input-group" style="margin-bottom:8px;"><div class="profile-input-wrapper"><i class="fas fa-video"></i><input type="url" class="b2-video-url" placeholder="YouTube, TikTok o URL de video directo..."></div></div>';
        }

        editModal.dataset.productId = productId || '';
        editModal.classList.remove('hidden');
    }

    // Remove an image from the B2 edit modal
    window._b2RemoveImage = function(index) {
        const editModal = document.getElementById('b2EditModal');
        if (!editModal) return;
        try {
            let images = JSON.parse(editModal.dataset.currentImages || '[]');
            images.splice(index, 1);
            editModal.dataset.currentImages = JSON.stringify(images);
            editModal.dataset.currentImage = images[0] || '';
            // Re-render previews
            const preview = document.getElementById('b2EditImagePreview');
            if (preview) {
                preview.innerHTML = images.map((img, i) => `
                    <div style="display:inline-block;position:relative;margin:4px;">
                        <img src="${escapeHtml(img)}" style="width:120px;height:100px;object-fit:cover;border-radius:8px;border:2px solid ${i===0?'#8B0000':'#8B0000'};" onerror="this.parentElement.remove()">
                        ${i === 0 ? '<span style="position:absolute;top:2px;left:2px;background:#8B0000;color:#fff;font-size:0.6rem;padding:1px 6px;border-radius:4px;">Principal</span>' : ''}
                        <button type="button" onclick="window._b2RemoveImage(${i})" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:0.7rem;cursor:pointer;line-height:20px;text-align:center;">&times;</button>
                    </div>
                `).join('');
            }
        } catch(e) {}
    };

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
                // Add to existing images array
                let images = [];
                try { images = JSON.parse(editModal?.dataset?.currentImages || '[]'); } catch(e) {}
                images.push(data.url);
                editModal.dataset.currentImages = JSON.stringify(images);
                editModal.dataset.currentImage = images[0] || '';

                // Re-render all previews
                if (preview) {
                    preview.innerHTML = images.map((img, i) => `
                        <div style="display:inline-block;position:relative;margin:4px;">
                            <img src="${escapeHtml(img)}" style="width:120px;height:100px;object-fit:cover;border-radius:8px;border:2px solid ${i===0?'#8B0000':'#8B0000'};" onerror="this.parentElement.remove()">
                            ${i === 0 ? '<span style="position:absolute;top:2px;left:2px;background:#8B0000;color:#fff;font-size:0.6rem;padding:1px 6px;border-radius:4px;">Principal</span>' : ''}
                            <button type="button" onclick="window._b2RemoveImage(${i})" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:0.7rem;cursor:pointer;line-height:20px;text-align:center;">&times;</button>
                        </div>
                    `).join('');
                }
                if (statusEl) statusEl.innerHTML = '<i class="fas fa-check" style="color:#28a745;"></i> Imagen subida';
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

        // Get images: use the full array from dataset, or URL input as fallback
        let images = [];
        try { images = JSON.parse(editModal?.dataset?.currentImages || '[]'); } catch(e) {}
        const urlImage = document.getElementById('b2EditImageURL')?.value?.trim() || '';
        if (images.length === 0 && urlImage) images = [urlImage];

        // Always save as JSON array so the product detail page shows all images
        const image = images.length > 0 ? JSON.stringify(images) : '';

        if (!name) { showToast('El nombre es requerido', 'error'); return; }

        if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }

        try {
            // Collect all video URLs
            const videoUrls = [];
            document.querySelectorAll('#b2EditModal .b2-video-url').forEach(inp => {
                const v = (inp.value || '').trim();
                if (v) videoUrls.push(v);
            });
            const body = { name, price, category, image, description, video_url: videoUrls.length > 0 ? JSON.stringify(videoUrls) : '', status };
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

    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: INMUEBLES - Gestión de propiedades
    //  Aprobar, rechazar, editar, eliminar inmuebles
    //  Funciones: loadInmueblesTab(), loadInmuebleImages()
    //  Exporta: window._adminApproveInmueble/Reject/Delete/etc.
    // ═══════════════════════════════════════════════════════════

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
                    <button class="btn btn-xs btn-outline" onclick="window._adminEditInmueble(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
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

    // ─── INMUEBLE EDIT MODAL ──────────────────────────────
    let editingInmuebleId = null;
    let eiCurrentImages = [];

    function setupInmuebleEditModal() {
        const modal = document.getElementById('adminInmuebleEditModal');
        if (!modal) return;
        document.getElementById('adminInmuebleEditClose')?.addEventListener('click', () => modal.classList.add('hidden'));
        modal.querySelector('.modal-overlay')?.addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('adminInmuebleEditCancel')?.addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('adminInmuebleEditSave')?.addEventListener('click', saveEditInmueble);
        document.getElementById('eiAddImageBtn')?.addEventListener('click', async () => {
            const url = document.getElementById('eiNewImageUrl')?.value?.trim();
            if (!url || !editingInmuebleId) return;
            try {
                await api.post(`/property-images/${editingInmuebleId}`, { image_url: url });
                document.getElementById('eiNewImageUrl').value = '';
                showToast('Imagen agregada', 'success');
                loadInmuebleImages(editingInmuebleId);
            } catch (e) { showToast(e.message || 'Error al agregar imagen', 'error'); }
        });
        document.getElementById('eiImageFile')?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file || !editingInmuebleId) return;
            const prog = document.getElementById('eiUploadProgress');
            if (prog) prog.classList.remove('hidden');
            try {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('product_type', 'property');
                const token = localStorage.getItem(TOKEN_KEY);
                const resp = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
                const data = await resp.json();
                if (data.url) {
                    await api.post(`/property-images/${editingInmuebleId}`, { image_url: data.url });
                    showToast('Imagen subida', 'success');
                    loadInmuebleImages(editingInmuebleId);
                } else { showToast('No se obtuvo URL de la imagen', 'error'); }
            } catch (err) { showToast(err.message || 'Error al subir imagen', 'error'); }
            finally { if (prog) prog.classList.add('hidden'); e.target.value = ''; }
        });
        document.getElementById('eiAddVideoBtn')?.addEventListener('click', () => {
            const list = document.getElementById('eiVideoList');
            if (!list) return;
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;';
            div.innerHTML = '<input type="url" class="form-control ei-video-url" placeholder="https://youtube.com/watch?v=..." style="flex:1"><button class="btn btn-xs btn-danger" type="button" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
            list.appendChild(div);
        });
    }

    async function loadInmuebleImages(propertyId) {
        const container = document.getElementById('eiImagesList');
        if (!container) return;
        try {
            const data = await api.get(`/properties/${propertyId}`);
            eiCurrentImages = data.images || [];
            container.innerHTML = eiCurrentImages.map((img, i) => `
                <div style="position:relative;width:100px;height:80px;border-radius:6px;overflow:hidden;border:1px solid #ddd;">
                    <img src="${img.image_url || img.url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
                    <button type="button" onclick="admin.deleteInmuebleImage(${propertyId}, ${img.id})" style="position:absolute;top:2px;right:2px;background:rgba(231,76,60,0.9);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="fas fa-times"></i></button>
                    ${i === 0 ? '<span style="position:absolute;bottom:2px;left:2px;background:#16a34a;color:#fff;font-size:9px;padding:1px 4px;border-radius:3px;">Portada</span>' : ''}
                </div>
            `).join('');
        } catch (e) { console.error('Error loading images:', e); }
    }

    async function deleteInmuebleImage(propertyId, imageId) {
        if (!confirm('¿Eliminar esta imagen?')) return;
        try {
            await api.delete(`/property-images/${propertyId}?image_id=${imageId}`);
            showToast('Imagen eliminada', 'success');
            loadInmuebleImages(propertyId);
        } catch (e) { showToast(e.message || 'Error al eliminar imagen', 'error'); }
    }

    async function openEditInmueble(id) {
        try {
            const resp = await fetch(`/api/properties/${id}`, { headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem(TOKEN_KEY) } });
            if (!resp.ok) { showToast('Error al cargar inmueble', 'error'); return; }
            const p = await resp.json();

            editingInmuebleId = id;
            const modal = document.getElementById('adminInmuebleEditModal');
            if (!modal) return;
            document.getElementById('editInmuebleId').textContent = '#' + id;

            // Populate fields
            const setV = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
            const setSel = (elId, val) => { const el = document.getElementById(elId); if (!el) return; for (let i = 0; i < el.options.length; i++) { if (el.options[i].value === val) { el.selectedIndex = i; break; } } };

            setV('eiTitle', p.title);
            setSel('eiTipo', p.property_type || p.type);
            setSel('eiOperacion', p.operation_type || p.operation);
            setV('eiDescription', p.description);
            setV('eiPrecio', p.price);
            // Moneda radio
            const currRadio = document.querySelector(`input[name="eiMoneda"][value="${p.currency || 'USD'}"]`);
            if (currRadio) currRadio.checked = true;
            setV('eiDireccion', p.address);
            setV('eiCiudad', p.city);
            setV('eiEstado', p.state);
            setV('eiLat', p.lat);
            setV('eiLng', p.lng);
            setV('eiWhatsApp', p.whatsapp);
            setV('eiHabitaciones', p.bedrooms);
            setV('eiBanos', p.bathrooms);
            setV('eiEstacionamientos', p.parking_spaces);
            setV('eiPisos', p.floors);
            setV('eiArea', p.area);
            setSel('eiAreaUnidad', p.area_unit);
            setV('eiAno', p.year_built);

            // Features checkboxes
            document.getElementById('eiFeatPool').checked = !!p.has_pool;
            document.getElementById('eiFeatGarden').checked = !!p.has_garden;
            document.getElementById('eiFeatAC').checked = !!p.has_ac;
            document.getElementById('eiFeatKitchen').checked = !!p.has_kitchen;
            document.getElementById('eiFeatFurniture').checked = !!p.has_furniture;
            document.getElementById('eiFeatSecurity').checked = !!p.has_security;
            document.getElementById('eiFeatElevator').checked = !!p.has_elevator;

            // Videos
            const videoList = document.getElementById('eiVideoList');
            if (videoList) {
                videoList.innerHTML = '';
                let videos = [];
                if (p.video_url) { try { videos = JSON.parse(p.video_url); } catch(e) { if (typeof p.video_url === 'string' && p.video_url) videos = [p.video_url]; } }
                videos.forEach(v => {
                    const div = document.createElement('div');
                    div.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;';
                    div.innerHTML = `<input type="url" class="form-control ei-video-url" value="${escHtml(v)}" style="flex:1"><button class="btn btn-xs btn-danger" type="button" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
                    videoList.appendChild(div);
                });
            }

            // Load images
            await loadInmuebleImages(id);

            modal.classList.remove('hidden');
        } catch (err) {
            showToast(err.message || 'Error al cargar inmueble', 'error');
        }
    }

    async function saveEditInmueble() {
        if (!editingInmuebleId) return;
        const title = document.getElementById('eiTitle')?.value?.trim();
        const property_type = document.getElementById('eiTipo')?.value;
        const operation_type = document.getElementById('eiOperacion')?.value;
        const description = document.getElementById('eiDescription')?.value?.trim();
        const price = document.getElementById('eiPrecio')?.value;
        const currency = document.querySelector('input[name="eiMoneda"]:checked')?.value || 'USD';

        if (!title || !property_type || !operation_type || !description) {
            showToast('Título, tipo, operación y descripción son requeridos', 'error');
            return;
        }

        const videos = [];
        document.querySelectorAll('.ei-video-url').forEach(inp => { const v = (inp.value || '').trim(); if (v) videos.push(v); });

        const body = {
            title,
            property_type,
            operation_type,
            description,
            price: price || null,
            currency,
            address: document.getElementById('eiDireccion')?.value?.trim() || null,
            city: document.getElementById('eiCiudad')?.value?.trim() || null,
            state: document.getElementById('eiEstado')?.value?.trim() || null,
            lat: document.getElementById('eiLat')?.value || null,
            lng: document.getElementById('eiLng')?.value || null,
            whatsapp: document.getElementById('eiWhatsApp')?.value?.trim() || null,
            bedrooms: document.getElementById('eiHabitaciones')?.value || null,
            bathrooms: document.getElementById('eiBanos')?.value || null,
            parking_spaces: document.getElementById('eiEstacionamientos')?.value || null,
            floors: document.getElementById('eiPisos')?.value || null,
            area: document.getElementById('eiArea')?.value || null,
            area_unit: document.getElementById('eiAreaUnidad')?.value || 'm²',
            year_built: document.getElementById('eiAno')?.value || null,
            has_pool: document.getElementById('eiFeatPool')?.checked ? 1 : 0,
            has_garden: document.getElementById('eiFeatGarden')?.checked ? 1 : 0,
            has_ac: document.getElementById('eiFeatAC')?.checked ? 1 : 0,
            has_kitchen: document.getElementById('eiFeatKitchen')?.checked ? 1 : 0,
            has_furniture: document.getElementById('eiFeatFurniture')?.checked ? 1 : 0,
            has_security: document.getElementById('eiFeatSecurity')?.checked ? 1 : 0,
            has_elevator: document.getElementById('eiFeatElevator')?.checked ? 1 : 0,
            video_url: videos.length > 0 ? JSON.stringify(videos) : null,
        };

        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const resp = await fetch(`/api/properties/${editingInmuebleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (resp.ok) {
                showToast('Inmueble actualizado exitosamente', 'success');
                document.getElementById('adminInmuebleEditModal')?.classList.add('hidden');
                loadInmueblesTab();
            } else {
                const err = await resp.json().catch(() => ({}));
                showToast(err.error || 'Error al actualizar inmueble', 'error');
            }
        } catch (err) {
            showToast(err.message || 'Error al guardar inmueble', 'error');
        }
    }

    // Expose inmuebles functions for inline onclick handlers
    window._adminApproveInmueble = approveProperty;
    window._adminRejectInmueble = rejectProperty;
    window._adminDeleteInmueble = deleteProperty;
    window._adminToggleInmuebleFeatured = togglePropertyFeatured;
    window._adminViewInmueble = viewInmueble;
    window._adminEditInmueble = openEditInmueble;
    window.admin = window.admin || {};
    window.admin.deleteInmuebleImage = deleteInmuebleImage;
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
        editJob,
        activateSellerPremium,
        deactivateSellerPremium,
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
    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: EMPLEO - Ofertas de trabajo
    //  Listar, aprobar, rechazar, editar ofertas de empleo
    //  Funciones: loadJobs(), loadBusinessesForJobSelect(),
    //            loadFeaturedSelector(), loadFeaturedMedicalSelector()
    // ═══════════════════════════════════════════════════════════

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
                        <button class="btn btn-sm btn-outline" onclick="admin.editJob(${j.id})" title="Editar"><i class="fas fa-edit"></i></button>
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
            // Always add En-Santiago as the first option (default for jobs without a store)
            const holaxOpt = document.createElement('option');
            holaxOpt.value = 'En-Santiago';
            holaxOpt.textContent = 'En-Santiago';
            holaxOpt.dataset.logo = '/images/En-Santiago.png';
            select.appendChild(holaxOpt);

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

        if (createBtn) createBtn.addEventListener('click', () => { editingJobId = null; resetJobForm(); if (modal) { modal.querySelector('.modal-header h3').innerHTML = '<i class="fas fa-briefcase" style="color:#8B0000"></i> Publicar Oferta de Empleo'; submitBtn.textContent = 'Publicar Empleo'; modal.classList.remove('hidden'); } });
        if (closeBtn) closeBtn.addEventListener('click', () => { if (modal) modal.classList.add('hidden'); editingJobId = null; });
        if (cancelBtn) cancelBtn.addEventListener('click', () => { if (modal) modal.classList.add('hidden'); editingJobId = null; });
        if (modal) modal.querySelector('.modal-overlay')?.addEventListener('click', () => { modal.classList.add('hidden'); editingJobId = null; });

        if (submitBtn) submitBtn.addEventListener('click', submitJob);

        // Logo field: show/hide based on company selection, auto-set En-Santiago
        const jobCompany = document.getElementById('jobCompany');
        const jobLogoGroup = document.getElementById('jobLogoGroup');
        const jobLogoInput = document.getElementById('jobLogo');
        const jobLogoPreview = document.getElementById('jobLogoPreview');
        const jobLogoClearBtn = document.getElementById('jobLogoClearBtn');

        function updateJobLogoField() {
            if (!jobCompany || !jobLogoGroup) return;
            const val = jobCompany.value;
            jobLogoGroup.style.display = val ? '' : 'none';
            if (val === 'En-Santiago') {
                const holaxLogo = document.getElementById('setting_holax_logo_url')?.value || '/api/serve?key=merida%2Flogos%2F6%2F1783998320478_Logo_Holax.png';
                jobLogoInput.value = holaxLogo;
                jobLogoPreview.src = holaxLogo;
                jobLogoPreview.style.display = '';
                if (jobLogoClearBtn) jobLogoClearBtn.style.display = '';
            }
        }
        function updateLogoPreview() {
            const url = jobLogoInput?.value?.trim();
            if (url) { jobLogoPreview.src = url; jobLogoPreview.style.display = ''; if (jobLogoClearBtn) jobLogoClearBtn.style.display = ''; }
            else { jobLogoPreview.style.display = 'none'; if (jobLogoClearBtn) jobLogoClearBtn.style.display = 'none'; }
        }
        if (jobCompany) jobCompany.addEventListener('change', updateJobLogoField);
        if (jobLogoInput) jobLogoInput.addEventListener('input', updateLogoPreview);
        if (jobLogoClearBtn) jobLogoClearBtn.addEventListener('click', () => { jobLogoInput.value = ''; jobLogoPreview.style.display = 'none'; jobLogoClearBtn.style.display = 'none'; });

        const jobStatusFilter = document.getElementById('jobStatusFilter');
        if (jobStatusFilter) jobStatusFilter.addEventListener('change', () => { jobsPage = 1; loadJobs(); });
    }

    function resetJobForm() {
        const ids = ['jobCompany','jobTitle','jobType','jobSalary','jobState','jobCity','jobDescription','jobRequirements','jobBenefits','jobContactEmail','jobContactPhone','jobLogo'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) { if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = ''; } });
        const logoGroup = document.getElementById('jobLogoGroup');
        if (logoGroup) logoGroup.style.display = 'none';
        const logoPreview = document.getElementById('jobLogoPreview');
        if (logoPreview) logoPreview.style.display = 'none';
        const logoClear = document.getElementById('jobLogoClearBtn');
        if (logoClear) logoClear.style.display = 'none';
    }

    async function editJob(id) {
        try {
            const resp = await fetch(`/api/jobs/${id}`, { headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem(TOKEN_KEY) } });
            if (!resp.ok) { showToast('Error al cargar empleo', 'error'); return; }
            const j = await resp.json();

            editingJobId = id;
            const modal = document.getElementById('adminJobModal');
            if (!modal) return;

            // Set title
            modal.querySelector('.modal-header h3').innerHTML = '<i class="fas fa-edit" style="color:#8B0000"></i> Editar Oferta de Empleo #' + id;
            document.getElementById('adminJobSubmit').textContent = 'Guardar Cambios';

            // Populate fields
            const setVal = (elId, val) => { const el = document.getElementById(elId); if (!el) return; if (el.tagName === 'SELECT') { for (let i = 0; i < el.options.length; i++) { if (el.options[i].value === val) { el.selectedIndex = i; break; } } } else { el.value = val || ''; } };
            setVal('jobCompany', j.company_name);
            setVal('jobTitle', j.title);
            setVal('jobType', j.job_type);
            setVal('jobSalary', j.salary);
            setVal('jobState', j.state);
            setVal('jobCity', j.city);
            setVal('jobDescription', j.description);
            setVal('jobRequirements', j.requirements);
            setVal('jobBenefits', j.benefits);
            setVal('jobContactEmail', j.contact_email);
            setVal('jobContactPhone', j.contact_phone);

            // Logo
            const logoGroup = document.getElementById('jobLogoGroup');
            const logoInput = document.getElementById('jobLogo');
            const logoPreview = document.getElementById('jobLogoPreview');
            const logoClearBtn = document.getElementById('jobLogoClearBtn');
            if (logoGroup) logoGroup.style.display = '';
            if (logoInput) logoInput.value = j.business_logo || '';
            if (logoPreview && j.business_logo) { logoPreview.src = j.business_logo; logoPreview.style.display = ''; }
            else if (logoPreview) logoPreview.style.display = 'none';
            if (logoClearBtn) logoClearBtn.style.display = j.business_logo ? '' : 'none';

            modal.classList.remove('hidden');
        } catch (err) {
            showToast(err.message || 'Error al cargar empleo', 'error');
        }
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
        const businessLogo = document.getElementById('jobLogo')?.value?.trim() || null;

        if (!company || !title) {
            showToast('Empresa y título son requeridos', 'error');
            return;
        }

        try {
            if (editingJobId) {
                // EDIT mode — PATCH
                const token = localStorage.getItem(TOKEN_KEY);
                const resp = await fetch(`/api/jobs/${editingJobId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        action: 'edit',
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
                        business_logo: businessLogo,
                    }),
                });
                if (resp.ok) { showToast('Oferta de empleo actualizada', 'success'); }
                else { showToast('Error al actualizar empleo', 'error'); }
                editingJobId = null;
            } else {
                // CREATE mode — POST
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
                    business_logo: businessLogo,
                });
                showToast('Oferta de empleo publicada', 'success');
            }
            document.getElementById('adminJobModal')?.classList.add('hidden');
            loadJobs();
        } catch (err) {
            showToast(err.message || 'Error al guardar empleo', 'error');
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
                container.innerHTML = '<p style="color:#8B0000;font-size:0.85rem;">No hay negocios aprobados.</p>';
                return;
            }

            // Get currently featured businesses from featured_items table
            const featuredData = await api.get('/featured-items?item_type=business');
            const featured = featuredData.featured_items || [];
            const featuredIds = new Set(featured.map(f => f.item_id));

            let html = '<div style="display:flex;flex-direction:column;gap:8px;">';

            // Show currently featured
            html += '<div style="margin-bottom:8px;font-size:0.82rem;color:#8B0000;font-weight:600;">Negocios actualmente destacados:</div>';

            const featuredBusinesses = businesses.filter(b => featuredIds.has(b.id));
            featuredBusinesses.forEach(b => {
                html += `<label style="display:flex;align-items:center;gap:10px;padding:10px;border:2px solid #f59e0b;border-radius:10px;background:#fffbeb;cursor:pointer;">
                    <input type="checkbox" class="featured-checkbox" value="${b.id}" checked style="width:18px;height:18px;accent-color:#f59e0b;">
                    <img src="${b.cover_image || (b.images && b.images[0] && b.images[0].url) || ''}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.88rem;">${escapeHtml(b.title)}</div>
                        <div style="font-size:0.78rem;color:#8B0000;">${escapeHtml(b.category_name || b.city || '')}</div>
                    </div>
                </label>`;
            });

            // Show non-featured
            const nonFeatured = businesses.filter(b => !featuredIds.has(b.id));
            if (nonFeatured.length > 0) {
                html += '<div style="margin-top:12px;margin-bottom:8px;font-size:0.82rem;color:#8B0000;font-weight:600;">Otros negocios (selecciona para destacar):</div>';

                nonFeatured.forEach(b => {
                    html += `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #8B0000;border-radius:10px;cursor:pointer;">
                        <input type="checkbox" class="featured-checkbox" value="${b.id}" style="width:18px;height:18px;accent-color:#f59e0b;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(b.title)}</div>
                            <div style="font-size:0.78rem;color:#8B0000;">${escapeHtml(b.category_name || b.city || '')}</div>
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
                    if (checked.length > 4) {
                        cb.checked = false;
                        showToast('Máximo 4 negocios destacados', 'warning');
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
                try { await api.delete(`/featured-items?id=${item.id}`); } catch(e) {}
            }
            // Clear featured flag on all businesses
            try { await api.put('/businesses/featured/clear', {}); } catch(e) {}

            // Set featured for selected businesses (both flag + featured_items record)
            for (const id of selectedIds) {
                await api.put(`/businesses/${id}`, { featured: 1 });
                await api.post('/featured-items', { item_type: 'business', item_id: id });
            }

            showToast(`${selectedIds.length} negocio(s) destacado(s) guardado(s)`, 'success');
            loadFeaturedSelector();
        } catch (err) {
            showToast('Error al guardar destacados: ' + err.message, 'error');
        }
    }

    window._adminSaveFeatured = saveFeaturedBusinesses;

    // ─── Featured Medical Businesses Selector ────────────────
    const MEDICAL_SLUG = 'medicina-servicio-medico';

    async function loadFeaturedMedicalSelector() {
        const container = document.getElementById('featuredMedicalContainer');
        if (!container) return;

        try {
            // Fetch only businesses with medicina-servicio-medico category
            const data = await api.get('/businesses?status=approved&categoria=medicina-servicio-medico&limit=200');
            const businesses = data.businesses || [];

            if (businesses.length === 0) {
                container.innerHTML = '<p style="color:#8B0000;font-size:0.85rem;">No hay negocios médicos aprobados.</p>';
                return;
            }

            // Get currently featured medical from featured_items
            const featuredData = await api.get('/featured-items?item_type=medical');
            const featured = featuredData.featured_items || [];
            const featuredIds = new Set(featured.map(f => f.item_id));

            let html = '<div style="display:flex;flex-direction:column;gap:8px;">';

            html += '<div style="margin-bottom:8px;font-size:0.82rem;color:#8B0000;font-weight:600;">Servicios médicos actualmente destacados:</div>';

            const featuredBiz = businesses.filter(b => featuredIds.has(b.id));
            featuredBiz.forEach(b => {
                html += `<label style="display:flex;align-items:center;gap:10px;padding:10px;border:2px solid #e74c3c;border-radius:10px;background:#fef2f2;cursor:pointer;">
                    <input type="checkbox" class="featured-medical-checkbox" value="${b.id}" checked style="width:18px;height:18px;accent-color:#e74c3c;">
                    <img src="${b.cover_image || (b.images && b.images[0] && b.images[0].url) || ''}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.88rem;">${escapeHtml(b.title)}</div>
                        <div style="font-size:0.78rem;color:#8B0000;">${escapeHtml(b.category_name || b.city || '')}</div>
                    </div>
                </label>`;
            });

            const nonFeatured = businesses.filter(b => !featuredIds.has(b.id));
            if (nonFeatured.length > 0) {
                html += '<div style="margin-top:12px;margin-bottom:8px;font-size:0.82rem;color:#8B0000;font-weight:600;">Otros servicios médicos (selecciona para destacar):</div>';
                nonFeatured.forEach(b => {
                    html += `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #8B0000;border-radius:10px;cursor:pointer;">
                        <input type="checkbox" class="featured-medical-checkbox" value="${b.id}" style="width:18px;height:18px;accent-color:#e74c3c;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(b.title)}</div>
                            <div style="font-size:0.78rem;color:#8B0000;">${escapeHtml(b.category_name || b.city || '')}</div>
                        </div>
                    </label>`;
                });
            }

            html += '</div>';
            html += '<button class="btn btn-primary" style="margin-top:16px;background:linear-gradient(135deg,#e74c3c,#c0392b);" onclick="window._adminSaveFeaturedMedical()"><i class="fas fa-save"></i> Guardar Médicos Destacados</button>';

            container.innerHTML = html;

            // Limit to 6 checkboxes
            const checkboxes = container.querySelectorAll('.featured-medical-checkbox');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    const checked = container.querySelectorAll('.featured-medical-checkbox:checked');
                    if (checked.length > 4) {
                        cb.checked = false;
                        showToast('Máximo 4 servicios médicos destacados', 'warning');
                    }
                });
            });
        } catch (err) {
            console.error('Error loading medical selector:', err);
            container.innerHTML = '<p style="color:#e74c3c;font-size:0.85rem;">Error al cargar servicios médicos.</p>';
        }
    }

    async function saveFeaturedMedical() {
        const container = document.getElementById('featuredMedicalContainer');
        if (!container) return;

        const checked = container.querySelectorAll('.featured-medical-checkbox:checked');
        const selectedIds = Array.from(checked).map(cb => parseInt(cb.value));

        try {
            // Remove existing medical featured items
            const existing = await api.get('/featured-items?item_type=medical');
            for (const item of (existing.featured_items || [])) {
                try { await api.delete(`/featured-items?id=${item.id}`); } catch(e) {}
            }

            // Add new featured medical items
            for (const id of selectedIds) {
                await api.post('/featured-items', {
                    item_type: 'medical',
                    item_id: id
                });
            }

            showToast(`${selectedIds.length} servicio(s) médico(s) destacado(s) guardado(s)`, 'success');
            loadFeaturedMedicalSelector();
        } catch (err) {
            showToast('Error al guardar destacados médicos: ' + err.message, 'error');
        }
    }

    window._adminSaveFeaturedMedical = saveFeaturedMedical;

    // ─── Settings Functions ───────────────────────────────────
    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: CONFIGURACIÓN - Ajustes generales del sistema
    //  Banners, logos, ajustes de visualización
    //  Funciones: loadSettings()
    //  Exporta: window.handleAdminBannerSelect, window.removeAdminBanner,
    //            window.handleHolaxLogoSelect, window.removeHolaxLogo, etc.
    // ═══════════════════════════════════════════════════════════

    async function loadSettings() {
        try {
            const data = await api.get('/settings');
            const settings = data.settings || data;

            // Save En-Santiago logo default before settings loop might overwrite it
            const holaxDefaultUrl = document.getElementById('setting_holax_logo_url')?.value || '';

            // Populate toggle checkboxes and inputs
            document.querySelectorAll('[data-key]').forEach(el => {
                const key = el.dataset.key;
                const value = settings[key];
                if (el.type === 'checkbox') {
                    el.checked = value === '1' || value === 'true';
                } else if (el.type === 'radio') {
                    el.checked = (el.value === value);
                } else {
                    el.value = value || '';
                }
            });

            // Restore En-Santiago logo default if setting doesn't exist in DB
            if (!settings.holax_logo_url && holaxDefaultUrl) {
                const el = document.getElementById('setting_holax_logo_url');
                if (el) el.value = holaxDefaultUrl;
            }

            // Highlight active radio card (only if chat_mode radios exist on this page)
            if (document.querySelector('[name="chat_mode"]')) {
                highlightChatModeCard();
            }

        } catch (error) {
            console.error('Error loading settings:', error);
            showToast('Error al cargar configuración', 'error');
        }

        // Load featured businesses selector
        loadFeaturedSelector();
        loadFeaturedMedicalSelector();
        // Load featured products & properties selectors
        loadFeaturedProductsSelector();
        loadFeaturedPropertiesSelector();
        loadFeaturedJobsSelector();
    }

    async function saveSettings() {
        try {
            const updates = {};
            const radioKeysSaved = new Set();

            document.querySelectorAll('[data-key]').forEach(el => {
                const key = el.dataset.key;
                if (el.type === 'checkbox') {
                    updates[key] = el.checked ? '1' : '0';
                } else if (el.type === 'radio') {
                    if (el.checked) {
                        updates[key] = el.value;
                        radioKeysSaved.add(key);
                    }
                    // Skip unchecked radios — only save the checked one
                } else {
                    updates[key] = el.value;
                }
            });

            await api.put('/settings', updates);
            showToast('Configuración guardada exitosamente', 'success');
            if (document.querySelector('[name="chat_mode"]')) {
                highlightChatModeCard();
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showToast('Error al guardar configuración: ' + error.message, 'error');
        }
    }

    // ─── Chat Mode Card Highlight ──────────────────────────────
    function highlightChatModeCard() {
        const colors = { all: '#25d366', premium_only: '#f59e0b', none: '#dc2626' };
        document.querySelectorAll('[name="chat_mode"]').forEach(radio => {
            const card = radio.closest('.settings-radio-card');
            if (!card) return;
            if (radio.checked) {
                card.style.borderColor = colors[radio.value] || '#25d366';
                card.style.background = (radio.value === 'all' ? '#8B0000' : radio.value === 'premium_only' ? '#fffbeb' : '#fef2f2');
            } else {
                card.style.borderColor = '#8B0000';
                card.style.background = 'transparent';
            }
        });

        // Update status message
        const statusEl = document.getElementById('chatModeStatus');
        if (statusEl) {
            const checked = document.querySelector('[name="chat_mode"]:checked');
            if (checked) {
                const msgs = {
                    all: { bg: '#8B0000', border: '#8B0000', color: '#8B0000', text: 'Chat activo para todos los usuarios registrados.' },
                    premium_only: { bg: '#fffbeb', border: '#fde68a', color: '#b45309', text: 'Chat restringido a usuarios Premium.' },
                    none: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', text: 'Chat completamente desactivado.' },
                };
                const m = msgs[checked.value] || msgs.all;
                statusEl.style.display = 'block';
                statusEl.style.background = m.bg;
                statusEl.style.border = '1px solid ' + m.border;
                statusEl.style.color = m.color;
                statusEl.innerHTML = '<i class="fas fa-info-circle"></i> ' + m.text;
            }
        }
    }

    // Add change listeners for chat mode radios
    document.querySelectorAll('[name="chat_mode"]').forEach(radio => {
        radio.addEventListener('change', () => highlightChatModeCard());
    });

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
                            ${p.image ? `<img src="${p.image}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">` : '<div style="width:40px;height:40px;border-radius:8px;background:#8B0000;display:flex;align-items:center;justify-content:center;"><i class="fas fa-box" style="color:#8B0000;font-size:0.8rem;"></i></div>'}
                            <div>
                                <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(p.name)}</div>
                                ${p.business_name ? `<div style="font-size:0.72rem;color:#8B0000;"><i class="fas fa-store" style="font-size:0.65rem;"></i> ${escapeHtml(p.business_name)}</div>` : ''}
                                ${p.description ? `<div style="font-size:0.75rem;color:#8B0000;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.description)}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td><span style="font-size:0.8rem;">${escapeHtml(p.category || 'general')}</span></td>
                    <td style="font-weight:600;color:#8B0000;">${price}</td>
                    <td style="font-size:0.8rem;">
                        <div>${escapeHtml(p.owner_name || 'Usuario')}</div>
                        ${p.owner_email ? `<div style="font-size:0.7rem;color:#8B0000;">${escapeHtml(p.owner_email)}</div>` : ''}
                    </td>
                    <td><span class="admin-status-badge ${statusClass}">${statusLabel}</span></td>
                    <td style="font-size:0.78rem;color:#8B0000;">${date}</td>
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
                container.innerHTML = '<p style="color:#8B0000;font-size:0.85rem;">No hay productos disponibles.</p>';
                return;
            }

            let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
            html += '<div style="margin-bottom:8px;font-size:0.82rem;color:#8B0000;font-weight:600;">Productos actualmente destacados:</div>';

            products.filter(p => featuredIds.has(p.id)).forEach(p => {
                const price = p.price ? `$${parseFloat(p.price).toFixed(2)}` : '';
                html += `<label style="display:flex;align-items:center;gap:10px;padding:10px;border:2px solid #8B0000;border-radius:10px;background:#8B0000;cursor:pointer;">
                    <input type="checkbox" class="featured-product-checkbox" value="${p.id}" checked style="width:18px;height:18px;accent-color:#8B0000;">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(p.name)}</div>
                        <div style="font-size:0.75rem;color:#8B0000;">${escapeHtml(p.category || '')} ${price ? '· ' + price : ''}</div>
                    </div>
                </label>`;
            });

            const nonFeatured = products.filter(p => !featuredIds.has(p.id));
            if (nonFeatured.length > 0) {
                html += '<div style="margin-top:12px;margin-bottom:8px;font-size:0.82rem;color:#8B0000;font-weight:600;">Otros productos (selecciona para destacar):</div>';
                nonFeatured.slice(0, 30).forEach(p => {
                    const price = p.price ? `$${parseFloat(p.price).toFixed(2)}` : '';
                    html += `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #8B0000;border-radius:10px;cursor:pointer;">
                        <input type="checkbox" class="featured-product-checkbox" value="${p.id}" style="width:18px;height:18px;accent-color:#8B0000;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(p.name)}</div>
                            <div style="font-size:0.75rem;color:#8B0000;">${escapeHtml(p.category || '')} ${price ? '· ' + price : ''}</div>
                        </div>
                    </label>`;
                });
                if (nonFeatured.length > 30) {
                    html += `<p style="font-size:0.78rem;color:#8B0000;text-align:center;">... y ${nonFeatured.length - 30} más. Usa la sección de productos para ver todos.</p>`;
                }
            }

            html += '</div>';
            html += '<button class="btn btn-primary" style="margin-top:16px;background:linear-gradient(135deg,#8B0000,#8B0000);" onclick="window._adminSaveFeaturedProducts()"><i class="fas fa-save"></i> Guardar Productos Destacados</button>';
            container.innerHTML = html;

            container.querySelectorAll('.featured-product-checkbox').forEach(cb => {
                cb.addEventListener('change', () => {
                    const checked = container.querySelectorAll('.featured-product-checkbox:checked');
                    if (checked.length > 4) { cb.checked = false; showToast('Máximo 4 productos destacados', 'warning'); }
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
                container.innerHTML = '<p style="color:#8B0000;font-size:0.85rem;">No hay inmuebles disponibles.</p>';
                return;
            }

            let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
            html += '<div style="margin-bottom:8px;font-size:0.82rem;color:#8B0000;font-weight:600;">Inmuebles actualmente destacados:</div>';

            properties.filter(p => featuredIds.has(p.id)).forEach(p => {
                const price = p.price ? `$${parseFloat(p.price).toLocaleString('es-VE')}` : '';
                html += `<label style="display:flex;align-items:center;gap:10px;padding:10px;border:2px solid #8B0000;border-radius:10px;background:#8B0000;cursor:pointer;">
                    <input type="checkbox" class="featured-property-checkbox" value="${p.id}" checked style="width:18px;height:18px;accent-color:#8B0000;">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(p.title)}</div>
                        <div style="font-size:0.75rem;color:#8B0000;">${escapeHtml(p.property_type || '')} · ${escapeHtml(p.city || '')} ${price ? '· ' + price : ''}</div>
                    </div>
                </label>`;
            });

            const nonFeatured = properties.filter(p => !featuredIds.has(p.id));
            if (nonFeatured.length > 0) {
                html += '<div style="margin-top:12px;margin-bottom:8px;font-size:0.82rem;color:#8B0000;font-weight:600;">Otros inmuebles (selecciona para destacar):</div>';
                nonFeatured.slice(0, 30).forEach(p => {
                    const price = p.price ? `$${parseFloat(p.price).toLocaleString('es-VE')}` : '';
                    html += `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #8B0000;border-radius:10px;cursor:pointer;">
                        <input type="checkbox" class="featured-property-checkbox" value="${p.id}" style="width:18px;height:18px;accent-color:#8B0000;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(p.title)}</div>
                            <div style="font-size:0.75rem;color:#8B0000;">${escapeHtml(p.property_type || '')} · ${escapeHtml(p.city || '')} ${price ? '· ' + price : ''}</div>
                        </div>
                    </label>`;
                });
                if (nonFeatured.length > 30) {
                    html += `<p style="font-size:0.78rem;color:#8B0000;text-align:center;">... y ${nonFeatured.length - 30} más. Usa la sección de inmuebles para ver todos.</p>`;
                }
            }

            html += '</div>';
            html += '<button class="btn btn-primary" style="margin-top:16px;background:linear-gradient(135deg,#8B0000,#8B0000);" onclick="window._adminSaveFeaturedProperties()"><i class="fas fa-save"></i> Guardar Inmuebles Destacados</button>';
            container.innerHTML = html;

            container.querySelectorAll('.featured-property-checkbox').forEach(cb => {
                cb.addEventListener('change', () => {
                    const checked = container.querySelectorAll('.featured-property-checkbox:checked');
                    if (checked.length > 4) { cb.checked = false; showToast('Máximo 4 inmuebles destacados', 'warning'); }
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
                container.innerHTML = '<p style="color:#8B0000;font-size:0.85rem;">No hay empleos disponibles.</p>';
                return;
            }

            let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
            html += '<div style="margin-bottom:8px;font-size:0.82rem;color:#8B0000;font-weight:600;">Empleos actualmente destacados:</div>';

            jobs.filter(j => featuredIds.has(j.id)).forEach(j => {
                const salary = j.salary ? `$${j.salary}` : '';
                html += `<label style="display:flex;align-items:center;gap:10px;padding:10px;border:2px solid #8B0000;border-radius:10px;background:#8B0000;cursor:pointer;">
                    <input type="checkbox" class="featured-job-checkbox" value="${j.id}" checked style="width:18px;height:18px;accent-color:#8B0000;">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(j.title)}</div>
                        <div style="font-size:0.75rem;color:#8B0000;">${escapeHtml(j.company_name || '')} · ${escapeHtml(j.city || '')} ${salary ? '· ' + salary : ''}</div>
                    </div>
                </label>`;
            });

            const nonFeatured = jobs.filter(j => !featuredIds.has(j.id));
            if (nonFeatured.length > 0) {
                html += '<div style="margin-top:12px;margin-bottom:8px;font-size:0.82rem;color:#8B0000;font-weight:600;">Otros empleos (selecciona para destacar):</div>';
                nonFeatured.slice(0, 40).forEach(j => {
                    const salary = j.salary ? `$${j.salary}` : '';
                    html += `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #8B0000;border-radius:10px;cursor:pointer;">
                        <input type="checkbox" class="featured-job-checkbox" value="${j.id}" style="width:18px;height:18px;accent-color:#8B0000;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(j.title)}</div>
                            <div style="font-size:0.75rem;color:#8B0000;">${escapeHtml(j.company_name || '')} · ${escapeHtml(j.city || '')} ${salary ? '· ' + salary : ''}</div>
                        </div>
                    </label>`;
                });
                if (nonFeatured.length > 40) {
                    html += `<p style="font-size:0.78rem;color:#8B0000;text-align:center;">... y ${nonFeatured.length - 40} más.</p>`;
                }
            }

            html += '</div>';
            html += '<button class="btn btn-primary" style="margin-top:16px;background:linear-gradient(135deg,#8B0000,#8B0000);" onclick="window._adminSaveFeaturedJobs()"><i class="fas fa-save"></i> Guardar Empleos Destacados</button>';
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

    // ═══════════════════════════════════════════════════════════════
    // ─── PREMIUM PAYMENTS TAB ────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    function setupPremiumListeners() {
        // Filter buttons
        document.querySelectorAll('.premium-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.premium-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                premiumFilter = btn.dataset.filter;
                premiumPage = 1;
                loadPremiumRequests();
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('btnRefreshPremium');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                premiumPage = 1;
                loadPremiumTab();
            });
        }

        // Voucher modal close
        const voucherClose = document.getElementById('premiumVoucherClose');
        const voucherCloseBtn = document.getElementById('premiumVoucherCloseBtn');
        if (voucherClose) voucherClose.addEventListener('click', () => toggleModal(premiumVoucherModal, false));
        if (voucherCloseBtn) voucherCloseBtn.addEventListener('click', () => toggleModal(premiumVoucherModal, false));

        // Activate modal
        const activateClose = document.getElementById('premiumActivateClose');
        const activateCancel = document.getElementById('premiumActivateCancel');
        const activateConfirm = document.getElementById('premiumActivateConfirm');
        if (activateClose) activateClose.addEventListener('click', () => toggleModal(premiumActivateModal, false));
        if (activateCancel) activateCancel.addEventListener('click', () => toggleModal(premiumActivateModal, false));
        if (activateConfirm) activateConfirm.addEventListener('click', confirmManualActivate);

        // Search users
        const searchBtn = document.getElementById('premiumUserSearchBtn');
        const searchInput = document.getElementById('premiumUserSearch');
        if (searchBtn) searchBtn.addEventListener('click', searchUsersForPremium);
        if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchUsersForPremium(); });

        // Refresh non-premium list
        const refreshNonPremium = document.getElementById('btnRefreshNonPremium');
        if (refreshNonPremium) refreshNonPremium.addEventListener('click', () => {
            premiumUsersPage = 1;
            loadNonPremiumUsers();
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: PREMIUM - Pagos y solicitudes premium
    //  Aprobar/rechazar solicitudes, activación manual de premium
    //  Funciones: loadPremiumTab(), loadPremiumStats(),
    //            loadPremiumRequests(), loadNonPremiumUsers()
    //  Exporta: window._adminApprovePremium/Reject, etc.
    // ═══════════════════════════════════════════════════════════

    async function loadPremiumTab() {
        await Promise.all([loadPremiumRequests(), loadPremiumStats(), loadNonPremiumUsers()]);
    }

    async function loadPremiumStats() {
        try {
            const pendingRes = await api.get('/premium-requests?status=pending&limit=1');
            const approvedRes = await api.get('/premium-requests?status=approved&limit=1');
            const usersRes = await api.get('/users?limit=1000');

            const pendingCount = pendingRes.pagination?.total || 0;
            const approvedCount = approvedRes.pagination?.total || 0;
            const premiumUsers = (usersRes.users || []).filter(u => u.plan_type === 'premium').length;

            const el = (id) => document.getElementById(id);
            if (el('adminPremiumPending')) el('adminPremiumPending').textContent = pendingCount;
            if (el('adminPremiumApproved')) el('adminPremiumApproved').textContent = approvedCount;
            if (el('adminPremiumTotalUsers')) el('adminPremiumTotalUsers').textContent = premiumUsers;
            if (el('adminPremiumBadge')) el('adminPremiumBadge').textContent = pendingCount;
        } catch (err) {
            console.error('Error loading premium stats:', err);
        }
    }

    async function loadPremiumRequests() {
        const loadingEl = document.getElementById('premiumRequestsLoading');
        const listEl = document.getElementById('premiumRequestsList');
        const emptyEl = document.getElementById('premiumRequestsEmpty');
        const paginationEl = document.getElementById('premiumRequestsPagination');

        if (loadingEl) loadingEl.style.display = 'block';
        if (listEl) listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'none';

        try {
            const params = `?status=${premiumFilter}&page=${premiumPage}&limit=${PAGE_LIMIT}`;
            const data = await api.get(`/premium-requests${params}`);
            const requests = data.requests || [];

            if (loadingEl) loadingEl.style.display = 'none';

            if (requests.length === 0) {
                if (emptyEl) emptyEl.style.display = 'block';
                return;
            }

            let html = '';
            requests.forEach(req => {
                const statusLabel = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };
                const durationLabel = { '3_months': '3 Meses', '1_year': '1 Ano' };
                const userName = req.user_name || 'Usuario #' + req.user_id;
                const userEmail = req.user_email || '';
                const initials = userName.substring(0, 2).toUpperCase();
                const dateCreated = req.created_at ? new Date(req.created_at).toLocaleDateString('es-VE') : '';
                const paymentPhone = req.payment_phone || 'No indicado';

                let actionsHtml = '';
                if (req.status === 'pending') {
                    actionsHtml = `
                        <button class="btn btn-sm btn-premium-view" onclick="window._adminViewVoucher(${req.id}, '${(req.voucher_url || '').replace(/'/g, "\\'")}')">
                            <i class="fas fa-receipt"></i> Ver Comprobante
                        </button>
                        <button class="btn btn-sm btn-premium-approve" onclick="window._adminApprovePremium(${req.id})">
                            <i class="fas fa-check"></i> Aprobar
                        </button>
                        <button class="btn btn-sm btn-premium-reject" onclick="window._adminRejectPremiumPrompt(${req.id})">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    `;
                }

                html += `
                    <div class="premium-request-card status-${req.status}">
                        <div class="premium-request-header">
                            <div class="premium-request-user">
                                <div class="premium-request-avatar">${initials}</div>
                                <div class="premium-request-info">
                                    <h4>${userName}</h4>
                                    <p>${userEmail} &bull; ID: ${req.user_id}</p>
                                </div>
                            </div>
                            <span class="premium-status-badge ${req.status}">${statusLabel[req.status] || req.status}</span>
                        </div>
                        <div class="premium-request-details">
                            <span><i class="fas fa-calendar"></i> ${dateCreated}</span>
                            <span><i class="fas fa-clock"></i> Plan: ${durationLabel[req.plan_duration] || req.plan_duration}</span>
                            <span><i class="fas fa-mobile-alt"></i> Pago desde: ${paymentPhone}</span>
                            ${req.user_plan ? `<span><i class="fas fa-tag"></i> Plan actual: ${req.user_plan}</span>` : ''}
                        </div>
                        <div class="premium-request-actions">
                            ${actionsHtml}
                        </div>
                    </div>
                `;
            });

            if (listEl) listEl.innerHTML = html;

            // Pagination
            if (paginationEl && data.pagination) {
                renderAdminPagination(paginationEl, data.pagination, (page) => {
                    premiumPage = page;
                    loadPremiumRequests();
                });
            }
        } catch (err) {
            console.error('Error loading premium requests:', err);
            if (loadingEl) loadingEl.style.display = 'none';
            if (listEl) listEl.innerHTML = `<p style="color:#dc3545;text-align:center;padding:20px;">Error al cargar solicitudes: ${err.message}</p>`;
        }
    }

    // View voucher image
    window._adminViewVoucher = function(requestId, voucherUrl) {
        const body = document.getElementById('premiumVoucherBody');
        if (!body) return;
        if (!voucherUrl) {
            body.innerHTML = '<p style="color:#8B0000;"><i class="fas fa-exclamation-circle"></i> No hay comprobante adjunto.</p>';
        } else {
            const fullUrl = voucherUrl.startsWith('http') ? voucherUrl : (window.location.origin + voucherUrl);
            body.innerHTML = `
                <img src="${fullUrl}" alt="Comprobante de pago" style="max-width:100%;max-height:70vh;border-radius:8px;border:1px solid #8B0000;" onerror="this.outerHTML='<p style=\\'color:#dc3545;\\'>Error al cargar la imagen del comprobante.</p>'">
                <p style="margin-top:12px;font-size:0.85rem;color:#8B0000;">Solicitud #${requestId}</p>
            `;
        }
        toggleModal(premiumVoucherModal, true);
    };

    // Approve premium request
    window._adminApprovePremium = async function(requestId) {
        if (!confirm('Aprobar esta solicitud de Premium? El usuario sera actualizado inmediatamente.')) return;
        try {
            await api.post(`/premium-requests/${requestId}/approve`);
            showToast('Solicitud aprobada exitosamente. Usuario ahora es Premium.', 'success');
            loadPremiumTab();
        } catch (err) {
            showToast('Error al aprobar: ' + (err.message || 'Error desconocido'), 'error');
        }
    };

    // Reject premium request (uses simple prompt)
    window._adminRejectPremium = async function(requestId) {
        const notes = prompt('Motivo del rechazo (opcional):');
        if (notes === null) return; // cancelled
        try {
            await api.post(`/premium-requests/${requestId}/reject`, { admin_notes: notes });
            showToast('Solicitud rechazada.', 'success');
            loadPremiumRequests();
            loadPremiumStats();
        } catch (err) {
            showToast('Error al rechazar: ' + (err.message || 'Error desconocido'), 'error');
        }
    };

    window._adminRejectPremiumPrompt = function(requestId) {
        window._adminRejectPremium(requestId);
    };

    // ─── Manual Premium Activation ───────────────────────────────

    let premiumUsersPage = 1;
    let premiumUsersTotalPages = 1;

    async function loadNonPremiumUsers(searchQuery) {
        const loadingEl = document.getElementById('premiumNonPremiumLoading');
        const resultsDiv = document.getElementById('premiumSearchResults');
        const emptyDiv = document.getElementById('premiumSearchEmpty');
        const tbody = document.getElementById('premiumSearchResultsBody');
        const paginationEl = document.getElementById('premiumUsersPagination');

        if (loadingEl) loadingEl.style.display = 'block';
        if (resultsDiv) resultsDiv.style.display = 'none';
        if (emptyDiv) emptyDiv.style.display = 'none';

        try {
            let url = `/users?limit=50&page=${premiumUsersPage}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            const data = await api.get(url);
            const allUsers = data.users || [];

            // Filter to only non-premium, non-admin users
            const users = allUsers.filter(u => u.plan_type !== 'premium' && u.role !== 'admin');

            if (loadingEl) loadingEl.style.display = 'none';

            if (users.length === 0) {
                if (emptyDiv) emptyDiv.style.display = 'block';
                return;
            }

            if (emptyDiv) emptyDiv.style.display = 'none';
            if (resultsDiv) resultsDiv.style.display = 'block';

            let html = '';
            users.forEach(u => {
                const created = u.created_at ? new Date(u.created_at).toLocaleDateString('es-VE') : '';
                const activateBtn = `<button class="btn btn-sm" onclick="window._adminOpenActivateModal(${u.id}, '${(u.name || '').replace(/'/g, "\\'")}', '${(u.email || '').replace(/'/g, "\\'")}')" style="background:linear-gradient(135deg,#FFD700,#FFA500);color:#333;font-weight:700;">
                        <i class="fas fa-crown"></i> Activar
                       </button>`;

                html += `<tr>
                    <td><strong>${u.name || 'Sin nombre'}</strong></td>
                    <td>${u.email || ''}</td>
                    <td><span style="background:#8B0000;color:#8B0000;padding:2px 10px;border-radius:12px;font-size:0.75rem;">Basico</span></td>
                    <td>${created}</td>
                    <td>${activateBtn}</td>
                </tr>`;
            });

            if (tbody) tbody.innerHTML = html;

            // Pagination
            if (data.pagination) {
                premiumUsersTotalPages = data.pagination.totalPages || 1;
                if (paginationEl) {
                    renderAdminPagination(paginationEl, data.pagination, (page) => {
                        premiumUsersPage = page;
                        loadNonPremiumUsers(document.getElementById('premiumUserSearch')?.value?.trim());
                    });
                }
            }
        } catch (err) {
            if (loadingEl) loadingEl.style.display = 'none';
            showToast('Error al cargar usuarios: ' + err.message, 'error');
        }
    }

    async function searchUsersForPremium() {
        premiumUsersPage = 1;
        const query = document.getElementById('premiumUserSearch')?.value?.trim() || '';
        await loadNonPremiumUsers(query);
    }

    window._adminOpenActivateModal = function(userId, userName, userEmail) {
        premiumActivateUserId = userId;
        const nameEl = document.getElementById('premiumActivateUserName');
        const emailEl = document.getElementById('premiumActivateUserEmail');
        const durationEl = document.getElementById('premiumActivateDuration');
        const notesEl = document.getElementById('premiumActivateNotes');

        if (nameEl) nameEl.textContent = userName;
        if (emailEl) emailEl.textContent = userEmail;
        if (durationEl) durationEl.value = '1_year';
        if (notesEl) notesEl.value = '';

        toggleModal(premiumActivateModal, true);
    };

    async function confirmManualActivate() {
        if (!premiumActivateUserId) return;
        const duration = document.getElementById('premiumActivateDuration');
        const notes = document.getElementById('premiumActivateNotes');
        const selectedDuration = duration ? duration.value : '1_year';

        try {
            const result = await api.post('/users/activate-premium', {
                user_id: premiumActivateUserId,
                duration: selectedDuration,
                admin_notes: notes ? notes.value : ''
            });
            showToast(result.message || 'Premium activado exitosamente', 'success');
            toggleModal(premiumActivateModal, false);
            premiumActivateUserId = null;
            // Refresh search results
            searchUsersForPremium();
            loadPremiumStats();
        } catch (err) {
            showToast('Error al activar Premium: ' + (err.message || err.error || 'Error desconocido'), 'error');
        }
    }

    // Helper: toggle modal visibility
    function toggleModal(modal, show) {
        if (!modal) return;
        if (show) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } else {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // ─── Admin Send Message ──────────────────────────────────
    let msgDropdownLoaded = false;
    let sendMsgSetupDone = false;

    async function loadAdminMsgUserDropdown() {
        const select = document.getElementById('adminMsgUserSelect');
        if (!select) return;

        if (!msgDropdownLoaded) {
            select.innerHTML = '<option value="">Cargando usuarios...</option>';
            try {
                const data = await api.get('/users?limit=200');
                const users = data.users || [];
                select.innerHTML = '<option value="">-- Seleccionar usuario --</option>' +
                    users.map(u => `<option value="${u.id}">${escHtml(u.name || 'Sin nombre')} (${escHtml(u.email || '')}) - ${u.role || 'user'}</option>`).join('');
                msgDropdownLoaded = true;
            } catch (err) {
                select.innerHTML = '<option value="">Error al cargar usuarios</option>';
            }
        }
    }

    function setupAdminSendMsg() {
        if (sendMsgSetupDone) return;
        sendMsgSetupDone = true;

        const btn = document.getElementById('adminSendMsgBtn');
        if (!btn) return;

        btn.addEventListener('click', async () => {
            const userId = document.getElementById('adminMsgUserSelect')?.value;
            const subject = document.getElementById('adminMsgSubject')?.value.trim();
            const body = document.getElementById('adminMsgBody')?.value.trim();
            const errDiv = document.getElementById('adminMsgSendError');

            if (errDiv) errDiv.style.display = 'none';

            if (!userId) { if (errDiv) { errDiv.textContent = 'Selecciona un usuario.'; errDiv.style.display = 'block'; } return; }
            if (!subject) { if (errDiv) { errDiv.textContent = 'El asunto es obligatorio.'; errDiv.style.display = 'block'; } return; }
            if (!body) { if (errDiv) { errDiv.textContent = 'El mensaje es obligatorio.'; errDiv.style.display = 'block'; } return; }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            try {
                // Save as a contact/message record
                await api.post('/contacts/admin-message', { user_id: userId, subject, message: body });
                document.getElementById('adminMsgSubject').value = '';
                document.getElementById('adminMsgBody').value = '';
                document.getElementById('adminMsgUserSelect').value = '';
                showToast('Mensaje enviado correctamente', 'success');
                loadMessages();
            } catch (err) {
                if (errDiv) { errDiv.textContent = err.message || 'Error al enviar el mensaje.'; errDiv.style.display = 'block'; }
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Mensaje';
            }
        });
    }

    // ─── Sellers Panel ──────────────────────────────────────────
    async function loadSellersPanel() {
        const loading = document.getElementById('sellersLoading');
        const table = document.getElementById('sellersTable');
        const tbody = document.getElementById('sellersTableBody');
        const empty = document.getElementById('sellersEmpty');
        if (!tbody) return;

        if (loading) loading.style.display = 'block';
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'none';

        try {
            const data = await api.get('/admin/sellers');
            const sellers = data.sellers || [];

            if (loading) loading.style.display = 'none';

            if (sellers.length === 0) {
                if (empty) empty.style.display = 'block';
                return;
            }

            if (table) table.style.display = 'table';

            tbody.innerHTML = sellers.map(s => {
                const avatarHTML = s.avatar
                    ? `<img src="${s.avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">`
                    : `<div style="width:32px;height:32px;border-radius:50%;background:#8B0000;color:#8B0000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;">${(s.user_name || 'V')[0].toUpperCase()}</div>`;
                const planBadge = s.plan_type === 'premium'
                    ? '<span style="background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;padding:2px 10px;border-radius:12px;font-size:0.72rem;font-weight:700;">Premium</span>'
                    : '<span style="background:#8B0000;color:#8B0000;padding:2px 10px;border-radius:12px;font-size:0.72rem;">Básico</span>';
                const date = s.created_at ? new Date(s.created_at).toLocaleDateString('es-VE') : '-';
                const isPremium = s.plan_type === 'premium';

                return `<tr>
                    <td>${s.user_id}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                            ${avatarHTML}
                            <div>
                                <div style="font-weight:600;font-size:0.85rem;">${escHtml(s.user_name || 'Sin nombre')}</div>
                                <div style="font-size:0.72rem;color:#8B0000;">${escHtml(s.user_email || '')}</div>
                            </div>
                        </div>
                    </td>
                    <td style="font-weight:600;">${escHtml(s.store_name || '-')}</td>
                    <td>${escHtml(s.city || '')} / ${escHtml(s.state || '')}</td>
                    <td>${escHtml(s.phone || '-')}</td>
                    <td>${s.whatsapp ? `<span style="color:#25D366;"><i class="fab fa-whatsapp"></i> ${escHtml(s.whatsapp)}</span>` : '<span style="color:#8B0000;">-</span>'}</td>
                    <td>${s.business_count || 0}</td>
                    <td>${planBadge}</td>
                    <td style="font-size:0.78rem;color:#8B0000;">${date}</td>
                    <td>
                        <div style="display:flex;gap:4px;flex-wrap:wrap;">
                            <button class="btn btn-xs btn-outline" onclick="window.admin.editUser(${s.user_id})" title="Editar agente"><i class="fas fa-edit"></i></button>
                            ${!isPremium ? `<button class="btn btn-xs" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:600;" onclick="window.admin.activateSellerPremium(${s.user_id})" title="Activar Premium"><i class="fas fa-crown"></i> Premium</button>` : `<button class="btn btn-xs" style="background:#8B0000;color:#8B0000;" onclick="window.admin.deactivateSellerPremium(${s.user_id})" title="Quitar Premium"><i class="fas fa-times-circle"></i> Quitar</button>`}
                        </div>
                    </td>
                </tr>`;
            }).join('');
        } catch (err) {
            if (loading) loading.style.display = 'none';
            console.error('Error loading sellers:', err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state-sm"><p style="color:#dc2626;">Error al cargar vendedores: ${escHtml(err.message)}</p></div></td></tr>`;
            if (table) table.style.display = 'table';
        }
    }

    // Activate premium for a seller
    async function activateSellerPremium(userId) {
        if (!confirm('¿Activar plan Premium a este vendedor por 3 meses?')) return;
        try {
            await api.post('/users/activate-premium', { user_id: userId, duration: '3_months' });
            showToast('Premium activado exitosamente (3 meses)', 'success');
            loadSellersPanel();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    // Deactivate premium for a seller
    async function deactivateSellerPremium(userId) {
        if (!confirm('¿Quitar el plan Premium a este vendedor?')) return;
        try {
            await api.put(`/users/${userId}`, { plan_type: 'basic' });
            showToast('Premium removido exitosamente', 'success');
            loadSellersPanel();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    // Refresh sellers button
    const btnRefreshSellers = document.getElementById('btnRefreshSellers');
    if (btnRefreshSellers) {
        btnRefreshSellers.addEventListener('click', loadSellersPanel);
    }

    // ─── Create User Form ─────────────────────────────────────
    let createUserSetupDone = false;

    function setupCreateUserForm() {
        if (createUserSetupDone) return;
        createUserSetupDone = true;

        const btn = document.getElementById('btnCreateUser');
        const errDiv = document.getElementById('createUserError');
        const successDiv = document.getElementById('createUserSuccess');
        const togglePwd = document.getElementById('toggleNewUserPwd');
        const pwdInput = document.getElementById('newUserPassword');

        if (togglePwd && pwdInput) {
            togglePwd.addEventListener('click', () => {
                const isPassword = pwdInput.type === 'password';
                pwdInput.type = isPassword ? 'text' : 'password';
                togglePwd.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            });
        }

        if (btn) {
            btn.addEventListener('click', async () => {
                const name = document.getElementById('newUserName')?.value.trim();
                const email = document.getElementById('newUserEmail')?.value.trim();
                const phone = document.getElementById('newUserPhone')?.value.trim();
                const password = document.getElementById('newUserPassword')?.value;
                const role = document.getElementById('newUserRole')?.value || 'user';

                if (errDiv) errDiv.style.display = 'none';
                if (successDiv) successDiv.style.display = 'none';

                if (!name || !email || !password) {
                    if (errDiv) { errDiv.textContent = 'Nombre, email y contraseña son obligatorios.'; errDiv.style.display = 'block'; }
                    return;
                }
                if (password.length < 6) {
                    if (errDiv) { errDiv.textContent = 'La contraseña debe tener al menos 6 caracteres.'; errDiv.style.display = 'block'; }
                    return;
                }

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

                try {
                    const result = await api.post('/admin/create-user', { name, email, phone, password, role });
                    if (successDiv) { successDiv.textContent = result.message || `Usuario "${name}" creado correctamente.`; successDiv.style.display = 'block'; }
                    // Clear form
                    document.getElementById('newUserName').value = '';
                    document.getElementById('newUserEmail').value = '';
                    document.getElementById('newUserPhone').value = '';
                    document.getElementById('newUserPassword').value = '';
                    document.getElementById('newUserRole').value = 'user';
                    showToast('Cuenta creada exitosamente', 'success');
                    // Refresh users list if loaded
                    loadUsers();
                } catch (err) {
                    if (errDiv) { errDiv.textContent = err.message || 'Error al crear la cuenta.'; errDiv.style.display = 'block'; }
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-user-plus"></i> Crear Cuenta';
                }
            });
        }
    }

    // ─── Banner Management ────────────────────────────────
    window.handleAdminBannerSelect = async function(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB para el banner', 'error'); input.value = ''; return; }

        try {
            showToast('Subiendo banner...', 'info');
            const fd = new FormData();
            fd.append('file', file);
            fd.append('product_type', 'banner');
            const result = await api.postFormData('/upload', fd);
            if (result.url) {
                document.getElementById('setting_hero_banner_url').value = result.url;
                const img = document.getElementById('adminBannerImg');
                const icon = document.getElementById('adminBannerPlaceholderIcon');
                const btn = document.getElementById('adminBannerRemoveBtn');
                if (img) { img.src = result.url; img.style.display = 'block'; }
                if (icon) icon.style.display = 'none';
                if (btn) btn.style.display = 'inline-flex';
                showToast('Banner subido. Guarda la configuración para aplicarlo.', 'success');
            }
        } catch(e) {
            showToast('Error al subir banner: ' + e.message, 'error');
        }
        input.value = '';
    };

    window.removeAdminBanner = function() {
        document.getElementById('setting_hero_banner_url').value = '';
        const img = document.getElementById('adminBannerImg');
        const icon = document.getElementById('adminBannerPlaceholderIcon');
        const btn = document.getElementById('adminBannerRemoveBtn');
        if (img) { img.src = ''; img.style.display = 'none'; }
        if (icon) icon.style.display = '';
        if (btn) btn.style.display = 'none';
    };

    // ─── Logo Management ────────────────────────────────
    window.handleAdminLogoSelect = async function(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('Max 2MB para el logo', 'error'); input.value = ''; return; }

        try {
            showToast('Subiendo logo...', 'info');
            const fd = new FormData();
            fd.append('file', file);
            fd.append('product_type', 'logo');
            const result = await api.postFormData('/upload', fd);
            if (result.url) {
                document.getElementById('setting_hero_logo_url').value = result.url;
                const img = document.getElementById('adminLogoImg');
                const icon = document.getElementById('adminLogoPlaceholderIcon');
                const btn = document.getElementById('adminLogoRemoveBtn');
                if (img) { img.src = result.url; img.style.display = 'block'; }
                if (icon) icon.style.display = 'none';
                if (btn) btn.style.display = 'inline-flex';
                showToast('Logo subido. Guarda la configuración para aplicarlo.', 'success');
            }
        } catch(e) {
            showToast('Error al subir logo: ' + e.message, 'error');
        }
        input.value = '';
    };

    window.removeAdminLogo = function() {
        document.getElementById('setting_hero_logo_url').value = '';
        const img = document.getElementById('adminLogoImg');
        const icon = document.getElementById('adminLogoPlaceholderIcon');
        const btn = document.getElementById('adminLogoRemoveBtn');
        if (img) { img.src = ''; img.style.display = 'none'; }
        if (icon) icon.style.display = '';
        if (btn) btn.style.display = 'none';
    };

    // ─── En-Santiago Logo Management ─────────────────
    window.handleHolaxLogoSelect = async function(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('Max 2MB para el logo', 'error'); input.value = ''; return; }
        try {
            showToast('Subiendo logo En-Santiago...', 'info');
            const fd = new FormData();
            fd.append('file', file);
            fd.append('product_type', 'logo');
            const result = await api.postFormData('/upload', fd);
            if (result.url) {
                document.getElementById('setting_holax_logo_url').value = result.url;
                const img = document.getElementById('holaxLogoImg');
                const icon = document.getElementById('holaxLogoPlaceholder');
                const btn = document.getElementById('holaxLogoRemoveBtn');
                if (img) { img.src = result.url; img.style.display = ''; }
                if (icon) icon.style.display = 'none';
                if (btn) btn.style.display = 'inline-flex';
                showToast('Logo En-Santiago subido. Guarda la configuración para aplicarlo.', 'success');
            }
        } catch(e) {
            showToast('Error al subir logo: ' + e.message, 'error');
        }
        input.value = '';
    };

    window.removeHolaxLogo = function() {
        document.getElementById('setting_holax_logo_url').value = '';
        const img = document.getElementById('holaxLogoImg');
        const icon = document.getElementById('holaxLogoPlaceholder');
        const btn = document.getElementById('holaxLogoRemoveBtn');
        if (img) { img.src = ''; img.style.display = 'none'; }
        if (icon) icon.style.display = '';
        if (btn) btn.style.display = 'none';
    };

    window.previewHolaxLogo = function(url) {
        const img = document.getElementById('holaxLogoImg');
        const icon = document.getElementById('holaxLogoPlaceholder');
        const btn = document.getElementById('holaxLogoRemoveBtn');
        if (url.trim()) {
            if (img) { img.src = url; img.style.display = ''; }
            if (icon) icon.style.display = 'none';
            if (btn) btn.style.display = 'inline-flex';
        } else {
            if (img) { img.src = ''; img.style.display = 'none'; }
            if (icon) icon.style.display = '';
            if (btn) btn.style.display = 'none';
        }
    };

    window.saveHolaxLogoSettings = async function() {
        const url = document.getElementById('setting_holax_logo_url')?.value?.trim();
        if (!url) {
            showToast('Pega una URL o sube un logo primero', 'error');
            return;
        }
        try {
            showToast('Guardando logo En-Santiago y actualizando empleos...', 'info');
            const result = await api.put('/settings', { holax_logo_url: url });
            let msg = 'Logo En-Santiago guardado exitosamente';
            if (result.holax_jobs_updated) {
                msg += ` — ${result.holax_jobs_updated} empleo(s) En-Santiago actualizado(s) con el nuevo logo`;
            }
            showToast(msg, 'success');
        } catch (e) {
            console.error('Error saving En-Santiago logo:', e);
            showToast('Error al guardar: ' + e.message, 'error');
        }
    };

    // ─── Marketplace Banner Management ─────────────────
    window.handleAdminMpBannerSelect = async function(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB para el banner', 'error'); input.value = ''; return; }

        try {
            showToast('Subiendo banner...', 'info');
            const fd = new FormData();
            fd.append('file', file);
            fd.append('product_type', 'banner');
            const result = await api.postFormData('/upload', fd);
            if (result.url) {
                document.getElementById('setting_marketplace_banner_url').value = result.url;
                const img = document.getElementById('adminMpBannerImg');
                const icon = document.getElementById('adminMpBannerPlaceholderIcon');
                const btn = document.getElementById('adminMpBannerRemoveBtn');
                if (img) { img.src = result.url; img.style.display = 'block'; }
                if (icon) icon.style.display = 'none';
                if (btn) btn.style.display = 'inline-flex';
                showToast('Banner subido. Guarda la configuración para aplicarlo.', 'success');
            }
        } catch(e) {
            showToast('Error al subir banner: ' + e.message, 'error');
        }
        input.value = '';
    };

    window.removeAdminMpBanner = function() {
        document.getElementById('setting_marketplace_banner_url').value = '';
        const img = document.getElementById('adminMpBannerImg');
        const icon = document.getElementById('adminMpBannerPlaceholderIcon');
        const btn = document.getElementById('adminMpBannerRemoveBtn');
        if (img) { img.src = ''; img.style.display = 'none'; }
        if (icon) icon.style.display = '';
        if (btn) btn.style.display = 'none';
    };

    // ─── Empleo Banner Management ─────────────────
    window.handleAdminEmpleoBannerSelect = async function(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB para el banner', 'error'); input.value = ''; return; }

        try {
            showToast('Subiendo banner de empleos...', 'info');
            const fd = new FormData();
            fd.append('file', file);
            fd.append('product_type', 'banner');
            const result = await api.postFormData('/upload', fd);
            if (result.url) {
                document.getElementById('setting_empleo_banner_url').value = result.url;
                const img = document.getElementById('adminEmpleoBannerImg');
                const icon = document.getElementById('adminEmpleoBannerPlaceholderIcon');
                const btn = document.getElementById('adminEmpleoBannerRemoveBtn');
                if (img) { img.src = result.url; img.style.display = 'block'; }
                if (icon) icon.style.display = 'none';
                if (btn) btn.style.display = 'inline-flex';
                showToast('Banner de empleos subido. Guarda la configuración para aplicarlo.', 'success');
            }
        } catch(e) {
            showToast('Error al subir banner: ' + e.message, 'error');
        }
        input.value = '';
    };

    window.removeAdminEmpleoBanner = function() {
        document.getElementById('setting_empleo_banner_url').value = '';
        const img = document.getElementById('adminEmpleoBannerImg');
        const icon = document.getElementById('adminEmpleoBannerPlaceholderIcon');
        const btn = document.getElementById('adminEmpleoBannerRemoveBtn');
        if (img) { img.src = ''; img.style.display = 'none'; }
        if (icon) icon.style.display = '';
        if (btn) btn.style.display = 'none';
    };

    // Override loadSettings to also show banner + logo + mp banner preview
    const _origLoadSettings = loadSettings;
    loadSettings = async function() {
        await _origLoadSettings();
        const bannerUrl = document.getElementById('setting_hero_banner_url')?.value;
        if (bannerUrl) {
            const img = document.getElementById('adminBannerImg');
            const icon = document.getElementById('adminBannerPlaceholderIcon');
            const btn = document.getElementById('adminBannerRemoveBtn');
            if (img) { img.src = bannerUrl; img.style.display = 'block'; }
            if (icon) icon.style.display = 'none';
            if (btn) btn.style.display = 'inline-flex';
        }
        const mpBannerUrl = document.getElementById('setting_marketplace_banner_url')?.value;
        if (mpBannerUrl) {
            const img = document.getElementById('adminMpBannerImg');
            const icon = document.getElementById('adminMpBannerPlaceholderIcon');
            const btn = document.getElementById('adminMpBannerRemoveBtn');
            if (img) { img.src = mpBannerUrl; img.style.display = 'block'; }
            if (icon) icon.style.display = 'none';
            if (btn) btn.style.display = 'inline-flex';
        }
        const empleoBannerUrl = document.getElementById('setting_empleo_banner_url')?.value;
        if (empleoBannerUrl) {
            const img = document.getElementById('adminEmpleoBannerImg');
            const icon = document.getElementById('adminEmpleoBannerPlaceholderIcon');
            const btn = document.getElementById('adminEmpleoBannerRemoveBtn');
            if (img) { img.src = empleoBannerUrl; img.style.display = 'block'; }
            if (icon) icon.style.display = 'none';
            if (btn) btn.style.display = 'inline-flex';
        }
        const logoUrl = document.getElementById('setting_hero_logo_url')?.value;
        if (logoUrl) {
            const img = document.getElementById('adminLogoImg');
            const icon = document.getElementById('adminLogoPlaceholderIcon');
            const btn = document.getElementById('adminLogoRemoveBtn');
            if (img) { img.src = logoUrl; img.style.display = 'block'; }
            if (icon) icon.style.display = 'none';
            if (btn) btn.style.display = 'inline-flex';
        }
        // En-Santiago logo preview
        const holaxLogoUrl = document.getElementById('setting_holax_logo_url')?.value || '/api/serve?key=merida%2Flogos%2F6%2F1783998320478_Logo_Holax.png';
        if (holaxLogoUrl) {
            const img = document.getElementById('holaxLogoImg');
            const icon = document.getElementById('holaxLogoPlaceholder');
            const btn = document.getElementById('holaxLogoRemoveBtn');
            if (img) { img.src = holaxLogoUrl; img.style.display = ''; }
            if (icon) icon.style.display = 'none';
            if (btn) btn.style.display = 'inline-flex';
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: EDITAR NEGOCIOS - Editor avanzado de negocios
    //  Galería, logos, banners, imágenes, servicios
    //  Funciones: loadEditBizList(), loadEditBizDetail()
    //  Exporta: window.adminEditBizSave/HandleLogo/RemoveLogo/AddImage/etc.
    // ═══════════════════════════════════════════════════════════

    // ─── Editar Negocios Tab ────────────────────────────────
    let editBizList = [];
    let editBizCurrent = null;

    async function loadEditBizList() {
        const sel = document.getElementById('adminEditBizSelect');
        if (!sel) return;
        sel.innerHTML = '<option value="">Cargando negocios...</option>';
        try {
            const data = await api.get('/businesses?limit=500&status=approved,pending,rejected');
            editBizList = data.businesses || [];
            sel.innerHTML = '<option value="">-- Selecciona un negocio (' + editBizList.length + ') --</option>';
            editBizList.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.title + ' (' + (b.status || '?') + ') - ' + (b.city || '');
                sel.appendChild(opt);
            });
            // If already had a selection, keep it
            if (editBizCurrent) {
                sel.value = editBizCurrent.id;
            }
        } catch(e) {
            sel.innerHTML = '<option value="">Error al cargar</option>';
            showToast('Error al cargar negocios: ' + e.message, 'error');
        }
    }

    // Setup dropdown change listener
    (function() {
        const sel = document.getElementById('adminEditBizSelect');
        if (sel) {
            sel.addEventListener('change', () => {
                const id = sel.value;
                if (id) loadEditBizDetail(id);
                else {
                    document.getElementById('adminEditBizContainer').style.display = 'none';
                    editBizCurrent = null;
                }
            });
        }
    })();

    async function loadEditBizDetail(id) {
        const container = document.getElementById('adminEditBizContainer');
        if (!container) return;
        container.style.display = 'block';
        container.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#8B0000;"></i><p style="margin-top:8px;color:#8B0000;">Cargando datos...</p></div>';
        try {
            const data = await api.get('/businesses/' + id);
            editBizCurrent = data.business || data;
            renderEditBizForm(editBizCurrent);
        } catch(e) {
            container.innerHTML = '<p style="color:#dc2626;">Error: ' + e.message + '</p>';
        }
    }

    function escH(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function renderEditBizForm(b) {
        const container = document.getElementById('adminEditBizContainer');
        if (!container) return;
        const statusColors = { approved: '#8B0000', pending: '#d97706', rejected: '#dc2626' };
        const statusLabels = { approved: 'Aprobado', pending: 'Pendiente', rejected: 'Rechazado' };
        const images = b.images || [];
        container.innerHTML = `
        <div class="aeb-card">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <h4 style="margin:0;"><i class="fas fa-building" style="color:#8B0000;"></i> ${escH(b.title)}</h4>
                <div style="display:flex;gap:6px;align-items:center;">
                    <span style="padding:3px 10px;border-radius:8px;font-size:0.75rem;font-weight:700;background:${statusColors[b.status]||'#8B0000'};color:#fff;">${statusLabels[b.status]||b.status}</span>
                    <a href="/negocio/${b.slug||b.id}" target="_blank" class="btn btn-secondary btn-sm"><i class="fas fa-external-link-alt"></i> Ver</a>
                    <button class="btn btn-danger btn-sm" onclick="adminDeleteBiz(${b.id})"><i class="fas fa-trash"></i> Eliminar</button>
                </div>
            </div>
            <p style="font-size:0.78rem;color:#8B0000;margin:4px 0 0;">ID: ${b.id} | Dueño: ${escH(b.owner_name||b.user_id||'?')} | Vistas: ${b.views||0}</p>
        </div>
        <div class="aeb-card">
            <h4><i class="fas fa-image" style="color:#8B0000;"></i> Logo</h4>
            <div class="aeb-logo-area">
                <div class="aeb-logo-preview" id="aebLogoPreview">
                    ${b.logo ? '<img src="'+escH(b.logo)+'" alt="Logo" onerror="this.style.display=\'none\'">' : '<i class="fas fa-store" style="font-size:1.5rem;color:#8B0000;"></i>'}
                </div>
                <div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('aebLogoInput').click()"><i class="fas fa-upload"></i> Subir Logo</button>
                    ${b.logo ? '<button type="button" class="btn btn-secondary btn-sm" onclick="adminEditBizRemoveLogo()"><i class="fas fa-trash"></i> Quitar</button>' : ''}
                    <input type="file" id="aebLogoInput" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="adminEditBizHandleLogo(this)">
                    <input type="hidden" id="aebLogoUrl" value="${escH(b.logo||'')}">
                    <p style="font-size:0.72rem;color:#8B0000;margin-top:4px;">JPG, PNG, WebP - Max 5MB</p>
                </div>
            </div>
        </div>
        <div class="aeb-card">
            <h4><i class="fas fa-panorama" style="color:#8B0000;"></i> Banner de Portada</h4>
            <p style="font-size:0.78rem;color:#8B0000;margin-bottom:10px;">Imagen de portada tipo Facebook. Recomendado: 1200x400px.</p>
            <div class="aeb-banner-preview" id="aebBannerPreview" style="width:100%;height:180px;border-radius:10px;overflow:hidden;background:#8B0000;display:flex;align-items:center;justify-content:center;margin-bottom:10px;">
                ${b.banner ? '<img src="'+escH(b.banner)+'" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML=\'<span style=color:#8B0000><i class=\\\'fas fa-panorama\\\' style=\\\'font-size:2rem\\\'></i><br>Sin banner</span>\'">' : '<span style="color:#8B0000;text-align:center;"><i class="fas fa-panorama" style="font-size:2rem;"></i><br><span style="font-size:0.78rem;">Sin banner</span></span>'}
            </div>
            <div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('aebBannerInput').click()"><i class="fas fa-upload"></i> Subir Banner</button>
                ${b.banner ? '<button type="button" class="btn btn-secondary btn-sm" onclick="adminEditBizRemoveBanner()"><i class="fas fa-trash"></i> Quitar</button>' : ''}
                <input type="file" id="aebBannerInput" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="adminEditBizHandleBanner(this)">
                <input type="hidden" id="aebBannerUrl" value="${escH(b.banner||'')}">
                <p style="font-size:0.72rem;color:#8B0000;margin-top:4px;">JPG, PNG, WebP - Max 5MB</p>
            </div>
        </div>
        <div class="aeb-card">
            <h4><i class="fas fa-info-circle" style="color:#8B0000;"></i> Informacion Basica</h4>
            <div class="aeb-grid">
                <div class="aeb-field"><label>Nombre *</label><input type="text" class="eb-input" id="aebTitle" value="${escH(b.title||'')}" maxlength="150"></div>
                <div class="aeb-field"><label>Categoria</label><input type="text" class="eb-input" id="aebCategory" value="${escH(b.category_name||'')}"></div>
                <div class="aeb-field"><label>Descripcion</label><textarea class="eb-input eb-textarea" id="aebDesc" rows="3">${escH(b.description||'')}</textarea></div>
                <div class="aeb-field"><label>Tipo</label><input type="text" class="eb-input" id="aebType" value="${escH(b.business_type||'')}"></div>
                <div class="aeb-field" id="aebEspecialidadWrap" style="${(b.category_slug==='medicina-servicio-medico'||b.especialidad)?'':'display:none'}"><label><i class="fas fa-stethoscope" style="color:#e74c3c;"></i> Especialidad</label><input type="text" class="eb-input" id="aebEspecialidad" value="${escH(b.especialidad||'')}" placeholder="Ej: Cardiología, Dermatología..."></div>
            </div>
        </div>
        <div class="aeb-card">
            <h4><i class="fas fa-phone" style="color:#8B0000;"></i> Contacto</h4>
            <div class="aeb-grid">
                <div class="aeb-field"><label>Telefono</label><input type="tel" class="eb-input" id="aebPhone" value="${escH(b.phone||'')}"></div>
                <div class="aeb-field"><label>WhatsApp</label><input type="tel" class="eb-input" id="aebWhatsapp" value="${escH(b.whatsapp||'')}"></div>
                <div class="aeb-field"><label>Email</label><input type="email" class="eb-input" id="aebEmail" value="${escH(b.email_contact||b.email||'')}"></div>
                <div class="aeb-field"><label>Website</label><input type="url" class="eb-input" id="aebWebsite" value="${escH(b.website||'')}"></div>
                <div class="aeb-field"><label>Instagram</label><input type="text" class="eb-input" id="aebInstagram" value="${escH(b.instagram||'')}"></div>
                <div class="aeb-field"><label>Facebook</label><input type="text" class="eb-input" id="aebFacebook" value="${escH(b.facebook||'')}"></div>
                <div class="aeb-field"><label>TikTok</label><input type="text" class="eb-input" id="aebTiktok" value="${escH(b.tiktok||'')}"></div>
                <div class="aeb-field"><label>YouTube</label><input type="text" class="eb-input" id="aebYoutube" value="${escH(b.youtube||'')}"></div>
            </div>
        </div>
        <div class="aeb-card">
            <h4><i class="fas fa-map-marker-alt" style="color:#dc2626;"></i> Ubicacion</h4>
            <div class="aeb-grid">
                <div class="aeb-field"><label>Direccion</label><input type="text" class="eb-input" id="aebAddress" value="${escH(b.address||'')}"></div>
                <div class="aeb-field"><label>Ciudad</label><input type="text" class="eb-input" id="aebCity" value="${escH(b.city||'')}"></div>
                <div class="aeb-field"><label>Estado</label><input type="text" class="eb-input" id="aebState" value="${escH(b.state||'')}"></div>
                <div class="aeb-field"><label>Horario</label><input type="text" class="eb-input" id="aebSchedule" value="${escH(b.schedule||'')}" placeholder="Lun-Vie 8:00-17:00"></div>
            </div>
        </div>
        <div class="aeb-card">
            <h4><i class="fas fa-images" style="color:#8B0000;"></i> Imagenes (${images.length})</h4>
            ${images.length > 0 ? '<div class="aeb-images-grid" id="aebImagesGrid">' +
                images.map((img, i) => '<div class="aeb-img-thumb">' +
                    '<img src="'+escH(img.url)+'" alt="" onerror="this.parentElement.style.display=\'none\'">' +
                    '<button class="aeb-img-remove" onclick="adminEditBizRemoveImage('+(img.id||img.business_id)+',\''+escH(img.url).replace(/'/g,"\\'")+'\')" title="Eliminar">&times;</button>' +
                    (img.is_cover ? '<span class="aeb-img-cover">Portada</span>' : '<button class="aeb-img-cover" onclick="adminEditBizSetCover('+img.id+')" style="cursor:pointer;">Portada</button>') +
                    '</div>').join('') +
                '</div>' : '<p style="color:#8B0000;font-size:0.85rem;">No hay imagenes.</p>'}
            <div style="margin-top:12px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('aebNewImageInput').click()"><i class="fas fa-plus"></i> Agregar Imagen</button>
                <input type="file" id="aebNewImageInput" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="adminEditBizAddImage(this)">
            </div>
        </div>
        <div class="aeb-card">
            <h4><i class="fas fa-toggle-on" style="color:#f59e0b;"></i> Estado</h4>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-sm ${b.status==='approved'?'btn-primary':'btn-secondary'}" onclick="adminEditBizChangeStatus(${b.id},'approved')" style="${b.status==='approved'?'background:#8B0000;':''}"><i class="fas fa-check"></i> Aprobar</button>
                <button class="btn btn-sm ${b.status==='pending'?'btn-primary':'btn-secondary'}" onclick="adminEditBizChangeStatus(${b.id},'pending')" style="${b.status==='pending'?'background:#d97706;':''}"><i class="fas fa-clock"></i> Pendiente</button>
                <button class="btn btn-sm ${b.status==='rejected'?'btn-primary':'btn-secondary'}" onclick="adminEditBizChangeStatus(${b.id},'rejected')" style="${b.status==='rejected'?'background:#dc2626;color:#fff;':''}"><i class="fas fa-times"></i> Rechazar</button>
            </div>
        </div>

        <!-- HTML de Pagina Personalizada -->
        <div class="aeb-card">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                <h4 style="margin:0;"><i class="fas fa-code" style="color:#8B0000;"></i> HTML de Pagina del Negocio</h4>
                <div style="display:flex;gap:6px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adminEditBizPreviewHtml()"><i class="fas fa-eye"></i> Vista Previa</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adminEditBizLoadCurrentHtml()"><i class="fas fa-download"></i> Cargar HTML Actual</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="if(confirm('Eliminar el HTML personalizado? Se mostrara la pagina por defecto.')){document.getElementById('aebCustomHtml').value='';showToast('HTML personalizado eliminado','info');}" style="color:#dc2626;"><i class="fas fa-trash"></i> Resetear</button>
                </div>
            </div>
            <p style="font-size:0.82rem;color:#8B0000;margin:0 0 8px;">Edita el codigo HTML que se mostrara en la pagina de perfil de este negocio. Si se deja vacio, se usara la plantilla por defecto. Puedes usar CSS inline y JavaScript basico.</p>
            <textarea id="aebCustomHtml" class="eb-input" style="width:100%;min-height:300px;font-family:monospace;font-size:0.82rem;line-height:1.5;resize:vertical;tab-size:2;" placeholder="Escribe o pega aqui el HTML personalizado para la pagina de este negocio...">${escH(b.custom_html||'')}</textarea>
            <p style="font-size:0.72rem;color:#8B0000;margin:6px 0 0;">Nota: El HTML se guarda con el boton 'Guardar Cambios' de abajo. Para ver la pagina publicada, haz clic en 'Ver' arriba.</p>
        </div>

        <div style="text-align:right;margin-top:8px;">
            <button class="btn" onclick="adminEditBizSave(${b.id})" style="background:linear-gradient(135deg,#8B0000,#8B0000);color:#fff;font-weight:600;padding:12px 32px;border-radius:10px;border:none;cursor:pointer;font-size:0.95rem;">
                <i class="fas fa-save"></i> Guardar Cambios
            </button>
        </div>`;
    }

    window.adminEditBizHandleLogo = async function(input) {
        const file = input.files[0]; if (!file) return;
        if (file.size > 5*1024*1024) { showToast('Max 5MB para logo','error'); input.value=''; return; }
        try {
            showToast('Subiendo logo...','info');
            const fd = new FormData(); fd.append('file',file); fd.append('product_type','logo');
            const result = await api.postFormData('/upload', fd);
            if (result.url) {
                document.getElementById('aebLogoUrl').value = result.url;
                document.getElementById('aebLogoPreview').innerHTML = '<img src="'+result.url+'" alt="Logo">';
                showToast('Logo subido correctamente','success');
            }
        } catch(e) { showToast('Error al subir logo: '+e.message,'error'); }
        input.value = '';
    };

    window.adminEditBizRemoveLogo = function() {
        document.getElementById('aebLogoUrl').value = '';
        document.getElementById('aebLogoPreview').innerHTML = '<i class="fas fa-store" style="font-size:1.5rem;color:#8B0000;"></i>';
        if (editBizCurrent) editBizCurrent.logo = null;
    };

    window.adminEditBizHandleBanner = async function(input) {
        const file = input.files[0]; if (!file) return;
        if (file.size > 5*1024*1024) { showToast('Max 5MB para banner','error'); input.value=''; return; }

        // Show banner editor with rotate controls
        const previewEl = document.getElementById('aebBannerPreview');
        if (!previewEl) { input.value=''; return; }

        let bannerRotation = 0;
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgSrc = e.target.result;
            previewEl.innerHTML = `
                <div style="position:relative;width:100%;height:100%;overflow:hidden;">
                    <img id="aebBannerEditImg" src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s ease;transform:rotate(0deg);">
                    <div style="position:absolute;bottom:8px;right:8px;display:flex;gap:6px;">
                        <button type="button" onclick="document.getElementById('aebBannerEditImg').style.transform='rotate(-90deg)';" style="width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;" title="Rotar -90°">
                            <i class="fas fa-rotate-left"></i>
                        </button>
                        <button type="button" onclick="document.getElementById('aebBannerEditImg').style.transform='rotate(90deg)';" style="width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;" title="Rotar +90°">
                            <i class="fas fa-rotate-right"></i>
                        </button>
                        <button type="button" id="aebBannerCropBtn" style="padding:0 14px;height:36px;border-radius:18px;background:linear-gradient(135deg,#8B0000,#8B0000);color:#fff;border:none;cursor:pointer;font-size:0.85rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px;" title="Confirmar y subir">
                            <i class="fas fa-check"></i> Subir
                        </button>
                    </div>
                </div>
            `;
            // Track current rotation via a data attribute
            const editImg = document.getElementById('aebBannerEditImg');
            editImg.dataset.rotation = '0';
            // Override rotate buttons to track state
            editImg.parentElement.querySelectorAll('button').forEach(btn => {
                if (btn.id === 'aebBannerCropBtn') return;
                const origOnclick = btn.getAttribute('onclick');
                btn.removeAttribute('onclick');
                btn.addEventListener('click', function() {
                    const isLeft = origOnclick.includes('-90');
                    let rot = parseInt(editImg.dataset.rotation) || 0;
                    rot = isLeft ? rot - 90 : rot + 90;
                    editImg.dataset.rotation = rot;
                    editImg.style.transform = 'rotate(' + rot + 'deg)';
                });
            });
            // Crop/upload button
            document.getElementById('aebBannerCropBtn').addEventListener('click', async function() {
                const rotation = parseInt(editImg.dataset.rotation) || 0;
                const btn = this;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                try {
                    // If rotation needed, create a rotated canvas
                    let finalFile = file;
                    if (rotation !== 0) {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = imgSrc; });
                        const absRot = ((rotation % 360) + 360) % 360;
                        const swap = (absRot === 90 || absRot === 270);
                        canvas.width = swap ? img.height : img.width;
                        canvas.height = swap ? img.width : img.height;
                        ctx.save();
                        ctx.translate(canvas.width / 2, canvas.height / 2);
                        ctx.rotate(absRot * Math.PI / 180);
                        ctx.drawImage(img, -img.width / 2, -img.height / 2);
                        ctx.restore();
                        const blob = await new Promise(r => canvas.toBlob(r, file.type || 'image/jpeg', 0.92));
                        finalFile = new File([blob], file.name, { type: file.type || 'image/jpeg' });
                    }
                    showToast('Subiendo banner...','info');
                    const fd = new FormData(); fd.append('file', finalFile); fd.append('product_type','banner');
                    const result = await api.postFormData('/upload', fd);
                    if (result.url) {
                        document.getElementById('aebBannerUrl').value = result.url;
                        previewEl.innerHTML = '<img src="'+result.url+'" style="width:100%;height:100%;object-fit:cover;">';
                        showToast('Banner subido correctamente','success');
                    }
                } catch(err) { showToast('Error: '+err.message,'error'); }
                input.value = '';
            });
        };
        reader.readAsDataURL(file);
    };

    window.adminEditBizRemoveBanner = function() {
        document.getElementById('aebBannerUrl').value = '';
        document.getElementById('aebBannerPreview').innerHTML = '<span style="color:#8B0000;text-align:center;"><i class="fas fa-panorama" style="font-size:2rem;"></i><br><span style="font-size:0.78rem;">Sin banner</span></span>';
        if (editBizCurrent) editBizCurrent.banner = null;
    };

    window.adminEditBizAddImage = async function(input) {
        const file = input.files[0]; if (!file) return;
        if (!editBizCurrent) return;
        try {
            showToast('Subiendo imagen...','info');
            const fd = new FormData(); fd.append('file',file); fd.append('business_id',editBizCurrent.id); fd.append('product_type','business');
            const result = await api.postFormData('/upload', fd);
            if (result.url) {
                await api.post('/images/' + editBizCurrent.id, { url: result.url, is_cover: 0 });
                showToast('Imagen agregada','success');
                loadEditBizDetail(editBizCurrent.id);
            }
        } catch(e) { showToast('Error: '+e.message,'error'); }
        input.value = '';
    };

    window.adminEditBizRemoveImage = async function(imgId, url) {
        if (!confirm('Eliminar esta imagen?')) return;
        if (!editBizCurrent) return;
        try {
            await api.delete('/images/' + editBizCurrent.id + '?image_id=' + imgId);
            showToast('Imagen eliminada','success');
            loadEditBizDetail(editBizCurrent.id);
        } catch(e) { showToast('Error: '+e.message,'error'); }
    };

    window.adminEditBizSetCover = async function(imgId) {
        if (!editBizCurrent) return;
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch('/api/images/' + editBizCurrent.id + '/set-cover', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ image_id: imgId })
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error || 'Error al cambiar portada');
            }
            showToast('Portada actualizada','success');
            loadEditBizDetail(editBizCurrent.id);
        } catch(e) { showToast('Error: '+e.message,'error'); }
    };

    window.adminEditBizChangeStatus = async function(id, status) {
        try {
            await api.put('/businesses/' + id, { status });
            showToast('Estado actualizado','success');
            if (editBizCurrent) loadEditBizDetail(id);
            loadEditBizList();
        } catch(e) { showToast('Error: '+e.message,'error'); }
    };

    window.adminDeleteBiz = async function(id) {
        if (!confirm('ELIMINAR este negocio permanentemente? No se puede deshacer.')) return;
        try {
            await api.delete('/businesses/' + id);
            showToast('Negocio eliminado','success');
            document.getElementById('adminEditBizContainer').style.display = 'none';
            document.getElementById('adminEditBizSelect').value = '';
            editBizCurrent = null;
            loadEditBizList();
            loadDashboardTab();
        } catch(e) { showToast('Error: '+e.message,'error'); }
    };

    window.adminEditBizSave = async function(id) {
        const btn = event.target.closest('button');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        try {
            const customHtmlEl = document.getElementById('aebCustomHtml');
            const payload = {
                title: document.getElementById('aebTitle').value,
                description: document.getElementById('aebDesc').value,
                business_type: document.getElementById('aebType').value,
                phone: document.getElementById('aebPhone').value,
                whatsapp: document.getElementById('aebWhatsapp').value,
                email_contact: document.getElementById('aebEmail').value,
                website: document.getElementById('aebWebsite').value,
                instagram: document.getElementById('aebInstagram').value,
                facebook: document.getElementById('aebFacebook').value,
                tiktok: document.getElementById('aebTiktok').value,
                youtube: document.getElementById('aebYoutube').value,
                address: document.getElementById('aebAddress').value,
                city: document.getElementById('aebCity').value,
                state: document.getElementById('aebState').value,
                schedule: document.getElementById('aebSchedule').value,
                logo: document.getElementById('aebLogoUrl').value || null,
                banner: document.getElementById('aebBannerUrl').value || null,
                custom_html: customHtmlEl ? customHtmlEl.value || null : null,
                especialidad: document.getElementById('aebEspecialidad')?.value || null,
            };
            await api.put('/businesses/' + id, payload);
            showToast('Negocio actualizado exitosamente','success');
            loadEditBizList();
        } catch(e) { showToast('Error: '+e.message,'error'); }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios'; }
    };

    // ─── HTML Editor Helpers ────────────────────────────────────
    window.adminEditBizPreviewHtml = function() {
        const html = document.getElementById('aebCustomHtml')?.value;
        if (!html || !html.trim()) {
            showToast('No hay HTML personalizado para previsualizar. Escribe algo primero.','info');
            return;
        }
        const win = window.open('', '_blank', 'width=1200,height=800');
        if (win) {
            win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Vista Previa</title><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"><style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;}</style></head><body>' + html + '</body></html>');
            win.document.close();
        } else {
            showToast('Permite ventanas emergentes para ver la vista previa','error');
        }
    };

    window.adminEditBizLoadCurrentHtml = async function() {
        if (!editBizCurrent) return;
        const textarea = document.getElementById('aebCustomHtml');
        if (!textarea) return;
        // Fetch the business page as rendered
        try {
            const resp = await fetch('/negocio/' + (editBizCurrent.slug || editBizCurrent.id));
            if (!resp.ok) throw new Error('No se pudo cargar la pagina');
            const html = await resp.text();
            // Extract body content
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const body = doc.body;
            if (body) {
                // Get the main content area, excluding nav/footer
                const main = body.querySelector('.business-detail') || body.querySelector('main') || body.querySelector('.container') || body;
                textarea.value = main.innerHTML.trim();
                showToast('HTML de la pagina cargado en el editor','success');
            }
        } catch(e) {
            showToast('Error al cargar HTML: ' + e.message,'error');
        }
    };

    // ─── Admin 2 Categories Management ────────────────────────
    function _esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: CATEGORÍAS - Gestión de categorías y sugerencias
    //  Funciones: loadAdmin2Categories(), loadAdmin2CatSuggestions()
    //  Exporta: window.admin2ApproveSugg/RejectCat/DeleteCat
    // ═══════════════════════════════════════════════════════════

    async function loadAdmin2Categories() {
        const tbody = document.getElementById('admin2CatTableBody');
        if (!tbody) return;
        try {
            const data = await api.get('/categories');
            const cats = data.categories || [];
            if (!cats.length) {
                tbody.innerHTML = '<tr><td colspan="9"><div style="text-align:center;color:#8B0000;padding:16px;"><i class="fas fa-tags"></i><p>No hay categorías</p></div></td></tr>';
                return;
            }
            let html = '';
            cats.forEach(c => {
                var bannerThumb = c.banner_url
                    ? '<img src="' + _esc(c.banner_url) + '" style="width:160px;height:61px;object-fit:cover;border-radius:6px;border:1px solid #8B0000;" onerror="this.style.display=\'none\'">'
                    : '<span style="font-size:0.72rem;color:#8B0000;">Sin banner</span>';
                html += '<tr>';
                html += '<td>' + c.id + '</td>';
                html += '<td><strong>' + _esc(c.name) + '</strong></td>';
                html += '<td style="color:#8B0000;font-size:0.78rem;">' + _esc(c.slug) + '</td>';
                html += '<td><i class="' + _esc(c.icon || 'fas fa-store') + '" style="color:' + _esc(c.color || '#8B0000') + ';"></i> <span style="font-size:0.75rem;color:#8B0000;">' + _esc(c.icon || '') + '</span></td>';
                html += '<td><span style="display:inline-block;width:18px;height:18px;border-radius:4px;background:' + _esc(c.color || '#8B0000') + ';vertical-align:middle;border:1px solid #8B0000;"></span></td>';
                html += '<td><div style="display:flex;align-items:center;gap:6px;">' + bannerThumb + '<input type="file" id="catBanner_' + c.id + '" accept="image/*" style="display:none;" onchange="admin2UploadCatBanner(' + c.id + ',this)"><button onclick="document.getElementById(\'catBanner_' + c.id + '\').click()" style="background:none;border:1px solid #8B0000;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.72rem;color:#374151;" title="Subir banner"><i class="fas fa-upload"></i></button>' + (c.banner_url ? '<button onclick="admin2RemoveCatBanner(' + c.id + ')" style="background:none;border:1px solid #fca5a5;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.72rem;color:#dc2626;" title="Quitar banner"><i class="fas fa-times"></i></button>' : '') + '</div></td>';
                html += '<td>' + (c.business_count || 0) + '</td>';
                html += '<td>' + c.sort_order + '</td>';
                html += '<td><button onclick="admin2DeleteCat(' + c.id + ',\'' + _esc(c.name).replace(/'/g, "\\'") + '\')" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:0.82rem;" title="Desactivar"><i class="fas fa-trash"></i></button></td>';
                html += '</tr>';
            });
            tbody.innerHTML = html;
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="9"><div style="text-align:center;color:#f59e0b;padding:16px;"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar</p></div></td></tr>';
        }
    }

    window.admin2UploadCatBanner = async function(catId, input) {
        var file = input.files[0];
        if (!file) return;
        try {
            var fd = new FormData();
            fd.append('file', file);
            fd.append('product_type', 'category_banner');
            var data = await api.postFormData('/upload', fd);
            if (data.url) {
                await api.put('/categories/' + catId, { banner_url: data.url });
                showToast('Banner de categoría actualizado', 'success');
                loadAdmin2Categories();
            }
        } catch(e) {
            showToast('Error al subir banner: ' + e.message, 'error');
        }
        input.value = '';
    };

    window.admin2RemoveCatBanner = async function(catId) {
        if (!confirm('Quitar el banner de esta categoría?')) return;
        try {
            await api.put('/categories/' + catId, { banner_url: null });
            showToast('Banner eliminado', 'success');
            loadAdmin2Categories();
        } catch(e) {
            showToast('Error al eliminar banner', 'error');
        }
    };

    async function loadAdmin2CatSuggestions() {
        const container = document.getElementById('admin2CatSuggestionsList');
        const countBadge = document.getElementById('admin2CatSuggCount');
        const sideBadge = document.getElementById('adminCatSuggBadgeSide');
        if (!container) return;
        try {
            const data = await api.get('/category-suggestions');
            const suggestions = data.suggestions || [];
            const pending = suggestions.filter(s => s.status === 'pending');

            if (countBadge) countBadge.textContent = pending.length;
            if (sideBadge) {
                sideBadge.textContent = pending.length;
                sideBadge.style.display = pending.length > 0 ? 'inline' : 'none';
            }

            if (!suggestions.length) {
                container.innerHTML = '<div style="text-align:center;color:#8B0000;padding:16px;"><i class="fas fa-check-circle" style="font-size:1.5rem;color:#22c55e;"></i><p style="margin-top:8px;">No hay solicitudes pendientes</p></div>';
                return;
            }

            let html = '';
            suggestions.forEach(s => {
                const statusColor = s.status === 'pending' ? '#f59e0b' : (s.status === 'approved' ? '#22c55e' : '#ef4444');
                const statusLabel = s.status === 'pending' ? 'Pendiente' : (s.status === 'approved' ? 'Aprobada' : 'Rechazada');
                html += '<div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #8B0000;border-radius:10px;margin-bottom:8px;' + (s.status !== 'pending' ? 'opacity:0.6;' : '') + '">';
                html += '<div style="flex:1;min-width:0;">';
                html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
                html += '<strong>' + _esc(s.category_name) + '</strong>';
                html += '<span style="font-size:0.7rem;padding:2px 8px;border-radius:99px;background:' + statusColor + '20;color:' + statusColor + ';font-weight:600;">' + statusLabel + '</span>';
                html += '</div>';
                if (s.reason) html += '<p style="font-size:0.82rem;color:#8B0000;margin:0;">' + _esc(s.reason) + '</p>';
                html += '<p style="font-size:0.75rem;color:#8B0000;margin:4px 0 0;">' + (s.user_name ? 'Por ' + _esc(s.user_name) : 'Anónimo') + ' &middot; ' + (s.created_at || '') + '</p>';
                html += '</div>';
                if (s.status === 'pending') {
                    html += '<div style="display:flex;gap:6px;flex-shrink:0;">';
                    html += '<button onclick="admin2ApproveSugg(' + s.id + ')" class="btn btn-primary" style="background:#22c55e;border-color:#22c55e;padding:6px 12px;font-size:0.78rem;white-space:nowrap;"><i class="fas fa-check"></i> Aprobar</button>';
                    html += '<button onclick="admin2RejectSugg(' + s.id + ')" class="btn" style="background:#ef4444;border-color:#ef4444;color:#fff;padding:6px 12px;font-size:0.78rem;white-space:nowrap;"><i class="fas fa-times"></i></button>';
                    html += '</div>';
                }
                html += '</div>';
            });
            container.innerHTML = html;
        } catch(e) {
            container.innerHTML = '<div style="text-align:center;color:#8B0000;padding:16px;"><p style="font-size:0.82rem;">No se pudieron cargar las solicitudes.</p></div>';
        }
    }

    // Make approve/reject accessible globally for onclick
    var _cachedTiposNegocio = null;
    async function getTiposNegocio() {
        if (_cachedTiposNegocio) return _cachedTiposNegocio;
        try {
            const data = await api.get('/tipos-negocio');
            _cachedTiposNegocio = data.tipos || [];
            return _cachedTiposNegocio;
        } catch(e) { return []; }
    }

    window.admin2ApproveSugg = async function(id) {
        // Build approve dialog with tipo_negocio_id selector
        const tipos = await getTiposNegocio();
        let tipoOptions = '<option value="">Sin tipo (general)</option>';
        tipos.forEach(t => {
            tipoOptions += '<option value="' + t.id + '">' + _esc(t.name) + '</option>';
        });

        const dialog = document.createElement('div');
        dialog.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
        dialog.innerHTML = '<div style="background:#fff;border-radius:12px;padding:24px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'
            + '<h3 style="margin:0 0 16px;font-size:1rem;"><i class="fas fa-check-circle" style="color:#22c55e;"></i> Aprobar Categoría</h3>'
            + '<label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Tipo de Negocio (opcional)</label>'
            + '<select id="suggApproveTipoSelect" style="width:100%;padding:8px 12px;border:1px solid #8B0000;border-radius:8px;font-size:0.88rem;margin-bottom:16px;">' + tipoOptions + '</select>'
            + '<div style="display:flex;gap:8px;justify-content:flex-end;">'
            + '<button id="suggApproveCancel" class="btn" style="padding:8px 16px;">Cancelar</button>'
            + '<button id="suggApproveConfirm" class="btn btn-primary" style="background:#22c55e;border-color:#22c55e;padding:8px 16px;"><i class="fas fa-check"></i> Aprobar</button>'
            + '</div></div>';
        document.body.appendChild(dialog);

        return new Promise((resolve) => {
            dialog.querySelector('#suggApproveCancel').onclick = () => { document.body.removeChild(dialog); resolve(); };
            dialog.querySelector('#suggApproveConfirm').onclick = async () => {
                const tipoId = document.getElementById('suggApproveTipoSelect').value || null;
                document.body.removeChild(dialog);
                try {
                    await api.put('/category-suggestions/' + id, { action: 'approve', tipo_negocio_id: tipoId });
                    showToast('Categoría creada exitosamente', 'success');
                    _cachedTiposNegocio = null; // invalidate cache
                    loadAdmin2Categories();
                    loadAdmin2CatSuggestions();
                } catch(e) { showToast('Error: ' + (e.message || ''), 'error'); }
            };
        });
    };
    window.admin2RejectSugg = async function(id) {
        if (!confirm('Rechazar esta solicitud?')) return;
        try {
            await api.put('/category-suggestions/' + id, { action: 'reject' });
            showToast('Sugerencia rechazada', 'success');
            loadAdmin2CatSuggestions();
        } catch(e) { showToast('Error: ' + (e.message || ''), 'error'); }
    };
    window.admin2DeleteCat = async function(id, name) {
        if (!confirm('Desactivar "' + name + '"?')) return;
        try {
            await api.delete('/categories/' + id);
            showToast('Categoría desactivada', 'success');
            loadAdmin2Categories();
        } catch(e) { showToast('Error: ' + (e.message || ''), 'error'); }
    };

    // Setup create category button
    document.addEventListener('DOMContentLoaded', function() {
        const btnCreate = document.getElementById('admin2BtnCreateCat');
        const colorInput = document.getElementById('admin2NewCatColor');
        const colorLabel = document.getElementById('admin2NewCatColorLabel');

        if (colorInput && colorLabel) {
            colorInput.addEventListener('input', function() { colorLabel.textContent = this.value; });
        }

        if (btnCreate) {
            btnCreate.addEventListener('click', async function() {
                const nameInput = document.getElementById('admin2NewCatName');
                const iconInput = document.getElementById('admin2NewCatIcon');
                const colorVal = document.getElementById('admin2NewCatColor');
                const errorDiv = document.getElementById('admin2NewCatError');
                const name = nameInput ? nameInput.value.trim() : '';
                if (!name) {
                    if (errorDiv) { errorDiv.textContent = 'El nombre es requerido.'; errorDiv.style.display = 'block'; }
                    return;
                }
                btnCreate.disabled = true;
                btnCreate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
                if (errorDiv) errorDiv.style.display = 'none';
                try {
                    await api.post('/categories', {
                        name: name,
                        icon: iconInput ? iconInput.value.trim() : 'fas fa-store',
                        color: colorVal ? colorVal.value : '#8B0000'
                    });
                    showToast('Categoría "' + name + '" creada', 'success');
                    if (nameInput) nameInput.value = '';
                    loadAdmin2Categories();
                } catch(e) {
                    const msg = e.message || 'Error al crear';
                    if (errorDiv) { errorDiv.textContent = msg; errorDiv.style.display = 'block'; }
                    showToast(msg, 'error');
                } finally {
                    btnCreate.disabled = false;
                    btnCreate.innerHTML = '<i class="fas fa-plus"></i> Crear';
                }
            });
        }
    });

    // ─── POPUP (VENTANA EMERGENTE) TAB ──────────────────────────
    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: VENTANA EMERGENTE (POPUP) - Banner popup del sitio
    //  Funciones: loadPopupTab(), loadPopupLinkSelectors(), savePopupSettings()
    //  Exporta: window.savePopupSettings, window.handleAdminPopupImageSelect, window.removeAdminPopupImage
    // ═══════════════════════════════════════════════════════════

    async function loadPopupTab() {
        try {
            // Load settings
            const data = await api.get('/settings');
            const s = data.settings || {};
            // Toggle
            const toggleEl = document.getElementById('setting_popup_enabled');
            if (toggleEl) toggleEl.checked = s.popup_enabled === '1';
            // Image URL
            const hiddenUrl = document.getElementById('setting_popup_image_url');
            if (hiddenUrl) hiddenUrl.value = s.popup_image_url || '';
            // Image preview
            const imgEl = document.getElementById('adminPopupImg');
            const iconEl = document.getElementById('adminPopupPlaceholderIcon');
            const removeBtn = document.getElementById('adminPopupRemoveBtn');
            if (s.popup_image_url) {
                if (imgEl) { imgEl.src = s.popup_image_url; imgEl.style.display = 'block'; }
                if (iconEl) iconEl.style.display = 'none';
                if (removeBtn) removeBtn.style.display = '';
            } else {
                if (imgEl) { imgEl.style.display = 'none'; imgEl.src = ''; }
                if (iconEl) iconEl.style.display = '';
                if (removeBtn) removeBtn.style.display = 'none';
            }
            // Link type
            const linkTypeEl = document.getElementById('popupLinkType');
            if (linkTypeEl) linkTypeEl.value = s.popup_link_type || '';
            // CTA text
            const ctaTextEl = document.getElementById('popupCtaText');
            if (ctaTextEl) ctaTextEl.value = s.popup_cta_text || 'Ver mas';
            // Hidden fields
            const hiddenLinkUrl = document.getElementById('setting_popup_link_url');
            if (hiddenLinkUrl) hiddenLinkUrl.value = s.popup_link_url || '';
            const hiddenLinkType = document.getElementById('setting_popup_link_type');
            if (hiddenLinkType) hiddenLinkType.value = s.popup_link_type || '';
            const hiddenCtaText = document.getElementById('setting_popup_cta_text');
            if (hiddenCtaText) hiddenCtaText.value = s.popup_cta_text || '';
            // Show/hide the correct selector based on type
            togglePopupSelector(s.popup_link_type || '');
            // Load all dropdowns in parallel
            await loadPopupLinkSelectors(s);
        } catch (e) {
            showToast('Error al cargar configuracion de popup', 'error');
        }
    }

    // Show/hide the correct dropdown based on link type
    function togglePopupSelector(type) {
        document.querySelectorAll('.popup-link-selector').forEach(el => el.style.display = 'none');
        const map = { business: 'popupSelectorBusiness', property: 'popupSelectorProperty', product: 'popupSelectorProduct', job: 'popupSelectorJob', custom: 'popupSelectorCustom' };
        const target = map[type];
        if (target) {
            const el = document.getElementById(target);
            if (el) el.style.display = 'block';
        }
    }

    // Load all 4 dropdowns (business, property, product, job)
    async function loadPopupLinkSelectors(s) {
        const token = localStorage.getItem('meridaunclick_token') || localStorage.getItem('authToken') || '';
        const headers = { 'Authorization': 'Bearer ' + token };
        const currentLink = s.popup_link_url || '';
        const currentType = s.popup_link_type || '';

        // Load businesses
        try {
            const resp = await fetch('/api/businesses?status=approved&limit=500', { headers });
            if (resp.ok) {
                const data = await resp.json();
                const items = Array.isArray(data.businesses) ? data.businesses : (Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []));
                const select = document.getElementById('popupBusinessSelect');
                if (select) {
                    select.innerHTML = '<option value="">-- Sin negocio vinculado --</option>';
                    items.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.slug || b.id;
                        opt.textContent = b.title || ('Negocio #' + b.id);
                        // Pre-select if matches current link
                        if (currentType === 'business' && currentLink) {
                            const bizUrl = '/' + (b.business_type ? slugifySimple(b.business_type) : 'negocio') + '/' + (b.category_slug || 'otro') + '/' + (b.slug || b.id);
                            if (currentLink === bizUrl || currentLink === '/negocio/' + b.slug) {
                                opt.selected = true;
                            }
                        }
                        select.appendChild(opt);
                    });
                }
            }
        } catch (e) { console.error('Error loading businesses for popup:', e); }

        // Load properties
        try {
            const resp = await fetch('/api/properties?limit=500', { headers });
            if (resp.ok) {
                const data = await resp.json();
                const items = Array.isArray(data.properties) ? data.properties : (Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []));
                const select = document.getElementById('popupPropertySelect');
                if (select) {
                    select.innerHTML = '<option value="">-- Sin propiedad vinculada --</option>';
                    items.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.slug || p.id;
                        opt.textContent = (p.title || p.property_type || ('Propiedad #' + p.id)) + (p.city ? ' - ' + p.city : '');
                        if (currentType === 'property' && currentLink && (currentLink.endsWith('/' + (p.slug || p.id)) || currentLink.includes('/properties/' + (p.id || '')))) {
                            opt.selected = true;
                        }
                        select.appendChild(opt);
                    });
                }
            }
        } catch (e) { console.error('Error loading properties for popup:', e); }

        // Load products
        try {
            const resp = await fetch('/api/marketplace?limit=500', { headers });
            if (resp.ok) {
                const data = await resp.json();
                const items = Array.isArray(data.products) ? data.products : (Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []));
                const select = document.getElementById('popupProductSelect');
                if (select) {
                    select.innerHTML = '<option value="">-- Sin producto vinculado --</option>';
                    items.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.slug || p.id;
                        opt.textContent = (p.title || p.name || ('Producto #' + p.id)) + (p.price ? ' - $' + p.price : '');
                        if (currentType === 'product' && currentLink && currentLink.endsWith('/' + (p.slug || p.id))) {
                            opt.selected = true;
                        }
                        select.appendChild(opt);
                    });
                }
            }
        } catch (e) { console.error('Error loading products for popup:', e); }

        // Load jobs
        try {
            const resp = await fetch('/api/jobs?limit=500', { headers });
            if (resp.ok) {
                const data = await resp.json();
                const items = Array.isArray(data.jobs) ? data.jobs : (Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []));
                const select = document.getElementById('popupJobSelect');
                if (select) {
                    select.innerHTML = '<option value="">-- Sin empleo vinculado --</option>';
                    items.forEach(j => {
                        const opt = document.createElement('option');
                        opt.value = j.slug || j.id;
                        opt.textContent = (j.title || ('Empleo #' + j.id)) + (j.company ? ' - ' + j.company : '');
                        if (currentType === 'job' && currentLink && currentLink.endsWith('/' + (j.slug || j.id))) {
                            opt.selected = true;
                        }
                        select.appendChild(opt);
                    });
                }
            }
        } catch (e) { console.error('Error loading jobs for popup:', e); }

        // Custom URL
        const customUrlEl = document.getElementById('popupCustomUrl');
        if (customUrlEl && currentType === 'custom') {
            customUrlEl.value = currentLink;
        }
    }

    // Helper: slugify
    function slugifySimple(text) {
        if (!text) return '';
        return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Listen for link type changes to show/hide selectors
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'popupLinkType') {
            togglePopupSelector(e.target.value);
            // Clear hidden link when switching type
            const hiddenUrl = document.getElementById('setting_popup_link_url');
            const hiddenType = document.getElementById('setting_popup_link_type');
            if (hiddenType) hiddenType.value = e.target.value;
            updatePopupLinkFromSelection(e.target.value);
        }
        // Individual dropdown changes
        if (e.target && e.target.id === 'popupBusinessSelect') updatePopupLinkFromSelection('business');
        if (e.target && e.target.id === 'popupPropertySelect') updatePopupLinkFromSelection('property');
        if (e.target && e.target.id === 'popupProductSelect') updatePopupLinkFromSelection('product');
        if (e.target && e.target.id === 'popupJobSelect') updatePopupLinkFromSelection('job');
        if (e.target && e.target.id === 'popupCustomUrl') updatePopupLinkFromSelection('custom');
    });

    // Update hidden link URL based on current type and selection
    function updatePopupLinkFromSelection(type) {
        const hiddenUrl = document.getElementById('setting_popup_link_url');
        const hiddenType = document.getElementById('setting_popup_link_type');
        const info = document.getElementById('popupLinkSelectedInfo');
        const infoText = document.getElementById('popupLinkSelectedText');
        if (hiddenType) hiddenType.value = type;

        let linkUrl = '';
        let infoMsg = '';

        if (type === 'business') {
            const sel = document.getElementById('popupBusinessSelect');
            if (sel && sel.value) {
                linkUrl = '/negocio/' + sel.value;
                infoMsg = 'Negocio vinculado: ' + sel.options[sel.selectedIndex].textContent;
            }
        } else if (type === 'property') {
            const sel = document.getElementById('popupPropertySelect');
            if (sel && sel.value) {
                linkUrl = '/properties/' + sel.value;
                infoMsg = 'Propiedad vinculada: ' + sel.options[sel.selectedIndex].textContent;
            }
        } else if (type === 'product') {
            const sel = document.getElementById('popupProductSelect');
            if (sel && sel.value) {
                linkUrl = '/producto/general/' + sel.value;
                infoMsg = 'Producto vinculado: ' + sel.options[sel.selectedIndex].textContent;
            }
        } else if (type === 'job') {
            const sel = document.getElementById('popupJobSelect');
            if (sel && sel.value) {
                linkUrl = '/empleo/' + sel.value;
                infoMsg = 'Empleo vinculado: ' + sel.options[sel.selectedIndex].textContent;
            }
        } else if (type === 'custom') {
            const input = document.getElementById('popupCustomUrl');
            if (input && input.value.trim()) {
                linkUrl = input.value.trim();
                infoMsg = 'URL personalizada: ' + linkUrl;
            }
        }

        if (hiddenUrl) hiddenUrl.value = linkUrl;
        if (info && infoText) {
            if (linkUrl) {
                infoText.textContent = infoMsg;
                info.style.display = 'block';
            } else {
                info.style.display = 'none';
            }
        }
    }

    // Save popup settings (called from onclick in HTML)
    window.savePopupSettings = async function() {
        const btn = event.target.closest('button');
        const origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        try {
            const updates = {};
            const toggleEl = document.getElementById('setting_popup_enabled');
            if (toggleEl) updates.popup_enabled = toggleEl.checked ? '1' : '0';
            const imgUrl = document.getElementById('setting_popup_image_url');
            if (imgUrl) updates.popup_image_url = imgUrl.value;
            const hiddenUrl = document.getElementById('setting_popup_link_url');
            if (hiddenUrl) updates.popup_link_url = hiddenUrl.value;
            const hiddenType = document.getElementById('setting_popup_link_type');
            if (hiddenType) updates.popup_link_type = hiddenType.value;
            const ctaTextEl = document.getElementById('popupCtaText');
            if (ctaTextEl) updates.popup_cta_text = ctaTextEl.value.trim() || 'Ver mas';
            await api.put('/settings', updates);
            showToast('Configuracion de Ventana Emergente guardada', 'success');
        } catch (e) {
            showToast(e.message || 'Error al guardar', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    };

    // Handle popup image file selection and upload to R2
    window.handleAdminPopupImageSelect = async function(input) {
        const file = input.files && input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('La imagen no debe superar 5MB', 'error'); return; }
        try {
            showToast('Subiendo imagen...', 'info');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('product_type', 'popup');
            const token = localStorage.getItem('meridaunclick_token') || localStorage.getItem('authToken') || '';
            const resp = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });
            const data = await resp.json();
            if (data.url) {
                const hiddenUrl = document.getElementById('setting_popup_image_url');
                if (hiddenUrl) hiddenUrl.value = data.url;
                const imgEl = document.getElementById('adminPopupImg');
                const iconEl = document.getElementById('adminPopupPlaceholderIcon');
                const removeBtn = document.getElementById('adminPopupRemoveBtn');
                if (imgEl) { imgEl.src = data.url; imgEl.style.display = 'block'; }
                if (iconEl) iconEl.style.display = 'none';
                if (removeBtn) removeBtn.style.display = '';
                showToast('Imagen subida. Recuerda guardar cambios.', 'success');
            } else {
                showToast(data.error || 'Error al subir imagen', 'error');
                console.error('Upload error response:', data);
            }
        } catch (e) {
            showToast('Error al subir imagen: ' + e.message, 'error');
            console.error('Upload exception:', e);
        }
        input.value = '';
    };

    // Remove popup image
    window.removeAdminPopupImage = function() {
        const hiddenUrl = document.getElementById('setting_popup_image_url');
        if (hiddenUrl) hiddenUrl.value = '';
        const imgEl = document.getElementById('adminPopupImg');
        const iconEl = document.getElementById('adminPopupPlaceholderIcon');
        const removeBtn = document.getElementById('adminPopupRemoveBtn');
        if (imgEl) { imgEl.style.display = 'none'; imgEl.src = ''; }
        if (iconEl) iconEl.style.display = '';
        if (removeBtn) removeBtn.style.display = 'none';
        showToast('Imagen quitada. Recuerda guardar cambios.', 'success');
    };

    // ─── BAZAR TAB ─────────────────────────────────────────────
    async function loadBazarTab() {
        const tbody = document.getElementById('bazarTableBody');
        const filter = document.getElementById('bazarFilter');
        if (!tbody) return;

        const filterVal = filter ? filter.value : '';
        const url = `/bazar${filterVal ? '?response=' + filterVal : ''}`;
        try {
            const data = await api.get(url);
            const responses = data.responses || [];

            // Stats
            const allData = filterVal ? await api.get('/bazar') : data;
            const all = allData.responses || responses;
            let siCount = 0, noCount = 0;
            if (Array.isArray(all)) {
                all.forEach(r => { if (r.response === 'si') siCount++; else noCount++; });
            }
            const statsSi = document.getElementById('bazarStatsSi');
            const statsNo = document.getElementById('bazarStatsNo');
            if (statsSi) statsSi.textContent = `Si: ${siCount}`;
            if (statsNo) statsNo.textContent = `No: ${noCount}`;

            if (responses.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#8B0000;">Sin respuestas aun.</td></tr>';
                return;
            }

            tbody.innerHTML = responses.map(r => `
                <tr>
                    <td>${(r.created_at || '').split('T')[0]}</td>
                    <td>${r.user_name || 'Usuario #' + r.user_id}</td>
                    <td>${r.user_email || '-'}</td>
                    <td>${r.business_title || '-'}</td>
                    <td><span style="padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;background:${r.response === 'si' ? '#d1fae5;color:#059669' : '#fee2e2;color:#dc2626'};">${r.response === 'si' ? 'Si' : 'No'}</span></td>
                    <td>${r.source === 'dashboard' ? 'Dashboard' : 'Perfil'}</td>
                </tr>
            `).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#dc2626;">Error al cargar</td></tr>';
        }
    }

    // Bazar filter change
    document.getElementById('bazarFilter')?.addEventListener('change', () => loadBazarTab());

    // ─── CAROUSEL TAB ──────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: CARRUSEL DE VIDEOS - Videos destacados del homepage
    //  Funciones: loadCarouselTab(), loadCarouselBusinessSelector()
    //  Exporta: window.toggleCarouselVideo, window.deleteCarouselVideo
    // ═══════════════════════════════════════════════════════════

    async function loadCarouselTab() {
        const list = document.getElementById('carouselVideoList');
        if (!list) return;
        try {
            const data = await api.get('/video-carousel?admin=true');
            const videos = data.videos || [];
            if (videos.length === 0) {
                list.innerHTML = '<p style="text-align:center;padding:40px;color:#8B0000;">No hay videos en el carrusel.</p>';
                return;
            }
            list.innerHTML = videos.map(v => `
                <div style="display:flex;align-items:center;gap:16px;padding:12px;border:1px solid #8B0000;border-radius:10px;margin-bottom:8px;background:#fff;">
                    <div style="width:120px;height:68px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#8B0000;">
                        ${v.thumbnail_url
                            ? `<img src="${v.thumbnail_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;\\' ><i class=\\'fas fa-video\\' style=\\'font-size:1.2rem;color:#8B0000;\\'></i></div>'">`
                            : `<div style="display:flex;align-items:center;justify-content:center;height:100%;"><i class="fas fa-play-circle" style="font-size:1.5rem;color:#8B0000;"></i></div>`
                        }
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${v.title || 'Sin titulo'}</div>
                        <div style="font-size:0.75rem;color:#8B0000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${v.url}</div>
                        <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
                            <span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:${v.is_active ? '#d1fae5;color:#059669' : '#8B0000;color:#8B0000'};">${v.is_active ? 'Activo' : 'Inactivo'}</span>
                            <span style="font-size:0.7rem;color:#8B0000;">Orden: ${v.order_index}</span>
                            ${v.business_title ? `<span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:#8B0000;color:#8B0000;"><i class="fas fa-store" style="margin-right:3px;"></i>${v.business_title}</span>` : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-shrink:0;">
                        <button class="btn btn-sm" style="background:${v.is_active ? '#fef3c7;color:#d97706' : '#d1fae5;color:#059669'};border:none;border-radius:6px;padding:6px 10px;font-size:0.75rem;cursor:pointer;" onclick="toggleCarouselVideo(${v.id}, ${v.is_active})">${v.is_active ? 'Desactivar' : 'Activar'}</button>
                        <button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:6px 10px;font-size:0.75rem;cursor:pointer;" onclick="deleteCarouselVideo(${v.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = '<p style="text-align:center;padding:40px;color:#dc2626;">Error al cargar videos</p>';
        }
    }

    // Toggle video active state (via settings-style inline SQL is not possible, so use a simple approach)
    window.toggleCarouselVideo = async function(id, currentState) {
        try {
            // We update via a small trick: update in DB directly using the bazar endpoint pattern
            // Actually, let's use the settings API to toggle — but we need a proper endpoint.
            // For simplicity, we'll toggle by deleting and re-adding, or better: we add a PUT handler.
            // For now, use the raw SQL approach via a quick fetch:
            const token = localStorage.getItem('meridaunclick_token') || localStorage.getItem('authToken');
            await fetch(`/api/video-carousel?id=${id}&toggle=1`, {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: currentState ? 0 : 1 }),
            });
            loadCarouselTab();
        } catch (e) {
            showToast('Error al cambiar estado', 'error');
        }
    };

    window.deleteCarouselVideo = async function(id) {
        if (!confirm('Eliminar este video del carrusel?')) return;
        try {
            await api.delete('/video-carousel?id=' + id);
            loadCarouselTab();
            showToast('Video eliminado', 'success');
        } catch (e) {
            showToast('Error al eliminar', 'error');
        }
    };

    // Carousel Modal Setup
    (function() {
        const modal = document.getElementById('carouselVideoModal');
        if (!modal) return;
        const close = document.getElementById('carouselVideoClose');
        const cancel = document.getElementById('carouselVideoCancel');
        const save = document.getElementById('carouselVideoSave');
        const addBtn = document.getElementById('addVideoBtn');
        const businessSelect = document.getElementById('carouselVideoBusiness');
        const fileInput = document.getElementById('carouselVideoFile');
        const cameraInput = document.getElementById('carouselVideoCamera');

        if (close) close.addEventListener('click', () => modal.classList.add('hidden'));
        if (cancel) cancel.addEventListener('click', () => modal.classList.add('hidden'));
        modal.querySelector('.modal-overlay')?.addEventListener('click', () => modal.classList.add('hidden'));

        // Cache for uploaded video file
        let pendingVideoFile = null;

        // Handle file selection (upload or camera)
        function handleVideoFileSelected(input) {
            const file = input.files && input.files[0];
            if (!file) return;
            const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
            if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov)$/i)) {
                const errEl = document.getElementById('carouselVideoFileError');
                if (errEl) { errEl.textContent = 'Formato no soportado. Usa MP4, WebM o MOV.'; errEl.style.display = ''; }
                input.value = '';
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                const errEl = document.getElementById('carouselVideoFileError');
                if (errEl) { errEl.textContent = 'El video no debe superar 50MB.'; errEl.style.display = ''; }
                input.value = '';
                return;
            }
            pendingVideoFile = file;
            const nameEl = document.getElementById('carouselVideoFileName');
            const errEl = document.getElementById('carouselVideoFileError');
            if (nameEl) { nameEl.innerHTML = '<i class="fas fa-check-circle"></i> ' + file.name; nameEl.style.display = ''; }
            if (errEl) errEl.style.display = 'none';
            // Clear URL field since we have a file
            document.getElementById('carouselVideoUrl').value = '';
        }

        if (fileInput) fileInput.addEventListener('change', () => handleVideoFileSelected(fileInput));
        if (cameraInput) cameraInput.addEventListener('change', () => handleVideoFileSelected(cameraInput));

        // Load businesses into selector
        async function loadCarouselBusinessSelector() {
            if (!businessSelect) return;
            try {
                const data = await api.get('/businesses?status=approved&limit=500');
                const businesses = data.businesses || data.results || data || [];
                // Keep first empty option
                const firstOpt = businessSelect.querySelector('option');
                businessSelect.innerHTML = '';
                if (firstOpt) businessSelect.appendChild(firstOpt);
                businesses.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.id;
                    opt.textContent = b.title || 'Negocio #' + b.id;
                    businessSelect.appendChild(opt);
                });
            } catch (e) {
                console.warn('Error loading businesses for carousel selector:', e);
            }
        }

        if (addBtn) addBtn.addEventListener('click', () => {
            document.getElementById('carouselVideoUrl').value = '';
            document.getElementById('carouselVideoTitle').value = '';
            document.getElementById('carouselVideoThumb').value = '';
            document.getElementById('carouselVideoOrder').value = '0';
            const nameEl = document.getElementById('carouselVideoFileName');
            const errEl = document.getElementById('carouselVideoFileError');
            if (nameEl) nameEl.style.display = 'none';
            if (errEl) errEl.style.display = 'none';
            if (fileInput) fileInput.value = '';
            if (cameraInput) cameraInput.value = '';
            pendingVideoFile = null;
            loadCarouselBusinessSelector();
            modal.classList.remove('hidden');
        });

        if (save) save.addEventListener('click', async () => {
            let url = document.getElementById('carouselVideoUrl').value.trim();
            const title = document.getElementById('carouselVideoTitle').value.trim();
            const thumb = document.getElementById('carouselVideoThumb').value.trim();
            const order = parseInt(document.getElementById('carouselVideoOrder').value) || 0;
            const businessId = businessSelect ? businessSelect.value : '';
            const errEl = document.getElementById('carouselVideoFileError');

            // If no URL and no file, show error
            if (!url && !pendingVideoFile) {
                if (errEl) { errEl.textContent = 'Agrega una URL o adjunta un video.'; errEl.style.display = ''; }
                return;
            }
            if (errEl) errEl.style.display = 'none';

            save.disabled = true;
            save.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            try {
                // If file selected, upload it first
                if (pendingVideoFile) {
                    showToast('Subiendo video...', 'info');
                    const formData = new FormData();
                    formData.append('file', pendingVideoFile);
                    formData.append('product_type', 'video');
                    formData.append('folder', 'merida/carousel');
                    const uploadResp = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('meridaunclick_token') || localStorage.getItem('authToken')) },
                        body: formData
                    });
                    const uploadData = await uploadResp.json();
                    if (uploadData.url) {
                        url = uploadData.url;
                    } else {
                        showToast(uploadData.error || 'Error al subir video', 'error');
                        save.disabled = false;
                        save.innerHTML = '<i class="fas fa-save"></i> Guardar';
                        return;
                    }
                }

                if (!url) { showToast('No se pudo obtener la URL del video', 'error'); return; }

                await api.post('/video-carousel', {
                    url,
                    title,
                    thumbnail_url: thumb,
                    order_index: order,
                    business_id: businessId || null,
                });
                modal.classList.add('hidden');
                loadCarouselTab();
                showToast('Video agregado al carrusel', 'success');
            } catch (e) {
                showToast(e.message || 'Error al guardar', 'error');
            } finally {
                save.disabled = false;
                save.innerHTML = '<i class="fas fa-save"></i> Guardar';
                pendingVideoFile = null;
            }
        });
    })();

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS ADMIN TAB
    // ═══════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: NOTIFICACIONES - Centro de notificaciones admin
    //  Componer, enviar, ver historial, eliminar notificaciones
    //  Funciones: setupAdminNotifications(), loadAdminNotifications(),
    //            openNotifDetail(), deleteAdminNotification()
    //  Exporta: window.openNotifDetail, window.deleteAdminNotification,
    //            window.loadAdminNotifications
    // ═══════════════════════════════════════════════════════════

    (function setupAdminNotifications() {
        const composeBtn = document.getElementById('adminNotifComposeBtn');
        const composeSection = document.getElementById('adminNotifComposeSection');
        const cancelBtn = document.getElementById('notifCancelBtn');
        const sendBtn = document.getElementById('notifSendBtn');
        const deleteAllBtn = document.getElementById('adminNotifDeleteAllBtn');
        const tableBody = document.getElementById('adminNotifTableBody');
        const paginationEl = document.getElementById('adminNotifPagination');
        const sendStatus = document.getElementById('notifSendStatus');
        const userSearch = document.getElementById('notifUserSearch');
        const userResults = document.getElementById('notifUserResults');
        const selectedUserId = document.getElementById('notifSelectedUserId');
        const targetRadios = document.querySelectorAll('input[name="notifTarget"]');

        if (!composeBtn || !tableBody) return;

        // Toggle compose section
        composeBtn.addEventListener('click', () => {
            composeSection.style.display = composeSection.style.display === 'none' ? 'block' : 'none';
        });
        cancelBtn.addEventListener('click', () => {
            composeSection.style.display = 'none';
        });

        // Show/hide user search based on target
        targetRadios.forEach(r => {
            r.addEventListener('change', () => {
                const specificWrap = document.getElementById('notifSpecificUserWrap');
                specificWrap.style.display = r.value === 'specific' && r.checked ? 'block' : 'none';
                if (r.value !== 'specific') {
                    selectedUserId.value = '';
                    userResults.style.display = 'none';
                }
            });
        });

        // User search for specific target
        let searchTimeout = null;
        userSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const q = userSearch.value.trim();
            if (q.length < 2) { userResults.style.display = 'none'; return; }
            searchTimeout = setTimeout(async () => {
                try {
                    const users = await api.get('/users?search=' + encodeURIComponent(q) + '&limit=10');
                    const list = users.users || users || [];
                    if (list.length === 0) {
                        userResults.innerHTML = '<div style="padding:12px;text-align:center;color:#8B0000;font-size:0.82rem;">No se encontraron usuarios</div>';
                    } else {
                        userResults.innerHTML = list.slice(0, 10).map(u => `
                            <div class="notif-user-item" data-uid="${u.id}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;transition:background .15s;border-bottom:1px solid #8B0000;">
                                <div style="width:32px;height:32px;border-radius:50%;background:#8B0000;display:flex;align-items:center;justify-content:center;color:#8B0000;font-weight:700;font-size:0.75rem;">${(u.name || 'U').substring(0,1).toUpperCase()}</div>
                                <div><div style="font-size:0.82rem;font-weight:600;color:#1e293b;">${escapeHtml(u.name || 'Sin nombre')}</div><div style="font-size:0.72rem;color:#8B0000;">${escapeHtml(u.email || '')}</div></div>
                            </div>
                        `).join('');
                        userResults.querySelectorAll('.notif-user-item').forEach(item => {
                            item.addEventListener('click', () => {
                                selectedUserId.value = item.dataset.uid;
                                userSearch.value = item.querySelector('div[style*="font-weight:600"]').textContent;
                                userResults.style.display = 'none';
                            });
                            item.addEventListener('mouseenter', () => item.style.background = '#8B0000');
                            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
                        });
                    }
                    userResults.style.display = 'block';
                } catch(e) {
                    userResults.style.display = 'none';
                }
            }, 300);
        });

        // Send notification
        sendBtn.addEventListener('click', async () => {
            const title = document.getElementById('notifTitleInput').value.trim();
            const message = document.getElementById('notifMessageInput').value.trim();
            const link = document.getElementById('notifLinkInput').value.trim();
            const type = document.getElementById('notifTypeSelect').value;
            const target = document.querySelector('input[name="notifTarget"]:checked').value;

            if (!title) { showToast('El título es obligatorio', 'error'); return; }

            let targetUserIds;
            if (target === 'all') {
                targetUserIds = 'all';
            } else if (target === 'admins') {
                try {
                    const users = await api.get('/users?role=admin');
                    targetUserIds = (users.users || users || []).map(u => u.id);
                } catch(e) {
                    showToast('Error al obtener admins', 'error');
                    return;
                }
            } else {
                const uid = parseInt(selectedUserId.value);
                if (!uid) { showToast('Selecciona un usuario', 'error'); return; }
                targetUserIds = [uid];
            }

            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            try {
                const result = await api.post('/notifications', {
                    target_user_ids: targetUserIds,
                    type, title, message, link
                });
                showToast(`Notificación enviada a ${result.inserted} usuario(s)`, 'success');
                // Reset form
                document.getElementById('notifTitleInput').value = '';
                document.getElementById('notifMessageInput').value = '';
                document.getElementById('notifLinkInput').value = '';
                selectedUserId.value = '';
                userSearch.value = '';
                composeSection.style.display = 'none';
                loadAdminNotifications();
            } catch(e) {
                showToast(e.message || 'Error al enviar', 'error');
            } finally {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar';
            }
        });

        // Delete all notifications
        deleteAllBtn.addEventListener('click', async () => {
            if (!confirm('¿Eliminar TODAS las notificaciones del sistema? Esta acción no se puede deshacer.')) return;
            try {
                await api.delete('/notifications?all=1');
                showToast('Todas las notificaciones eliminadas', 'success');
                loadAdminNotifications();
            } catch(e) {
                showToast('Error al eliminar', 'error');
            }
        });

        // Open notification detail modal
        window.openNotifDetail = function(idx) {
            const n = window._adminNotifList && window._adminNotifList[idx];
            if (!n) return;
            const userMap = window._adminNotifUserMap || {};
            const typeLabel = { new_business: 'Negocio', new_job: 'Empleo', new_property: 'Inmueble', new_product: 'Producto', review: 'Reseña', premium_request: 'Premium', announcement: 'Anuncio', alert: 'Alerta', custom: 'Personalizado', system: 'Sistema', premium: 'Premium' }[n.type] || n.type;
            const typeColor = { new_business: '#059669', new_job: '#8B0000', new_property: '#8B0000', new_product: '#f59e0b', review: '#f59e0b', premium_request: '#8B0000', announcement: '#8B0000', alert: '#ef4444', custom: '#8B0000', system: '#8B0000', premium: '#8B0000' }[n.type] || '#8B0000';

            // Type badge
            const typeBadge = document.getElementById('notifDetailTypeBadge');
            typeBadge.textContent = typeLabel;
            typeBadge.style.background = typeColor + '15';
            typeBadge.style.color = typeColor;

            // Read badge
            const readBadge = document.getElementById('notifDetailReadBadge');
            if (n.is_read) {
                readBadge.textContent = 'Leída';
                readBadge.style.background = '#8B0000';
                readBadge.style.color = '#8B0000';
            } else {
                readBadge.textContent = 'No leída';
                readBadge.style.background = '#8B000015';
                readBadge.style.color = '#8B0000';
            }

            // Content
            document.getElementById('notifDetailTitle').textContent = n.title || 'Sin título';
            document.getElementById('notifDetailMessage').textContent = n.message || 'Sin mensaje';
            document.getElementById('notifDetailUser').textContent = userMap[n.user_id] || 'Usuario ' + n.user_id;
            document.getElementById('notifDetailDate').textContent = n.created_at ? new Date(n.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

            // Link
            const linkWrap = document.getElementById('notifDetailLinkWrap');
            const goBtn = document.getElementById('notifDetailGoBtn');
            const linkEl = document.getElementById('notifDetailLink');
            const linkText = document.getElementById('notifDetailLinkText');
            if (n.link) {
                linkWrap.style.display = 'block';
                goBtn.style.display = 'inline-flex';
                linkEl.href = n.link;
                linkText.textContent = n.link;
                goBtn.onclick = function() {
                    if (n.link.startsWith('http')) { window.open(n.link, '_blank'); }
                    else { window.location.href = n.link; }
                };
            } else {
                linkWrap.style.display = 'none';
                goBtn.style.display = 'none';
            }

            // Delete button
            const delBtn = document.getElementById('notifDetailDeleteBtn');
            delBtn.onclick = function() {
                document.getElementById('notifDetailModal').classList.add('hidden');
                deleteAdminNotification(n.id);
            };

            // Show modal
            document.getElementById('notifDetailModal').classList.remove('hidden');
        };

        // Delete single notification
        window.deleteAdminNotification = async function(id) {
            if (!confirm('¿Eliminar esta notificación?')) return;
            try {
                await api.delete('/notifications?id=' + id);
                showToast('Notificación eliminada', 'success');
                loadAdminNotifications();
            } catch(e) {
                showToast('Error al eliminar', 'error');
            }
        };

        // Expose load function
        window.loadAdminNotifications = async function() {
            try {
                // Fetch admin notifications (we need a way to see ALL notifications)
                // Use the admin's own notifications as a proxy, plus we can query all
                const data = await api.get('/notifications?page=' + notifPage + '&limit=' + PAGE_LIMIT + '&all=1');
                const notifs = data.notifications || [];
                const total = data.total || 0;

                if (notifs.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#8B0000;"><i class="fas fa-bell-slash" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>No hay notificaciones</td></tr>';
                    paginationEl.innerHTML = '';
                    return;
                }

                // Get all users to map user_id → name
                let userMap = {};
                try {
                    const allUsers = await api.get('/users?limit=1000');
                    (allUsers.users || allUsers || []).forEach(u => { userMap[u.id] = u.name || u.email || 'ID:' + u.id; });
                } catch(e) {}

                tableBody.innerHTML = notifs.map((n, idx) => {
                    const typeLabel = { new_business: 'Negocio', new_job: 'Empleo', new_property: 'Inmueble', new_product: 'Producto', review: 'Reseña', premium_request: 'Premium', announcement: 'Anuncio', alert: 'Alerta', custom: 'Personalizado', system: 'Sistema', premium: 'Premium' }[n.type] || n.type;
                    const typeColor = { new_business: '#059669', new_job: '#8B0000', new_property: '#8B0000', new_product: '#f59e0b', review: '#f59e0b', premium_request: '#8B0000', announcement: '#8B0000', alert: '#ef4444', custom: '#8B0000' }[n.type] || '#8B0000';
                    const date = n.created_at ? new Date(n.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
                    return `<tr style="cursor:pointer;transition:background .15s;" onclick="openNotifDetail(${idx})" onmouseenter="this.style.background='#8B0000'" onmouseleave="this.style.background=''">
                        <td style="white-space:nowrap;">${date}</td>
                        <td><span style="background:${typeColor}15;color:${typeColor};padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:600;">${escapeHtml(typeLabel)}</span></td>
                        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(n.title || '')}</td>
                        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8B0000;">${escapeHtml(n.message || '-')}</td>
                        <td style="font-size:0.8rem;">${escapeHtml(userMap[n.user_id] || 'Usuario ' + n.user_id)}</td>
                        <td>${n.is_read ? '<span style="color:#8B0000;">Sí</span>' : '<span style="color:#8B0000;font-weight:600;">No</span>'}</td>
                        <td><button onclick="event.stopPropagation(); deleteAdminNotification(${n.id})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.85rem;"><i class="fas fa-trash"></i></button></td>
                    </tr>`;
                }).join('');

                // Store references for detail modal
                window._adminNotifList = notifs;
                window._adminNotifUserMap = userMap;

                // Pagination
                const totalPages = Math.ceil(total / PAGE_LIMIT);
                paginationEl.innerHTML = '';
                if (totalPages > 1) {
                    for (let i = 1; i <= totalPages; i++) {
                        const btn = document.createElement('button');
                        btn.textContent = i;
                        btn.style.cssText = i === notifPage
                            ? 'background:#8B0000;color:#fff;border:1px solid #8B0000;border-radius:6px;padding:4px 12px;font-size:0.8rem;cursor:pointer;font-weight:600;'
                            : 'background:#fff;color:#8B0000;border:1px solid #8B0000;border-radius:6px;padding:4px 12px;font-size:0.8rem;cursor:pointer;';
                        btn.addEventListener('click', () => { notifPage = i; loadAdminNotifications(); });
                        paginationEl.appendChild(btn);
                    }
                }
            } catch(e) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444;">Error al cargar notificaciones</td></tr>';
            }
        };

        // Poll admin notification badge
        async function pollAdminNotifBadge() {
            try {
                const data = await api.get('/notifications?action=unread_count');
                const count = data.count || 0;
                const badge = document.getElementById('adminNotifBadge');
                if (badge) {
                    if (count > 0) {
                        badge.textContent = count > 99 ? '99+' : count;
                        badge.style.display = 'inline';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            } catch(e) {}
        }
        pollAdminNotifBadge();
        setInterval(pollAdminNotifBadge, 30000);

    })();

    // ═══════════════════════════════════════════════════════════
    //  SECCIÓN: ACADEMIA - Clases, Preguntas, Agentes
    //  Funciones: loadAcademyTab, loadAcademyClasses, loadAcademyAgents
    // ═══════════════════════════════════════════════════════════

    var _academyCurrentClassId = null;

    async function loadAcademyTab() {
        loadAcademyClasses();
        loadAcademyAgents();
        setupAcademyHandlers();
    }

    function setupAcademyHandlers() {
        var addBtn = document.getElementById('academyAddClassBtn');
        var saveBtn = document.getElementById('academySaveClassBtn');
        var addQBtn = document.getElementById('academyAddQuestionBtn');
        var saveQBtn = document.getElementById('academySaveInlineQBtn');
        var cancelQBtn = document.getElementById('academyCancelInlineQBtn');
        var closeEditorBtn = document.getElementById('academyCloseEditorBtn');
        var cancelClassBtn = document.getElementById('academyCancelClassBtn');
        var closeQuestionsBtn = document.getElementById('academyCloseQuestionsBtn');
        var genQBtn = document.getElementById('academyGenQBtn');
        var clearPreviewBtn = document.getElementById('academyClearQPreviewBtn');
        var refreshBtn = document.getElementById('academyRefreshBtn');

        if (addBtn && !addBtn._bound) {
            addBtn._bound = true;
            addBtn.addEventListener('click', function() {
                document.getElementById('academyClassId').value = '';
                document.getElementById('academyClassTitle').value = '';
                document.getElementById('academyClassDesc').value = '';
                document.getElementById('academyClassContent').value = '';
                document.getElementById('academyClassXP').value = '10';
                document.getElementById('academyClassOrder').value = '0';
                document.getElementById('academyClassActive').checked = true;
                document.getElementById('academyClassModule').value = 'General';
                document.getElementById('academyClassModuleOrder').value = '0';
                document.getElementById('academyEditorTitle').innerHTML = '<i class="fas fa-plus-circle" style="color:#8B0000;"></i> Nueva Clase';
                document.getElementById('academyClassEditor').classList.remove('hidden');
                window._pendingQuestions = [];
                renderPendingQuestionsPreview();
            });
        }
        if (saveBtn && !saveBtn._bound) {
            saveBtn._bound = true;
            saveBtn.addEventListener('click', saveAcademyClass);
        }
        if (addQBtn && !addQBtn._bound) {
            addQBtn._bound = true;
            addQBtn.addEventListener('click', addQuestionInline);
        }
        if (saveQBtn && !saveQBtn._bound) {
            saveQBtn._bound = true;
            saveQBtn.addEventListener('click', saveQuestionInline);
        }
        if (cancelQBtn && !cancelQBtn._bound) {
            cancelQBtn._bound = true;
            cancelQBtn.addEventListener('click', function() {
                document.getElementById('academyInlineQForm').classList.add('hidden');
            });
        }
        if (closeEditorBtn && !closeEditorBtn._bound) {
            closeEditorBtn._bound = true;
            closeEditorBtn.addEventListener('click', function() {
                document.getElementById('academyClassEditor').classList.add('hidden');
            });
        }
        if (cancelClassBtn && !cancelClassBtn._bound) {
            cancelClassBtn._bound = true;
            cancelClassBtn.addEventListener('click', function() {
                document.getElementById('academyClassEditor').classList.add('hidden');
            });
        }
        if (closeQuestionsBtn && !closeQuestionsBtn._bound) {
            closeQuestionsBtn._bound = true;
            closeQuestionsBtn.addEventListener('click', function() {
                document.getElementById('academyQuestionsPanel').classList.add('hidden');
            });
        }
        if (genQBtn && !genQBtn._bound) {
            genQBtn._bound = true;
            genQBtn.addEventListener('click', academyGenerateQuestions);
        }
        if (clearPreviewBtn && !clearPreviewBtn._bound) {
            clearPreviewBtn._bound = true;
            clearPreviewBtn.addEventListener('click', function() {
                window._pendingQuestions = [];
                renderPendingQuestionsPreview();
            });
        }
        if (refreshBtn && !refreshBtn._bound) {
            refreshBtn._bound = true;
            refreshBtn.addEventListener('click', function() {
                loadAcademyClasses();
                loadAcademyAgents();
                showToast('Lista actualizada', 'success');
            });
        }
        var analyticsBtn = document.getElementById('academyAnalyticsBtn');
        var closeAnalyticsBtn = document.getElementById('academyCloseAnalyticsBtn');
        if (analyticsBtn && !analyticsBtn._bound) {
            analyticsBtn._bound = true;
            analyticsBtn.addEventListener('click', loadAcademyAnalytics);
        }
        if (closeAnalyticsBtn && !closeAnalyticsBtn._bound) {
            closeAnalyticsBtn._bound = true;
            closeAnalyticsBtn.addEventListener('click', function() {
                document.getElementById('academyAnalyticsPanel').classList.add('hidden');
            });
        }
    }

    async function loadAcademyClasses() {
        var tbody = document.getElementById('academyClassesTableBody');
        if (!tbody) return;
        try {
            var data = await api.get('/agent-classes');
            var classes = data.classes || [];
            var totalQ = classes.reduce(function(s, c) { return s + (c.question_count || 0); }, 0);
            var totalComp = classes.reduce(function(s, c) { return s + (c.completions || 0); }, 0);
            var activeC = classes.filter(function(c) { return c.is_active === 1; }).length;
            var statsEl = document.getElementById('academyStats');
            if (statsEl) {
                statsEl.innerHTML =
                    '<div style="background:#8B0000;border-radius:10px;padding:14px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:700;color:#8B0000;">' + classes.length + '</div>' +
                    '<div style="font-size:0.78rem;color:#8B0000;">Total Clases</div></div>' +
                    '<div style="background:#8B0000;border-radius:10px;padding:14px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:700;color:#8B0000;">' + activeC + '</div>' +
                    '<div style="font-size:0.78rem;color:#8B0000;">Activas</div></div>' +
                    '<div style="background:#fef3c7;border-radius:10px;padding:14px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:700;color:#d97706;">' + totalQ + '</div>' +
                    '<div style="font-size:0.78rem;color:#8B0000;">Preguntas</div></div>' +
                    '<div style="background:#ecfdf5;border-radius:10px;padding:14px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:700;color:#059669;">' + totalComp + '</div>' +
                    '<div style="font-size:0.78rem;color:#8B0000;">Completados</div></div>';
            }
            if (!classes.length) {
                tbody.innerHTML = '<tr><td colspan="7"><div style="text-align:center;color:#8B0000;padding:16px;"><i class="fas fa-graduation-cap"></i><p>No hay clases creadas. Haz clic en "Nueva Clase" para comenzar.</p></div></td></tr>';
                return;
            }
            var html = '';
            // Group classes by module
            var grouped = {};
            classes.forEach(function(c) {
                var mod = c.module || 'General';
                if (!grouped[mod]) grouped[mod] = [];
                grouped[mod].push(c);
            });
            var modColors = {'General':'#8B0000','Fundamentos':'#059669','Intermedio':'#8B0000','Avanzado':'#d97706','Examen Final':'#dc2626'};
            Object.keys(grouped).sort().forEach(function(mod) {
                var mColor = modColors[mod] || '#8B0000';
                html += '<tr><td colspan="7" style="background:linear-gradient(90deg,' + mColor + '12,' + mColor + '06);padding:10px 12px;font-weight:700;font-size:0.85rem;color:' + mColor + ';"><i class="fas fa-book"></i> ' + _esc(mod) + ' (' + grouped[mod].length + ' clases)</td></tr>';
                grouped[mod].forEach(function(c) {
                html += '<tr>';
                html += '<td><strong>' + _esc(c.title) + '</strong></td>';
                html += '<td><button onclick="loadAcademyQuestions(' + c.id + ',\'' + _esc(c.title).replace(/'/g, "\\\\'") + '\')" style="background:none;border:1px solid #8B0000;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.75rem;color:#8B0000;"><i class="fas fa-question-circle"></i> ' + (c.question_count || 0) + '</button></td>';
                html += '<td><span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">+' + (c.xp_reward || 0) + ' XP</span></td>';
                html += '<td>' + (c.completions || 0) + '</td>';
                html += '<td>' + c.sort_order + '</td>';
                html += '<td>' + (c.is_active === 1 ? '<span style="color:#059669;font-size:0.8rem;"><i class="fas fa-check-circle"></i> Activa</span>' : '<span style="color:#dc2626;font-size:0.8rem;"><i class="fas fa-times-circle"></i> Inactiva</span>') + '</td>';
                html += '<td><div style="display:flex;gap:4px;flex-wrap:wrap;">' +
                    '<button onclick="academyEditClass(' + c.id + ')" style="background:none;border:1px solid #8B0000;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.75rem;color:#374151;" title="Editar"><i class="fas fa-edit"></i></button>' +
                    '<button onclick="loadAcademyQuestions(' + c.id + ',\'' + _esc(c.title).replace(/'/g, "\\\\'") + '\')" style="background:none;border:1px solid #8B0000;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.75rem;color:#8B0000;" title="Preguntas"><i class="fas fa-list"></i></button>' +
                    '<button onclick="academyDeleteClass(' + c.id + ',\'' + _esc(c.title).replace(/'/g, "\\\\'") + '\')" style="background:none;border:1px solid #fca5a5;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.75rem;color:#dc2626;" title="Eliminar"><i class="fas fa-trash"></i></button>' +
                    '</div></td>';
                html += '</tr>';
                });
            });
            tbody.innerHTML = html;
        } catch(e) {
            console.error('loadAcademyClasses error:', e);
            tbody.innerHTML = '<tr><td colspan="7"><div style="text-align:center;color:#f59e0b;padding:16px;"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar clases</p><p style="font-size:0.75rem;color:#8B0000;margin-top:4px;">' + _esc(e.message || 'Error desconocido') + '</p><p style="font-size:0.72rem;color:#8B0000;margin-top:8px;"><button onclick="loadAcademyClasses()" style="background:#8B0000;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:0.8rem;">Reintentar</button></p></div></td></tr>';
        }
    }

    async function saveAcademyClass() {
        var id = document.getElementById('academyClassId').value;
        var title = document.getElementById('academyClassTitle').value.trim();
        if (!title) { showToast('El titulo es requerido', 'error'); return; }
        var payload = {
            title: title,
            description: document.getElementById('academyClassDesc').value,
            content: document.getElementById('academyClassContent').value,
            xp_reward: parseInt(document.getElementById('academyClassXP').value) || 10,
            sort_order: parseInt(document.getElementById('academyClassOrder').value) || 0,
            is_active: document.getElementById('academyClassActive').checked,
            module: document.getElementById('academyClassModule').value,
            module_order: parseInt(document.getElementById('academyClassModuleOrder').value) || 0
        };
        try {
            var classId = id || null;
            if (id) {
                await api.put('/agent-classes/' + id, payload);
                classId = id;
                showToast('Clase actualizada', 'success');
            } else {
                var result = await api.post('/agent-classes', payload);
                classId = result.class_id;
                showToast('Clase creada', 'success');
            }
            var pending = window._pendingQuestions || [];
            if (pending.length > 0 && classId) {
                for (var i = 0; i < pending.length; i++) {
                    try {
                        await api.post('/agent-classes/' + classId + '/questions', pending[i]);
                    } catch(eq) { console.log('Error saving question', eq); }
                }
                showToast(pending.length + ' preguntas guardadas', 'success');
            }
            window._pendingQuestions = [];
            document.getElementById('academyClassEditor').classList.add('hidden');
            renderPendingQuestionsPreview();
            // Small delay to ensure DB consistency before refresh
            setTimeout(function() { loadAcademyClasses(); }, 300);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    window.academyEditClass = async function(classId) {
        try {
            var data = await api.get('/agent-classes/' + classId);
            var cls = data.class;
            if (!cls) { showToast('Clase no encontrada', 'error'); return; }
            document.getElementById('academyClassId').value = cls.id;
            document.getElementById('academyClassTitle').value = cls.title;
            document.getElementById('academyClassDesc').value = cls.description || '';
            document.getElementById('academyClassContent').value = cls.content || '';
            document.getElementById('academyClassXP').value = cls.xp_reward || 10;
            document.getElementById('academyClassOrder').value = cls.sort_order || 0;
            document.getElementById('academyClassActive').checked = cls.is_active === 1;
            document.getElementById('academyClassModule').value = cls.module || 'General';
            document.getElementById('academyClassModuleOrder').value = cls.module_order || 0;
            document.getElementById('academyEditorTitle').innerHTML = '<i class="fas fa-edit" style="color:#8B0000;"></i> Editar Clase: ' + _esc(cls.title);
            document.getElementById('academyClassEditor').classList.remove('hidden');
            try {
                var qData = await api.get('/agent-classes/' + classId + '/questions');
                window._pendingQuestions = (qData.questions || []).map(function(q) {
                    return {
                        question: q.question,
                        option_a: q.option_a,
                        option_b: q.option_b,
                        option_c: q.option_c,
                        option_d: q.option_d,
                        correct_answer: q.correct_answer,
                        points: q.points || 10,
                        explanation: q.explanation || ''
                    };
                });
            } catch(ex) { window._pendingQuestions = []; }
            renderPendingQuestionsPreview();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    window.academyDeleteClass = async function(id, name) {
        if (!confirm('Eliminar la clase "' + name + '" y todas sus preguntas?')) return;
        try {
            await api.delete('/agent-classes/' + id);
            showToast('Clase eliminada', 'success');
            loadAcademyClasses();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    window.loadAcademyQuestions = async function(classId, className) {
        _academyCurrentClassId = classId;
        document.getElementById('academyQuestionsClassName').textContent = className;
        document.getElementById('academyQuestionsPanel').classList.remove('hidden');
        document.getElementById('academyInlineQForm').classList.add('hidden');
        var listEl = document.getElementById('academyQuestionsList');
        listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#8B0000;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
        try {
            var data = await api.get('/agent-classes/' + classId + '/questions');
            var questions = data.questions || [];
            if (!questions.length) {
                listEl.innerHTML = '<div style="text-align:center;color:#8B0000;padding:20px;">No hay preguntas. Haz clic en "Agregar Pregunta".</div>';
                return;
            }
            var html = '';
            questions.forEach(function(q, idx) {
                var opts = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
                html += '<div style="background:#fff;border:1px solid #8B0000;border-radius:8px;padding:12px;margin-bottom:8px;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">';
                html += '<div style="flex:1;">';
                html += '<div style="font-weight:600;font-size:0.85rem;margin-bottom:6px;">[Q' + (idx + 1) + '] ' + _esc(q.question) + '</div>';
                var letters = ['a', 'b', 'c', 'd'];
                letters.forEach(function(l) {
                    var isCorrect = q.correct_answer === l;
                    var prefix = isCorrect ? '<span style="color:#059669;font-weight:700;">&#10003; ' + l.toUpperCase() + '</span>' : '<span style="color:#8B0000;">&nbsp;&nbsp;&nbsp;' + l.toUpperCase() + '</span>';
                    html += '<div style="font-size:0.82rem;padding:2px 0 2px 16px;">' + prefix + ') ' + _esc(opts[l] || '') + '</div>';
                });
                html += '</div>';
                html += '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">';
                html += '<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:600;white-space:nowrap;">' + (q.points || 10) + ' pts</span>';
                html += '<div style="display:flex;gap:4px;">';
                html += '<button onclick="editQuestionInline(' + q.id + ')" style="background:none;border:1px solid #8B0000;border-radius:6px;padding:3px 6px;cursor:pointer;font-size:0.72rem;color:#374151;" title="Editar"><i class="fas fa-edit"></i></button>';
                html += '<button onclick="deleteQuestionInline(' + q.id + ')" style="background:none;border:1px solid #fca5a5;border-radius:6px;padding:3px 6px;cursor:pointer;font-size:0.72rem;color:#dc2626;" title="Eliminar"><i class="fas fa-trash"></i></button>';
                html += '</div></div></div></div>';
            });
            listEl.innerHTML = html;
        } catch(e) {
            listEl.innerHTML = '<div style="text-align:center;color:#f59e0b;padding:20px;"><i class="fas fa-exclamation-triangle"></i> Error al cargar preguntas</div>';
        }
    };

    function addQuestionInline() {
        document.getElementById('academyInlineQId').value = '';
        document.getElementById('academyInlineQText').value = '';
        document.getElementById('academyInlineQOptA').value = '';
        document.getElementById('academyInlineQOptB').value = '';
        document.getElementById('academyInlineQOptC').value = '';
        document.getElementById('academyInlineQOptD').value = '';
        document.querySelectorAll('input[name="academyInlineCorrect"]').forEach(function(r) { r.checked = false; });
        document.getElementById('academyInlineQFormTitle').textContent = 'Nueva Pregunta';
        document.getElementById('academyInlineQForm').classList.remove('hidden');
    }

    window.editQuestionInline = async function(qId) {
        try {
            var data = await api.get('/agent-classes/' + _academyCurrentClassId + '/questions');
            var q = (data.questions || []).find(function(q) { return q.id === qId; });
            if (!q) { showToast('Pregunta no encontrada', 'error'); return; }
            document.getElementById('academyInlineQId').value = q.id;
            document.getElementById('academyInlineQText').value = q.question;
            document.getElementById('academyInlineQOptA').value = q.option_a || '';
            document.getElementById('academyInlineQOptB').value = q.option_b || '';
            document.getElementById('academyInlineQOptC').value = q.option_c || '';
            document.getElementById('academyInlineQOptD').value = q.option_d || '';
            document.querySelectorAll('input[name="academyInlineCorrect"]').forEach(function(r) { r.checked = r.value === q.correct_answer; });
            document.getElementById('academyInlineQFormTitle').textContent = 'Editar Pregunta';
            document.getElementById('academyInlineQForm').classList.remove('hidden');
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    async function saveQuestionInline() {
        var qId = document.getElementById('academyInlineQId').value;
        var question = document.getElementById('academyInlineQText').value.trim();
        var optA = document.getElementById('academyInlineQOptA').value.trim();
        var optB = document.getElementById('academyInlineQOptB').value.trim();
        var optC = document.getElementById('academyInlineQOptC').value.trim();
        var optD = document.getElementById('academyInlineQOptD').value.trim();
        var correct = document.querySelector('input[name="academyInlineCorrect"]:checked');
        if (!question || !optA || !optB || !optC || !optD) { showToast('Todos los campos son requeridos', 'error'); return; }
        if (!correct) { showToast('Selecciona la respuesta correcta', 'error'); return; }
        var payload = {
            question: question,
            option_a: optA, option_b: optB, option_c: optC, option_d: optD,
            correct_answer: correct.value
        };
        try {
            if (qId) {
                await api.put('/agent-classes/' + _academyCurrentClassId + '/questions/' + qId, payload);
                showToast('Pregunta actualizada', 'success');
            } else {
                await api.post('/agent-classes/' + _academyCurrentClassId + '/questions', payload);
                showToast('Pregunta creada', 'success');
            }
            document.getElementById('academyInlineQForm').classList.add('hidden');
            loadAcademyQuestions(_academyCurrentClassId, document.getElementById('academyQuestionsClassName').textContent);
            loadAcademyClasses();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    window.deleteQuestionInline = async function(qId) {
        if (!confirm('Eliminar esta pregunta?')) return;
        try {
            await api.delete('/agent-classes/' + _academyCurrentClassId + '/questions/' + qId);
            showToast('Pregunta eliminada', 'success');
            loadAcademyQuestions(_academyCurrentClassId, document.getElementById('academyQuestionsClassName').textContent);
            loadAcademyClasses();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    async function loadAcademyAgents() {
        var tbody = document.getElementById('academyAgentsTableBody');
        if (!tbody) return;
        try {
            var resp = await fetch(API + '/users?role=agent&limit=200', {
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' }
            });
            var data = await resp.json();
            var users = data.users || data.results || [];
            if (!users.length) {
                tbody.innerHTML = '<tr><td colspan="8"><div style="text-align:center;color:#8B0000;padding:16px;">No hay agentes registrados</div></td></tr>';
                return;
            }
            var profiles = {};
            for (var i = 0; i < users.length; i++) {
                try {
                    var pResp = await fetch(API + '/partners/' + users[i].id, {
                        headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' }
                    });
                    var pData = await pResp.json();
                    profiles[users[i].id] = pData;
                } catch(ex) {}
            }
            var html = '';
            var lvlColors = ['#8B0000','#8B0000','#8B0000','#059669','#d97706','#dc2626','#8B0000','#8B0000','#65a30d','#ea580c'];
            for (var i = 0; i < users.length; i++) {
                var u = users[i];
                var p = profiles[u.id] || {};
                var lvl = p.level || 1;
                var xp = p.xp || 0;
                var grad = p.is_graduated || p.graduated || false;
                var LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
                var xpPrev = lvl <= 1 ? 0 : LEVEL_XP[lvl - 2];
                var xpForNext = lvl >= 10 ? LEVEL_XP[9] : LEVEL_XP[lvl - 1];
                var xpInLevel = xp - xpPrev;
                var xpNeeded = xpForNext - xpPrev;
                var pct = lvl >= 10 ? 100 : Math.min(100, Math.max(0, Math.round((xpInLevel / xpNeeded) * 100)));
                var lvlColor = lvlColors[Math.min(lvl - 1, lvlColors.length - 1)];
                html += '<tr>';
                html += '<td><div style="display:flex;align-items:center;gap:8px;">';
                if (u.avatar) {
                    html += '<img src="' + _esc(u.avatar) + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">';
                } else {
                    html += '<div style="width:28px;height:28px;border-radius:50%;background:' + lvlColor + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;">' + _esc(u.name).charAt(0).toUpperCase() + '</div>';
                }
                html += '<strong>' + _esc(u.name) + '</strong></div></td>';
                html += '<td><span style="background:' + lvlColor + '15;color:' + lvlColor + ';border:1px solid ' + lvlColor + '30;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">Nivel ' + lvl + '</span></td>';
                html += '<td style="min-width:120px;"><div style="font-size:0.72rem;color:#8B0000;margin-bottom:3px;">' + xp + ' XP</div><div style="background:#8B0000;border-radius:6px;height:6px;overflow:hidden;"><div style="background:' + lvlColor + ';height:100%;border-radius:6px;width:' + pct + '%;transition:width 0.3s;"></div></div></td>';
                html += '<td>' + (p.total_classes_completed || 0) + '</td>';
                html += '<td>' + (p.total_badges || 0) + '</td>';
                html += '<td>';
                if (p.exam_passed) {
                    html += '<span style="color:#059669;font-size:0.8rem;"><i class="fas fa-check-circle"></i> Aprobado</span>';
                } else if (p.exam_attempts > 0) {
                    html += '<span style="color:#dc2626;font-size:0.8rem;"><i class="fas fa-times-circle"></i> ' + p.exam_attempts + ' intentos</span>';
                } else {
                    html += '<span style="color:#8B0000;font-size:0.8rem;">-</span>';
                }
                html += '</td>';
                html += '<td>';
                if (p.is_partner) {
                    html += '<span style="background:#dcfce7;color:#059669;padding:2px 8px;border-radius:12px;font-size:0.72rem;font-weight:600;">Partner</span>';
                } else if (grad) {
                    html += '<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:12px;font-size:0.72rem;font-weight:600;">Graduado</span>';
                } else {
                    html += '<span style="color:#8B0000;font-size:0.8rem;">-</span>';
                }
                html += '</td>';
                html += '<td><div style="display:flex;gap:4px;flex-wrap:wrap;">';
                html += '<a href="/perfil.html?id=' + u.id + '" target="_blank" style="background:none;border:1px solid #8B0000;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.72rem;color:#8B0000;text-decoration:none;" title="Ver Perfil"><i class="fas fa-external-link-alt"></i></a>';
                if (!grad) {
                    html += '<button onclick="academyGraduateAgent(' + u.id + ',\'' + _esc(u.name).replace(/'/g, "\\\\'") + '\')" style="background:none;border:1px solid #fde68a;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.72rem;color:#d97706;" title="Graduar"><i class="fas fa-graduation-cap"></i></button>';
                }
                html += '<button onclick="academyAwardBadge(' + u.id + ',\'' + _esc(u.name).replace(/'/g, "\\\\'") + '\')" style="background:none;border:1px solid #8B0000;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.72rem;color:#8B0000;" title="Dar Medalla"><i class="fas fa-medal"></i></button>';
                html += '</div></td>';
                html += '</tr>';
            }
            tbody.innerHTML = html;
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="8"><div style="text-align:center;color:#f59e0b;padding:16px;"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar agentes</p></div></td></tr>';
        }
    }

    function renderPendingQuestionsPreview() {
        var wrap = document.getElementById('academyQPreviewWrap');
        var list = document.getElementById('academyQPreviewList');
        var count = document.getElementById('academyQPreviewCount');
        var questions = window._pendingQuestions || [];
        if (!wrap || !list) return;
        count.textContent = questions.length;
        if (!questions.length) {
            wrap.classList.add('hidden');
            return;
        }
        wrap.classList.remove('hidden');
        var html = '';
        questions.forEach(function(q, idx) {
            html += '<div style="background:#fff;border:1px solid #8B0000;border-radius:8px;padding:10px;position:relative;">';
            html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">';
            html += '<div style="flex:1;">';
            html += '<div style="font-weight:600;font-size:0.83rem;margin-bottom:4px;">[Q' + (idx + 1) + '] ' + _esc(q.question) + '</div>';
            var opts = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
            ['a','b','c','d'].forEach(function(l) {
                var isCorrect = q.correct_answer === l;
                var prefix = isCorrect ? '<span style="color:#059669;font-weight:700;">&#10003; ' + l.toUpperCase() + '</span>' : '<span style="color:#8B0000;">&nbsp;&nbsp;&nbsp;' + l.toUpperCase() + '</span>';
                html += '<div style="font-size:0.8rem;padding:1px 0 1px 14px;">' + prefix + ') ' + _esc(opts[l] || '') + '</div>';
            });
            html += '</div>';
            html += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">';
            html += '<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">' + (q.points || 10) + ' pts</span>';
            html += '<button onclick="removePendingQuestion(' + idx + ')" style="background:none;border:1px solid #fca5a5;border-radius:6px;padding:2px 6px;cursor:pointer;font-size:0.72rem;color:#dc2626;" title="Eliminar"><i class="fas fa-times"></i></button>';
            html += '</div></div></div>';
        });
        list.innerHTML = html;
    }

    window.removePendingQuestion = function(idx) {
        var questions = window._pendingQuestions || [];
        questions.splice(idx, 1);
        renderPendingQuestionsPreview();
    };

    window.academyGenerateQuestions = async function() {
        var text = document.getElementById('academyAIText').value.trim();
        if (!text) { showToast('Pega un texto para generar preguntas', 'error'); return; }
        var count = parseInt(document.getElementById('academyGenQCount').value) || 5;
        var btn = document.getElementById('academyGenQBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        try {
            var data = await api.post('/agent-classes/generate-questions', { text: text, num_questions: count });
            if (data.questions && data.questions.length > 0) {
                if (!window._pendingQuestions) window._pendingQuestions = [];
                data.questions.forEach(function(q) { window._pendingQuestions.push(q); });
                renderPendingQuestionsPreview();
                showToast(data.questions.length + ' preguntas generadas. Revisa la vista previa antes de guardar.', 'success');
            } else {
                showToast('No se pudieron generar preguntas. Intenta con mas texto.', 'error');
            }
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic"></i> Generar Preguntas';
    };

    window.academyGraduateAgent = async function(userId, name) {
        if (!confirm('Confirmar graduacion de "' + name + '"? Se le otorgara medalla de graduacion y estatus de Partner.')) return;
        try {
            await api.post('/admin/agent-actions', {
                action: 'graduate',
                user_id: userId,
                badge_name: 'Graduado del Programa',
                badge_description: 'Completo exitosamente el programa de capacitacion'
            });
            showToast(name + ' graduado exitosamente!', 'success');
            loadAcademyAgents();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    };

    window.academyAwardBadge = function(userId, name) {
        var existing = document.getElementById('academyBadgeInline_' + userId);
        if (existing) { existing.remove(); return; }
        var td = event.target.closest('td');
        if (!td) return;
        var form = document.createElement('div');
        form.id = 'academyBadgeInline_' + userId;
        form.style.cssText = 'position:absolute;right:0;top:100%;background:#fff;border:1px solid #8B0000;border-radius:10px;padding:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:50;width:240px;margin-top:4px;';
        form.innerHTML = '<div style="font-weight:600;font-size:0.8rem;color:#8B0000;margin-bottom:8px;"><i class="fas fa-medal"></i> Medalla para ' + _esc(name) + '</div>' +
            '<input type="text" id="academyBadgeName_' + userId + '" placeholder="Nombre de la medalla" style="width:100%;padding:6px 10px;border:2px solid #8B0000;border-radius:6px;font-size:0.82rem;outline:none;margin-bottom:6px;">' +
            '<input type="text" id="academyBadgeDesc_' + userId + '" placeholder="Descripcion (opcional)" style="width:100%;padding:6px 10px;border:2px solid #8B0000;border-radius:6px;font-size:0.82rem;outline:none;margin-bottom:8px;">' +
            '<div style="display:flex;gap:6px;">' +
            '<button class="btn btn-primary btn-sm" style="background:#8B0000;font-size:0.75rem;" id="academyBadgeSave_' + userId + '"><i class="fas fa-check"></i> Otorgar</button>' +
            '<button class="btn btn-secondary btn-sm" style="font-size:0.75rem;" id="academyBadgeCancel_' + userId + '"><i class="fas fa-times"></i></button>' +
            '</div>';
        td.style.position = 'relative';
        td.appendChild(form);
        document.getElementById('academyBadgeCancel_' + userId).addEventListener('click', function() { form.remove(); });
        document.getElementById('academyBadgeSave_' + userId).addEventListener('click', async function() {
            var bName = document.getElementById('academyBadgeName_' + userId).value.trim();
            if (!bName) { showToast('El nombre de la medalla es requerido', 'error'); return; }
            var bDesc = document.getElementById('academyBadgeDesc_' + userId).value.trim();
            try {
                await api.post('/admin/agent-actions', {
                    action: 'award_badge',
                    user_id: userId,
                    badge_name: bName,
                    badge_description: bDesc
                });
                showToast('Medalla "' + bName + '" otorgada a ' + name, 'success');
                form.remove();
                loadAcademyAgents();
            } catch(e) { showToast('Error: ' + e.message, 'error'); }
        });
    };

    async function loadAcademyAnalytics() {
        var panel = document.getElementById('academyAnalyticsPanel');
        var content = document.getElementById('academyAnalyticsContent');
        if (!panel || !content) return;
        panel.classList.remove('hidden');
        content.innerHTML = '<div style="text-align:center;padding:20px;color:#8B0000;"><i class="fas fa-spinner fa-spin"></i> Cargando analíticas...</div>';
        try {
            var data = await api.post('/admin/academy-analytics', {});
            var o = data.overview;
            var html = '';
            // Overview cards
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px;">';
            var cards = [
                {label:'Clases', val:o.total_classes, icon:'fa-book', color:'#8B0000'},
                {label:'Preguntas', val:o.total_questions, icon:'fa-question-circle', color:'#8B0000'},
                {label:'Agentes', val:o.total_agents, icon:'fa-users', color:'#059669'},
                {label:'Aprobación Clases', val:o.overall_pass_rate+'%', icon:'fa-check-double', color:o.overall_pass_rate >= 70 ? '#059669' : '#dc2626'},
                {label:'Aprobación Examen', val:o.exam_pass_rate+'%', icon:'fa-trophy', color:o.exam_pass_rate >= 70 ? '#059669' : '#dc2626'},
                {label:'Partners', val:o.total_partners, icon:'fa-certificate', color:'#d97706'},
            ];
            cards.forEach(function(c) {
                html += '<div style="background:#fff;border:1px solid #8B0000;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:' + c.color + ';">' + c.val + '</div><div style="font-size:0.75rem;color:#8B0000;"><i class="fas ' + c.icon + '"></i> ' + c.label + '</div></div>';
            });
            html += '</div>';

            // Class pass rates
            if (data.class_stats && data.class_stats.length > 0) {
                html += '<h4 style="margin:16px 0 8px;font-size:0.95rem;color:#374151;"><i class="fas fa-chart-bar" style="color:#8B0000;"></i> Tasa de Aprobación por Clase</h4>';
                html += '<div style="overflow-x:auto;"><table class="admin-table" style="width:100%;font-size:0.82rem;"><thead><tr><th>Clase</th><th>Módulo</th><th>Intentos</th><th>Aprobados</th><th>Tasa</th></tr></thead><tbody>';
                data.class_stats.forEach(function(c) {
                    var rateColor = c.pass_rate >= 70 ? '#059669' : c.pass_rate >= 50 ? '#d97706' : '#dc2626';
                    html += '<tr><td>' + _esc(c.title) + '</td><td><span style="background:#8B0000;color:#8B0000;padding:2px 8px;border-radius:10px;font-size:0.72rem;">' + _esc(c.module || 'General') + '</span></td><td>' + c.total_attempts + '</td><td>' + c.passed + '</td><td style="color:' + rateColor + ';font-weight:700;">' + c.pass_rate + '%</td></tr>';
                });
                html += '</tbody></table></div>';
            }

            // Failed questions
            if (data.failed_questions && data.failed_questions.length > 0) {
                html += '<h4 style="margin:16px 0 8px;font-size:0.95rem;color:#374151;"><i class="fas fa-exclamation-triangle" style="color:#dc2626;"></i> Preguntas con Mayor Tasa de Fallo</h4>';
                data.failed_questions.forEach(function(q) {
                    html += '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px;margin-bottom:8px;"><div style="font-size:0.82rem;"><strong>Q' + q.id + '</strong> (' + _esc(q.class_title) + ')</div><div style="font-size:0.78rem;color:#8B0000;margin-top:4px;">' + _esc(q.question) + '</div><div style="font-size:0.72rem;margin-top:4px;">' + q.times_answered + ' intentos, ' + q.times_correct + ' correctos (' + q.fail_rate + '% fallo)</div></div>';
                });
            }

            // Level distribution
            if (data.level_distribution && data.level_distribution.length > 0) {
                html += '<h4 style="margin:16px 0 8px;font-size:0.95rem;color:#374151;"><i class="fas fa-layer-group" style="color:#8B0000;"></i> Distribución de Niveles</h4>';
                html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
                var lvlColors = ['#8B0000','#8B0000','#8B0000','#059669','#d97706','#dc2626','#8B0000','#8B0000','#65a30d','#ea580c'];
                data.level_distribution.forEach(function(l) {
                    var lc = lvlColors[Math.min(l.level - 1, 9)];
                    html += '<div style="background:' + lc + '15;border:1px solid ' + lc + '30;border-radius:8px;padding:8px 14px;text-align:center;min-width:60px;"><div style="font-size:1.1rem;font-weight:700;color:' + lc + ';">' + l.count + '</div><div style="font-size:0.7rem;color:#8B0000;">Nivel ' + l.level + '</div></div>';
                });
                html += '</div>';
            }

            content.innerHTML = html;
        } catch(e) {
            content.innerHTML = '<div style="text-align:center;color:#f59e0b;padding:20px;"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar analíticas: ' + _esc(e.message) + '</p></div>';
        }
    }


    // ─── Initialize on DOM Ready ────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();



