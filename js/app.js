/**
 * En Santiago - Core Application Module
 * Common module loaded on ALL pages
 * Directorio Metropolitano de Negocios de Santiago de Chile
 */

// ─── API Configuration ──────────────────────────────────────────
const API = '/api';

// ─── Token Management ──────────────────────────────────────────
const TOKEN_KEY = 'meriden-santiago_token';
const USER_KEY = 'meriden-santiago_user';

// ─── Santiago de Chile States ────────────────────────────────────────────
const CLNEZUELA_STATES = [
  { name: 'Amazonas', slug: 'amazonas' },
  { name: 'Anzoátegui', slug: 'anzoategui' },
  { name: 'Apure', slug: 'apure' },
  { name: 'Aragua', slug: 'aragua' },
  { name: 'Santiago', slug: 'santiago' },
  { name: 'Bolívar', slug: 'bolivar' },
  { name: 'Carabobo', slug: 'carabobo' },
  { name: 'Cojedes', slug: 'cojedes' },
  { name: 'Delta Amacuro', slug: 'delta-amacuro' },
  { name: 'Distrito Capital', slug: 'distrito-capital' },
  { name: 'Falcón', slug: 'falcon' },
  { name: 'Guárico', slug: 'guarico' },
  { name: 'Lara', slug: 'lara' },
  { name: 'Mérida', slug: 'santiago' },
  { name: 'Miranda', slug: 'miranda' },
  { name: 'Monagas', slug: 'monagas' },
  { name: 'Nueva Esparta', slug: 'nueva-esparta' },
  { name: 'Portuguesa', slug: 'portuguesa' },
  { name: 'Sucre', slug: 'sucre' },
  { name: 'Táchira', slug: 'tachira' },
  { name: 'Trujillo', slug: 'trujillo' },
  { name: 'Vargas', slug: 'vargas' },
  { name: 'Yaracuy', slug: 'yaracuy' },
  { name: 'Zulia', slug: 'zulia' },
];

const LOCATION_KEY = 'en-santiago_selected_state';

// ─── Location Selector System ───────────────────────────────────
function getSelectedState() {
  return localStorage.getItem(LOCATION_KEY) || '';
}

function setSelectedState(stateName) {
  if (stateName) {
    localStorage.setItem(LOCATION_KEY, stateName);
  } else {
    localStorage.removeItem(LOCATION_KEY);
  }
  updateBrandDisplay(stateName);
  updateLocationLabel(stateName);
  // Reload all index page sections filtered by state
  const featuredGrid = document.getElementById('featuredGrid');
  if (featuredGrid) {
    loadFeaturedProperties();
  }
  const featuredPropertiesGrid = document.getElementById('featuredPropertiesGrid');
  if (featuredPropertiesGrid) {
    loadFeaturedPropertiesSection();
  }
  const featuredProductsGrid = document.getElementById('featuredProductsGrid');
  if (featuredProductsGrid) {
    loadFeaturedProducts();
  }
  const featuredJobsGrid = document.getElementById('featuredJobsGrid');
  if (featuredJobsGrid) {
    loadFeaturedJobs();
  }
  const searchGrid = document.getElementById('searchResultsGrid');
  if (searchGrid) {
    executeSearch(1);
  }
}

function updateBrandDisplay(stateName) {
  // Update all #brandCity elements
  document.querySelectorAll('#brandCity').forEach(el => {
    el.textContent = stateName ? stateName + ' ' : '';
  });
  // Update page title dynamically
  if (stateName) {
    document.title = stateName + ' En Santiago - Directorio de Negocios';
  } else {
    document.title = 'En Santiago - Directorio de Negocios en Santiago de Chile';
  }
}

function updateLocationLabel(stateName) {
  const label = document.getElementById('locationLabel');
  if (label) {
    label.textContent = stateName || 'Todo Santiago de Chile';
  }
}

function initLocationSelector() {
  const locationBtn = document.getElementById('locationBtn');
  const locationDropdown = document.getElementById('locationDropdown');
  const locationList = document.getElementById('locationList');
  const locationSearchInput = document.getElementById('locationSearchInput');
  const locationSelector = document.getElementById('locationSelector');

  if (!locationBtn || !locationDropdown || !locationList) return;

  // Populate states list
  locationList.innerHTML = CLNEZUELA_STATES.map(state => `
    <div class="location-option" data-state="${state.name}">
      <i class="fas fa-map-marker-alt"></i>
      <span>${state.name}</span>
    </div>
  `).join('');

  // Toggle dropdown
  locationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    locationDropdown.classList.toggle('hidden');
    locationBtn.classList.toggle('active');
    if (!locationDropdown.classList.contains('hidden') && locationSearchInput) {
      locationSearchInput.value = '';
      filterLocations('');
      locationSearchInput.focus();
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!locationSelector.contains(e.target)) {
      locationDropdown.classList.add('hidden');
      locationBtn.classList.remove('active');
    }
  });

  // State option click
  locationList.addEventListener('click', (e) => {
    const option = e.target.closest('.location-option');
    if (option) {
      const stateName = option.dataset.state || '';
      setSelectedState(stateName);
      locationDropdown.classList.add('hidden');
      locationBtn.classList.remove('active');
    }
  });

  // "Todo Santiago de Chile" option click
  const allVzlaOption = locationDropdown.querySelector('.location-option[data-state=""]');
  if (allVzlaOption) {
    allVzlaOption.addEventListener('click', () => {
      setSelectedState('');
      locationDropdown.classList.add('hidden');
      locationBtn.classList.remove('active');
    });
  }

  // Search/filter states
  if (locationSearchInput) {
    locationSearchInput.addEventListener('input', (e) => {
      filterLocations(e.target.value.toLowerCase());
    });
    // Prevent form submission
    locationSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault();
    });
  }

  // Restore saved state
  const savedState = getSelectedState();
  if (savedState) {
    updateBrandDisplay(savedState);
    updateLocationLabel(savedState);
  }
}

