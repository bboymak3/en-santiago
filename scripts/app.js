/**
 * Un Click - Core Application Module
 * Common module loaded on ALL pages
 * Directorio Nacional de Negocios de Venezuela
 */

// ─── API Configuration ──────────────────────────────────────────
const API = '/api';

// ─── Token Management ──────────────────────────────────────────
const TOKEN_KEY = 'meridaunclick_token';
const USER_KEY = 'meridaunclick_user';

// ─── Venezuela States ────────────────────────────────────────────
const VENEZUELA_STATES = [
  { name: 'Amazonas', slug: 'amazonas' },
  { name: 'Anzoátegui', slug: 'anzoategui' },
  { name: 'Apure', slug: 'apure' },
  { name: 'Aragua', slug: 'aragua' },
  { name: 'Barinas', slug: 'barinas' },
  { name: 'Bolívar', slug: 'bolivar' },
  { name: 'Carabobo', slug: 'carabobo' },
  { name: 'Cojedes', slug: 'cojedes' },
  { name: 'Delta Amacuro', slug: 'delta-amacuro' },
  { name: 'Distrito Capital', slug: 'distrito-capital' },
  { name: 'Falcón', slug: 'falcon' },
  { name: 'Guárico', slug: 'guarico' },
  { name: 'Lara', slug: 'lara' },
  { name: 'Mérida', slug: 'merida' },
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

const LOCATION_KEY = 'aunclick_selected_state';

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
  // Reload ALL featured sections on index page
  const onIndex = document.getElementById('featuredGrid') || document.getElementById('featuredPropertiesGrid');
  if (onIndex) {
    loadFeaturedProperties();         // Businesses (negocios destacados)
    loadFeaturedPropertiesSection();  // Inmuebles destacados
    loadFeaturedProducts();           // Productos destacados
    loadFeaturedJobs();               // Empleos destacados
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
    document.title = stateName + ' Un Click - Directorio de Negocios en Venezuela';
  } else {
    document.title = 'Un Click - Directorio de Negocios en Venezuela';
  }
}

