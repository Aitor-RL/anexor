import React, { useState, useRef } from 'react';
import { UploadCloud, PlayCircle, Link2, AlertCircle, ClipboardCopy, FileSpreadsheet, Check, Sparkles, X, ChevronRight, Layers, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseRows } from '../services/dataParser.js';
import { sampleRows } from '../services/mockData.js';
import { extractImagesFromXlsx } from '../services/excelImageExtractor.js';

export default function DataImport({ onDataLoaded, loading }) {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'paste' | 'sheets'
  const [sheetUrl, setSheetUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fetchingSheets, setFetchingSheets] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [pendingWorkbook, setPendingWorkbook] = useState(null); // { workbook, sourceName, extractedImages, sheetsInfo }
  const fileInputRef = useRef(null);

  const processSheet = (workbook, sheetName, sourceName, extractedImages = null) => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error(`La hoja "${sheetName}" no existe en el libro.`);
      }

      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error(`La hoja "${sheetName}" está vacía o no contiene filas con datos legibles.`);
      }

      const housings = parseRows(rawRows, extractedImages);
      if (housings.length === 0) {
        throw new Error(`No se detectaron viviendas o copropietarios en la hoja "${sheetName}". Comprueba las columnas.`);
      }

      onDataLoaded(housings, `${sourceName} [${sheetName}]`);
      setErrorMsg('');
      setPendingWorkbook(null);
    } catch (err) {
      setErrorMsg('Error al procesar los datos: ' + err.message);
    } finally {
      setProcessingFile(false);
    }
  };

  const handleWorkbookLoaded = (workbook, sourceName, extractedImages = null) => {
    try {
      const sheetNames = workbook.SheetNames || [];
      if (sheetNames.length === 0) {
        throw new Error('El archivo Excel no contiene ninguna hoja válida.');
      }

      // Si tiene más de una hoja, mostramos el modal para que el usuario elija
      if (sheetNames.length > 1) {
        const sheetsInfo = sheetNames.map(name => {
          const ws = workbook.Sheets[name];
          const rowCount = ws ? (XLSX.utils.sheet_to_json(ws, { defval: '' }).length) : 0;
          return { name, rowCount };
        });

        setPendingWorkbook({
          workbook,
          sourceName,
          extractedImages,
          sheetsInfo
        });
        setProcessingFile(false);
      } else {
        // Si solo tiene 1 hoja, la procesamos directamente
        processSheet(workbook, sheetNames[0], sourceName, extractedImages);
      }
    } catch (err) {
      setErrorMsg('Error al inspeccionar las hojas del archivo: ' + err.message);
      setProcessingFile(false);
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    setErrorMsg('');
    setProcessingFile(true);
    setProcessingStatus('Leyendo archivo Excel...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setProcessingStatus('Analizando estructura del libro...');
        const buffer = new Uint8Array(e.target.result);
        const workbook = XLSX.read(buffer, { type: 'array' });

        // Extraer imágenes incrustadas dentro de las celdas del XLSX
        let extractedImages = null;
        if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
          try {
            extractedImages = await extractImagesFromXlsx(e.target.result, (msg) => {
              setProcessingStatus(msg);
            });
          } catch (imgErr) {
            console.warn('No se pudieron extraer imágenes del XLSX:', imgErr);
          }
        }

        setProcessingStatus('Organizando datos de viviendas...');
        handleWorkbookLoaded(workbook, file.name, extractedImages);
      } catch (err) {
        setErrorMsg('Error al leer el archivo: ' + err.message);
        setProcessingFile(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Error al abrir el archivo seleccionado.');
      setProcessingFile(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Pega primero el contenido de las celdas en el cuadro de texto.');
      return;
    }
    setErrorMsg('');
    setProcessingFile(true);
    setProcessingStatus('Procesando celdas pegadas...');
    try {
      // XLSX puede leer texto TSV (copiado con Ctrl+C de Google Sheets/Excel)
      const workbook = XLSX.read(pastedText.trim(), { type: 'string' });
      handleWorkbookLoaded(workbook, 'Celdas copiadas');
    } catch (err) {
      setErrorMsg('No se pudieron interpretar las celdas pegadas: ' + err.message);
      setProcessingFile(false);
    }
  };

  const handleSheetsConnect = async () => {
    const rawUrl = sheetUrl.trim();
    if (!rawUrl) return;
    setErrorMsg('');
    setFetchingSheets(true);
    setProcessingFile(true);
    setProcessingStatus('Conectando con Google Sheets...');

    try {
      let exportUrl = rawUrl;

      // Si es un enlace estándar de edición de Google Sheets:
      // https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit...
      const idMatch = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch && !rawUrl.includes('/pub?')) {
        const sheetId = idMatch[1];
        // Exportar como XLSX para traer las fotos incrustadas en celdas
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
      }

      let response;
      try {
        // Intento directo
        response = await fetch(exportUrl);
      } catch (directErr) {
        // Si falla por CORS directo, intentar con proxy CORS
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(exportUrl);
        response = await fetch(proxyUrl);
      }

      if (!response || !response.ok) {
        throw new Error('Google bloqueó el acceso directo. Asegúrate de que el documento esté compartido como "Cualquiera con el enlace puede ver".');
      }

      setProcessingStatus('Descargando archivo con fotos...');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

      // Extraer imágenes incrustadas dentro del XLSX de Google Sheets
      let extractedImages = null;
      try {
        extractedImages = await extractImagesFromXlsx(arrayBuffer, (msg) => {
          setProcessingStatus(msg);
        });
      } catch (imgErr) {
        console.warn('No se pudieron extraer imágenes desde Google Sheets:', imgErr);
      }

      setProcessingStatus('Procesando viviendas...');
      handleWorkbookLoaded(workbook, 'Google Sheets', extractedImages);
    } catch (err) {
      setErrorMsg(
        'No se pudo descargar automáticamente desde el enlace de Google Sheets debido a las restricciones de privacidad de Google (CORS). ' +
        'Solución recomendada: en Google Sheets pulsa "Archivo > Descargar > Microsoft Excel (.xlsx)" y súbelo en la pestaña "Subir Archivo (.xlsx)". ¡Así las fotos se importan automáticamente!'
      );
      setProcessingFile(false);
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
          onClick={() => !processingFile && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition ${
            processingFile
              ? 'border-blue-400 bg-blue-50/40 cursor-wait'
              : 'border-slate-200 hover:border-blue-500 cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 group'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            disabled={processingFile}
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          {processingFile ? (
            <div className="py-3 flex flex-col items-center space-y-3 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-blue-100 flex items-center justify-center text-blue-600">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {processingStatus || 'Procesando archivo...'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Descomprimiendo celdas y extrayendo fotos del DNI incrustadas...
                </p>
              </div>
              <div className="w-48 h-1.5 bg-blue-100 rounded-full overflow-hidden mt-2">
                <div className="w-full h-full bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Haz clic para seleccionar o arrastra tu archivo aquí</p>
              <p className="text-xs text-slate-500 mt-1">
                Compatible con libros de <strong>Excel (.xlsx / .xls)</strong> y <strong>Google Sheets descargado como .xlsx</strong>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Extrae automáticamente fotos incrustadas en celdas (.xlsx)</span>
                </span>
                <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  Procesamiento 100% privado en tu navegador
                </span>
              </div>
            </>
          )}
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

      {/* Modal Selector de Hoja de Excel */}
      {pendingWorkbook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            {/* Cabecera */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Selecciona la Hoja a Procesar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Archivo: <strong className="text-slate-700">{pendingWorkbook.sourceName}</strong> ({pendingWorkbook.sheetsInfo.length} hojas detectadas)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPendingWorkbook(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Hojas */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
              <p className="text-xs text-slate-600 mb-3">
                El libro contiene varias hojas. ¿Cuál de ellas deseas cargar para generar los Anexos?
              </p>

              {pendingWorkbook.sheetsInfo.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => processSheet(pendingWorkbook.workbook, s.name, pendingWorkbook.sourceName, pendingWorkbook.extractedImages)}
                  className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer transition shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-600 flex items-center justify-center font-bold text-xs transition">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-blue-700 transition">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {s.rowCount > 0 ? `${s.rowCount} filas de datos detectadas` : 'Hoja sin filas detectadas'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 bg-white group-hover:bg-blue-600 text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-blue-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                  >
                    <span>Cargar hoja</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Pie */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPendingWorkbook(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

