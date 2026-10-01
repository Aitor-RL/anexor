# Anexor - Generador de Anexos II (VI406F - Xunta de Galicia)

Aplicación web local **100% Frontend (React + Vite + Tailwind CSS)** para procesar datos de convocatorias de rehabilitación de edificios, validar inmuebles y copropietarios, y generar automáticamente los formularios oficiales del **Anexo II** en PDF y en lote comprimido ZIP.

---

## 🔒 Privacidad y Rendimiento
* **Todo en memoria local:** Los DNI, nombres y datos de los vecinos **nunca viajan a ningún servidor**. Todo el procesamiento de Excel, PDFs y ZIPs se ejecuta en tu propio navegador.
* **Sin backend ni dependencias externas:** No requiere arrancar servidores Node/Python adicionales ni configurar bases de datos.

---

## 🚀 Inicio Rápido

### Opción 1: Lanzador directo (Windows)
Haz doble clic en el archivo `iniciar_anexor.bat`. Automáticamente abrirá tu navegador en:
```
http://localhost:5173
```

### Opción 2: Desde la consola
```bash
npm run dev
```

---

## 📋 Características Principales

1. **Plantilla Oficial VI406F del IGVS:** Rellenado vectorial de campos interactivos oficiales (`public/anexo_ii_template.pdf`).
2. **Agrupación Inteligente por Inmueble:** Agrupa copropietarios por `Piso` + `Puerta/Letra` y `Referencia Catastral`.
3. **Validación Automática de Cuotas:** Comprueba que la propiedad sume el 100% y alerta de cuotas incompletas o excesos.
4. **Vulnerabilidad Económica y Menores:** Marcado automático de casillas de comprobación y consentimiento.
5. **Configuración de Firma y Fecha:** Selector personalizable en la cabecera (ej: *Vigo, a 17 de septiembre de 2024*).
6. **Previsualización en Tiempo Real:** Visor PDF en modal para verificar el documento antes de imprimirlo o descargarlo.
7. **Descarga Masiva en ZIP:** Genera y empaqueta en segundos todos los Anexos II en un archivo `.zip`.
8. **Múltiples Fuentes de Entrada:** Carga directa de `.xlsx`, `.xls`, `.csv`, o enlace compartido de Google Sheets.