function updateLocationLabel(stateName) {
  const label = document.getElementById('locationLabel');
  if (label) {
    label.textContent = stateName || 'Todo Venezuela';
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
  locationList.innerHTML = VENEZUELA_STATES.map(state => `
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

  // "Todo Venezuela" option click
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
            throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
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
    const token = localStorage.getItem('meridaunclick_token');
    if (!token) {
        const body = document.getElementById('webPageSelectorBody');
        body.innerHTML = `
            <div style="text-align:center;padding:20px 0;color:#64748b;">
                <i class="fas fa-user-lock" style="font-size:2.5rem;color:#cbd5e1;margin-bottom:12px;"></i>
                <p style="font-size:0.95rem;font-weight:600;">Inicia sesion para ver tus paginas web</p>
                <p style="font-size:0.85rem;margin-top:4px;">Necesitas tener una cuenta y al menos un negocio registrado.</p>
                <a href="/login.html" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#059669;color:#fff;border-radius:10px;font-size:0.9rem;font-weight:600;">Iniciar Sesion</a>
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
                    <a href="/new-business.html" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#059669;color:#fff;border-radius:10px;font-size:0.9rem;font-weight:600;">Crear Negocio</a>
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
function addWebPageMenuItem() {
    const existing = document.getElementById('navWebPageItem');
    if (existing) return;
    const dropdownMenu = document.querySelector('.nav-dropdown-menu');
    if (!dropdownMenu) return;
    const divider = dropdownMenu.querySelector('.nav-dropdown-divider');
    const webLi = document.createElement('li');
    webLi.id = 'navWebPageItem';
    webLi.innerHTML = `<a href="#" class="nav-link" id="navWebPageBtn" style="color:#0ea5e9;"><i class="fas fa-globe"></i> Pagina Web</a>`;
    if (divider) {
        dropdownMenu.insertBefore(webLi, divider);
    } else {
        dropdownMenu.appendChild(webLi);
    }
    const webBtn = document.getElementById('navWebPageBtn');
    if (webBtn) {
        webBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showWebPageSelector();
        });
    }
}

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

        // Show admin link for admin users
        let adminLinkItem = document.getElementById('navAdminItem');
        if (user && user.role === 'admin') {
            if (!adminLinkItem) {
                adminLinkItem = document.createElement('li');
                adminLinkItem.id = 'navAdminItem';
                adminLinkItem.innerHTML = `<a href="admin.html" class="nav-link nav-admin-link"><i class="fas fa-shield-alt"></i> Admin</a>`;
                // Insert before the user item
                navUserItem.parentNode.insertBefore(adminLinkItem, navUserItem);
            } else {
                adminLinkItem.classList.remove('hidden');
            }
        } else if (adminLinkItem) {
            adminLinkItem.remove();
        }

        // Add "Crear Pagina Web" in "Más" dropdown for logged-in users
        addWebPageMenuItem();

    } else {
        navLoginItem.classList.remove('hidden');
        navUserItem.classList.add('hidden');

        // Remove admin link if exists
        const adminLinkItem = document.getElementById('navAdminItem');
        if (adminLinkItem) adminLinkItem.remove();

        // Also show web page link for non-logged users
        addWebPageMenuItem();

        // Make "Publicar" link require login
        const publishLinks = document.querySelectorAll('a[href="new-business.html"]');
        publishLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const redirect = encodeURIComponent('new-business.html');
                window.location.href = `login.html?redirect=${redirect}`;
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

    const formatted = new Intl.NumberFormat('es-VE', {
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
        return date.toLocaleDateString('es-VE', {
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
        return date.toLocaleDateString('es-VE', {
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
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
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
    if (business.slug) return '/negocio/' + business.slug;
    return '/business.html?id=' + business.id;
}

// ─── WhatsApp Share ────────────────────────────────────────────
function shareBusinessWhatsApp(business) {
    if (!business) return;
    const type = getBusinessTypeLabel(business.business_type);
    const url = 'https://holax.com.ve' + getBusinessUrl(business);
    const title = business.title || 'Negocio';

    let msg = `🏪 *${title}*\n`;
    msg += `📌 ${type}\n`;
    if (business.city) msg += `📍 ${business.city}${business.state ? ', ' + business.state : ''}\n`;
    msg += `\n🔗 ${url}`;
    msg += `\n\n📌 Publicado en Un Click`;

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

    const coverImage = business.cover_image || business.images?.[0]?.url || '';
    const placeholderImg = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23e0e0e0"><rect width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="16" font-family="sans-serif">Sin imagen</text></svg>'
    );
    const imgSrc = coverImage || placeholderImg;
    const typeLabel = business.category_name || getBusinessTypeLabel(business.business_type);
    const address = business.city ? (business.state ? `${business.city}, ${business.state}` : business.city) : '--';
    const descSnippet = business.description ? `<p class="business-card-desc">${truncateText(business.description, 80)}</p>` : '';

    const featuredBadge = business.featured ? '<span class="card-badge badge-featured"><i class="fas fa-star"></i> Destacada</span>' : '';
    const statusBadge = business.status && business.status !== 'approved' ? `<span class="card-badge badge-${business.status}">${getStatusLabel(business.status)}</span>` : '';
    const especialidadBadge = business.especialidad ? `<span class="card-badge badge-especialidad"><i class="fas fa-stethoscope"></i> ${business.especialidad}</span>` : '';

    const bizUrl = getBusinessUrl(business);
    return `
        <article class="business-card" data-business-id="${business.id}">
            <a href="${bizUrl}" class="business-card-link">
                <div class="business-card-image">
                    <img src="${imgSrc}" alt="${business.title || 'Sin título'}" loading="lazy" onerror="this.src='${placeholderImg}'">
                    <div class="business-card-badges">
                        <span class="card-badge badge-type">${typeLabel}</span>
                        ${featuredBadge}${statusBadge}${especialidadBadge}
                    </div>
                    <button class="btn-share-wa-card" data-business-id="${business.id}" aria-label="Compartir por WhatsApp" onclick="event.preventDefault(); event.stopPropagation();">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
                <div class="business-card-body">
                    <h3 class="business-card-title">${business.title || 'Sin título'}</h3>
                    ${business.especialidad ? '<p class="business-card-especialidad"><i class="fas fa-stethoscope"></i> ' + business.especialidad + '</p>' : ''}
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
        window.open(`https://wa.me/?text=${encodeURIComponent('🏪 Mira este negocio en Un Click:\nhttps://holax.com.ve/negocio/' + businessId)}`, '_blank');
    });
});

// ─── Search Params Helper ──────────────────────────────────────
function getSearchParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        estado: params.get('estado') || '',
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
        window.location.href = `login.html?redirect=${redirect}`;
        return false;
    }
    return true;
}

