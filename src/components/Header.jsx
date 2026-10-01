import React, { useState } from 'react';
import { FileText, Calendar, MapPin, Settings2 } from 'lucide-react';

export default function Header({ options, onOptionsChange }) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Anexor</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                VI406F - Anexo II
              </span>
            </div>
            <p className="text-xs text-slate-500">Comprobación de copropietarios y generación oficial IGVS</p>
          </div>
        </div>

        {/* Configuración de Lugar y Fecha de firma */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Lugar y Fecha: <strong className="text-slate-900">{options.localidad}, {options.dia}/{options.mes}/{options.ano}</strong></span>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 lg:px-8 py-3 transition">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4 text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Pie del Anexo:
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500">Localidad:</label>
              <input
                type="text"
                value={options.localidad}
                onChange={(e) => onOptionsChange({ ...options, localidad: e.target.value })}
                className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white focus:outline-blue-500"
                placeholder="ej. Vigo"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500">Día:</label>
              <input
                type="text"
                value={options.dia}
                onChange={(e) => onOptionsChange({ ...options, dia: e.target.value })}
                className="w-12 px-2 py-1 text-xs rounded border border-slate-300 bg-white text-center focus:outline-blue-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500">Mes:</label>
              <input
                type="text"
                value={options.mes}
                onChange={(e) => onOptionsChange({ ...options, mes: e.target.value })}
                className="w-28 px-2.5 py-1 text-xs rounded border border-slate-300 bg-white focus:outline-blue-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500">Año:</label>
              <input
                type="text"
                value={options.ano}
                onChange={(e) => onOptionsChange({ ...options, ano: e.target.value })}
                className="w-16 px-2 py-1 text-xs rounded border border-slate-300 bg-white text-center focus:outline-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
