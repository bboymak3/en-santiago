/**
 * Un Click - Business Form Module
 * Loaded on new-business.html
 */

(function () {
    'use strict';

    // ─── Configuration ──────────────────────────────────────────
    const CLNEZUELA_CENTER = { lat: -33.45233, lng: -66.5897 };
    const MAX_PHOTOS = 10;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    // ─── State ──────────────────────────────────────────────────
    let editingBusinessId = null;
    let uploadedImages = []; // Array of { url, file, preview }
    let selectedLogoFile = null; // Logo file for upload
    let uploadedLogoUrl = null; // Logo URL after upload
    let selectedBannerFile = null; // Banner file for upload
    let uploadedBannerUrl = null; // Banner URL after upload
    let isSubmitting = false;

    // ─── DOM Elements ───────────────────────────────────────────
    const formTitle = document.getElementById('formTitle');
    const businessForm = document.getElementById('businessForm');
    const submitBtn = document.getElementById('submitBusinessBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    const uploadArea = document.getElementById('uploadArea');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const photoInput = document.getElementById('photoInput');
    const photosPreview = document.getElementById('photosPreview');

    // ─── Logo Functions ───────────────────────────────────────
    window.handleLogoSelect = function(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast('El logo no puede exceder 2MB', 'error');
            input.value = '';
            return;
        }
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
            showToast('Formato no soportado. Usa JPG, PNG o WebP', 'error');
            input.value = '';
            return;
        }
        selectedLogoFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('logoPreviewImg');
            const icon = document.getElementById('logoPlaceholderIcon');
            const btn = document.getElementById('removeLogoBtn');
            if (img) { img.src = e.target.result; img.style.display = 'block'; }
            if (icon) icon.style.display = 'none';
            if (btn) btn.style.display = 'inline-flex';
        };
        reader.readAsDataURL(file);
    };

    window.removeLogo = function() {
        selectedLogoFile = null;
        uploadedLogoUrl = null;
        const img = document.getElementById('logoPreviewImg');
        const icon = document.getElementById('logoPlaceholderIcon');
        const btn = document.getElementById('removeLogoBtn');
        const input = document.getElementById('logoInput');
        if (img) { img.src = ''; img.style.display = 'none'; }
        if (icon) icon.style.display = '';
        if (btn) btn.style.display = 'none';
        if (input) input.value = '';
    };

    // ─── Banner Functions ──────────────────────────────────
    window.handleBannerSelect = function(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('El banner no puede exceder 5MB', 'error');
            input.value = '';
            return;
        }
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
            showToast('Formato no soportado. Usa JPG, PNG o WebP', 'error');
            input.value = '';
            return;
        }
        selectedBannerFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const container = document.getElementById('bannerPreviewContainer');
            const placeholder = document.getElementById('bannerPlaceholderText');
            const btn = document.getElementById('removeBannerBtn');
            if (container) {
                container.innerHTML = `
                    <div style="position:relative;width:100%;height:100%;overflow:hidden;">
                        <img id="newBizBannerEditImg" src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s ease;transform:rotate(0deg);">
                        <div style="position:absolute;bottom:6px;right:6px;display:flex;gap:5px;">
                            <button type="button" class="nb-banner-rotate-btn" data-dir="-90" style="width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;" title="Rotar -90°">
                                <i class="fas fa-rotate-left"></i>
                            </button>
                            <button type="button" class="nb-banner-rotate-btn" data-dir="90" style="width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;" title="Rotar +90°">
                                <i class="fas fa-rotate-right"></i>
                            </button>
                        </div>
                    </div>
                `;
                const editImg = document.getElementById('newBizBannerEditImg');
                editImg.dataset.rotation = '0';
                container.querySelectorAll('.nb-banner-rotate-btn').forEach(rb => {
                    rb.addEventListener('click', function() {
                        const dir = parseInt(this.dataset.dir);
                        let rot = parseInt(editImg.dataset.rotation) || 0;
                        rot += dir;
                        editImg.dataset.rotation = rot;
                        editImg.style.transform = 'rotate(' + rot + 'deg)';
                    });
                });
            }
            if (placeholder) placeholder.style.display = 'none';
            if (btn) btn.style.display = 'inline-flex';
        };
        reader.readAsDataURL(file);
    };

    window.removeBanner = function() {
        selectedBannerFile = null;
        uploadedBannerUrl = null;
        const container = document.getElementById('bannerPreviewContainer');
        const placeholder = document.getElementById('bannerPlaceholderText');
        const btn = document.getElementById('removeBannerBtn');
        const input = document.getElementById('bannerInput');
        if (container) {
            container.innerHTML = '<span id="bannerPlaceholderText" style="color:#94a3b8;font-size:0.9rem;"><i class="fas fa-panorama" style="font-size:1.5rem;display:block;margin-bottom:6px;"></i>Sin imagen de portada</span><img id="bannerPreviewImg" src="" alt="Banner" style="width:100%;height:100%;object-fit:cover;display:none;">';
        }
        if (placeholder) placeholder.style.display = '';
        if (btn) btn.style.display = 'none';
        if (input) input.value = '';
    };

    // ─── Location Picker Map ────────────────────────────────────
    let locationMap = null;
    let locationMarker = null;
    let geocoder = null;
    let selectedLat = CLNEZUELA_CENTER.lat;
    let selectedLng = CLNEZUELA_CENTER.lng;

    function initLocationPicker() {
        const mapEl = document.getElementById('locationMap');
        if (!mapEl || typeof L === 'undefined') return;

        try {
            // Initialize map centered on Santiago de Chile
            locationMap = L.map('locationMap', {
                center: [selectedLat, selectedLng],
                zoom: 6,
                zoomControl: true,
                scrollWheelZoom: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(locationMap);

            // Add a draggable marker
            locationMarker = L.marker([selectedLat, selectedLng], {
                draggable: true,
            }).addTo(locationMap);

            // Update coordinates when marker is dragged
            locationMarker.on('dragend', function (e) {
                const pos = e.target.getLatLng();
                selectedLat = pos.lat;
                selectedLng = pos.lng;
                updateCoordinateFields();
            });

            // Click on map to place/move marker
            locationMap.on('click', function (e) {
                selectedLat = e.latlng.lat;
                selectedLng = e.latlng.lng;
                locationMarker.setLatLng(e.latlng);
                updateCoordinateFields();
            });

            // Initialize geocoder for address search
            if (typeof L.Control.Geocoder !== 'undefined') {
                geocoder = L.Control.Geocoder.nominatim({
                    geocodingQueryParams: { countrycodes: 've' },
                });
            }

            // Search button
            const searchBtn = document.getElementById('locationSearchBtn');
            const searchInput = document.getElementById('locationSearchInput');

            if (searchBtn && searchInput) {
                searchBtn.addEventListener('click', () => searchLocation(searchInput.value));
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        searchLocation(searchInput.value);
                    }
                });
            }

            // Sync manual input fields with map
            const latInput = document.getElementById('propLat');
            const lngInput = document.getElementById('propLng');

            if (latInput) {
                latInput.addEventListener('change', () => {
                    const val = parseFloat(latInput.value);
                    if (!isNaN(val) && val >= -90 && val <= 90) {
                        selectedLat = val;
                        locationMarker.setLatLng([selectedLat, selectedLng]);
                        updateCoordinateFields();
                    }
                });
            }
            if (lngInput) {
                lngInput.addEventListener('change', () => {
                    const val = parseFloat(lngInput.value);
                    if (!isNaN(val) && val >= -180 && val <= 180) {
                        selectedLng = val;
                        locationMarker.setLatLng([selectedLat, selectedLng]);
                        updateCoordinateFields();
                    }
                });
            }

            // Fix map size after container is visible
            setTimeout(() => locationMap.invalidateSize(), 500);

        } catch (error) {
            console.error('Error initializing location picker:', error);
        }
    }

    function updateCoordinateFields() {
        const latInput = document.getElementById('propLat');
        const lngInput = document.getElementById('propLng');
        const latDisplay = document.getElementById('coordLatDisplay');
        const lngDisplay = document.getElementById('coordLngDisplay');

        if (latInput) latInput.value = selectedLat.toFixed(6);
        if (lngInput) lngInput.value = selectedLng.toFixed(6);
        if (latDisplay) latDisplay.textContent = selectedLat.toFixed(6);
        if (lngDisplay) lngDisplay.textContent = selectedLng.toFixed(6);
    }

    async function searchLocation(query) {
        if (!query || !query.trim() || !geocoder) return;

        try {
            const results = await geocoder.geocode(query);
            if (results && results.length > 0) {
                const loc = results[0].center;
                selectedLat = loc.lat;
                selectedLng = loc.lng;
                locationMarker.setLatLng([selectedLat, selectedLng]);
                locationMap.flyTo([selectedLat, selectedLng], 16, { duration: 1 });
                updateCoordinateFields();

                // Update address field if empty
                const dirInput = document.getElementById('propDireccion');
                if (dirInput && !dirInput.value.trim()) {
                    dirInput.value = results[0].name || query;
                }

                // Update city if empty
                const cityInput = document.getElementById('propCiudad');
                if (cityInput && !cityInput.value.trim() && results[0].properties) {
                    const city = results[0].properties.city || results[0].properties.town || '';
                    if (city) cityInput.value = city;
                }
            } else {
                showToast('No se encontró la ubicación. Intenta con otra búsqueda.', 'warning');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            showToast('Error al buscar la ubicación.', 'error');
        }
    }

    // ─── Character Counters ────────────────────────────────────
    function setupCharCounters() {
        const titleInput = document.getElementById('propTitle');
        const descInput = document.getElementById('propDescription');
        const titleCount = document.getElementById('titleCharCount');
        const descCount = document.getElementById('descCharCount');

        if (titleInput && titleCount) {
            titleInput.addEventListener('input', () => {
                const len = titleInput.value.length;
                titleCount.textContent = len + '/150';
                titleCount.style.color = len > 140 ? '#ef4444' : len > 100 ? '#f59e0b' : '#9ca3af';
            });
        }

        if (descInput && descCount) {
            descInput.addEventListener('input', () => {
                const len = descInput.value.length;
                descCount.textContent = len + '/2000';
                descCount.style.color = len > 1800 ? '#ef4444' : len > 1500 ? '#f59e0b' : '#9ca3af';
            });
        }
    }

    // ─── Step Progress ──────────────────────────────────────────
    function setupStepProgress() {
        const sections = document.querySelectorAll('.pf-section');
        const steps = document.querySelectorAll('.pf-step');
        const stepLines = document.querySelectorAll('.pf-step-line');

        if (!sections.length || !steps.length) return;

        // IntersectionObserver to highlight active step
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionNum = parseInt(entry.target.dataset.section);
                    updateStepIndicator(sectionNum);
                }
            });
        }, { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' });

        sections.forEach(section => observer.observe(section));

        // Focus tracking on inputs within sections
        sections.forEach(section => {
            const inputs = section.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    sections.forEach(s => s.classList.remove('in-focus'));
                    section.classList.add('in-focus');
                    const sectionNum = parseInt(section.dataset.section);
                    updateStepIndicator(sectionNum);
                });
            });
        });
    }

    function updateStepIndicator(activeStep) {
        const steps = document.querySelectorAll('.pf-step');
        const stepLines = document.querySelectorAll('.pf-step-line');

        steps.forEach((step, i) => {
            const stepNum = i + 1;
            step.classList.remove('active', 'completed');
            if (stepNum < activeStep) {
                step.classList.add('completed');
            } else if (stepNum === activeStep) {
                step.classList.add('active');
            }
        });

        stepLines.forEach((line, i) => {
            const lineStep = i + 1;
            line.classList.toggle('active', lineStep < activeStep);
        });
    }

    // ─── Initialization ─────────────────────────────────────────
    function initForm() {
        // Check authentication
        if (!requireAuth()) return;

        // Check for edit mode via URL param
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('id');
        if (editId) {
            editingBusinessId = parseInt(editId);
            loadBusinessForEdit(editingBusinessId);
        }

        // Set up event listeners
        setupPhotoUpload();
        setupFormSubmit();
        setupCharCounters();
        setupStepProgress();

        // Initialize location picker map
        initLocationPicker();
    }

    // ─── Load Business for Editing ──────────────────────────────
    async function loadBusinessForEdit(businessId) {
        try {
            const business = await api.get(`/businesses/${businessId}`);

            if (formTitle) {
                formTitle.textContent = 'Editar Negocio';
            }
            if (submitBtnText) {
                submitBtnText.textContent = 'Guardar Cambios';
            }

            updateFormFromBusiness(business);
        } catch (error) {
            showToast('Error al cargar el negocio para editar', 'error');
            console.error('Error loading business:', error);
        }
    }

    // ─── Populate Form from Business Data ───────────────────────
    function updateFormFromBusiness(business) {
        if (!business) return;

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };

        setValue('propTitle', business.title);
        setValue('propDescription', business.description);
        setValue('propCategoria', business.category_slug || business.category_id);
        setValue('propTipoNegocio', business.tipo_negocio_slug || business.business_type || 'negocio');
        setValue('propPhone', business.phone);
        setValue('propWhatsapp', business.whatsapp);
        setValue('propEmail', business.email_contact);
        setValue('propWebsite', business.website);
        setValue('propInstagram', business.instagram);
        setValue('propFacebook', business.facebook);
        setValue('propTwitter', business.twitter);
        setValue('propTiktok', business.tiktok);
        setValue('propYoutube', business.youtube);
        // Load existing videos (multi)
        if (business.video_url) {
            window._editBizVideos = [];
            var videoUrls = [];
            if (business.video_url.startsWith('[')) {
                try { videoUrls = JSON.parse(business.video_url); } catch(e) { videoUrls = [business.video_url]; }
            } else {
                videoUrls = [business.video_url];
            }
            videoUrls.forEach(function(u) { if (u) window._editBizVideos.push({ url: u, type: 'url' }); });
            window._renderVideoList('bizFormVideosList');
        }
        setValue('propSchedule', business.schedule);

        // Load existing logo
        if (business.logo) {
            uploadedLogoUrl = business.logo;
            const logoImg = document.getElementById('logoPreviewImg');
            const logoIcon = document.getElementById('logoPlaceholderIcon');
            const logoBtn = document.getElementById('removeLogoBtn');
            if (logoImg) { logoImg.src = business.logo; logoImg.style.display = 'block'; }
            if (logoIcon) logoIcon.style.display = 'none';
            if (logoBtn) logoBtn.style.display = 'inline-flex';
        }

        // Load existing banner
        if (business.banner) {
            uploadedBannerUrl = business.banner;
            const bannerImg = document.getElementById('bannerPreviewImg');
            const bannerPlaceholder = document.getElementById('bannerPlaceholderText');
            const bannerBtn = document.getElementById('removeBannerBtn');
            if (bannerImg) { bannerImg.src = business.banner; bannerImg.style.display = 'block'; }
            if (bannerPlaceholder) bannerPlaceholder.style.display = 'none';
            if (bannerBtn) bannerBtn.style.display = 'inline-flex';
        }
        setValue('propDireccion', business.address);
        setValue('propCiudad', business.city);
        setValue('propComuna', business.state);
        setValue('propLat', business.lat);
        setValue('propLng', business.lng);

        // Update map marker if coordinates exist
        if (business.lat && business.lng && locationMap && locationMarker) {
            selectedLat = business.lat;
            selectedLng = business.lng;
            locationMarker.setLatLng([selectedLat, selectedLng]);
            locationMap.flyTo([selectedLat, selectedLng], 15, { duration: 0.5 });
            updateCoordinateFields();
        }

        // Business features checkboxes
        const featuresMap = {
            'has_parking': 'Estacionamiento',
            'has_wifi': 'Wi-Fi',
            'has_card': 'Tarjeta',
            'has_delivery': 'Delivery',
            'has_outdoor': 'Terraza',
        };
        for (const [field, label] of Object.entries(featuresMap)) {
            if (business[field]) {
                const checkbox = businessForm?.querySelector(`input[name="caracteristicas"][value="${label}"]`);
                if (checkbox) checkbox.checked = true;
            }
        }

        // Load existing images
        if (business.images && business.images.length > 0) {
            uploadedImages = business.images.map((img, index) => ({
                url: img.url,
                file: null,
                preview: img.url || img.thumbnail_url,
                isExisting: true,
                imageId: img.id,
                isCover: img.is_cover,
                orderIndex: img.order_index,
            }));
            renderPhotoPreviews();
        }

        // Trigger char counters for edit mode
        const titleInput = document.getElementById('propTitle');
        const descInput = document.getElementById('propDescription');
        const titleCount = document.getElementById('titleCharCount');
        const descCount = document.getElementById('descCharCount');
        if (titleInput && titleCount) {
            const len = (titleInput.value || '').length;
            titleCount.textContent = len + '/150';
        }
        if (descInput && descCount) {
            const len = (descInput.value || '').length;
            descCount.textContent = len + '/2000';
        }
    }

    // ─── Photo Upload Setup ─────────────────────────────────────
    function setupPhotoUpload() {
        if (!uploadArea || !photoInput) return;

        // Click to upload (gallery)
        uploadArea.addEventListener('click', () => {
            photoInput.click();
        });

        // File input change
        photoInput.addEventListener('change', (e) => {
            if (e.target.files) {
                handlePhotoUpload(Array.from(e.target.files));
                photoInput.value = ''; // Reset so same file can be selected again
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('active');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('active');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('active');

            const files = Array.from(e.dataTransfer.files);
            handlePhotoUpload(files);
        });

        // Gallery button
        const galleryBtn = document.getElementById('galleryBtn');
        if (galleryBtn) {
            galleryBtn.addEventListener('click', () => {
                photoInput.click();
            });
        }

        // Camera button
        const cameraBtn = document.getElementById('cameraBtn');
        const cameraInput = document.getElementById('cameraInput');
        if (cameraBtn && cameraInput) {
            cameraBtn.addEventListener('click', () => {
                cameraInput.click();
            });
            cameraInput.addEventListener('change', (e) => {
                if (e.target.files) {
                    handlePhotoUpload(Array.from(e.target.files));
                    cameraInput.value = '';
                }
            });
        }
    }

    // ─── Handle Photo Upload ────────────────────────────────────
    function handlePhotoUpload(files) {
        if (!files || files.length === 0) return;

        // Check total count
        const remaining = MAX_PHOTOS - uploadedImages.length;
        if (remaining <= 0) {
            showToast(`Máximo ${MAX_PHOTOS} imágenes permitidas`, 'warning');
            return;
        }

        const validFiles = files.slice(0, remaining);

        for (const file of validFiles) {
            // Validate file extension
            const extension = file.name.split('.').pop().toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(extension)) {
                showToast(`Archivo "${file.name}" no es un formato soportado. Usa JPG, PNG, WebP o GIF.`, 'error');
                continue;
            }

            // Validate file type
            if (!ALLOWED_TYPES.includes(file.type)) {
                showToast(`Tipo de archivo "${file.name}" no soportado.`, 'error');
                continue;
            }

            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                showToast(`Archivo "${file.name}" excede el límite de 5MB.`, 'error');
                continue;
            }

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImages.push({
                    url: null,
                    file: file,
                    preview: e.target.result,
                    isExisting: false,
                });
                renderPhotoPreviews();
            };
            reader.readAsDataURL(file);
        }
    }

    // ─── Render Photo Previews ──────────────────────────────────
    function renderPhotoPreviews() {
        if (!photosPreview) return;

        photosPreview.innerHTML = '';

        uploadedImages.forEach((img, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'photo-preview-item';
            wrapper.draggable = true;
            wrapper.dataset.index = index;

            wrapper.innerHTML = `
                <img src="${img.preview}" alt="Preview ${index + 1}">
                ${index === 0 ? '<span class="photo-cover-badge">Principal</span>' : ''}
                <button type="button" class="photo-remove-btn" title="Eliminar imagen">
                    <i class="fas fa-times"></i>
                </button>
            `;

            // Remove button
            const removeBtn = wrapper.querySelector('.photo-remove-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removePhoto(index);
            });

            // Drag to reorder
            wrapper.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index.toString());
                wrapper.classList.add('dragging');
            });

            wrapper.addEventListener('dragend', () => {
                wrapper.classList.remove('dragging');
            });

            wrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
                wrapper.classList.add('drag-over');
            });

            wrapper.addEventListener('dragleave', () => {
                wrapper.classList.remove('drag-over');
            });

            wrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                wrapper.classList.remove('drag-over');
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = index;
                if (fromIndex !== toIndex) {
                    const item = uploadedImages.splice(fromIndex, 1)[0];
                    uploadedImages.splice(toIndex, 0, item);
                    renderPhotoPreviews();
                }
            });

            photosPreview.appendChild(wrapper);
        });

        // Update upload area message
        if (uploadPlaceholder) {
            if (uploadedImages.length >= MAX_PHOTOS) {
                uploadPlaceholder.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <h3>Máximo de imágenes alcanzado</h3>
                    <p>Has alcanzado el límite de ${MAX_PHOTOS} imágenes</p>
                `;
                uploadArea.style.pointerEvents = 'none';
                uploadArea.style.opacity = '0.6';
            } else {
                uploadArea.style.pointerEvents = '';
                uploadArea.style.opacity = '';
            }
        }
    }

    // ─── Remove Photo ───────────────────────────────────────────
    function removePhoto(index) {
        if (index < 0 || index >= uploadedImages.length) return;

        const removed = uploadedImages[index];
        uploadedImages.splice(index, 1);
        renderPhotoPreviews();

        if (removed.isExisting) {
            showToast('La imagen se eliminará al guardar los cambios', 'info');
        }
    }

    // ─── Setup Form Submit ──────────────────────────────────────
    function setupFormSubmit() {
        if (!businessForm) return;

        businessForm.addEventListener('submit', handleFormSubmit);
    }

    // ─── Handle Form Submit ─────────────────────────────────────
    async function handleFormSubmit(e) {
        e.preventDefault();

        if (isSubmitting) return;
        isSubmitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
        }

        // Clear previous errors
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

        // Gather form values
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        const getValueNum = (id) => {
            const el = document.getElementById(id);
            return el ? parseFloat(el.value) : null;
        };

        const title = getValue('propTitle');
        const description = getValue('propDescription');
        const categoria = getValue('propCategoria');
        const tipoNegocio = getValue('propTipoNegocio');
        const phone = getValue('propPhone');
        const whatsapp = getValue('propWhatsapp');
        const emailContact = getValue('propEmail');
        const website = getValue('propWebsite');
        const googleMapsUrl = getValue('propGoogleMapsUrl');
        const instagram = getValue('propInstagram');
        const facebook = getValue('propFacebook');
        const twitter = getValue('propTwitter');
        const tiktok = getValue('propTiktok');
        const youtube = getValue('propYoutube');
        const videoUrl = (typeof window._getVideoUrlsJSON === 'function') ? window._getVideoUrlsJSON() : (getValue('propVideo') || '[]');
        const schedule = getValue('propSchedule');
        const direccion = getValue('propDireccion');
        const ciudad = getValue('propCiudad');
        const comuna = getValue('propComuna');
        let lat = getValueNum('propLat');
        let lng = getValueNum('propLng');

        // ── Validation ──
        let hasError = false;

        if (!title) {
            showFormError('propTitle', 'El título es requerido');
            hasError = true;
        } else if (title.length > 150) {
            showFormError('propTitle', 'El título no puede exceder 150 caracteres');
            hasError = true;
        }

        if (!description) {
            showFormError('propDescription', 'La descripción es requerida');
            hasError = true;
        }

        if (!categoria) {
            showFormError('propCategoria', 'Selecciona una categoría');
            hasError = true;
        }

        if (!direccion) {
            showFormError('propDireccion', 'La dirección es requerida');
            hasError = true;
        }

        if (hasError) {
            isSubmitting = false;
            if (submitBtn) submitBtn.disabled = false;
            showToast('Por favor corrige los errores en el formulario', 'error');
            // Scroll to first error
            const firstError = document.querySelector('.form-error:not(:empty)');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Default coordinates to Santiago de Chile center if not provided
        if (isNaN(lat) || isNaN(lng)) {
            lat = CLNEZUELA_CENTER.lat;
            lng = CLNEZUELA_CENTER.lng;
        }

        // Gather features from checkboxes
        const has_parking = businessForm.querySelector('input[name="caracteristicas"][value="Estacionamiento"]')?.checked ? 1 : 0;
        const has_wifi = businessForm.querySelector('input[name="caracteristicas"][value="Wi-Fi"]')?.checked ? 1 : 0;
        const has_card = businessForm.querySelector('input[name="caracteristicas"][value="Tarjeta"]')?.checked ? 1 : 0;
        const has_delivery = businessForm.querySelector('input[name="caracteristicas"][value="Delivery"]')?.checked ? 1 : 0;
        const has_outdoor = businessForm.querySelector('input[name="caracteristicas"][value="Terraza"]')?.checked ? 1 : 0;

        const businessData = {
            title,
            description,
            category_id: categoria || null,
            business_type: tipoNegocio?.toLowerCase() || 'negocio',
            address: direccion,
            city: ciudad,
            state: comuna || 'Santiago',
            country: 'Santiago de Chile',
            lat,
            lng,
            phone,
            whatsapp,
            website,
            google_maps_url: googleMapsUrl || '',
            instagram,
            facebook,
            twitter,
            tiktok,
            youtube,
            video_url: videoUrl,
            email_contact: emailContact,
            schedule,
            has_parking,
            has_wifi,
            has_card,
            has_delivery,
            has_outdoor,
            logo: uploadedLogoUrl || null,
            banner: uploadedBannerUrl || null,
            especialidad: getValue('propEspecialidad') || null,
        };

        // Upload logo first if selected and not yet uploaded
        if (selectedLogoFile && !uploadedLogoUrl) {
            try {
                const logoFormData = new FormData();
                logoFormData.append('file', selectedLogoFile);
                logoFormData.append('product_type', 'logo');
                const logoResult = await api.postFormData('/upload', logoFormData);
                if (logoResult.url) {
                    uploadedLogoUrl = logoResult.url;
                    businessData.logo = uploadedLogoUrl;
                }
            } catch (logoErr) {
                console.error('Error uploading logo:', logoErr);
                // Non-blocking: business is created without logo
            }
        }

        // Upload banner if selected and not yet uploaded
        if (selectedBannerFile && !uploadedBannerUrl) {
            try {
                // Check if banner was rotated
                let finalBannerFile = selectedBannerFile;
                const editImg = document.getElementById('newBizBannerEditImg');
                if (editImg && editImg.dataset.rotation) {
                    const rotation = parseInt(editImg.dataset.rotation) || 0;
                    if (rotation !== 0) {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = editImg.src; });
                        const absRot = ((rotation % 360) + 360) % 360;
                        const swap = (absRot === 90 || absRot === 270);
                        canvas.width = swap ? img.height : img.width;
                        canvas.height = swap ? img.width : img.height;
                        ctx.save();
                        ctx.translate(canvas.width / 2, canvas.height / 2);
                        ctx.rotate(absRot * Math.PI / 180);
                        ctx.drawImage(img, -img.width / 2, -img.height / 2);
                        ctx.restore();
                        const blob = await new Promise(r => canvas.toBlob(r, selectedBannerFile.type || 'image/jpeg', 0.92));
                        finalBannerFile = new File([blob], selectedBannerFile.name, { type: selectedBannerFile.type || 'image/jpeg' });
                    }
                }

                const bannerFormData = new FormData();
                bannerFormData.append('file', finalBannerFile);
                bannerFormData.append('product_type', 'banner');
                const bannerResult = await api.postFormData('/upload', bannerFormData);
                if (bannerResult.url) {
                    uploadedBannerUrl = bannerResult.url;
                    businessData.banner = uploadedBannerUrl;
                }
            } catch (bannerErr) {
                console.error('Error uploading banner:', bannerErr);
                // Non-blocking: business is created without banner
            }
        }

        // Submit (isSubmitting already set at top to prevent double-click)
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }

        try {
            let businessId = editingBusinessId;

            if (editingBusinessId) {
                // Update existing business
                await api.put(`/businesses/${editingBusinessId}`, businessData);
                businessId = editingBusinessId;
            } else {
                // Create new business
                const result = await api.post('/businesses', businessData);
                businessId = result.business_id;
            }

            // Upload new images (files that haven't been uploaded yet)
            const newFiles = uploadedImages.filter(img => !img.isExisting && img.file);
            let imagesUploaded = 0;
            let r2NotConfigured = false;

            if (newFiles.length > 0 && businessId) {
                for (let i = 0; i < newFiles.length; i++) {
                    try {
                        const img = newFiles[i];
                        const formData = new FormData();
                        formData.append('file', img.file);
                        formData.append('business_id', businessId.toString());
                        formData.append('product_type', 'business');

                        // Upload file to R2
                        const uploadResult = await api.postFormData('/upload', formData);

                        if (uploadResult.url) {
                            // Register image in DB
                            const isCover = (i === 0 && !uploadedImages.some(u => u.isExisting && u.isCover));
                            await api.post(`/images/${businessId}`, {
                                url: uploadResult.url,
                                is_cover: isCover,
                                order_index: uploadedImages.indexOf(img),
                            });
                            imagesUploaded++;
                        }
                    } catch (uploadError) {
                        console.error('Error uploading image:', uploadError);
                        // Detect if R2 is not configured
                        const errMsg = uploadError.message || '';
                        if (errMsg.includes('R2') ||
                            errMsg.includes('Almacenamiento') ||
                            errMsg.includes('r2') ||
                            errMsg.includes('interno del servidor')) {
                            r2NotConfigured = true;
                            showToast(`Error al subir imagen ${i + 1}: ${errMsg}`, 'warning');
                        } else {
                            showToast(`Error al subir imagen ${i + 1}: ${errMsg}`, 'warning');
                        }
                    }
                }
            }

            // Show success with appropriate message
            if (editingBusinessId) {
                showToast('Negocio actualizado exitosamente', 'success');
                // GTM event: business updated
                if (window.dataLayer) {
                    window.dataLayer.push({
                        event: 'business_updated',
                        business_id: editingBusinessId,
                        business_title: businessData.title || ''
                    });
                }
            } else {
                showToast('Negocio registrado exitosamente. Pendiente de aprobación.', 'success');
                // GTM event: new business created
                if (window.dataLayer) {
                    window.dataLayer.push({
                        event: 'business_created',
                        business_title: businessData.title || '',
                        business_category: businessData.category_id || '',
                        business_city: businessData.city || '',
                        business_state: businessData.state || ''
                    });
                }
            }

            // Show R2 warning if needed
            if (r2NotConfigured) {
                setTimeout(() => {
                    showToast('Las imágenes no se pudieron subir. Configura el bucket R2 en Cloudflare.', 'warning');
                }, 500);
            } else if (newFiles.length > 0 && imagesUploaded === 0 && newFiles.length > 0) {
                setTimeout(() => {
                    showToast('No se subieron imágenes. Revisa la configuración de R2.', 'warning');
                }, 500);
            }

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);

        } catch (error) {
            showToast(error.message || 'Error al guardar el negocio', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span id="submitBtnText">${editingBusinessId ? 'Guardar Cambios' : 'Publicar Negocio'}</span>`;
            }
        }
        // Note: on success, we redirect — no need to reset isSubmitting
    }

    // ─── Form Error Helper ──────────────────────────────────────
    function showFormError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('input-error');
            // Find or create error span
            let errorSpan = field.parentElement.querySelector('.form-error');
            if (!errorSpan) {
                errorSpan = field.closest('.form-group')?.querySelector('.form-error');
            }
            if (errorSpan) {
                errorSpan.textContent = message;
            }
        }
    }

    // ─── Multi-video support for new business form ──────────
    // Ensure global helpers exist (may already be set by dashboard.js on dashboard pages)
    if (!window._editBizVideos) window._editBizVideos = [];
    if (!window._parseVideoUrls) {
        window._parseVideoUrls = function(video_url) {
            if (!video_url) return [];
            if (video_url.startsWith('[')) { try { return JSON.parse(video_url); } catch(e) { return [video_url]; } }
            return [video_url];
        };
    }
    if (!window._getVideoUrlsJSON) {
        window._getVideoUrlsJSON = function() {
            return JSON.stringify(window._editBizVideos.map(function(v) { return v.url; }));
        };
    }
    if (!window._renderVideoList) {
        window._renderVideoList = function(containerId) {
            var container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            window._editBizVideos.forEach(function(v, i) {
                var item = document.createElement('div');
                item.className = 'eb-video-item';
                var label = v.url.length > 60 ? v.url.substring(0, 60) + '...' : v.url;
                if (v.type === 'file') { var m = v.url.match(/([^/]+)$/); label = m ? m[1] : v.url; }
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
    }

    // Bind video add URL button
    var videoAddBtn = document.getElementById('bizFormVideoAddBtn');
    if (videoAddBtn) {
        videoAddBtn.addEventListener('click', function() {
            var input = document.getElementById('propVideo');
            if (!input) return;
            var url = input.value.trim();
            if (!url) return;
            window._editBizVideos.push({ url: url, type: 'url' });
            input.value = '';
            window._renderVideoList('bizFormVideosList');
        });
    }

    // Bind video upload button
    var videoUploadBtn = document.getElementById('bizFormVideoUploadBtn');
    var videoFileInput = document.getElementById('bizFormVideoFileInput');
    if (videoUploadBtn && videoFileInput) {
        videoUploadBtn.addEventListener('click', function() { videoFileInput.click(); });
        videoFileInput.addEventListener('change', function() {
            var files = this.files;
            if (!files || !files.length) return;
            var token = (typeof getToken === 'function') ? getToken() : (localStorage.getItem('ensantiago_token') || localStorage.getItem('auth_token') || localStorage.getItem('token'));
            var infoDiv = document.getElementById('bizFormVideoFileInfo');

            Array.from(files).forEach(function(file) {
                if (!file.type.startsWith('video/')) { showToast(file.name + ': Solo video', 'error'); return; }
                if (file.size > 50 * 1024 * 1024) { showToast(file.name + ': Max 50MB', 'error'); return; }
                if (infoDiv) infoDiv.innerHTML += '<div style="padding:4px 8px;background:#EFF6FF;border-radius:6px;margin-top:4px;font-size:0.82rem;" id="bfUpload_' + file.name.replace(/[^a-zA-Z0-9]/g, '_') + '"><i class="fas fa-spinner fa-spin"></i> ' + file.name + ' - Subiendo...</div>';

                var fd = new FormData();
                fd.append('file', file);
                fd.append('product_type', 'video');
                fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.url) {
                        window._editBizVideos.push({ url: data.url, type: 'file' });
                        window._renderVideoList('bizFormVideosList');
                        showToast(file.name + ' subido', 'success');
                    } else { showToast(data.error || 'Error al subir ' + file.name, 'error'); }
                    var el = document.getElementById('bfUpload_' + file.name.replace(/[^a-zA-Z0-9]/g, '_'));
                    if (el) el.remove();
                })
                .catch(function() {
                    showToast('Error de conexion', 'error');
                    var el = document.getElementById('bfUpload_' + file.name.replace(/[^a-zA-Z0-9]/g, '_'));
                    if (el) el.remove();
                });
            });
            this.value = '';
        });
    }

    // Also allow Enter key on the URL input to add
    var propVideoInput = document.getElementById('propVideo');
    if (propVideoInput) {
        propVideoInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); if (videoAddBtn) videoAddBtn.click(); }
        });
    }

    // ─── Suggest Category Modal ──────────────────────────────
    var catSelect = document.getElementById('propCategoria');
    var suggestModal = document.getElementById('suggestCatModal');
    var suggestOverlay = document.getElementById('suggestCatOverlay');
    var suggestClose = document.getElementById('suggestCatClose');
    var suggestCancel = document.getElementById('suggestCatCancel');
    var suggestSubmit = document.getElementById('suggestCatSubmit');
    var suggestName = document.getElementById('suggestCatName');
    var suggestReason = document.getElementById('suggestCatReason');
    var suggestError = document.getElementById('suggestCatError');

    function openSuggestCatModal() {
        if (!suggestModal) return;
        suggestModal.classList.remove('hidden');
        if (suggestName) suggestName.value = '';
        if (suggestReason) suggestReason.value = '';
        if (suggestError) suggestError.style.display = 'none';
        if (suggestName) setTimeout(function() { suggestName.focus(); }, 100);
    }

    function closeSuggestCatModal() {
        if (!suggestModal) return;
        suggestModal.classList.add('hidden');
        // Reset select to previous value or empty
        if (catSelect) catSelect.value = '';
    }

    if (catSelect) {
        catSelect.addEventListener('change', function() {
            if (this.value === '__suggest__') {
                openSuggestCatModal();
            }
        });
    }

    if (suggestOverlay) suggestOverlay.addEventListener('click', closeSuggestCatModal);
    if (suggestClose) suggestClose.addEventListener('click', closeSuggestCatModal);
    if (suggestCancel) suggestCancel.addEventListener('click', closeSuggestCatModal);

    if (suggestSubmit) {
        suggestSubmit.addEventListener('click', async function() {
            var name = suggestName ? suggestName.value.trim() : '';
            if (!name) {
                if (suggestError) { suggestError.textContent = 'El nombre de la categoria es requerido.'; suggestError.style.display = 'block'; }
                return;
            }
            suggestSubmit.disabled = true;
            suggestSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            if (suggestError) suggestError.style.display = 'none';

            try {
                var headers = { 'Content-Type': 'application/json' };
                var token = (typeof getToken === 'function') ? getToken() : (localStorage.getItem('ensantiago_token') || localStorage.getItem('auth_token') || localStorage.getItem('token'));
                if (token) headers['Authorization'] = 'Bearer ' + token;

                var resp = await fetch('/api/category-suggestions', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        category_name: name,
                        reason: suggestReason ? suggestReason.value.trim() : ''
                    })
                });
                var data = await resp.json();
                if (!resp.ok) throw new Error(data.error || 'Error al enviar sugerencia');

                showToast(data.message || 'Solicitud enviada exitosamente', 'success');
                closeSuggestCatModal();
            } catch(e) {
                if (suggestError) { suggestError.textContent = e.message || 'Error al enviar'; suggestError.style.display = 'block'; }
            } finally {
                suggestSubmit.disabled = false;
                suggestSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitud';
            }
        });
    }

    // ─── Slug Preview (dynamic URL generation) ───────────────
    var titleInput = document.getElementById('propTitle');
    var tipoSelect = document.getElementById('propTipoNegocio');
    var slugPreview = document.getElementById('slugPreview');
    var slugPreviewText = document.getElementById('slugPreviewText');

    function slugifyText(text) {
        return text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 120);
    }

    function updateSlugPreview() {
        if (!slugPreview || !slugPreviewText) return;
        var title = titleInput ? titleInput.value.trim() : '';
        var tipo = tipoSelect ? tipoSelect.value : '';
        var cat = catSelect ? catSelect.value : '';

        if (!title) {
            slugPreview.style.display = 'none';
            return;
        }

        var slugName = slugifyText(title);
        var urlParts = [];
        if (tipo) urlParts.push(tipo);
        if (cat && cat !== '__suggest__') urlParts.push(cat);
        urlParts.push(slugName);

        slugPreviewText.textContent = 'https://en-santiago.pages.dev/' + urlParts.join('/');
        slugPreview.style.display = 'block';
    }

    if (titleInput) titleInput.addEventListener('input', updateSlugPreview);
    if (tipoSelect) tipoSelect.addEventListener('change', updateSlugPreview);
    if (catSelect) catSelect.addEventListener('change', updateSlugPreview);

    // ─── Initialize on DOM Ready ────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initForm);
    } else {
        initForm();
    }

})();