function filterLocations(query) {
  const locationList = document.getElementById('locationList');
  if (!locationList) return;

  const options = locationList.querySelectorAll('.location-option');
  options.forEach(option => {
    const stateName = (option.dataset.state || '').toLowerCase();
    option.style.display = (!query || stateName.includes(query)) ? '' : 'none';
  });
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    // Check if token is expired (simple JWT check)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            removeToken();
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// ─── API Helper ────────────────────────────────────────────────
async function apiCall(endpoint, options = {}) {
    const url = `${API}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    // Add auth header if token exists
    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Remove headers from config if it's FormData (let browser set Content-Type with boundary)
    if (options.body instanceof FormData) {
        delete config.headers['Content-Type'];
        config.body = options.body;
    }

    try {
        const response = await fetch(url, config);

        // Handle empty or non-JSON responses safely
        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (parseErr) {
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            data = {};
        }

        if (!response.ok) {
            // Handle 401 - token expired or invalid
            // Only clear the token; do NOT auto-redirect.
            // Each page decides if it needs auth via requireAuth().
            if (response.status === 401) {
                removeToken();
            }
            const debugInfo = data.debug ? ` (${data.debug})` : '';
            throw new Error((data.error || `Error ${response.status}: ${response.statusText}`) + debugInfo);
        }

        return data;
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Error de conexión. Verifica tu conexión a internet.');
        }
        throw error;
    }
}

// Shorthand API methods
const api = {
    get(url) {
        return apiCall(url, { method: 'GET' });
    },
    post(url, data) {
        return apiCall(url, {
            method: 'POST',
            body: typeof data === 'string' ? data : JSON.stringify(data),
        });
    },
    put(url, data) {
        return apiCall(url, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    delete(url) {
        return apiCall(url, { method: 'DELETE' });
    },
    patch(url, data) {
        return apiCall(url, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },
    postFormData(url, formData) {
        return apiCall(url, {
            method: 'POST',
            body: formData,
        });
    },
};

// ─── User Functions ────────────────────────────────────────────
function getCachedUser() {
    try {
        const cached = localStorage.getItem(USER_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

function setCachedUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function getCurrentUser() {
    if (!isAuthenticated()) return null;

    // Try cache first
    const cached = getCachedUser();
    if (cached) return cached;

    try {
        const data = await api.get('/auth/me');
        if (data.user) {
            setCachedUser(data.user);
            return data.user;
        }
        return null;
    } catch {
        return null;
    }
}

// ─── Web Page Selector Modal ────────────────────────────────────
function showWebPageSelector() {
    // Remove existing modal if any
    const existing = document.getElementById('webPageSelectorModal');
    if (existing) { existing.remove(); return; }

    const modal = document.createElement('div');
    modal.id = 'webPageSelectorModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;max-width:420px;width:100%;max-height:80vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
            <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
                <h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#0f172a;"><i class="fas fa-globe" style="color:#0ea5e9;margin-right:8px;"></i>Mis Paginas Web</h3>
                <button id="webPageSelectorClose" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b;padding:4px;"><i class="fas fa-times"></i></button>
            </div>
            <div id="webPageSelectorBody" style="padding:16px 24px 24px;overflow-y:auto;max-height:60vh;">
                <div style="text-align:center;padding:30px 0;color:#94a3b8;">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p style="margin-top:12px;font-size:0.9rem;">Cargando tus negocios...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close handlers
    document.getElementById('webPageSelectorClose').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Check if user is logged in
    const token = localStorage.getItem('meriden-santiago_token');
    if (!token) {
        const body = document.getElementById('webPageSelectorBody');
        body.innerHTML = `
            <div style="text-align:center;padding:20px 0;color:#64748b;">
                <i class="fas fa-user-lock" style="font-size:2.5rem;color:#cbd5e1;margin-bottom:12px;"></i>
                <p style="font-size:0.95rem;font-weight:600;">Inicia sesion para ver tus paginas web</p>
                <p style="font-size:0.85rem;margin-top:4px;">Necesitas tener una cuenta y al menos un negocio registrado.</p>
                <a href="/login.html" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#006EE3;color:#fff;border-radius:10px;font-size:0.9rem;font-weight:600;">Iniciar Sesion</a>
            </div>`;
        return;
    }

    // Fetch businesses
    api.get('/user/my-businesses').then(res => {
        const body = document.getElementById('webPageSelectorBody');
        const businesses = res.data || [];
        if (businesses.length === 0) {
            body.innerHTML = `
                <div style="text-align:center;padding:20px 0;color:#64748b;">
                    <i class="fas fa-store" style="font-size:2.5rem;color:#cbd5e1;margin-bottom:12px;"></i>
                    <p style="font-size:0.95rem;font-weight:600;">No tienes negocios registrados</p>
                    <p style="font-size:0.85rem;margin-top:4px;">Primero crea un negocio para generar su pagina web.</p>
                    <a href="/new-business.html" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#006EE3;color:#fff;border-radius:10px;font-size:0.9rem;font-weight:600;">Crear Negocio</a>
                </div>`;
            return;
        }

        let html = '<p style="font-size:0.82rem;color:#94a3b8;margin-bottom:14px;">Selecciona a que negocio le quieres generar la pagina web:</p>';
        businesses.forEach(b => {
            const coverImg = b.cover_image || '';
            html += `
                <a href="/web/${b.slug}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:14px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:10px;text-decoration:none;color:inherit;transition:all 0.2s;background:#fff;" onmouseover="this.style.borderColor='#0ea5e9';this.style.boxShadow='0 4px 12px rgba(14,165,233,0.1)';" onmouseout="this.style.borderColor='#e5e7eb';this.style.boxShadow='none';">
                    <div style="width:52px;height:52px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
                        ${coverImg ? `<img src="${coverImg}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-store" style="font-size:1.2rem;color:#94a3b8;"></i>'}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.95rem;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.title || 'Sin nombre'}</div>
                        <div style="font-size:0.78rem;color:#64748b;margin-top:2px;">${b.city || ''}${b.state ? ', ' + b.state : ''} ${b.category_name ? ' · ' + b.category_name : ''}</div>
                    </div>
                    <div style="flex-shrink:0;color:#0ea5e9;font-size:0.8rem;font-weight:600;display:flex;align-items:center;gap:4px;">
                        Ver <i class="fas fa-external-link-alt" style="font-size:0.7rem;"></i>
                    </div>
                </a>`;
        });

        body.innerHTML = html;
    }).catch(() => {
        const body = document.getElementById('webPageSelectorBody');
        if (body) body.innerHTML = '<p style="text-align:center;color:#ef4444;padding:20px;">Error al cargar tus negocios. Intenta de nuevo.</p>';
    });
}

// ─── Add Web Page Menu Item ────────────────────────────────────
// addWebPageMenuItem removed — button no longer needed in nav

// ─── Navigation ────────────────────────────────────────────────
function updateNav() {
    const navLoginItem = document.getElementById('navLoginItem');
    const navUserItem = document.getElementById('navUserItem');
    const navUserName = document.getElementById('navUserName');

    if (!navLoginItem || !navUserItem) return;

    if (isAuthenticated()) {
        navLoginItem.classList.add('hidden');
        navUserItem.classList.remove('hidden');

        const user = getCachedUser();
        if (user && navUserName) {
            navUserName.innerHTML = `<i class="fas fa-user-circle"></i> ${user.name || 'Mi Cuenta'}`;
        }

        // Show golden "Publicar Producto" CTA for logged-in users
        const mobileCtaProduct = document.getElementById('mobileCtaProduct');
        if (mobileCtaProduct) mobileCtaProduct.style.display = '';

        // Show admin link for admin/agent users
        let adminLinkItem = document.getElementById('navAdminItem');
        if (user && (user.role === 'admin' || user.role === 'agent')) {
            if (!adminLinkItem) {
                adminLinkItem = document.createElement('li');
                adminLinkItem.id = 'navAdminItem';
                const linkLabel = user.role === 'agent' ? 'Panel Agente' : 'Admin';
                const linkIcon = user.role === 'agent' ? 'fa-store' : 'fa-shield-alt';
                adminLinkItem.innerHTML = `<a href="admin.html" class="nav-link nav-admin-link"><i class="fas ${linkIcon}"></i> ${linkLabel}</a>`;
                // Insert before the user item
                navUserItem.parentNode.insertBefore(adminLinkItem, navUserItem);
            } else {
                adminLinkItem.classList.remove('hidden');
            }
        } else if (adminLinkItem) {
            adminLinkItem.remove();
        }

    } else {
        navLoginItem.classList.remove('hidden');
        navUserItem.classList.add('hidden');

        // Remove admin link if exists
        const adminLinkItem = document.getElementById('navAdminItem');
        if (adminLinkItem) adminLinkItem.remove();

        // Make "Publicar" link require login
        const publishLinks = document.querySelectorAll('a[href="new-business.html"]');
        publishLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const redirect = encodeURIComponent('new-business.html');
                window.location.href = `/login.html?redirect=${redirect}`;
            });
        });
    }
}

// ─── UI Helpers ────────────────────────────────────────────────
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}



