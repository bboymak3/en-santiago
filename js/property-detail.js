/**
 * HolaX - Property Detail Page Loader
 * Loads property data from API and populates property-detail.html
 *
 * NOTE: PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS, CURRENCY_SYMBOLS,
 * and escapeHtml are defined in app.js (common module). Do NOT redeclare here.
 */

// ─── Unique Label Mappings (not in app.js) ─────────────────────
const PROPERTY_STATUS_LABELS = {
    'pending': 'Pendiente',
    'approved': 'Publicado',
    'rejected': 'Rechazado',
    'sold': 'Vendido',
    'rented': 'Alquilado',
};

// CURRENCY_SYMBOLS is in app.js

const PROPERTY_FEATURES_MAP = {
    'piscina': 'Piscina',
    'jardin': 'Jardín',
    'aire_acondicionado': 'Aire Acondicionado',
    'calefaccion': 'Calefacción',
    'seguridad_24h': 'Seguridad 24h',
    'portero_electronico': 'Portero Electrónico',
    'gimnasio': 'Gimnasio',
    'ascensor': 'Ascensor',
    'terraza': 'Terraza',
    'balcon': 'Balcón',
    'bodega': 'Bodega',
    'cuarto_servicio': 'Cuarto de Servicio',
    'cocina_integral': 'Cocina Integral',
    'closets': 'Closets',
    'pisos_ceramica': 'Pisos de Cerámica',
    'ventanas_aluminio': 'Ventanas de Aluminio',
    'techo_ceramica': 'Techo de Cerámica',
    'amueblado': 'Amueblado',
    'vista_panoramica': 'Vista Panorámica',
    'zona_social': 'Zona Social',
    'pet_friendly': 'Pet Friendly',
    ' laundry': 'Laundry',
    'energia_solar': 'Energía Solar',
    'planta_emergencia': 'Planta de Emergencia',
    'cisterna': 'Cisterna',
    'acometida_agua': 'Acometida de Agua',
    'areas_verdes': 'Áreas Verdes',
    'cancha_deportiva': 'Cancha Deportiva',
    'salon_fiestas': 'Salón de Fiestas',
    'estacionamiento_visitantes': 'Estacionamiento Visitantes',
};

// ─── Helper Functions ──────────────────────────────────────────
function getPropertyTypeLabel(type) {
    if (!type) return '--';
    return PROPERTY_TYPE_LABELS[type.toLowerCase()] || type;
}

function getOperationTypeLabel(operation) {
    if (!operation) return '--';
    return OPERATION_TYPE_LABELS[operation.toLowerCase()] || operation;
}

function getPropertyStatusLabel(status) {
    if (!status) return '';
    return PROPERTY_STATUS_LABELS[status.toLowerCase()] || status;
}

function formatPropertyPrice(price, currency) {
    if (price == null || isNaN(price)) return '--';
    const formatted = new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(price);
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    return `${symbol} ${formatted}`;
}

function getPropertyStatusBadge(status) {
    if (!status || status === 'approved') return '';
    const classes = {
        'pending': 'badge badge-warning',
        'approved': 'badge badge-success',
        'rejected': 'badge badge-danger',
        'sold': 'badge badge-info',
        'rented': 'badge badge-info',
    };
    const cls = classes[status.toLowerCase()] || 'badge';
    return `<span class="${cls}">${getPropertyStatusLabel(status)}</span>`;
}

// escapeHtml is defined in app.js

// ─── Placeholder Image ──────────────────────────────────────────
function getPlaceholderImg(w, h, text) {
    return 'data:image/svg+xml,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w || 800}" height="${h || 600}" fill="%23e0e0e0"><rect width="${w || 800}" height="${h || 600}"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="20" font-family="sans-serif">${text || 'Sin imagen'}</text></svg>`
    );
}

// ─── Property Card HTML Generator (for similar properties) ──────
// createPropertyCard is defined in app.js (used on index/search pages)
// For similar properties on this page, we use a local version inside the IIFE

