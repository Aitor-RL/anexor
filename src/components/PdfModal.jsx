import React from 'react';
import { X, Download, ExternalLink, FileCheck } from 'lucide-react';

export default function PdfModal({ pdfUrl, filename, onClose }) {
  if (!pdfUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{filename || 'Vista Previa del Anexo II'}</h3>
              <p className="text-[11px] text-slate-500">Documento oficial rellenado con los datos del inmueble</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              download={filename || 'Anexo_II.pdf'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
            </a>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en pestaña</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visor PDF */}
        <div className="flex-1 bg-slate-100 p-1">
          <iframe
            src={pdfUrl}
            className="w-full h-full rounded-b-xl border-0"
            title="Vista Previa PDF"
          />
        </div>
      </div>
    </div>
  );
}
