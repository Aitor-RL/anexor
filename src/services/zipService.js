import JSZip from 'jszip';
import { generateAnexoPdf } from './pdfService.js';

export async function generateZipBundle(housings, options = {}, signaturesMap = {}) {
  const zip = new JSZip();

  for (let i = 0; i < housings.length; i++) {
    const housing = housings[i];
    try {
      const pdfBytes = await generateAnexoPdf(housing, options, signaturesMap);
      const fileName = (
        (i + 1).toString().padStart(2, '0') +
        '_Anexo_II_' +
        (housing.label || 'Vivienda').replace(/[^a-zA-Z0-9_-]/g, '_') +
        '.pdf'
      );
      zip.file(fileName, pdfBytes);
    } catch (err) {
      console.warn('Error al procesar vivienda para ZIP:', housing.id, err);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}
