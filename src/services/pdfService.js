import { PDFDocument, TextAlignment } from 'pdf-lib';

let cachedTemplateBytes = null;

async function getTemplateBytes() {
  if (cachedTemplateBytes) return cachedTemplateBytes;
  const res = await fetch('/anexo_ii_template.pdf');
  if (!res.ok) throw new Error('No se pudo cargar la plantilla oficial del Anexo II desde /anexo_ii_template.pdf');
  cachedTemplateBytes = await res.arrayBuffer();
  return cachedTemplateBytes;
}

export async function generateAnexoPdf(housing, options = {}) {
  const templateBytes = await getTemplateBytes();
  // Clonar los bytes para que cada documento sea independiente
  const pdfDoc = await PDFDocument.load(templateBytes.slice(0));
  const form = pdfDoc.getForm();

  const {
    localidad = 'Vigo',
    dia = new Date().getDate().toString(),
    mes = new Date().toLocaleString('es-ES', { month: 'long' }),
    ano = new Date().getFullYear().toString()
  } = options;

  const propietarios = housing.propietarios || [];

  const rowFieldMap = [
    // Fila 1 (Página 1)
    {
      nombre: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila1[0].txtNombre[0]',
      dni: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila1[0].txtNifCif[0]',
      menor: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila1[0].cvMenor[0]',
      tutorNombre: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila1[0].txtNombreTutor[0]',
      tutorDni: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila1[0].txtNifCifTutor[0]',
      vulnerabilidad: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila1[0].Radio[0].rbRadio[0]',
      consentimiento1: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila1[0].tblComprobacion[0].FilaC1[0].frmConsentimiento[0].rbConsentimiento[0]',
      consentimiento2: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila1[0].tblComprobacion[0].FilaC2[0].frmConsentimiento[0].rbConsentimiento[0]'
    },
    // Fila 2 (Página 1)
    {
      nombre: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila2[0].txtNombre[0]',
      dni: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila2[0].txtNifCif[0]',
      menor: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila2[0].cvMenor[0]',
      tutorNombre: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila2[0].txtNombreTutor[0]',
      tutorDni: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila2[0].txtNifCifTutor[0]',
      vulnerabilidad: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila2[0].Radio[0].rbRadio[0]',
      consentimiento1: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila2[0].tblComprobacion[0].FilaC1[0].frmConsentimiento[0].rbConsentimiento[0]',
      consentimiento2: 'ProcedimientoXunta[0].VI406F_AnexoII_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila2[0].tblComprobacion[0].FilaC2[0].frmConsentimiento[0].rbConsentimiento[0]'
    },
    // Fila 3 (Página 2)
    {
      nombre: 'ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila3[0].txtNombre[0]',
      dni: 'ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila3[0].txtNifCif[0]',
      menor: 'ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila3[0].cvMenor[0]',
      tutorNombre: 'ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila3[0].txtNombreTutor[0]',
      tutorDni: 'ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila3[0].txtNifCifTutor[0]',
      vulnerabilidad: 'ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila3[0].Radio[0].rbRadio[0]',
      consentimiento1: 'ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila3[0].tblComprobacion[0].FilaC1[0].frmConsentimiento[0].rbConsentimiento[0]',
      consentimiento2: 'ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Comprobacion_Terceras[0].tblAutorizaciones[0].Fila3[0].tblComprobacion[0].FilaC2[0].frmConsentimiento[0].rbConsentimiento[0]'
    }
  ];

  for (let i = 0; i < Math.min(propietarios.length, rowFieldMap.length); i++) {
    const prop = propietarios[i];
    const map = rowFieldMap[i];

    try {
      if (prop.nombre && map.nombre) {
        const nombreField = form.getTextField(map.nombre);
        nombreField.setFontSize(8);
        nombreField.setText(prop.nombre);
      }
      if (prop.dni && map.dni) {
        const dniField = form.getTextField(map.dni);
        dniField.setFontSize(6.8);
        dniField.setAlignment(TextAlignment.Center);
        dniField.setText(prop.dni);
      }
      if (prop.esMenor && map.menor) {
        try { form.getCheckBox(map.menor).check(); } catch (_) {}
      }
      if (prop.tutorNombre && map.tutorNombre) {
        const tutorNombreField = form.getTextField(map.tutorNombre);
        tutorNombreField.setFontSize(8);
        tutorNombreField.setText(prop.tutorNombre);
      }
      if (prop.tutorDni && map.tutorDni) {
        const tutorDniField = form.getTextField(map.tutorDni);
        tutorDniField.setFontSize(6.8);
        tutorDniField.setAlignment(TextAlignment.Center);
        tutorDniField.setText(prop.tutorDni);
      }

      // Vulnerabilidad: '1' es SÍ, '2' es NO
      if (map.vulnerabilidad) {
        const vulnVal = prop.vulnerabilidad ? '1' : '2';
        form.getRadioGroup(map.vulnerabilidad).select(vulnVal);
      }

      // Consentimiento por defecto AUTORIZO ('1')
      if (map.consentimiento1) {
        try { form.getRadioGroup(map.consentimiento1).select('1'); } catch (_) {}
      }
      if (map.consentimiento2) {
        try { form.getRadioGroup(map.consentimiento2).select('1'); } catch (_) {}
      }
    } catch (err) {
      console.warn('Error al rellenar propietario ' + (i + 1) + ':', err.message);
    }
  }

  // Rellenar Lugar y Fecha
  try {
    const txtLoc = form.getTextField('ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Firma[0].txtLocalidad[0]');
    if (txtLoc) txtLoc.setText(localidad);

    const txtDia = form.getTextField('ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Firma[0].txtDia[0]');
    if (txtDia) txtDia.setText(String(dia));

    const txtMes = form.getTextField('ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Firma[0].txtMes[0]');
    if (txtMes) txtMes.setText(String(mes));

    const txtAno = form.getTextField('ProcedimientoXunta[0].VI406F_AnexoII_2_G[0].Firma[0].txtAno[0]');
    if (txtAno) txtAno.setText(String(ano));
  } catch (err) {
    console.warn('Error al rellenar lugar y fecha:', err.message);
  }

  return await pdfDoc.save();
}