// ─── Logout Handler ────────────────────────────────────────────
function handleLogout() {
    removeToken();
    showToast('Has cerrado sesión', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
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
    }

    function closeSearchModal() {
        searchForm.classList.remove('mobile-open');
        trigger.classList.remove('active');
        if (backdrop) backdrop.classList.remove('visible');
        document.body.style.overflow = '';
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

// ─── Initialization ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Update navigation bar
    updateNav();

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
            const selectedState = getSelectedState();
            let endpoint = '/businesses?status=approved&limit=3&featured=1';
            if (selectedState) endpoint += `&state=${encodeURIComponent(selectedState)}`;
            const data = await api.get(endpoint);
            businesses = data.businesses || [];
        }

        if (loading) loading.remove();

        if (businesses.length === 0) {
            if (emptyState) emptyState.style.display = '';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        businesses = businesses.slice(0, 3);
        grid.innerHTML = businesses.map(p => createBusinessCard(p)).join('');
    } catch (error) {
        if (loading) loading.remove();
        if (emptyState) emptyState.style.display = '';
        console.error('Error loading featured businesses:', error);
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

        // Fallback: try direct API with featured=1 flag
        if (properties.length === 0) {
            const selectedState = getSelectedState();
            let endpoint = '/properties?status=approved&limit=6&featured=1';
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
        properties = properties.slice(0, 6);
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
            <div class="business-card-price">${currSymbol} ${Number(p.price).toLocaleString('es-VE')}</div>
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
        if (!searchGrid) return; // Not on search page

        // Populate filter fields from URL params
        const params = getSearchParams();
        if (params.estado && document.getElementById('sEstado')) document.getElementById('sEstado').value = params.estado;
        if (params.categoria && document.getElementById('sCategoria')) document.getElementById('sCategoria').value = params.categoria;
        if (params.city && document.getElementById('sCiudad')) document.getElementById('sCiudad').value = params.city;
        if (params.business_type && document.getElementById('sTipoNegocio')) document.getElementById('sTipoNegocio').value = params.business_type;
        if (params.search && document.getElementById('sBusqueda')) document.getElementById('sBusqueda').value = params.search;
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
                window.location.href = 'search.html';
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

        if (!searchGrid) return;

        // Show loading
        if (searchLoading) searchLoading.classList.remove('hidden');
        if (noResults) noResults.classList.add('hidden');
        searchGrid.innerHTML = '';
        if (paginationEl) paginationEl.classList.add('hidden');

        // Gather filter values
        const estado = document.getElementById('sEstado')?.value || '';
        const categoria = document.getElementById('sCategoria')?.value || '';
        const ciudad = document.getElementById('sCiudad')?.value?.trim() || '';
        const tipoNegocio = document.getElementById('sTipoNegocio')?.value || '';
        const especialidad = document.getElementById('sEspecialidad')?.value?.trim() || '';
        const q = document.getElementById('sBusqueda')?.value?.trim() || '';
        const sort = document.getElementById('sSort')?.value || document.getElementById('sOrdenar')?.value || '';

        // Build API endpoint
        let endpoint = `/businesses?status=approved&page=${page}&limit=12`;
        if (estado) endpoint += `&state=${encodeURIComponent(estado)}`;
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
                if (estado) tags += `<span class="active-filter-tag"><i class="fas fa-map"></i> ${estado} <button onclick="this.parentElement.remove(); document.getElementById('sEstado').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (categoria) tags += `<span class="active-filter-tag"><i class="fas fa-tag"></i> ${categoria} <button onclick="this.parentElement.remove(); document.getElementById('sCategoria').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (ciudad) tags += `<span class="active-filter-tag"><i class="fas fa-map-marker-alt"></i> ${ciudad} <button onclick="this.parentElement.remove(); document.getElementById('sCiudad').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (tipoNegocio) tags += `<span class="active-filter-tag">${getBusinessTypeLabel(tipoNegocio)} <button onclick="this.parentElement.remove(); document.getElementById('sTipoNegocio').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (especialidad) tags += `<span class="active-filter-tag"><i class="fas fa-stethoscope"></i> ${truncateText(especialidad, 20)} <button onclick="this.parentElement.remove(); document.getElementById('sEspecialidad').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
                if (q) tags += `<span class="active-filter-tag"><i class="fas fa-search"></i> "${truncateText(q, 20)}" <button onclick="this.parentElement.remove(); document.getElementById('sBusqueda').value=''; document.getElementById('searchBtn').click();">&times;</button></span>`;
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
            updateSearchURL(estado, categoria, ciudad, tipoNegocio, especialidad, q, page);

        } catch (error) {
            if (searchLoading) searchLoading.classList.add('hidden');
            searchGrid.innerHTML = '<div class="no-results"><i class="fas fa-exclamation-circle fa-3x"></i><h2>Error de búsqueda</h2><p>No se pudieron cargar los resultados. Intenta nuevamente.</p></div>';
            console.error('Search error:', error);
        }
    }

    function updateSearchURL(estado, categoria, ciudad, tipoNegocio, especialidad, q, page) {
        const url = new URL(window.location);
        url.searchParams.delete('estado');
        url.searchParams.delete('categoria');
        url.searchParams.delete('ciudad');
        url.searchParams.delete('tipo_negocio');
        url.searchParams.delete('especialidad');
        url.searchParams.delete('q');
        url.searchParams.delete('page');

        if (estado) url.searchParams.set('estado', estado);
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
            let endpoint = '/marketplace?status=approved&limit=8&featured=1&sort=newest';
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
        products = products.slice(0, 8);
        grid.innerHTML = products.map(p => {
            const img = p.image || '';
            const price = p.price > 0 ? '$' + Number(p.price).toLocaleString('es-VE') : 'Gratis';
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
            const selectedState = getSelectedState();
            const featuredData = await api.get('/featured-items?item_type=job');
            const featuredItems = featuredData.featured_items || [];
            if (featuredItems.length > 0) {
                const jobIds = featuredItems.map(f => f.item_id);
                // Fetch only the featured jobs that are approved
                const allJobsPromises = jobIds.map(id => api.get(`/jobs/${id}`).catch(() => null));
                const jobResults = await Promise.all(allJobsPromises);
                jobs = jobResults.filter(j => j && j.status === 'approved');
                // Filter by state if selected
                if (selectedState) {
                    jobs = jobs.filter(j => j.state === selectedState);
                }
            }
        } catch (e) {
            // If featured-items fails, show nothing
        }

        // Fallback: try direct API with featured=1 flag
        if (jobs.length === 0) {
            const selectedState = getSelectedState();
            let endpoint = '/jobs?status=approved&limit=3&featured=1&sort=newest';
            if (selectedState) endpoint += `&state=${encodeURIComponent(selectedState)}`;
            const data = await api.get(endpoint);
            jobs = data.jobs || [];
        }

        // Limit to 3
        jobs = jobs.slice(0, 3);

        if (loading) loading.remove();

        if (jobs.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        grid.innerHTML = jobs.map(j => {
            const salary = j.salary ? '$' + Number(j.salary).toLocaleString('es-VE') : '';
            const typeLabel = (j.job_type || '').replace('_', ' ');
            const featuredBadge = j.featured ? '<span class="card-badge-featured"><i class="fas fa-star"></i></span>' : '';

            return `
            <a href="empleo.html" class="business-card">
                ${featuredBadge}
                <div class="business-card-img">
                    <div class="card-img-placeholder" style="background:linear-gradient(135deg,#17a2b8,#20c997);">
                        <i class="fas fa-briefcase" style="color:#fff;font-size:2rem;"></i>
                    </div>
                    <div class="card-badges">
                        <span class="card-badge card-badge-type">${escapeHtml(typeLabel)}</span>
                    </div>
                </div>
                <div class="business-card-body">
                    <h3 class="business-card-title">${escapeHtml(j.title)}</h3>
                    <div class="business-card-location"><i class="fas fa-building"></i> ${escapeHtml(j.company_name || j.business_name || '')}</div>
                    ${j.location ? `<div class="business-card-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(j.location)}</div>` : ''}
                    ${salary ? `<div class="business-card-price">${salary}</div>` : ''}
                </div>
            </a>`;
        }).join('');
    } catch (error) {
        if (loading) loading.remove();
        console.error('Error loading featured jobs:', error);
    }
}