function createPropertyCardDetail(property) {
    if (!property) return '';

    const coverImage = property.cover_image || property.images?.[0]?.url || '';
    const placeholderImg = getPlaceholderImg(400, 300, 'Sin imagen');
    const imgSrc = coverImage || placeholderImg;
    const priceStr = formatPropertyPrice(property.price, property.currency);
    const typeLabel = getPropertyTypeLabel(property.property_type);
    const opLabel = getOperationTypeLabel(property.operation_type);
    const address = property.city ? (property.address ? `${property.address}, ${property.city}` : property.city) : '--';

    const beds = property.bedrooms ? `<span><i class="fas fa-bed"></i> ${property.bedrooms}</span>` : '';
    const baths = property.bathrooms ? `<span><i class="fas fa-bath"></i> ${property.bathrooms}</span>` : '';
    const area = property.area ? `<span><i class="fas fa-ruler-combined"></i> ${property.area}${property.area_unit || 'm²'}</span>` : '';

    const featuredBadge = property.featured ? '<span class="card-badge badge-featured"><i class="fas fa-star"></i> Destacada</span>' : '';
    const statusBadge = property.status && property.status !== 'approved' ? `<span class="card-badge badge-${property.status}">${getPropertyStatusLabel(property.status)}</span>` : '';

    return `
        <article class="property-card" data-property-id="${property.id}">
            <a href="property-detail.html?id=${property.id}" class="property-card-link">
                <div class="property-card-image">
                    <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(property.title || 'Propiedad')}" loading="lazy" onerror="this.src='${placeholderImg}'">
                    <div class="property-card-badges">
                        <span class="card-badge badge-type">${typeLabel}</span>
                        <span class="card-badge badge-operation">${opLabel}</span>
                        ${featuredBadge}${statusBadge}
                    </div>
                    <button class="btn-favorite property-card-fav" data-property-id="${property.id}" aria-label="Agregar a favoritos" onclick="event.preventDefault(); event.stopPropagation(); PropertyDetail.toggleFavorite(${property.id});">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="btn-share-wa-card" data-property-id="${property.id}" aria-label="Compartir por WhatsApp" onclick="event.preventDefault(); event.stopPropagation(); PropertyDetail.shareWhatsApp(${property.id});">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
                <div class="property-card-body">
                    <div class="property-card-price">${priceStr}</div>
                    <h3 class="property-card-title">${escapeHtml(property.title || 'Sin título')}</h3>
                    <p class="property-card-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(address)}</p>
                    <div class="property-card-features">${beds}${baths}${area}</div>
                </div>
            </a>
        </article>
    `;
}

// ─── WhatsApp Share for Property ──────────────────────────────
function sharePropertyWhatsAppUrl(property) {
    if (!property) return;
    const type = getPropertyTypeLabel(property.property_type);
    const op = getOperationTypeLabel(property.operation_type);
    const price = formatPropertyPrice(property.price, property.currency);
    const url = `https://holax.com/property-detail.html?id=${property.id}`;
    const title = property.title || 'Propiedad';

    let msg = `🏠 *${title}*\n`;
    msg += `📌 ${type} en ${op}\n`;
    msg += `💰 ${price}\n`;
    if (property.bedrooms) msg += `🛏️ ${property.bedrooms} hab.\n`;
    if (property.bathrooms) msg += `🚿 ${property.bathrooms} baños\n`;
    if (property.area) msg += `📐 ${property.area}${property.area_unit || 'm²'}\n`;
    if (property.city) msg += `📍 ${property.city}${property.address ? ', ' + property.address : ''}\n`;
    msg += `\n🔗 ${url}`;
    msg += `\n\n📌 Publicado en HolaX`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// ─── Gallery Navigation ─────────────────────────────────────────
let currentGalleryIndex = 0;
let galleryImages = [];

function initGalleryNav(images) {
    galleryImages = images;
    currentGalleryIndex = 0;

    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');

    if (prevBtn) {
        prevBtn.onclick = () => setGalleryImage(currentGalleryIndex - 1);
    }
    if (nextBtn) {
        nextBtn.onclick = () => setGalleryImage(currentGalleryIndex + 1);
    }
}

function setGalleryImage(index) {
    if (galleryImages.length === 0) return;

    // Wrap around
    if (index < 0) index = galleryImages.length - 1;
    if (index >= galleryImages.length) index = 0;

    currentGalleryIndex = index;

    const mainImage = document.getElementById('mainImage');
    const galleryCurrent = document.getElementById('galleryCurrent');

    if (mainImage) {
        mainImage.src = galleryImages[index].url || getPlaceholderImg();
    }
    if (galleryCurrent) galleryCurrent.textContent = index + 1;

    // Update active thumbnail
    document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });

    // Scroll thumbnail into view
    const activeThumb = document.querySelector('.gallery-thumb.active');
    if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

