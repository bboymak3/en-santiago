// js/compress-image-auto.js
// Auto-intercepta fetch('/api/upload', ...) y comprime imágenes antes de enviar
// Solo afecta uploads de imágenes, no otros tipos de fetch
// Se carga automáticamente, no requiere cambios en el código existente

(function () {
  'use strict';

  // Esperar a que compressImage esté disponible
  function waitForCompressImage(callback) {
    if (typeof window.compressImage === 'function') {
      callback();
      return;
    }
    setTimeout(function () { waitForCompressImage(callback); }, 50);
  }

  // Guardar referencia al fetch original
  var originalFetch = window.fetch;

  // Nuevo fetch con compresión automática para /api/upload
  window.fetch = async function (input, init) {
    // Solo interceptar POST a /api/upload
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var method = (init && init.method) || (input && input.method) || 'GET';

    if (method !== 'POST' || url.indexOf('/api/upload') === -1) {
      return originalFetch.apply(this, arguments);
    }

    // Verificar si el body es FormData con un archivo
    if (!init || !init.body || !(init.body instanceof FormData)) {
      return originalFetch.apply(this, arguments);
    }

    var formData = init.body;
    var file = formData.get('file');

    // Si no hay file o no es un File, proceder normalmente
    if (!file || !(file instanceof File)) {
      return originalFetch.apply(this, arguments);
    }

    // Si no es imagen, proceder normalmente
    if (!file.type || !file.type.startsWith('image/')) {
      return originalFetch.apply(this, arguments);
    }

    // Si la imagen ya es pequeña, no comprimir
    if (file.size < 200 * 1024) {
      return originalFetch.apply(this, arguments);
    }

    // Determinar tipo de imagen para elegir dimensiones óptimas
    var productType = formData.get('product_type') || '';
    var options = { maxWidth: 1200, maxHeight: 1200, quality: 0.82 };

    if (productType === 'logo' || productType === 'avatar') {
      options.maxWidth = 800;
      options.maxHeight = 800;
    } else if (productType === 'banner' || productType === 'category_banner') {
      options.maxWidth = 1600;
      options.maxHeight = 800;
    } else if (productType === 'property' || productType === 'business' || productType === 'business_image') {
      options.maxWidth = 1200;
      options.maxHeight = 1200;
    }

    try {
      var result = await window.compressImage(file, options);
      if (result.compressed) {
        // Reemplazar el archivo en FormData con la versión comprimida
        formData.set('file', result.file);
        console.log(
          '[compress] ' + file.name + ': ' +
          (result.originalSize / 1024).toFixed(1) + 'KB -> ' +
          (result.newSize / 1024).toFixed(1) + 'KB (' +
          result.format + ') -' +
          ((1 - result.newSize / result.originalSize) * 100).toFixed(0) + '%'
        );
      }
    } catch (e) {
      console.warn('[compress] Error, subiendo original:', e.message);
    }

    return originalFetch.apply(this, arguments);
  };

  console.log('[compress-image-auto] Interceptor activo — imágenes >200KB se comprimirán antes de subir');
})();
