/**
 * Un Click - Dashboard Module
 * Handles user dashboard and admin panel functionality
 */

// Simple HTML escape helper (used inside IIFE)
function _dashEscapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Self-contained edit business modal opener — completely outside the IIFE
// so it works even if the IIFE has errors.
function _openEditBizModal(id) {
    if (!id) return;
    var modal = document.getElementById('editBusinessModal');
    var loading = document.getElementById('editBizLoading');
    var form = document.getElementById('editBizForm');
    if (!modal) return;
    modal.classList.remove('hidden');
    if (loading) loading.style.display = '';
    if (form) form.style.display = 'none';

    // Reset
    document.querySelectorAll('#editBizFeatures .eb-feature').forEach(function(f) { f.classList.remove('checked'); });
    window._editBizVideos = [];

    var token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    fetch('/api/businesses/' + id, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    })
    .then(function(data) {
        var biz = data.business || data;
        if (form) {
            var el = function(eid, val) { var ee = document.getElementById(eid); if (ee && val) ee.value = val; };
            el('editBizId', biz.id);
            el('editBizTitle', biz.title);
            el('editBizDesc', biz.description);
            el('editBizCat', biz.category_slug || '');
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

            // Logo
            if (biz.logo) {
                var logoSection = form.querySelector('.eb-logo-section');
                if (logoSection) {
                    var logoImg = logoSection.querySelector('.edit-biz-logo-img');
                    var logoIcon = logoSection.querySelector('.edit-biz-logo-icon');
                    var logoRemove = logoSection.querySelector('.edit-biz-logo-remove-btn');
                    if (logoImg) { logoImg.src = biz.logo; logoImg.style.display = 'block'; }
                    if (logoIcon) logoIcon.style.display = 'none';
                    if (logoRemove) logoRemove.style.display = 'inline-flex';
                    var logoUrlInput = logoSection.querySelector('.edit-biz-logo-url');
                    if (logoUrlInput) logoUrlInput.value = biz.logo;
                }
            }
            // Banner
            if (biz.banner) {
                var bannerSection = form.querySelector('.eb-banner-section');
                if (bannerSection) {
                    bannerSection.querySelector('.edit-biz-banner-preview').innerHTML = '<img src="' + biz.banner + '" style="width:100%;height:100%;object-fit:cover;">';
                    var bRemove = bannerSection.querySelector('.edit-biz-banner-remove-btn');
                    if (bRemove) bRemove.style.display = 'inline-flex';
                    var bUrl = bannerSection.querySelector('.edit-biz-banner-url');
                    if (bUrl) bUrl.value = biz.banner;
                }
            }
            // Video (multi)
            if (biz.video_url) {
                var urls = window._parseVideoUrls(biz.video_url);
                urls.forEach(function(u) {
                    if (u) window._editBizVideos.push({ url: u, type: 'url' });
                });
            }
            window._renderVideoList('ebVideosList');
            // Features
            var features = biz.features || biz.caracteristicas || '';
            var featList = typeof features === 'string' ? features.split(',') : features;
            document.querySelectorAll('#editBizFeatures .eb-feature').forEach(function(f) {
                if (featList.indexOf(f.dataset.feature) !== -1) f.classList.add('checked');
            });
        }
        if (loading) loading.style.display = 'none';
        if (form) form.style.display = '';
    })
    .catch(function(err) {
        if (loading) loading.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444;"></i><p>Error al cargar datos del negocio</p>';
    });
}

// Global function for all callers (inline onclick, CustomEvent, etc.)
// ─── Multi-video helpers (global, used by all edit modals) ──────
window._editBizVideos = []; // array of { url, type:'url'|'file' }

window._parseVideoUrls = function(video_url) {
    if (!video_url) return [];
    if (video_url.startsWith('[')) {
        try { return JSON.parse(video_url); } catch(e) { return [video_url]; }
    }
    return [video_url];
};

window._getVideoUrlsJSON = function() {
    return JSON.stringify(window._editBizVideos.map(function(v) { return v.url; }));
};

