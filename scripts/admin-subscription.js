/**
 * Admin Subscription Module
 * Adds: Vendedores tab, Pagos tab, Role changes, Notifications
 * Loaded after admin.js on admin.html
 */

(function() {
  'use strict';

  const API = '/api';
  const TOKEN_KEY = 'meridaunclick_token';
  const token = () => localStorage.getItem(TOKEN_KEY);
  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token()}`
  });

  // ─── 1. INJECT SIDEBAR NAV ITEMS ──────────────────────────────
  function injectSidebarItems() {
    const nav = document.querySelector('.admin-nav');
    if (!nav || document.getElementById('adminNavSellers')) return;

    // Insert "Vendedores" after "Usuarios"
    const usersLink = nav.querySelector('[data-tab="users"]');
    if (usersLink) {
      const sellersHtml = `
        <a href="#" class="admin-nav-link" data-tab="sellers" id="adminNavSellers">
          <i class="fas fa-user-tie"></i>
          <span>Vendedores</span>
          <span class="badge" id="adminSellersBadge" style="display:none;">0</span>
        </a>`;
      usersLink.insertAdjacentHTML('afterend', sellersHtml);
    }

    // Insert "Pagos" after "Vendedores"
    const sellersLink = document.getElementById('adminNavSellers');
    if (sellersLink) {
      const paymentsHtml = `
        <a href="#" class="admin-nav-link" data-tab="payments" id="adminNavPayments">
          <i class="fas fa-credit-card"></i>
          <span>Pagos</span>
          <span class="badge" id="adminPaymentsBadge" style="background:#e91e63;display:none;">0</span>
        </a>`;
      sellersLink.insertAdjacentHTML('afterend', paymentsHtml);
    }

    // Add notification bell to topbar
    const topbarRight = document.querySelector('.admin-topbar-right');
    if (topbarRight && !document.getElementById('adminNotifBell')) {
      topbarRight.insertAdjacentHTML('afterbegin', `
        <button class="admin-notif-bell" id="adminNotifBell" title="Notificaciones" style="position:relative;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#64748b;margin-right:12px;">
          <i class="fas fa-bell"></i>
          <span id="adminNotifCount" style="position:absolute;top:-6px;right:-8px;background:#e91e63;color:#fff;font-size:0.65rem;width:18px;height:18px;border-radius:50%;display:none;align-items:center;justify-content:center;font-weight:700;">0</span>
        </button>
      `);
    }
  }

  // ─── 2. INJECT TAB CONTENT ────────────────────────────────────
  function injectTabContent() {
    const contentArea = document.querySelector('.admin-content');
    if (!contentArea || document.getElementById('tabSellers')) return;

    const settingsTab = document.getElementById('tabSettings');

    // SELLERS TAB
    const sellersTab = document.createElement('div');
    sellersTab.className = 'admin-tab hidden';
    sellersTab.id = 'tabSellers';
    sellersTab.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3><i class="fas fa-user-tie"></i> Gestión de Vendedores</h3>
          <div class="admin-card-actions">
            <input type="text" id="adminSellerSearch" class="form-input-sm" placeholder="Buscar vendedor...">
            <button class="btn btn-primary btn-sm" id="adminCreateSellerBtn"><i class="fas fa-plus"></i> Nuevo Vendedor</button>
          </div>
        </div>
        <div class="admin-card-body">
          <div class="admin-table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>ID</th><th>Nombre</th><th>Email</th><th>Teléfono</th>
                  <th>Plan</th><th>Usuarios Gestionados</th><th>Negocios</th>
                  <th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody id="adminSellersBody">
                <tr class="empty-row"><td colspan="9"><div class="empty-state-sm"><p>Cargando vendedores...</p></div></td></tr>
              </tbody>
            </table>
          </div>
          <div class="admin-pagination" id="adminSellersPagination"></div>
        </div>
      </div>
    `;
    settingsTab.parentNode.insertBefore(sellersTab, settingsTab);

    // PAYMENTS TAB
    const paymentsTab = document.createElement('div');
    paymentsTab.className = 'admin-tab hidden';
    paymentsTab.id = 'tabPayments';
    paymentsTab.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3><i class="fas fa-credit-card"></i> Comprobantes de Pago</h3>
          <div class="admin-card-actions">
            <select id="adminPayStatusFilter" class="form-select-sm">
              <option value="">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
            </select>
            <select id="adminPayTypeFilter" class="form-select-sm">
              <option value="">Todos los tipos</option>
              <option value="subscription_quarterly">Suscripción Trimestral</option>
              <option value="subscription_annual">Suscripción Anual</option>
              <option value="product_renewal">Renovación Producto</option>
              <option value="seller_fee">Pago Vendedor</option>
            </select>
            <button class="btn btn-secondary btn-sm" id="adminRefreshPayments"><i class="fas fa-sync-alt"></i></button>
          </div>
        </div>
        <div class="admin-card-body">
          <div class="admin-table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>ID</th><th>Usuario</th><th>Tipo</th><th>Monto</th>
                  <th>Comprobante</th><th>Estado</th><th>Fecha</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody id="adminPaymentsBody">
                <tr class="empty-row"><td colspan="8"><div class="empty-state-sm"><p>Cargando pagos...</p></div></td></tr>
              </tbody>
            </table>
          </div>
          <div class="admin-pagination" id="adminPaymentsPagination"></div>
        </div>
      </div>
    `;
    settingsTab.parentNode.insertBefore(paymentsTab, settingsTab);

    // CREATE SELLER MODAL
    const createSellerModal = document.createElement('div');
    createSellerModal.className = 'modal hidden';
    createSellerModal.id = 'adminCreateSellerModal';
    createSellerModal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content" style="max-width:500px;">
        <div class="modal-header">
          <h3><i class="fas fa-user-plus" style="color:#1a73e8;"></i> Crear Nuevo Vendedor</h3>
          <button class="modal-close" id="createSellerModalClose">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nombre Completo *</label>
            <input type="text" id="newSellerName" class="form-control" placeholder="Nombre del vendedor" required>
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="newSellerEmail" class="form-control" placeholder="correo@ejemplo.com" required>
          </div>
          <div class="form-group">
            <label>Contraseña *</label>
            <input type="password" id="newSellerPassword" class="form-control" placeholder="Min. 6 caracteres" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Teléfono</label>
              <input type="tel" id="newSellerPhone" class="form-control" placeholder="+58 414...">
            </div>
            <div class="form-group">
              <label>WhatsApp</label>
              <input type="tel" id="newSellerWhatsapp" class="form-control" placeholder="+58 414...">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="createSellerCancel">Cancelar</button>
          <button class="btn btn-primary" id="createSellerSubmit"><i class="fas fa-save"></i> Crear Vendedor</button>
        </div>
      </div>
    `;
    document.body.appendChild(createSellerModal);

    // PAYMENT DETAIL MODAL
    const payDetailModal = document.createElement('div');
    payDetailModal.className = 'modal hidden';
    payDetailModal.id = 'adminPaymentDetailModal';
    payDetailModal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content" style="max-width:550px;">
        <div class="modal-header">
          <h3><i class="fas fa-receipt" style="color:#059669;"></i> Detalle de Pago</h3>
          <button class="modal-close" id="payDetailModalClose">&times;</button>
        </div>
        <div class="modal-body" id="payDetailBody">
          <p style="text-align:center;color:#999;">Cargando...</p>
        </div>
        <div class="modal-footer" id="payDetailFooter"></div>
      </div>
    `;
    document.body.appendChild(payDetailModal);
  }

  // ─── 3. INJECT ROLE CHANGE INTO USERS TABLE ──────────────────
  function patchUsersTab() {
    // Add role filter options
    const roleFilter = document.getElementById('adminUserRoleFilter');
    if (roleFilter && !roleFilter.querySelector('[value="seller"]')) {
      roleFilter.insertAdjacentHTML('beforeend', `
        <option value="seller">Vendedores</option>
        <option value="user_premium">Premium</option>
      `);
    }
  }

  // ─── 4. SELLERS CRUD ──────────────────────────────────────────
  let sellersPage = 1;

  async function loadSellers() {
    const search = document.getElementById('adminSellerSearch')?.value || '';
    const params = new URLSearchParams({ page: sellersPage, limit: 15 });
    if (search) params.set('search', search);

    try {
      const res = await fetch(`${API}/sellers?${params}`, { headers: headers() });
      const data = await res.json();
      const tbody = document.getElementById('adminSellersBody');
      if (!tbody) return;

      if (!data.sellers || data.sellers.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state-sm"><p>No hay vendedores.</p></div></td></tr>';
        return;
      }

      tbody.innerHTML = data.sellers.map(s => `
        <tr>
          <td>${s.id}</td>
          <td><strong>${esc(s.name)}</strong></td>
          <td>${esc(s.email)}</td>
          <td>${esc(s.phone || '-')}</td>
          <td><span class="badge" style="background:${s.plan ? '#e8f5e9;color:#28a745' : '#fff3e0;color:#ff6b35'}">${s.plan || 'Gratis'}</span></td>
          <td>${s.managed_users_count || 0}</td>
          <td>${s.businesses_count || 0}</td>
          <td><span class="badge" style="background:${s.is_active ? '#e8f5e9;color:#28a745' : '#fce4ec;color:#e91e63'}">${s.is_active ? 'Activo' : 'Inactivo'}</span></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="window._adminSub.toggleSeller(${s.id}, ${!s.is_active})" title="${s.is_active ? 'Desactivar' : 'Activar'}">
              <i class="fas fa-${s.is_active ? 'ban' : 'check'}"></i>
            </button>
            <button class="btn btn-outline btn-sm" onclick="window._adminSub.viewSeller(${s.id})" title="Ver detalle">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `).join('');

      // Pagination
      renderPagination('adminSellersPagination', data.pagination, (p) => { sellersPage = p; loadSellers(); });
    } catch (e) {
      console.error('Load sellers error:', e);
    }
  }

  async function toggleSeller(id, activate) {
    if (!confirm(activate ? 'Activar este vendedor?' : 'Desactivar este vendedor?')) return;
    try {
      const res = await fetch(`${API}/sellers/${id}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ is_active: activate })
      });
      const data = await res.json();
      if (data.message) { showToast(data.message, 'success'); loadSellers(); }
      else { showToast(data.error, 'error'); }
    } catch (e) { showToast('Error de conexión', 'error'); }
  }

  async function viewSeller(id) {
    try {
      const res = await fetch(`${API}/sellers/${id}`, { headers: headers() });
      const data = await res.json();
      const body = document.getElementById('payDetailBody');
      const footer = document.getElementById('payDetailFooter');
      if (!body) return;

      const s = data.seller;
      body.innerHTML = `
        <div style="text-align:center;margin-bottom:16px;">
          ${s.avatar ? `<img src="${s.avatar}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;">` : '<i class="fas fa-user-tie" style="font-size:3rem;color:#64748b;"></i>'}
          <h3 style="margin:8px 0 4px;">${esc(s.name)}</h3>
          <p style="color:#64748b;">${esc(s.email)} | ${esc(s.phone || 'Sin teléfono')}</p>
          <p>Plan: <strong>${s.plan || 'Gratis'}</strong> | Estado: <strong>${s.is_active ? 'Activo' : 'Inactivo'}</strong></p>
        </div>
        <h4 style="margin:16px 0 8px;"><i class="fas fa-users"></i> Usuarios Gestionados (${data.managed_users?.length || 0})</h4>
        ${data.managed_users?.length ? `<div style="max-height:150px;overflow-y:auto;">${data.managed_users.map(u => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;"><span>${esc(u.name)}</span><span style="color:#64748b;">${u.role} - ${u.account_type || 'free'}</span></div>`).join('')}</div>` : '<p style="color:#999;">Sin usuarios gestionados</p>'}
        <h4 style="margin:16px 0 8px;"><i class="fas fa-building"></i> Negocios (${data.businesses?.length || 0})</h4>
        ${data.businesses?.length ? `<div style="max-height:150px;overflow-y:auto;">${data.businesses.map(b => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;"><span>${esc(b.title)}</span><span class="badge" style="background:${b.status==='approved'?'#e8f5e9':'#fff3e0'}">${b.status}</span></div>`).join('')}</div>` : '<p style="color:#999;">Sin negocios</p>'}
      `;
      footer.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('adminPaymentDetailModal').classList.add('hidden')">Cerrar</button>`;
      document.getElementById('adminPaymentDetailModal').classList.remove('hidden');
      document.getElementById('adminPaymentDetailModal').querySelector('.modal-header h3').innerHTML = '<i class="fas fa-user-tie" style="color:#1a73e8;"></i> Detalle del Vendedor';
    } catch (e) { showToast('Error al cargar detalle', 'error'); }
  }

  async function createSeller() {
    const name = document.getElementById('newSellerName').value.trim();
    const email = document.getElementById('newSellerEmail').value.trim();
    const password = document.getElementById('newSellerPassword').value;
    const phone = document.getElementById('newSellerPhone').value.trim();
    const whatsapp = document.getElementById('newSellerWhatsapp').value.trim();

    if (!name || !email || !password) { showToast('Nombre, email y contraseña son requeridos', 'error'); return; }

    try {
      const res = await fetch(`${API}/sellers`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ name, email, password, phone, whatsapp })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Vendedor creado exitosamente', 'success');
        document.getElementById('adminCreateSellerModal').classList.add('hidden');
        loadSellers();
      } else {
        showToast(data.error || 'Error al crear vendedor', 'error');
      }
    } catch (e) { showToast('Error de conexión', 'error'); }
  }

  // ─── 5. PAYMENTS MANAGEMENT ──────────────────────────────────
  let paymentsPage = 1;

  async function loadPayments() {
    const statusFilter = document.getElementById('adminPayStatusFilter')?.value || '';
    const typeFilter = document.getElementById('adminPayTypeFilter')?.value || '';
    const params = new URLSearchParams({ page: paymentsPage, limit: 15 });
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('payment_type', typeFilter);

    try {
      const res = await fetch(`${API}/payments?${params}`, { headers: headers() });
      const data = await res.json();
      const tbody = document.getElementById('adminPaymentsBody');
      if (!tbody) return;

      if (!data.payments || data.payments.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="8"><div class="empty-state-sm"><p>No hay pagos.</p></div></td></tr>';
        return;
      }

      const typeLabels = {
        subscription_quarterly: 'Trimestral $30',
        subscription_annual: 'Anual $100',
        product_renewal: 'Renovación $1',
        seller_fee: 'Vendedor'
      };

      const statusStyles = {
        pending: 'background:#fff3e0;color:#ff6b35',
        approved: 'background:#e8f5e9;color:#28a745',
        rejected: 'background:#fce4ec;color:#e91e63'
      };

      tbody.innerHTML = data.payments.map(p => `
        <tr>
          <td>#${p.id}</td>
          <td><strong>${esc(p.user_name || 'N/A')}</strong><br><small style="color:#64748b;">${esc(p.user_email || '')}</small></td>
          <td>${typeLabels[p.payment_type] || p.payment_type}</td>
          <td><strong>$${p.amount}</strong></td>
          <td>${p.proof_url ? `<a href="${p.proof_url}" target="_blank" class="btn btn-outline btn-sm"><i class="fas fa-image"></i> Ver</a>` : '-'}</td>
          <td><span class="badge" style="${statusStyles[p.status] || ''}">${p.status}</span></td>
          <td>${formatDate(p.created_at)}</td>
          <td>
            ${p.status === 'pending' ? `
              <button class="btn btn-sm" style="background:#28a745;color:#fff;" onclick="window._adminSub.verifyPayment(${p.id}, 'approve')"><i class="fas fa-check"></i></button>
              <button class="btn btn-sm" style="background:#e91e63;color:#fff;" onclick="window._adminSub.verifyPayment(${p.id}, 'reject')"><i class="fas fa-times"></i></button>
            ` : '-'}
          </td>
        </tr>
      `).join('');

      renderPagination('adminPaymentsPagination', data.pagination, (p) => { paymentsPage = p; loadPayments(); });
    } catch (e) { console.error('Load payments error:', e); }
  }

  async function verifyPayment(paymentId, action) {
    const actionText = action === 'approve' ? 'aprobar' : 'rechazar';
    const notes = action === 'reject' ? prompt(`Razón del rechazo (opcional):`) : null;

    try {
      const body = { payment_id: paymentId, action };
      if (notes) body.admin_notes = notes;

      const res = await fetch(`${API}/payments/verify`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.message) {
        showToast(`Pago ${actionText === 'aprobar' ? 'aprobado' : 'rechazado'} exitosamente`, 'success');
        loadPayments();
        loadNotifications();
      } else {
        showToast(data.error || 'Error al procesar pago', 'error');
      }
    } catch (e) { showToast('Error de conexión', 'error'); }
  }

  // ─── 6. NOTIFICATIONS ────────────────────────────────────────
  async function loadNotifications() {
    try {
      const res = await fetch(`${API}/notifications?limit=1&unread=true`, { headers: headers() });
      if (res.status === 403) return; // not admin
      const data = await res.json();
      const count = data.unread_count || 0;
      const countEl = document.getElementById('adminNotifCount');
      const badge = document.getElementById('adminPaymentsBadge');

      if (countEl) {
        countEl.textContent = count > 9 ? '9+' : count;
        countEl.style.display = count > 0 ? 'flex' : 'none';
      }

      // Update payments badge with pending count
      try {
        const payRes = await fetch(`${API}/payments?status=pending&limit=1`, { headers: headers() });
        const payData = await payRes.json();
        const pendingCount = payData.pagination?.total || 0;
        if (badge) {
          badge.textContent = pendingCount;
          badge.style.display = pendingCount > 0 ? 'inline' : 'none';
        }
      } catch(e) {}
    } catch (e) { /* silently fail */ }
  }

  // ─── 7. ROLE CHANGE (in users tab) ───────────────────────────
  // Monkey-patch: add role change button to user rows
  const origLoadUsers = window._origLoadUsers;

  function patchUsersTable() {
    // Observe users table for changes and add role-change dropdown
    const observer = new MutationObserver(() => {
      const rows = document.querySelectorAll('#adminUsersTableBody tr:not(.empty-row)');
      rows.forEach(row => {
        if (row.querySelector('.role-change-btn')) return;
        const userId = row.cells[0]?.textContent;
        if (!userId) return;
        const actionsCell = row.cells[row.cells.length - 1];
        if (!actionsCell) return;

        const roleChangeHtml = `
          <select class="form-select-sm role-change-btn" style="font-size:0.75rem;padding:2px 6px;width:auto;" data-user-id="${userId}" onchange="window._adminSub.changeRole(this)">
            <option value="">Cambiar rol...</option>
            <option value="user">Usuario</option>
            <option value="user_premium">Premium</option>
            <option value="seller">Vendedor</option>
            <option value="admin">Admin</option>
          </select>`;
        actionsCell.insertAdjacentHTML('afterbegin', roleChangeHtml);
      });
    });

    const tbody = document.getElementById('adminUsersTableBody');
    if (tbody) observer.observe(tbody, { childList: true });
  }

  async function changeRole(selectEl) {
    const userId = selectEl.dataset.userId;
    const newRole = selectEl.value;
    if (!newRole) return;

    const roleLabels = { user: 'Usuario', user_premium: 'Premium', seller: 'Vendedor', admin: 'Admin' };
    if (!confirm(`Cambiar usuario #${userId} a rol "${roleLabels[newRole]}"?`)) {
      selectEl.value = '';
      return;
    }

    try {
      const res = await fetch(`${API}/users/role`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ user_id: parseInt(userId), new_role: newRole })
      });
      const data = await res.json();
      if (data.message) {
        showToast(data.message, 'success');
        // Reload users by clicking the users tab
        document.querySelector('[data-tab="users"]')?.click();
      } else {
        showToast(data.error || 'Error al cambiar rol', 'error');
      }
    } catch (e) { showToast('Error de conexión', 'error'); }
    selectEl.value = '';
  }

  // ─── HELPERS ──────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
    catch(e) { return dateStr; }
  }

  function renderPagination(containerId, pagination, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container || !pagination || pagination.totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    let html = '';
    for (let i = 1; i <= pagination.totalPages; i++) {
      if (i === pagination.page) {
        html += `<button class="btn btn-sm btn-primary" disabled>${i}</button>`;
      } else {
        html += `<button class="btn btn-sm btn-outline" onclick="void(0)">${i}</button>`;
      }
    }
    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('.btn-outline').forEach(btn => {
      btn.addEventListener('click', () => onPageChange(parseInt(btn.textContent)));
    });
  }

  function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) { alert(msg); return; }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type || 'info'}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // ─── EVENT BINDING ────────────────────────────────────────────
  function bindEvents() {
    // Tab navigation for new tabs
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-tab="sellers"], [data-tab="payments"]');
      if (!link) return;
      e.preventDefault();

      // Hide all tabs
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
      document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));

      const tabName = link.dataset.tab;
      const tabEl = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
      if (tabEl) tabEl.classList.remove('hidden');
      link.classList.add('active');

      // Update page title
      const titles = { sellers: 'Vendedores', payments: 'Pagos' };
      document.getElementById('adminPageTitle').textContent = titles[tabName] || tabName;

      // Load data
      if (tabName === 'sellers') loadSellers();
      if (tabName === 'payments') loadPayments();
    });

    // Create seller
    document.getElementById('adminCreateSellerBtn')?.addEventListener('click', () => {
      document.getElementById('adminCreateSellerModal')?.classList.remove('hidden');
    });
    document.getElementById('createSellerSubmit')?.addEventListener('click', createSeller);
    document.getElementById('createSellerCancel')?.addEventListener('click', () => {
      document.getElementById('adminCreateSellerModal')?.classList.add('hidden');
    });
    document.getElementById('createSellerModalClose')?.addEventListener('click', () => {
      document.getElementById('adminCreateSellerModal')?.classList.add('hidden');
    });

    // Payment filters
    document.getElementById('adminPayStatusFilter')?.addEventListener('change', () => { paymentsPage = 1; loadPayments(); });
    document.getElementById('adminPayTypeFilter')?.addEventListener('change', () => { paymentsPage = 1; loadPayments(); });
    document.getElementById('adminRefreshPayments')?.addEventListener('click', loadPayments);

    // Seller search
    document.getElementById('adminSellerSearch')?.addEventListener('input', () => { sellersPage = 1; loadSellers(); });

    // Close modals
    document.getElementById('payDetailModalClose')?.addEventListener('click', () => {
      document.getElementById('adminPaymentDetailModal')?.classList.add('hidden');
    });

    // Notification bell
    document.getElementById('adminNotifBell')?.addEventListener('click', () => {
      // Switch to payments tab to see pending payments
      document.querySelector('[data-tab="payments"]')?.click();
    });
  }

  // ─── INIT ─────────────────────────────────────────────────────
  function init() {
    // Only run on admin page
    if (!document.getElementById('tabDashboard')) return;

    injectSidebarItems();
    injectTabContent();
    patchUsersTab();
    bindEvents();
    patchUsersTable();
    loadNotifications();

    // Refresh notifications every 30s
    setInterval(loadNotifications, 30000);

    // Expose functions for inline onclick
    window._adminSub = {
      toggleSeller,
      viewSeller,
      verifyPayment,
      changeRole
    };
  }

  // Wait for DOM + existing admin.js to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }

})();