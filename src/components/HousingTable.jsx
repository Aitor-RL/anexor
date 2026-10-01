import React from 'react';
import { Eye, Download, CheckCircle2, AlertTriangle, XCircle, Home, UserCheck, HeartHandshake, PenTool } from 'lucide-react';

export default function HousingTable({
  housings,
  selectedIds,
  signaturesMap = {},
  onOpenSignatureModal,
  onToggleSelect,
  onSelectAll,
  onPreviewPdf,
  onDownloadSinglePdf
}) {
  const allSelected = housings.length > 0 && selectedIds.length === housings.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Comprobación de Datos por Vivienda</h3>
          <p className="text-xs text-slate-500">
            {housings.length} inmuebles detectados · 1 Anexo II por cada vivienda
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onSelectAll}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Seleccionar todos</span>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
            <tr>
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4">Vivienda / Inmueble</th>
              <th className="py-3 px-4">Propietarios y Firmas DNI</th>
              <th className="py-3 px-4 text-center">Propiedad</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {housings.map((h) => {
              const isSelected = selectedIds.includes(h.id);
              const is100 = h.totalPropiedad === 100;

              return (
                <tr
                  key={h.id}
                  className={'hover:bg-slate-50/80 transition ' + (isSelected ? 'bg-blue-50/30' : '')}
                >
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(h.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>

                  {/* Vivienda e Inmueble */}
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Home className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{h.label}</div>
                        {h.direccion && (
                          <div className="text-[11px] text-slate-500 font-normal">{h.direccion}</div>
                        )}
                        {h.referenciaCatastral && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {h.referenciaCatastral}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Propietarios y firmas */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5">
                      {h.propietarios.map((p, idx) => {
                        const cleanDni = String(p.dni || '').trim().toUpperCase();
                        const hasSignature = cleanDni && Boolean(signaturesMap[cleanDni]);

                        return (
                          <div key={idx} className="flex flex-wrap items-center gap-1.5 text-xs py-0.5">
                            <span className="font-medium text-slate-800">{p.nombre || 'Sin nombre'}</span>
                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {p.dni || 'Sin DNI'}
                            </span>
                            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              {p.porcentaje}%
                            </span>
                            {p.vulnerabilidad && (
                              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                <HeartHandshake className="w-3 h-3" /> Vulnerable
                              </span>
                            )}
                            {p.dni && onOpenSignatureModal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenSignatureModal(p);
                                }}
                                title={hasSignature ? 'Firma DNI digitalizada y guardada. Clic para ver o cambiar' : 'Extraer y limpiar firma desde foto del DNI'}
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border transition shadow-2xs ${
                                  hasSignature
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 border-dashed'
                                }`}
                              >
                                {hasSignature ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>✍️ Firma lista</span>
                                  </>
                                ) : (
                                  <>
                                    <PenTool className="w-2.5 h-2.5 text-slate-400" />
                                    <span>+ Firma DNI</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Propiedad Total */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={
                          'font-bold text-xs px-2 py-0.5 rounded-full border ' +
                          (is100
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200')
                        }
                      >
                        {h.totalPropiedad} %
                      </span>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="py-3.5 px-4">
                    {h.statusType === 'ready' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {h.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {h.status}
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => onPreviewPdf(h)}
                        title="Previsualizar Anexo II"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDownloadSinglePdf(h)}
                        title="Descargar PDF individual"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50 transition"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
