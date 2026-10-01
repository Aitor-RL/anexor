import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Sliders, Check, Trash2, Crop, Sparkles, AlertCircle, RefreshCw, Link as LinkIcon, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { processSignatureCanvas } from '../services/signatureProcessor.js';
import { saveSignatureToDb, deleteSignatureFromDb } from '../services/signatureStore.js';

export function getDirectImageUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  // Enlace de Google Drive
  const driveMatch = trimmed.match(/(?:file\/d\/|id=|open\?id=)([a-zA-Z0-9_-]{25,})/);
  if (driveMatch && driveMatch[1]) {
    // lh3.googleusercontent.com suele permitir lectura directa de imagen
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }

  return trimmed;
}

export default function SignatureExtractorModal({
  propietario,
  currentSignatureUrl,
  onClose,
  onSignatureSaved
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [cropArea, setCropArea] = useState(null); // { x, y, width, height }
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  // Opciones de procesado
  const [threshold, setThreshold] = useState(145);
  const [contrast, setContrast] = useState(1.4);
  const [strokeColor, setStrokeColor] = useState('black'); // 'black' | 'darkblue'

  const [previewResultUrl, setPreviewResultUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(propietario?.anversoDni || '');
  const [urlError, setUrlError] = useState(null);

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Cargar imagen desde archivo
  const handleFileChange = (file) => {
    if (!file) return;
    setUrlError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
      setCropArea(null);
      setPreviewResultUrl(null);
    };
    reader.readAsDataURL(file);
  };

  // Cargar imagen desde URL / Anverso DNI
  const loadFromUrl = (urlToLoad) => {
    if (!urlToLoad) return;
    setUrlError(null);
    setLoadingUrl(true);

    const directUrl = getDirectImageUrl(urlToLoad);
    const testImg = new Image();
    testImg.crossOrigin = 'anonymous';

    testImg.onload = () => {
      setLoadingUrl(false);
      setImageSrc(directUrl);
      setCropArea(null);
      setPreviewResultUrl(null);
    };

    testImg.onerror = () => {
      setLoadingUrl(false);
      setUrlError('No se pudo cargar la imagen directamente por restricciones de CORS/privacidad. Abre el enlace, copia la imagen y pulsa Ctrl+V.');
    };

    testImg.src = directUrl;
  };

  // Intentar cargar automáticamente si el propietario ya trae un anversoDni
  useEffect(() => {
    if (propietario?.anversoDni) {
      loadFromUrl(propietario.anversoDni);
    }
  }, [propietario]);

  // Pegar imagen del portapapeles con Ctrl+V
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          handleFileChange(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Dibujar imagen y capa de selección en canvas
  const drawCanvas = (area = cropArea) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // 1. Dibujar imagen completa
    ctx.drawImage(img, 0, 0);

    // 2. Si hay área de recorte, dibujar sombra exterior y recuadro brillante
    if (area && area.width > 2 && area.height > 2) {
      // Sombra oscura semitransparente sobre toda la imagen
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Limpiar el agujero del recorte y redibujar la imagen nítida dentro
      ctx.clearRect(area.x, area.y, area.width, area.height);
      ctx.drawImage(
        img,
        area.x, area.y, area.width, area.height,
        area.x, area.y, area.width, area.height
      );

      // Marco azul con brillo
      ctx.strokeStyle = '#2563eb'; // blue-600
      ctx.lineWidth = Math.max(2, Math.round(canvas.width / 300));
      ctx.strokeRect(area.x, area.y, area.width, area.height);

      // Esquinas de guía
      const cornerLen = Math.min(16, area.width / 4, area.height / 4);
      ctx.strokeStyle = '#60a5fa'; // blue-400
      ctx.lineWidth = Math.max(3, Math.round(canvas.width / 200));

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(area.x, area.y + cornerLen);
      ctx.lineTo(area.x, area.y);
      ctx.lineTo(area.x + cornerLen, area.y);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(area.x + area.width - cornerLen, area.y);
      ctx.lineTo(area.x + area.width, area.y);
      ctx.lineTo(area.x + area.width, area.y + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(area.x, area.y + area.height - cornerLen);
      ctx.lineTo(area.x, area.y + area.height);
      ctx.lineTo(area.x + cornerLen, area.y + area.height);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(area.x + area.width - cornerLen, area.y + area.height);
      ctx.lineTo(area.x + area.width, area.y + area.height);
      ctx.lineTo(area.x + area.width, area.y + area.height - cornerLen);
      ctx.stroke();
    }
  };

  // Función para fijar el recorte estándar de firma de DNI español
  const resetToDniSignatureArea = (img) => {
    const targetImg = img || imgRef.current;
    if (!targetImg) return;
    // Zona exacta de firma manuscrita en DNI: parte inferior central/izquierda bajo NUM SOPORTE
    const defaultX = Math.round(targetImg.width * 0.12);
    const defaultY = Math.round(targetImg.height * 0.68);
    const defaultW = Math.round(targetImg.width * 0.38);
    const defaultH = Math.round(targetImg.height * 0.20);
    const initialArea = { x: defaultX, y: defaultY, width: defaultW, height: defaultH };
    setCropArea(initialArea);
    drawCanvas(initialArea);
    updateProcessedPreview(initialArea);
  };

  // Dibujar imagen en canvas cuando cargue
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      resetToDniSignatureArea(img);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Actualizar previsualización procesada al cambiar controles
  useEffect(() => {
    if (imgRef.current && cropArea) {
      drawCanvas(cropArea);
      updateProcessedPreview(cropArea);
    }
  }, [threshold, contrast, strokeColor, cropArea]);

  const updateProcessedPreview = (area) => {
    if (!imgRef.current || !area || area.width <= 5 || area.height <= 5) return;
    const cleanPngUrl = processSignatureCanvas(imgRef.current, area, {
      threshold,
      contrast,
      strokeColor,
      transparent: true,
      trimWhitespace: true
    });
    setPreviewResultUrl(cleanPngUrl);
  };

  // Micro-ajustes de posición y tamaño
  const nudgeCrop = (dx, dy, dw = 0, dh = 0) => {
    if (!cropArea || !imgRef.current) return;
    const img = imgRef.current;
    const newX = Math.max(0, Math.min(img.width - 20, cropArea.x + dx));
    const newY = Math.max(0, Math.min(img.height - 20, cropArea.y + dy));
    const newW = Math.max(20, Math.min(img.width - newX, cropArea.width + dw));
    const newH = Math.max(20, Math.min(img.height - newY, cropArea.height + dh));
    const newArea = { x: newX, y: newY, width: newW, height: newH };
    setCropArea(newArea);
    drawCanvas(newArea);
    updateProcessedPreview(newArea);
  };

  // Gestión de selección de área de recorte con el ratón
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const startX = (e.clientX - rect.left) * scaleX;
    const startY = (e.clientY - rect.top) * scaleY;

    setIsDragging(true);
    setDragStart({ x: startX, y: startY });
    const initialArea = { x: startX, y: startY, width: 0, height: 0 };
    setCropArea(initialArea);
    drawCanvas(initialArea);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    const width = Math.abs(currentX - dragStart.x);
    const height = Math.abs(currentY - dragStart.y);

    const currentArea = { x, y, width, height };
    setCropArea(currentArea);
    drawCanvas(currentArea);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    if (cropArea && cropArea.width > 10 && cropArea.height > 10) {
      drawCanvas(cropArea);
      updateProcessedPreview(cropArea);
    }
  };

  // Guardar firma en IndexedDB
  const handleSave = async () => {
    if (!previewResultUrl || !propietario?.dni) return;
    setSaving(true);
    try {
      await saveSignatureToDb(propietario.dni, previewResultUrl, {
        nombre: propietario.nombre
      });
      onSignatureSaved(propietario.dni, previewResultUrl);
      onClose();
    } catch (err) {
      alert('Error al guardar la firma: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar firma existente
  const handleDelete = async () => {
    if (!confirm('¿Eliminar la firma guardada para esta persona?')) return;
    try {
      await deleteSignatureFromDb(propietario.dni);
      onSignatureSaved(propietario.dni, null);
      onClose();
    } catch (err) {
      alert('Error al borrar firma: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Extractor y Limpiador de Firma de DNI
              </h3>
              <p className="text-xs text-slate-500">
                Titular: <strong className="text-slate-800">{propietario?.nombre || 'Propietario'}</strong> · DNI: <span className="font-mono font-bold text-blue-700">{propietario?.dni}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentSignatureUrl && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar firma</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!imageSrc ? (
            /* Zona de Carga Inicial */
            <div className="space-y-4">
              {/* Notificación si hay enlace Anverso DNI de la hoja */}
              {propietario?.anversoDni && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg mt-0.5 flex-shrink-0">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">
                        Enlace a Anverso DNI detectado en la hoja
                      </div>
                      <div className="text-slate-500 font-mono text-[11px] truncate max-w-md mt-0.5">
                        {propietario.anversoDni}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                    <a
                      href={propietario.anversoDni}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition shadow-2xs"
                    >
                      <span>Abrir imagen</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => loadFromUrl(propietario.anversoDni)}
                      disabled={loadingUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-2xs disabled:opacity-50"
                    >
                      {loadingUrl ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Cargando...</span>
                        </>
                      ) : (
                        <span>Cargar en extractor</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Error de URL / CORS si ocurre */}
              {urlError && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{urlError}</p>
                    {propietario?.anversoDni && (
                      <p className="text-[11px] text-amber-700">
                        👉 Abre el enlace en Drive, haz clic derecho en la foto del DNI &gt; <strong>Copiar imagen</strong>, y pulsa <kbd className="px-1 py-0.5 bg-white border border-amber-300 rounded font-mono">Ctrl+V</kbd> aquí.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Zona de Arrastrar / Subir Archivo */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-10 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/20 flex flex-col items-center justify-center space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                  accept="image/*,.pdf"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 border border-slate-200">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Sube o arrastra la foto del DNI / Firma</p>
                  <p className="text-xs text-slate-500 mt-1">
                    O pulsa <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[11px]">Ctrl+V</kbd> para pegar una captura del portapapeles
                  </p>
                </div>
              </div>

              {/* Carga por URL manual */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>O introduce / cambia el enlace web o Google Drive del DNI:</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/... o URL directa de imagen"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => loadFromUrl(urlInput)}
                    disabled={!urlInput.trim() || loadingUrl}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {loadingUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Cargar enlace</span>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Interfaz de Recorte y Calibración */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Visor de Recorte Canvas */}
              <div className="lg:col-span-2 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Crop className="w-3.5 h-3.5 text-blue-600" /> Encuadre de la firma:
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => resetToDniSignatureArea()}
                      className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition flex items-center gap-1 shadow-2xs text-[11px]"
                      title="Enfocar automáticamente la zona de la firma del DNI"
                    >
                      <span>🎯 Auto-centrar Firma</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-slate-600 hover:text-blue-600 flex items-center gap-1 font-medium text-[11px]"
                    >
                      <RefreshCw className="w-3 h-3" /> Cambiar foto
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="relative border border-slate-300 rounded-xl overflow-hidden bg-slate-900/5 max-h-[380px] flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className="max-w-full max-h-[380px] object-contain cursor-crosshair select-none"
                  />
                </div>

                {/* Barra de Micro-Ajuste de Posición */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <span className="text-[11px] font-medium text-slate-500">Mover / Ajustar recuadro:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => nudgeCrop(-6, 0)}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold hover:bg-slate-100 text-slate-700 shadow-2xs"
                      title="Mover a la izquierda"
                    >
                      ⬅️
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeCrop(6, 0)}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold hover:bg-slate-100 text-slate-700 shadow-2xs"
                      title="Mover a la derecha"
                    >
                      ➡️
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeCrop(0, -6)}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold hover:bg-slate-100 text-slate-700 shadow-2xs"
                      title="Mover hacia arriba"
                    >
                      ⬆️
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeCrop(0, 6)}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold hover:bg-slate-100 text-slate-700 shadow-2xs"
                      title="Mover hacia abajo"
                    >
                      ⬇️
                    </button>
                    <span className="text-slate-300 mx-1">|</span>
                    <button
                      type="button"
                      onClick={() => nudgeCrop(-4, -4, 8, 8)}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold hover:bg-slate-100 text-slate-700 shadow-2xs text-[11px]"
                      title="Agrandar recuadro"
                    >
                      ➕ Agrandar
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeCrop(4, 4, -8, -8)}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold hover:bg-slate-100 text-slate-700 shadow-2xs text-[11px]"
                      title="Reducir recuadro"
                    >
                      ➖ Reducir
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel Lateral: Calibración y Previsualización */}
              <div className="space-y-5 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" /> Ajuste de Limpieza
                  </h4>

                  {/* Sensibilidad / Umbral */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <label className="text-slate-600 font-medium">Limpieza de Fondo (Umbral):</label>
                      <span className="font-mono font-bold text-blue-600">{threshold}</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="220"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Más limpio</span>
                      <span>Trazo más grueso</span>
                    </div>
                  </div>

                  {/* Contraste */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <label className="text-slate-600 font-medium">Contraste de Tinta:</label>
                      <span className="font-mono font-bold text-blue-600">{contrast.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="2.5"
                      step="0.1"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Color de Tinta */}
                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1.5">Color del Trazo:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setStrokeColor('black')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                          strokeColor === 'black'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-black border border-white"></span>
                        <span>Negro Tinta</span>
                      </button>
                      <button
                        onClick={() => setStrokeColor('darkblue')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                          strokeColor === 'darkblue'
                            ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-700 border border-white"></span>
                        <span>Azul Bolígrafo</span>
                      </button>
                    </div>
                  </div>

                  {/* Previsualización del Trazo Aislado */}
                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1.5">Vista Previa de la Firma Extraída:</label>
                    <div className="h-28 rounded-xl border border-slate-200 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:8px_8px] bg-white flex items-center justify-center p-2 shadow-inner">
                      {previewResultUrl ? (
                        <img
                          src={previewResultUrl}
                          alt="Firma procesada"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400">Encuadra la firma en la imagen</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón Guardar */}
                <button
                  onClick={handleSave}
                  disabled={!previewResultUrl || saving}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Firma para {propietario?.dni}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
