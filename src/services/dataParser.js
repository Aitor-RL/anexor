export function normalizeKey(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function parseRows(rawRows, extractedImages = null) {
  if (!Array.isArray(rawRows)) return [];

  // Mapear cada fila con claves normalizadas
  const normalizedRows = rawRows.map(row => {
    const norm = {};
    for (const [key, val] of Object.entries(row)) {
      norm[normalizeKey(key)] = val;
    }
    return norm;
  });

  const housingMap = new Map();

  normalizedRows.forEach((row, idx) => {
    const piso = String(row['piso'] ?? '').trim();
    const letra = String(row['letra'] ?? row['puerta'] ?? '').trim();
    const refCatastral = String(row['referenciacatastral'] ?? row['refcatastral'] ?? '').trim();
    const direccion = String(row['direccion'] ?? '').trim();
    const uso = String(row['uso'] ?? '').trim();
    const superficie = Number(row['supconstruidam2'] ?? row['superficie'] ?? 0);
    const ano = Number(row['ano'] ?? 0);

    // Identificador único de vivienda
    const housingKey = [refCatastral, piso, letra].filter(Boolean).join('__') || ('vivienda_' + (idx + 1));

    const rawProp = String(row['propiedad'] ?? '0').replace('%', '').replace(',', '.').trim();
    const porcentaje = parseFloat(rawProp) || 0;

    const nombre = String(row['propietarioa'] ?? row['propietario'] ?? row['nombre'] ?? '').trim();
    const dni = String(row['dni'] ?? row['nif'] ?? '').trim().toUpperCase();
    const menorStr = String(row['menordeedad'] ?? row['menor'] ?? '').trim().toUpperCase();
    const esMenor = menorStr === 'SI' || menorStr === 'SÍ' || menorStr === 'TRUE';
    const vulnerabilidadStr = String(row['vulnerabilidad'] ?? '').trim().toUpperCase();
    const vulnerabilidad = vulnerabilidadStr === 'SI' || vulnerabilidadStr === 'SÍ' || vulnerabilidadStr === 'TRUE';
    const mayor65Str = String(row['mayorde65'] ?? '').trim().toUpperCase();
    const mayor65 = mayor65Str === 'SI' || mayor65Str === 'SÍ';
    const discapacidadStr = String(row['discapadidad33'] ?? row['discapacidad33'] ?? '').trim().toUpperCase();
    const discapacidad = discapacidadStr === 'SI' || discapacidadStr === 'SÍ';
    const tutorNombre = String(row['tutornombre'] ?? row['tutor'] ?? '').trim();
    const tutorDni = String(row['tutordni'] ?? row['niftutor'] ?? '').trim().toUpperCase();
    let anversoDni = String(
      row['anversodni'] ??
      row['dnianverso'] ??
      row['anverso'] ??
      row['fotodni'] ??
      row['fotodnianverso'] ??
      row['documentodni'] ??
      row['linkdni'] ??
      row['urldni'] ??
      row['urldnianverso'] ??
      ''
    ).trim();

    // Si no había enlace de texto pero se extrajeron imágenes del archivo Excel (.xlsx):
    if (!anversoDni && extractedImages) {
      const extracted = (
        extractedImages.rowMap[idx + 1] ||
        extractedImages.rowMap[idx] ||
        extractedImages.allImages[idx] ||
        ''
      );
      if (extracted) {
        anversoDni = extracted;
      }
    }
    const nota = String(row['nota'] ?? '').trim();

    if (!housingMap.has(housingKey)) {
      housingMap.set(housingKey, {
        id: housingKey,
        label: 'Piso ' + (piso || '-') + ', puerta ' + (letra || '-'),
        piso,
        letra,
        referenciaCatastral: refCatastral,
        direccion,
        uso,
        superficie,
        ano,
        propietarios: []
      });
    }

    if (nombre || dni) {
      housingMap.get(housingKey).propietarios.push({
        nombre,
        dni,
        porcentaje,
        esMenor,
        vulnerabilidad,
        mayor65,
        discapacidad,
        tutorNombre,
        tutorDni,
        anversoDni,
        nota
      });
    }
  });

  // Procesar estado y totales por vivienda
  const result = Array.from(housingMap.values()).map(h => {
    const totalPropiedad = Math.round(
      h.propietarios.reduce((acc, p) => acc + (p.porcentaje || 0), 0) * 100
    ) / 100;

    let status = 'Listo';
    let statusType = 'ready'; // 'ready' | 'warning' | 'error'

    if (h.propietarios.length === 0) {
      status = 'Sin propietarios';
      statusType = 'error';
    } else if (totalPropiedad < 100) {
      status = 'Falta propietario (' + totalPropiedad + ' %)';
      statusType = 'warning';
    } else if (totalPropiedad > 100) {
      status = 'Exceso cuota (' + totalPropiedad + ' %)';
      statusType = 'error';
    } else {
      const hasVulnerable = h.propietarios.some(p => p.vulnerabilidad);
      status = hasVulnerable ? 'Listo (Vulnerabilidad SÍ)' : 'Listo';
      statusType = 'ready';
    }

    return {
      ...h,
      totalPropiedad,
      status,
      statusType
    };
  });

  return result;
}
