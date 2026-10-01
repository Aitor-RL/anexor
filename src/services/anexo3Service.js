import { PDFDocument, TextAlignment } from 'pdf-lib';

let cachedAnexo3Bytes = null;

async function getAnexo3TemplateBytes() {
  if (cachedAnexo3Bytes) return cachedAnexo3Bytes;
  const res = await fetch('/anexo_iii_template.pdf');
  if (!res.ok) throw new Error('No se pudo cargar la plantilla oficial del Anexo III desde /anexo_iii_template.pdf');
  cachedAnexo3Bytes = await res.arrayBuffer();
  return cachedAnexo3Bytes;
}

export async function generateAnexo3Pdf(housings = [], communityData = {}, options = {}) {
  const templateBytes = await getAnexo3TemplateBytes();

  // 1. Extraer lista plana de todos los comuneros para la Tabla (b)
  const allComuneros = [];
  // 2. Extraer lista de partícipes para la Tabla (c)
  const allParticipes = [];

  let totalViviendasEdificio = 0;
  let totalViviendasParticipes = 0;
  let supLocalesTotal = 0;
  let supLocalesParticipes = 0;

  housings.forEach(h => {
    const isResidencial = (h.uso || '').toLowerCase().includes('residencial') || !(h.uso || '').toLowerCase().includes('almac');
    const isLocal = (h.uso || '').toLowerCase().includes('comercial') || (h.uso || '').toLowerCase().includes('local') || (h.uso || '').toLowerCase().includes('almac');
    const sup = Number(h.superficie || 0);

    if (isResidencial) totalViviendasEdificio++;
    if (isLocal) supLocalesTotal += sup;

    const participatesInGrant = h.propietarios && h.propietarios.length > 0;
    if (participatesInGrant && isResidencial) totalViviendasParticipes++;
    if (participatesInGrant && isLocal) supLocalesParticipes += sup;

    // Comuneros
    (h.propietarios || []).forEach(p => {
      const cuotaNumber = parseFloat(String(p.porcentaje || '0').replace(',', '.')) || 0;
      allComuneros.push({
        bloque: h.bloque || '',
        piso: h.piso || '',
        letra: h.letra || '',
        nombre: p.nombre || '',
        dni: p.dni || '',
        cuota: cuotaNumber,
        cuotaFormatted: cuotaNumber.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        refCatastral: h.referenciaCatastral || '',
        vulnerabilidad: p.vulnerabilidad
      });

      // Partícipes (los que participan en las obras)
      allParticipes.push({
        refCatastral: h.referenciaCatastral || '',
        bloque: h.bloque || '',
        piso: h.piso || '',
        letra: h.letra || '',
        nombre: p.nombre || '',
        dni: p.dni || '',
        porcentajePresupuesto: cuotaNumber,
        porcentajeFormatted: cuotaNumber.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        cuotaAyudaFormatted: cuotaNumber.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      });
    });
  });

  // Dividir en páginas (en el Anexo III entran hasta 12 filas cómodamente por hoja)
  const ROWS_PER_PAGE = 12;
  const numSets = Math.max(
    1,
    Math.ceil(allComuneros.length / ROWS_PER_PAGE),
    Math.ceil(allParticipes.length / ROWS_PER_PAGE)
  );

  // Documento maestro final que unirá todos los juegos de 2 páginas
  const masterDoc = await PDFDocument.create();

  const {
    nombreComunidad = 'COMUNIDAD DE PROPIETARIOS',
    nifComunidad = '',
    presidenteNombre = '',
    presidenteApel1 = '',
    presidenteApel2 = '',
    presidenteDni = '',
    secretarioNombre = '',
    secretarioApel1 = '',
    secretarioApel2 = '',
    secretarioDni = '',
    fechaReunion = '',
    obras = 'REHABILITACIÓN ENERGÉTICA Y CONSERVACIÓN CONFORME A PROYECTO',
    presupuesto = '',
    representanteNombre = '',
    representanteDni = '',
    totalViviendasManual = '',
    totalParticipesManual = '',
    supLocalesManual = '',
    supLocalesParticipesManual = ''
  } = communityData;

  const {
    localidad = 'Vigo',
    dia = new Date().getDate().toString(),
    mes = new Date().toLocaleString('es-ES', { month: 'long' }),
    ano = new Date().getFullYear().toString()
  } = options;

  for (let setIdx = 0; setIdx < numSets; setIdx++) {
    const pageDoc = await PDFDocument.load(templateBytes.slice(0));
    const form = pageDoc.getForm();

    // 1. Datos Comunidad y Representantes (Página 1)
    try {
      if (nombreComunidad) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].DatosComunidad[0].txtNombreC[0]').setText(nombreComunidad);
      if (nifComunidad) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].DatosComunidad[0].txtNifCifC[0]').setText(nifComunidad);

      if (presidenteNombre) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].DatosComunidad[0].txtNombreT[0]').setText(presidenteNombre);
      if (presidenteApel1) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].DatosComunidad[0].txtApel1[0]').setText(presidenteApel1);
      if (presidenteApel2) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].DatosComunidad[0].txtApel2[0]').setText(presidenteApel2);
      if (presidenteDni) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].DatosComunidad[0].txtNifCif[0]').setText(presidenteDni);

      if (secretarioNombre) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].DatosComunidad[0].txtNombreTS[0]').setText(secretarioNombre);
      if (secretarioApel1) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].DatosComunidad[0].txtApel1S[0]').setText(secretarioApel1);
      if (secretarioApel2) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].DatosComunidad[0].txtApel2S[0]').setText(secretarioApel2);
      if (secretarioDni) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].DatosComunidad[0].txtNifCifS[0]').setText(secretarioDni);

      if (fechaReunion) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].txtFecha[0]').setText(fechaReunion);
      if (obras) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].txtObras2[0]').setText(obras);
      if (presupuesto) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].txtPresupuesto[0]').setText(presupuesto);
      if (representanteNombre) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].txtNombre[0]').setText(representanteNombre);
      if (representanteDni) form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].txtNifCif[0]').setText(representanteDni);
    } catch (err) {
      console.warn('Error rellenando cabecera Anexo III:', err);
    }

    // 2. Tabla (b) Comuneros (Página 1)
    const startComunero = setIdx * ROWS_PER_PAGE;
    const endComunero = startComunero + ROWS_PER_PAGE;
    const pageComuneros = allComuneros.slice(startComunero, endComunero);
    let subtotalCuotaB = 0;

    pageComuneros.forEach((c, idx) => {
      const rowNum = idx + 1;
      try {
        if (c.bloque) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].tblPersoas[0].Fila${rowNum}[0].txtBloque[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(c.bloque);
        }
        if (c.piso) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].tblPersoas[0].Fila${rowNum}[0].txtPiso[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(c.piso);
        }
        if (c.letra) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].tblPersoas[0].Fila${rowNum}[0].txtLetra[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(c.letra);
        }
        if (c.nombre) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].tblPersoas[0].Fila${rowNum}[0].txtNome[0]`);
          f.setFontSize(8.5); f.setText(c.nombre);
        }
        if (c.dni) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].tblPersoas[0].Fila${rowNum}[0].txtNifCif[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(c.dni);
        }
        if (c.cuotaFormatted) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].tblPersoas[0].Fila${rowNum}[0].txtCota[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(c.cuotaFormatted);
        }
        subtotalCuotaB += (c.cuota || 0);
      } catch (err) {
        console.warn(`Error rellenando Fila ${rowNum} Tabla B:`, err);
      }
    });

    try {
      const txtTotalB = form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_G[0].Certifica[0].tblPersoas[0].FilaTotal[0].txtTotal[0]');
      if (txtTotalB) {
        txtTotalB.setFontSize(8.5);
        txtTotalB.setAlignment(TextAlignment.Center);
        txtTotalB.setText(subtotalCuotaB.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
    } catch (_) {}

    // 3. Tabla (c) Partícipes (Página 2)
    const startParticipe = setIdx * ROWS_PER_PAGE;
    const endParticipe = startParticipe + ROWS_PER_PAGE;
    const pageParticipes = allParticipes.slice(startParticipe, endParticipe);
    let subtotalPorcentajeC = 0;
    let subtotalCuotaAyudaC = 0;

    pageParticipes.forEach((p, idx) => {
      const rowNum = idx + 1;
      try {
        if (p.refCatastral) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].Tabla1[0].Fila${rowNum}[0].txtReferenciaC[0]`);
          f.setFontSize(7.5); f.setAlignment(TextAlignment.Center); f.setText(p.refCatastral);
        }
        if (p.bloque) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].Tabla1[0].Fila${rowNum}[0].txtBloque[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(p.bloque);
        }
        if (p.piso) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].Tabla1[0].Fila${rowNum}[0].txtPiso[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(p.piso);
        }
        if (p.letra) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].Tabla1[0].Fila${rowNum}[0].txtLetra[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(p.letra);
        }

        if (p.nombre) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].Tabla2[0].Fila${rowNum}[0].txtNombreApellidos[0]`);
          f.setFontSize(8.5); f.setText(p.nombre);
        }
        if (p.dni) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].Tabla2[0].Fila${rowNum}[0].txtNifCif[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(p.dni);
        }
        if (p.porcentajeFormatted) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].Tabla2[0].Fila${rowNum}[0].txtporcentaje[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(p.porcentajeFormatted);
        }

        if (p.cuotaAyudaFormatted) {
          const f = form.getTextField(`ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].Tabla3[0].Fila${rowNum}[0].txtCuota[0]`);
          f.setFontSize(8.5); f.setAlignment(TextAlignment.Center); f.setText(p.cuotaAyudaFormatted);
        }

        subtotalPorcentajeC += (p.porcentajePresupuesto || 0);
        subtotalCuotaAyudaC += (p.porcentajePresupuesto || 0);
      } catch (err) {
        console.warn(`Error rellenando Fila ${rowNum} Tabla C:`, err);
      }
    });

    try {
      const txtTotP = form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].Tabla2[0].FilaTotal[0].txtTotalP[0]');
      if (txtTotP) txtTotP.setText(subtotalPorcentajeC.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

      const txtTotC = form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].Tabla3[0].FilaTotal[0].txtTotalC[0]');
      if (txtTotC) txtTotC.setText(subtotalCuotaAyudaC.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } catch (_) {}

    // 4. Contadores del Edificio (Pie de Página 2)
    try {
      const finalViviendas = totalViviendasManual || totalViviendasEdificio.toString();
      const finalParticipes = totalParticipesManual || totalViviendasParticipes.toString();
      const finalLocales = supLocalesManual || (supLocalesTotal > 0 ? supLocalesTotal.toLocaleString('es-ES') : '0');
      const finalLocalesPart = supLocalesParticipesManual || (supLocalesParticipes > 0 ? supLocalesParticipes.toLocaleString('es-ES') : '0');

      form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].tblTabla[0].Fila1[0].txtNtotalviviendas[0]').setText(finalViviendas);
      form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].tblTabla[0].Fila2[0].txtNtotalviviendasObras[0]').setText(finalParticipes);
      form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].tblTabla[0].Fila3[0].txtSuperficie[0]').setText(finalLocales);
      form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Certifica[0].tblTabla[0].Fila4[0].txtSuperficieOtros[0]').setText(finalLocalesPart);

      form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Firma[0].txtLocalidad[0]').setText(localidad);
      form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Firma[0].txtDia[0]').setText(String(dia));
      form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Firma[0].txtMes[0]').setText(String(mes).toUpperCase());
      form.getTextField('ProcedimientoXunta[0].VI406F_AnexoIII_2_G[0].Firma[0].txtAno[0]').setText(String(ano));
    } catch (err) {
      console.warn('Error rellenando contadores y pie Anexo III:', err);
    }

    // Copiar las 2 páginas de este set al documento maestro
    const savedBytes = await pageDoc.save();
    const tempDoc = await PDFDocument.load(savedBytes);
    const copiedPages = await masterDoc.copyPages(tempDoc, [0, 1]);
    copiedPages.forEach(p => masterDoc.addPage(p));
  }

  return await masterDoc.save();
}
