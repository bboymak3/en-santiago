/**
 * Un Click - Admin Seller Panel Module
 * IIFE injected into admin.html to add "Vendedores" tab
 * Shows seller list + all publications per seller + seller profile view
 */
(function () {
    'use strict';

    let sellersPage = 1;
    let selectedSellerId = null;

    // ─── Init ──────────────────────────────────────────────────
    function init() {
        addSellersTab();
        addSellersPanel();
        setupSellersNavClick();
    }

    // ─── Add "Vendedores" tab to sidebar ───────────────────────
    function addSellersTab() {
        const nav = document.querySelector('.admin-nav');
        if (!nav) return;

        // Insert before Settings
        const settingsLink = nav.querySelector('[data-tab="settings"]');
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'admin-nav-link';
        link.dataset.tab = 'sellers';
        link.innerHTML = '<i class="fas fa-store"></i> <span>Vendedores</span>';
        if (settingsLink) {
            nav.insertBefore(link, settingsLink);
        } else {
            nav.appendChild(link);
        }
    }

    // ─── Add Sellers panel content ─────────────────────────────
    function addSellersPanel() {
        const content = document.querySelector('.admin-content');
        if (!content) return;

        const panel = document.createElement('div');
        panel.className = 'admin-tab hidden';
        panel.id = 'tabSellers';
        panel.innerHTML = `
            <!-- Sellers List View -->
            <div id="sellersListView">
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3><i class="fas fa-store"></i> Gestión de Vendedores</h3>
                        <div class="admin-card-actions">
                            <input type="text" id="adminSellerSearch" class="form-input-sm" placeholder="Buscar vendedor..." style="margin-right:8px;">
                            <button class="btn btn-primary btn-sm" id="adminCreateSellerBtn">
                                <i class="fas fa-plus"></i> Nuevo Vendedor
                            </button>
                        </div>
                    </div>
                    <div class="admin-card-body">
                        <div class="admin-table-responsive">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Vendedor</th>
                                        <th>Email</th>
                                        <th>Teléfono</th>
                                        <th>Plan</th>
                                        <th>Estado</th>
                                        <th>Publicaciones</th>
                                        <th>Registro</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="adminSellersTableBody">
                                    <tr class="empty-row">
                                        <td colspan="9">
                                            <div class="empty-state-sm"><p>Cargando vendedores...</p></div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="admin-pagination" id="adminSellersPagination"></div>
                    </div>
                </div>
            </div>

            <!-- Seller Detail View (Profile + Publications) -->
            <div id="sellerDetailView" style="display:none;">
                <!-- Back button -->
                <button class="btn btn-secondary btn-sm" id="sellerDetailBack" style="margin-bottom:16px;">
                    <i class="fas fa-arrow-left"></i> Volver a Vendedores
                </button>

                <!-- Seller Profile Card -->
                <div class="admin-card" style="margin-bottom:20px;">
                    <div class="admin-card-body" id="sellerProfileContent" style="padding:0;">
                        <div style="text-align:center;padding:30px;color:#94a3b8;">
                            <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                            <p style="margin-top:8px;">Cargando perfil del vendedor...</p>
                        </div>
                    </div>
                </div>

                <!-- Seller Publications -->
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3><i class="fas fa-list"></i> Publicaciones del Vendedor</h3>
                    </div>
                    <div class="admin-card-body" id="sellerPublicationsContent">
                        <div style="text-align:center;padding:30px;color:#94a3b8;">
                            <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                            <p style="margin-top:8px;">Cargando publicaciones...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Create Seller Modal -->
            <div class="modal hidden" id="adminCreateSellerModal">
                <div class="modal-overlay"></div>
                <div class="modal-content" style="max-width:480px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-plus" style="color:#059669;"></i> Crear Nuevo Vendedor</h3>
                        <button class="modal-close" id="createSellerModalClose">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="createSellerForm">
                            <div class="form-group" style="margin-bottom:14px;">
                                <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Nombre Completo *</label>
                                <input type="text" id="newSellerName" required placeholder="Nombre del vendedor" class="form-control" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div class="form-group" style="margin-bottom:14px;">
                                <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Email *</label>
                                <input type="email" id="newSellerEmail" required placeholder="vendedor@email.com" class="form-control" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div class="form-group" style="margin-bottom:14px;">
                                <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Contraseña *</label>
                                <input type="password" id="newSellerPassword" required minlength="6" placeholder="Mínimo 6 caracteres" class="form-control" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div style="display:flex;gap:12px;margin-bottom:14px;">
                                <div class="form-group" style="flex:1;">
                                    <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">Teléfono</label>
                                    <input type="tel" id="newSellerPhone" placeholder="+58 414 0000000" class="form-control" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label style="display:block;font-size:0.82rem;font-weight:600;color:#374151;margin-bottom:4px;">WhatsApp</label>
                                    <input type="tel" id="newSellerWhatsapp" placeholder="+58 414 0000000" class="form-control" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="createSellerModalCancel">Cancelar</button>
                        <button class="btn btn-primary" id="createSellerModalSave">
                            <i class="fas fa-save"></i> Crear Vendedor
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Append after the last tab panel
        const lastTab = content.querySelector('.admin-tab:last-of-type');
        if (lastTab) {
            lastTab.parentNode.insertBefore(panel, lastTab.nextSibling);
        } else {
            content.appendChild(panel);
        }

        // Setup event listeners
        setupSellersPanelEvents();
    }

    // ─── Setup Event Listeners ─────────────────────────────────
    function setupSellersPanelEvents() {
        // Search
        const searchInput = document.getElementById('adminSellerSearch');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => { sellersPage = 1; loadSellersList(); }, 400);
            });
        }

        // Create seller modal
        const createBtn = document.getElementById('adminCreateSellerBtn');
        const modal = document.getElementById('adminCreateSellerModal');
        if (createBtn && modal) {
            createBtn.addEventListener('click', () => modal.classList.remove('hidden'));
        }
        const closeBtn = document.getElementById('createSellerModalClose');
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }
        const cancelBtn = document.getElementById('createSellerModalCancel');
        if (cancelBtn && modal) {
            cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }
        const overlay = modal?.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => modal.classList.add('hidden'));
        }

        // Create seller save
        const saveBtn = document.getElementById('createSellerModalSave');
        if (saveBtn) {
            saveBtn.addEventListener('click', createSeller);
        }

        // Back button
        const backBtn = document.getElementById('sellerDetailBack');
        if (backBtn) {
            backBtn.addEventListener('click', showSellersList);
        }
    }

    // ─── Setup Nav Click for Sellers Tab ───────────────────────
    function setupSellersNavClick() {
        const sellerLink = document.querySelector('[data-tab="sellers"]');
        if (!sellerLink) return;

        sellerLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Activate tab
            document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
            sellerLink.classList.add('active');
            // Hide other tabs
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
            const panel = document.getElementById('tabSellers');
            if (panel) panel.classList.remove('hidden');
            // Update title
            const title = document.getElementById('adminPageTitle');
            if (title) title.textContent = 'Vendedores';
            // Load data
            showSellersList();
        });
    }

    // ─── Show Sellers List ─────────────────────────────────────
    function showSellersList() {
        const listView = document.getElementById('sellersListView');
        const detailView = document.getElementById('sellerDetailView');
        if (listView) listView.style.display = 'block';
        if (detailView) detailView.style.display = 'none';
        loadSellersList();
    }

    // ─── Load Sellers ──────────────────────────────────────────
    async function loadSellersList() {
        const tbody = document.getElementById('adminSellersTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state-sm"><p>Cargando vendedores...</p></div></td></tr>';

        try {
            const search = document.getElementById('adminSellerSearch')?.value || '';
            let endpoint = `/sellers?page=${sellersPage}&limit=15`;
            if (search) endpoint += `&search=${encodeURIComponent(search)}`;

            const data = await api.get(endpoint);
            const sellers = data.sellers || [];

            if (sellers.length === 0) {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state-sm"><p>No se encontraron vendedores.</p></div></td></tr>';
                return;
            }

            tbody.innerHTML = sellers.map(s => {
                const initials = (s.name || 'V').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                const avatarHTML = s.avatar
                    ? `<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;"><img src="${s.avatar}" style="width:100%;height:100%;object-fit:cover;"></div>`
                    : `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;">${initials}</div>`;
                const planLabel = s.plan === 'premium' ? '<span class="badge badge-warning">Premium</span>' : '<span class="badge" style="background:#e2e8f0;color:#64748b;">Free</span>';

                return `
                    <tr data-seller-id="${s.id}">
                        <td>${s.id}</td>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px;">
                                ${avatarHTML}
                                <div>
                                    <div style="font-weight:600;font-size:0.88rem;color:#1e293b;">${s.name || '--'}</div>
                                    ${s.store_name ? `<div style="font-size:0.75rem;color:#64748b;">${s.store_name}</div>` : ''}
                                </div>
                            </div>
                        </td>
                        <td style="font-size:0.83rem;color:#64748b;">${s.email || '--'}</td>
                        <td style="font-size:0.83rem;">${s.phone || '<span style="color:#ccc">—</span>'}</td>
                        <td>${planLabel}</td>
                        <td>${s.is_active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
                        <td style="text-align:center;">
                            <span style="font-weight:700;color:#059669;font-size:0.9rem;">${s.businesses_count || 0}</span>
                        </td>
                        <td style="font-size:0.82rem;color:#94a3b8;">${formatDate(s.created_at)}</td>
                        <td>
                            <div style="display:flex;gap:4px;">
                                <button class="btn btn-xs btn-outline" onclick="window.adminSellerPanel.viewSeller(${s.id})" title="Ver vendedor">
                                    <i class="fas fa-eye"></i> Ver
                                </button>
                                <button class="btn btn-xs btn-outline" onclick="window.adminSellerPanel.viewSellerPublications(${s.id})" title="Ver publicaciones">
                                    <i class="fas fa-list"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            // Pagination
            if (data.pagination) {
                const p = data.pagination;
                const totalPages = p.totalPages || 1;
                let paginationHTML = '';
                if (totalPages > 1) {
                    for (let i = 1; i <= totalPages; i++) {
                        paginationHTML += `<button class="btn btn-xs ${i === sellersPage ? 'btn-primary' : 'btn-outline'}" onclick="window.adminSellerPanel.goToPage(${i})">${i}</button> `;
                    }
                }
                const pagDiv = document.getElementById('adminSellersPagination');
                if (pagDiv) pagDiv.innerHTML = paginationHTML;
            }
        } catch (error) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state-sm"><p>Error al cargar vendedores.</p></div></td></tr>';
            if (window.showToast) window.showToast(error.message, 'error');
        }
    }

    // ─── View Seller Detail (Profile + Publications) ──────────
    async function viewSeller(sellerId) {
        const listView = document.getElementById('sellersListView');
        const detailView = document.getElementById('sellerDetailView');
        if (listView) listView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';

        selectedSellerId = sellerId;

        // Load profile and publications in parallel
        loadSellerProfileView(sellerId);
        loadSellerPublicationsView(sellerId);
    }

    // Alias
    function viewSellerPublications(sellerId) {
        viewSeller(sellerId);
    }

    // ─── Load Seller Profile Card ──────────────────────────────
    async function loadSellerProfileView(sellerId) {
        const container = document.getElementById('sellerProfileContent');
        if (!container) return;

        try {
            const data = await api.get(`/seller-profile?user_id=${sellerId}`);
            const profile = data.profile || {};
            const user = data.user || {};

            const initials = (user.name || 'V').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
            const avatarHTML = profile.avatar || user.avatar
                ? `<img src="${profile.avatar || user.avatar}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #a7f3d0;">`
                : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;">${initials}</div>`;

            const socials = [];
            if (profile.instagram) socials.push(`<a href="https://instagram.com/${profile.instagram.replace('@','')}" target="_blank" style="color:#E1306C;font-size:1.1rem;"><i class="fab fa-instagram"></i></a>`);
            if (profile.facebook) socials.push(`<a href="${profile.facebook}" target="_blank" style="color:#1877F2;font-size:1.1rem;"><i class="fab fa-facebook"></i></a>`);
            if (profile.tiktok) socials.push(`<a href="https://tiktok.com/@${profile.tiktok.replace('@','')}" target="_blank" style="color:#000;font-size:1.1rem;"><i class="fab fa-tiktok"></i></a>`);
            if (user.whatsapp || profile.whatsapp) {
                const wa = profile.whatsapp || user.whatsapp;
                socials.push(`<a href="https://wa.me/${wa.replace(/[^0-9]/g,'')}" target="_blank" style="color:#25d366;font-size:1.1rem;"><i class="fab fa-whatsapp"></i></a>`);
            }

            container.innerHTML = `
                <div style="display:flex;align-items:center;gap:20px;padding:24px;flex-wrap:wrap;">
                    ${avatarHTML}
                    <div style="flex:1;min-width:200px;">
                        <h3 style="margin:0 0 4px 0;font-size:1.2rem;color:#1e293b;">${profile.store_name || user.name || 'Vendedor'}</h3>
                        <p style="margin:0 0 8px 0;color:#64748b;font-size:0.88rem;">${user.email || ''}</p>
                        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                            <span style="background:#ecfdf5;color:#065f46;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">ID: ${sellerId}</span>
                            ${user.phone ? `<span style="color:#64748b;font-size:0.82rem;"><i class="fas fa-phone"></i> ${user.phone}</span>` : ''}
                            ${socials.length ? `<span style="display:flex;gap:8px;margin-left:8px;">${socials.join(' ')}</span>` : ''}
                        </div>
                    </div>
                </div>
                ${profile.description ? `<div style="padding:0 24px 20px 24px;color:#475569;font-size:0.88rem;line-height:1.6;border-top:1px solid #f1f5f9;padding-top:16px;margin:0 24px 20px 24px;">${profile.description}</div>` : ''}
                <div style="display:flex;gap:12px;padding:0 24px 20px 24px;flex-wrap:wrap;">
                    <div style="background:#f0fdf4;padding:10px 16px;border-radius:10px;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-building" style="color:#059669;"></i>
                        <span style="font-size:0.82rem;color:#065f46;font-weight:600;" id="sellerBizCount">—</span>
                    </div>
                    <div style="background:#fef3c7;padding:10px 16px;border-radius:10px;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-box" style="color:#d97706;"></i>
                        <span style="font-size:0.82rem;color:#92400e;font-weight:600;" id="sellerProdCount">—</span>
                    </div>
                    <div style="background:#ede9fe;padding:10px 16px;border-radius:10px;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-briefcase" style="color:#7c3aed;"></i>
                        <span style="font-size:0.82rem;color:#5b21b6;font-weight:600;" id="sellerJobCount">—</span>
                    </div>
                    <div style="background:#dbeafe;padding:10px 16px;border-radius:10px;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-home" style="color:#2563eb;"></i>
                        <span style="font-size:0.82rem;color:#1e40af;font-weight:600;" id="sellerPropCount">—</span>
                    </div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<div style="text-align:center;padding:24px;color:#dc2626;"><i class="fas fa-exclamation-circle"></i> Error al cargar perfil: ${err.message}</div>`;
        }
    }

    // ─── Load Seller Publications ──────────────────────────────
    async function loadSellerPublicationsView(sellerId) {
        const container = document.getElementById('sellerPublicationsContent');
        if (!container) return;

        try {
            const data = await api.get(`/seller-publications?seller_id=${sellerId}`);
            const totals = data.totals || {};

            // Update count badges
            const bizCount = document.getElementById('sellerBizCount');
            const prodCount = document.getElementById('sellerProdCount');
            const jobCount = document.getElementById('sellerJobCount');
            const propCount = document.getElementById('sellerPropCount');
            if (bizCount) bizCount.textContent = `${totals.businesses || 0} Negocios`;
            if (prodCount) prodCount.textContent = `${totals.products || 0} Productos`;
            if (jobCount) jobCount.textContent = `${totals.jobs || 0} Empleos`;
            if (propCount) propCount.textContent = `${totals.properties || 0} Inmuebles`;

            const businesses = data.businesses || [];
            const products = data.products || [];
            const jobs = data.jobs || [];
            const properties = data.properties || [];

            let html = '';

            // Businesses
            if (businesses.length > 0) {
                html += `<div style="margin-bottom:20px;">
                    <h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#1e293b;"><i class="fas fa-building" style="color:#059669;"></i> Negocios (${businesses.length})</h4>
                    <div class="admin-table-responsive">
                        <table class="admin-table">
                            <thead><tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Estatus</th><th>Vistas</th><th>Fecha</th></tr></thead>
                            <tbody>${businesses.map(b => `
                                <tr>
                                    <td style="font-weight:600;font-size:0.85rem;">${b.title || '--'}</td>
                                    <td style="font-size:0.82rem;color:#64748b;">${b.category_name || '--'}</td>
                                    <td style="font-size:0.82rem;">${b.state || '--'}</td>
                                    <td><span class="badge ${b.status === 'approved' ? 'badge-success' : b.status === 'pending' ? 'badge-warning' : 'badge-danger'}">${b.status === 'approved' ? 'Publicado' : b.status === 'pending' ? 'Pendiente' : 'Rechazado'}</span></td>
                                    <td style="font-size:0.82rem;text-align:center;">${b.views || 0}</td>
                                    <td style="font-size:0.8rem;color:#94a3b8;">${formatDate(b.created_at)}</td>
                                </tr>
                            `).join('')}</tbody>
                        </table>
                    </div>
                </div>`;
            }

            // Products
            if (products.length > 0) {
                html += `<div style="margin-bottom:20px;">
                    <h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#1e293b;"><i class="fas fa-box" style="color:#d97706;"></i> Productos (${products.length})</h4>
                    <div class="admin-table-responsive">
                        <table class="admin-table">
                            <thead><tr><th>Producto</th><th>Precio</th><th>Categoría</th><th>Estatus</th><th>Fecha</th></tr></thead>
                            <tbody>${products.map(p => `
                                <tr>
                                    <td style="font-weight:600;font-size:0.85rem;">${p.name || '--'}</td>
                                    <td style="font-size:0.85rem;font-weight:700;color:#059669;">$${Number(p.price || 0).toFixed(2)}</td>
                                    <td style="font-size:0.82rem;color:#64748b;">${p.category || '--'}</td>
                                    <td><span class="badge ${p.status === 'approved' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-danger'}">${p.status === 'approved' ? 'Publicado' : p.status === 'pending' ? 'Pendiente' : 'Rechazado'}</span></td>
                                    <td style="font-size:0.8rem;color:#94a3b8;">${formatDate(p.created_at)}</td>
                                </tr>
                            `).join('')}</tbody>
                        </table>
                    </div>
                </div>`;
            }

            // Jobs
            if (jobs.length > 0) {
                html += `<div style="margin-bottom:20px;">
                    <h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#1e293b;"><i class="fas fa-briefcase" style="color:#7c3aed;"></i> Empleos (${jobs.length})</h4>
                    <div class="admin-table-responsive">
                        <table class="admin-table">
                            <thead><tr><th>Título</th><th>Tipo</th><th>Estado</th><th>Estatus</th><th>Vistas</th><th>Fecha</th></tr></thead>
                            <tbody>${jobs.map(j => `
                                <tr>
                                    <td style="font-weight:600;font-size:0.85rem;">${j.title || '--'}</td>
                                    <td style="font-size:0.82rem;color:#64748b;">${j.job_type || '--'}</td>
                                    <td style="font-size:0.82rem;">${j.state || '--'}</td>
                                    <td><span class="badge ${j.status === 'approved' ? 'badge-success' : j.status === 'pending' ? 'badge-warning' : 'badge-danger'}">${j.status === 'approved' ? 'Publicado' : j.status === 'pending' ? 'Pendiente' : 'Rechazado'}</span></td>
                                    <td style="font-size:0.82rem;text-align:center;">${j.views || 0}</td>
                                    <td style="font-size:0.8rem;color:#94a3b8;">${formatDate(j.created_at)}</td>
                                </tr>
                            `).join('')}</tbody>
                        </table>
                    </div>
                </div>`;
            }

            // Properties
            if (properties.length > 0) {
                html += `<div style="margin-bottom:20px;">
                    <h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#1e293b;"><i class="fas fa-home" style="color:#2563eb;"></i> Inmuebles (${properties.length})</h4>
                    <div class="admin-table-responsive">
                        <table class="admin-table">
                            <thead><tr><th>Título</th><th>Tipo</th><th>Operación</th><th>Precio</th><th>Estatus</th><th>Fecha</th></tr></thead>
                            <tbody>${properties.map(p => `
                                <tr>
                                    <td style="font-weight:600;font-size:0.85rem;">${p.title || '--'}</td>
                                    <td style="font-size:0.82rem;color:#64748b;">${p.property_type || '--'}</td>
                                    <td style="font-size:0.82rem;">${p.operation_type || '--'}</td>
                                    <td style="font-size:0.85rem;font-weight:700;color:#059669;">$${Number(p.price || 0).toFixed(2)}</td>
                                    <td><span class="badge ${p.status === 'approved' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-danger'}">${p.status === 'approved' ? 'Publicado' : p.status === 'pending' ? 'Pendiente' : 'Rechazado'}</span></td>
                                    <td style="font-size:0.8rem;color:#94a3b8;">${formatDate(p.created_at)}</td>
                                </tr>
                            `).join('')}</tbody>
                        </table>
                    </div>
                </div>`;
            }

            // Empty state
            if (!html) {
                html = `<div style="text-align:center;padding:40px;color:#94a3b8;">
                    <i class="fas fa-inbox" style="font-size:2rem;"></i>
                    <p style="margin-top:8px;">Este vendedor no tiene publicaciones aún.</p>
                </div>`;
            }

            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<div style="text-align:center;padding:24px;color:#dc2626;"><i class="fas fa-exclamation-circle"></i> Error al cargar publicaciones: ${err.message}</div>`;
        }
    }

    // ─── Create Seller ─────────────────────────────────────────
    async function createSeller() {
        const name = document.getElementById('newSellerName')?.value?.trim();
        const email = document.getElementById('newSellerEmail')?.value?.trim();
        const password = document.getElementById('newSellerPassword')?.value;
        const phone = document.getElementById('newSellerPhone')?.value?.trim();
        const whatsapp = document.getElementById('newSellerWhatsapp')?.value?.trim();

        if (!name || !email || !password) {
            if (window.showToast) window.showToast('Nombre, email y contraseña son requeridos', 'error');
            return;
        }

        const saveBtn = document.getElementById('createSellerModalSave');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
        }

        try {
            await api.post('/sellers', { name, email, password, phone, whatsapp });
            if (window.showToast) window.showToast('Vendedor creado exitosamente', 'success');
            document.getElementById('adminCreateSellerModal')?.classList.add('hidden');
            // Reset form
            const form = document.getElementById('createSellerForm');
            if (form) form.reset();
            // Reload list
            loadSellersList();
        } catch (err) {
            if (window.showToast) window.showToast(err.message || 'Error al crear vendedor', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Crear Vendedor';
            }
        }
    }

    // ─── Pagination ────────────────────────────────────────────
    function goToPage(page) {
        sellersPage = page;
        loadSellersList();
    }

    // ─── Helpers ───────────────────────────────────────────────
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) { return dateStr; }
    }

    // Expose
    window.adminSellerPanel = {
        viewSeller,
        viewSellerPublications,
        goToPage,
    };

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();