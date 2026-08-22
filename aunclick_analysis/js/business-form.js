/**
 * Un Click - Business Form Module
 * Loaded on new-business.html
 */

(function () {
    'use strict';

    // ─── Configuration ──────────────────────────────────────────
    const VENEZUELA_CENTER = { lat: 8.6233, lng: -66.5897 };
    const MAX_PHOTOS = 10;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    // ─── State ──────────────────────────────────────────────────
    let editingBusinessId = null;
    let uploadedImages = []; // Array of { url, file, preview }
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

    // ─── Location Picker Map ────────────────────────────────────
    let locationMap = null;
    let locationMarker = null;
    let geocoder = null;
    let selectedLat = VENEZUELA_CENTER.lat;
    let selectedLng = VENEZUELA_CENTER.lng;

    function initLocationPicker() {
        const mapEl = document.getElementById('locationMap');
        if (!mapEl || typeof L === 'undefined') return;

        try {
            // Initialize map centered on Venezuela
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
        setValue('propCategoria', business.category_id);
        setValue('propTipoNegocio', business.business_type);
        setValue('propPhone', business.phone);
        setValue('propWhatsapp', business.whatsapp);
        setValue('propEmail', business.email_contact);
        setValue('propWebsite', business.website);
        setValue('propInstagram', business.instagram);
        setValue('propFacebook', business.facebook);
        setValue('propTwitter', business.twitter);
        setValue('propTiktok', business.tiktok);
        setValue('propYoutube', business.youtube);
        setValue('propVideo', business.video_url);
        setValue('propSchedule', business.schedule);
        setValue('propDireccion', business.address);
        setValue('propCiudad', business.city);
        setValue('propEstado', business.state);
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
        const instagram = getValue('propInstagram');
        const facebook = getValue('propFacebook');
        const twitter = getValue('propTwitter');
        const tiktok = getValue('propTiktok');
        const youtube = getValue('propYoutube');
        const videoUrl = getValue('propVideo');
        const schedule = getValue('propSchedule');
        const direccion = getValue('propDireccion');
        const ciudad = getValue('propCiudad');
        const estado = getValue('propEstado');
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
            showToast('Por favor corrige los errores en el formulario', 'error');
            // Scroll to first error
            const firstError = document.querySelector('.form-error:not(:empty)');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Default coordinates to Venezuela center if not provided
        if (isNaN(lat) || isNaN(lng)) {
            lat = VENEZUELA_CENTER.lat;
            lng = VENEZUELA_CENTER.lng;
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
            state: estado || 'Mérida',
            country: 'Venezuela',
            lat,
            lng,
            phone,
            whatsapp,
            website,
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
        };

        // Submit
        isSubmitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
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
                        if (uploadError.message && (
                            uploadError.message.includes('R2') ||
                            uploadError.message.includes('Almacenamiento') ||
                            uploadError.message.includes('r2')
                        )) {
                            r2NotConfigured = true;
                        } else {
                            showToast(`Error al subir imagen ${i + 1}: ${uploadError.message}`, 'warning');
                        }
                    }
                }
            }

            // Show success with appropriate message
            if (editingBusinessId) {
                showToast('Negocio actualizado exitosamente', 'success');
            } else {
                showToast('Negocio registrado exitosamente. Pendiente de aprobación.', 'success');
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
                window.location.href = 'dashboard.html';
            }, 1500);

        } catch (error) {
            showToast(error.message || 'Error al guardar el negocio', 'error');
        } finally {
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span id="submitBtnText">${editingBusinessId ? 'Guardar Cambios' : 'Publicar Negocio'}</span>`;
            }
        }
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

    // ─── Initialize on DOM Ready ────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initForm);
    } else {
        initForm();
    }

})();
