import React, { useState, useEffect } from 'react';
import { Building2, UserCheck, FileText, Download, Eye, Save, Sparkles, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { generateAnexo3Pdf } from '../services/anexo3Service.js';

export default function Anexo3Section({
  housings = [],
  options,
  onPreviewPdf
}) {
  const [communityData, setCommunityData] = useState(() => {
    const saved = localStorage.getItem('anexor_community_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return {
      nombreComunidad: 'COMUNIDAD DE PROPIETARIOS',
      nifComunidad: 'H',
      presidenteNombre: '',
      presidenteApel1: '',
      presidenteApel2: '',
      presidenteDni: '',
      secretarioNombre: '',
      secretarioApel1: '',
      secretarioApel2: '',
      secretarioDni: '',
      fechaReunion: new Date().toLocaleDateString('es-ES'),
      obras: 'REHABILITACIÓN ENERGÉTICA Y CONSERVACIÓN CONFORME A PROYECTO',
      presupuesto: '',
      representanteNombre: '',
      representanteDni: '',
      totalViviendasManual: '',
      totalParticipesManual: '',
      supLocalesManual: '',
      supLocalesParticipesManual: ''
    };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Autoguardado en localStorage
  useEffect(() => {
    localStorage.setItem('anexor_community_data', JSON.stringify(communityData));
  }, [communityData]);

  // Contadores automáticos
  const totalComuneros = housings.reduce((acc, h) => acc + (h.propietarios ? h.propietarios.length : 0), 0);
  const totalParticipes = totalComuneros; // Todos los de la tabla que participan
  const totalCuotaSuma = Math.round(
    housings.reduce((acc, h) => acc + (h.totalPropiedad || 0), 0) * 100
  ) / 100;

  const totalJuegosEstimados = Math.max(1, Math.ceil(totalComuneros / 12));
  const totalPaginasEstimadas = totalJuegosEstimados * 2;

  const handlePreview = async () => {
    setGenerating(true);
    try {
      const pdfBytes = await generateAnexo3Pdf(housings, communityData, options);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = `Anexo_III_${(communityData.nombreComunidad || 'Comunidad').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      onPreviewPdf({ url, filename });
    } catch (err) {
      alert('Error al generar vista previa del Anexo III: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const pdfBytes = await generateAnexo3Pdf(housings, communityData, options);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Anexo_III_${(communityData.nombreComunidad || 'Comunidad').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar el Anexo III: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen Métrico del Anexo III */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{totalComuneros}</div>
              <div className="text-xs text-slate-500 font-medium">Comuneros en Tabla (b)</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-600">{totalParticipes}</div>
              <div className="text-xs text-slate-500 font-medium">Partícipes en Tabla (c)</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-blue-600">{totalPaginasEstimadas} págs</div>
              <div className="text-xs text-slate-500 font-medium">{totalJuegosEstimados} juegos generados</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
              totalCuotaSuma === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              %
            </div>
            <div>
              <div className={`text-xl font-bold ${totalCuotaSuma === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalCuotaSuma} %
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {totalCuotaSuma === 100 ? 'Suma 100% Cuota' : 'Cuota no suma 100%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de Datos de la Comunidad */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Datos Oficiales del Acuerdo y la Comunidad</h3>
              <p className="text-xs text-slate-500">Estos campos se estamparán en el certificado oficial del Anexo III</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              disabled={generating || housings.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Previsualizar Anexo III</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={generating || housings.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Anexo III (PDF)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Bloque 1: Comunidad */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              🏢 Comunidad Solicitante
            </h4>
            <div>
              <label className="text-slate-500 block mb-1">Nombre de la Comunidad:</label>
              <input
                type="text"
                value={communityData.nombreComunidad}
                onChange={e => setCommunityData({ ...communityData, nombreComunidad: e.target.value })}
                placeholder="ej: COMUNIDAD DE PROPIETARIOS DE NICARAGUA 6"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">NIF / CIF Comunidad:</label>
              <input
                type="text"
                value={communityData.nifComunidad}
                onChange={e => setCommunityData({ ...communityData, nifComunidad: e.target.value })}
                placeholder="ej: H36712248"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* Bloque 2: Presidencia */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              👑 Presidencia
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-slate-500 block mb-1">Nombre:</label>
                <input
                  type="text"
                  value={communityData.presidenteNombre}
                  onChange={e => setCommunityData({ ...communityData, presidenteNombre: e.target.value })}
                  placeholder="SONIA"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
                />
              </div>
              <div className="col-span-1">
                <label className="text-slate-500 block mb-1">1º Apellido:</label>
                <input
                  type="text"
                  value={communityData.presidenteApel1}
                  onChange={e => setCommunityData({ ...communityData, presidenteApel1: e.target.value })}
                  placeholder="RAVIÑA"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
                />
              </div>
              <div className="col-span-1">
                <label className="text-slate-500 block mb-1">2º Apellido:</label>
                <input
                  type="text"
                  value={communityData.presidenteApel2}
                  onChange={e => setCommunityData({ ...communityData, presidenteApel2: e.target.value })}
                  placeholder="CASTIÑEIRAS"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-500 block mb-1">NIF Presidencia:</label>
              <input
                type="text"
                value={communityData.presidenteDni}
                onChange={e => setCommunityData({ ...communityData, presidenteDni: e.target.value })}
                placeholder="ej: 36112013N"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* Bloque 3: Secretaría / Administración */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              📋 Secretaría / Administración
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-slate-500 block mb-1">Nombre:</label>
                <input
                  type="text"
                  value={communityData.secretarioNombre}
                  onChange={e => setCommunityData({ ...communityData, secretarioNombre: e.target.value })}
                  placeholder="MARIA TERESA"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
                />
              </div>
              <div className="col-span-1">
                <label className="text-slate-500 block mb-1">1º Apellido:</label>
                <input
                  type="text"
                  value={communityData.secretarioApel1}
                  onChange={e => setCommunityData({ ...communityData, secretarioApel1: e.target.value })}
                  placeholder="VAZQUEZ"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
                />
              </div>
              <div className="col-span-1">
                <label className="text-slate-500 block mb-1">2º Apellido:</label>
                <input
                  type="text"
                  value={communityData.secretarioApel2}
                  onChange={e => setCommunityData({ ...communityData, secretarioApel2: e.target.value })}
                  placeholder="BLANCO"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-500 block mb-1">NIF Secretaría / Administración:</label>
              <input
                type="text"
                value={communityData.secretarioDni}
                onChange={e => setCommunityData({ ...communityData, secretarioDni: e.target.value })}
                placeholder="ej: 36114127X"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* Bloque 4: Datos del Acuerdo y Junta */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 lg:col-span-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              📜 Certificado del Acuerdo de Junta
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 block mb-1">Fecha de la Reunión/Junta:</label>
                <input
                  type="text"
                  value={communityData.fechaReunion}
                  onChange={e => setCommunityData({ ...communityData, fechaReunion: e.target.value })}
                  placeholder="ej: 01/04/2024"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Presupuesto de las Obras (€):</label>
                <input
                  type="text"
                  value={communityData.presupuesto}
                  onChange={e => setCommunityData({ ...communityData, presupuesto: e.target.value })}
                  placeholder="ej: 897.569,02"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono focus:outline-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-500 block mb-1">Descripción de las Obras:</label>
              <input
                type="text"
                value={communityData.obras}
                onChange={e => setCommunityData({ ...communityData, obras: e.target.value })}
                placeholder="ej: REHABILITACIÓN ENERGÉTICA Y CONSERVACIÓN CONFORME PROYECTO REDACTADO POR D. PABLO OTERO SOBRINO"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* Bloque 5: Representante Facultado */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              🤝 Representante Facultado
            </h4>
            <div>
              <label className="text-slate-500 block mb-1">Nombre Representante:</label>
              <input
                type="text"
                value={communityData.representanteNombre}
                onChange={e => setCommunityData({ ...communityData, representanteNombre: e.target.value })}
                placeholder="ej: D. PABLO OTERO SOBRINO"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">DNI Representante:</label>
              <input
                type="text"
                value={communityData.representanteDni}
                onChange={e => setCommunityData({ ...communityData, representanteDni: e.target.value })}
                placeholder="ej: 35324302M"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono focus:outline-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