// ─── Lightbox ──────────────────────────────────────────────────
function initLightbox(images) {
    let lightboxIndex = currentGalleryIndex;

    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxCounter = document.getElementById('lightboxCounter');

    if (!lightbox || images.length === 0) return;

    function updateLightbox() {
        if (lightboxImage) lightboxImage.src = images[lightboxIndex]?.url || getPlaceholderImg();
        if (lightboxCounter) lightboxCounter.textContent = `${lightboxIndex + 1} / ${images.length}`;
    }

    if (lightboxPrev) {
        lightboxPrev.onclick = (e) => {
            e.stopPropagation();
            lightboxIndex = (lightboxIndex - 1 + images.length) % images.length;
            updateLightbox();
        };
    }

    if (lightboxNext) {
        lightboxNext.onclick = (e) => {
            e.stopPropagation();
            lightboxIndex = (lightboxIndex + 1) % images.length;
            updateLightbox();
        };
    }

    if (lightboxClose) {
        lightboxClose.onclick = () => lightbox.classList.add('hidden');
    }

    // Close on backdrop click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) lightbox.classList.add('hidden');
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('hidden')) return;
        if (e.key === 'Escape') lightbox.classList.add('hidden');
        if (e.key === 'ArrowLeft') {
            lightboxIndex = (lightboxIndex - 1 + images.length) % images.length;
            updateLightbox();
        }
        if (e.key === 'ArrowRight') {
            lightboxIndex = (lightboxIndex + 1) % images.length;
            updateLightbox();
        }
    });

    updateLightbox();
}

