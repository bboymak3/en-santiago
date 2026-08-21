/**
 * Subscription Gating Module v2
 * Runs on all public pages. Controls access based on owner's subscription.
 * - Free users: no WhatsApp button, products expire in 7 days, no full profile view
 * - Premium users: full access, WhatsApp, no expiration, premium badges
 */

(function() {
  'use strict';

  const PLANES_URL = '/planes.html';
  const PAGO_URL = '/pago.html';

  // ─── HELPERS ─────────────────────────────────────────────────
  function isOwnerPremium(ownerRole, ownerAccountType, ownerPlan) {
    if (!ownerRole) return true; // If no role data, show everything (backwards compat)
    return ownerRole === 'admin' || ownerRole === 'user_premium' || 
           ownerRole === 'seller' || ownerAccountType === 'premium' ||
           ownerAccountType === 'paid' || ownerPlan === 'annual' || ownerPlan === 'quarterly';
  }

  function isProductExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  function getCurrentUser() {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch(e) { return null; }
  }

  // ─── SUBSCRIPTION MODAL ─────────────────────────────────────
  let modalShown = false;
  function showSubscriptionModal(reason) {
    if (modalShown) return;
    modalShown = true;

    const overlay = document.createElement('div');
    overlay.id = 'subModalOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:32px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;animation:subModalIn 0.3s ease;">
        <button onclick="document.getElementById('subModalOverlay').remove();window._subModalShown=false;" 
                style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#999;line-height:1;">&times;</button>
        <div style="width:64px;height:64px;margin:0 auto 16px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-crown" style="font-size:28px;color:#fff;"></i>
        </div>
        <h3 style="margin:0 0 8px;color:#1a1a2e;font-size:1.3rem;">${reason === 'whatsapp' ? 'Contactar por WhatsApp' : reason === 'profile' ? 'Ver Perfil Completo' : 'Función Premium'}</h3>
        <p style="color:#666;margin:0 0 24px;font-size:0.95rem;line-height:1.5;">
          ${reason === 'whatsapp' ? 'El contacto por WhatsApp está disponible solo para vendedores Premium. Suscríbete para conectar directamente con tus clientes.' : 
            reason === 'profile' ? 'La vista de perfil completo es una función Premium. Suscríbete para acceder a toda la información del negocio.' :
            'Esta función requiere una suscripción Premium.'}
        </p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="${PAGO_URL}" style="display:block;padding:12px 24px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:0.95rem;">
            <i class="fas fa-bolt"></i> Suscribirme Ahora
          </a>
          <a href="${PLANES_URL}" style="display:block;padding:10px 24px;background:#f3f4f6;color:#374151;text-decoration:none;border-radius:10px;font-weight:500;font-size:0.9rem;">
            Ver Planes
          </a>
        </div>
      </div>
      <style>@keyframes subModalIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}</style>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { overlay.remove(); modalShown = false; }
    });
  }

  // Make accessible to inline onclick
  window.showSubscriptionModal = showSubscriptionModal;
  window._subModalShown = false;
  Object.defineProperty(window, '_subModalShown', {
    get: () => modalShown,
    set: (v) => { modalShown = v; }
  });

  // ─── MARKETPLACE: Patch renderProductCard ───────────────────
  function patchMarketplace() {
    const origRender = window.renderProductCard;
    if (!origRender) return;

    window.renderProductCard = function(product) {
      const html = origRender(product);
      if (!html) return html;

      const premium = isOwnerPremium(product.owner_role, product.owner_account_type, product.plan);
      const expired = isProductExpired(product.expires_at);

      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Hide WhatsApp button for free users
      if (!premium) {
        const waBtns = temp.querySelectorAll('.mp-btn-whatsapp, .btn-whatsapp, a[href*="wa.me"], a[href*="whatsapp"]');
        waBtns.forEach(btn => {
          btn.style.display = 'none';
        });
        // If no WhatsApp, check for any contact button and add a premium gate
        const contactBtn = temp.querySelector('.mp-btn-contact, .btn-contact');
        if (contactBtn && !contactBtn.dataset.gated) {
          contactBtn.dataset.gated = '1';
          contactBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSubscriptionModal('whatsapp');
          });
        }
      }

      // Add premium badge
      if (premium) {
        const imageDiv = temp.querySelector('.mp-card-image, .product-image');
        if (imageDiv) {
          imageDiv.style.position = 'relative';
          imageDiv.insertAdjacentHTML('afterbegin', 
            '<span style="position:absolute;top:8px;right:8px;z-index:2;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:0.65rem;padding:2px 8px;border-radius:10px;font-weight:700;box-shadow:0 2px 8px rgba(217,119,6,0.4);"><i class="fas fa-crown"></i> Premium</span>');
        }
      }

      // Handle expired products
      if (expired) {
        const card = temp.querySelector('.mp-card, .product-card');
        if (card) {
          card.style.opacity = '0.6';
          card.style.position = 'relative';
          card.style.pointerEvents = 'none';
          const imageDiv = temp.querySelector('.mp-card-image, .product-image');
          if (imageDiv) {
            imageDiv.style.position = 'relative';
            imageDiv.insertAdjacentHTML('afterbegin', 
              '<span style="position:absolute;top:8px;left:8px;z-index:2;background:#ef4444;color:#fff;font-size:0.65rem;padding:2px 8px;border-radius:10px;font-weight:700;"><i class="fas fa-clock"></i> Expirado</span>');
          }
          // Hide all action buttons on expired
          temp.querySelectorAll('.mp-btn-whatsapp, .btn-whatsapp, .mp-btn-contact, .btn-contact').forEach(b => b.style.display = 'none');
        }
      }

      return temp.innerHTML;
    };
  }

  // ─── BUSINESS DETAIL: Condition WhatsApp & Profile ─────────
  function patchBusinessPage() {
    // Wait for business data to load
    const checkBusiness = () => {
      // Find WhatsApp links
      const waLinks = document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"], .btn-whatsapp, #btnWhatsApp');
      if (waLinks.length === 0) return;

      // Try to get owner info from window or data attributes
      const ownerRole = window._businessData?.owner_role || 
                        document.querySelector('[data-owner-role]')?.dataset.ownerRole;
      const ownerType = window._businessData?.owner_account_type || 
                        document.querySelector('[data-owner-type]')?.dataset.ownerType;
      const ownerPlan = window._businessData?.plan;

      const premium = isOwnerPremium(ownerRole, ownerType, ownerPlan);

      if (!premium) {
        waLinks.forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSubscriptionModal('whatsapp');
          });
          // Also change the visual to indicate premium needed
          if (!link.dataset.gated) {
            link.dataset.gated = '1';
            link.style.position = 'relative';
          }
        });
      }
    };

    setTimeout(checkBusiness, 1500);
    setTimeout(checkBusiness, 3000);
    setTimeout(checkBusiness, 5000);
  }

  // ─── PROFILE VIEW GATING ────────────────────────────────────
  function patchProfileLinks() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href*="perfil"], a[href*="profile"], a[data-profile]');
      if (!link) return;

      // Check if the link points to a user/business profile
      const href = link.getAttribute('href') || '';
      if (!href.includes('perfil') && !href.includes('profile')) return;

      // If current user is not premium, show modal
      const currentUser = getCurrentUser();
      if (currentUser && !isOwnerPremium(currentUser.role, currentUser.account_type, currentUser.plan)) {
        // Don't block if it's their OWN profile
        const userId = new URLSearchParams(href.split('?')[1]).get('id') || 
                       href.split('/').pop();
        if (userId && parseInt(userId) !== currentUser.id) {
          e.preventDefault();
          e.stopPropagation();
          showSubscriptionModal('profile');
        }
      }
    });
  }

  // ─── INIT ─────────────────────────────────────────────────────
  function init() {
    const path = window.location.pathname;

    // Marketplace cards
    if (path.includes('marketplace') || path.includes('productos')) {
      const checkRender = setInterval(() => {
        if (window.renderProductCard) {
          clearInterval(checkRender);
          patchMarketplace();
        }
      }, 200);
      setTimeout(() => clearInterval(checkRender), 10000);
    }

    // Business detail page
    if (path.includes('negocio') || path.includes('business-detail') || path.includes('business')) {
      patchBusinessPage();
    }

    // Profile view gating (all pages)
    patchProfileLinks();

    // Home page cards
    if (path === '/' || path.includes('index')) {
      const checkRender = setInterval(() => {
        if (window.renderProductCard) {
          clearInterval(checkRender);
          patchMarketplace();
        }
      }, 200);
      setTimeout(() => clearInterval(checkRender), 10000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();