window._renderVideoList = function(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    window._editBizVideos.forEach(function(v, i) {
        var item = document.createElement('div');
        item.className = 'eb-video-item';
        var label = v.url.length > 60 ? v.url.substring(0, 60) + '...' : v.url;
        if (v.type === 'file') {
            var m = v.url.match(/([^/]+)$/);
            label = m ? m[1] : v.url;
        }
        item.innerHTML = '<span class="eb-video-item-num">' + (i + 1) + '</span>' +
            '<span class="eb-video-item-text" title="' + v.url.replace(/"/g, '&quot;') + '">' + label + '</span>' +
            '<button type="button" class="eb-video-item-remove" data-idx="' + i + '"><i class="fas fa-times"></i></button>';
        item.querySelector('.eb-video-item-remove').addEventListener('click', function() {
            window._editBizVideos.splice(i, 1);
            window._renderVideoList(containerId);
        });
        container.appendChild(item);
    });
};

window._removeEditBizVideo = function(idx) {
    window._editBizVideos.splice(idx, 1);
};

// Add video URL from input (dashboard edit modal)
window.addEditBizVideoUrl = function() {
    var input = document.getElementById('editBizVideoUrl');
    if (!input) return;
    var url = input.value.trim();
    if (!url) return;
    window._editBizVideos.push({ url: url, type: 'url' });
    input.value = '';
    window._renderVideoList('ebVideosList');
};

window.openEditBusinessModal = _openEditBizModal;
window.closeEditBusinessModal = function() {
    var modal = document.getElementById('editBusinessModal');
    if (modal) modal.classList.add('hidden');
};

(function () {
    'use strict';

    // Alias for HTML escaping inside this IIFE
    var escapeHtml = _dashEscapeHtml;

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
    const adminTabSettings = document.getElementById('adminTabSettings');
    const adminUsersBody = document.getElementById('adminUsersBody');
    const adminUsersSearchInput = document.getElementById('adminUsersSearchInput');
    let adminPremiumBadge = null;

    // ─── Initialize ─────────────────────────────────────────────
    async function initDashboard() {
        if (!requireAuth()) return;

        // Load current user
        currentUser = await getCurrentUser();
        if (!currentUser) {
            removeToken();
            window.location.href = '/login.html';
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

        // NOTE: setupPremiumModal() and updatePlanDisplay() are called
        //       after their const declarations (see near line 2160)

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
        // Set profile partner link
        var profileLink = document.getElementById('sidebarProfileLink');
        if (profileLink && currentUser.id) {
            profileLink.href = '/perfil.html?id=' + currentUser.id;
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

            // Edit Profile CTA — show for each approved business (or first business if none approved)
            const editProfileCTA = document.getElementById('editProfileCTA');
            const editProfileBizName = document.getElementById('editProfileBizName');
            const editProfileBizStatus = document.getElementById('editProfileBizStatus');
            const editProfileBtn = document.getElementById('editProfileBtn');
            const editProfileViewBtn = document.getElementById('editProfileViewBtn');
            if (editProfileCTA && userProperties.length > 0) {
                // Prefer first approved business, fall back to first of any status
                const primaryBiz = approvedProps[0] || userProperties[0];
                const statusLabels = { approved: 'Activo', pending: 'Pendiente de aprobacion', rejected: 'Rechazado' };
                editProfileBizName.textContent = primaryBiz.title || 'Mi Negocio';
                editProfileBizStatus.textContent = statusLabels[primaryBiz.status] || primaryBiz.status;
                editProfileBtn.onclick = function() { window.openEditBusinessModal(primaryBiz.id); };
                editProfileViewBtn.href = '/negocio/' + (primaryBiz.slug || primaryBiz.id);
                editProfileCTA.style.display = '';

                // If multiple businesses, show a small selector
                if (userProperties.length > 1) {
                    const selectorWrap = document.createElement('div');
                    selectorWrap.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid #8B0000;';
                    selectorWrap.innerHTML = '<p style="margin:0 0 8px;font-size:0.8rem;color:#8B0000;font-weight:600;">Tambien puedes editar:</p><div style="display:flex;gap:8px;flex-wrap:wrap;" id="editProfileOtherBiz"></div>';
                    editProfileCTA.appendChild(selectorWrap);
                    const otherWrap = document.getElementById('editProfileOtherBiz');
                    userProperties.forEach(b => {
                        if (b.id === primaryBiz.id) return;
                        const chip = document.createElement('button');
                        chip.className = 'btn btn-secondary btn-sm';
                        chip.style.cssText = 'font-size:0.82rem;border-radius:8px;';
                        chip.innerHTML = '<i class="fas fa-pen" style="font-size:0.7rem;"></i> ' + (b.title || 'Negocio');
                        chip.onclick = function() { window.openEditBusinessModal(b.id); };
                        otherWrap.appendChild(chip);
                    });
                }
            }

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
                    recentPropsBody.innerHTML = recent.map(p => {
                        var isExp = p.expires_at && new Date(p.expires_at) < new Date();
                        var expBadge = isExp ? ' <span style="font-size:0.68rem;background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:10px;font-weight:600;margin-left:4px;">Expirado</span>' : '';
                        return `
                        <tr style="${isExp ? 'opacity:0.65;' : ''}">
                            <td>
                                <div class="dash-prop-name">
                                    ${(p.cover_image || p.image_count > 0) ? `<img src="${p.cover_image || ''}" alt="" class="dash-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image dash-thumb-placeholder"></i>'}
                                    <span>${truncateText(p.title, 35)}</span>
                                </div>
                            </td>
                            <td>${getBusinessTypeLabel(p.business_type)}</td>
                            <td class="dash-price">${formatPrice(p.price, p.currency)}</td>
                            <td>${getStatusBadge(p.status)}${expBadge}</td>
                            <td>${p.views || 0}</td>
                            <td class="dash-actions">
                                ${isExp && p.status === 'approved' ? `<button class="btn-icon" onclick="republishBusiness(${p.id})" title="Republicar" style="color:#059669;"><i class="fas fa-redo"></i></button>` : ''}
                                <a href="/negocio/${p.slug || p.id}" class="btn-icon" title="Ver"><i class="fas fa-eye"></i></a>
                                <a onclick="openEditBusinessModal(${p.id})" class="btn-icon" title="Editar"><i class="fas fa-edit"></i></button>
                                <button class="btn-icon btn-icon-danger" onclick="confirmDeleteBusiness(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`;
                    }).join('');
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
                    allPropsBody.innerHTML = userProperties.map(p => {
                        var isExpired = p.expires_at && new Date(p.expires_at) < new Date();
                        var expiredBadge = isExpired ? ' <span style="font-size:0.68rem;background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:10px;font-weight:600;margin-left:4px;">Expirado</span>' : '';
                        var statusHtml = getStatusBadge(p.status) + expiredBadge;
                        return `
                        <tr style="${isExpired ? 'opacity:0.65;' : ''}">
                            <td>
                                ${(p.cover_image || p.image_count > 0) ? `<img src="${p.cover_image || ''}" alt="" class="dash-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image dash-thumb-placeholder"></i>'}
                            </td>
                            <td>${truncateText(p.title, 30)}</td>
                            <td>${getBusinessTypeLabel(p.business_type)}</td>
                            <td>${p.city || '--'}, ${p.state || '--'}</td>
                            <td>${statusHtml}</td>
                            <td>${p.views || 0}</td>
                            <td class="dash-actions">
                                ${isExpired && p.status === 'approved' ? `<button class="btn-icon" onclick="republishBusiness(${p.id})" title="Republicar" style="color:#059669;"><i class="fas fa-redo"></i></button>` : ''}
                                <button class="btn-icon" onclick="openServicesManager(${p.id}, '${escapeAttr(p.title)}')" title="Servicios"><i class="fas fa-concierge-bell" style="color:#f59e0b;"></i></button>
                                <a href="/negocio/${p.slug || p.id}" class="btn-icon" title="Ver"><i class="fas fa-eye"></i></a>
                                <a onclick="openEditBusinessModal(${p.id})" class="btn-icon" title="Editar"><i class="fas fa-edit"></i></button>
                                <button class="btn-icon btn-icon-danger" onclick="confirmDeleteBusiness(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`;
                    }).join('');
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

    // ─── Republish Functions ──────────────────────────────────
    window.republishBusiness = async function(id) {
        if (!confirm('Quieres republicar este negocio? Volvera a aparecer en las primeras posiciones por 20 dias.')) return;
        try {
            await api.post('/businesses/' + id + '/republish', {});
            showToast('Negocio republicado exitosamente. Volvera a aparecer en las primeras posiciones.', 'success');
            const activeSection = document.querySelector('.sidebar-link.active');
            if (activeSection) switchSection(activeSection.dataset.section);
            else loadOverviewData();
        } catch (error) {
            showToast(error.message || 'Error al republicar', 'error');
        }
    };

    window.republishProduct = async function(id) {
        if (!confirm('Quieres republicar este producto? Volvera a aparecer en las primeras posiciones por 20 dias.')) return;
        try {
            await api.post('/marketplace/' + id + '/republish', {});
            showToast('Producto republicado exitosamente.', 'success');
            loadMyProducts();
        } catch (error) {
            showToast(error.message || 'Error al republicar', 'error');
        }
    };

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
                        <div style="text-align:center;padding:32px 0;color:#8B0000;">
                            <i class="fas fa-box-open" style="font-size:2.5rem;color:#8B0000;"></i>
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
                        <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#8B0000,#8B0000);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-store" style="color:#fff;font-size:0.8rem;"></i>
                        </div>
                        ${slug ? `<a href="/negocio/${slug}" style="color:#8B0000;text-decoration:none;font-weight:700;">${title}</a>` : `<span style="color:#8B0000;font-weight:700;">${title}</span>`}
                    </h3>
                    <span style="font-size:0.75rem;color:#8B0000;background:#8B0000;padding:4px 10px;border-radius:12px;">${products.length} producto${products.length > 1 ? 's' : ''}</span>
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
            var isProdExpired = p.expires_at && new Date(p.expires_at) < new Date();
            var prodExpBadge = isProdExpired ? ' <span style="font-size:0.68rem;background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:10px;font-weight:600;margin-left:4px;">Expirado</span>' : '';
            html += `
                                <tr style="${isProdExpired ? 'opacity:0.65;' : ''}">
                                    <td><div class="dash-prop-name">${p.image ? `<img src="${p.image}" class="dash-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image dash-thumb-placeholder"></i>'}<span>${p.name || 'Sin nombre'}</span></div></td>
                                    <td>${p.category || 'General'}</td>
                                    <td class="dash-price">$${Number(p.price || 0).toLocaleString('es-VE')}</td>
                                    <td>${statusLabel}${prodExpBadge}</td>
                                    <td>${formatDate(p.created_at)}</td>
                                    <td class="dash-actions">
                                        ${isProdExpired && (p.status === 'approved' || !p.status) ? `<button class="btn-icon" onclick="republishProduct(${p.id})" title="Republicar" style="color:#059669;"><i class="fas fa-redo"></i></button>` : ''}
                                        <button class="btn-icon" onclick="editProduct(${p.id})" title="Editar" style="color:#8B0000;"><i class="fas fa-pen"></i></button>
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

        function resetModal() {
            modal.classList.add('hidden');
            editingProductId = null;
            form.reset();
            productImageUrls = [];
            if (window.syncProductImageField) window.syncProductImageField();
            const up = document.getElementById('prodUploadPreview');
            if (up) up.innerHTML = '';
            document.getElementById('prodVideoList').innerHTML = '<div class="profile-input-group" style="margin-bottom:8px;"><div class="profile-input-wrapper"><i class="fas fa-video"></i><input type="url" class="prod-video-url" placeholder="YouTube, TikTok o URL de video directo..."></div></div>';
            const mTitle = document.getElementById('productModalTitle');
            if (mTitle) mTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Publicar Producto';
            const mSave = document.getElementById('productModalSave');
            if (mSave) mSave.innerHTML = '<i class="fas fa-save"></i> Publicar';
        }

        if (close) close.addEventListener('click', resetModal);
        if (cancel) cancel.addEventListener('click', resetModal);
        if (overlay) overlay.addEventListener('click', resetModal);

        if (save) save.addEventListener('click', async () => {
            if (!form.checkValidity()) { form.reportValidity(); return; }

            // Validate business selection (only for new products)
            const businessSelect = document.getElementById('prodBusiness');
            const businessId = businessSelect ? businessSelect.value : '';
            if (!editingProductId && !businessId) {
                showToast('Debes seleccionar un negocio. Si no tienes uno, regístralo primero desde "Nuevo Negocio".', 'error');
                return;
            }

            try {
                const fd = new FormData(form);
                const rawImage = (productImageUrls.length > 0) ? JSON.stringify(productImageUrls) : (fd.get('image') || '');
                // Send all images as JSON array (first is main)
                let finalImage = rawImage;
                try {
                    const parsed = JSON.parse(rawImage);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        finalImage = JSON.stringify(parsed); // Keep full array
                    }
                } catch(e) {
                    // Not JSON, use as-is (single URL)
                }
                // Collect all video URLs
                const videoUrls = [];
                document.querySelectorAll('#prodVideoList .prod-video-url').forEach(inp => {
                    const v = (inp.value || '').trim();
                    if (v) videoUrls.push(v);
                });
                const body = {
                    name: fd.get('name'),
                    price: parseFloat(fd.get('price')) || 0,
                    category: fd.get('category') || 'general',
                    image: finalImage,
                    description: fd.get('description') || '',
                    video_url: videoUrls.length > 0 ? JSON.stringify(videoUrls) : '',
                };

                if (editingProductId) {
                    // UPDATE existing product
                    await api.put(`/marketplace/${editingProductId}`, body);
                    showToast('Producto actualizado correctamente', 'success');
                } else {
                    // CREATE new product
                    body.business_id = parseInt(businessId);
                    await api.post('/marketplace', body);
                    showToast('Producto enviado para aprobación. Será visible una vez aprobado por un administrador.', 'success');
                }
                modal.classList.add('hidden');
                form.reset();
                productImageUrls = [];
                editingProductId = null;
                if (window.syncProductImageField) window.syncProductImageField();
                const up = document.getElementById('prodUploadPreview');
                if (up) up.innerHTML = '';
                // Reset video list to single input
                document.getElementById('prodVideoList').innerHTML = '<div class="profile-input-group" style="margin-bottom:8px;"><div class="profile-input-wrapper"><i class="fas fa-video"></i><input type="url" class="prod-video-url" placeholder="YouTube, TikTok o URL de video directo..."></div></div>';
                // Reset modal title and button
                const mTitle = document.getElementById('productModalTitle');
                if (mTitle) mTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Publicar Producto';
                const mSave = document.getElementById('productModalSave');
                if (mSave) mSave.innerHTML = '<i class="fas fa-save"></i> Publicar';
                loadMyProducts();
            } catch (error) {
                showToast(error.message || 'Error al publicar producto', 'error');
            }
        });

        // ─── Image Upload Handler ─────────────────────────
        const imageFileInput = document.getElementById('prodImageFile');
        const attachFileInput = document.getElementById('prodAttachFile');
        const uploadProgress = document.getElementById('prodUploadProgress');

        function handleImageUpload(file) {
            if (!file) return;
            
            // Validate it's an image
            if (!file.type.startsWith('image/')) {
                showToast('Solo se permiten imágenes', 'error');
                return;
            }
            
            // Show preview
            const reader = new FileReader();
            reader.onload = function(e) {
                const up = document.getElementById('prodUploadPreview');
                if (up) {
                    if (productImageUrls.length === 0) up.innerHTML = '';
                    const div = document.createElement('div');
                    div.className = 'prod-upload-preview';
                    div.style.cssText = 'display:inline-block;position:relative;margin:4px;';
                    div.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:2px solid #8B0000;">
                        <button type="button" onclick="this.parentElement.remove()" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:0.7rem;cursor:pointer;">&times;</button>`;
                    up.appendChild(div);
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
                    productImageUrls.push(data.url);
                    if (window.syncProductImageField) window.syncProductImageField();
                    showToast(`Imagen subida (${productImageUrls.length} en total)`, 'success');
                } else {
                    showToast(data.error || 'Error al subir imagen', 'error');
                }
            })
            .catch(err => {
                if (uploadProgress) uploadProgress.classList.add('hidden');
                showToast('Error de conexión al subir imagen', 'error');
            });
        }

        function handleMultipleImageUpload(files) {
            if (!files || files.length === 0) return;
            const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
            if (imageFiles.length === 0) { showToast('Solo se permiten imágenes', 'error'); return; }
            if (imageFiles.length > 5) { showToast('Máximo 5 imágenes por producto', 'error'); return; }

            if (uploadProgress) uploadProgress.classList.remove('hidden');
            let uploadedCount = 0;
            const allUrls = [];

            imageFiles.forEach((file, idx) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const up = document.getElementById('prodUploadPreview');
                    if (up) {
                        if (idx === 0 && productImageUrls.length === 0) up.innerHTML = '';
                        const div = document.createElement('div');
                        div.className = 'prod-upload-preview';
                        div.style.cssText = 'display:inline-block;position:relative;margin:4px;';
                        div.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:2px solid #8B0000;">
                            <button type="button" onclick="this.parentElement.remove()" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:0.7rem;cursor:pointer;">&times;</button>`;
                        up.appendChild(div);
                    }
                };
                reader.readAsDataURL(file);

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
                    uploadedCount++;
                    if (data.url) allUrls.push(data.url);
                    if (uploadedCount === imageFiles.length) {
                        if (uploadProgress) uploadProgress.classList.add('hidden');
                        if (allUrls.length > 0) {
                            allUrls.forEach(u => productImageUrls.push(u));
                            if (window.syncProductImageField) window.syncProductImageField();
                            showToast(`${productImageUrls.length} imagen(es) en total`, 'success');
                        }
                    }
                })
                .catch(() => {
                    uploadedCount++;
                    if (uploadedCount === imageFiles.length) {
                        if (uploadProgress) uploadProgress.classList.add('hidden');
                    }
                });
            });
        }
        
        if (imageFileInput) {
            imageFileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files.length > 1) {
                    handleMultipleImageUpload(files);
                } else if (files.length === 1) {
                    handleImageUpload(files[0]);
                }
                imageFileInput.value = '';
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
        editingProductId = null;
        // Reset modal title and button
        const mTitle = document.getElementById('productModalTitle');
        if (mTitle) mTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Publicar Producto';
        const mSave = document.getElementById('productModalSave');
        if (mSave) mSave.innerHTML = '<i class="fas fa-save"></i> Publicar';
        if (window.resetProductImages) window.resetProductImages();
        document.getElementById('prodVideoList').innerHTML = '<div class="profile-input-group" style="margin-bottom:8px;"><div class="profile-input-wrapper"><i class="fas fa-video"></i><input type="url" class="prod-video-url" placeholder="YouTube, TikTok o URL de video directo..."></div></div>';
        
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

    // ─── Edit Product ─────────────────────────────────────
    let editingProductId = null;
    let productImageUrls = []; // Shared array for product images (create + edit)

    window.syncProductImageField = function() {
        const inp = document.getElementById('prodImage');
        const val = productImageUrls.length > 0 ? JSON.stringify(productImageUrls) : '';
        if (inp) inp.value = val;
    };

    window.resetProductImages = function() {
        productImageUrls = [];
        window.syncProductImageField();
        const up = document.getElementById('prodUploadPreview');
        if (up) up.innerHTML = '';
    };

    window.editProduct = async function (id) {
        try {
            const data = await api.get(`/marketplace/${id}`);
            const p = data.product;
            if (!p) { showToast('Producto no encontrado', 'error'); return; }

            editingProductId = id;
            const modal = document.getElementById('productModal');
            modal.classList.remove('hidden');

            // Update title
            const title = document.getElementById('productModalTitle');
            if (title) title.innerHTML = '<i class="fas fa-pen"></i> Editar Producto';

            // Update save button
            const saveBtn = document.getElementById('productModalSave');
            if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';

            // Fill form fields
            document.getElementById('prodName').value = p.name || '';
            document.getElementById('prodPrice').value = p.price || '';
            document.getElementById('prodCategory').value = p.category || 'general';
            document.getElementById('prodDescription').value = p.description || '';

            // Load businesses and select the right one
            try {
                const user = getCachedUser();
                const businessesData = await api.get(`/businesses?user_id=${user.id}&limit=50`);
                const businesses = businessesData.businesses || businessesData.results || businessesData || [];
                const select = document.getElementById('prodBusiness');
                if (select) {
                    select.innerHTML = '<option value="">Publicar como usuario independiente</option>';
                    businesses.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.id;
                        opt.textContent = b.title || b.name || `Negocio #${b.id}`;
                        if (String(b.id) === String(p.business_id)) opt.selected = true;
                        select.appendChild(opt);
                    });
                    select.disabled = false;
                }
            } catch(e) { console.log('Could not load businesses:', e); }

            // Parse existing images into the array
            let existingImages = [];
            try {
                const parsed = JSON.parse(p.image || '[]');
                if (Array.isArray(parsed)) existingImages = parsed.filter(u => u && u.trim());
            } catch(e) {
                if (p.image && p.image.trim()) existingImages = [p.image];
            }
            productImageUrls = [...existingImages];
            window.syncProductImageField();

            // Show existing image previews with delete buttons
            const preview = document.getElementById('prodUploadPreview');
            if (preview) {
                preview.innerHTML = '';
                productImageUrls.forEach((url, idx) => {
                    const div = document.createElement('div');
                    div.className = 'prod-upload-preview';
                    div.style.cssText = 'display:inline-block;position:relative;margin:4px;';
                    div.dataset.imgIndex = idx;
                    div.innerHTML = `<img src="${url}" alt="Foto ${idx+1}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:2px solid ${idx===0?'#8B0000':'#8B0000'};" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23e2e8f0%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2254%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2212%22>Sin imagen</text></svg>'">
                        ${idx===0?'<span style="position:absolute;top:2px;left:2px;background:#8B0000;color:#fff;font-size:0.65rem;padding:1px 6px;border-radius:4px;">Principal</span>':''}
                        <button type="button" onclick="removeProductImage(${idx})" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:0.7rem;cursor:pointer;">&times;</button>`;
                    preview.appendChild(div);
                });
            }

            // Load existing videos
            let existingVideos = [];
            try {
                const parsed = JSON.parse(p.video_url || '[]');
                if (Array.isArray(parsed)) existingVideos = parsed.filter(v => v && v.trim());
            } catch(e) {
                if (p.video_url && p.video_url.trim()) existingVideos = [p.video_url];
            }
            const videoList = document.getElementById('prodVideoList');
            if (videoList) {
                if (existingVideos.length > 0) {
                    videoList.innerHTML = existingVideos.map(v => `
                        <div class="profile-input-group" style="margin-bottom:8px;display:flex;gap:6px;align-items:center;">
                            <div class="profile-input-wrapper" style="flex:1;"><i class="fas fa-video"></i>
                            <input type="url" class="prod-video-url" value="${v}" placeholder="URL de video...">
                            </div>
                            <button type="button" onclick="this.parentElement.remove()" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('');
                } else {
                    videoList.innerHTML = '<div class="profile-input-group" style="margin-bottom:8px;"><div class="profile-input-wrapper"><i class="fas fa-video"></i><input type="url" class="prod-video-url" placeholder="YouTube, TikTok o URL de video directo..."></div></div>';
                }
            }

        } catch (error) {
            console.error('Error loading product for edit:', error);
            showToast(error.message || 'Error al cargar producto', 'error');
        }
    };

    window.removeProductImage = function(idx) {
        if (idx >= 0 && idx < productImageUrls.length) {
            productImageUrls.splice(idx, 1);
            window.syncProductImageField();
            // Re-render previews
            const preview = document.getElementById('prodUploadPreview');
            if (preview) {
                preview.innerHTML = '';
                productImageUrls.forEach((url, i) => {
                    const div = document.createElement('div');
                    div.className = 'prod-upload-preview';
                    div.style.cssText = 'display:inline-block;position:relative;margin:4px;';
                    div.innerHTML = `<img src="${url}" alt="Foto ${i+1}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:2px solid ${i===0?'#8B0000':'#8B0000'};" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23e2e8f0%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2254%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2212%22>Sin imagen</text></svg>'">
                        ${i===0?'<span style="position:absolute;top:2px;left:2px;background:#8B0000;color:#fff;font-size:0.65rem;padding:1px 6px;border-radius:4px;">Principal</span>':''}
                        <button type="button" onclick="removeProductImage(${i})" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:0.7rem;cursor:pointer;">&times;</button>`;
                    preview.appendChild(div);
                });
            }
            showToast('Foto eliminada', 'success');
        }
    };

    // ─── Product: Add Video button ────────────────────────────
    const prodAddVideoBtn = document.getElementById('prodAddVideoBtn');
    if (prodAddVideoBtn) {
        prodAddVideoBtn.addEventListener('click', () => {
            const list = document.getElementById('prodVideoList');
            const div = document.createElement('div');
            div.className = 'profile-input-group';
            div.style.cssText = 'margin-bottom:8px;display:flex;gap:6px;align-items:center;';
            div.innerHTML = '<div class="profile-input-wrapper" style="flex:1;"><i class="fas fa-video"></i><input type="url" class="prod-video-url" placeholder="Otro video..."></div><button type="button" onclick="this.parentElement.remove()" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-times"></i></button>';
            list.appendChild(div);
        });
    }

    // ─── Product: Upload Video File ────────────────────────
    const prodVideoFileInput = document.getElementById('prodVideoFile');
    if (prodVideoFileInput) {
        prodVideoFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const statusEl = document.getElementById('prodVideoUploadStatus');
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo video...';
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('product_type', 'video');
                const token = getToken();
                const resp = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: formData
                });
                const data = await resp.json();
                if (data.url) {
                    // Add as a new video URL row
                    const list = document.getElementById('prodVideoList');
                    const div = document.createElement('div');
                    div.className = 'profile-input-group';
                    div.style.cssText = 'margin-bottom:8px;display:flex;gap:6px;align-items:center;';
                    div.innerHTML = `<div class="profile-input-wrapper" style="flex:1;"><i class="fas fa-film"></i><input type="url" class="prod-video-url" value="${data.url}" readonly style="background:#f0fdf4;"><small style="position:absolute;bottom:-14px;left:30px;font-size:0.65rem;color:#16a34a;">Video adjuntado</small></div><button type="button" onclick="this.parentElement.remove()" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-times"></i></button>`;
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

    // ═══════════════════════════════════════════════════════════════
    // JOB MODAL
    // ═══════════════════════════════════════════════════════════════
    function setupJobModal() {
        const modal = document.getElementById('jobModal');
        if (!modal) return;

        const close = document.getElementById('jobModalClose');
        const cancel = document.getElementById('jobModalCancel');
        const overlay = modal.querySelector('.modal-overlay');
        const save = document.getElementById('jobModalSave');
        const quickAction = document.getElementById('quickActionJob');

        [close, cancel].forEach(el => { if (el) el.addEventListener('click', () => modal.classList.add('hidden')); });
        if (overlay) overlay.addEventListener('click', () => modal.classList.add('hidden'));
        if (quickAction) quickAction.addEventListener('click', (e) => { e.preventDefault(); openJobModal(); });

        // Add video button
        const addVideoBtn = document.getElementById('jobAddVideoBtn');
        if (addVideoBtn) {
            addVideoBtn.addEventListener('click', () => {
                const list = document.getElementById('jobVideoList');
                const div = document.createElement('div');
                div.className = 'profile-input-group';
                div.style.cssText = 'margin-bottom:8px;display:flex;gap:6px;align-items:center;';
                div.innerHTML = '<div class="profile-input-wrapper" style="flex:1;"><i class="fas fa-video"></i><input type="url" class="job-video-url" placeholder="Otro video..."></div><button type="button" onclick="this.parentElement.remove()" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.8rem;"><i class="fas fa-times"></i></button>';
                list.appendChild(div);
            });
        }

        // Image upload for jobs
        const jobImageInput = document.getElementById('jobImageFile');
        let jobUploadedUrls = [];
        if (jobImageInput) {
            jobImageInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
                if (files.length === 0) return;
                if (files.length > 5) { showToast('Máximo 5 imágenes', 'error'); return; }
                const preview = document.getElementById('jobUploadPreview');
                const progress = document.getElementById('jobUploadProgress');
                if (progress) progress.classList.remove('hidden');
                let count = 0;
                jobUploadedUrls = [];
                if (preview) preview.innerHTML = '';
                files.forEach((file, idx) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if (preview) {
                            const d = document.createElement('div');
                            d.style.cssText = 'position:relative;display:inline-block;';
                            d.innerHTML = `<img src="${ev.target.result}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid ${idx===0?'#8B0000':'#8B0000'};">
                                ${idx===0?'<span style="position:absolute;top:2px;left:2px;background:#8B0000;color:#fff;font-size:0.6rem;padding:1px 5px;border-radius:4px;">Principal</span>':''}
                                <button type="button" onclick="this.parentElement.remove()" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:0.65rem;cursor:pointer;">&times;</button>`;
                            preview.appendChild(d);
                        }
                    };
                    reader.readAsDataURL(file);
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('product_type', 'job');
                    const token = localStorage.getItem('meridaunclick_token') || localStorage.getItem('authToken');
                    fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd })
                    .then(r => r.json())
                    .then(data => {
                        count++;
                        if (data.url) jobUploadedUrls.push(data.url);
                        if (count === files.length) {
                            if (progress) progress.classList.add('hidden');
                            if (jobUploadedUrls.length > 0) showToast(`${jobUploadedUrls.length} imagen(es) subida(s)`, 'success');
                        }
                    })
                    .catch(() => { count++; if (count === files.length && progress) progress.classList.add('hidden'); });
                });
            });
        }

        // Save job
        if (save) save.addEventListener('click', async () => {
            const form = document.getElementById('jobForm');
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const businessSelect = document.getElementById('jobBusiness');
            if (!businessSelect.value) { showToast('Selecciona un negocio', 'error'); return; }
            const selectedOpt = businessSelect.options[businessSelect.selectedIndex];
            const companyName = selectedOpt ? selectedOpt.textContent : '';
            const videoUrls = [];
            document.querySelectorAll('#jobVideoList .job-video-url').forEach(inp => {
                const v = (inp.value || '').trim();
                if (v) videoUrls.push(v);
            });
            try {
                const body = {
                    title: document.getElementById('jobTitle').value.trim(),
                    job_type: document.getElementById('jobType').value,
                    salary: document.getElementById('jobSalary').value.trim() || null,
                    state: document.getElementById('jobState').value.trim(),
                    city: document.getElementById('jobCity').value.trim() || null,
                    description: document.getElementById('jobDescription').value.trim() || null,
                    requirements: document.getElementById('jobRequirements').value.trim() || null,
                    benefits: document.getElementById('jobBenefits').value.trim() || null,
                    contact_email: document.getElementById('jobEmail').value.trim() || null,
                    contact_phone: document.getElementById('jobPhone').value.trim() || null,
                    company_name: companyName,
                    images: jobUploadedUrls.length > 0 ? JSON.stringify(jobUploadedUrls) : null,
                    video_url: videoUrls.length > 0 ? JSON.stringify(videoUrls) : null,
                };
                await api.post('/jobs', body);
                showToast('Oferta de empleo enviada para aprobación.', 'success');
                modal.classList.add('hidden');
                form.reset();
                jobUploadedUrls = [];
                const preview = document.getElementById('jobUploadPreview');
                if (preview) preview.innerHTML = '';
                document.getElementById('jobVideoList').innerHTML = '<div class="profile-input-group" style="margin-bottom:8px;"><div class="profile-input-wrapper"><i class="fas fa-video"></i><input type="url" class="job-video-url" placeholder="YouTube, TikTok o URL de video..."></div></div>';
            } catch (error) {
                showToast(error.message || 'Error al publicar empleo', 'error');
            }
        });
    }

    window.openJobModal = async function () {
        const modal = document.getElementById('jobModal');
        if (modal) modal.classList.remove('hidden');
        try {
            const user = getCachedUser();
            const isAdmin = user && (user.role === 'admin');
            const businessesData = isAdmin
                ? await api.get('/businesses?status=approved&limit=200')
                : await api.get(`/businesses?user_id=${user.id}&status=approved&limit=50`);
            const businesses = businessesData.businesses || businessesData.results || businessesData || [];
            const select = document.getElementById('jobBusiness');
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Selecciona un negocio</option>';
                // Always add En-Santiago as the first option (uses En-Santiago.png logo)
                const holaxOpt = document.createElement('option');
                holaxOpt.value = 'En-Santiago';
                holaxOpt.textContent = 'En-Santiago';
                holaxOpt.dataset.logo = '/images/En-Santiago.png';
                select.appendChild(holaxOpt);
                if (businesses.length > 0) {
                    businesses.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.id;
                        opt.textContent = b.title || b.name || `Negocio #${b.id}`;
                        if (b.logo) opt.dataset.logo = b.logo;
                        select.appendChild(opt);
                    });
                }
                select.disabled = false;
            }
        } catch (e) {
            console.log('Could not load businesses for job modal:', e);
        }
    };

    setupJobModal();

    // ═══════════════════════════════════════════════════════════════
    // BAZAR BUTTON (shown when bazar_enabled setting is on)
    // Only shows if user hasn't responded in the last 15 days
    // ═══════════════════════════════════════════════════════════════
    (function setupBazarButton() {
        const bazarBtn = document.getElementById('quickActionBazar');
        const bazarModal = document.getElementById('bazarModal');
        if (!bazarBtn || !bazarModal) return;

        // Check if bazar is enabled and user has businesses AND hasn't responded in 15 days
        api.get('/settings/public').then(settings => {
            if (settings.bazar_enabled !== '1') return;
            const user = getCachedUser();
            if (!user) return;
            // Check cooldown via bazar API
            return api.get('/bazar').then(bazarStatus => {
                // If user responded within last 15 days, don't show button
                if (bazarStatus.within_cooldown) return;
                // If user said "si" at any point, also respect 15-day cooldown (checked above via within_cooldown)
                return api.get(`/businesses?user_id=${user.id}&status=approved&limit=1`);
            });
        }).then(bizData => {
            if (!bizData) return;
            const businesses = bizData.businesses || bizData.results || bizData || [];
            if (businesses.length > 0) bazarBtn.style.display = '';
        }).catch(() => {});

        bazarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            bazarModal.classList.remove('hidden');
        });

        const close = document.getElementById('bazarModalClose');
        if (close) close.addEventListener('click', () => bazarModal.classList.add('hidden'));
        bazarModal.querySelector('.modal-overlay')?.addEventListener('click', () => bazarModal.classList.add('hidden'));

        async function sendBazarResponse(val) {
            bazarModal.classList.add('hidden');
            try {
                await api.post('/bazar', { response: val, source: 'dashboard' });
                showToast(val === 'si' ? 'Te has inscrito al bazar!' : 'Respuesta guardada', 'success');
                bazarBtn.style.display = 'none';
            } catch (e) {
                showToast(e.message || 'Error', 'error');
            }
        }
        document.getElementById('bazarDashSi')?.addEventListener('click', () => sendBazarResponse('si'));
        document.getElementById('bazarDashNo')?.addEventListener('click', () => sendBazarResponse('no'));
    })();

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
                        <button class="btn-icon" onclick="editService(${s.id}, '${escapeAttr(s.title)}', '${escapeAttr(s.description || '')}')" title="Editar"><i class="fas fa-edit" style="color:#8B0000;"></i></button>
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

        const panels = ['Pending', 'All', 'Users', 'Settings', 'Premium', 'EditBiz', 'Categories'];
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
                    : '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:#8B0000;color:#8B0000;border:1px solid #8B0000;"><i class="fas fa-user"></i> Regular</span>';

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
    let selectedStatsBizId = null; // null = all businesses

    function drawSimpleChart(dailyViews, dailyWhatsapp) {
        const canvas = document.getElementById('statsDailyChart');
        const emptyMsg = document.getElementById('statsChartEmpty');
        if (!canvas) return;

        const views = dailyViews || [];
        const wa = dailyWhatsapp || [];
        const allDates = [];
        const viewMap = {};
        const waMap = {};

        views.forEach(v => { allDates.push(v.date); viewMap[v.date] = v.views; });
        wa.forEach(w => { if (!allDates.includes(w.date)) allDates.push(w.date); waMap[w.date] = w.clicks; });
        allDates.sort();

        if (allDates.length === 0) {
            canvas.style.display = 'none';
            if (emptyMsg) emptyMsg.style.display = '';
            return;
        }
        canvas.style.display = '';
        if (emptyMsg) emptyMsg.style.display = 'none';

        const ctx = canvas.getContext('2d');
        const W = canvas.parentElement.clientWidth;
        const H = 200;
        canvas.width = W * 2;
        canvas.height = H * 2;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.scale(2, 2);

        const padL = 40, padR = 10, padT = 10, padB = 30;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;
        const maxVal = Math.max(1, ...views.map(v => v.views), ...wa.map(w => w.clicks));

        ctx.clearRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = padT + (chartH / 4) * i;
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
            ctx.fillStyle = '#8B0000';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), padL - 6, y + 3);
        }

        // X labels (show max 15 dates)
        const step = allDates.length > 15 ? Math.ceil(allDates.length / 15) : 1;
        allDates.forEach((date, i) => {
            if (i % step === 0) {
                const x = padL + (chartW / Math.max(1, allDates.length - 1)) * i;
                const label = date.substring(5); // MM-DD
                ctx.fillStyle = '#8B0000';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(label, x, H - 8);
            }
        });

        function getXY(data, date) {
            const idx = allDates.indexOf(date);
            if (idx < 0) return null;
            const x = padL + (chartW / Math.max(1, allDates.length - 1)) * idx;
            const val = data === views ? viewMap[date] : waMap[date];
            const y = padT + chartH - (val / maxVal) * chartH;
            return { x, y };
        }

        // Draw views line
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        views.forEach((v, i) => {
            const p = getXY(views, v.date);
            if (p) i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Views dots
        ctx.fillStyle = '#8B0000';
        views.forEach(v => {
            const p = getXY(views, v.date);
            if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); }
        });

        // Draw WA line
        ctx.strokeStyle = '#25d366';
        ctx.lineWidth = 2;
        ctx.beginPath();
        wa.forEach((w, i) => {
            const p = getXY(wa, w.date);
            if (p) i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // WA dots
        ctx.fillStyle = '#25d366';
        wa.forEach(w => {
            const p = getXY(wa, w.date);
            if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); }
        });

        // Legend
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#8B0000'; ctx.fillRect(padL, H - 6, 12, 3); ctx.fillText('Vistas', padL + 16, H - 2);
        ctx.fillStyle = '#25d366'; ctx.fillRect(padL + 60, H - 6, 12, 3); ctx.fillText('WhatsApp', padL + 76, H - 2);
    }

    async function loadBusinessStats(businessId) {
        try {
            // Get user's businesses first
            const myBiz = await api.get('/user/my-businesses');
            const businesses = myBiz.businesses || myBiz.data || [];

            if (businesses.length === 0) {
                const body = document.getElementById('statsPerBusinessBody');
                if (body) body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#8B0000;padding:24px;">No tienes negocios registrados.</td></tr>';
                drawSimpleChart([], []);
                return;
            }

            // Populate business selector dropdown
            const selectorEl = document.getElementById('statsBusinessSelector');
            if (selectorEl && !selectorEl.dataset.init) {
                selectorEl.dataset.init = '1';
                let selHtml = '<select id="statsBizSelect" style="padding:8px 12px;border-radius:8px;border:1px solid #8B0000;font-size:0.85rem;font-weight:600;cursor:pointer;background:#fff;">';
                selHtml += '<option value="">Todos mis negocios</option>';
                businesses.forEach(b => { selHtml += '<option value="' + b.id + '">' + (b.title || 'Sin título') + '</option>'; });
                selHtml += '</select>';
                selectorEl.innerHTML = selHtml;
                document.getElementById('statsBizSelect').addEventListener('change', function() {
                    selectedStatsBizId = this.value ? parseInt(this.value) : null;
                    loadBusinessStats(selectedStatsBizId);
                });
            }

            // If a specific business was passed, use it; otherwise aggregate all
            let allStats = { total_views: 0, total_whatsapp_clicks: 0, total_website_clicks: 0, total_phone_clicks: 0, total_shares: 0 };
            let rows = [];
            let allDailyViews = [];
            let allDailyWa = [];

            const bizToQuery = businessId ? businesses.filter(b => b.id === businessId) : businesses;

            for (const biz of bizToQuery) {
                try {
                    const stats = await api.get(`/business-stats/${biz.id}?period=${currentStatsPeriod}`);
                    allStats.total_views += stats.total_views || 0;
                    allStats.total_whatsapp_clicks += stats.total_whatsapp_clicks || 0;
                    allStats.total_website_clicks += stats.total_website_clicks || 0;
                    allStats.total_phone_clicks += stats.total_phone_clicks || 0;
                    allStats.total_shares += stats.total_shares || 0;

                    // Merge daily data
                    if (stats.daily_views) {
                        stats.daily_views.forEach(dv => {
                            const existing = allDailyViews.find(v => v.date === dv.date);
                            if (existing) existing.views += dv.views;
                            else allDailyViews.push({ date: dv.date, views: dv.views });
                        });
                    }
                    if (stats.daily_whatsapp) {
                        stats.daily_whatsapp.forEach(dw => {
                            const existing = allDailyWa.find(w => w.date === dw.date);
                            if (existing) existing.clicks += dw.clicks;
                            else allDailyWa.push({ date: dw.date, clicks: dw.clicks });
                        });
                    }

                    rows.push(`
                        <tr>
                            <td><a href="/negocio/${biz.slug || biz.id}" style="color:#8B0000;font-weight:600;text-decoration:none;">${biz.title || 'Sin título'}</a></td>
                            <td><span style="color:#8B0000;font-size:0.85rem;">${biz.category_name || '--'}</span></td>
                            <td><span style="font-weight:700;color:#1e293b;">${(stats.total_views || 0).toLocaleString()}</span></td>
                            <td><span style="font-weight:700;color:#25d366;">${(stats.total_whatsapp_clicks || 0).toLocaleString()}</span></td>
                            <td><span style="font-weight:700;color:#f59e0b;">${(stats.total_phone_clicks || 0).toLocaleString()}</span></td>
                            <td><span style="font-weight:700;color:#8B0000;">${(stats.total_website_clicks || 0).toLocaleString()}</span></td>
                            <td><span style="font-weight:700;color:#8B0000;">${(stats.total_shares || 0).toLocaleString()}</span></td>
                        </tr>
                    `);
                } catch(e) {
                    rows.push(`
                        <tr>
                            <td>${biz.title || 'Sin título'}</td>
                            <td>${biz.category_name || '--'}</td>
                            <td colspan="5" style="color:#8B0000;">Sin datos</td>
                        </tr>
                    `);
                }
            }

            // Update summary cards
            const elViews = document.getElementById('statTotalViews');
            const elWA = document.getElementById('statTotalWA');
            const elPhone = document.getElementById('statTotalPhone');
            const elWeb = document.getElementById('statTotalWeb');
            const elShares = document.getElementById('statTotalShares');
            if (elViews) elViews.textContent = allStats.total_views.toLocaleString();
            if (elWA) elWA.textContent = allStats.total_whatsapp_clicks.toLocaleString();
            if (elPhone) elPhone.textContent = allStats.total_phone_clicks.toLocaleString();
            if (elWeb) elWeb.textContent = allStats.total_website_clicks.toLocaleString();
            if (elShares) elShares.textContent = allStats.total_shares.toLocaleString();

            // Update table
            const body = document.getElementById('statsPerBusinessBody');
            if (body) body.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="7" style="text-align:center;color:#8B0000;padding:24px;">Sin datos para este período.</td></tr>';

            // Draw chart
            drawSimpleChart(allDailyViews, allDailyWa);

        } catch (error) {
            console.error('Stats error:', error);

            // Actualizar la tabla para que no quede en "Cargando estadísticas..."
            const body = document.getElementById('statsPerBusinessBody');
            if (body) {
                let errorMsg = error.message || 'Error desconocido';
                let actionHTML = '';

                // Mensajes específicos según el tipo de error
                if (errorMsg.includes('401') || errorMsg.includes('Token') || errorMsg.includes('token')) {
                    errorMsg = 'Sesión expirada. Inicia sesión nuevamente.';
                    actionHTML = ' <button onclick="window.location.href=\'/login.html\'" style="color:#dc2626;text-decoration:underline;background:none;border:none;cursor:pointer;font-weight:600;">Ir a Login</button>';
                } else if (errorMsg.includes('403') || errorMsg.includes('denegado') || errorMsg.includes('admin')) {
                    errorMsg = 'Acceso denegado. No tienes permisos para ver estas estadísticas.';
                } else if (errorMsg.includes('500') || errorMsg.includes('interno')) {
                    errorMsg = 'Error del servidor. Intenta nuevamente en unos momentos.';
                    actionHTML = ' <button onclick="location.reload()" style="color:#dc2626;text-decoration:underline;background:none;border:none;cursor:pointer;font-weight:600;">Recargar</button>';
                } else if (errorMsg.includes('conexión') || errorMsg.includes('fetch') || errorMsg.includes('network')) {
                    errorMsg = 'Error de conexión. Verifica tu internet.';
                    actionHTML = ' <button onclick="location.reload()" style="color:#dc2626;text-decoration:underline;background:none;border:none;cursor:pointer;font-weight:600;">Reintentar</button>';
                }

                body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;">' +
                    '<div style="color:#dc2626;margin-bottom:8px;"><i class="fas fa-exclamation-circle"></i> ' + errorMsg + actionHTML + '</div>' +
                    '</td></tr>';
            }

            // Resetear tarjetas de resumen a 0
            const elViews = document.getElementById('statTotalViews');
            const elWA = document.getElementById('statTotalWA');
            const elPhone = document.getElementById('statTotalPhone');
            const elWeb = document.getElementById('statTotalWeb');
            const elShares = document.getElementById('statTotalShares');
            if (elViews) elViews.textContent = '0';
            if (elWA) elWA.textContent = '0';
            if (elPhone) elPhone.textContent = '0';
            if (elWeb) elWeb.textContent = '0';
            if (elShares) elShares.textContent = '0';

            showToast('Error al cargar estadísticas: ' + error.message, 'error');
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
            e.target.style.background = '#8B0000';
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
    let editBizLogoFile = null;
    let editBizBannerFile = null;

    // Inject logo + banner fields into edit business form (both modals)
    document.querySelectorAll('#editBizForm').forEach(form => {
        const firstField = form.querySelector('.eb-field');
        if (firstField && !form.querySelector('.eb-logo-section')) {
            const logoDiv = document.createElement('div');
            logoDiv.className = 'eb-field eb-logo-section';
            logoDiv.style.marginBottom = '16px';
            logoDiv.innerHTML = `
                <label>Logo del Negocio</label>
                <div style="display:flex;align-items:center;gap:12px;margin-top:6px;">
                    <div class="edit-biz-logo-preview" style="width:64px;height:64px;border-radius:10px;border:2px dashed #8B0000;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#8B0000;flex-shrink:0;">
                        <i class="fas fa-building edit-biz-logo-icon" style="font-size:1.2rem;color:#8B0000;"></i>
                        <img class="edit-biz-logo-img" src="" alt="Logo" style="width:100%;height:100%;object-fit:contain;display:none;">
                    </div>
                    <div>
                        <button type="button" class="btn btn-secondary btn-sm edit-biz-logo-upload-btn">
                            <i class="fas fa-upload"></i> Subir Logo
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm edit-biz-logo-remove-btn" style="display:none;margin-left:4px;">
                            <i class="fas fa-times"></i>
                        </button>
                        <input type="file" class="edit-biz-logo-input" accept="image/jpeg,image/png,image/webp" style="display:none;">
                    </div>
                </div>
                <input type="hidden" class="edit-biz-logo-url">
            `;
            form.insertBefore(logoDiv, firstField);

            // Bind events
            const section = logoDiv;
            section.querySelector('.edit-biz-logo-upload-btn').addEventListener('click', () => {
                section.querySelector('.edit-biz-logo-input').click();
            });
            section.querySelector('.edit-biz-logo-input').addEventListener('change', function() {
                const file = this.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { showToast('Logo max 2MB', 'error'); return; }
                editBizLogoFile = file;
                const reader = new FileReader();
                reader.onload = function(e) {
                    section.querySelector('.edit-biz-logo-img').src = e.target.result;
                    section.querySelector('.edit-biz-logo-img').style.display = 'block';
                    section.querySelector('.edit-biz-logo-icon').style.display = 'none';
                    section.querySelector('.edit-biz-logo-remove-btn').style.display = 'inline-flex';
                };
                reader.readAsDataURL(file);
            });
            section.querySelector('.edit-biz-logo-remove-btn').addEventListener('click', function() {
                editBizLogoFile = null;
                section.querySelector('.edit-biz-logo-img').src = '';
                section.querySelector('.edit-biz-logo-img').style.display = 'none';
                section.querySelector('.edit-biz-logo-icon').style.display = '';
                this.style.display = 'none';
                section.querySelector('.edit-biz-logo-input').value = '';
                section.querySelector('.edit-biz-logo-url').value = '';
            });
        }

        // Inject banner field
        if (!form.querySelector('.eb-banner-section')) {
            const bannerDiv = document.createElement('div');
            bannerDiv.className = 'eb-field eb-banner-section';
            bannerDiv.style.marginBottom = '16px';
            bannerDiv.innerHTML = `
                <label>Imagen de Portada (Banner)</label>
                <p style="font-size:0.78rem;color:#8B0000;margin:4px 0 8px;">Se muestra como portada tipo Facebook. Recomendado: 1200x400px.</p>
                <div class="edit-biz-banner-preview" style="width:100%;height:140px;border-radius:10px;overflow:hidden;background:#8B0000;display:flex;align-items:center;justify-content:center;margin-bottom:8px;">
                    <span style="color:#8B0000;font-size:0.85rem;"><i class="fas fa-panorama"></i> Sin banner</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button type="button" class="btn btn-secondary btn-sm edit-biz-banner-upload-btn">
                        <i class="fas fa-upload"></i> Subir Banner
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm edit-biz-banner-remove-btn" style="display:none;color:#dc2626;">
                        <i class="fas fa-times"></i> Quitar
                    </button>
                    <input type="file" class="edit-biz-banner-input" accept="image/jpeg,image/png,image/webp" style="display:none;">
                    <span class="edit-biz-banner-status" style="font-size:0.8rem;color:#8B0000;"></span>
                </div>
                <input type="hidden" class="edit-biz-banner-url">
            `;
            try { form.insertBefore(bannerDiv, firstField); } catch(e) { form.prepend(bannerDiv); }

            // Bind events
            const bSection = bannerDiv;
            bSection.querySelector('.edit-biz-banner-upload-btn').addEventListener('click', () => {
                bSection.querySelector('.edit-biz-banner-input').click();
            });
            bSection.querySelector('.edit-biz-banner-input').addEventListener('change', function() {
                const file = this.files[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) { showToast('Banner max 5MB', 'error'); return; }
                editBizBannerFile = file;
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imgSrc = e.target.result;
                    bSection.querySelector('.edit-biz-banner-preview').innerHTML = `
                        <div style="position:relative;width:100%;height:100%;overflow:hidden;">
                            <img id="editBizBannerEditImg" src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s ease;transform:rotate(0deg);">
                            <div style="position:absolute;bottom:6px;right:6px;display:flex;gap:5px;">
                                <button type="button" class="eb-banner-rotate-btn" data-dir="-90" style="width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;" title="Rotar -90°">
                                    <i class="fas fa-rotate-left"></i>
                                </button>
                                <button type="button" class="eb-banner-rotate-btn" data-dir="90" style="width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;" title="Rotar +90°">
                                    <i class="fas fa-rotate-right"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    const editImg = document.getElementById('editBizBannerEditImg');
                    editImg.dataset.rotation = '0';
                    bSection.querySelectorAll('.eb-banner-rotate-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const dir = parseInt(this.dataset.dir);
                            let rot = parseInt(editImg.dataset.rotation) || 0;
                            rot += dir;
                            editImg.dataset.rotation = rot;
                            editImg.style.transform = 'rotate(' + rot + 'deg)';
                        });
                    });
                    // Store rotated file reference for upload
                    bSection._bannerImgSrc = imgSrc;
                    bSection._bannerFile = file;
                };
                reader.readAsDataURL(file);
                bSection.querySelector('.edit-biz-banner-remove-btn').style.display = 'inline-flex';
            });
            bSection.querySelector('.edit-biz-banner-remove-btn').addEventListener('click', function() {
                editBizBannerFile = null;
                bSection._bannerImgSrc = null;
                bSection._bannerFile = null;
                bSection.querySelector('.edit-biz-banner-preview').innerHTML = '<span style="color:#8B0000;font-size:0.85rem;"><i class="fas fa-panorama"></i> Sin banner</span>';
                this.style.display = 'none';
                bSection.querySelector('.edit-biz-banner-input').value = '';
                bSection.querySelector('.edit-biz-banner-url').value = '';
            });
        }
    });

    // NOTE: window.openEditBusinessModal is defined OUTSIDE this IIFE (top of file)
    // to avoid issues with elements that may not exist in the DOM.
    // The IIFE version below is kept as _iifeOpenEditBizModal for internal use only.

    function _iifeOpenEditBizModal(id) {
        const modal = document.getElementById('editBusinessModal');
        const loading = document.getElementById('editBizLoading');
        const form = document.getElementById('editBizForm');
        if (!modal) return;
        modal.classList.remove('hidden');
        loading.style.display = '';
        form.style.display = 'none';

        // Reset features
        document.querySelectorAll('#editBizFeatures .eb-feature').forEach(f => f.classList.remove('checked'));
        window._editBizVideos = [];
        var vidFileInfo = document.getElementById('ebVideoFileInfo');
        if (vidFileInfo) vidFileInfo.innerHTML = '';
        var vidFileIn = document.getElementById('ebVideoFileInput');
        if (vidFileIn) vidFileIn.value = '';

        try {
            api.get('/businesses/' + id).then(function(data) {
                const biz = data.business || data;
                populateEditBizForm(biz);
                loading.style.display = 'none';
                form.style.display = '';
            }).catch(function(e) {
                loading.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444;"></i><p>Error al cargar datos del negocio</p>';
            });
        } catch(e) {
            loading.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444;"></i><p>Error al cargar datos del negocio</p>';
        }
    }

    function populateEditBizForm(biz) {
        const el = (id, val) => { const e = document.getElementById(id); if (e && val) e.value = val; };
        el('editBizId', biz.id);
        el('editBizTitle', biz.title);
        el('editBizDesc', biz.description);
        el('editBizCat', biz.category_slug || '');
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
        el('editBizEspecialidad', biz.especialidad);

        // Show/hide especialidad field
        const espWrap = document.getElementById('editBizEspecialidadWrap');
        if (espWrap) {
            const catVal = biz.category || biz.category_slug || '';
            espWrap.style.display = (catVal === 'medicina-servicio-medico' || biz.especialidad) ? '' : 'none';
        }

        // Features
        const features = biz.features || biz.caracteristicas || '';
        const featList = typeof features === 'string' ? features.split(',') : features;
        document.querySelectorAll('#editBizFeatures .eb-feature').forEach(f => {
            if (featList.includes(f.dataset.feature)) f.classList.add('checked');
        });

        // Video (multi)
        window._editBizVideos = [];
        if (biz.video_url) {
            var urls = window._parseVideoUrls(biz.video_url);
            urls.forEach(function(u) {
                if (u) window._editBizVideos.push({ url: u, type: 'url' });
            });
        }
        window._renderVideoList('ebVideosList');

        // Logo
        editBizLogoFile = null;
        editBizBannerFile = null;
        const logoSection = form.querySelector('.eb-logo-section');
        if (logoSection && biz.logo) {
            logoSection.querySelector('.edit-biz-logo-img').src = biz.logo;
            logoSection.querySelector('.edit-biz-logo-img').style.display = 'block';
            logoSection.querySelector('.edit-biz-logo-icon').style.display = 'none';
            logoSection.querySelector('.edit-biz-logo-remove-btn').style.display = 'inline-flex';
            logoSection.querySelector('.edit-biz-logo-url').value = biz.logo;
        } else if (logoSection) {
            logoSection.querySelector('.edit-biz-logo-img').src = '';
            logoSection.querySelector('.edit-biz-logo-img').style.display = 'none';
            logoSection.querySelector('.edit-biz-logo-icon').style.display = '';
            logoSection.querySelector('.edit-biz-logo-remove-btn').style.display = 'none';
            logoSection.querySelector('.edit-biz-logo-url').value = '';
            logoSection.querySelector('.edit-biz-logo-input').value = '';
        }

        // Banner
        const bannerSection = form.querySelector('.eb-banner-section');
        if (bannerSection) {
            if (biz.banner) {
                bannerSection.querySelector('.edit-biz-banner-preview').innerHTML = '<img src="' + biz.banner + '" style="width:100%;height:100%;object-fit:cover;">';
                bannerSection.querySelector('.edit-biz-banner-remove-btn').style.display = 'inline-flex';
                bannerSection.querySelector('.edit-biz-banner-url').value = biz.banner;
            } else {
                bannerSection.querySelector('.edit-biz-banner-preview').innerHTML = '<span style="color:#8B0000;font-size:0.85rem;"><i class="fas fa-panorama"></i> Sin banner</span>';
                bannerSection.querySelector('.edit-biz-banner-remove-btn').style.display = 'none';
                bannerSection.querySelector('.edit-biz-banner-url').value = '';
                bannerSection.querySelector('.edit-biz-banner-input').value = '';
            }
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
        var files = input.files;
        if (!files || !files.length) return;
        var token = localStorage.getItem('auth_token') || localStorage.getItem('token');

        Array.from(files).forEach(function(file) {
            if (!file.type.startsWith('video/')) {
                showToast(file.name + ': Solo se permiten archivos de video', 'error');
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                showToast(file.name + ': Max 50MB', 'error');
                return;
            }

            // Show uploading info
            var infoDiv = document.getElementById('ebVideoFileInfo');
            if (infoDiv) {
                infoDiv.innerHTML += '<div class="eb-video-file-info" id="ebUpload_' + file.name.replace(/[^a-zA-Z0-9]/g, '_') + '"><i class="fas fa-spinner fa-spin"></i> ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + 'MB) - Subiendo...</div>';
            }

            var formData = new FormData();
            formData.append('file', file);
            formData.append('product_type', 'video');

            fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData,
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.url) {
                    window._editBizVideos.push({ url: data.url, type: 'file' });
                    window._renderVideoList('ebVideosList');
                    showToast(file.name + ' subido correctamente', 'success');
                } else {
                    showToast(data.error || 'Error al subir ' + file.name, 'error');
                }
                var el = document.getElementById('ebUpload_' + file.name.replace(/[^a-zA-Z0-9]/g, '_'));
                if (el) el.remove();
            })
            .catch(function() {
                showToast('Error de conexion al subir ' + file.name, 'error');
                var el = document.getElementById('ebUpload_' + file.name.replace(/[^a-zA-Z0-9]/g, '_'));
                if (el) el.remove();
            });
        });
        input.value = '';
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

    // ─── Gallery functions for user edit modal ─────────
    async function loadEditBizGallery(businessId) {
        const galleryEl = document.getElementById('ebBizGallery');
        if (!galleryEl || !businessId) return;
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        try {
            const res = await fetch('/api/businesses/' + businessId, { headers: { 'Authorization': 'Bearer ' + token } });
            const biz = await res.json();
            const images = biz.images || [];
            if (images.length === 0) {
                galleryEl.innerHTML = '<div style="text-align:center;padding:16px;border:2px dashed #8B0000;border-radius:10px;color:#8B0000;font-size:0.85rem;"><i class="fas fa-images" style="font-size:1.5rem;display:block;margin-bottom:6px;"></i>Sin imágenes.<br><small>Usa los botones de abajo para agregar.</small></div>';
                return;
            }
            galleryEl.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
                images.map(function(img) {
                    return '<div style="position:relative;display:inline-block;border-radius:8px;overflow:hidden;border:2px solid ' + (img.is_cover ? '#f59e0b' : '#8B0000') + ';">' +
                        '<img src="' + img.url + '" style="width:90px;height:72px;object-fit:cover;" loading="lazy" onerror="this.style.display=\'none\'">' +
                        (img.is_cover ? '<span style="position:absolute;top:2px;left:2px;background:#f59e0b;color:#fff;font-size:0.6rem;padding:1px 4px;border-radius:4px;">Portada</span>' : '<button type="button" class="eb-gallery-cover-btn" data-biz="' + businessId + '" data-img="' + img.id + '" style="position:absolute;top:2px;left:2px;background:rgba(0,110,227,0.85);color:#fff;border:none;border-radius:4px;font-size:0.55rem;padding:1px 4px;cursor:pointer;" title="Portada"><i class="fas fa-star"></i></button>') +
                        '<button type="button" class="eb-gallery-del-btn" data-biz="' + businessId + '" data-img="' + img.id + '" style="position:absolute;bottom:2px;right:2px;background:rgba(220,53,69,0.9);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Eliminar"><i class="fas fa-trash"></i></button>' +
                        '</div>';
                }).join('') + '</div>';
            // Bind events
            galleryEl.querySelectorAll('.eb-gallery-del-btn').forEach(function(btn) {
                btn.addEventListener('click', function() { deleteEditBizImage(this.dataset.biz, this.dataset.img); });
            });
            galleryEl.querySelectorAll('.eb-gallery-cover-btn').forEach(function(btn) {
                btn.addEventListener('click', function() { setEditBizCover(this.dataset.biz, this.dataset.img); });
            });
        } catch (err) {
            galleryEl.innerHTML = '<span style="color:#999;font-size:0.82rem;">Error al cargar galería</span>';
        }
    }

    async function uploadEditBizGalleryFile(file) {
        var idEl = document.getElementById('editBizId');
        if (!idEl || !idEl.value) return;
        var bizId = idEl.value;
        var statusEl = document.getElementById('ebBizGalleryStatus');
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
        var token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        try {
            var fd = new FormData();
            fd.append('file', file);
            fd.append('product_type', 'business_image');
            var res = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
            var data = await res.json();
            if (!data.url) throw new Error(data.error || 'Error');
            await fetch('/api/images/' + bizId, { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: data.url, is_cover: 0 }) });
            showToast('Imagen agregada', 'success');
            loadEditBizGallery(bizId);
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
        if (statusEl) statusEl.innerHTML = '';
    }

    async function deleteEditBizImage(bizId, imgId) {
        var token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        try {
            await fetch('/api/images/' + bizId + '?image_id=' + imgId, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
            showToast('Imagen eliminada', 'success');
            loadEditBizGallery(bizId);
        } catch (err) { showToast('Error al eliminar', 'error'); }
    }

    async function setEditBizCover(bizId, imgId) {
        var token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        try {
            await fetch('/api/images/' + bizId + '?image_id=' + imgId, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_cover: 1 }) });
            showToast('Portada actualizada', 'success');
            loadEditBizGallery(bizId);
        } catch (err) { showToast('Error', 'error'); }
    }

    // Bind gallery events once DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        var galleryFiles = document.getElementById('ebBizGalleryFiles');
        var galleryCamera = document.getElementById('ebBizGalleryCamera');
        var galleryURL = document.getElementById('ebBizGalleryURL');
        var galleryURLBtn = document.getElementById('ebBizGalleryURLBtn');

        if (galleryFiles) {
            galleryFiles.addEventListener('change', function() {
                Array.from(this.files).forEach(function(f) { uploadEditBizGalleryFile(f); });
                this.value = '';
            });
        }
        if (galleryCamera) {
            galleryCamera.addEventListener('change', function() {
                if (this.files[0]) uploadEditBizGalleryFile(this.files[0]);
                this.value = '';
            });
        }
        if (galleryURL && galleryURLBtn) {
            galleryURL.addEventListener('input', function() { galleryURLBtn.style.display = this.value.trim() ? 'inline-block' : 'none'; });
            galleryURL.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); galleryURLBtn.click(); } });
            galleryURLBtn.addEventListener('click', async function() {
                var url = galleryURL.value.trim();
                var idEl = document.getElementById('editBizId');
                if (!url || !idEl || !idEl.value) return;
                var token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                this.disabled = true; this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                try {
                    await fetch('/api/images/' + idEl.value, { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url, is_cover: 0 }) });
                    showToast('Imagen agregada', 'success');
                    galleryURL.value = ''; galleryURLBtn.style.display = 'none';
                    loadEditBizGallery(idEl.value);
                } catch (err) { showToast('Error', 'error'); }
                this.disabled = false; this.innerHTML = '<i class="fas fa-plus"></i>';
            });
        }
    });

    // Load gallery when edit modal opens (hook into _openEditBizModal)
    var _origOpen = window.openEditBusinessModal;
    window.openEditBusinessModal = function(id) {
        _origOpen(id);
        // Load gallery after a small delay to let data load
        setTimeout(function() { loadEditBizGallery(id); }, 800);
    };

    window.saveEditBusiness = async function() {
        const id = document.getElementById('editBizId').value;
        if (!id) return;

        const btn = document.getElementById('editBizSaveBtn');
        const currentForm = document.getElementById('editBizForm');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const features = [];
            document.querySelectorAll('#editBizFeatures .eb-feature.checked').forEach(f => features.push(f.dataset.feature));

            const payload = {
                title: document.getElementById('editBizTitle').value,
                description: document.getElementById('editBizDesc').value,
                category_id: document.getElementById('editBizCat').value,
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
                video_url: window._getVideoUrlsJSON(),
                logo: currentForm.querySelector('.edit-biz-logo-url')?.value || null,
                banner: currentForm.querySelector('.edit-biz-banner-url')?.value || null,
                especialidad: document.getElementById('editBizEspecialidad')?.value || null,
            };

            // Upload new logo if selected
            const logoSection = currentForm.querySelector('.eb-logo-section');
            if (editBizLogoFile && logoSection) {
                try {
                    const logoFd = new FormData();
                    logoFd.append('file', editBizLogoFile);
                    logoFd.append('product_type', 'logo');
                    const logoResult = await api.postFormData('/upload', logoFd);
                    if (logoResult.url) {
                        payload.logo = logoResult.url;
                        logoSection.querySelector('.edit-biz-logo-url').value = logoResult.url;
                    }
                } catch(logoErr) {
                    console.error('Logo upload error:', logoErr);
                }
            }

            // Upload new banner if selected
            const bannerSection = currentForm.querySelector('.eb-banner-section');
            if (editBizBannerFile && bannerSection) {
                try {
                    const bannerStatus = bannerSection.querySelector('.edit-biz-banner-status');
                    if (bannerStatus) bannerStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo banner...';

                    // Check if banner was rotated
                    let finalBannerFile = editBizBannerFile;
                    const editImg = document.getElementById('editBizBannerEditImg');
                    if (editImg && bannerSection._bannerImgSrc) {
                        const rotation = parseInt(editImg.dataset.rotation) || 0;
                        if (rotation !== 0) {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = bannerSection._bannerImgSrc; });
                            const absRot = ((rotation % 360) + 360) % 360;
                            const swap = (absRot === 90 || absRot === 270);
                            canvas.width = swap ? img.height : img.width;
                            canvas.height = swap ? img.width : img.height;
                            ctx.save();
                            ctx.translate(canvas.width / 2, canvas.height / 2);
                            ctx.rotate(absRot * Math.PI / 180);
                            ctx.drawImage(img, -img.width / 2, -img.height / 2);
                            ctx.restore();
                            const blob = await new Promise(r => canvas.toBlob(r, editBizBannerFile.type || 'image/jpeg', 0.92));
                            finalBannerFile = new File([blob], editBizBannerFile.name, { type: editBizBannerFile.type || 'image/jpeg' });
                        }
                    }

                    const bannerFd = new FormData();
                    bannerFd.append('file', finalBannerFile);
                    bannerFd.append('product_type', 'banner');
                    const bannerResult = await api.postFormData('/upload', bannerFd);
                    if (bannerResult.url) {
                        payload.banner = bannerResult.url;
                        bannerSection.querySelector('.edit-biz-banner-url').value = bannerResult.url;
                    }
                    if (bannerStatus) bannerStatus.innerHTML = '';
                } catch(bannerErr) {
                    console.error('Banner upload error:', bannerErr);
                }
            }

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
        const colors = { approved: '#8B0000', pending: '#d97706', rejected: '#dc2626' };
        return colors[status] || '#8B0000';
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
                                <span class="card-badge" style="background:#8B0000;color:#fff;">${opLabel}</span>
                                <span class="card-badge" style="background:${statusColor};color:#fff;">${getStatusLabel(p.status)}</span>
                            </div>
                        </div>
                        <div class="business-card-body" style="flex:1;display:flex;flex-direction:column;">
                            <h3 class="business-card-title">${truncateText(p.title, 40)}</h3>
                            <p class="business-card-location"><i class="fas fa-map-marker-alt"></i> ${city}</p>
                            <p style="font-size:0.9rem;font-weight:700;color:#8B0000;margin:4px 0;">${price}</p>
                            <p style="font-size:0.72rem;color:#8B0000;margin-bottom:8px;"><i class="fas fa-eye"></i> ${p.views || 0} vistas</p>
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
    adminPremiumBadge = document.getElementById('adminPremiumBadge');

    let selectedVoucherFile = null;

    // Now that premium consts are declared, initialize premium modal and plan display
    setupPremiumModal();
    updatePlanDisplay();

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

        // Also update profile plan badge
        const profilePlanBadge = document.getElementById('profilePlanBadge');
        if (profilePlanBadge) {
            if (isPremium) {
                profilePlanBadge.className = 'plan-badge plan-badge-premium';
                profilePlanBadge.innerHTML = '<i class="fas fa-crown"></i> Premium';
            } else {
                profilePlanBadge.className = 'plan-badge plan-badge-basic';
                profilePlanBadge.innerHTML = '<i class="fas fa-user"></i> Basico';
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
                    <a href="planes.html" class="btn" style="background:#8B0000;color:#8B0000;font-weight:600;font-size:0.85rem;padding:8px 18px;border-radius:8px;border:1px solid #8B0000;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
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
                    planExpiryInfo.style.color = '#8B0000';
                } else {
                    planExpiryInfo.querySelector('span').textContent = 'Tu plan Premium ha expirado. Tus proximas publicaciones caducaran a los 20 dias.';
                    planExpiryInfo.style.display = 'block';
                    planExpiryInfo.style.color = '#d97706';
                }
            } else if (!isPremium) {
                planExpiryInfo.querySelector('span').textContent = 'Con el plan Basico, tus publicaciones caducan a los 20 dias. Mejora a Premium para que nunca caduquen.';
                planExpiryInfo.style.display = 'block';
                planExpiryInfo.style.color = '#8B0000';
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
                premiumVoucherDrop.style.borderColor = '#8B0000';
            });
            premiumVoucherDrop.addEventListener('dragleave', () => {
                premiumVoucherDrop.style.borderColor = '#8B0000';
            });
            premiumVoucherDrop.addEventListener('drop', (e) => {
                e.preventDefault();
                premiumVoucherDrop.style.borderColor = '#8B0000';
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
            ['Pending', 'All', 'Users', 'Categories'].forEach(p => {
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
                        <td style="font-size:0.82rem;color:#8B0000;">${escapeHtml(r.user_email || '')}</td>
                        <td><span class="badge" style="background:#fef3c7;color:#92400e;">${durationLabel}</span></td>
                        <td>
                            ${r.voucher_url ? `<img src="${r.voucher_url}" class="voucher-thumb" onclick="window._openVoucherLightbox('${r.voucher_url}')" alt="Voucher" onerror="this.style.display='none'">` : '<span style="color:#8B0000;">Sin voucher</span>'}
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
            resultDiv.innerHTML = `<div style="display:flex;align-items:center;gap:10px;"><div style="width:36px;height:36px;border-radius:50%;background:#8B0000;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${(userName||'U')[0].toUpperCase()}</div><div><strong>${userName}</strong><br><span style="font-size:0.82rem;color:#8B0000;">${userEmail}</span></div></div>`;
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
                resultDiv.innerHTML = `<div style="display:flex;align-items:center;gap:10px;"><div style="width:36px;height:36px;border-radius:50%;background:#8B0000;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${(u.name||'U')[0].toUpperCase()}</div><div><strong>${u.name}</strong>${planInfo}<br><span style="font-size:0.82rem;color:#8B0000;">${u.email}</span></div></div>`;
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



    // --- Admin Settings Tab (Banner + General) ---
    function setupAdminSettingsTab() {
        if (!adminTabSettings) return;
        adminTabSettings.addEventListener('click', () => { activateAdminTab('Settings'); loadDashAdminSettings(); });
        const saveBtn = document.getElementById('dashAdminSaveSettingsBtn');
        if (saveBtn) saveBtn.addEventListener('click', saveDashAdminSettings);
    }
    async function loadDashAdminSettings() {
        try {
            const data = await api.get('/settings');
            const settings = data.settings || data;
            document.querySelectorAll('#adminPanelSettings [data-key]').forEach(el => {
                const key = el.dataset.key; const value = settings[key];
                if (el.type === 'checkbox') el.checked = value === '1' || value === 'true';
                else el.value = value || '';
            });
            const bannerUrl = document.getElementById('setting_hero_banner_url')?.value;
            if (bannerUrl) {
                const img = document.getElementById('adminBannerImg');
                const icon = document.getElementById('adminBannerPlaceholderIcon');
                const btn = document.getElementById('adminBannerRemoveBtn');
                if (img) { img.src = bannerUrl; img.style.display = 'block'; }
                if (icon) icon.style.display = 'none';
                if (btn) btn.style.display = 'inline-flex';
            }
        } catch (error) { console.error('Error loading settings:', error); showToast('Error al cargar configuracion', 'error'); }
    }
    async function saveDashAdminSettings() {
        try {
            const updates = {};
            document.querySelectorAll('#adminPanelSettings [data-key]').forEach(el => {
                const key = el.dataset.key;
                if (el.type === 'checkbox') updates[key] = el.checked ? '1' : '0';
                else updates[key] = el.value;
            });
            await api.put('/settings', updates);
            showToast('Configuracion guardada exitosamente', 'success');
        } catch (error) { console.error('Error saving settings:', error); showToast('Error: ' + error.message, 'error'); }
    }
    window.handleAdminBannerSelect = async function(input) {
        const file = input.files[0]; if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB', 'error'); input.value = ''; return; }
        try {
            showToast('Subiendo banner...', 'info');
            const fd = new FormData(); fd.append('file', file); fd.append('product_type', 'banner');
            const result = await api.postFormData('/upload', fd);
            if (result.url) {
                document.getElementById('setting_hero_banner_url').value = result.url;
                const img = document.getElementById('adminBannerImg');
                const icon = document.getElementById('adminBannerPlaceholderIcon');
                const btn = document.getElementById('adminBannerRemoveBtn');
                if (img) { img.src = result.url; img.style.display = 'block'; }
                if (icon) icon.style.display = 'none';
                if (btn) btn.style.display = 'inline-flex';
                showToast('Banner subido. Guarda configuracion para aplicarlo.', 'success');
            }
        } catch(e) { showToast('Error al subir banner: ' + e.message, 'error'); }
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

    // ─── Admin Edit Businesses Tab (NEW) ─────────────────────
    let adminEditBizList = [];
    let adminEditBizCurrent = null;
    let adminEditBizLogoFile = null;

    function setupAdminEditBizTab() {
        const tab = document.getElementById('adminTabEditBiz');
        if (!tab) return;
        tab.addEventListener('click', () => {
            activateAdminTab('EditBiz');
            loadAdminEditBizList();
        });
        const sel = document.getElementById('adminEditBizSelect');
        if (sel) {
            sel.addEventListener('change', () => {
                const id = sel.value;
                if (id) loadAdminEditBizDetail(id);
                else document.getElementById('adminEditBizContainer').style.display = 'none';
            });
        }
    }

    async function loadAdminEditBizList() {
        const sel = document.getElementById('adminEditBizSelect');
        if (!sel) return;
        sel.innerHTML = '<option value="">Cargando negocios...</option>';
        try {
            const data = await api.get('/businesses?limit=500&status=approved,pending,rejected');
            adminEditBizList = data.businesses || [];
            sel.innerHTML = '<option value="">-- Selecciona un negocio (' + adminEditBizList.length + ') --</option>';
            adminEditBizList.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.title + ' (' + (b.status || '?') + ') — ' + (b.city || '');
                sel.appendChild(opt);
            });
        } catch(e) {
            sel.innerHTML = '<option value="">Error al cargar</option>';
            showToast('Error al cargar negocios', 'error');
        }
    }

    async function loadAdminEditBizDetail(id) {
        const container = document.getElementById('adminEditBizContainer');
        if (!container) return;
        container.style.display = 'block';
        container.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#8B0000;"></i><p style="margin-top:8px;color:#8B0000;">Cargando datos...</p></div>';
        try {
            const data = await api.get('/businesses/' + id);
            adminEditBizCurrent = data.business || data;
            renderAdminEditBizForm(adminEditBizCurrent);
        } catch(e) {
            container.innerHTML = '<p style="color:#dc2626;">Error: ' + e.message + '</p>';
        }
    }

    function renderAdminEditBizForm(b) {
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
            <p style="font-size:0.78rem;color:#8B0000;margin:4px 0 0;">ID: ${b.id} | Dueño: ${b.owner_name||b.user_id||'?'} | Vistas: ${b.views||0}</p>
        </div>

        <!-- Logo -->
        <div class="aeb-card">
            <h4><i class="fas fa-image" style="color:#8B0000;"></i> Logo</h4>
            <div class="aeb-logo-area">
                <div class="aeb-logo-preview" id="aebLogoPreview">
                    ${b.logo ? `<img src="${escH(b.logo)}" alt="Logo" onerror="this.style.display='none'">` : '<i class="fas fa-store" style="font-size:1.5rem;color:#8B0000;"></i>'}
                </div>
                <div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('aebLogoInput').click()"><i class="fas fa-upload"></i> Subir Logo</button>
                    ${b.logo ? `<button type="button" class="btn btn-secondary btn-sm" onclick="adminRemoveLogo()"><i class="fas fa-trash"></i> Quitar</button>` : ''}
                    <input type="file" id="aebLogoInput" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="adminHandleLogoSelect(this)">
                    <input type="hidden" id="aebLogoUrl" value="${escH(b.logo||'')}">
                    <p style="font-size:0.72rem;color:#8B0000;margin-top:4px;">JPG, PNG, WebP - Max 5MB</p>
                </div>
            </div>
        </div>

        <!-- Info -->
        <div class="aeb-card">
            <h4><i class="fas fa-info-circle" style="color:#8B0000;"></i> Informacion Basica</h4>
            <div class="aeb-grid">
                <div class="aeb-field"><label>Nombre *</label><input type="text" class="eb-input" id="aebTitle" value="${escH(b.title||'')}" maxlength="150"></div>
                <div class="aeb-field"><label>Categoria</label><input type="text" class="eb-input" id="aebCategory" value="${escH(b.category_name||b.category||'')}"></div>
                <div class="aeb-field"><label>Descripcion</label><textarea class="eb-input eb-textarea" id="aebDesc" rows="3">${escH(b.description||'')}</textarea></div>
                <div class="aeb-field"><label>Tipo</label><input type="text" class="eb-input" id="aebType" value="${escH(b.business_type||'')}"></div>
            </div>
        </div>

        <!-- Contact -->
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

        <!-- Location -->
        <div class="aeb-card">
            <h4><i class="fas fa-map-marker-alt" style="color:#dc2626;"></i> Ubicacion</h4>
            <div class="aeb-grid">
                <div class="aeb-field"><label>Direccion</label><input type="text" class="eb-input" id="aebAddress" value="${escH(b.address||'')}"></div>
                <div class="aeb-field"><label>Ciudad</label><input type="text" class="eb-input" id="aebCity" value="${escH(b.city||'')}"></div>
                <div class="aeb-field"><label>Estado</label><input type="text" class="eb-input" id="aebState" value="${escH(b.state||'')}"></div>
                <div class="aeb-field"><label>Horario</label><input type="text" class="eb-input" id="aebSchedule" value="${escH(b.schedule||'')}" placeholder="Lun-Vie 8:00-17:00"></div>
            </div>
        </div>

        <!-- Images -->
        <div class="aeb-card">
            <h4><i class="fas fa-images" style="color:#8B0000;"></i> Imagenes (${images.length})</h4>
            ${images.length > 0 ? `<div class="aeb-images-grid" id="aebImagesGrid">
                ${images.map((img, i) => `
                    <div class="aeb-img-thumb">
                        <img src="${escH(img.url)}" alt="" onerror="this.parentElement.style.display='none'">
                        <button class="aeb-img-remove" onclick="adminRemoveImage(${img.id||img.business_id},'${escH(img.url)}')" title="Eliminar">&times;</button>
                        ${img.is_cover ? '<span class="aeb-img-cover">Portada</span>' : `<button class="aeb-img-cover" onclick="adminSetCover(${img.id})" style="cursor:pointer;">Portada</button>`}
                    </div>
                `).join('')}
            </div>` : '<p style="color:#8B0000;font-size:0.85rem;">No hay imagenes.</p>'}
            <div style="margin-top:12px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('aebNewImageInput').click()"><i class="fas fa-plus"></i> Agregar Imagen</button>
                <input type="file" id="aebNewImageInput" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="adminAddImage(this)">
            </div>
        </div>

        <!-- Status Change -->
        <div class="aeb-card">
            <h4><i class="fas fa-toggle-on" style="color:#f59e0b;"></i> Estado</h4>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-sm ${b.status==='approved'?'btn-primary':'btn-secondary'}" onclick="adminChangeStatus(${b.id},'approved')" style="${b.status==='approved'?'background:#8B0000;':''}"><i class="fas fa-check"></i> Aprobar</button>
                <button class="btn btn-sm ${b.status==='pending'?'btn-primary':'btn-secondary'}" onclick="adminChangeStatus(${b.id},'pending')" style="${b.status==='pending'?'background:#d97706;':''}"><i class="fas fa-clock"></i> Pendiente</button>
                <button class="btn btn-sm ${b.status==='rejected'?'btn-primary':'btn-secondary'}" onclick="adminChangeStatus(${b.id},'rejected')" style="${b.status==='rejected'?'background:#dc2626;color:#fff;':''}"><i class="fas fa-times"></i> Rechazar</button>
            </div>
        </div>

        <!-- Save Button -->
        <div style="text-align:right;margin-top:8px;">
            <button class="btn" onclick="adminSaveBizEdit(${b.id})" style="background:linear-gradient(135deg,#8B0000,#8B0000);color:#fff;font-weight:600;padding:12px 32px;border-radius:10px;border:none;cursor:pointer;font-size:0.95rem;">
                <i class="fas fa-save"></i> Guardar Cambios
            </button>
        </div>`;
    }

    function escH(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    window.adminHandleLogoSelect = async function(input) {
        const file = input.files[0]; if (!file) return;
        if (file.size > 5*1024*1024) { showToast('Max 5MB para logo','error'); input.value=''; return; }
        try {
            showToast('Subiendo logo...','info');
            const fd = new FormData(); fd.append('file',file); fd.append('product_type','logo');
            const result = await api.postFormData('/upload', fd);
            if (result.url) {
                document.getElementById('aebLogoUrl').value = result.url;
                const preview = document.getElementById('aebLogoPreview');
                preview.innerHTML = `<img src="${result.url}" alt="Logo">`;
                adminEditBizLogoFile = null;
                showToast('Logo subido correctamente','success');
            }
        } catch(e) { showToast('Error al subir logo: '+e.message,'error'); }
        input.value = '';
    };

    window.adminRemoveLogo = function() {
        document.getElementById('aebLogoUrl').value = '';
        document.getElementById('aebLogoPreview').innerHTML = '<i class="fas fa-store" style="font-size:1.5rem;color:#8B0000;"></i>';
        if (adminEditBizCurrent) { adminEditBizCurrent.logo = null; }
    };

    window.adminAddImage = async function(input) {
        const file = input.files[0]; if (!file) return;
        if (!adminEditBizCurrent) return;
        try {
            showToast('Subiendo imagen...','info');
            const fd = new FormData(); fd.append('file',file); fd.append('business_id',adminEditBizCurrent.id); fd.append('product_type','business');
            const result = await api.postFormData('/upload', fd);
            if (result.url) {
                await api.post('/images/' + adminEditBizCurrent.id, { url: result.url, is_cover: 0 });
                showToast('Imagen agregada','success');
                loadAdminEditBizDetail(adminEditBizCurrent.id);
            }
        } catch(e) { showToast('Error: '+e.message,'error'); }
        input.value = '';
    };

    window.adminRemoveImage = async function(imgId, url) {
        if (!confirm('Eliminar esta imagen?')) return;
        if (!adminEditBizCurrent) return;
        try {
            await api.delete('/images/' + adminEditBizCurrent.id + '?image_id=' + imgId);
            showToast('Imagen eliminada','success');
            loadAdminEditBizDetail(adminEditBizCurrent.id);
        } catch(e) { showToast('Error: '+e.message,'error'); }
    };

    window.adminSetCover = async function(imgId) {
        if (!adminEditBizCurrent) return;
        try {
            // POST to images endpoint with is_cover=1 will unset previous cover and this sets new one
            // But we don't have the URL. Use a simpler approach: upload a dummy then set cover via DB
            // Actually, let's just call the businesses/[id] endpoint with a special field
            // The simplest: we fetch the image data, then use the images POST to re-register it as cover
            // Even simpler: create a minimal set-cover function endpoint
            const token = getToken();
            const resp = await fetch('/api/images/' + adminEditBizCurrent.id + '/set-cover', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ image_id: imgId })
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error || 'Error al cambiar portada');
            }
            showToast('Portada actualizada','success');
            loadAdminEditBizDetail(adminEditBizCurrent.id);
        } catch(e) { showToast('Error: '+e.message,'error'); }
    };

    window.adminChangeStatus = async function(id, status) {
        try {
            await api.put('/businesses/' + id, { status });
            showToast('Estado actualizado','success');
            if (adminEditBizCurrent) loadAdminEditBizDetail(id);
            loadAdminEditBizList();
        } catch(e) { showToast('Error: '+e.message,'error'); }
    };

    window.adminDeleteBiz = async function(id) {
        if (!confirm('ELIMINAR este negocio permanentemente? No se puede deshacer.')) return;
        try {
            await api.delete('/businesses/' + id);
            showToast('Negocio eliminado','success');
            document.getElementById('adminEditBizContainer').style.display = 'none';
            document.getElementById('adminEditBizSelect').value = '';
            loadAdminEditBizList();
            loadAdminData();
        } catch(e) { showToast('Error: '+e.message,'error'); }
    };

    window.adminSaveBizEdit = async function(id) {
        const btn = event.target.closest('button');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        try {
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
            };
            await api.put('/businesses/' + id, payload);
            showToast('Negocio actualizado exitosamente','success');
        } catch(e) { showToast('Error: '+e.message,'error'); }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios'; }
    };

    // ─── Admin Categories Management Tab ─────────────────────
    function setupAdminCategoriesTab() {
        var tab = document.getElementById('adminTabCategories');
        if (!tab) return;

        tab.addEventListener('click', function() {
            // Deactivate all admin tabs
            document.querySelectorAll('.admin-tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            // Hide all panels
            ['Pending','All','Users','Settings','Premium','EditBiz'].forEach(function(p) {
                var panel = document.getElementById('adminPanel' + p);
                if (panel) panel.classList.add('hidden');
            });
            var catPanel = document.getElementById('adminPanelCategories');
            if (catPanel) catPanel.classList.remove('hidden');

            loadAdminCategories();
            loadCategorySuggestions();
        });

        // Create category button
        var btnCreate = document.getElementById('btnCreateCategory');
        if (btnCreate) {
            btnCreate.addEventListener('click', createNewCategory);
        }

        // Color picker label sync
        var colorInput = document.getElementById('newCatColor');
        var colorLabel = document.getElementById('newCatColorLabel');
        if (colorInput && colorLabel) {
            colorInput.addEventListener('input', function() { colorLabel.textContent = this.value; });
        }
    }

    async function loadAdminCategories() {
        var tbody = document.getElementById('adminCategoriesBody');
        if (!tbody) return;
        try {
            var data = await api.get('/categories');
            var cats = data.categories || [];
            if (!cats.length) {
                tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-tags"></i><p>No hay categorias</p></div></td></tr>';
                return;
            }
            var html = '';
            cats.forEach(function(c) {
                html += '<tr style="font-size:0.85rem;">';
                html += '<td>' + c.id + '</td>';
                html += '<td><strong>' + escapeHtml(c.name) + '</strong></td>';
                html += '<td style="color:#8B0000;font-size:0.78rem;">' + escapeHtml(c.slug) + '</td>';
                html += '<td><i class="' + escapeHtml(c.icon || 'fas fa-store') + '" style="color:' + escapeHtml(c.color || '#8B0000') + ';"></i> <span style="font-size:0.75rem;color:#8B0000;">' + escapeHtml(c.icon || '') + '</span></td>';
                html += '<td><span style="display:inline-block;width:18px;height:18px;border-radius:4px;background:' + escapeHtml(c.color || '#8B0000') + ';vertical-align:middle;border:1px solid #8B0000;"></span></td>';
                html += '<td>' + (c.business_count || 0) + '</td>';
                html += '<td>' + c.sort_order + '</td>';
                html += '<td>';
                html += '<button onclick="deleteCategory(' + c.id + ',\'' + escapeHtml(c.name).replace(/'/g, "\\'") + '\')" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:0.78rem;padding:2px 6px;" title="Desactivar"><i class="fas fa-trash"></i></button>';
                html += '</td>';
                html += '</tr>';
            });
            tbody.innerHTML = html;
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i><p>Error al cargar categorias</p></div></td></tr>';
        }
    }

    async function createNewCategory() {
        var nameInput = document.getElementById('newCatName');
        var iconInput = document.getElementById('newCatIcon');
        var colorInput = document.getElementById('newCatColor');
        var errorDiv = document.getElementById('newCatError');
        var btn = document.getElementById('btnCreateCategory');

        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
            if (errorDiv) { errorDiv.textContent = 'El nombre es requerido.'; errorDiv.style.display = 'block'; }
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
        if (errorDiv) errorDiv.style.display = 'none';

        try {
            var result = await api.post('/categories', {
                name: name,
                icon: iconInput ? iconInput.value.trim() : 'fas fa-store',
                color: colorInput ? colorInput.value : '#8B0000'
            });
            showToast('Categoria "' + name + '" creada exitosamente', 'success');
            if (nameInput) nameInput.value = '';
            loadAdminCategories();
        } catch(e) {
            var msg = (e.message || 'Error al crear categoria');
            if (errorDiv) { errorDiv.textContent = msg; errorDiv.style.display = 'block'; }
            showToast(msg, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> Crear';
        }
    }

    async function deleteCategory(id, name) {
        if (!confirm('Desactivar la categoria "' + name + '"? Los negocios existentes no se eliminaran, pero la categoria dejara de aparecer en los filtros.')) return;
        try {
            await api.delete('/categories/' + id);
            showToast('Categoria desactivada', 'success');
            loadAdminCategories();
        } catch(e) {
            showToast('Error: ' + (e.message || ''), 'error');
        }
    }

    async function loadCategorySuggestions() {
        var container = document.getElementById('catSuggestionsList');
        var countBadge = document.getElementById('catSuggCount');
        var topBadge = document.getElementById('adminCatSuggBadge');
        if (!container) return;

        try {
            var data = await api.get('/category-suggestions');
            var suggestions = data.suggestions || [];

            // Filter only pending
            var pending = suggestions.filter(function(s) { return s.status === 'pending'; });

            if (countBadge) countBadge.textContent = pending.length;
            if (topBadge) {
                topBadge.textContent = pending.length;
                topBadge.style.display = pending.length > 0 ? 'inline' : 'none';
            }

            if (!suggestions.length) {
                container.innerHTML = '<div style="text-align:center;color:#8B0000;padding:16px;"><i class="fas fa-check-circle" style="font-size:1.5rem;color:#22c55e;"></i><p style="margin-top:8px;">No hay solicitudes pendientes</p></div>';
                return;
            }

            var html = '';
            suggestions.forEach(function(s) {
                var statusColor = s.status === 'pending' ? '#f59e0b' : (s.status === 'approved' ? '#22c55e' : '#ef4444');
                var statusLabel = s.status === 'pending' ? 'Pendiente' : (s.status === 'approved' ? 'Aprobada' : 'Rechazada');
                html += '<div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #8B0000;border-radius:10px;margin-bottom:8px;background:#fff;' + (s.status !== 'pending' ? 'opacity:0.6;' : '') + '">';
                html += '<div style="flex:1;min-width:0;">';
                html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
                html += '<strong style="font-size:0.9rem;">' + escapeHtml(s.category_name) + '</strong>';
                html += '<span style="font-size:0.7rem;padding:2px 8px;border-radius:99px;background:' + statusColor + '20;color:' + statusColor + ';font-weight:600;">' + statusLabel + '</span>';
                html += '</div>';
                if (s.reason) html += '<p style="font-size:0.82rem;color:#8B0000;margin:0;">' + escapeHtml(s.reason) + '</p>';
                html += '<p style="font-size:0.75rem;color:#8B0000;margin:4px 0 0;">' + (s.user_name ? 'Por ' + escapeHtml(s.user_name) : 'Usuario no registrado') + ' &middot; ' + (s.created_at || '') + '</p>';
                html += '</div>';
                if (s.status === 'pending') {
                    html += '<div style="display:flex;gap:6px;flex-shrink:0;">';
                    html += '<button onclick="approveCategorySuggestion(' + s.id + ')" style="background:#22c55e;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:0.78rem;cursor:pointer;white-space:nowrap;" title="Aprobar y crear categoria"><i class="fas fa-check"></i> Aprobar</button>';
                    html += '<button onclick="rejectCategorySuggestion(' + s.id + ')" style="background:#ef4444;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:0.78rem;cursor:pointer;white-space:nowrap;" title="Rechazar"><i class="fas fa-times"></i></button>';
                    html += '</div>';
                }
                html += '</div>';
            });
            container.innerHTML = html;
        } catch(e) {
            // Table might not exist yet
            container.innerHTML = '<div style="text-align:center;color:#8B0000;padding:16px;"><i class="fas fa-info-circle"></i><p style="margin-top:8px;font-size:0.82rem;">No se pudieron cargar las solicitudes. Es posible que la tabla no exista aun en D1.</p></div>';
        }
    }

    async function approveCategorySuggestion(id) {
        try {
            await api.put('/category-suggestions/' + id, { action: 'approve' });
            showToast('Categoria creada a partir de la sugerencia', 'success');
            loadCategorySuggestions();
            loadAdminCategories();
        } catch(e) {
            showToast('Error: ' + (e.message || ''), 'error');
        }
    }

    async function rejectCategorySuggestion(id) {
        if (!confirm('Rechazar esta solicitud de categoria?')) return;
        try {
            await api.put('/category-suggestions/' + id, { action: 'reject' });
            showToast('Sugerencia rechazada', 'success');
            loadCategorySuggestions();
        } catch(e) {
            showToast('Error: ' + (e.message || ''), 'error');
        }
    }

    // Wire up the new tab into activateAdminTab
    const _origActivateAdminTab = activateAdminTab;
    activateAdminTab = function(name) {
        _origActivateAdminTab(name);
        const panel = document.getElementById('adminPanel' + name);
        if (panel) panel.classList.remove('hidden');
    };

    const _origSetupAdmin2 = setupAdminSection;
    setupAdminSection = function() {
        _origSetupAdmin2();
        setupAdminSettingsTab();
        setupAdminEditBizTab();
        setupAdminCategoriesTab();
    };
    if (document.getElementById('adminTabSettings')) setupAdminSettingsTab();
    if (document.getElementById('adminTabEditBiz')) setupAdminEditBizTab();
    if (document.getElementById('adminTabCategories')) setupAdminCategoriesTab();

    // ─── Fix logo upload in old edit modal ──────────────────────
    // Setup logo file input listener for the old modal
    document.querySelectorAll('.edit-biz-logo-input').forEach(input => {
        input.addEventListener('change', function() {
            const file = this.files[0]; if (!file) return;
            if (file.size > 5*1024*1024) { showToast('Max 5MB','error'); this.value=''; return; }
            editBizLogoFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                const section = input.closest('.eb-logo-section');
                if (!section) return;
                section.querySelector('.edit-biz-logo-img').src = e.target.result;
                section.querySelector('.edit-biz-logo-img').style.display = 'block';
                section.querySelector('.edit-biz-logo-icon').style.display = 'none';
                section.querySelector('.edit-biz-logo-remove-btn').style.display = 'inline-flex';
            };
            reader.readAsDataURL(file);
        });
    });
    // Setup logo remove for the old modal
    document.querySelectorAll('.edit-biz-logo-remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            editBizLogoFile = null;
            const section = this.closest('.eb-logo-section');
            if (!section) return;
            section.querySelector('.edit-biz-logo-img').src = '';
            section.querySelector('.edit-biz-logo-img').style.display = 'none';
            section.querySelector('.edit-biz-logo-icon').style.display = '';
            this.style.display = 'none';
            const inp = section.querySelector('.edit-biz-logo-input');
            if (inp) inp.value = '';
            const urlInp = section.querySelector('.edit-biz-logo-url');
            if (urlInp) urlInp.value = '';
        });
    });
    window._removeEditBizLogo = function() {
        editBizLogoFile = null;
        const section = document.querySelector('.eb-logo-section');
        if (!section) return;
        section.querySelector('.edit-biz-logo-img').src = '';
        section.querySelector('.edit-biz-logo-img').style.display = 'none';
        section.querySelector('.edit-biz-logo-icon').style.display = '';
        section.querySelector('.edit-biz-logo-remove-btn').style.display = 'none';
        const inp = section.querySelector('.edit-biz-logo-input');
        if (inp) inp.value = '';
        const urlInp = section.querySelector('.edit-biz-logo-url');
        if (urlInp) urlInp.value = '';
    };

})();

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS SYSTEM
// ═══════════════════════════════════════════════════════════════
(function setupNotifications() {
    const bellBtn = document.getElementById('notifBellBtn');
    const badge = document.getElementById('notifBadge');
    const dropdown = document.getElementById('notifDropdown');
    const list = document.getElementById('notifList');
    const markAllBtn = document.getElementById('notifMarkAllRead');
    const closeBtn = document.getElementById('notifCloseDropdown');

    if (!bellBtn || !dropdown) return;

    let isOpen = false;

    // ── Poll unread count every 30s ──
    async function pollUnreadCount() {
        try {
            const data = await api.get('/notifications?action=unread_count');
            const count = data.count || 0;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        } catch(e) {}
    }

    // ── Fetch and render notifications ──
    async function loadNotifications() {
        try {
            const data = await api.get('/notifications?limit=30');
            const notifs = data.notifications || [];
            if (notifs.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:40px 16px;color:#8B0000;"><i class="fas fa-bell-slash" style="font-size:28px;margin-bottom:8px;display:block;"></i><p style="font-size:0.85rem;">No hay notificaciones</p></div>';
                return;
            }
            list.innerHTML = notifs.map(n => {
                const icon = n.type === 'new_business' ? 'fa-store' : n.type === 'new_job' ? 'fa-briefcase' : n.type === 'new_property' ? 'fa-house' : n.type === 'new_product' ? 'fa-box' : n.type === 'review' ? 'fa-star' : n.type === 'premium_request' ? 'fa-crown' : n.type === 'announcement' ? 'fa-bullhorn' : n.type === 'alert' ? 'fa-exclamation-triangle' : 'fa-bell';
                const iconBg = n.is_read ? '#8B0000' : '#8B0000';
                const iconColor = n.is_read ? '#8B0000' : '#8B0000';
                const bg = n.is_read ? '#fff' : '#8B0000';
                const timeAgo = getNotifTimeAgo(n.created_at);
                const linkAttr = n.link ? `data-link="${n.link}"` : '';
                return `<div class="notif-item" data-id="${n.id}" ${linkAttr} style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;background:${bg};border-bottom:1px solid #8B0000;cursor:pointer;transition:background .15s;">
                    <div style="width:34px;height:34px;border-radius:9px;background:${iconBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas ${icon}" style="font-size:0.8rem;color:${iconColor};"></i></div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.82rem;font-weight:${n.is_read ? '400' : '600'};color:#1e293b;line-height:1.4;margin-bottom:2px;">${escapeNotifHtml(n.title)}</div>
                        <div style="font-size:0.75rem;color:#8B0000;line-height:1.4;">${escapeNotifHtml(n.message || '')}</div>
                        <div style="font-size:0.68rem;color:#8B0000;margin-top:4px;">${timeAgo}</div>
                    </div>
                    ${n.is_read ? '' : '<div style="width:8px;height:8px;border-radius:50%;background:#8B0000;flex-shrink:0;margin-top:6px;"></div>'}
                </div>`;
            }).join('');

            // Click handlers: mark as read + navigate or feedback
            list.querySelectorAll('.notif-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const id = item.dataset.id;
                    const link = item.dataset.link;
                    const hasDot = item.querySelector('div[style*="background:#8B0000"]');

                    // Visual feedback immediately
                    item.style.opacity = '0.6';

                    if (hasDot) {
                        // Mark as read
                        try { await api.patch('/notifications', { action: 'mark_read', notification_id: parseInt(id) }); } catch(e) {}
                        item.style.background = '#fff';
                        item.querySelector('div[style*="font-weight"]').style.fontWeight = '400';
                        if (hasDot) hasDot.remove();
                        pollUnreadCount();
                    }

                    // Navigate to link if present
                    if (link) {
                        isOpen = false;
                        dropdown.style.display = 'none';
                        if (link.startsWith('http')) {
                            window.open(link, '_blank');
                        } else {
                            window.location.href = link;
                        }
                    } else {
                        // No link — just mark as read and give feedback
                        item.style.opacity = '1';
                        const title = item.querySelector('div[style*="font-weight"]')?.textContent || 'Notificación';
                        // Show brief inline feedback
                        const feedback = document.createElement('div');
                        feedback.style.cssText = 'position:absolute;bottom:4px;right:12px;font-size:0.7rem;color:#8B0000;font-weight:600;';
                        feedback.textContent = '✓ Leída';
                        item.style.position = 'relative';
                        item.appendChild(feedback);
                        setTimeout(() => { if(feedback.parentNode) feedback.remove(); }, 2000);
                    }
                });
            });
        } catch(e) {
            list.innerHTML = '<div style="text-align:center;padding:32px;color:#ef4444;font-size:0.82rem;">Error al cargar</div>';
        }
    }

    function getNotifTimeAgo(dateStr) {
        if (!dateStr) return '';
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'Justo ahora';
        if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
        if (diff < 86400) return `Hace ${Math.floor(diff/3600)}h`;
        if (diff < 604800) return `Hace ${Math.floor(diff/86400)}d`;
        return `Hace ${Math.floor(diff/604800)} sem`;
    }

    function escapeNotifHtml(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // Toggle
    bellBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        dropdown.style.display = isOpen ? 'block' : 'none';
        if (isOpen) loadNotifications();
    });

    document.addEventListener('click', (e) => {
        if (isOpen && !e.target.closest('#notifBellWrapper')) {
            isOpen = false;
            dropdown.style.display = 'none';
        }
    });

    closeBtn.addEventListener('click', () => { isOpen = false; dropdown.style.display = 'none'; });

    markAllBtn.addEventListener('click', async () => {
        try { await api.patch('/notifications', { action: 'mark_all_read' }); loadNotifications(); pollUnreadCount(); } catch(e) {}
    });

    bellBtn.addEventListener('mouseenter', () => { bellBtn.style.borderColor = '#8B0000'; bellBtn.style.color = '#8B0000'; });
    bellBtn.addEventListener('mouseleave', () => { bellBtn.style.borderColor = '#8B0000'; bellBtn.style.color = '#8B0000'; });

    // Start polling
    pollUnreadCount();
    setInterval(pollUnreadCount, 30000);

    // ─── Timeout de seguridad global ───────────────────────────
    // Si después de 20 segundos hay elementos "Cargando..." visibles,
    // los reemplaza por mensajes de error con botón de reintentar.
    setTimeout(function() {
        const errorStyle = 'color:#dc2626;text-align:center;padding:24px;';
        const retryBtn = ' <button onclick="location.reload()" style="color:#dc2626;text-decoration:underline;background:none;border:none;cursor:pointer;font-weight:600;">Recargar página</button>';

        // Stats per business table
        const statsBody = document.getElementById('statsPerBusinessBody');
        if (statsBody && statsBody.textContent.includes('Cargando estadísticas')) {
            statsBody.innerHTML = '<tr><td colspan="7" style="' + errorStyle + '"><i class="fas fa-exclamation-circle"></i> Tiempo de espera agotado al cargar estadísticas.' + retryBtn + '</td></tr>';
        }

        // Recent properties table
        const recentBody = document.getElementById('recentPropsBody');
        if (recentBody && recentBody.textContent.includes('Cargando')) {
            recentBody.innerHTML = '<tr class="empty-row"><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-circle" style="color:#dc2626;"></i><p>Tiempo de espera agotado.</p>' + retryBtn + '</div></td></tr>';
        }

        // My products
        const productsContainer = document.getElementById('myProductsByStore');
        if (productsContainer && productsContainer.textContent.includes('Cargando productos')) {
            productsContainer.innerHTML = '<div style="' + errorStyle + '"><i class="fas fa-exclamation-circle"></i> Tiempo de espera agotado al cargar productos.' + retryBtn + '</div>';
        }

        // My properties (inmuebles)
        const propsGrid = document.getElementById('myPropertiesGrid');
        if (propsGrid && propsGrid.textContent.includes('Cargando inmuebles')) {
            propsGrid.innerHTML = '<div style="' + errorStyle + '"><i class="fas fa-exclamation-circle"></i> Tiempo de espera agotado al cargar inmuebles.' + retryBtn + '</div>';
        }

        // Admin pending
        const adminPending = document.getElementById('adminPendingBody');
        if (adminPending && adminPending.textContent.includes('Cargando negocios pendientes')) {
            adminPending.innerHTML = '<tr class="empty-row"><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-circle" style="color:#dc2626;"></i><p>Tiempo de espera agotado.</p>' + retryBtn + '</div></td></tr>';
        }

        // Admin all businesses
        const adminAll = document.getElementById('adminAllBody');
        if (adminAll && adminAll.textContent.includes('Cargando')) {
            adminAll.innerHTML = '<tr class="empty-row"><td colspan="7"><div class="empty-state"><i class="fas fa-exclamation-circle" style="color:#dc2626;"></i><p>Tiempo de espera agotado.</p>' + retryBtn + '</div></td></tr>';
        }

        // Admin users
        const adminUsers = document.getElementById('adminUsersBody');
        if (adminUsers && adminUsers.textContent.includes('Cargando usuarios')) {
            adminUsers.innerHTML = '<tr class="empty-row"><td colspan="7"><div class="empty-state"><i class="fas fa-exclamation-circle" style="color:#dc2626;"></i><p>Tiempo de espera agotado.</p>' + retryBtn + '</div></td></tr>';
        }

        // Premium requests
        const premReqBody = document.getElementById('premiumRequestsBody');
        if (premReqBody && premReqBody.textContent.includes('Cargando solicitudes')) {
            premReqBody.innerHTML = '<tr class="empty-row"><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-circle" style="color:#dc2626;"></i><p>Tiempo de espera agotado.</p>' + retryBtn + '</div></td></tr>';
        }

        // Categories
        const catBody = document.getElementById('adminCategoriesBody');
        if (catBody && catBody.textContent.includes('Cargando categorias')) {
            catBody.innerHTML = '<tr class="empty-row"><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-circle" style="color:#dc2626;"></i><p>Tiempo de espera agotado.</p>' + retryBtn + '</div></td></tr>';
        }

        // Reset tarjetas de stats a 0 si siguen en 0 pero hay tabla con error
        const elViews = document.getElementById('statTotalViews');
        const elWA = document.getElementById('statTotalWA');
        const elPhone = document.getElementById('statTotalPhone');
        const elWeb = document.getElementById('statTotalWeb');
        const elShares = document.getElementById('statTotalShares');
        if (statsBody && statsBody.textContent.includes('Tiempo de espera')) {
            if (elViews && elViews.textContent === '0') elViews.textContent = '—';
            if (elWA && elWA.textContent === '0') elWA.textContent = '—';
            if (elPhone && elPhone.textContent === '0') elPhone.textContent = '—';
            if (elWeb && elWeb.textContent === '0') elWeb.textContent = '—';
            if (elShares && elShares.textContent === '0') elShares.textContent = '—';
        }
    }, 20000);

})();

