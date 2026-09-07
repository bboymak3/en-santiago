// js/compress-image.js
// Utilidad para comprimir imágenes antes de subirlas al servidor
// Reduce el tamaño de imágenes a máximo 1200px y calidad 0.82
// Convierte PNG/JPEG grandes a JPEG optimizado
// Uso:
//   import { compressImage } from './compress-image.js';
//   const compressedFile = await compressImage(originalFile, { maxWidth: 800, quality: 0.8 });

(function (global) {
  'use strict';

  /**
   * Comprime una imagen antes de subirla.
   * @param {File} file - El archivo de imagen original
   * @param {Object} options
   * @param {number} options.maxWidth - Ancho máximo en px (default: 1200)
   * @param {number} options.maxHeight - Alto máximo en px (default: 1200)
   * @param {number} options.quality - Calidad JPEG (0-1, default: 0.82)
   * @param {boolean} options.convertToWebP - Convertir a WebP si el navegador lo soporta (default: true)
   * @returns {Promise<{file: File, compressed: boolean, originalSize: number, newSize: number}>}
   */
  async function compressImage(file, options) {
    var opts = options || {};
    var maxWidth = opts.maxWidth || 1200;
    var maxHeight = opts.maxHeight || 1200;
    var quality = opts.quality || 0.82;
    var tryWebP = opts.convertToWebP !== false;

    // Si no es imagen, devolver original
    if (!file.type || !file.type.startsWith('image/')) {
      return { file: file, compressed: false, originalSize: file.size, newSize: file.size };
    }

    // Si es GIF o SVG, no comprimir (rompería animaciones/vectorial)
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return { file: file, compressed: false, originalSize: file.size, newSize: file.size };
    }

    // Si es menor a 200KB, no comprimir (ya es ligera)
    if (file.size < 200 * 1024) {
      return { file: file, compressed: false, originalSize: file.size, newSize: file.size };
    }

    // Detectar soporte WebP
    var useWebP = tryWebP && (function () {
      var canvas = document.createElement('canvas');
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })();

    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');

          // Calcular dimensiones manteniendo aspect ratio
          var w = img.width;
          var h = img.height;
          if (w > maxWidth) {
            h = Math.round(h * (maxWidth / w));
            w = maxWidth;
          }
          if (h > maxHeight) {
            w = Math.round(w * (maxHeight / h));
            h = maxHeight;
          }

          canvas.width = w;
          canvas.height = h;

          // Fondo blanco para PNG con transparencia (si convertimos a JPEG)
          if (!useWebP && file.type === 'image/png') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
          }

          ctx.drawImage(img, 0, 0, w, h);

          var outputType = useWebP ? 'image/webp' : 'image/jpeg';
          var outputExt = useWebP ? '.webp' : '.jpg';

          canvas.toBlob(
            function (blob) {
              if (!blob) {
                resolve({ file: file, compressed: false, originalSize: file.size, newSize: file.size });
                return;
              }

              // Si la versión comprimida es más grande, usar original
              if (blob.size >= file.size) {
                resolve({ file: file, compressed: false, originalSize: file.size, newSize: file.size });
                return;
              }

              // Cambiar extensión del nombre
              var originalName = file.name.replace(/\.[^.]+$/, '');
              var newName = originalName + outputExt;

              var compressedFile = new File([blob], newName, {
                type: outputType,
                lastModified: Date.now(),
              });

              resolve({
                file: compressedFile,
                compressed: true,
                originalSize: file.size,
                newSize: compressedFile.size,
                format: useWebP ? 'webp' : 'jpeg',
              });
            },
            outputType,
            quality
          );
        };
        img.onerror = function () {
          resolve({ file: file, compressed: false, originalSize: file.size, newSize: file.size });
        };
        img.src = e.target.result;
      };
      reader.onerror = function () {
        resolve({ file: file, compressed: false, originalSize: file.size, newSize: file.size });
      };
      reader.readAsDataURL(file);
    });
  }

  // Exportar
  global.compressImage = compressImage;
})(window);