function formatPrice(price, currency = 'USD') {
    if (price == null || isNaN(price)) return '--';

    const formatted = new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(price);

    const symbols = {
        'USD': '$',
        'EUR': '€',
        'Bs': 'Bs.',
    };

    const symbol = symbols[currency] || '$';
    return `${symbol} ${formatted}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '--';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

function formatDateTime(dateStr) {
    if (!dateStr) return '--';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
}

function truncateText(text, maxLen = 100) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen).trim() + '...';
}


function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ─── Favorites ─────────────────────────────────────────────────
async function toggleFavorite(businessId) {
    if (!isAuthenticated()) {
        showToast('Inicia sesión para guardar favoritos', 'warning');
        setTimeout(() => {
            window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }, 1500);
        return;
    }

    try {
        const response = await api.post('/favorites', { business_id: parseInt(businessId) });
        showToast('Negocio guardado en favoritos', 'success');
        updateFavoriteButtons(businessId, true);
        return true;
    } catch (error) {
        // Check if it's a 409 (already favorited) - then remove it
        if (error.message.includes('ya está en tus favoritos')) {
            try {
                await api.delete(`/favorites?business_id=${businessId}`);
                showToast('Negocio removido de favoritos', 'info');
                updateFavoriteButtons(businessId, false);
                return false;
            } catch (removeError) {
                showToast(removeError.message, 'error');
            }
        } else {
            showToast(error.message, 'error');
        }
        return null;
    }
}

function updateFavoriteButtons(businessId, isFavorited) {
    document.querySelectorAll(`.btn-favorite[data-business-id="${businessId}"]`).forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isFavorited ? 'fas fa-heart' : 'far fa-heart';
        }
        if (isFavorited) {
            btn.classList.add('favorited');
        } else {
            btn.classList.remove('favorited');
        }
    });
}

async function checkFavorite(businessId) {
    if (!isAuthenticated()) return false;
    try {
        const data = await api.get(`/favorites/check?business_id=${businessId}`);
        return data.is_favorited || false;
    } catch {
        return false;
    }
}

// ─── Business Type Display Names ───────────────────────────────
const BUSINESS_TYPE_LABELS = {
    'negocio': 'Negocio',
    'profesional': 'Profesional',
    'servicio': 'Servicio',
    'restaurante': 'Restaurante',
    'tienda': 'Tienda',
    'otro': 'Otro',
};

function getBusinessTypeLabel(type) {
    if (!type) return '--';
    return BUSINESS_TYPE_LABELS[type?.toLowerCase()] || type;
}


// ─── Business URL Helper ─────────────────────────────────────
function getBusinessUrl(business) {
    if (!business) return '#';
    if (business.slug) {
        const prefix = (business.category_slug === 'medicina-servicio-medico') ? '/medicina-servicio-medico' : '/negocio';
        return prefix + '/' + business.slug;
    }
    return '/business.html?id=' + business.id;
}

// ─── WhatsApp Share ────────────────────────────────────────────
function shareBusinessWhatsApp(business) {
    if (!business) return;
    const type = getBusinessTypeLabel(business.business_type);
    const url = 'https://en-santiago.pages.dev' + getBusinessUrl(business);
    const title = business.title || 'Negocio';

    let msg = `🏪 *${title}*\n`;
    msg += `📌 ${type}\n`;
    if (business.city) msg += `📍 ${business.city}${business.state ? ', ' + business.state : ''}\n`;
    msg += `\n🔗 ${url}`;
    msg += `\n\n📌 Publicado en En Santiago`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// ─── Status Helpers ────────────────────────────────────────────
const STATUS_LABELS = {
    'pending': 'Pendiente',
    'approved': 'Publicada',
    'rejected': 'Rechazada',
    'closed': 'Cerrada',
};

function getStatusLabel(status) {
    return STATUS_LABELS[status?.toLowerCase()] || status || '--';
}

function getStatusBadge(status) {
    const classes = {
        'pending': 'badge badge-warning',
        'approved': 'badge badge-success',
        'rejected': 'badge badge-danger',
        'closed': 'badge badge-info',
    };
    const cls = classes[status?.toLowerCase()] || 'badge';
    return `<span class="${cls}">${getStatusLabel(status)}</span>`;
}

// ─── Business Card HTML Generator ──────────────────────────────
function createBusinessCard(business) {
    if (!business) return '';

    // Use logo first, then cover_image, then first uploaded image
    const coverImage = business.logo || business.cover_image || business.images?.[0]?.url || '';
    const placeholderImg = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23e0e0e0"><rect width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="16" font-family="sans-serif">Sin imagen</text></svg>'
    );
    const imgSrc = coverImage || placeholderImg;
    const typeLabel = business.category_name || getBusinessTypeLabel(business.business_type);
    const address = business.city ? (business.state ? `${business.city}, ${business.state}` : business.city) : '--';
    const descSnippet = business.description ? `<p class="business-card-desc">${truncateText(business.description, 80)}</p>` : '';

    const featuredBadge = business.featured ? '<span class="card-badge badge-featured" title="Destacada"><i class="fas fa-star"></i></span>' : '';
    const statusBadge = business.status && business.status !== 'approved' ? `<span class="card-badge badge-${business.status}">${getStatusLabel(business.status)}</span>` : '';
    const especialidadBadge = business.especialidad ? `<span class="card-badge badge-especialidad"><i class="fas fa-stethoscope"></i> ${business.especialidad}</span>` : '';

    const bizUrl = getBusinessUrl(business);
    const isMedical = business.category_slug === 'medicina-servicio-medico';
    return `
        <article class="business-card${isMedical ? ' business-card--medical' : ''}" data-business-id="${business.id}">
            <a href="${bizUrl}" class="business-card-link">
                <div class="business-card-image">
                    <img src="${imgSrc}" alt="${business.title || 'Sin título'}" loading="lazy" onerror="this.src='${placeholderImg}'">
                    <div class="business-card-badges">
                        ${especialidadBadge}${featuredBadge}${statusBadge}
                    </div>
                </div>
                <div class="business-card-body">
                    <h3 class="business-card-title">${business.title || 'Sin título'}</h3>
                    <p class="business-card-location"><i class="fas fa-map-marker-alt"></i> ${address}</p>
                    ${descSnippet}
                </div>
            </a>
        </article>
    `;
}

// ─── WhatsApp Share Delegation for Cards ─────────────────────
document.addEventListener('click', (e) => {
    const shareBtn = e.target.closest('.btn-share-wa-card');
    if (!shareBtn) return;
    const businessId = parseInt(shareBtn.dataset.businessId);
    if (!businessId) return;

    // Fetch business data then share
    api.get(`/businesses/${businessId}`).then(business => {
        shareBusinessWhatsApp(business);
    }).catch(() => {
        // Minimal share with just the link
        window.open(`https://wa.me/?text=${encodeURIComponent('🏪 Mira este negocio en En Santiago:\nhttps://en-santiago.pages.dev/negocio/' + businessId)}`, '_blank');
    });
});

// ─── Search Params Helper ──────────────────────────────────────
function getSearchParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        comuna: params.get('comuna') || '',
        categoria: params.get('categoria') || '',
        city: params.get('ciudad') || params.get('city') || '',
        search: params.get('q') || params.get('search') || '',
        business_type: params.get('tipo_negocio') || '',
        especialidad: params.get('especialidad') || '',
        page: params.get('page') || 1,
        limit: params.get('limit') || 12,
    };
}



