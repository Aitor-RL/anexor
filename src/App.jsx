import React, { useState } from 'react';
import Header from './components/Header.jsx';
import DataImport from './components/DataImport.jsx';
import HousingTable from './components/HousingTable.jsx';
import Anexo3Section from './components/Anexo3Section.jsx';
import PdfModal from './components/PdfModal.jsx';
import { FileArchive, CheckCircle, AlertCircle, Building, Loader2, FileSpreadsheet, Building2, Layers } from 'lucide-react';
import { parseRows } from './services/dataParser.js';
import { generateAnexoPdf } from './services/pdfService.js';
import { generateZipBundle } from './services/zipService.js';

export default function App() {
  const [housings, setHousings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingZip, setGeneratingZip] = useState(false);
  const [previewPdf, setPreviewPdf] = useState(null);
  const [sourceName, setSourceName] = useState('');
  const [activeTab, setActiveTab] = useState('anexo2'); // 'anexo2' | 'anexo3'

  // Configuración de firma
  const [options, setOptions] = useState({
    localidad: 'Vigo',
    dia: new Date().getDate().toString(),
    mes: new Date().toLocaleString('es-ES', { month: 'long' }),
    ano: new Date().getFullYear().toString()
  });

  // La app inicia limpia sin datos de ejemplo cargados
  const handleDataLoaded = (newHousings, name) => {
    setHousings(newHousings);
    setSelectedIds(newHousings.filter(h => h.statusType === 'ready').map(h => h.id));
    setSourceName(name || 'Documento cargado');
  };

  const handleClearData = () => {
    setHousings([]);
    setSelectedIds([]);
    setSourceName('');
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === housings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(housings.map(h => h.id));
    }
  };

  // Previsualizar PDF individual de Anexo II
  const handlePreviewPdf = async (housing) => {
    setLoading(true);
    try {
      const pdfBytes = await generateAnexoPdf(housing, options);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = 'Anexo_II_' + (housing.label || 'vivienda').replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
      setPreviewPdf({ url, filename });
    } catch (err) {
      alert('Error al generar vista previa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Descarga directa individual
  const handleDownloadSinglePdf = async (housing) => {
    try {
      const pdfBytes = await generateAnexoPdf(housing, options);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Anexo_II_' + (housing.label || 'vivienda').replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar el PDF: ' + err.message);
    }
  };

  // Descarga en lote como ZIP
  const handleDownloadZip = async () => {
    const selectedHousings = housings.filter(h => selectedIds.includes(h.id));
    if (selectedHousings.length === 0) {
      alert('Selecciona al menos una vivienda para generar el lote.');
      return;
    }

    setGeneratingZip(true);
    try {
      const zipBlob = await generateZipBundle(selectedHousings, options);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Anexos_II_Convocatoria.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al empaquetar el archivo ZIP: ' + err.message);
    } finally {
      setGeneratingZip(false);
    }
  };

  // Métricas
  const totalViviendas = housings.length;
  const listos = housings.filter(h => h.statusType === 'ready').length;
  const incompletos = housings.filter(h => h.statusType !== 'ready').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">
      <Header options={options} onOptionsChange={setOptions} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1">
        <DataImport onDataLoaded={handleDataLoaded} loading={loading} />

        {/* Si hay datos cargados, mostrar barra de estado y pestañas de selección de documento */}
        {housings.length > 0 && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Hoja activa:</span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100">{sourceName}</span>
              </div>

              {/* Selector de Modo Anexo II / Anexo III */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActiveTab('anexo2')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'anexo2'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>📑 Anexos II (Por Vivienda)</span>
                </button>
                <button
                  onClick={() => setActiveTab('anexo3')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'anexo3'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>🏛️ Anexo III (Certificado Edificio)</span>
                </button>
              </div>

              <button
                onClick={handleClearData}
                className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline flex items-center gap-1 self-end sm:self-auto"
              >
                Limpiar datos
              </button>
            </div>

            {/* SECCIÓN ANEXO II */}
            {activeTab === 'anexo2' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{totalViviendas}</div>
                      <div className="text-xs text-slate-500 font-medium">Viviendas / Inmuebles</div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">{listos}</div>
                      <div className="text-xs text-slate-500 font-medium">Listas para Anexo (100%)</div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-600">{incompletos}</div>
                      <div className="text-xs text-slate-500 font-medium">Incompletas / Pendientes</div>
                    </div>
                  </div>
                </div>

                <HousingTable
                  housings={housings}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onPreviewPdf={handlePreviewPdf}
                  onDownloadSinglePdf={handleDownloadSinglePdf}
                />
              </>
            )}

            {/* SECCIÓN ANEXO III */}
            {activeTab === 'anexo3' && (
              <Anexo3Section
                housings={housings}
                options={options}
                onPreviewPdf={setPreviewPdf}
              />
            )}
          </>
        )}

        {/* Estado Vacío */}
        {housings.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Building className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Sin datos de convocatoria cargados</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Utiliza el panel superior para subir tu archivo Excel (.xlsx / .csv), copiar y pegar las celdas, o probar con el botón "Cargar datos de prueba".
            </p>
          </div>
        )}
      </main>

      {/* Barra de acción inferior flotante (Solo visible en Modo Anexo II) */}
      {housings.length > 0 && activeTab === 'anexo2' && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-4 sm:px-6 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span><strong>{selectedIds.length}</strong> de <strong>{housings.length}</strong> Anexos II seleccionados para generar</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleDownloadZip}
                disabled={generatingZip || selectedIds.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingZip ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Empaquetando ZIP en el navegador...</span>
                  </>
                ) : (
                  <>
                    <FileArchive className="w-4 h-4" />
                    <span>Descargar ZIP con Anexos II ({selectedIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de previsualización (compatible con Anexo II y Anexo III) */}
      {previewPdf && (
        <PdfModal
          pdfUrl={previewPdf.url}
          filename={previewPdf.filename}
          onClose={() => {
            URL.revokeObjectURL(previewPdf.url);
            setPreviewPdf(null);
          }}
        />
      )}
    </div>
  );
}
