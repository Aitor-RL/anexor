import React, { useState, useRef } from 'react';
import { UploadCloud, PlayCircle, Link2, AlertCircle, ClipboardCopy, FileSpreadsheet, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseRows } from '../services/dataParser.js';
import { sampleRows } from '../services/mockData.js';

export default function DataImport({ onDataLoaded, loading }) {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'paste' | 'sheets'
  const [sheetUrl, setSheetUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fetchingSheets, setFetchingSheets] = useState(false);
  const fileInputRef = useRef(null);

  const processWorkbook = (workbook, sourceName) => {
    try {
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error('La hoja está vacía o no contiene filas con datos legibles.');
      }

      const housings = parseRows(rawRows);
      if (housings.length === 0) {
        throw new Error('No se detectaron viviendas o copropietarios en el documento.');
      }

      onDataLoaded(housings, sourceName);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Error al procesar los datos: ' + err.message);
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target.result);
        const workbook = XLSX.read(buffer, { type: 'array' });
        processWorkbook(workbook, file.name);
      } catch (err) {
        setErrorMsg('Error al leer el archivo: ' + err.message);
      }
    };
    reader.onerror = () => setErrorMsg('Error al abrir el archivo seleccionado.');
    reader.readAsArrayBuffer(file);
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Pega primero el contenido de las celdas en el cuadro de texto.');
      return;
    }
    setErrorMsg('');
    try {
      // XLSX puede leer texto TSV (copiado con Ctrl+C de Google Sheets/Excel)
      const workbook = XLSX.read(pastedText.trim(), { type: 'string' });
      processWorkbook(workbook, 'Celdas copiadas');
    } catch (err) {
      setErrorMsg('No se pudieron interpretar las celdas pegadas: ' + err.message);
    }
  };

  const handleSheetsConnect = async () => {
    const rawUrl = sheetUrl.trim();
    if (!rawUrl) return;
    setErrorMsg('');
    setFetchingSheets(true);

    try {
      let exportUrl = rawUrl;

      // Si es un enlace estándar de edición de Google Sheets:
      // https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit...
      const idMatch = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch && !rawUrl.includes('/pub?')) {
        const sheetId = idMatch[1];
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      }

      let response;
      try {
        // Intento directo
        response = await fetch(exportUrl);
      } catch (directErr) {
        // Si falla por CORS directo, intentar con proxy de lectura CORS
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(exportUrl);
        response = await fetch(proxyUrl);
      }

      if (!response || !response.ok) {
        throw new Error('Google bloqueó el acceso directo. Asegúrate de que el documento esté compartido como "Cualquiera con el enlace puede ver".');
      }

      const csvData = await response.text();
      if (!csvData || csvData.trim().startsWith('<!DOCTYPE html>')) {
        throw new Error('Google devolvió una página de acceso o inicio de sesión en lugar del archivo CSV.');
      }

      const workbook = XLSX.read(csvData, { type: 'string' });
      processWorkbook(workbook, 'Google Sheets');
    } catch (err) {
      setErrorMsg(
        'No se pudo descargar automáticamente desde el enlace de Google Sheets debido a las restricciones de privacidad de Google (CORS). ' +
        'Recomendación: abre tu Google Sheet, selecciona las filas (Ctrl+A o con el ratón), pulsa Ctrl+C y pégalas directamente en la pestaña "📋 Copiar y Pegar".'
      );
    } finally {
      setFetchingSheets(false);
    }
  };

  const handleLoadSample = () => {
    setErrorMsg('');
    const housings = parseRows(sampleRows);
    onDataLoaded(housings, 'Datos de prueba');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      {/* Cabecera del Importador */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Origen de Datos</h2>
          <p className="text-xs text-slate-500">Carga tus datos reales desde Excel (.xlsx), CSV o directamente desde Google Sheets</p>
        </div>
        <button
          onClick={handleLoadSample}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
          title="Carga datos inventados para ver el funcionamiento"
        >
          <PlayCircle className="w-4 h-4 text-slate-500" />
          <span>Cargar datos de prueba</span>
        </button>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-200 mb-5 gap-2">
        <button
          onClick={() => { setActiveTab('file'); setErrorMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'file'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Subir Archivo (.xlsx / .csv)</span>
        </button>
        <button
          onClick={() => { setActiveTab('paste'); setErrorMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'paste'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardCopy className="w-4 h-4" />
          <span>Copiar y Pegar (Google Sheets / Excel)</span>
        </button>
        <button
          onClick={() => { setActiveTab('sheets'); setErrorMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'sheets'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Enlace Google Sheets</span>
        </button>
      </div>

      {/* Pestaña 1: Subir Archivo Excel o CSV */}
      {activeTab === 'file' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/20 group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Haz clic para seleccionar o arrastra tu archivo aquí</p>
          <p className="text-xs text-slate-500 mt-1">
            Compatible tanto con libros de <strong>Excel (.xlsx / .xls)</strong> como archivos <strong>CSV (.csv)</strong>
          </p>
          <span className="mt-3 text-[11px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            Procesamiento 100% privado en tu navegador
          </span>
        </div>
      )}

      {/* Pestaña 2: Copiar y Pegar Celdas Directamente */}
      {activeTab === 'paste' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700">
              Selecciona las filas en tu hoja de cálculo, pulsa <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono">Ctrl+C</kbd> y pégalas aquí con <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono">Ctrl+V</kbd>:
            </label>
            {pastedText && (
              <button
                onClick={() => setPastedText('')}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Limpiar texto
              </button>
            )}
          </div>
          <textarea
            rows={5}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Comp	Piso	Letra	REFERENCIA CATASTRAL	DIRECCIÓN	USO	SUP. CONSTRUIDA (m2)	AÑO	% PROPIEDAD	Propietario/a	DNI...&#10;X	-1	1	3664409NG2736S0001BB	RU AREAL 78 Es:E Pl:-1 Pt:01	Almacén...	50	ELISA TORRÓN MARTÍNEZ	33813570M..."
            className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-blue-500 resize-y"
          />
          <div className="flex justify-end">
            <button
              onClick={handleProcessPastedText}
              disabled={!pastedText.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
            >
              Procesar Celdas Copiadas
            </button>
          </div>
        </div>
      )}

      {/* Pestaña 3: Enlace Google Sheets */}
      {activeTab === 'sheets' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Introduce la URL de tu Google Sheet compartido (asegúrate de que en <em>Compartir</em> esté marcado como <strong>"Cualquier persona con el enlace"</strong>):
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-blue-500"
            />
            <button
              onClick={handleSheetsConnect}
              disabled={!sheetUrl.trim() || fetchingSheets}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            >
              {fetchingSheets ? 'Cargando...' : 'Cargar Hoja'}
            </button>
          </div>
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
            <p className="font-semibold">💡 Consejo sobre Google Sheets:</p>
            <p>
              Google a menudo bloquea las descargas directas desde navegadores por política CORS. Si tu hoja te da error, la forma más instantánea es ir a la pestaña <strong>"Copiar y Pegar"</strong>, seleccionar las filas en Google Sheets, pulsar <strong>Ctrl+C</strong> y pegarlas.
            </p>
          </div>
        </div>
      )}

      {/* Mensaje de Error */}
      {errorMsg && (
        <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorMsg}</div>
        </div>
      )}
    </div>
  );
}

