/**
 * Un Click - Seller Dashboard Module
 * Loaded on seller.html
 */

(function () {
    'use strict';

    // ─── State ──────────────────────────────────────────────────
    let currentUser = null;
    let referredPage = 1;
    const PAGE_LIMIT = 15;

    // ─── DOM Elements ───────────────────────────────────────────
    const sellerSidebar = document.getElementById('sellerSidebar');
    const sellerSidebarToggle = document.getElementById('sellerSidebarToggle');
    const sellerPageTitle = document.getElementById('sellerPageTitle');

    // Stats
    const sellerTotalRef = document.getElementById('sellerTotalRef');
    const sellerActiveRef = document.getElementById('sellerActiveRef');
    const sellerAvgMonth = document.getElementById('sellerAvgMonth');
    const sellerMonthRef = document.getElementById('sellerMonthRef');
    const sellerRefBiz = document.getElementById('sellerRefBiz');
    const sellerRefProps = document.getElementById('sellerRefProps');
    const sellerRefProds = document.getElementById('sellerRefProds');
    const sellerRefJobs = document.getElementById('sellerRefJobs');
    const sellerRefBadge = document.getElementById('sellerRefBadge');

    // ─── Initialization ─────────────────────────────────────────
    async function init() {
        // Check auth
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Get fresh user data
        try {
            currentUser = await getCurrentUser();
        } catch (e) {
            currentUser = getCachedUser();
        }

        if (!currentUser || currentUser.role !== 'seller') {
            showToast('Acceso denegado. Solo vendedores.', 'error');
            setTimeout(() => {
                if (currentUser && currentUser.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1500);
            return;
        }

        // Set user info
        const topName = document.getElementById('sellerTopName');
        if (topName) topName.textContent = currentUser.name;

        // Setup
        setupSectionNavigation();
        setupSidebarToggle();
        setupProfileForm();
        updateNavAuth();

        // Set referral link
        setReferralLink();

        // Load initial data
        loadOverview();
    }

    // ─── Section Navigation ─────────────────────────────────────
    function setupSectionNavigation() {
        document.querySelectorAll('.seller-nav-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section) switchSection(section);
            });
        });
    }

    function switchSection(section) {
        // Update nav
        document.querySelectorAll('.seller-nav-link').forEach(l => {
            l.classList.toggle('active', l.dataset.section === section);
        });

        // Hide all sections
        const sections = { overview: 'secOverview', users: 'secUsers', stats: 'secStats', profile: 'secProfile' };
        for (const [key, id] of Object.entries(sections)) {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden', key !== section);
        }

        // Update title
        const titles = { overview: 'Resumen', users: 'Mis Referidos', stats: 'Estadisticas', profile: 'Mi Perfil' };
        if (sellerPageTitle) sellerPageTitle.textContent = titles[section] || 'Resumen';

        // Load data
        switch (section) {
            case 'overview': loadOverview(); break;
            case 'users': referredPage = 1; loadReferredUsers(); break;
            case 'stats': loadStats(); break;
            case 'profile': loadProfile(); break;
        }

        // Close sidebar on mobile
        if (sellerSidebar) sellerSidebar.classList.remove('active');
    }

    // ─── Sidebar Toggle ─────────────────────────────────────────
    function setupSidebarToggle() {
        if (sellerSidebarToggle && sellerSidebar) {
            sellerSidebarToggle.addEventListener('click', () => {
                sellerSidebar.classList.toggle('active');
            });
        }
    }

    // ─── Referral Link ─────────────────────────────────────────
    function setReferralLink() {
        if (!currentUser) return;
        const baseUrl = window.location.origin || 'https://holax.com.ve';
        const link = `${baseUrl}/login.html?register=true&ref=${currentUser.id}`;

        const input1 = document.getElementById('referralLinkInput');
        const input2 = document.getElementById('sellerProfileRefLink');
        const info = document.getElementById('sellerProfileRefInfo');

        if (input1) input1.value = link;
        if (input2) input2.value = link;
        if (info) info.textContent = `Tu codigo de vendedor es: ${currentUser.id}`;
    }

    function copyReferralLink() {
        const input = document.getElementById('referralLinkInput') || document.getElementById('sellerProfileRefLink');
        if (input) {
            navigator.clipboard.writeText(input.value).then(() => {
                showToast('Enlace copiado al portapapeles', 'success');
            }).catch(() => {
                input.select();
                document.execCommand('copy');
                showToast('Enlace copiado', 'success');
            });
        }
    }

    // ─── Overview ───────────────────────────────────────────────
    async function loadOverview() {
        try {
            const data = await api.get('/seller/stats');
            const s = data.stats || {};

            if (sellerTotalRef) sellerTotalRef.textContent = s.total_referred || 0;
            if (sellerActiveRef) sellerActiveRef.textContent = s.active_referred || 0;
            if (sellerAvgMonth) sellerAvgMonth.textContent = s.avg_per_month || 0;
            if (sellerMonthRef) sellerMonthRef.textContent = s.period_referred || 0;
            if (sellerRefBiz) sellerRefBiz.textContent = s.content_by_referrals?.businesses || 0;
            if (sellerRefProps) sellerRefProps.textContent = s.content_by_referrals?.properties || 0;
            if (sellerRefProds) sellerRefProds.textContent = s.content_by_referrals?.products || 0;
            if (sellerRefJobs) sellerRefJobs.textContent = s.content_by_referrals?.jobs || 0;
            if (sellerRefBadge) sellerRefBadge.textContent = s.total_referred || 0;

            // Recent referrals table
            const tbody = document.getElementById('sellerRecentRefBody');
            if (tbody) {
                const users = data.recent_users || [];
                if (users.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state-sm"><i class="fas fa-user-friends"></i><p>Aun no has referido a nadie. Comparte tu enlace de invitacion.</p></div></td></tr>';
                } else {
                    tbody.innerHTML = users.map(u => `
                        <tr>
                            <td>${escapeHtml(u.name || '--')}</td>
                            <td>${escapeHtml(u.email || '--')}</td>
                            <td>${u.is_active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
                            <td>${formatDate(u.created_at)}</td>
                        </tr>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading overview:', error);
        }
    }

    // ─── Referred Users ─────────────────────────────────────────
    async function loadReferredUsers() {
        const tbody = document.getElementById('sellerRefTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="8"><div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div></td></tr>';

        try {
            const search = document.getElementById('sellerUserSearch')?.value || '';
            const status = document.getElementById('sellerUserStatus')?.value || 'all';

            let endpoint = `/seller/referred?page=${referredPage}&limit=${PAGE_LIMIT}`;
            if (search) endpoint += `&search=${encodeURIComponent(search)}`;
            if (status !== 'all') endpoint += `&status=${status}`;

            const data = await endpoint;
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const json = await response.json();

            if (!response.ok) throw new Error(json.error || 'Error');

            const users = json.users || [];

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state-sm"><i class="fas fa-user-friends"></i><p>No se encontraron usuarios referidos.</p></div></td></tr>';
                return;
            }

            tbody.innerHTML = users.map(u => `
                <tr>
                    <td>${u.id}</td>
                    <td>${escapeHtml(u.name || '--')}</td>
                    <td>${escapeHtml(u.email || '--')}</td>
                    <td>${escapeHtml(u.phone || '--')}</td>
                    <td>${u.business_count || 0}</td>
                    <td>${u.property_count || 0}</td>
                    <td>${u.product_count || 0}</td>
                    <td>${u.is_active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
                    <td>${formatDate(u.created_at)}</td>
                </tr>
            `).join('');

            // Pagination
            renderPagination('sellerRefPagination', json.pagination, (page) => {
                referredPage = page;
                loadReferredUsers();
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state-sm"><p>Error: ${escapeHtml(error.message)}</p></div></td></tr>`;
        }
    }

    // ─── Statistics ─────────────────────────────────────────────
    async function loadStats() {
        const period = document.getElementById('sellerStatsPeriod')?.value || 'all';

        try {
            const response = await fetch(`/api/seller/stats?period=${period}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'Error');

            const s = json.stats || {};

            // Period count
            const periodCount = document.getElementById('sellerPeriodCount');
            if (periodCount) periodCount.textContent = s.period_referred || 0;

            // Monthly chart
            renderMonthlyChart(s.monthly_data || []);

            // Day of week chart
            renderDowChart(s.day_of_week_data || []);

            // Yearly table
            renderYearlyTable(s.yearly_data || []);

        } catch (error) {
            console.error('Error loading stats:', error);
            showToast('Error al cargar estadisticas', 'error');
        }
    }

    function renderMonthlyChart(data) {
        const container = document.getElementById('sellerMonthlyChart');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<div class="empty-state-sm"><p>Sin datos para mostrar</p></div>';
            return;
        }

        const maxCount = Math.max(...data.map(d => d.count), 1);
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Sort by month ascending for chart
        const sorted = [...data].reverse();

        container.innerHTML = sorted.map(d => {
            const monthLabel = d.month ? d.month.substring(5) : '';
            const monthIdx = parseInt(monthLabel) - 1;
            const name = monthIdx >= 0 && monthIdx < 12 ? monthNames[monthIdx] : monthLabel;
            const height = Math.max((d.count / maxCount) * 150, 2);

            return `
                <div class="monthly-chart-bar">
                    <div class="bar-value">${d.count}</div>
                    <div class="bar" style="height:${height}px;"></div>
                    <div class="bar-label">${name}</div>
                </div>
            `;
        }).join('');
    }

    function renderDowChart(data) {
        const container = document.getElementById('sellerDowChart');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<div class="empty-state-sm"><p>Sin datos para mostrar</p></div>';
            return;
        }

        container.innerHTML = data.map(d => `
            <div class="dow-item">
                <div class="dow-name">${escapeHtml(d.day)}</div>
                <div class="dow-count">${d.count}</div>
            </div>
        `).join('');
    }

    function renderYearlyTable(data) {
        const tbody = document.getElementById('sellerYearlyBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2"><div class="empty-state-sm"><p>Sin datos anuales</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = data.map(d => `
            <tr>
                <td><strong>${escapeHtml(d.year)}</strong></td>
                <td>${d.count} usuarios</td>
            </tr>
        `).join('');
    }

    // ─── Profile ────────────────────────────────────────────────
    function loadProfile() {
        if (!currentUser) return;

        const avatar = document.getElementById('sellerProfileAvatar');
        const name = document.getElementById('sellerProfileName');
        const email = document.getElementById('sellerProfileEmail');
        const formName = document.getElementById('sellerFormName');
        const formEmail = document.getElementById('sellerFormEmail');
        const formPhone = document.getElementById('sellerFormPhone');
        const formWhatsapp = document.getElementById('sellerFormWhatsapp');
        const formBio = document.getElementById('sellerFormBio');

        if (avatar) {
            if (currentUser.avatar || currentUser.seller_photo) {
                const photoUrl = currentUser.seller_photo || currentUser.avatar;
                avatar.innerHTML = `<img src="${photoUrl}" alt="${escapeHtml(currentUser.name)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">`;
            }
        }

        if (name) name.textContent = currentUser.name;
        if (email) email.textContent = currentUser.email;
        if (formName) formName.value = currentUser.name || '';
        if (formEmail) formEmail.value = currentUser.email || '';
        if (formPhone) formPhone.value = currentUser.phone || '';
        if (formWhatsapp) formWhatsapp.value = currentUser.whatsapp || '';
        if (formBio) formBio.value = currentUser.bio || '';

        setReferralLink();
    }

    function setupProfileForm() {
        const form = document.getElementById('sellerProfileForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('sellerProfileSaveBtn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            }

            try {
                const body = {
                    name: document.getElementById('sellerFormName')?.value?.trim(),
                    email: document.getElementById('sellerFormEmail')?.value?.trim(),
                    phone: document.getElementById('sellerFormPhone')?.value?.trim(),
                    whatsapp: document.getElementById('sellerFormWhatsapp')?.value?.trim(),
                    bio: document.getElementById('sellerFormBio')?.value?.trim(),
                };

                const updatedUser = await api.put('/users/me', body);

                // Update local cache
                setCachedUser({ ...currentUser, ...body });
                currentUser = { ...currentUser, ...body };

                showToast('Perfil actualizado exitosamente', 'success');
            } catch (error) {
                showToast(error.message || 'Error al guardar perfil', 'error');
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
                }
            }
        });
    }

    // ─── Avatar Upload ──────────────────────────────────────────
    async function uploadAvatar(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showToast('Solo se permiten imagenes (JPG, PNG, WebP)', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showToast('La imagen no puede superar 10MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('product_type', 'seller_photo');

        try {
            showToast('Subiendo foto...', 'info');

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error al subir');

            // Update avatar in DB
            await api.put('/users/me', { avatar: data.url });

            // Update UI
            currentUser = { ...currentUser, avatar: data.url, seller_photo: data.url };
            setCachedUser(currentUser);

            const avatar = document.getElementById('sellerProfileAvatar');
            if (avatar) {
                avatar.innerHTML = `<img src="${data.url}" alt="${escapeHtml(currentUser.name)}">`;
            }

            showToast('Foto actualizada exitosamente', 'success');
        } catch (error) {
            showToast(error.message || 'Error al subir foto', 'error');
        }

        // Reset input
        event.target.value = '';
    }

    // ─── Helpers ────────────────────────────────────────────────
    function renderPagination(containerId, pagination, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container || !pagination) return;

        const { page, total_pages } = pagination;
        if (total_pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // Prev
        html += `<button ${page <= 1 ? 'disabled' : ''} onclick="window.seller.goToPage(${page - 1})"><i class="fas fa-chevron-left"></i></button>`;

        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
        let endPage = Math.min(total_pages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === page ? 'active' : ''}" onclick="window.seller.goToPage(${i})">${i}</button>`;
        }

        // Next
        html += `<button ${page >= total_pages ? 'disabled' : ''} onclick="window.seller.goToPage(${page + 1})"><i class="fas fa-chevron-right"></i></button>`;

        container.innerHTML = html;
    }

    function goToPage(page) {
        referredPage = page;
        loadReferredUsers();
    }

    function formatDate(dateStr) {
        if (!dateStr) return '--';
        try {
            return new Date(dateStr + 'Z').toLocaleDateString('es-VE', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function updateNavAuth() {
        const navLoginItem = document.getElementById('navLoginItem');
        const navUserItem = document.getElementById('navUserItem');
        const navUserName = document.getElementById('navUserName');
        const navLogout = document.getElementById('navLogout');

        if (currentUser) {
            if (navLoginItem) navLoginItem.classList.add('hidden');
            if (navUserItem) navUserItem.classList.remove('hidden');
            if (navUserName) navUserName.innerHTML = `<i class="fas fa-handshake"></i> ${escapeHtml(currentUser.name)}`;
        }

        if (navLogout) {
            navLogout.addEventListener('click', () => {
                removeToken();
                window.location.href = 'login.html';
            });
        }
    }

    // ─── Expose Public API ──────────────────────────────────────
    window.seller = {
        loadReferredUsers,
        loadStats,
        copyReferralLink,
        uploadAvatar,
        goToPage,
    };

    // ─── Start ──────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);
    // Also try immediately in case DOMContentLoaded already fired
    if (document.readyState !== 'loading') init();

})();