// ─── Auth Redirect Helper ──────────────────────────────────────
function requireAuth() {
    if (!isAuthenticated()) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?redirect=${redirect}`;
        return false;
    }
    return true;
}

// ─── Logout Handler ────────────────────────────────────────────
function handleLogout() {
    removeToken();
    showToast('Has cerrado sesión', 'info');
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 1000);
}

// ─── Mobile Search Modal ──────────────────────────────────────
function initMobileSearchModal() {
    const trigger = document.getElementById('mobileSearchTrigger');
    const searchForm = document.getElementById('heroSearchForm');
    const backdrop = document.getElementById('mobileSearchBackdrop');
    const closeBtn = document.getElementById('searchModalClose');

    if (!trigger || !searchForm) return;

    function openSearchModal() {
        searchForm.classList.add('mobile-open');
        trigger.classList.add('active');
        if (backdrop) backdrop.classList.add('visible');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('search-modal-open');
    }

    function closeSearchModal() {
        searchForm.classList.remove('mobile-open');
        trigger.classList.remove('active');
        if (backdrop) backdrop.classList.remove('visible');
        document.body.style.overflow = '';
        document.body.classList.remove('search-modal-open');
    }

    trigger.addEventListener('click', () => {
        if (searchForm.classList.contains('mobile-open')) {
            closeSearchModal();
        } else {
            openSearchModal();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSearchModal();
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', closeSearchModal);
    }

    // Allow form submission (search) to work normally
    searchForm.addEventListener('submit', () => {
        // Let the form submit naturally to search.html
        document.body.style.overflow = '';
    });
}

// ─── Hero Logo Positioning (PC + Mobile) ──────────────────
function positionHeroLogo(logo) {
    const w = window.innerWidth;
    if (w <= 480) {
        logo.style.marginTop = '80px';
        logo.style.maxHeight = '55px';
    } else if (w <= 768) {
        logo.style.marginTop = '100px';
        logo.style.maxHeight = '65px';
    } else {
        logo.style.marginTop = '140px';
        logo.style.maxHeight = '80px';
    }
}

// ─── Video Carousel Loader ────────────────────────────
function getYoutubeEmbedUrl(url) {
    if (!url) return '';
    // Standard youtube.com/watch?v=
    let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=0&rel=0`;
    // Short youtu.be
    m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=0&rel=0`;
    // TikTok
    if (url.includes('tiktok.com')) return url.replace(/\/video\//, '/embed/v2/');
    // Direct video URL or other embed
    return url;
}

function getYoutubeThumb(url) {
    if (!url) return '';
    let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (m) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
    return '';
}

async function loadVideoCarousel() {
    const section = document.getElementById('videoCarouselSection');
    const track = document.getElementById('videoCarouselTrack');
    if (!section || !track) return;

    try {
        const settings = await fetch('/api/settings/public').then(r => r.json());
        if (settings.video_carousel_enabled !== '1') return;

        const data = await fetch('/api/video-carousel').then(r => r.json());
        const videos = data.videos || [];
        if (videos.length === 0) return;

        track.innerHTML = videos.map(v => {
            const thumb = v.thumbnail_url || getYoutubeThumb(v.url);
            const embedUrl = getYoutubeEmbedUrl(v.url);
            return `
                <div style="flex:0 0 280px;scroll-snap-align:start;border-radius:14px;overflow:hidden;background:#111;position:relative;cursor:pointer;aspect-ratio:16/9;" onclick="this.innerHTML='<iframe src=\\'${embedUrl}&autoplay=1\\' style=\\'width:100%;height:100%;border:none;\\' allow=\\'autoplay;encrypted-media\\' allowfullscreen></iframe>'">
                    ${thumb
                        ? `<img src="${thumb}" style="width:100%;height:100%;object-fit:cover;" alt="${v.title || 'Video'}" loading="lazy">`
                        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;"><i class="fas fa-video" style="font-size:2rem;"></i></div>`
                    }
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);">
                        <div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-play" style="color:#dc2626;font-size:1.2rem;margin-left:3px;"></i>
                        </div>
                    </div>
                    ${v.title ? `<div style="position:absolute;bottom:0;left:0;right:0;padding:8px 12px;background:linear-gradient(transparent,rgba(0,0,0,0.8));color:#fff;font-size:0.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${v.title}</div>` : ''}
                </div>
            `;
        }).join('');

        section.classList.remove('hidden');
    } catch (e) {
        console.warn('Video carousel error:', e);
    }
}

// ─── Hero Banner Loader ─────────────────────────────────
async function loadHeroBanner() {
    const heroBg = document.getElementById('idxHeroBg');
    const heroLogo = document.getElementById('idxHeroLogo');
    if (!heroBg) return;
    try {
        const resp = await fetch('/api/settings/public');
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.hero_banner_url) {
            heroBg.style.backgroundImage = `url(${data.hero_banner_url})`;
            heroBg.style.backgroundSize = 'cover';
            heroBg.style.backgroundPosition = 'center';
            heroBg.style.backgroundRepeat = 'no-repeat';
        }
        if (data.hero_logo_url && heroLogo) {
            heroLogo.src = data.hero_logo_url;
            heroLogo.style.display = 'block';
            // Lower logo on all screen sizes
            positionHeroLogo(heroLogo);
            window.addEventListener('resize', () => positionHeroLogo(heroLogo));
        }
    } catch(e) {
        // Silent fail — default CSS gradient applies
    }
}

// ─── Marketplace Banner (same pattern as hero banner) ────────
async function loadMarketplaceBanner() {
    const mpBg = document.getElementById('mpHeroBg');
    if (!mpBg) return;
    try {
        const resp = await fetch('/api/settings/public');
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.marketplace_banner_url) {
            mpBg.style.backgroundImage = `url(${data.marketplace_banner_url})`;
            mpBg.style.backgroundSize = 'cover';
            mpBg.style.backgroundPosition = 'center';
            mpBg.style.backgroundRepeat = 'no-repeat';
        }
    } catch(e) {}
}

// Keep the agency links consistent across every static page that loads this module.
function addAgencyFooterLinks() {
    document.querySelectorAll('.footer-bottom').forEach((footerBottom) => {
        const links = [
            ['https://maps.app.goo.gl/Jz2QTADrNNneQtGd9', 'Página web desarrollada por Grupo 360 Soluciones'],
            ['http://coporo.pages.dev/', 'Diseño de páginas webs - SEO Local -'],
        ];

        links.forEach(([href, label]) => {
            const existingLink = [...footerBottom.querySelectorAll('a')]
                .find((link) => link.href.includes('coporo.pages.dev') && href.includes('coporo.pages.dev'));
            if (existingLink) {
                existingLink.href = href;
                existingLink.target = '_blank';
                existingLink.rel = 'noopener noreferrer';
                existingLink.textContent = label;
                return;
            }
            if (footerBottom.querySelector(`a[href="${href}"]`)) return;
            const paragraph = document.createElement('p');
            const link = document.createElement('a');
            link.href = href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = label;
            paragraph.appendChild(link);
            footerBottom.appendChild(paragraph);
        });
    });
}

// ─── Initialization ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    addAgencyFooterLinks();

    // Update navigation bar
    updateNav();

    // Load hero banner from settings
    loadHeroBanner();

    // Load video carousel
    loadVideoCarousel();

    // Load marketplace banner from settings
    loadMarketplaceBanner();

    // Initialize location selector (loads saved state, updates brand)
    initLocationSelector();

    // Initialize mobile search modal
    initMobileSearchModal();

    // Hamburger menu toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        // Close menu when clicking a link
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    }

    // Navbar dropdown toggle ("Más")
    document.querySelectorAll('.nav-dropdown-toggle').forEach(toggleBtn => {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = toggleBtn.nextElementSibling;
            if (menu) {
                // Close other dropdowns
                document.querySelectorAll('.nav-dropdown-menu.active').forEach(m => {
                    if (m !== menu) m.classList.remove('active');
                });
                document.querySelectorAll('.nav-dropdown-toggle.active').forEach(b => {
                    if (b !== toggleBtn) b.classList.remove('active');
                });
                menu.classList.toggle('active');
                toggleBtn.classList.toggle('active');
            }
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.nav-dropdown-menu.active').forEach(m => m.classList.remove('active'));
            document.querySelectorAll('.nav-dropdown-toggle.active').forEach(b => b.classList.remove('active'));
        }
    });

    // Logout button handler
    const logoutBtn = document.getElementById('navLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // Handle redirect param after login
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    if (redirectParam && isAuthenticated()) {
        window.location.href = redirectParam;
    }

    // Load featured businesses on index page
    const featuredGrid = document.getElementById('featuredGrid');
    if (featuredGrid) {
        loadFeaturedProperties();
    }

    // Load featured medical businesses on index page
    const featuredMedicalGrid = document.getElementById('featuredMedicalGrid');
    if (featuredMedicalGrid) {
        loadFeaturedMedical();
    }

    // Load stats on index page
    const statProperties = document.getElementById('statProperties');
    if (statProperties) {
        loadSiteStats();
    }

    // Load featured properties (inmuebles) on index page
    const featuredPropertiesGrid = document.getElementById('featuredPropertiesGrid');
    if (featuredPropertiesGrid) {
        loadFeaturedPropertiesSection();
    }

    // Load featured products on index page
    const featuredProductsGrid = document.getElementById('featuredProductsGrid');
    if (featuredProductsGrid) {
        loadFeaturedProducts();
    }

    // Load featured jobs on index page
    const featuredJobsGrid = document.getElementById('featuredJobsGrid');
    if (featuredJobsGrid) {
        loadFeaturedJobs();
    }

    // initHomeMap is handled by home-map.js
});

// ─── Index Page: Featured Properties ───────────────────────────
async function loadFeaturedProperties() {
    const grid = document.getElementById('featuredGrid');
    const emptyState = document.getElementById('featuredEmpty');
    const loading = document.getElementById('featuredLoading');
    if (!grid) return;

    try {
        // First try to get featured businesses from featured_items table
        let businesses = [];
        try {
            const selectedState = getSelectedState();
            const featuredData = await api.get('/featured-items?item_type=business');
            const featuredItems = featuredData.featured_items || [];
            if (featuredItems.length > 0) {
                const bizIds = featuredItems.map(f => f.item_id);
                // Fetch the actual business details
                const bizPromises = bizIds.map(id => api.get(`/businesses/${id}`).catch(() => null));
                const bizResults = await Promise.all(bizPromises);
                businesses = bizResults.filter(b => b && b.status === 'approved');
                // Filter by state if selected
                if (selectedState) {
                    businesses = businesses.filter(b => b.state === selectedState);
                }
            }
        } catch (e) {
            // If featured-items fails, try direct API with featured flag
        }

        // Fallback: try direct API with featured=1 flag
        if (businesses.length === 0) {
            // No featured businesses in this state — load any approved businesses from the state
            // Exclude medical category (they have their own dedicated section)
            const selectedState = getSelectedState();
            let endpoint = '/businesses?status=approved&limit=12';
            if (selectedState) endpoint += `&state=${encodeURIComponent(selectedState)}`;
            const data = await api.get(endpoint);
            const allBiz = data.businesses || [];
            businesses = allBiz.filter(b => b.category_slug !== 'medicina-servicio-medico');
        }

        if (loading) loading.remove();

        if (businesses.length === 0) {
            if (emptyState) emptyState.style.display = '';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        // When a state is selected, show up to 12; otherwise show 3 featured
        const maxShow = getSelectedState() ? 12 : 4;
        businesses = businesses.slice(0, maxShow);
        grid.innerHTML = businesses.map(p => createBusinessCard(p)).join('');
        // Update section title to reflect state filter
        const sectionTitle = grid.closest('.admin-card, .idx-section')?.querySelector('h2, h3');
        if (sectionTitle && getSelectedState()) {
            sectionTitle.textContent = 'Negocios en ' + getSelectedState();
        }
    } catch (error) {
        if (loading) loading.remove();
        if (emptyState) emptyState.style.display = '';
        console.error('Error loading featured businesses:', error);
    }
}

// ─── Index Page: Featured Medical Businesses ─────────────
async function loadFeaturedMedical() {
    const grid = document.getElementById('featuredMedicalGrid');
    const emptyState = document.getElementById('medicalEmpty');
    const loading = document.getElementById('medicalLoading');
    if (!grid) return;

    const MEDICAL_SLUG = 'medicina-servicio-medico';

    try {
        // First try featured_items with item_type=medical
        let businesses = [];
        try {
            const selectedState = getSelectedState();
            const featuredData = await api.get('/featured-items?item_type=medical');
            const featuredItems = featuredData.featured_items || [];
            if (featuredItems.length > 0) {
                const bizIds = featuredItems.map(f => f.item_id);
                const bizPromises = bizIds.map(id => api.get(`/businesses/${id}`).catch(() => null));
                const bizResults = await Promise.all(bizPromises);
                businesses = bizResults.filter(b => b && b.status === 'approved');
                if (selectedState) {
                    businesses = businesses.filter(b => b.state === selectedState);
                }
            }
        } catch (e) {
            // fallback below
        }

        // Fallback: fetch featured medical businesses from API
        if (businesses.length === 0) {
            const selectedState = getSelectedState();
            let endpoint = '/businesses?status=approved&categoria=medicina-servicio-medico&limit=4&featured=1';
            if (selectedState) endpoint += `&state=${encodeURIComponent(selectedState)}`;
            let data = await api.get(endpoint);
            businesses = data.businesses || [];

            // If no featured medical, try without featured flag but include related medical categories
            if (businesses.length === 0) {
                let endpoint2 = '/businesses?status=approved&limit=4';
                if (selectedState) endpoint2 += `&state=${encodeURIComponent(selectedState)}`;
                data = await api.get(endpoint2);
                const allBiz = data.businesses || [];
                businesses = allBiz.filter(b => b.category_slug === MEDICAL_SLUG);
            }
        }

        if (loading) loading.remove();

        if (businesses.length === 0) {
            if (emptyState) emptyState.style.display = '';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        businesses = businesses.slice(0, 4);
        grid.innerHTML = businesses.map(b => createBusinessCard(b)).join('');
    } catch (error) {
        if (loading) loading.remove();
        if (emptyState) emptyState.style.display = '';
        console.error('Error loading featured medical businesses:', error);
    }
}

// ─── Index Page: Featured Properties (Inmuebles) ────────────────
async function loadFeaturedPropertiesSection() {
    const grid = document.getElementById('featuredPropertiesGrid');
    const emptyState = document.getElementById('propertiesEmpty');
    const loading = document.getElementById('propertiesLoading');
    if (!grid) return;

    try {
        // First try to get featured properties from featured_items table
        let properties = [];
        try {
            const selectedState = getSelectedState();
            const featuredData = await api.get('/featured-items?item_type=property');
            const featuredItems = featuredData.featured_items || [];
            if (featuredItems.length > 0) {
                const propIds = featuredItems.map(f => f.item_id);
                // Fetch the actual property details
                const propPromises = propIds.map(id => api.get(`/properties/${id}`).catch(() => null));
                const propResults = await Promise.all(propPromises);
                properties = propResults.filter(p => p && p.status === 'approved');
                // Filter by state if selected
                if (selectedState) {
                    properties = properties.filter(p => p.state === selectedState);
                }
            }
        } catch (e) {
            // If featured-items fails, try direct API
        }

        // Fallback: try direct API for approved properties
        if (properties.length === 0) {
            const selectedState = getSelectedState();
            let endpoint = '/properties?status=approved&limit=4';
            if (selectedState) endpoint += `&state=${encodeURIComponent(selectedState)}`;
            const data = await api.get(endpoint);
            properties = data.properties || [];
        }

        if (loading) loading.remove();

        if (properties.length === 0) {
            if (emptyState) emptyState.style.display = '';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        properties = properties.slice(0, 4);
        grid.innerHTML = properties.map(p => createPropertyCard(p)).join('');
    } catch (error) {
        if (loading) loading.remove();
        if (emptyState) emptyState.style.display = '';
        console.error('Error loading featured properties:', error);
    }
}

// ─── Property Card Creator (used on index and search) ──────────
const PROPERTY_TYPE_LABELS = {
    casa: 'Casa', apartamento: 'Apartamento', terreno: 'Terreno',
    local_comercial: 'Local Comercial', oficina: 'Oficina', hotel: 'Hotel',
    finca: 'Finca', galpon: 'Galpón', estacionamiento: 'Estacionamiento', otro: 'Otro'
};
const OPERATION_TYPE_LABELS = { venta: 'Venta', alquiler: 'Alquiler', venta_alquiler: 'Venta y Alquiler' };
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', Bs: 'Bs' };

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function createPropertyCard(p) {
    const typeLabel = PROPERTY_TYPE_LABELS[p.property_type] || p.property_type;
    const opLabel = OPERATION_TYPE_LABELS[p.operation_type] || p.operation_type;
    const currSymbol = CURRENCY_SYMBOLS[p.currency] || '$';
    const img = p.cover_image || '';
    const featuredBadge = p.featured ? '<span class="card-badge-featured"><i class="fas fa-star"></i></span>' : '';

    let statsHtml = '';
    if (p.bedrooms) statsHtml += `<span><i class="fas fa-bed"></i> ${p.bedrooms}</span>`;
    if (p.bathrooms) statsHtml += `<span><i class="fas fa-bath"></i> ${p.bathrooms}</span>`;
    if (p.area) statsHtml += `<span><i class="fas fa-ruler-combined"></i> ${p.area}${p.area_unit === 'ha' ? ' ha' : ' m²'}</span>`;

    return `
    <a href="property-detail.html?id=${p.id}" class="business-card">
        ${featuredBadge}
        <div class="business-card-img">
            ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ccc%22 font-size=%2240%22>🏠</text></svg>'">` : '<div class="card-img-placeholder"><i class="fas fa-home"></i></div>'}
            <div class="card-badges">
                <span class="card-badge card-badge-type">${escapeHtml(typeLabel)}</span>
                <span class="card-badge card-badge-op">${escapeHtml(opLabel)}</span>
            </div>
        </div>
        <div class="business-card-body">
            <h3 class="business-card-title">${escapeHtml(p.title)}</h3>
            <div class="business-card-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(p.city || '')}${p.state ? ', ' + escapeHtml(p.state) : ''}</div>
            ${statsHtml ? `<div class="business-card-stats">${statsHtml}</div>` : ''}
            <div class="business-card-price">${currSymbol} ${Number(p.price).toLocaleString('es-CL')}</div>
        </div>
    </a>`;
}

// ─── Index Page: Site Stats ────────────────────────────────────
async function loadSiteStats() {
    const statProps = document.getElementById('statProperties');
    const statUsers = document.getElementById('statUsers');
    if (!statProps) return;

    try {
        const data = await api.get('/businesses?status=approved&limit=1');
        const totalApproved = data.pagination?.total || 0;
        statProps.textContent = totalApproved;
    } catch {
        statProps.textContent = '0';
    }

    try {
        // Try to get users count (may fail without auth)
        const data = await api.get('/stats');
        if (data.stats) {
            statProps.textContent = data.stats.approved_businesses || 0;
            if (statUsers) statUsers.textContent = data.stats.total_users || 0;
        }
    } catch {
        // Stats endpoint requires auth/admin - use fallback
    }
}

// ═══════════════════════════════════════════════════════════════
// SEARCH PAGE (search.html)
// ═══════════════════════════════════════════════════════════════
(function initSearchPage() {
    document.addEventListener('DOMContentLoaded', () => {
        const searchGrid = document.getElementById('searchResultsGrid');
        if (!searchGrid || searchGrid.classList.contains('property-grid')) return; // Not on business search page

        // Populate filter fields from URL params
        const params = getSearchParams();
        if (params.comuna && document.getElementById('sComuna')) document.getElementById('sComuna').value = params.comuna;
        if (params.categoria && document.getElementById('sCategoria')) document.getElementById('sCategoria').value = params.categoria;
        if (params.city && document.getElementById('sCiudad')) document.getElementById('sCiudad').value = params.city;
        if (params.business_type && document.getElementById('sTipoNegocio')) document.getElementById('sTipoNegocio').value = params.business_type;
        if (params.search && document.getElementById('sQuery')) document.getElementById('sQuery').value = params.search;
        if (params.especialidad && document.getElementById('sEspecialidad')) document.getElementById('sEspecialidad').value = params.especialidad;

        // Show/hide especialidad field based on category
        const sCat = document.getElementById('sCategoria');
        const espWrap = document.getElementById('especialidadFilterWrap');
        function toggleEspecialidadField() {
            if (espWrap) {
                espWrap.style.display = (sCat && sCat.value === 'medicina-servicio-medico') ? '' : 'none';
            }
        }
        if (sCat) { sCat.addEventListener('change', toggleEspecialidadField); toggleEspecialidadField(); }

        // Search button
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                executeSearch(1);
            });
        }

        // Sort change
        const sSort = document.getElementById('sSort');
        if (sSort) {
            sSort.addEventListener('change', () => executeSearch(params.page));
        }

        // Extended sort (in collapsible filters)
        const sOrdenar = document.getElementById('sOrdenar');
        if (sOrdenar) {
            sOrdenar.addEventListener('change', () => executeSearch(params.page));
        }

        // Toggle extended filters
        const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
        const extendedFilters = document.getElementById('extendedFilters');
        if (toggleFiltersBtn && extendedFilters) {
            toggleFiltersBtn.addEventListener('click', () => {
                extendedFilters.classList.toggle('hidden');
            });
        }

        // View toggle (grid/list)
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        if (gridViewBtn && listViewBtn) {
            gridViewBtn.addEventListener('click', () => {
                searchGrid.classList.remove('list-view');
                searchGrid.classList.add('grid-view');
                gridViewBtn.classList.add('active');
                listViewBtn.classList.remove('active');
            });
            listViewBtn.addEventListener('click', () => {
                searchGrid.classList.remove('grid-view');
                searchGrid.classList.add('list-view');
                listViewBtn.classList.add('active');
                gridViewBtn.classList.remove('active');
            });
        }

        // Clear filters
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                window.location.href = '/search.html';
            });
        }

        // Execute initial search
        executeSearch(params.page);
    });

    async function executeSearch(page = 1) {
        const searchLoading = document.getElementById('searchLoading');
        const noResults = document.getElementById('noResults');
        const searchGrid = document.getElementById('searchResultsGrid');
        const resultsCount = document.getElementById('resultsCount');
        const activeFiltersEl = document.getElementById('activeFilters');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        const paginationEl = document.getElementById('pagination');
        const categoryBannerEl = document.getElementById('categoryBanner');
        const categoryBannerImg = document.getElementById('categoryBannerImg');
        const categoryBannerTitle = document.getElementById('categoryBannerTitle');

        if (!searchGrid) return;

        // Show loading
        if (searchLoading) searchLoading.classList.remove('hidden');
        if (noResults) noResults.classList.add('hidden');
        searchGrid.innerHTML = '';
        if (paginationEl) paginationEl.classList.add('hidden');

        // Gather filter values
        const comuna = document.getElementById('sComuna')?.value || '';
        const categoria = document.getElementById('sCategoria')?.value || '';
        const ciudad = document.getElementById('sCiudad')?.value?.trim() || '';
        const tipoNegocio = document.getElementById('sTipoNegocio')?.value || '';
        const especialidad = document.getElementById('sEspecialidad')?.value?.trim() || '';
        const q = document.getElementById('sQuery')?.value?.trim() || '';
        const sort = document.getElementById('sSort')?.value || document.getElementById('sOrdenar')?.value || '';

        // Load category banner if filtering by category
        if (categoria && categoryBannerEl) {
            try {
                const catData = await api.get('/categories');
                const cats = catData.categories || [];
                const matchedCat = cats.find(c => c.slug === categoria || c.name.toLowerCase() === categoria.toLowerCase());
                if (matchedCat && matchedCat.banner_url) {
                    categoryBannerImg.src = matchedCat.banner_url;
                    categoryBannerTitle.textContent = matchedCat.name;
                    categoryBannerEl.style.display = 'block';
                } else {
                    categoryBannerEl.style.display = 'none';
                }
            } catch(e) {
                if (categoryBannerEl) categoryBannerEl.style.display = 'none';
            }
        } else {
            if (categoryBannerEl) categoryBannerEl.style.display = 'none';
        }

        // Build API endpoint
        let endpoint = `/businesses?status=approved&page=${page}&limit=12`;
        if (comuna) endpoint += `&state=${encodeURIComponent(comuna)}`;
        if (categoria) endpoint += `&categoria=${encodeURIComponent(categoria)}`;
        if (ciudad) endpoint += `&city=${encodeURIComponent(ciudad)}`;
        if (tipoNegocio) endpoint += `&business_type=${encodeURIComponent(tipoNegocio)}`;
        if (especialidad) endpoint += `&especialidad=${encodeURIComponent(especialidad)}`;
        if (q) endpoint += `&search=${encodeURIComponent(q)}`;

        // Sort mapping
        const sortMap = {
            'reciente': 'newest',
            'visto': 'views_desc',
        };
        if (sort && sort !== 'relevancia') endpoint += `&sort=${sortMap[sort] || sort}`;

        try {
            const data = await api.get(endpoint);
            const businesses = data.businesses || [];
            const paginationData = data.pagination || {};

            if (searchLoading) searchLoading.classList.add('hidden');

            // Results count
            if (resultsCount) {
                resultsCount.textContent = `${paginationData.total || 0} resultados encontrados`;
            }

            // Active filter tags
            if (activeFiltersEl) {
                let tags = '';
                if (comuna) tags += `<span class="active-filter-tag"><i class="fas fa-map"></i> ${comuna} <button onclick="this.parentElement.remove(); document.getElementById('sComuna').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (categoria) tags += `<span class="active-filter-tag"><i class="fas fa-tag"></i> ${categoria} <button onclick="this.parentElement.remove(); document.getElementById('sCategoria').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (ciudad) tags += `<span class="active-filter-tag"><i class="fas fa-map-marker-alt"></i> ${ciudad} <button onclick="this.parentElement.remove(); document.getElementById('sCiudad').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (tipoNegocio) tags += `<span class="active-filter-tag">${getBusinessTypeLabel(tipoNegocio)} <button onclick="this.parentElement.remove(); document.getElementById('sTipoNegocio').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (especialidad) tags += `<span class="active-filter-tag"><i class="fas fa-stethoscope"></i> ${truncateText(especialidad, 20)} <button onclick="this.parentElement.remove(); document.getElementById('sEspecialidad').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (q) tags += `<span class="active-filter-tag"><i class="fas fa-search"></i> "${truncateText(q, 20)}" <button onclick="this.parentElement.remove(); document.getElementById('sQuery').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                activeFiltersEl.innerHTML = tags;
                if (clearFiltersBtn) {
                    clearFiltersBtn.classList.toggle('hidden', !tags);
                }
            }

            // No results
            if (businesses.length === 0) {
                if (noResults) noResults.classList.remove('hidden');
                return;
            }

            // Render business cards
            searchGrid.innerHTML = businesses.map(p => createBusinessCard(p)).join('');

            // Pagination
            renderPagination(paginationEl, paginationData, executeSearch);

            // Update URL without reload
            updateSearchURL(comuna, categoria, ciudad, tipoNegocio, especialidad, q, page);

        } catch (error) {
            if (searchLoading) searchLoading.classList.add('hidden');
            searchGrid.innerHTML = '<div class="no-results"><i class="fas fa-exclamation-circle fa-3x"></i><h2>Error de búsqueda</h2><p>No se pudieron cargar los resultados. Intenta nuevamente.</p></div>';
            console.error('Search error:', error);
        }
    }

    function updateSearchURL(comuna, categoria, ciudad, tipoNegocio, especialidad, q, page) {
        const url = new URL(window.location);
        url.searchParams.delete('comuna');
        url.searchParams.delete('categoria');
        url.searchParams.delete('ciudad');
        url.searchParams.delete('tipo_negocio');
        url.searchParams.delete('especialidad');
        url.searchParams.delete('q');
        url.searchParams.delete('page');

        if (comuna) url.searchParams.set('comuna', comuna);
        if (categoria) url.searchParams.set('categoria', categoria);
        if (ciudad) url.searchParams.set('ciudad', ciudad);
        if (tipoNegocio) url.searchParams.set('tipo_negocio', tipoNegocio);
        if (especialidad) url.searchParams.set('especialidad', especialidad);
        if (q) url.searchParams.set('q', q);
        if (page && page > 1) url.searchParams.set('page', page);

        window.history.replaceState({}, '', url.toString());
    }

    function renderPagination(container, paginationData, onPageChange) {
        if (!container || !paginationData) return;

        const { page, totalPages, total } = paginationData;

        if (totalPages <= 1) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        const prevBtn = document.getElementById('paginationPrev');
        const nextBtn = document.getElementById('paginationNext');
        const pagesContainer = document.getElementById('paginationPages');

        if (prevBtn) prevBtn.disabled = page <= 1;
        if (nextBtn) nextBtn.disabled = page >= totalPages;

        if (pagesContainer) {
            let html = '';
            const maxVisible = 5;
            let start = Math.max(1, page - Math.floor(maxVisible / 2));
            let end = Math.min(totalPages, start + maxVisible - 1);
            if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

            if (start > 1) {
                html += `<button class="pagination-btn" data-page="1">1</button>`;
                if (start > 2) html += '<span class="pagination-dots">...</span>';
            }
            for (let i = start; i <= end; i++) {
                html += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            if (end < totalPages) {
                if (end < totalPages - 1) html += '<span class="pagination-dots">...</span>';
                html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
            }

            pagesContainer.innerHTML = html;

            pagesContainer.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const p = parseInt(btn.dataset.page);
                    if (p) onPageChange(p);
                });
            });
        }

        if (prevBtn) {
            prevBtn.onclick = () => { if (page > 1) onPageChange(page - 1); };
        }
        if (nextBtn) {
            nextBtn.onclick = () => { if (page < totalPages) onPageChange(page + 1); };
        }
    }
})();

// ═══════════════════════════════════════════════════════════════
// INDEX PAGE: Featured Products
// ═══════════════════════════════════════════════════════════════
async function loadFeaturedProducts() {
    const grid = document.getElementById('featuredProductsGrid');
    const loading = document.getElementById('productsLoading');
    const emptyState = document.getElementById('productsEmpty');
    if (!grid) return;

    try {
        // First try to get featured products from featured_items table
        let products = [];
        try {
            const selectedState = getSelectedState();
            const featuredData = await api.get('/featured-items?item_type=product');
            const featuredItems = featuredData.featured_items || [];
            if (featuredItems.length > 0) {
                const prodIds = featuredItems.map(f => f.item_id);
                // Fetch the actual product details
                const prodPromises = prodIds.map(id => api.get(`/products/${id}`).catch(() => null));
                const prodResults = await Promise.all(prodPromises);
                products = prodResults.filter(p => p && p.status === 'approved');
                // Filter by state if selected
                if (selectedState) {
                    products = products.filter(p => p.state === selectedState);
                }
            }
        } catch (e) {
            // If featured-items fails, try direct API
        }

        // Fallback: try direct API with featured=1 flag
        if (products.length === 0) {
            const selectedState = getSelectedState();
            let endpoint = '/marketplace?status=approved&limit=4&featured=1&sort=newest';
            if (selectedState) endpoint += `&state=${encodeURIComponent(selectedState)}`;
            const data = await api.get(endpoint);
            products = data.products || [];
        }

        if (loading) loading.remove();

        if (products.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        products = products.slice(0, 4);
        grid.innerHTML = products.map(p => {
            // Handle image: could be JSON array or plain URL
            let img = p.image || '';
            try {
                const parsed = JSON.parse(img);
                if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
            } catch(e) {}
            const price = p.price > 0 ? '$' + Number(p.price).toLocaleString('es-CL') : 'Gratis';
            const bizName = p.business_name || '';
            const featuredBadge = p.featured ? '<span class="card-badge-featured"><i class="fas fa-star"></i></span>' : '';
            const slug = p.slug || p.id;

            return `
            <a href="/producto/${slug}" class="business-card">
                ${featuredBadge}
                <div class="business-card-img">
                    ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.display='none'">` : '<div class="card-img-placeholder"><i class="fas fa-box"></i></div>'}
                    <div class="card-badges">
                        <span class="card-badge card-badge-type">${escapeHtml(p.category || 'General')}</span>
                    </div>
                </div>
                <div class="business-card-body">
                    <h3 class="business-card-title">${escapeHtml(p.name)}</h3>
                    ${bizName ? `<div class="business-card-location"><i class="fas fa-store"></i> ${escapeHtml(bizName)}</div>` : ''}
                    <div class="business-card-price">${price}</div>
                </div>
            </a>`;
        }).join('');
    } catch (error) {
        if (loading) loading.remove();
        console.error('Error loading featured products:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// INDEX PAGE: Featured Jobs
// ═══════════════════════════════════════════════════════════════
async function loadFeaturedJobs() {
    const grid = document.getElementById('featuredJobsGrid');
    const loading = document.getElementById('jobsLoading');
    const emptyState = document.getElementById('jobsEmpty');
    if (!grid) return;

    try {
        // First try to get featured jobs from featured_items table
        let jobs = [];
        try {
            const featuredData = await api.get('/featured-items?item_type=job');
            const featuredItems = featuredData.featured_items || [];
            if (featuredItems.length > 0) {
                const jobIds = featuredItems.map(f => f.item_id);
                // Fetch only the featured jobs that are approved
                const allJobsPromises = jobIds.map(id => api.get(`/jobs/${id}`).catch(() => null));
                const jobResults = await Promise.all(allJobsPromises);
                jobs = jobResults.filter(j => j && j.status === 'approved');
            }
        } catch (e) {
            // If featured-items fails, show nothing
        }

        // Fallback: try direct API with featured=1 flag
        if (jobs.length === 0) {
            const data = await api.get('/jobs?status=approved&limit=4&featured=1&sort=newest');
            jobs = data.jobs || [];
        }

        // Limit to 4
        jobs = jobs.slice(0, 4);

        if (loading) loading.remove();

        if (jobs.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        grid.innerHTML = jobs.map(j => {
            const salary = j.salary ? '$' + Number(j.salary).toLocaleString('es-CL') : '';
            const typeLabel = (j.job_type || '').replace('_', ' ');
            const featuredBadge = j.featured ? '<span class="card-badge-featured"><i class="fas fa-star"></i></span>' : '';
            const bizLogo = j.business_logo || '';

            return `
            <a href="empleo.html" class="business-card">
                ${featuredBadge}
                <div class="business-card-img">
                    ${bizLogo ? `<img src="${escapeHtml(bizLogo)}" alt="${escapeHtml(j.company_name || '')}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : ''}
                    <div class="card-img-placeholder" style="${bizLogo ? 'display:none;' : ''}background:linear-gradient(135deg,#17a2b8,#20c997);">
                        <i class="fas fa-briefcase" style="color:#fff;font-size:2rem;"></i>
                    </div>
                    <div class="card-badges">
                        <span class="card-badge card-badge-type">${escapeHtml(typeLabel)}</span>
                    </div>
                </div>
                <div class="business-card-body">
                    <h3 class="business-card-title">${escapeHtml(j.title)}</h3>
                    <div class="business-card-location"><i class="fas fa-building"></i> ${escapeHtml(j.company_name || j.business_name || j.business_title || '')}</div>
                    ${j.city ? `<div class="business-card-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(j.city)}</div>` : ''}
                    ${salary ? `<div class="business-card-price">${salary}</div>` : ''}
                </div>
            </a>`;
        }).join('');
    } catch (error) {
        if (loading) loading.remove();
        console.error('Error loading featured jobs:', error);
    }
}

// ─── POPUP (CLNTANA EMERGENTE) on INDEX ──────────────────────────
// Shows once per hour (uses localStorage timestamp)
(function initPopupOnIndex() {
    var HOUR_MS = 60 * 60 * 1000;
    function canShow() {
        var last = localStorage.getItem('popup_dismissed_at');
        if (!last) return true;
        return (Date.now() - parseInt(last, 10)) > HOUR_MS;
    }
    function dismiss() {
        localStorage.setItem('popup_dismissed_at', String(Date.now()));
    }
    function show() {
        if (!canShow()) return;

        fetch('/api/settings/public')
            .then(r => r.json())
            .then(settings => {
                if (settings.popup_enabled !== '1') return;
                if (!settings.popup_image_url) return;

                // Inject animations if not present
                if (!document.getElementById('popupAnimStyle')) {
                    const s = document.createElement('style');
                    s.id = 'popupAnimStyle';
                    s.textContent = '@keyframes _popupFadeIn{from{opacity:0}to{opacity:1}}@keyframes _popupScaleIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}';
                    document.head.appendChild(s);
                }

                const overlay = document.createElement('div');
                overlay.id = 'adPopupOverlay';
                overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);animation:_popupFadeIn 0.3s ease;';

                const popup = document.createElement('div');
                popup.style.cssText = 'position:relative;max-width:90vw;max-height:90vh;border-radius:16px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.4);animation:_popupScaleIn 0.3s ease;background:#fff;';

                const img = document.createElement('img');
                img.src = settings.popup_image_url;
                img.alt = 'Publicidad';
                img.style.cssText = 'display:block;max-width:90vw;max-height:80vh;object-fit:contain;cursor:pointer;';
                img.onerror = function() { overlay.remove(); };

                // Build the clickable wrapper (entire image is clickable)
                var clickUrl = settings.popup_link_url || '';
                var ctaText = settings.popup_cta_text || 'Ver mas';
                var isInternal = clickUrl.startsWith('/') || clickUrl.startsWith(window.location.origin);

                if (clickUrl) {
                    const a = document.createElement('a');
                    a.href = clickUrl;
                    if (isInternal) {
                        a.addEventListener('click', function(e) {
                            e.preventDefault();
                            dismiss();
                            overlay.remove();
                            window.location.href = clickUrl;
                        });
                    } else {
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                    }
                    a.appendChild(img);
                    popup.appendChild(a);
                } else {
                    popup.appendChild(img);
                }

                // CTA button overlay on the image
                if (clickUrl) {
                    const cta = document.createElement('button');
                    cta.textContent = ctaText;
                    cta.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;padding:12px 32px;border-radius:50px;font-size:1rem;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(124,58,237,0.5);z-index:3;white-space:nowrap;letter-spacing:0.3px;transition:transform 0.2s,box-shadow 0.2s;';
                    cta.onmouseenter = function() { cta.style.transform = 'translateX(-50%) scale(1.05)'; cta.style.boxShadow = '0 6px 20px rgba(124,58,237,0.7)'; };
                    cta.onmouseleave = function() { cta.style.transform = 'translateX(-50%) scale(1)'; cta.style.boxShadow = '0 4px 15px rgba(124,58,237,0.5)'; };
                    cta.addEventListener('click', function(e) {
                        e.stopPropagation();
                        dismiss();
                        overlay.remove();
                        if (isInternal) {
                            window.location.href = clickUrl;
                        } else {
                            window.open(clickUrl, '_blank', 'noopener,noreferrer');
                        }
                    });
                    popup.appendChild(cta);
                }

                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '&times;';
                closeBtn.setAttribute('aria-label', 'Cerrar');
                closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;line-height:1;';
                closeBtn.addEventListener('click', () => {
                    dismiss();
                    overlay.remove();
                });
                popup.appendChild(closeBtn);
                overlay.appendChild(popup);

                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        dismiss();
                        overlay.remove();
                    }
                });

                document.body.appendChild(overlay);
            })
            .catch(() => {});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', show);
    } else {
        show();
    }
})();

