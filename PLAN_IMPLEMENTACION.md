# Plan de Implementación: Interpretador Web de Documentos EDI

## 1. VISIÓN GENERAL

Crear una aplicación web que permita a ejecutivos de puerto/oficina cargar archivos EDI (formato EDIFACT BAPLIE) y visualizar la información de contenedores en una tabla clara y profesional.

---

## 2. ARQUITECTURA DE LA SOLUCIÓN

### 2.1 Stack Tecnológico
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (sin frameworks para máxima portabilidad)
- **Alternativa**: React/Vue si se necesita escalabilidad futura
- **Librerías**:
  - Parser EDI: Implementación custom o librería como `edifact-parser`
  - Tablas: DataTables.js o AG-Grid (ordenamiento, búsqueda, paginación)
  - Exportación: SheetJS (xlsx) para exportar a Excel
  - UI: Bootstrap 5 o Tailwind CSS para diseño responsivo

### 2.2 Componentes Principales
```
┌─────────────────────────────────────────┐
│         Interfaz de Usuario             │
├─────────────────────────────────────────┤
│  1. Zona de carga de archivos (.edi)   │
│  2. Panel de información del viaje      │
│  3. Tabla de contenedores               │
│  4. Controles de búsqueda/filtros       │
│  5. Botones de exportación              │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│         Parser EDI (JavaScript)         │
├─────────────────────────────────────────┤
│  - Leer archivo de texto                │
│  - Dividir por segmentos (delimitador ')│
│  - Extraer datos según tags EDI         │
│  - Estructurar datos en JSON            │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│      Modelo de Datos (JSON)             │
├─────────────────────────────────────────┤
│  {                                      │
│    viaje: {...},                        │
│    contenedores: [...]                  │
│  }                                      │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│    Renderizado de Tabla Ejecutiva       │
└─────────────────────────────────────────┘
```

---

## 3. ESTRUCTURA DEL PARSER EDI

### 3.1 Segmentos EDIFACT a Parsear

