/**
 * Un Click - Properties Search Module
 * Property search/browsing page for the Un Click platform (properties.html)
 * IIFE pattern — does not pollute global scope
 */
(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // DISPLAY-TO-ENUM MAPPINGS
    // ═══════════════════════════════════════════════════════════════

    /** Maps Spanish display labels → API enum values for property_type */
    const TYPE_DISPLAY_TO_ENUM = {
        'casa': 'casa',
        'casas': 'casa',
        'apartamento': 'apartamento',
        'apartamentos': 'apartamento',
        'terreno': 'terreno',
        'terrenos': 'terreno',
        'local comercial': 'local_comercial',
        'locales comerciales': 'local_comercial',
        'oficina': 'oficina',
        'oficinas': 'oficina',
        'hotel': 'hotel',
        'hoteles': 'hotel',
        'finca': 'finca',
        'fincas': 'finca',
        'galpón': 'galpon',
        'galpon': 'galpon',
        'galpones': 'galpon',
        'estacionamiento': 'estacionamiento',
        'estacionamientos': 'estacionamiento',
        'otro': 'otro',
        'otros': 'otro',
    };

    /** Maps Spanish display labels → API enum values for operation_type */
    const OPERATION_DISPLAY_TO_ENUM = {
        'venta': 'venta',
        'alquiler': 'alquiler',
    };

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════

    let currentPage = 1;
    let allFetchedProperties = [];  // keeps the current page's results for sorting
    let miniMap = null;
    let miniMapMarkers = [];

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    /** Read URL params and return a plain object */
    function readURLParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            tipo: params.get('tipo') || params.get('property_type') || '',
            operacion: params.get('operacion') || params.get('operation_type') || '',
            ciudad: params.get('ciudad') || params.get('city') || '',
            precio_min: params.get('precio_min') || params.get('min_price') || '',
            precio_max: params.get('precio_max') || params.get('max_price') || '',
            habitaciones: params.get('habitaciones') || params.get('bedrooms') || '',
            banos: params.get('banos') || params.get('bathrooms') || '',
            moneda: params.get('moneda') || params.get('currency') || '',
            ordenar: params.get('ordenar') || params.get('sort') || '',
            page: parseInt(params.get('page')) || 1,
        };
    }

    /** Convert a display label to its API enum (safe fallback) */
    function toTypeEnum(display) {
        if (!display) return '';
        const key = display.toLowerCase().trim();
        return TYPE_DISPLAY_TO_ENUM[key] || key;
    }

    function toOperationEnum(display) {
        if (!display) return '';
        const key = display.toLowerCase().trim();
        return OPERATION_DISPLAY_TO_ENUM[key] || key;
    }

    /** Get the selected state from localStorage (set by the location selector) */
    function getSelectedState() {
        try {
            return localStorage.getItem('en-santiago_selected_state') || '';
        } catch (e) {
            return '';
        }
    }

    /** Get type display label — uses global from app.js if available, fallback */
    function typeLabel(type) {
        if (typeof getPropertyTypeLabel === 'function') return getPropertyTypeLabel(type);
        const map = {
            'casa': 'Casa', 'apartamento': 'Apartamento', 'terreno': 'Terreno',
            'local_comercial': 'Local Comercial', 'oficina': 'Oficina', 'hotel': 'Hotel',
            'finca': 'Finca', 'galpon': 'Galpón', 'estacionamiento': 'Estacionamiento',
            'otro': 'Otro',
        };
        return map[type?.toLowerCase()] || type || '--';
    }

    /** Get operation display label */
    function operationLabel(op) {
        if (typeof getOperationTypeLabel === 'function') return getOperationTypeLabel(op);
        const map = { 'venta': 'Venta', 'alquiler': 'Alquiler', 'venta_alquiler': 'Venta y Alquiler' };
        return map[op?.toLowerCase()] || op || '--';
    }

    /** Format price — uses global from app.js if available, fallback */
    function priceDisplay(price, currency) {
        if (typeof formatPrice === 'function') return formatPrice(price, currency);
        if (!price && price !== 0) return 'Precio no disponible';
        const symbols = { 'USD': '$', 'EUR': '€', 'Bs': 'Bs ' };
        const sym = symbols[currency] || '';
        const num = Number(price).toLocaleString('es-CL');
        return `${sym}${num}`;
    }

    /** SVG placeholder for missing images */
    const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23e0e0e0"><rect width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="16" font-family="sans-serif">Sin imagen</text></svg>'
    );

    // ═══════════════════════════════════════════════════════════════
    // PROPERTY CARD RENDERER
    // ═══════════════════════════════════════════════════════════════

    function createPropertyCard(property) {
        if (!property) return '';

        const coverImage = property.cover_image || (Array.isArray(property.images) && property.images[0]?.url) || '';
        const imgSrc = coverImage || PLACEHOLDER_IMG;
        const priceStr = priceDisplay(property.price, property.currency);
        const tLabel = typeLabel(property.property_type);
        const oLabel = operationLabel(property.operation_type);
        const address = property.city
            ? (property.address ? `${property.address}, ${property.city}` : property.city)
            : '--';

        const beds = property.bedrooms ? `<span><i class="fas fa-bed"></i> ${property.bedrooms}</span>` : '';
        const baths = property.bathrooms ? `<span><i class="fas fa-bath"></i> ${property.bathrooms}</span>` : '';
        const area = property.area ? `<span><i class="fas fa-ruler-combined"></i> ${property.area}${property.area_unit || 'm²'}</span>` : '';

        const featuredBadge = property.featured
            ? '<span class="card-badge badge-featured"><i class="fas fa-star"></i> Destacada</span>' : '';

        return `
            <article class="property-card" data-property-id="${property.id}">
                <a href="property-detail.html?id=${property.id}" class="property-card-link">
                    <div class="property-card-image">
                        <img src="${imgSrc}" alt="${property.title || 'Propiedad'}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
                        <div class="property-card-badges">
                            <span class="card-badge badge-type">${tLabel}</span>
                            <span class="card-badge badge-operation">${oLabel}</span>
                            ${featuredBadge}
                        </div>
                    </div>
                    <div class="property-card-body">
                        <div class="property-card-price">${priceStr}</div>
                        <h3 class="property-card-title">${property.title || 'Sin título'}</h3>
                        <p class="property-card-location"><i class="fas fa-map-marker-alt"></i> ${address}</p>
                        <div class="property-card-features">${beds}${baths}${area}</div>
                    </div>
                </a>
            </article>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // SEARCH EXECUTION
    // ═══════════════════════════════════════════════════════════════

    async function executeSearch(page) {
        page = page || 1;
        currentPage = page;

        const searchLoading = document.getElementById('searchLoading');
        const noResults = document.getElementById('noResults');
        const searchGrid = document.getElementById('searchResultsGrid');
        const resultsCount = document.getElementById('resultsCount');
        const activeFiltersEl = document.getElementById('activeFilters');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        const paginationEl = document.getElementById('pagination');

        if (!searchGrid) return;

        // Show loading, hide previous
        if (searchLoading) searchLoading.classList.remove('hidden');
        if (noResults) noResults.classList.add('hidden');
        searchGrid.innerHTML = '';
        if (paginationEl) paginationEl.classList.add('hidden');

        // Gather filter values
        const tipoDisplay = document.getElementById('sTipo')?.value || '';
        const operacionDisplay = document.getElementById('sOperacion')?.value || '';
        const ciudad = document.getElementById('sCiudad')?.value?.trim() || '';
        const precioMin = document.getElementById('sPrecioMin')?.value || '';
        const precioMax = document.getElementById('sPrecioMax')?.value || '';
        const habitaciones = document.getElementById('sHabitaciones')?.value || '';
        const banos = document.getElementById('sBanos')?.value || '';
        const moneda = document.getElementById('sMoneda')?.value || '';
        const sort = document.getElementById('sSort')?.value
            || document.getElementById('sOrdenar')?.value
            || '';

        // Convert display values to API enums
        const tipo = toTypeEnum(tipoDisplay);
        const operacion = toOperationEnum(operacionDisplay);

        // Respect selected state from localStorage
        const selectedState = getSelectedState();

        // Build API endpoint
        let endpoint = `/properties?status=approved&page=${page}&limit=12`;

        if (tipo) endpoint += `&property_type=${encodeURIComponent(tipo)}`;
        if (operacion) endpoint += `&operation_type=${encodeURIComponent(operacion)}`;
        if (ciudad) endpoint += `&city=${encodeURIComponent(ciudad)}`;
        if (selectedState) endpoint += `&state=${encodeURIComponent(selectedState)}`;
        if (precioMin) endpoint += `&min_price=${precioMin}`;
        if (precioMax) endpoint += `&max_price=${precioMax}`;
        if (habitaciones) endpoint += `&bedrooms=${habitaciones}`;
        if (banos) endpoint += `&bathrooms=${banos}`;
        if (moneda) endpoint += `&currency=${encodeURIComponent(moneda)}`;

        try {
            const data = await api.get(endpoint);
            let properties = data.properties || [];
            const paginationData = data.pagination || {};

            if (searchLoading) searchLoading.classList.add('hidden');

            // Client-side sorting
            properties = sortProperties(properties, sort);

            // Store for map usage
            allFetchedProperties = properties;

            // Results count
            if (resultsCount) {
                resultsCount.textContent = `${paginationData.total || properties.length} resultados encontrados`;
            }

            // Active filter tags
            renderActiveFilters(activeFiltersEl, clearFiltersBtn, {
                tipoDisplay, operacionDisplay, ciudad, precioMin, precioMax, habitaciones, banos, moneda, selectedState,
            });

            // No results
            if (properties.length === 0) {
                if (noResults) noResults.classList.remove('hidden');
                return;
            }

            // Render cards
            searchGrid.innerHTML = properties.map(p => createPropertyCard(p)).join('');

            // Pagination
            renderPagination(paginationEl, paginationData, executeSearch);

            // Update URL without reload
            updateSearchURL(tipoDisplay, operacionDisplay, ciudad, precioMin, precioMax, habitaciones, banos, moneda, page);

            // Update mini map if visible
            updateMiniMap(properties);

        } catch (error) {
            if (searchLoading) searchLoading.classList.add('hidden');
            searchGrid.innerHTML = '<div class="no-results"><i class="fas fa-exclamation-circle fa-3x"></i><h2>Error de búsqueda</h2><p>No se pudieron cargar los resultados. Intenta nuevamente.</p></div>';
            console.error('Search error:', error);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT-SIDE SORTING
    // ═══════════════════════════════════════════════════════════════

    function sortProperties(properties, sort) {
        if (!sort || sort === 'relevancia') return properties;

        const sorted = [...properties];

        switch (sort) {
            case 'precio_asc':
                sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
                break;
            case 'precio_desc':
                sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
                break;
            case 'reciente':
                sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                break;
            case 'visto':
                sorted.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
                break;
        }

        return sorted;
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTICL FILTER TAGS
    // ═══════════════════════════════════════════════════════════════

    function renderActiveFilters(container, clearBtn, filters) {
        if (!container) return;

        const { tipoDisplay, operacionDisplay, ciudad, precioMin, precioMax, habitaciones, banos, moneda, selectedState } = filters;
        let tags = '';

        if (tipoDisplay) {
            tags += `<span class="active-filter-tag">${tipoDisplay} <button data-filter="sTipo">&times;</button></span>`;
        }
        if (operacionDisplay) {
            tags += `<span class="active-filter-tag">${operacionDisplay} <button data-filter="sOperacion">&times;</button></span>`;
        }
        if (selectedState) {
            tags += `<span class="active-filter-tag"><i class="fas fa-map-marker-alt"></i> ${selectedState} <button data-filter="state">&times;</button></span>`;
        }
        if (ciudad) {
            tags += `<span class="active-filter-tag"><i class="fas fa-city"></i> ${ciudad} <button data-filter="sCiudad">&times;</button></span>`;
        }
        if (precioMin || precioMax) {
            tags += `<span class="active-filter-tag">${precioMin || '0'} - ${precioMax || '∞'} <button data-filter="price">&times;</button></span>`;
        }
        if (habitaciones) {
            tags += `<span class="active-filter-tag">${habitaciones}+ hab. <button data-filter="sHabitaciones">&times;</button></span>`;
        }
        if (banos) {
            tags += `<span class="active-filter-tag">${banos}+ baños <button data-filter="sBanos">&times;</button></span>`;
        }
        if (moneda) {
            tags += `<span class="active-filter-tag">${moneda} <button data-filter="sMoneda">&times;</button></span>`;
        }

        container.innerHTML = tags;

        if (clearBtn) {
            clearBtn.classList.toggle('hidden', !tags);
        }

        // Attach click handlers for individual removal
        container.querySelectorAll('.active-filter-tag button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const filterKey = btn.dataset.filter;
                removeFilterAndSearch(filterKey);
            });
        });
    }

    function removeFilterAndSearch(filterKey) {
        switch (filterKey) {
            case 'sTipo':
                document.getElementById('sTipo').value = '';
                break;
            case 'sOperacion':
                document.getElementById('sOperacion').value = '';
                break;
            case 'sCiudad':
                document.getElementById('sCiudad').value = '';
                break;
            case 'price':
                document.getElementById('sPrecioMin').value = '';
                document.getElementById('sPrecioMax').value = '';
                break;
            case 'sHabitaciones':
                document.getElementById('sHabitaciones').value = '';
                break;
            case 'sBanos':
                document.getElementById('sBanos').value = '';
                break;
            case 'sMoneda':
                document.getElementById('sMoneda').value = '';
                break;
            case 'state':
                // Remove selected state from localStorage
                try { localStorage.removeItem('en-santiago_selected_state'); } catch (e) { /* ignore */ }
                break;
        }
        executeSearch(1);
    }

    // ═══════════════════════════════════════════════════════════════
    // URL UPDATE
    // ═══════════════════════════════════════════════════════════════

    function updateSearchURL(tipo, operacion, ciudad, precioMin, precioMax, habitaciones, banos, moneda, page) {
        const url = new URL(window.location);

        // Clear known params
        ['tipo', 'operacion', 'ciudad', 'precio_min', 'precio_max', 'habitaciones', 'banos', 'moneda', 'page'].forEach(k => url.searchParams.delete(k));

        if (tipo) url.searchParams.set('tipo', tipo);
        if (operacion) url.searchParams.set('operacion', operacion);
        if (ciudad) url.searchParams.set('ciudad', ciudad);
        if (precioMin) url.searchParams.set('precio_min', precioMin);
        if (precioMax) url.searchParams.set('precio_max', precioMax);
        if (habitaciones) url.searchParams.set('habitaciones', habitaciones);
        if (banos) url.searchParams.set('banos', banos);
        if (moneda) url.searchParams.set('moneda', moneda);
        if (page && page > 1) url.searchParams.set('page', page);

        window.history.replaceState({}, '', url.toString());
    }

    // ═══════════════════════════════════════════════════════════════
    // PAGINATION
    // ═══════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════
    // MINI MAP (Leaflet)
    // ═══════════════════════════════════════════════════════════════

    function initMiniMap() {
        const mapContainer = document.getElementById('searchMiniMap');
        if (!mapContainer || typeof L === 'undefined') return;

        try {
            miniMap = L.map('searchMiniMap', {
                center: [-33.45233, -66.5897],  // Santiago de Chile center
                zoom: 6,
                zoomControl: true,
                scrollWheelZoom: true,
                tap: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: false,
                maxZoom: 19,
            }).addTo(miniMap);

            // Remove attribution
            try { miniMap.attributionControl.remove(); } catch (e) { /* ignore */ }

            miniMap._miniMapReady = true;

            // Fix rendering after toggle
            setTimeout(() => miniMap.invalidateSize(), 300);
        } catch (error) {
            console.error('Error initializing mini map:', error);
        }
    }

    /** Color by operation type for markers */
    function getMarkerColor(operationType) {
        switch ((operationType || '').toLowerCase()) {
            case 'venta': return '#2563eb';     // blue
            case 'alquiler': return '#16a34a';   // green
            case 'venta_alquiler': return '#ea580c'; // orange
            default: return '#6b7280';           // gray
        }
    }

    function updateMiniMap(properties) {
        if (!miniMap || !miniMap._miniMapReady) return;

        // Clear existing markers
        miniMapMarkers.forEach(m => miniMap.removeLayer(m));
        miniMapMarkers = [];

        const validProperties = properties.filter(p => p.lat && p.lng);

        if (validProperties.length === 0) return;

        // Fit bounds to all markers
        const bounds = L.latLngBounds(validProperties.map(p => [p.lat, p.lng]));

        validProperties.forEach(property => {
            const color = getMarkerColor(property.operation_type);
            const priceText = priceDisplay(property.price, property.currency);

            const icon = L.divIcon({
                className: 'custom-map-marker',
                html: '<div class="marker-pin" style="background-color: ' + color + ';">'
                    + '<span class="marker-price">' + priceText + '</span>'
                    + '</div>'
                    + '<div class="marker-shadow"></div>',
                iconSize: [40, 52],
                iconAnchor: [20, 52],
                popupAnchor: [0, -56],
            });

            const marker = L.marker([property.lat, property.lng], { icon: icon });

            // Build popup
            const imgSrc = property.cover_image || (Array.isArray(property.images) && property.images[0]?.url) || '';
            const imgTag = imgSrc
                ? '<div class="map-popup-image"><img src="' + imgSrc + '" alt="' + (property.title || '') + '" onerror="this.parentElement.style.display=\'none\'"></div>'
                : '';

            const address = property.city ? (property.state ? property.city + ', ' + property.state : property.city) : '';

            const popupHTML = '<div class="map-popup">'
                + imgTag
                + '<div class="map-popup-content">'
                + '<h4 class="map-popup-title">' + (property.title || 'Sin título') + '</h4>'
                + '<div class="map-popup-badges">'
                + '<span class="map-popup-badge">' + typeLabel(property.property_type) + '</span>'
                + '<span class="map-popup-badge">' + operationLabel(property.operation_type) + '</span>'
                + '</div>'
                + (address ? '<div class="map-popup-location">' + address + '</div>' : '')
                + '<div class="map-popup-price">' + priceText + '</div>'
                + '<a href="property-detail.html?id=' + property.id + '" class="map-popup-link">Ver más <i class="fas fa-arrow-right"></i></a>'
                + '</div></div>';

            marker.bindPopup(popupHTML, { maxWidth: 260, minWidth: 200 });
            marker.addTo(miniMap);
            miniMapMarkers.push(marker);
        });

        // Fit map to markers with padding
        miniMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });

        // Invalidate size
        setTimeout(() => miniMap.invalidateSize(), 200);
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    document.addEventListener('DOMContentLoaded', () => {
        const searchGrid = document.getElementById('searchResultsGrid');
        if (!searchGrid) return; // Not on properties page

        // ── Populate filter fields from URL params ────────────────
        const params = readURLParams();
        if (params.tipo && document.getElementById('sTipo')) {
            // Find the option matching the param value
            const sel = document.getElementById('sTipo');
            for (let i = 0; i < sel.options.length; i++) {
                if (sel.options[i].value.toLowerCase() === params.tipo.toLowerCase()
                    || toTypeEnum(sel.options[i].value) === params.tipo.toLowerCase()) {
                    sel.selectedIndex = i;
                    break;
                }
            }
        }
        if (params.operacion && document.getElementById('sOperacion')) {
            const sel = document.getElementById('sOperacion');
            for (let i = 0; i < sel.options.length; i++) {
                if (sel.options[i].value.toLowerCase() === params.operacion.toLowerCase()) {
                    sel.selectedIndex = i;
                    break;
                }
            }
        }
        if (params.ciudad && document.getElementById('sCiudad')) document.getElementById('sCiudad').value = params.ciudad;
        if (params.precio_min && document.getElementById('sPrecioMin')) document.getElementById('sPrecioMin').value = params.precio_min;
        if (params.precio_max && document.getElementById('sPrecioMax')) document.getElementById('sPrecioMax').value = params.precio_max;
        if (params.habitaciones && document.getElementById('sHabitaciones')) document.getElementById('sHabitaciones').value = params.habitaciones;
        if (params.banos && document.getElementById('sBanos')) document.getElementById('sBanos').value = params.banos;
        if (params.moneda && document.getElementById('sMoneda')) document.getElementById('sMoneda').value = params.moneda;

        // ── Search button ─────────────────────────────────────────
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                executeSearch(1);
            });
        }

        // Allow Enter key in filter fields to trigger search
        document.querySelectorAll('#searchFiltersBar .form-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    executeSearch(1);
                }
            });
        });

        // ── Sort change ───────────────────────────────────────────
        const sSort = document.getElementById('sSort');
        if (sSort) {
            sSort.addEventListener('change', () => executeSearch(currentPage));
        }
        const sOrdenar = document.getElementById('sOrdenar');
        if (sOrdenar) {
            sOrdenar.addEventListener('change', () => executeSearch(currentPage));
        }

        // ── Toggle extended filters ───────────────────────────────
        const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
        const extendedFilters = document.getElementById('extendedFilters');
        if (toggleFiltersBtn && extendedFilters) {
            toggleFiltersBtn.addEventListener('click', () => {
                extendedFilters.classList.toggle('hidden');
                toggleFiltersBtn.classList.toggle('active');
            });
        }

        // ── View toggle (grid / list) ─────────────────────────────
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

        // ── Clear filters ─────────────────────────────────────────
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                window.location.href = '/properties.html';
            });
        }

        // ── Map toggle ────────────────────────────────────────────
        const mapToggleBtn = document.getElementById('mapToggleBtn');
        const searchMapContainer = document.getElementById('searchMapContainer');
        const closeMapBtn = document.getElementById('closeMapBtn');

        if (mapToggleBtn && searchMapContainer) {
            mapToggleBtn.addEventListener('click', () => {
                const isHidden = searchMapContainer.classList.contains('hidden');
                searchMapContainer.classList.toggle('hidden');
                mapToggleBtn.classList.toggle('active');

                if (isHidden) {
                    // Opening map
                    if (!miniMap) {
                        initMiniMap();
                    } else {
                        miniMap.invalidateSize();
                    }
                    // Refresh markers with current data
                    updateMiniMap(allFetchedProperties);
                }
            });
        }

        if (closeMapBtn && searchMapContainer) {
            closeMapBtn.addEventListener('click', () => {
                searchMapContainer.classList.add('hidden');
                const mapToggleBtnRef = document.getElementById('mapToggleBtn');
                if (mapToggleBtnRef) mapToggleBtnRef.classList.remove('active');
            });
        }

        // ── Execute initial search ────────────────────────────────
        executeSearch(params.page);
    });
})();