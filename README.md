# Interpretador EDI - Sistema de Gestión Portuaria

Sistema web para interpretar y visualizar documentos EDI en formato EDIFACT BAPLIE (manifiestos de carga de contenedores).

## Características

- **Carga de archivos EDI**: Soporte drag & drop y selección manual
- **Visualización clara**: Tabla ejecutiva con información procesada
- **Búsqueda y filtros**: Buscar por contenedor, filtrar por destino y estado
- **Estadísticas en tiempo real**: Total de contenedores, peso, refrigerados, dañados
- **Exportación**: A Excel y CSV
- **100% Frontend**: No requiere servidor, funciona completamente en el navegador

## Estructura del Proyecto

```
proEDI/
├── index.html                          # Página principal
├── css/
│   └── style.css                       # Estilos de la aplicación
├── js/
│   ├── edi-parser.js                   # Parser EDIFACT BAPLIE
│   └── app.js                          # Lógica principal
├── PLAN_IMPLEMENTACION.md              # Plan detallado del proyecto
├── README.md                           # Este archivo
└── Mv Cs Service SR25050EB Wk0226 Arrival Plan ECPBO.edi  # Archivo de ejemplo
```

## Cómo Usar

### 1. Abrir la aplicación

Simplemente abre el archivo `index.html` en tu navegador web preferido:
- Chrome
- Firefox
- Safari
- Edge

**Nota**: No necesitas instalar nada ni configurar un servidor.

### 2. Cargar un archivo EDI

Hay dos formas de cargar un archivo:

**Opción A: Drag & Drop**
1. Arrastra tu archivo .edi desde el explorador de archivos
2. Suéltalo en la zona de carga

**Opción B: Selección manual**
1. Haz clic en el botón "Seleccionar Archivo"
2. Navega hasta tu archivo .edi
3. Haz clic en "Abrir"

### 3. Explorar la información

Una vez cargado el archivo, verás:

#### Información del Viaje
- Nombre del buque
- Número de viaje
- Puerto de origen
- Puerto de destino
- Fecha de llegada estimada

#### Estadísticas
- Total de contenedores
- Peso total en toneladas
- Contenedores refrigerados
- Contenedores dañados

#### Tabla de Contenedores
Con las siguientes columnas:
- **Nº**: Número correlativo
- **Contenedor**: Número del contenedor
- **Tipo**: Tipo de contenedor (45R1, etc.)
- **Peso (KG)**: Peso en kilogramos
- **Bahía**: Posición en el buque
- **Origen**: Puerto de origen
- **Destino**: Puerto de destino
- **Carga**: Tipo de mercancía
- **Temp (°C)**: Temperatura (si es refrigerado)
- **Estado**: OK, REEFER o DAMAGED

### 4. Buscar y Filtrar

**Búsqueda por contenedor**
- Escribe el número de contenedor en el campo de búsqueda
- La tabla se filtrará automáticamente

**Filtrar por destino**
- Selecciona un puerto en el dropdown "Todos los destinos"

**Filtrar por estado**
- OK: Contenedores normales
- Dañados: Contenedores con problemas
- Refrigerados: Contenedores con temperatura controlada

### 5. Ordenar la Tabla

Haz clic en cualquier encabezado de columna para ordenar:
- Primer clic: Orden ascendente
- Segundo clic: Orden descendente

### 6. Exportar Datos

**Excel**
- Haz clic en el botón "📊 Excel"
- Se descargará un archivo .xls compatible con Microsoft Excel

**CSV**
- Haz clic en el botón "📄 CSV"
- Se descargará un archivo .csv para procesamiento en otras aplicaciones

## Códigos de Color

La tabla utiliza colores para identificar rápidamente diferentes tipos de contenedores:

- 🟢 **Verde (OK)**: Contenedor normal
- 🟡 **Amarillo**: Contenedor con FOODSTUFFS
- 🔵 **Azul**: Contenedor refrigerado (REEFER)
- 🔴 **Rojo**: Contenedor dañado (DAMAGED)

## Formato EDI Soportado

- **Estándar**: UN/EDIFACT
- **Tipo de mensaje**: BAPLIE (Bay Plan / Stowage Plan)
- **Versión**: D.95B

### Segmentos Parseados

| Segmento | Descripción |
|----------|-------------|
| UNB | Encabezado del mensaje |
| TDT | Información del transporte (buque, viaje) |
| LOC | Ubicaciones (puertos, bahías) |
| DTM | Fechas y horas |
| EQD | Datos del contenedor |
| MEA | Peso |
| FTX | Descripción de carga |
| TMP | Temperatura |
| NAD | Consignatario |

## Navegación con Paginación

- La tabla muestra **50 contenedores por página**
- Usa los botones "◄ Anterior" y "Siguiente ►" para navegar
- El indicador muestra: "Página X de Y (Z contenedores)"

## Archivo de Ejemplo

El proyecto incluye un archivo EDI de ejemplo:
- **Nombre**: `Mv Cs Service SR25050EB Wk0226 Arrival Plan ECPBO.edi`
- **Contenido**: 152 contenedores del buque CS SERVICE
- **Ruta**: Guayaquil → Puerto Bolívar

Úsalo para probar la aplicación.

## Requisitos Técnicos

- Navegador web moderno (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)
- JavaScript habilitado
- No requiere conexión a internet (funciona offline)

## Privacidad y Seguridad

- **100% Local**: Todos los datos se procesan en tu navegador
- **Sin servidor**: No se envía información a ningún servidor externo
- **Sin almacenamiento**: Los datos no se guardan en cookies ni localStorage
- **Privado**: Tus archivos EDI permanecen completamente privados

## Solución de Problemas

### El archivo no se carga
- Verifica que el archivo tenga extensión .edi o .txt
- Asegúrate de que sea un archivo EDI válido en formato EDIFACT
- Revisa la consola del navegador (F12) para más detalles

### No se muestran datos
- Verifica que el archivo contenga mensajes BAPLIE
- Asegúrate de que el formato sea UN/EDIFACT estándar
- Comprueba que el archivo no esté corrupto

### La tabla no responde
- Actualiza la página (F5)
- Limpia la caché del navegador
- Intenta con un navegador diferente

## Próximas Mejoras

- Soporte para más tipos de mensajes EDI (DESADV, IFTMCS, etc.)
- Exportación a PDF
- Gráficos y visualizaciones
- Comparación de dos archivos EDI
- Modo oscuro
- Guardado de presets de filtros

## Soporte

Para reportar problemas o sugerencias, contacta al administrador del sistema.

## Licencia

Uso interno para gestión portuaria.

---

**Versión**: 1.0 (MVP)
**Última actualización**: Enero 2026