| Segmento | Descripción | Datos a Extraer |
|----------|-------------|-----------------|
| `UNB` | Encabezado del mensaje | Remitente, fecha/hora |
| `UNH` | Tipo de mensaje | BAPLIE (confirmación) |
| `TDT` | Transporte | Nombre del buque, número IMO |
| `LOC+5` | Puerto de carga | Código UNLOC |
| `LOC+61` | Puerto de descarga | Código UNLOC |
| `DTM+137` | Fecha de transmisión | Fecha/hora |
| `DTM+133` | Fecha estimada de llegada | Fecha/hora |
| `EQD+CN` | Contenedor | Número, tipo (20'/40'/45') |
| `LOC+147` | Posición en bahía | Código de ubicación |
| `MEA+WT` | Peso | Peso en KGM |
| `FTX` | Descripción de carga | Tipo de mercancía |
| `TMP+2` | Temperatura | Grados Celsius |
| `LOC+9` | Puerto origen contenedor | Código UNLOC |
| `LOC+11` | Puerto destino contenedor | Código UNLOC |
| `NAD+CA` | Consignatario | Identificación |

### 3.2 Lógica del Parser

```javascript
function parseEDI(ediContent) {
  // 1. Dividir por segmentos (delimitador: ')
  const segments = ediContent.split("'").filter(s => s.trim());

  // 2. Crear objeto de datos
  const data = {
    viaje: {},
    contenedores: []
  };

  // 3. Variables temporales para contenedor actual
  let currentContainer = null;

  // 4. Iterar sobre segmentos
  for (let segment of segments) {
    const parts = segment.split('+');
    const tag = parts[0];

    switch(tag) {
      case 'TDT':
        data.viaje.numero = parts[2];
        data.viaje.buque = parts[8].split(':')[2];
        break;

      case 'LOC':
        if (parts[1] === '5') data.viaje.puertoOrigen = parts[2].split(':')[0];
        if (parts[1] === '61') data.viaje.puertoDestino = parts[2].split(':')[0];
        if (parts[1] === '147' && currentContainer) {
          currentContainer.bahia = parts[2].split(':')[0];
        }
        if (parts[1] === '9' && currentContainer) {
          currentContainer.origen = parts[2].split(':')[0];
        }
        if (parts[1] === '11' && currentContainer) {
          currentContainer.destino = parts[2].split(':')[0];
        }
        break;

      case 'EQD':
        // Nuevo contenedor detectado
        if (currentContainer) {
          data.contenedores.push(currentContainer);
        }
        currentContainer = {
          numero: parts[2],
          tipo: parts[3],
          peso: null,
          bahia: null,
          carga: null,
          temperatura: null,
          origen: null,
          destino: null,
          condicion: 'OK'
        };
        break;

      case 'MEA':
        if (parts[1] === 'WT' && currentContainer) {
          currentContainer.peso = parseInt(parts[3].split(':')[1]);
        }
        break;

      case 'FTX':
        if (currentContainer) {
          if (parts[1] === 'AAA') {
            currentContainer.carga = parts[3];
          }
          if (parts[1] === 'AAI' && parts[3] === 'DAMAGED') {
            currentContainer.condicion = 'DAMAGED';
          }
        }
        break;

      case 'TMP':
        if (currentContainer) {
          currentContainer.temperatura = parseFloat(parts[2].split(':')[0]);
        }
        break;
    }
  }

  // Agregar último contenedor
  if (currentContainer) {
    data.contenedores.push(currentContainer);
  }

  return data;
}
```

---

## 4. DISEÑO DE LA INTERFAZ

### 4.1 Layout de la Página

```
┌───────────────────────────────────────────────────────────┐
│  LOGO    INTERPRETADOR EDI - GESTIÓN PORTUARIA            │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  📁 Arrastre su archivo EDI aquí o haga clic     │    │
│  │     para seleccionar                              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
├───────────────────────────────────────────────────────────┤
│  INFORMACIÓN DEL VIAJE                                    │
│  ┌────────────┬────────────┬────────────┬────────────┐  │
│  │ Buque:     │ Viaje:     │ Origen:    │ Destino:   │  │
│  │ CS SERVICE │ SR25050    │ GPPTP      │ ECPBO      │  │
│  └────────────┴────────────┴────────────┴────────────┘  │
├───────────────────────────────────────────────────────────┤
│  CONTENEDORES (152 contenedores)                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 🔍 Buscar: [______]  📊 Filtrar: [Todos ▼]       │    │
│  │ 📥 Exportar: [Excel] [CSV] [PDF]                 │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Nº     │ Contenedor   │ Tipo │ Peso   │ Bahía  │... │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 1      │ CAIU5550320  │ 45R1 │ 9,880  │ 020068 │... │ │
│  │ 2      │ CAIU5656605  │ 45R1 │ 4,600  │ 020058 │... │ │
│  │ ...    │ ...          │ ...  │ ...    │ ...    │... │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                            │
│  [◄] 1 2 3 ... 15 [►]                                    │
└───────────────────────────────────────────────────────────┘
```

### 4.2 Columnas de la Tabla Ejecutiva

| # | Columna | Descripción | Formato |
|---|---------|-------------|---------|
| 1 | Nº | Número correlativo | 1, 2, 3... |
| 2 | Contenedor | Número del contenedor | CAIU5550320 |
| 3 | Tipo | Tipo de contenedor | 45R1 |
| 4 | Peso (KG) | Peso en kilogramos | 9,880 |
| 5 | Bahía | Posición en el buque | 0200682 |
| 6 | Origen | Puerto origen | FRRAD |
| 7 | Destino | Puerto destino | ECGYE |
| 8 | Carga | Tipo de mercancía | FOODSTUFFS |
| 9 | Temp. (°C) | Temperatura si aplica | 14.0 |
| 10 | Estado | Condición del contenedor | OK / DAMAGED |

### 4.3 Códigos de Color para Estados

- 🟢 **Verde**: Contenedor OK (peso normal)
- 🟡 **Amarillo**: Contenedor refrigerado (temperatura controlada)
- 🔴 **Rojo**: Contenedor DAMAGED o sobrepeso
- 🔵 **Azul**: Foodstuffs (carga especial)

---

## 5. FUNCIONALIDADES CLAVE

### 5.1 Carga de Archivos
- Drag & drop de archivos .edi
- Selector de archivos manual
- Validación de formato EDIFACT
- Mensajes de error claros

### 5.2 Búsqueda y Filtros
- Búsqueda por número de contenedor
- Filtrar por:
  - Puerto destino
  - Tipo de carga
  - Rango de peso
  - Estado (OK/DAMAGED)
  - Temperatura (refrigerados/no refrigerados)

### 5.3 Ordenamiento
- Por cualquier columna (ascendente/descendente)
- Múltiples niveles de ordenamiento

### 5.4 Exportación
- **Excel**: Formato .xlsx con estilos
- **CSV**: Para procesamiento externo
- **PDF**: Reporte imprimible con logo y encabezado

### 5.5 Estadísticas Rápidas
Mostrar en tarjetas superiores:
- Total de contenedores
- Peso total (toneladas)
- Contenedores por destino
- Contenedores con temperatura controlada
- Contenedores dañados

---

## 6. ESTRUCTURA DE ARCHIVOS DEL PROYECTO

```
proEDI/
├── index.html              # Página principal
├── css/
│   ├── style.css          # Estilos personalizados
│   └── bootstrap.min.css  # Framework CSS
├── js/
│   ├── app.js             # Lógica principal
│   ├── edi-parser.js      # Parser EDI
│   ├── table-renderer.js  # Renderizado de tabla
│   └── export.js          # Funciones de exportación
├── lib/                   # Librerías externas
│   ├── datatables.min.js
│   └── xlsx.full.min.js
├── assets/
│   ├── logo.png
│   └── icons/
└── data/
    └── Mv Cs Service SR25050EB Wk0226 Arrival Plan ECPBO.edi
```

---

## 7. FLUJO DE TRABAJO DE LA APLICACIÓN

```
Usuario → Carga archivo EDI
             ↓
    Leer archivo como texto
             ↓
    Parser EDI (edi-parser.js)
             ↓
    Validar estructura EDIFACT
             ↓
    Extraer datos del viaje
             ↓
    Extraer datos de contenedores
             ↓
    Crear estructura JSON
             ↓
    Renderizar panel de viaje
             ↓
    Renderizar tabla de contenedores
             ↓
    Aplicar DataTables (búsqueda, paginación)
             ↓
    Habilitar exportación
             ↓
    Usuario interactúa con tabla
```

---

## 8. CASOS DE USO

### 8.1 Ejecutivo de Puerto
- **Necesidad**: Verificar rápidamente qué contenedores llegan en el próximo buque
- **Acción**: Carga archivo EDI recibido por email
- **Resultado**: Ve tabla con todos los contenedores, puede buscar por destino ECPBO

### 8.2 Operador de Terminal
- **Necesidad**: Identificar contenedores refrigerados para asignar conexiones
- **Acción**: Filtra por temperatura no nula
- **Resultado**: Lista de contenedores que necesitan electricidad

### 8.3 Supervisor de Calidad
- **Necesidad**: Revisar contenedores dañados
- **Acción**: Filtra por estado "DAMAGED"
- **Resultado**: Encuentra 1 contenedor (CAIU5563570) para inspección

### 8.4 Gerencia
- **Necesidad**: Reporte para reunión con cliente
- **Acción**: Exporta a Excel con todos los datos
- **Resultado**: Archivo .xlsx con formato profesional

---

## 9. CONSIDERACIONES TÉCNICAS

### 9.1 Compatibilidad
- Navegadores: Chrome, Firefox, Safari, Edge (últimas 2 versiones)
- Dispositivos: Desktop y tablet (no optimizado para móvil por tabla amplia)
- Sin necesidad de backend (funciona 100% en el navegador)

### 9.2 Rendimiento
- Archivos EDI de hasta 1 MB (aproximadamente 1000 contenedores)
- Parsing en menos de 1 segundo
- Renderizado con paginación (50 registros por página)

### 9.3 Seguridad
- No se envía información a servidores externos
- Procesamiento 100% local
- No se almacenan datos en cookies o localStorage (opcional: guardar último archivo)

---

## 10. FASES DE DESARROLLO

### Fase 1: MVP (Mínimo Producto Viable)
- ✅ Carga de archivo EDI
- ✅ Parser básico (buque, viaje, contenedores)
- ✅ Tabla simple con datos principales
- ✅ Búsqueda por contenedor

**Tiempo estimado**: 1-2 días

### Fase 2: Funcionalidad Completa
- ✅ Parser completo (todos los segmentos)
- ✅ Tabla con todas las columnas
- ✅ Filtros avanzados
- ✅ Ordenamiento multi-columna
- ✅ Estadísticas superiores

**Tiempo estimado**: 2-3 días

### Fase 3: Exportación y Pulido
- ✅ Exportación a Excel/CSV/PDF
- ✅ Códigos de color
- ✅ Diseño responsivo
- ✅ Validaciones y mensajes de error
- ✅ Documentación de usuario

**Tiempo estimado**: 1-2 días

---

## 11. PRÓXIMOS PASOS

1. **Revisar y aprobar este plan**
2. **Decidir stack tecnológico**:
   - ¿Prefieres JavaScript vanilla o un framework (React/Vue)?
   - ¿Qué librería de tablas? (DataTables es simple, AG-Grid es más potente)
3. **Comenzar con Fase 1 (MVP)**
4. **Probar con el archivo EDI de ejemplo**
5. **Iterar según feedback**

---

## 12. MEJORAS FUTURAS (POST-MVP)

- Soporte para múltiples tipos de mensajes EDI (no solo BAPLIE)
- Comparación de dos archivos EDI (cambios entre versiones)
- Gráficos: distribución de peso, contenedores por destino
- Modo oscuro
- Guardar presets de filtros
- API backend para almacenar histórico
- Integración con sistemas ERP/TOS portuarios

---

## CONCLUSIÓN

Este plan cubre la implementación completa de un interpretador EDI web profesional, enfocado en la experiencia del usuario ejecutivo. El resultado será una herramienta simple pero potente que transforme datos EDI crudos en información accionable.

**¿Deseas que comience con la Fase 1 (MVP)?**
