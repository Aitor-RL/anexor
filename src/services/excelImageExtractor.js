import JSZip from 'jszip';

/**
 * Extrae imágenes incrustadas en celdas de un archivo Excel (.xlsx) exportado desde Google Sheets o Excel.
 * Devuelve un mapa de imágenes indexado por coordenadas de celda (ej: 'row_col' o por índice de fila).
 */
export async function extractImagesFromXlsx(arrayBuffer, onProgress = null) {
  const result = {
    cellMap: {}, // 'row_col' (0-indexed) -> dataUrl
    rowMap: {},  // rowIndex (0-indexed) -> dataUrl
    allImages: [] // lista ordenada de imágenes encontradas
  };

  try {
    if (onProgress) onProgress('Descomprimiendo libro de Excel...');
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Extraer todos los archivos de imagen dentro de xl/media/
    const mediaFiles = {};
    const mediaNames = [];

    const mediaEntries = Object.entries(zip.files).filter(([p, e]) => p.startsWith('xl/media/') && !e.dir);
    const totalMedia = mediaEntries.length;

    for (let i = 0; i < totalMedia; i++) {
      const [relativePath, zipEntry] = mediaEntries[i];
      if (onProgress) onProgress(`Extrayendo fotos del DNI (${i + 1} de ${totalMedia})...`);

      const ext = relativePath.split('.').pop().toLowerCase();
      let mime = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
      else if (ext === 'webp') mime = 'image/webp';
      else if (ext === 'gif') mime = 'image/gif';

      const base64Data = await zipEntry.async('base64');
      const dataUrl = `data:${mime};base64,${base64Data}`;
      const fileName = relativePath.replace('xl/media/', '');

      mediaFiles[relativePath] = dataUrl;
      mediaFiles['../media/' + fileName] = dataUrl;
      mediaFiles['media/' + fileName] = dataUrl;
      mediaFiles[fileName] = dataUrl;

      mediaNames.push({ path: relativePath, name: fileName, dataUrl });
    }

    // Ordenar imágenes de media por nombre (image1, image2, image3...)
    mediaNames.sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
    result.allImages = mediaNames.map(m => m.dataUrl);

    if (mediaNames.length === 0) {
      return result;
    }

    // 2. Analizar relaciones de drawings: xl/drawings/_rels/drawing*.xml.rels
    const relsMap = {}; // drawingRelName -> { rId: targetPath }

    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (path.startsWith('xl/drawings/_rels/drawing') && path.endsWith('.xml.rels')) {
        const xmlText = await zipEntry.async('text');
        const relEntries = parseRelationshipsXml(xmlText);
        const baseDrawingName = path.replace('xl/drawings/_rels/', '').replace('.rels', '');
        relsMap[baseDrawingName] = relEntries;
      }
      // También cellImages rels
      if (path.includes('cellImages') && path.endsWith('.rels')) {
        const xmlText = await zipEntry.async('text');
        const relEntries = parseRelationshipsXml(xmlText);
        relsMap['cellImages'] = relEntries;
      }
    }

    // 3. Analizar xl/drawings/drawing*.xml
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (path.startsWith('xl/drawings/drawing') && path.endsWith('.xml')) {
        const xmlText = await zipEntry.async('text');
        const drawingName = path.replace('xl/drawings/', '');
        const currentRels = relsMap[drawingName] || relsMap['drawing1.xml'] || {};

        parseDrawingXml(xmlText, currentRels, mediaFiles, result);
      }
    }

    // 4. Analizar xl/cellImages.xml (usado por Google Sheets y Excel moderno para imágenes dentro de celda)
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (path.includes('cellImages.xml') && !path.endsWith('.rels')) {
        const xmlText = await zipEntry.async('text');
        const currentRels = relsMap['cellImages'] || {};
        parseCellImagesXml(xmlText, currentRels, mediaFiles, result);
      }
    }

  } catch (err) {
    console.warn('Advertencia al extraer imágenes del archivo XLSX:', err);
  }

  return result;
}

function parseRelationshipsXml(xml) {
  const rels = {};
  const relRegex = /<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  let match;
  while ((match = relRegex.exec(xml)) !== null) {
    rels[match[1]] = match[2];
  }
  return rels;
}

function parseDrawingXml(xml, rels, mediaFiles, result) {
  // Buscar bloques <xdr:twoCellAnchor> o <xdr:oneCellAnchor>
  const anchorRegex = /<xdr:(twoCellAnchor|oneCellAnchor)[\s\S]*?<\/xdr:\1>/g;
  let anchorMatch;

  while ((anchorMatch = anchorRegex.exec(xml)) !== null) {
    const block = anchorMatch[0];

    // Extraer fila y columna
    const fromColMatch = /<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/i.exec(block);
    const blipMatch = /<a:blip\s+[^>]*r:embed="([^"]+)"/i.exec(block);

    if (fromColMatch && blipMatch) {
      const col = parseInt(fromColMatch[1], 10);
      const row = parseInt(fromColMatch[2], 10);
      const rId = blipMatch[1];
      const targetPath = rels[rId];

      if (targetPath && mediaFiles[targetPath]) {
        const dataUrl = mediaFiles[targetPath];
        result.cellMap[`${row}_${col}`] = dataUrl;
        result.rowMap[row] = dataUrl;
      }
    }
  }
}

function parseCellImagesXml(xml, rels, mediaFiles, result) {
  // Extraer imágenes de cellImages.xml
  const cellImageRegex = /<etc:cellImage[\s\S]*?<\/etc:cellImage>/g;
  let match;
  let idx = 0;

  while ((match = cellImageRegex.exec(xml)) !== null) {
    const block = match[0];
    const blipMatch = /<a:blip\s+[^>]*r:embed="([^"]+)"/i.exec(block);
    if (blipMatch) {
      const rId = blipMatch[1];
      const targetPath = rels[rId];
      if (targetPath && mediaFiles[targetPath]) {
        const dataUrl = mediaFiles[targetPath];
        // Asignar por índice secuencial si no hay row/col explícito
        if (!result.rowMap[idx]) {
          result.rowMap[idx] = dataUrl;
        }
        idx++;
      }
    }
  }
}
