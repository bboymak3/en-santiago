/**
 * Un Click - Map Module
 * Clean restructure: Uses Leaflet native popups (works on desktop & mobile)
 * No custom modal overlays — just native Leaflet popups that work everywhere
 */

(function () {
    'use strict';

    // ─── Configuration ──────────────────────────────────────────
    const CLNEZUELA_CENTER = [-33.45233, -66.5897];
    const DEFAULT_ZOOM = 6;

    // ─── State ──────────────────────────────────────────────────
    let map = null;
    let markers = [];
    let markerLayer = null;
    let isMapView = false;
    let allBusinesses = [];
    let activeCardId = null;
    let miniMapInitialized = false;
    let allProperties = [];
    let currentMapType = 'both'; // 'businesses', 'properties', or 'both'

    // ─── DOM Elements ───────────────────────────────────────────
    const mapContainer = document.getElementById('map');
    const mapBusinessList = document.getElementById('mapBusinessList');
    const mapLoading = document.getElementById('mapLoading');
    const mapResultCount = document.getElementById('mapCountText');
    const mapSidebar = document.getElementById('mapSidebar');
    const mapSidebarToggle = document.getElementById('mapSidebarToggle');

    // Filter elements
    const mapTipo = document.getElementById('mapTipo');
    const mapComuna = document.getElementById('mapComuna');
    const mapCiudad = document.getElementById('mapCiudad');
    const mapSearchBtn = document.getElementById('mapSearchBtn');
    const mapResetBtn = document.getElementById('mapResetBtn');

    // Search.html mini map elements
    const searchMapContainer = document.getElementById('searchMapContainer');
    const searchMiniMap = document.getElementById('searchMiniMap');
    const mapToggleBtn = document.getElementById('mapToggleBtn');
    const closeMapBtn = document.getElementById('closeMapBtn');

    // ─── Determine Context ──────────────────────────────────────
    isMapView = !!mapContainer;

    // ─── Initialize ─────────────────────────────────────────────
    function initMap() {
        if (isMapView) {
            initFullMap();
            setupSidebarToggle();
            setupMapFilters();
        }
        setupMiniMapToggle();
    }

    // ─── Initialize Full Map ────────────────────────────────────
    function initFullMap() {
        if (!mapContainer || typeof L === 'undefined') return;

        try {
            // FIX: Canvas renderer para mejor performance con muchos marcadores.
            // Canvas es más rápido que SVG (default) cuando hay 50+ elementos.
            map = L.map('map', {
                center: CLNEZUELA_CENTER,
                zoom: DEFAULT_ZOOM,
                zoomControl: false,
                scrollWheelZoom: true,
                tap: true,
                closePopupOnClick: true,
                preferCanvas: true,  // FIX: Canvas renderer
            });

            // OpenStreetMap tiles (free)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: false,
                maxZoom: 19,
            }).addTo(map);

            // Remove the small attribution icon in the corner
            map.attributionControl.remove();

            // FIX: Usar markerClusterGroup si está disponible el plugin.
            // Esto agrupa marcadores cercanos en burbujas, reduciendo de
            // 100+ elementos DOM a ~10-20 visibles. Performance masiva.
            if (typeof L.markerClusterGroup === 'function') {
                markerLayer = L.markerClusterGroup({
                    maxClusterRadius: 50,
                    spiderfyOnMaxZoom: true,
                    showCoverageOnHover: false,
                    zoomToBoundsOnClick: true,
                    chunkedLoading: true,  // FIX: carga en chunks para no bloquear UI
                    chunkProgress: null,
                });
            } else {
                // Fallback: layerGroup estándar si no hay plugin
                markerLayer = L.layerGroup();
            }
            markerLayer.addTo(map);

            // ─── Custom map controls ─────────────────────────────
            var Lc = L.control;

            // Zoom controls
            var zoomCtrl = Lc.zoom({ position: 'bottomright' });
            zoomCtrl.addTo(map);

            // Center map button
            var centerBtn = Lc({ position: 'bottomright' });
            centerBtn.onAdd = function () {
                var div = L.DomUtil.create('div', 'leaflet-bar map-ctrl-center');
                div.innerHTML = '<a href="#" title="Centrar mapa" role="button" aria-label="Centrar mapa"><i class="fas fa-crosshairs"></i></a>';
                div.onclick = function (e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    fitAllMarkers();
                };
                return div;
            };
            centerBtn.addTo(map);

            // Go back button
            var backBtn = Lc({ position: 'bottomright' });
            backBtn.onAdd = function () {
                var div = L.DomUtil.create('div', 'leaflet-bar map-ctrl-back');
                div.innerHTML = '<a href="#" title="Ir atrás" role="button" aria-label="Ir atrás"><i class="fas fa-arrow-left"></i></a>';
                div.onclick = function (e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.href = '/index.html';
                    }
                };
                return div;
            };
            backBtn.addTo(map);

            // Marker layer group
            markerLayer = L.layerGroup().addTo(map);

            // Load both businesses and properties
            loadMapAll();

            // Fix rendering
            setTimeout(function () { map.invalidateSize(); }, 300);
        } catch (error) {
            console.error('Error initializing map:', error);
            mapContainer.innerHTML = '<div class="map-no-results"><i class="fas fa-exclamation-circle"></i><p>Error al cargar el mapa</p></div>';
        }
    }

    // ─── Safe helpers (fallback if app.js functions not loaded) ──
    function safeGetTypeLabel(type) {
        try {
            if (typeof getBusinessTypeLabel === 'function') return getBusinessTypeLabel(type);
        } catch (e) { /* ignore */ }
        return type || 'Negocio';
    }

    function safeGetTypeIcon(type) {
        var icons = {
            'negocio': '🏪',
            'profesional': '💼',
            'servicio': '🔔',
            'restaurante': '🍽️',
            'tienda': '🛍️',
            'otro': '📌',
        };
        return icons[type?.toLowerCase()] || '📌';
    }

    // ─── Fix Corrupted Coordinates ───────────────────────────
    // DB values like lng=-7021260663068742 missing decimal → -70.671260663068742
    function fixCoord(val) {
        if (val === null || val === undefined || val === '') return null;
        var n = parseFloat(val);
        if (isNaN(n)) return null;
        if (n > 180 || n < -180) {
            // Likely missing decimal point — insert after first 2-3 digits
            var s = String(Math.abs(n));
            var sign = n < 0 ? '-' : '';
            // Try inserting at position 2 (e.g. -7021... → -70.671...)
            if (s.length > 3) {
                var fixed = sign + s.substring(0, 2) + '.' + s.substring(2);
                var fn = parseFloat(fixed);
                if (!isNaN(fn) && fn >= -180 && fn <= 180) return fn;
            }
            // Fallback: insert at position 3
            if (s.length > 4) {
                var fixed2 = sign + s.substring(0, 3) + '.' + s.substring(3);
                var fn2 = parseFloat(fixed2);
                if (!isNaN(fn2) && fn2 >= -180 && fn2 <= 180) return fn2;
            }
            return null; // Cannot fix
        }
        return n;
    }

    function fixItemCoords(item) {
        item._lat = fixCoord(item.lat);
        item._lng = fixCoord(item.lng);
        return item;
    }

    // ─── Create Marker ──────────────────────────────────────────
    function createMarker(business) {
        fixItemCoords(business);
        if (!business._lat || !business._lng || typeof L === 'undefined') return null;

        try {
            var coverImage = '';
            // FIX: Priorizar cover_image → logo → primera imagen disponible
            if (business.cover_image && typeof business.cover_image === 'string') {
                coverImage = business.cover_image;
            } else if (business.logo && typeof business.logo === 'string') {
                coverImage = business.logo;
            } else if (business.images && Array.isArray(business.images) && business.images.length > 0 && business.images[0].url) {
                coverImage = business.images[0].url;
            }

            var typeLabel = safeGetTypeLabel(business.business_type);
            var title = business.title || 'Sin título';

            // Color by business type
            var iconColor = getMarkerColor(business.business_type);

            // Custom pin icon with emoji
            var icon = L.divIcon({
                className: 'custom-map-marker',
                html: '<div class="marker-pin" style="background-color: ' + iconColor + ';">'
                    + '<span class="marker-price">' + safeGetTypeIcon(business.business_type) + '</span>'
                    + '</div>'
                    + '<div class="marker-shadow"></div>',
                iconSize: [40, 52],
                iconAnchor: [20, 52],
                popupAnchor: [0, -56],
            });

            var marker = L.marker([business._lat, business._lng], { icon: icon });

            // FIX: Lazy popup — solo crea el HTML del popup al hacer click,
            // no al crear el marcador. Con 100+ marcadores, esto ahorra
            // crear 100+ estructuras DOM de popup que quizás nunca se ven.
            var popupHTML = null;  // se genera on-demand
            function getPopupHTML() {
                if (popupHTML) return popupHTML;

                var imgTag = coverImage
                    ? '<div class="map-popup-image"><img src="' + coverImage + '" alt="' + title + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>'
                    : '';

                var address = business.city ? (business.state ? business.city + ', ' + business.state : business.city) : '';

                popupHTML = '<div class="map-popup">'
                    + imgTag
                    + '<div class="map-popup-content">'
                    + '<h4 class="map-popup-title">' + title + '</h4>'
                    + '<div class="map-popup-badges">'
                    + '<span class="map-popup-badge">' + typeLabel + '</span>'
                    + '</div>'
                    + (address ? '<div class="map-popup-location">' + address + '</div>' : '')
                    + '<a href="' + (business.category_slug === 'medicina-servicio-medico' ? '/medicina-servicio-medico' : '/negocio') + '/' + (business.slug || business.id) + '" class="map-popup-link">Ver más <i class="fas fa-arrow-right"></i></a>'
                    + '</div>'
                    + '</div>';

                // Safety check
                if (typeof popupHTML !== 'string' || popupHTML.length === 0) {
                    popupHTML = '<div class="map-popup"><div class="map-popup-content"><h4>' + title + '</h4><p>Negocio</p></div></div>';
                }
                return popupHTML;
            }

            // FIX: Bind popup con función lazy (se crea solo al click)
            marker.bindPopup(getPopupHTML, {
                maxWidth: 300,
                minWidth: 260,
                closeButton: true,
                autoPan: true,
                autoPanPaddingTopLeft: [20, 60],
                autoPanPaddingBottomRight: [20, 20],
            });

            // On marker click, highlight card in sidebar
            marker.on('click', function () {
                highlightCard(business.id);
            });

            return marker;
        } catch (err) {
            console.error('Error creating marker for business ' + (business.id || '?') + ':', err);
            return null;
        }
    }

    function createMiniMarker(business) {
        fixItemCoords(business);
        if (!business._lat || !business._lng || typeof L === 'undefined') return null;

        var coverImage = business.logo || business.cover_image || '';
        var isLogo = Boolean(business.logo);
        var title = escapeMapText(business.title || 'Negocio');
        var typeLabel = escapeMapText(safeGetTypeLabel(business.business_type));
        var address = business.city ? (business.state ? business.city + ', ' + business.state : business.city) : '';
        var phone = business.phone || business.whatsapp || '';
        var businessPath = business.category_slug === 'medicina-servicio-medico' ? '/medicina-servicio-medico' : '/negocio';
        var imageTag = coverImage
            ? '<div class="map-popup-image' + (isLogo ? ' map-popup-logo' : '') + '"><img src="' + escapeMapAttribute(coverImage) + '" alt="' + title + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>'
            : '';
        var details = (address ? '<div class="map-popup-detail"><i class="fas fa-map-marker-alt"></i>' + escapeMapText(address) + '</div>' : '')
            + (phone ? '<div class="map-popup-detail"><i class="fas fa-phone"></i>' + escapeMapText(phone) + '</div>' : '');

        var marker = L.marker([business._lat, business._lng], {
            icon: L.divIcon({
                className: 'mini-map-marker',
                html: '<div class="mini-map-pin" style="background-color:' + getMarkerColor(business.business_type) + ';"><span><i class="fas fa-store"></i></span></div>',
                iconSize: [32, 38],
                iconAnchor: [16, 38],
                popupAnchor: [0, -38],
            }),
        });

        marker.bindPopup('<div class="map-popup">'
            + imageTag
            + '<div class="map-popup-content">'
            + '<h4 class="map-popup-title">' + title + '</h4>'
            + '<div class="map-popup-badges"><span class="map-popup-badge">' + typeLabel + '</span></div>'
            + details
            + '<a href="' + businessPath + '/' + encodeURIComponent(business.slug || business.id) + '" class="map-popup-link">Ver ficha <i class="fas fa-arrow-right"></i></a>'
            + '</div></div>', {
                maxWidth: 300,
                minWidth: 240,
                closeButton: true,
            });
        return marker;
    }

    function escapeMapText(value) {
        return String(value || '').replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function escapeMapAttribute(value) {
        return escapeMapText(value).replace(/`/g, '&#96;');
    }

    function getMarkerColor(businessType) {
        var colors = {
            'negocio': '#1a73e8',
            'profesional': '#28a745',
            'servicio': '#ff6b35',
            'restaurante': '#e74c3c',
            'tienda': '#9c27b0',
            'otro': '#607d8b',
        };
        try {
            return (businessType && colors[businessType.toLowerCase()]) || '#1a73e8';
        } catch (e) {
            return '#1a73e8';
        }
    }

    // ─── Load Map Businesses ───────────────────────────────────
    function loadMapBusinesses() {
        if (!isMapView) return;

        if (mapLoading) mapLoading.style.display = '';

        var filters = getFilterValues();
        var endpoint = '/businesses?status=approved&limit=100';

        if (filters.categoria) endpoint += '&categoria=' + encodeURIComponent(filters.categoria);
        if (filters.state) endpoint += '&state=' + encodeURIComponent(filters.state);
        if (filters.city) endpoint += '&city=' + encodeURIComponent(filters.city);

        api.get(endpoint).then(function (data) {
            allBusinesses = data.businesses || [];

            // Clear markers
            if (markerLayer) markerLayer.clearLayers();
            markers = [];

            // Update count
            if (mapResultCount) {
                mapResultCount.textContent = allBusinesses.length + ' negocios encontrados';
            }

            // Add markers
            var validItems = allBusinesses.filter(function (p) { return fixCoord(p.lat) && fixCoord(p.lng); });

            validItems.forEach(function (business) {
                var marker = createMarker(business);
                if (marker) {
                    markers.push({ marker: marker, business: business });
                    markerLayer.addLayer(marker);
                }
            });

            // Fit map to show all markers
            if (validItems.length > 0) {
                fitAllMarkers();
            }

            // Render sidebar list
            renderBusinessList(allBusinesses);

        }).catch(function (error) {
            console.error('Error loading map businesses:', error);
            showToast('Error al cargar negocios en el mapa', 'error');
        }).finally(function () {
            if (mapLoading) mapLoading.style.display = 'none';
        });
    }

    // ─── Load Both Businesses & Properties ────────────────────
    function loadMapAll() {
        if (!isMapView) return;

        if (mapLoading) mapLoading.style.display = '';

        var filters = getFilterValues();
        var bizEndpoint = '/businesses?status=approved&limit=100';
        var propEndpoint = '/properties?status=approved&limit=100';

        if (filters.categoria) {
            bizEndpoint += '&categoria=' + encodeURIComponent(filters.categoria);
            propEndpoint += '&property_type=' + encodeURIComponent(filters.categoria);
        }
        if (filters.state) {
            bizEndpoint += '&state=' + encodeURIComponent(filters.state);
            propEndpoint += '&state=' + encodeURIComponent(filters.state);
        }
        if (filters.city) {
            bizEndpoint += '&city=' + encodeURIComponent(filters.city);
            propEndpoint += '&city=' + encodeURIComponent(filters.city);
        }

        Promise.all([
            api.get(bizEndpoint).catch(function () { return { businesses: [] }; }),
            api.get(propEndpoint).catch(function () { return { properties: [] }; })
        ]).then(function (results) {
            allBusinesses = results[0].businesses || [];
            allProperties = results[1].properties || [];

            if (markerLayer) markerLayer.clearLayers();
            markers = [];

            var totalCount = allBusinesses.length + allProperties.length;
            if (mapResultCount) {
                mapResultCount.textContent = totalCount + ' resultados encontrados';
            }

            // Add business markers
            allBusinesses.forEach(function (business) {
                var marker = createMarker(business);
                if (marker) {
                    markers.push({ marker: marker, business: business });
                    markerLayer.addLayer(marker);
                }
            });

            // Add property markers
            allProperties.forEach(function (property) {
                var marker = createPropertyMarker(property);
                if (marker) {
                    markers.push({ marker: marker, business: property });
                    markerLayer.addLayer(marker);
                }
            });

            if (markers.length > 0) {
                fitAllMarkers();
            }

            // Render combined list
            renderCombinedList(allBusinesses, allProperties);
        }).catch(function (error) {
            console.error('Error loading map data:', error);
            showToast('Error al cargar datos en el mapa', 'error');
        }).finally(function () {
            if (mapLoading) mapLoading.style.display = 'none';
        });
    }

    // ─── Render Combined List ──────────────────────────────────
    function renderCombinedList(businesses, properties) {
        if (!mapBusinessList) return;

        var totalCount = businesses.length + properties.length;
        if (totalCount === 0) {
            mapBusinessList.innerHTML = '<div class="map-no-results"><i class="fas fa-search"></i><p>No se encontraron resultados.</p></div>';
            return;
        }

        var html = '';

        // Business cards
        businesses.forEach(function (p) {
            var coverImage = p.cover_image || (p.images && p.images[0] && p.images[0].url) || '';
            var typeLabel = safeGetTypeLabel(p.business_type);
            var address = p.city ? (p.state ? p.city + ', ' + p.state : p.city) : '--';
            fixItemCoords(p);
            html += '<div class="map-business-card" data-business-id="' + p.id + '" data-lat="' + (p._lat || '') + '" data-lng="' + (p._lng || '') + '">'
                + '<img src="' + coverImage + '" alt="' + (p.title || 'Negocio') + '" onerror="this.style.display=\'none\'">'
                + '<div class="card-info">'
                + '<div class="card-title" title="' + (p.title || '') + '">' + (p.title || 'Sin t\u00edtulo') + '</div>'
                + '<div class="card-location">' + address + '</div>'
                + '<div class="card-badges">'
                + '<span class="card-badge badge-type" style="background:#1a73e8;color:#fff;">' + typeLabel + '</span>'
                + '</div>'
                + '</div>'
                + '</div>';
        });

        // Property cards
        properties.forEach(function (p) {
            var coverImage = p.cover_image || '';
            var opLabel = (p.operation_type || '').replace('_', ' ');
            var price = p.price ? '$' + Number(p.price).toLocaleString('es-CL') : '';
            var address = p.city ? (p.state ? p.city + ', ' + p.state : p.city) : '--';
            fixItemCoords(p);
            html += '<div class="map-business-card" data-business-id="' + p.id + '" data-lat="' + (p._lat || '') + '" data-lng="' + (p._lng || '') + '">'
                + (coverImage ? '<img src="' + coverImage + '" alt="' + (p.title || 'Propiedad') + '" onerror="this.style.display=\'none\'">' : '')
                + '<div class="card-info">'
                + '<div class="card-title" title="' + (p.title || '') + '">' + (p.title || 'Sin t\u00edtulo') + '</div>'
                + '<div class="card-location">' + address + '</div>'
                + '<div class="card-badges">'
                + '<span class="card-badge badge-type" style="background:#006EE3;color:#fff;">' + opLabel + '</span>'
                + (price ? '<span class="card-badge badge-price">' + price + '</span>' : '')
                + '</div>'
                + '</div>'
                + '</div>';
        });

        mapBusinessList.innerHTML = html;

        // Click handlers
        mapBusinessList.querySelectorAll('.map-business-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var id = parseInt(card.dataset.businessId);
                var lat = parseFloat(card.dataset.lat);
                var lng = parseFloat(card.dataset.lng);
                highlightCard(id);
                if (!isNaN(lat) && !isNaN(lng) && map) {
                    flyToBusiness(id);
                }
            });
        });
    }

    // ─── Sidebar Toggle ─────────────────────────────────────────
    function setupSidebarToggle() {
        if (mapSidebarToggle && mapSidebar) {
            mapSidebarToggle.addEventListener('click', function () {
                mapSidebar.classList.toggle('collapsed');
                mapSidebarToggle.classList.toggle('shifted');
                setTimeout(function () {
                    if (map) map.invalidateSize();
                }, 350);
            });
        }

        // Close button (visible on mobile)
        var closeBtn = document.getElementById('mapSidebarClose');
        if (closeBtn && mapSidebar) {
            closeBtn.addEventListener('click', function () {
                mapSidebar.classList.add('collapsed');
                if (mapSidebarToggle) mapSidebarToggle.classList.add('shifted');
                setTimeout(function () {
                    if (map) map.invalidateSize();
                }, 350);
            });
        }
    }

    // ─── Map Filters ────────────────────────────────────────────
    function setupMapFilters() {
        // Toggle type buttons
        var btnNegocios = document.getElementById('mapToggleNegocios');
        var btnPropiedades = document.getElementById('mapTogglePropiedades');
        var btnTodos = document.getElementById('mapToggleTodos');
        if (btnNegocios) {
            btnNegocios.addEventListener('click', function (e) {
                e.preventDefault();
                showMapType('businesses');
            });
        }
        if (btnPropiedades) {
            btnPropiedades.addEventListener('click', function (e) {
                e.preventDefault();
                showMapType('properties');
            });
        }
        if (btnTodos) {
            btnTodos.addEventListener('click', function (e) {
                e.preventDefault();
                showMapType('both');
            });
        }

        if (mapSearchBtn) {
            mapSearchBtn.addEventListener('click', function () {
                if (currentMapType === 'properties') {
                    loadMapProperties();
                } else if (currentMapType === 'businesses') {
                    loadMapBusinesses();
                } else {
                    loadMapAll();
                }
            });
        }
        if (mapResetBtn) {
            mapResetBtn.addEventListener('click', resetFilters);
        }
        [mapCiudad, mapComuna].forEach(function (input) {
            if (input) {
                input.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        if (currentMapType === 'properties') {
                            loadMapProperties();
                        } else if (currentMapType === 'businesses') {
                            loadMapBusinesses();
                        } else {
                            loadMapAll();
                        }
                    }
                });
            }
        });
    }

    function getFilterValues() {
        return {
            categoria: mapTipo ? mapTipo.value : '',
            state: mapComuna ? mapComuna.value : '',
            city: mapCiudad ? (mapCiudad.value || '').trim() : '',
        };
    }

    function resetFilters() {
        if (mapTipo) mapTipo.value = '';
        if (mapComuna) mapComuna.value = '';
        if (mapCiudad) mapCiudad.value = '';
        // Reload based on current type
        if (currentMapType === 'properties') {
            loadMapProperties();
        } else if (currentMapType === 'businesses') {
            loadMapBusinesses();
        } else {
            loadMapAll();
        }
    }

    // ─── Render Sidebar Business List ───────────────────────────
    // FIX: Paginación del sidebar para performance con 100+ negocios.
    // Solo renderiza 20 cards iniciales, carga más al hacer scroll.
    var sidebarPageSize = 20;
    var sidebarCurrentPage = 0;
    var sidebarAllBusinesses = [];

    function renderBusinessList(businesses) {
        if (!mapBusinessList) return;

        if (businesses.length === 0) {
            mapBusinessList.innerHTML = '<div class="map-no-results"><i class="fas fa-search"></i><p>No se encontraron negocios.</p></div>';
            return;
        }

        // Guardar todas para paginación
        sidebarAllBusinesses = businesses;
        sidebarCurrentPage = 0;

        // Renderizar primera página
        renderBusinessListPage();

        // FIX: Scroll infinito — cargar más cards al llegar al final
        mapBusinessList.onscroll = function() {
            if (mapBusinessList.scrollTop + mapBusinessList.clientHeight >= mapBusinessList.scrollHeight - 100) {
                sidebarCurrentPage++;
                renderBusinessListPage(true);
            }
        };
    }

    function renderBusinessListPage(append) {
        if (!mapBusinessList || sidebarAllBusinesses.length === 0) return;

        var start = sidebarCurrentPage * sidebarPageSize;
        var end = start + sidebarPageSize;
        var pageBusinesses = sidebarAllBusinesses.slice(start, end);

        if (pageBusinesses.length === 0) return;

        var html = pageBusinesses.map(function (p) {
            var coverImage = p.cover_image || (p.images && p.images[0] && p.images[0].url) || '';
            var typeLabel = safeGetTypeLabel(p.business_type);
            var address = p.city ? (p.state ? p.city + ', ' + p.state : p.city) : '--';

            fixItemCoords(p);
            return '<div class="map-business-card" data-business-id="' + p.id + '" data-lat="' + (p._lat || '') + '" data-lng="' + (p._lng || '') + '">'
                + '<img src="' + coverImage + '" alt="' + (p.title || 'Negocio') + '" loading="lazy" onerror="this.style.display=\'none\'">'
                + '<div class="card-info">'
                + '<div class="card-title" title="' + (p.title || '') + '">' + (p.title || 'Sin título') + '</div>'
                + '<div class="card-location">' + address + '</div>'
                + '<div class="card-badges">'
                + '<span class="card-badge badge-type">' + typeLabel + '</span>'
                + '</div>'
                + '</div>'
                + '</div>';
        }).join('');

        if (append) {
            mapBusinessList.insertAdjacentHTML('beforeend', html);
        } else {
            mapBusinessList.innerHTML = html;
        }

        // Bind click events solo a las cards nuevas
        var allCards = mapBusinessList.querySelectorAll('.map-business-card');
        var startIndex = append ? (allCards.length - pageBusinesses.length) : 0;
        for (var i = startIndex; i < allCards.length; i++) {
            (function(card) {
                card.addEventListener('click', function () {
                    var id = parseInt(card.dataset.businessId);
                    var lat = parseFloat(card.dataset.lat);
                    var lng = parseFloat(card.dataset.lng);

                    highlightCard(id);

                    if (!isNaN(lat) && !isNaN(lng) && map) {
                        flyToBusiness(id);
                    } else {
                        var biz = allBusinesses.find(function(b) { return b.id === id; });
                        if (currentMapType === 'properties') {
                            window.location.href = '/property-detail.html?id=' + id;
                        } else {
                            window.location.href = (biz && biz.category_slug === 'medicina-servicio-medico' ? '/medicina-servicio-medico' : '/negocio') + '/' + (biz && biz.slug ? biz.slug : id);
                        }
                    }
                });
            })(allCards[i]);
        }
    }

    // ─── Highlight Card & Open Popup ────────────────────────────
    function highlightCard(businessId) {
        activeCardId = businessId;

        // Highlight in sidebar
        if (mapBusinessList) {
            mapBusinessList.querySelectorAll('.map-business-card').forEach(function (card) {
                card.classList.toggle('active', parseInt(card.dataset.businessId) === businessId);
            });
        }

        // Open popup on marker
        var found = markers.find(function (m) { return m.business.id === businessId; });
        if (found && found.marker) {
            found.marker.openPopup();
        }
    }

    function flyToBusiness(businessId) {
        if (!map) return;

        var found = markers.find(function (m) { return m.business.id === businessId; });
        if (found && found.marker) {
            map.flyTo(found.marker.getLatLng(), 15, { duration: 1 });
            setTimeout(function () {
                found.marker.openPopup();
            }, 1100);
        }
    }

    function fitAllMarkers() {
        if (!map || markers.length === 0) return;

        var bounds = L.latLngBounds(markers.map(function (m) { return m.marker.getLatLng(); }));
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
    }

    // ─── Mini Map (search.html) ─────────────────────────────────
    function setupMiniMapToggle() {
        if (!mapToggleBtn || !searchMapContainer || !searchMiniMap) return;

        if (!searchMapContainer.classList.contains('hidden')) {
            initMiniMap();
            miniMapInitialized = true;
            mapToggleBtn.classList.add('active');
        }

        mapToggleBtn.addEventListener('click', function () {
            var isHidden = searchMapContainer.classList.contains('hidden');
            if (isHidden) {
                searchMapContainer.classList.remove('hidden');
                mapToggleBtn.classList.add('active');
                if (!miniMapInitialized) {
                    initMiniMap();
                    miniMapInitialized = true;
                } else {
                    setTimeout(function () { if (window._miniMap) window._miniMap.invalidateSize(); }, 100);
                }
            } else {
                searchMapContainer.classList.add('hidden');
                mapToggleBtn.classList.remove('active');
            }
        });

        if (closeMapBtn) {
            closeMapBtn.addEventListener('click', function () {
                searchMapContainer.classList.add('hidden');
                mapToggleBtn.classList.remove('active');
            });
        }
    }

    function initMiniMap() {
        if (!searchMiniMap || typeof L === 'undefined') return;

        try {
            window._miniMap = L.map('searchMiniMap', {
                center: CLNEZUELA_CENTER,
                zoom: DEFAULT_ZOOM,
                zoomControl: false,
                scrollWheelZoom: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: false,
                maxZoom: 19,
            }).addTo(window._miniMap);
            window._miniMap.attributionControl.remove();
            L.control.zoom({ position: 'bottomright' }).addTo(window._miniMap);

            window._miniMarkerLayer = L.layerGroup().addTo(window._miniMap);
            loadMiniMapBusinesses();

            setTimeout(function () { window._miniMap.invalidateSize(); }, 300);
        } catch (error) {
            console.error('Error initializing mini map:', error);
        }
    }

    function loadMiniMapBusinesses() {
        if (!window._miniMap || !window._miniMarkerLayer) return;

        var params = getSearchParams();
        var endpoint = '/businesses?status=approved&limit=50';
        if (params.comuna) endpoint += '&state=' + encodeURIComponent(params.comuna);
        if (params.categoria) endpoint += '&categoria=' + encodeURIComponent(params.categoria);
        if (params.city) endpoint += '&city=' + encodeURIComponent(params.city);
        if (params.search) endpoint += '&search=' + encodeURIComponent(params.search);

        api.get(endpoint).then(function (data) {
            var businesses = data.businesses || [];
            window._miniMarkerLayer.clearLayers();
            var validItems = businesses.filter(function (p) { return fixCoord(p.lat) && fixCoord(p.lng); });

            validItems.forEach(function (business) {
                var marker = createMiniMarker(business);
                if (marker) window._miniMarkerLayer.addLayer(marker);
            });

            if (validItems.length > 0) {
                var bounds = L.latLngBounds(validItems.map(function (p) { return [fixCoord(p.lat), fixCoord(p.lng)]; }));
                window._miniMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
            }
        }).catch(function (error) {
            console.error('Error loading mini map businesses:', error);
        });
    }

    // ─── Load Map Properties (Inmuebles) ─────────────────────
    function loadMapProperties() {
        if (!isMapView) return;

        if (mapLoading) mapLoading.style.display = '';

        var filters = getFilterValues();
        var endpoint = '/properties?status=approved&limit=100';

        if (filters.categoria) endpoint += '&property_type=' + encodeURIComponent(filters.categoria);
        if (filters.state) endpoint += '&state=' + encodeURIComponent(filters.state);
        if (filters.city) endpoint += '&city=' + encodeURIComponent(filters.city);

        api.get(endpoint).then(function (data) {
            allBusinesses = data.properties || [];

            if (markerLayer) markerLayer.clearLayers();
            markers = [];

            if (mapResultCount) {
                mapResultCount.textContent = allBusinesses.length + ' propiedades encontradas';
            }

            var validItems = allBusinesses.filter(function (p) { return fixCoord(p.lat) && fixCoord(p.lng); });

            validItems.forEach(function (property) {
                var marker = createPropertyMarker(property);
                if (marker) {
                    markers.push({ marker: marker, business: property });
                    markerLayer.addLayer(marker);
                }
            });

            if (validItems.length > 0) {
                fitAllMarkers();
            }

            renderPropertyList(allBusinesses);

        }).catch(function (error) {
            console.error('Error loading map properties:', error);
            showToast('Error al cargar propiedades en el mapa', 'error');
        }).finally(function () {
            if (mapLoading) mapLoading.style.display = 'none';
        });
    }

    // ─── Create Property Marker ─────────────────────────────────
    function createPropertyMarker(property) {
        fixItemCoords(property);
        if (!property._lat || !property._lng || typeof L === 'undefined') return null;

        var coverImage = property.cover_image || '';
        var title = property.title || 'Propiedad';
        var price = property.price ? '$' + Number(property.price).toLocaleString('es-CL') : '';
        var opLabel = (property.operation_type || '').replace('_', ' ');

        var icon = L.divIcon({
            className: 'custom-map-marker',
            html: '<div class="marker-pin" style="background-color: #006EE3;">'
                + '<span class="marker-price" style="font-size:10px;"><i class="fas fa-home"></i></span>'
                + '</div>'
                + '<div class="marker-shadow"></div>',
            iconSize: [40, 52],
            iconAnchor: [20, 52],
            popupAnchor: [0, -56],
        });

        var marker = L.marker([property._lat, property._lng], { icon: icon });

        var imgTag = coverImage
            ? '<div class="map-popup-image"><img src="' + coverImage + '" alt="' + title + '" onerror="this.parentElement.style.display=\'none\'"></div>'
            : '';

        var address = property.city ? (property.state ? property.city + ', ' + property.state : property.city) : '';

        var popupHTML = '<div class="map-popup">'
            + imgTag
            + '<div class="map-popup-content">'
            + '<h4 class="map-popup-title">' + title + '</h4>'
            + '<div class="map-popup-badges">'
            + '<span class="map-popup-badge">' + opLabel + '</span>'
            + (price ? '<span class="map-popup-badge" style="background:#006EE3;">' + price + '</span>' : '')
            + '</div>'
            + (address ? '<div class="map-popup-location">' + address + '</div>' : '')
            + '<a href="/property-detail.html?id=' + property.id + '" class="map-popup-link">Ver más <i class="fas fa-arrow-right"></i></a>'
            + '</div>'
            + '</div>';

        if (typeof popupHTML !== 'string' || popupHTML.length === 0) {
            popupHTML = '<div class="map-popup"><div class="map-popup-content"><h4>' + title + '</h4><p>Propiedad</p></div></div>';
        }

        marker.bindPopup(popupHTML, {
            maxWidth: 300, minWidth: 260,
            closeButton: true, autoPan: true,
            autoPanPaddingTopLeft: [20, 60],
            autoPanPaddingBottomRight: [20, 20],
        });

        marker.on('click', function () {
            highlightCard(property.id);
        });

        return marker;
    }

    // ─── Render Property List ───────────────────────────────────
    function renderPropertyList(properties) {
        if (!mapBusinessList) return;

        if (properties.length === 0) {
            mapBusinessList.innerHTML = '<div class="map-no-results"><i class="fas fa-search"></i><p>No se encontraron propiedades.</p></div>';
            return;
        }

        mapBusinessList.innerHTML = properties.map(function (p) {
            var coverImage = p.cover_image || '';
            var opLabel = (p.operation_type || '').replace('_', ' ');
            var price = p.price ? '$' + Number(p.price).toLocaleString('es-CL') : '';
            var address = p.city ? (p.state ? p.city + ', ' + p.state : p.city) : '--';

            fixItemCoords(p);
            return '<div class="map-business-card" data-business-id="' + p.id + '" data-lat="' + (p._lat || '') + '" data-lng="' + (p._lng || '') + '">'
                + (coverImage ? '<img src="' + coverImage + '" alt="' + (p.title || 'Propiedad') + '" onerror="this.style.display=\'none\'">' : '')
                + '<div class="card-info">'
                + '<div class="card-title" title="' + (p.title || '') + '">' + (p.title || 'Sin título') + '</div>'
                + '<div class="card-location">' + address + '</div>'
                + '<div class="card-badges">'
                + '<span class="card-badge badge-type">' + opLabel + '</span>'
                + (price ? '<span class="card-badge badge-price">' + price + '</span>' : '')
                + '</div>'
                + '</div>'
                + '</div>';
        }).join('');

        // Click on sidebar card
        mapBusinessList.querySelectorAll('.map-business-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var id = parseInt(card.dataset.businessId);
                var lat = parseFloat(card.dataset.lat);
                var lng = parseFloat(card.dataset.lng);

                highlightCard(id);

                if (!isNaN(lat) && !isNaN(lng) && map) {
                    flyToBusiness(id);
                } else {
                    window.location.href = '/property-detail.html?id=' + id;
                }
            });
        });
    }

    // ─── Toggle Map Type ─────────────────────────────────────────
    function showMapType(type) {
        currentMapType = type;
        var btnNegocios = document.getElementById('mapToggleNegocios');
        var btnPropiedades = document.getElementById('mapTogglePropiedades');
        var btnTodos = document.getElementById('mapToggleTodos');

        if (btnNegocios) {
            btnNegocios.className = type === 'businesses' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
            btnNegocios.style.flex = '1';
        }
        if (btnPropiedades) {
            btnPropiedades.className = type === 'properties' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
            btnPropiedades.style.flex = '1';
        }
        if (btnTodos) {
            btnTodos.className = type === 'both' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
            btnTodos.style.flex = '1';
            if (type === 'both') {
                btnTodos.style.background = 'linear-gradient(135deg,#1a73e8,#006EE3)';
            } else {
                btnTodos.style.background = '';
            }
        }

        if (type === 'properties') {
            loadMapProperties();
        } else if (type === 'businesses') {
            loadMapBusinesses();
        } else {
            loadMapAll();
        }
    }

    // ─── Expose for external use ────────────────────────────────
    window.casasMap = {
        flyToBusiness: flyToBusiness,
        fitAllMarkers: fitAllMarkers,
        filterBusinesses: loadMapBusinesses,
        loadMapBusinesses: loadMapBusinesses,
        loadMapProperties: loadMapProperties,
        loadMapAll: loadMapAll,
        showType: showMapType,
        invalidateSize: function () {
            if (map) map.invalidateSize();
            if (window._miniMap) window._miniMap.invalidateSize();
        },
    };

    // ─── Start ──────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMap);
    } else {
        initMap();
    }

})();
