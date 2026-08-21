/**
 * Dashboard Subscription Module
 * Adds "Mi Suscripción" section to user dashboard
 * Shows plan status, allows uploading payment proof
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

  // ─── 1. INJECT SIDEBAR LINK ──────────────────────────────────
  function injectSidebarLink() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('dashSubLink')) return;

    const profileLink = nav.querySelector('[data-section="profile"]');
    if (profileLink) {
      profileLink.insertAdjacentHTML('beforebegin', `
        <a href="#" class="sidebar-link" data-section="subscription" id="dashSubLink">
          <i class="fas fa-crown"></i> Mi Suscripción
          <span class="badge" id="dashSubBadge" style="background:#f59e0b;display:none;">!</span>
        </a>
      `);
    }
  }

  // ─── 2. INJECT SECTION CONTENT ───────────────────────────────
  function injectSection() {
    const sectionArea = document.querySelector('.dashboard-content');
    if (!sectionArea || document.getElementById('sectionSubscription')) return;

    const statsSection = document.getElementById('sectionStats');

    const section = document.createElement('section');
    section.className = 'dashboard-section hidden';
    section.id = 'sectionSubscription';
    section.innerHTML = `
      <div class="dash-card">
        <div class="dash-card-header">
          <h3><i class="fas fa-crown" style="color:#f59e0b;"></i> Mi Suscripción</h3>
        </div>
        <div class="dash-card-body" id="subContent">
          <div style="text-align:center;padding:40px;color:#999;">
            <i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i>
            <p style="margin-top:12px;">Cargando información de suscripción...</p>
          </div>
        </div>
      </div>

      <!-- Upload Payment Proof -->
      <div class="dash-card" style="margin-top:16px;">
        <div class="dash-card-header">
          <h3><i class="fas fa-upload" style="color:#059669;"></i> Subir Comprobante de Pago</h3>
        </div>
        <div class="dash-card-body">
          <div class="form-group">
            <label>Tipo de Pago *</label>
            <select id="subPayType" class="form-control" style="max-width:400px;">
              <option value="">Seleccionar...</option>
              <option value="subscription_quarterly">Suscripción Trimestral - $30 USD</option>
              <option value="subscription_annual">Suscripción Anual - $100 USD</option>
              <option value="product_renewal">Renovación de Producto - $1 USD</option>
            </select>
          </div>
          <div class="form-group" id="subPayAmountGroup" style="display:none;">
            <label>Monto (USD) *</label>
            <input type="number" id="subPayAmount" class="form-control" style="max-width:200px;" readonly>
          </div>
          <div class="form-group">
            <label>Comprobante de Pago (imagen) *</label>
            <input type="file" id="subPayProof" accept="image/*" class="form-control" style="max-width:400px;">
            <small style="color:#6b7280;">Sube la captura del pago realizado</small>
          </div>
          <div id="subPayProofPreview" style="margin:8px 0;max-width:300px;"></div>
          <div class="form-group">
            <label>Notas (opcional)</label>
            <textarea id="subPayNotes" class="form-control" rows="2" placeholder="Referencia del pago, número de transacción..." style="max-width:400px;"></textarea>
          </div>
          <button class="btn btn-primary" id="subPaySubmit" style="background:linear-gradient(135deg,#f59e0b,#d97706);">
            <i class="fas fa-paper-plane"></i> Enviar Comprobante
          </button>
          <div id="subPayStatus" style="margin-top:12px;"></div>
        </div>
      </div>

      <!-- Payment History -->
      <div class="dash-card" style="margin-top:16px;">
        <div class="dash-card-header">
          <h3><i class="fas fa-history" style="color:#64748b;"></i> Historial de Pagos</h3>
        </div>
        <div class="dash-card-body">
          <div id="subPayHistory">
            <p style="color:#999;text-align:center;padding:20px;">Cargando historial...</p>
          </div>
        </div>
      </div>
    `;
    statsSection.parentNode.insertBefore(section, statsSection);
  }

  // ─── 3. LOAD SUBSCRIPTION INFO ───────────────────────────────
  async function loadSubscription() {
    const contentEl = document.getElementById('subContent');
    if (!contentEl) return;

    try {
      const res = await fetch(`${API}/subscription/check`, { headers: headers() });
      if (res.status === 401) { window.location.href = '/login.html'; return; }
      const data = await res.json();

      const sub = data.subscription;
      const stats = data.product_stats || {};
      const plans = data.plans || [];
      const isPremium = sub.is_premium;

      // Update badge
      const badge = document.getElementById('dashSubBadge');
      if (badge) {
        badge.style.display = (!isPremium && sub.plan_status !== 'admin_lifetime') ? 'inline' : 'none';
      }

      // Status display
      let statusHtml = '';
      if (sub.plan_status === 'admin_lifetime') {
        statusHtml = `
          <div style="text-align:center;padding:20px;">
            <i class="fas fa-shield-alt" style="font-size:3rem;color:#f59e0b;"></i>
            <h3 style="margin:12px 0 4px;color:#f59e0b;">Cuenta Administrador</h3>
            <p style="color:#64748b;">Tienes acceso completo a todas las funciones.</p>
          </div>`;
      } else if (sub.plan_status === 'active') {
        statusHtml = `
          <div style="text-align:center;padding:20px;">
            <i class="fas fa-crown" style="font-size:3rem;color:#f59e0b;"></i>
            <h3 style="margin:12px 0 4px;color:#059669;">Plan ${sub.plan === 'quarterly' ? 'Trimestral' : 'Anual'} Activo</h3>
            <p style="color:#64748b;">Quedan <strong style="color:#059669;">${sub.days_remaining} días</strong> de suscripción.</p>
            <p style="color:#9ca3af;font-size:0.85rem;margin-top:4px;">Vence: ${sub.plan_expires_at ? new Date(sub.plan_expires_at).toLocaleDateString('es-VE') : '-'}</p>
          </div>`;
      } else if (sub.plan_status === 'expired') {
        statusHtml = `
          <div style="text-align:center;padding:20px;">
            <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:#e91e63;"></i>
            <h3 style="margin:12px 0 4px;color:#e91e63;">Plan Expirado</h3>
            <p style="color:#64748b;">Tu suscripción ha vencido. Renueva para seguir disfrutando de los beneficios premium.</p>
          </div>`;
      } else {
        statusHtml = `
          <div style="text-align:center;padding:20px;">
            <i class="fas fa-user" style="font-size:3rem;color:#64748b;"></i>
            <h3 style="margin:12px 0 4px;">Cuenta Gratuita</h3>
            <p style="color:#64748b;">Tus productos expiran en 7 días y no tienes acceso a WhatsApp directo.</p>
          </div>`;
      }

      // Product stats
      const statsHtml = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;">
          <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px;">
            <div style="font-size:1.5rem;font-weight:700;color:#1a73e8;">${stats.total_products || 0}</div>
            <div style="font-size:0.8rem;color:#64748b;">Total</div>
          </div>
          <div style="text-align:center;padding:12px;background:#f0fdf4;border-radius:8px;">
            <div style="font-size:1.5rem;font-weight:700;color:#28a745;">${stats.active_products || 0}</div>
            <div style="font-size:0.8rem;color:#64748b;">Activos</div>
          </div>
          <div style="text-align:center;padding:12px;background:#fef2f2;border-radius:8px;">
            <div style="font-size:1.5rem;font-weight:700;color:#e91e63;">${stats.expired_products || 0}</div>
            <div style="font-size:0.8rem;color:#64748b;">Expirados</div>
          </div>
        </div>`;

      // Plans comparison
      let plansHtml = '';
      if (!isPremium) {
        plansHtml = `
          <div style="margin-top:24px;">
            <h4 style="margin-bottom:12px;text-align:center;"><i class="fas fa-star" style="color:#f59e0b;"></i> Planes Disponibles</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:600px;margin:0 auto;">
              ${plans.map(p => `
                <div style="border:2px solid ${p.id === 'annual' ? '#f59e0b' : '#d1d5db'};border-radius:12px;padding:20px;text-align:center;${p.id === 'annual' ? 'background:#fffbeb;' : ''}">
                  <h4 style="color:${p.id === 'annual' ? '#f59e0b' : '#374151'};">${p.name}</h4>
                  <div style="font-size:2rem;font-weight:800;margin:8px 0;">$${p.price}<small style="font-size:0.9rem;color:#64748b;">/${p.duration}</small></div>
                  <ul style="text-align:left;font-size:0.85rem;color:#475569;padding-left:18px;">
                    ${p.features.map(f => `<li style="margin:4px 0;"><i class="fas fa-check" style="color:#28a745;margin-right:4px;"></i>${f}</li>`).join('')}
                  </ul>
                  <button class="btn btn-primary btn-sm" style="margin-top:12px;${p.id === 'annual' ? 'background:#f59e0b;' : ''}" onclick="document.getElementById('subPayType').value='${p.payment_type || p.id}';document.getElementById('subPayType').dispatchEvent(new Event('change'));document.getElementById('subPayType').scrollIntoView({behavior:'smooth'});">
                    Elegir Plan
                  </button>
                </div>
              `).join('')}
            </div>
          </div>`;
      }

      contentEl.innerHTML = statusHtml + statsHtml + plansHtml;

      // Load payment history
      loadPaymentHistory();

    } catch (e) {
      contentEl.innerHTML = `<p style="color:#e91e63;text-align:center;">Error al cargar suscripción: ${e.message}</p>`;
    }
  }

  // ─── 4. PAYMENT HISTORY ──────────────────────────────────────
  async function loadPaymentHistory() {
    const container = document.getElementById('subPayHistory');
    if (!container) return;

    try {
      const res = await fetch(`${API}/payments?limit=10`, { headers: headers() });
      const data = await res.json();

      if (!data.payments || data.payments.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;">No hay pagos registrados.</p>';
        return;
      }

      const typeLabels = {
        subscription_quarterly: 'Trimestral $30',
        subscription_annual: 'Anual $100',
        product_renewal: 'Renovación $1',
        seller_fee: 'Vendedor'
      };
      const statusColors = {
        pending: '#ff6b35',
        approved: '#28a745',
        rejected: '#e91e63'
      };

      container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb;">
              <th style="text-align:left;padding:8px;">Tipo</th>
              <th style="text-align:left;padding:8px;">Monto</th>
              <th style="text-align:left;padding:8px;">Estado</th>
              <th style="text-align:left;padding:8px;">Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${data.payments.map(p => `
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:8px;">${typeLabels[p.payment_type] || p.payment_type}</td>
                <td style="padding:8px;font-weight:600;">$${p.amount}</td>
                <td style="padding:8px;">
                  <span style="color:${statusColors[p.status] || '#64748b'};font-weight:600;">
                    ${p.status === 'pending' ? 'Pendiente' : p.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                  </span>
                  ${p.admin_notes ? `<br><small style="color:#9ca3af;">${p.admin_notes}</small>` : ''}
                </td>
                <td style="padding:8px;color:#64748b;">${new Date(p.created_at).toLocaleDateString('es-VE')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } catch (e) {
      container.innerHTML = '<p style="color:#e91e63;">Error al cargar historial</p>';
    }
  }

  // ─── 5. UPLOAD PAYMENT PROOF ──────────────────────────────────
  async function submitPayment() {
    const payType = document.getElementById('subPayType')?.value;
    const proofFile = document.getElementById('subPayProof')?.files[0];
    const notes = document.getElementById('subPayNotes')?.value?.trim();
    const statusEl = document.getElementById('subPayStatus');

    if (!payType) { showStatus('Selecciona un tipo de pago', 'error'); return; }
    if (!proofFile) { showStatus('Adjunta el comprobante de pago', 'error'); return; }

    showStatus('<i class="fas fa-spinner fa-spin"></i> Subiendo comprobante...', 'info');

    try {
      // Upload proof image first
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('folder', 'payments');

      const uploadRes = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}` },
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.url) {
        showStatus('Error al subir imagen. Intenta de nuevo.', 'error');
        return;
      }

      // Determine amount based on type
      const amounts = { subscription_quarterly: 30, subscription_annual: 100, product_renewal: 1 };
      const amount = amounts[payType] || 0;

      // Submit payment
      const payRes = await fetch(`${API}/payments`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          amount,
          payment_type: payType,
          proof_url: uploadData.url,
          notes
        })
      });
      const payData = await payRes.json();

      if (payRes.ok) {
        showStatus(payData.message, 'success');
        // Reset form
        document.getElementById('subPayType').value = '';
        document.getElementById('subPayProof').value = '';
        document.getElementById('subPayNotes').value = '';
        document.getElementById('subPayProofPreview').innerHTML = '';
        // Reload
        setTimeout(() => loadSubscription(), 1500);
      } else {
        showStatus(payData.error || 'Error al enviar pago', 'error');
      }
    } catch (e) {
      showStatus(`Error: ${e.message}`, 'error');
    }
  }

  function showStatus(msg, type) {
    const el = document.getElementById('subPayStatus');
    if (!el) return;
    const colors = { success: '#28a745', error: '#e91e63', info: '#1a73e8' };
    el.innerHTML = `<p style="color:${colors[type] || '#64748b'};font-weight:600;">${msg}</p>`;
  }

  // ─── 6. EVENT BINDING ─────────────────────────────────────────
  function bindEvents() {
    // Tab navigation
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-section="subscription"]');
      if (!link) return;
      e.preventDefault();

      // Use existing dashboard tab system
      if (window.showSection) {
        window.showSection('subscription');
      }
    });

    // Pay type change - show amount
    document.getElementById('subPayType')?.addEventListener('change', (e) => {
      const amountGroup = document.getElementById('subPayAmountGroup');
      const amountInput = document.getElementById('subPayAmount');
      const amounts = { subscription_quarterly: 30, subscription_annual: 100, product_renewal: 1 };
      if (e.target.value && amounts[e.target.value]) {
        amountGroup.style.display = 'block';
        amountInput.value = `$${amounts[e.target.value]} USD`;
      } else {
        amountGroup.style.display = 'none';
      }
    });

    // Proof image preview
    document.getElementById('subPayProof')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const preview = document.getElementById('subPayProofPreview');
      if (file && preview) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          preview.innerHTML = `<img src="${ev.target.result}" style="max-width:280px;max-height:200px;border-radius:8px;border:1px solid #e5e7eb;">`;
        };
        reader.readAsDataURL(file);
      }
    });

    // Submit payment
    document.getElementById('subPaySubmit')?.addEventListener('click', submitPayment);
  }

  // ─── INIT ─────────────────────────────────────────────────────
  function init() {
    if (!document.querySelector('.sidebar-nav')) return;

    injectSidebarLink();
    injectSection();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
  } else {
    setTimeout(init, 300);
  }

})();