// ─── Main Module (IIFE) ────────────────────────────────────────
const PropertyDetail = (function () {
    let currentProperty = null;

    // ─── Initialize ────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        const loadingEl = document.getElementById('propertyLoading');
        const errorEl = document.getElementById('propertyError');
        const contentEl = document.getElementById('propertyContent');

        if (!loadingEl || !contentEl) return;

        // Get property ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const propertyId = urlParams.get('id');

        if (!propertyId) {
            showError();
            return;
        }

        try {
            // Fetch property data
            const property = await apiCall(`/properties/${propertyId}`);
            currentProperty = property;

            // Populate page
            populatePropertyDetail(property);

            // Show content, hide loading
            loadingEl.classList.add('hidden');
            contentEl.classList.remove('hidden');

            // Update page title
            document.title = `${property.title || 'Inmueble'} - HolaX`;

            // Load similar properties
            loadSimilarProperties(property);

        } catch (error) {
            console.error('Error loading property:', error);
            if (error.message.includes('no encontrado') || error.message.includes('404') || error.message.includes('not found')) {
                showError();
            } else {
                loadingEl.innerHTML = `
                    <i class="fas fa-exclamation-triangle fa-spin fa-3x" style="color:#f59e0b;"></i>
                    <p>Error al cargar. Intenta nuevamente.</p>
                    <button class="btn btn-primary" onclick="location.reload()" style="margin-top:16px;">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                `;
            }
        }

        function showError() {
            loadingEl.classList.add('hidden');
            if (errorEl) errorEl.classList.remove('hidden');
        }
    });

    // ─── Populate Property Detail ────────────────────────────────
    function populatePropertyDetail(p) {
        const placeholderImg = getPlaceholderImg();

        // ─── Breadcrumb ──────────────────────────────────────────
        const breadcrumbTitle = document.getElementById('breadcrumbTitle');
        if (breadcrumbTitle) {
            breadcrumbTitle.textContent = p.title || 'Inmueble';
        }

        // ─── Gallery ────────────────────────────────────────────
        const images = p.images || [];
        const mainImage = document.getElementById('mainImage');
        const galleryThumbnails = document.getElementById('galleryThumbnails');
        const galleryCurrent = document.getElementById('galleryCurrent');
        const galleryTotal = document.getElementById('galleryTotal');
        const galleryBadges = document.getElementById('galleryBadges');
        const propertyGallery = document.getElementById('propertyGallery');

        if (images.length === 0) {
            if (mainImage) mainImage.src = placeholderImg;
            if (mainImage) mainImage.alt = p.title || 'Sin imagen';
            if (propertyGallery) {
                const prevBtn = document.getElementById('galleryPrev');
                const nextBtn = document.getElementById('galleryNext');
                if (prevBtn) prevBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = 'none';
            }
            if (galleryThumbnails) galleryThumbnails.style.display = 'none';
        } else {
            if (mainImage) {
                mainImage.src = images[0].url || placeholderImg;
                mainImage.alt = p.title || 'Propiedad';
            }
            if (galleryCurrent) galleryCurrent.textContent = '1';
            if (galleryTotal) galleryTotal.textContent = images.length;

            if (galleryThumbnails) {
                galleryThumbnails.innerHTML = images.map((img, i) => `
                    <div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-index="${i}">
                        <img src="${escapeHtml(img.url)}" alt="Imagen ${i + 1}" loading="lazy" onerror="this.src='${placeholderImg}'">
                    </div>
                `).join('');

                // Add click handlers to thumbnails
                galleryThumbnails.querySelectorAll('.gallery-thumb').forEach(thumb => {
                    thumb.addEventListener('click', () => {
                        const idx = parseInt(thumb.dataset.index);
                        setGalleryImage(idx);
                    });
                });
            }

            initGalleryNav(images);
        }

        // ─── Videos ────────────────────────────────────────────
        if (p.video_url) {
            let vids = [];
            try { const parsed = JSON.parse(p.video_url); if (Array.isArray(parsed)) vids = parsed; } catch(e) {}
            if (vids.length === 0 && p.video_url) vids = [p.video_url];
            if (vids.length > 0) {
                const gallerySection = document.querySelector('.property-gallery') || document.getElementById('propertyGallery');
                if (gallerySection) {
                    const videoContainer = document.createElement('div');
                    videoContainer.style.cssText = 'padding:0 16px 16px;';
                    vids.forEach(v => {
                        videoContainer.innerHTML += '<div style="border-radius:12px;overflow:hidden;margin-bottom:10px;">' + getVideoEmbedProperty(v) + '</div>';
                    });
                    gallerySection.after(videoContainer);
                }
            }
        }

        // Gallery badges (type, operation, featured, status)
        if (galleryBadges) {
            let badges = '';
            const typeLabel = getPropertyTypeLabel(p.property_type);
            const opLabel = getOperationTypeLabel(p.operation_type);
            badges += `<span class="gallery-badge badge-type">${escapeHtml(typeLabel)}</span>`;
            badges += `<span class="gallery-badge badge-operation">${escapeHtml(opLabel)}</span>`;
            if (p.featured) {
                badges += `<span class="gallery-badge badge-featured"><i class="fas fa-star"></i> Destacada</span>`;
            }
            galleryBadges.innerHTML = badges;
        }

        // ─── Badges below gallery ────────────────────────────────
        const detailBadges = document.getElementById('propDetailBadges');
        if (detailBadges) {
            let badgesHtml = '';
            if (p.status && p.status !== 'approved') {
                badgesHtml += getPropertyStatusBadge(p.status) + ' ';
            }
            if (p.operation_type) {
                badgesHtml += `<span class="badge badge-operation">${escapeHtml(getOperationTypeLabel(p.operation_type))}</span> `;
            }
            if (p.featured) {
                badgesHtml += `<span class="badge badge-featured"><i class="fas fa-star"></i> Destacada</span>`;
            }
            detailBadges.innerHTML = badgesHtml;
        }

        // ─── Title ───────────────────────────────────────────────
        const titleEl = document.getElementById('propDetailTitle');
        if (titleEl) titleEl.textContent = p.title || 'Sin título';

        // ─── Price ──────────────────────────────────────────────
        const priceEl = document.getElementById('propDetailPrice');
        if (priceEl) {
            if (p.price != null && !isNaN(p.price)) {
                priceEl.textContent = formatPropertyPrice(p.price, p.currency);
                priceEl.style.display = '';
            } else {
                priceEl.style.display = 'none';
            }
        }

        // ─── Address ────────────────────────────────────────────
        const locationEl = document.getElementById('propDetailLocation');
        if (locationEl) {
            let addr = p.address || '';
            if (p.city) addr += (addr ? ', ' : '') + p.city;
            if (p.state) addr += (addr ? ', ' : '') + p.state;
            locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> <span>${escapeHtml(addr || 'Sin dirección')}</span>`;
        }

        // ─── Feature Chips ──────────────────────────────────────
        // Bedrooms
        const bedroomsEl = document.getElementById('statBedrooms');
        const bedroomsWrap = document.getElementById('statBedroomsWrap');
        if (bedroomsWrap) {
            if (p.bedrooms) {
                bedroomsEl.textContent = `${p.bedrooms} hab.`;
                bedroomsWrap.style.display = '';
            } else {
                bedroomsWrap.style.display = 'none';
            }
        }

        // Bathrooms
        const bathroomsEl = document.getElementById('statBathrooms');
        const bathroomsWrap = document.getElementById('statBathroomsWrap');
        if (bathroomsWrap) {
            if (p.bathrooms) {
                bathroomsEl.textContent = `${p.bathrooms} baños`;
                bathroomsWrap.style.display = '';
            } else {
                bathroomsWrap.style.display = 'none';
            }
        }

        // Parking
        const parkingEl = document.getElementById('statParking');
        const parkingWrap = document.getElementById('statParkingWrap');
        if (parkingWrap) {
            if (p.parking) {
                parkingEl.textContent = `${p.parking} estac.`;
                parkingWrap.style.display = '';
            } else {
                parkingWrap.style.display = 'none';
            }
        }

        // Area
        const areaEl = document.getElementById('statArea');
        const areaWrap = document.getElementById('statAreaWrap');
        if (areaWrap) {
            if (p.area) {
                areaEl.textContent = `${p.area} ${p.area_unit || 'm²'}`;
                areaWrap.style.display = '';
            } else {
                areaWrap.style.display = 'none';
            }
        }

        // Year
        const yearEl = document.getElementById('statYear');
        const yearWrap = document.getElementById('statYearWrap');
        if (yearWrap) {
            if (p.year_built) {
                yearEl.textContent = p.year_built;
                yearWrap.style.display = '';
            } else {
                yearWrap.style.display = 'none';
            }
        }

        // Floors
        const floorsEl = document.getElementById('statFloors');
        const floorsWrap = document.getElementById('statFloorsWrap');
        if (floorsWrap) {
            if (p.floors) {
                floorsEl.textContent = `${p.floors} pisos`;
                floorsWrap.style.display = '';
            } else {
                floorsWrap.style.display = 'none';
            }
        }

        // ─── Description ────────────────────────────────────────
        const descEl = document.getElementById('propDescription');
        const descToggle = document.getElementById('descriptionToggle');
        if (descEl) {
            if (p.description) {
                descEl.innerHTML = `<p>${escapeHtml(p.description)}</p>`;
                if (p.description.length > 200) {
                    descEl.classList.add('collapsed');
                    if (descToggle) {
                        descToggle.style.display = '';
                        descToggle.onclick = () => {
                            descEl.classList.toggle('collapsed');
                            descToggle.innerHTML = descEl.classList.contains('collapsed')
                                ? 'Leer más <i class="fas fa-chevron-down"></i>'
                                : 'Leer menos <i class="fas fa-chevron-up"></i>';
                        };
                    }
                } else {
                    descEl.classList.remove('collapsed');
                }
            } else {
                descEl.innerHTML = '<p>Sin descripción disponible.</p>';
                if (descToggle) descToggle.style.display = 'none';
            }
        }

        // ─── Features Section ───────────────────────────────────
        const featuresSection = document.getElementById('featuresSection');
        const featuresList = document.getElementById('featuresList');
        if (featuresSection && featuresList) {
            const features = [];

            // Parse property features - can be array, object, or comma-separated string
            const rawFeatures = p.features || {};
            let featureKeys = [];

            if (Array.isArray(rawFeatures)) {
                featureKeys = rawFeatures.filter(f => f);
            } else if (typeof rawFeatures === 'object') {
                featureKeys = Object.keys(rawFeatures).filter(k => rawFeatures[k]);
            } else if (typeof rawFeatures === 'string') {
                featureKeys = rawFeatures.split(',').map(f => f.trim()).filter(f => f);
            }

            featureKeys.forEach(key => {
                const cleanKey = key.toLowerCase().replace(/\s+/g, '_');
                const label = PROPERTY_FEATURES_MAP[cleanKey] || key;
                const icon = getFeatureIcon(cleanKey);
                features.push(`<div class="feature-item"><i class="fas ${icon}"></i> ${escapeHtml(label)}</div>`);
            });

            if (features.length > 0) {
                featuresList.innerHTML = features.join('');
                featuresSection.classList.remove('hidden');
            }
        }

        // ─── Map Section ────────────────────────────────────────
        const mapSection = document.getElementById('mapSection');
        const propertyMap = document.getElementById('propertyMap');
        const openMapModalBtn = document.getElementById('openMapModalBtn');

        if (mapSection && p.lat && p.lng) {
            mapSection.classList.remove('hidden');

            try {
                const map = L.map('propertyMap').setView([p.lat, p.lng], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap'
                }).addTo(map);

                const marker = L.marker([p.lat, p.lng]).addTo(map);
                const popupContent = `<strong>${escapeHtml(p.title || 'Propiedad')}</strong>${p.address ? '<br>' + escapeHtml(p.address) : ''}`;
                marker.bindPopup(popupContent);

                // Full-screen map modal
                if (openMapModalBtn) {
                    openMapModalBtn.onclick = () => {
                        const modal = document.getElementById('mapModal');
                        if (!modal) return;
                        modal.classList.add('active');
                        document.body.style.overflow = 'hidden';

                        setTimeout(() => {
                            const modalMapEl = document.getElementById('mapModalMap');
                            if (modalMapEl && !modalMapEl._leafletMap) {
                                const modalMap = L.map('mapModalMap').setView([p.lat, p.lng], 15);
                                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                    attribution: '&copy; OpenStreetMap'
                                }).addTo(modalMap);
                                L.marker([p.lat, p.lng]).addTo(modalMap)
                                    .bindPopup(`<strong>${escapeHtml(p.title || 'Propiedad')}</strong><br>${escapeHtml(p.address || '')}`)
                                    .openPopup();
                                modalMapEl._leafletMap = modalMap;
                                setTimeout(() => modalMap.invalidateSize(), 200);
                            }
                        }, 100);
                    };
                }

                // Map modal close
                const mapModalClose = document.getElementById('mapModalClose');
                if (mapModalClose) {
                    mapModalClose.onclick = () => {
                        const modal = document.getElementById('mapModal');
                        if (modal) {
                            modal.classList.remove('active');
                            document.body.style.overflow = '';
                        }
                    };
                }

                // Close modal on backdrop click
                const mapModal = document.getElementById('mapModal');
                if (mapModal) {
                    mapModal.addEventListener('click', (e) => {
                        if (e.target === mapModal) {
                            mapModal.classList.remove('active');
                            document.body.style.overflow = '';
                        }
                    });
                }
            } catch (mapError) {
                console.warn('Error initializing map:', mapError);
            }
        } else if (mapSection) {
            mapSection.classList.add('hidden');
        }

        // ─── Contact Actions ────────────────────────────────────
        const isOwnerPremium = p.owner_plan_type === 'premium';
        const mainWhatsApp = document.getElementById('mainWhatsApp');
        const emailContactBtn = document.getElementById('emailContactBtn');

        if (mainWhatsApp) {
            // Priority: property's own whatsapp > owner's whatsapp > owner's phone
            const waNumber = p.whatsapp || p.owner_whatsapp || p.phone || p.owner_phone || '';
            if (waNumber) {
                const cleanNumber = waNumber.replace(/[^0-9+]/g, '');
                const msg = encodeURIComponent(`Hola, vi tu propiedad "${p.title || ''}" en HolaX y me interesa saber más.`);
                mainWhatsApp.href = `https://wa.me/${cleanNumber}?text=${msg}`;
                mainWhatsApp.style.display = '';
            } else {
                mainWhatsApp.style.display = 'none';
            }
        }

        // Email contact
        if (emailContactBtn) {
            const emailAddr = p.email_contact || p.owner_email || '';
            if (emailAddr) {
                emailContactBtn.href = `mailto:${emailAddr}?subject=Consulta sobre propiedad ${encodeURIComponent(p.title || '')}`;
                emailContactBtn.style.display = '';
            } else {
                emailContactBtn.style.display = 'none';
            }
        }

        // Open chat button
        const openChatBtn = document.getElementById('openChatBtn');
        if (openChatBtn) {
            openChatBtn.onclick = () => {
                if (typeof UnClickChat !== 'undefined' && UnClickChat.openChatWith) {
                    UnClickChat.openChatWith(p.owner_id || p.user_id, `Hola, vi tu propiedad "${p.title}" en HolaX`);
                } else {
                    showToast('Chat no disponible', 'warning');
                }
            };
        }

        // Share WhatsApp button
        const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
        if (shareWhatsAppBtn) {
            shareWhatsAppBtn.onclick = () => {
                sharePropertyWhatsAppUrl(p);
            };
        }

        // ─── Favorite Button ────────────────────────────────────
        const btnFavorite = document.getElementById('btnFavorite');
        if (btnFavorite) {
            btnFavorite.dataset.propertyId = p.id;
            btnFavorite.onclick = () => toggleFavorite(p.id);

            // Check if already favorited
            checkPropertyFavorite(p.id).then(isFav => {
                const icon = btnFavorite.querySelector('i');
                if (icon) icon.className = isFav ? 'fas fa-heart' : 'far fa-heart';
                if (isFav) btnFavorite.classList.add('favorited');
            });
        }

        // ─── Fullscreen Gallery ──────────────────────────────────
        const fullscreenBtn = document.getElementById('galleryFullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.onclick = () => {
                const lightbox = document.getElementById('lightbox');
                if (lightbox) lightbox.classList.remove('hidden');
            };
        }

        // Lightbox init
        initLightbox(images);

        // ─── SEO Meta Description ───────────────────────────────
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            const type = getPropertyTypeLabel(p.property_type);
            const op = getOperationTypeLabel(p.operation_type);
            const price = p.price ? formatPropertyPrice(p.price, p.currency) : '';
            const desc = p.description ? p.description.substring(0, 150) : '';
            metaDesc.content = `${p.title || 'Inmueble'} - ${type} en ${op}${price ? ' por ' + price : ''} en ${p.city || 'Venezuela'}. ${desc} Visita HolaX para más información.`;
        }
    }

    // ─── Property Favorite Functions ──────────────────────────────
    async function checkPropertyFavorite(propertyId) {
        if (!isAuthenticated()) return false;
        try {
            const data = await api.get(`/property-favorites/check?property_id=${propertyId}`);
            return data.is_favorited || false;
        } catch {
            return false;
        }
    }

    async function toggleFavorite(propertyId) {
        if (!isAuthenticated()) {
            showToast('Inicia sesión para guardar favoritos', 'warning');
            setTimeout(() => {
                window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            }, 1500);
            return;
        }

        try {
            const response = await api.post('/property-favorites', { property_id: parseInt(propertyId) });
            showToast('Propiedad guardada en favoritos', 'success');
            updatePropertyFavoriteButtons(propertyId, true);
            return true;
        } catch (error) {
            // Check if already favorited - then remove
            if (error.message.includes('ya está en tus favoritos') || error.message.includes('already')) {
                try {
                    await api.delete(`/property-favorites?property_id=${propertyId}`);
                    showToast('Propiedad removida de favoritos', 'info');
                    updatePropertyFavoriteButtons(propertyId, false);
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

    function updatePropertyFavoriteButtons(propertyId, isFavorited) {
        document.querySelectorAll(`.btn-favorite[data-property-id="${propertyId}"]`).forEach(btn => {
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

    // ─── Similar Properties ──────────────────────────────────────
    async function loadSimilarProperties(currentProperty) {
        const similarSection = document.getElementById('similarSection');
        const similarGrid = document.getElementById('similarGrid');

        if (!similarSection || !similarGrid) return;

        try {
            let endpoint = `/properties?status=approved&limit=4`;
            if (currentProperty.property_type) {
                endpoint += `&property_type=${encodeURIComponent(currentProperty.property_type)}`;
            }

            const data = await api.get(endpoint);
            let properties = (data.properties || data.data || []).filter(p => p.id !== currentProperty.id);

            if (properties.length > 0) {
                similarGrid.innerHTML = properties.slice(0, 4).map(p => createPropertyCardDetail(p)).join('');
                similarSection.classList.remove('hidden');
            }
        } catch (error) {
            console.warn('Error loading similar properties:', error);
        }
    }

    // ─── Feature Icon Mapping ────────────────────────────────────
    function getFeatureIcon(featureKey) {
        const icons = {
            'piscina': 'fa-swimming-pool',
            'jardin': 'fa-leaf',
            'aire_acondicionado': 'fa-snowflake',
            'calefaccion': 'fa-fire',
            'seguridad_24h': 'fa-shield-alt',
            'portero_electronico': 'fa-bell',
            'gimnasio': 'fa-dumbbell',
            'ascensor': 'fa-elevator',
            'terraza': 'fa-sun',
            'balcon': 'fa-door-open',
            'bodega': 'fa-warehouse',
            'cuarto_servicio': 'fa-user',
            'cocina_integral': 'fa-utensils',
            'closets': 'fa-door-closed',
            'pisos_ceramica': 'fa-border-all',
            'ventanas_aluminio': 'fa-window-maximize',
            'techo_ceramica': 'fa-home',
            'amueblado': 'fa-couch',
            'vista_panoramica': 'fa-mountain',
            'zona_social': 'fa-users',
            'pet_friendly': 'fa-paw',
            'laundry': 'fa-tshirt',
            'energia_solar': 'fa-solar-panel',
            'planta_emergencia': 'fa-bolt',
            'cisterna': 'fa-tint',
            'acometida_agua': 'fa-faucet',
            'areas_verdes': 'fa-tree',
            'cancha_deportiva': 'fa-futbol',
            'salon_fiestas': 'fa-glass-cheers',
            'estacionamiento_visitantes': 'fa-parking',
        };
        return icons[featureKey] || 'fa-check';
    }

    // ─── WhatsApp Share by ID (for similar property cards) ─────
    async function shareWhatsApp(propertyId) {
        try {
            const property = await api.get(`/properties/${propertyId}`);
            sharePropertyWhatsAppUrl(property);
        } catch {
            window.open(`https://wa.me/?text=${encodeURIComponent('🏠 Mira esta propiedad en HolaX:\nhttps://holax.com/property-detail.html?id=' + propertyId)}`, '_blank');
        }
    }

    // ─── Public API ─────────────────────────────────────────────
    return {
        toggleFavorite,
        shareWhatsApp,
    };
})();

function getVideoEmbedProperty(url) {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return '<iframe src="https://www.youtube.com/embed/' + ytMatch[1] + '" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;display:block;"></iframe>';
    const ytShortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (ytShortsMatch) return '<iframe src="https://www.youtube.com/embed/' + ytShortsMatch[1] + '" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;display:block;"></iframe>';
    const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    if (ttMatch) return '<iframe src="https://www.tiktok.com/embed/v2/' + ttMatch[1] + '" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:9/16;max-width:320px;margin:0 auto;display:block;"></iframe>';
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
        return '<video src="' + url + '" controls playsinline preload="metadata" style="width:100%;border-radius:12px;background:#000;"></video>';
    }
    return '<iframe src="' + url + '" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;display:block;"></iframe>';
}
