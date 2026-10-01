/**
 * Motor de Visión por Computador en Canvas para aislamiento y limpieza de firmas de DNI.
 */

export function processSignatureCanvas(sourceImageOrCanvas, cropArea, options = {}) {
  const {
    threshold = 145,       // Umbral de corte (0-255)
    contrast = 1.3,        // Multiplicador de contraste
    strokeColor = 'black', // 'black' | 'darkblue' | 'original'
    transparent = true,    // Fondo transparente (true) o blanco (false)
    trimWhitespace = true  // Ajustar al bounding box del trazo
  } = options;

  if (!sourceImageOrCanvas || !cropArea) return null;

  const sourceWidth = sourceImageOrCanvas.naturalWidth || sourceImageOrCanvas.width || 0;
  const sourceHeight = sourceImageOrCanvas.naturalHeight || sourceImageOrCanvas.height || 0;

  if (sourceWidth <= 0 || sourceHeight <= 0) return null;

  // 1. Crear canvas de trabajo con el tamaño del área recortada
  const sx = Math.max(0, Math.min(cropArea.x, sourceWidth));
  const sy = Math.max(0, Math.min(cropArea.y, sourceHeight));
  const sw = Math.max(1, Math.min(sourceWidth - sx, cropArea.width));
  const sh = Math.max(1, Math.min(sourceHeight - sy, cropArea.height));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = sw;
  workCanvas.height = sh;
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true });

  // Dibujar recorte original
  ctx.drawImage(sourceImageOrCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const imgData = ctx.getImageData(0, 0, sw, sh);
  const data = imgData.data;

  // 2. Binarización adaptativa y limpieza de trama
  // Bounding box para auto-crop
  let minX = sw, minY = sh, maxX = 0, maxY = 0;
  let hasStroke = false;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Luminancia perceptual
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Aplicar contraste centrado en 128
    lum = (lum - 128) * contrast + 128;
    lum = Math.max(0, Math.min(255, lum));

    const pixelIdx = i / 4;
    const px = pixelIdx % sw;
    const py = Math.floor(pixelIdx / sw);

    if (lum < threshold) {
      // Es parte del trazo de la firma (oscuro)
      hasStroke = true;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;

      // Calcular opacidad suave (anti-aliasing) basada en qué tan oscuro es
      const darkness = 1 - (lum / threshold);
      const alpha = Math.min(255, Math.round(darkness * 1.5 * 255));

      if (strokeColor === 'black') {
        data[i] = 15;     // R
        data[i + 1] = 23; // G
        data[i + 2] = 42; // B (Negro tinta / slate-900)
      } else if (strokeColor === 'darkblue') {
        data[i] = 26;     // R
        data[i + 1] = 54; // G
        data[i + 2] = 120;// B (Azul bolígrafo)
      }
      data[i + 3] = alpha;
    } else {
      // Es fondo del papel / DNI
      if (transparent) {
        data[i + 3] = 0; // Transparente
      } else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 3. Auto-crop al bounding box del trazo (añadiendo pequeño padding)
  if (trimWhitespace && hasStroke && minX <= maxX && minY <= maxY) {
    const pad = 6;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(sw - cropX, (maxX - minX) + pad * 2);
    const cropH = Math.min(sh - cropY, (maxY - minY) + pad * 2);

    if (cropW > 0 && cropH > 0) {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = cropW;
      finalCanvas.height = cropH;
      const finalCtx = finalCanvas.getContext('2d');
      finalCtx.drawImage(workCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      return finalCanvas.toDataURL('image/png');
    }
  }

  return workCanvas.toDataURL('image/png');
}
