/**
 * Main Application Logic
 * Handles file upload, data display, search, filters, and export
 */

// Global variables
let parser = new EDIParser();
let bayplanVisualizer = null;
let currentData = null;
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 50;
let sortColumn = -1;
let sortAscending = true;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize application
 */
function initializeApp() {
    setupEventListeners();
    console.log('EDI Interpreter initialized');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const btnSelect = document.getElementById('btnSelect');
    const changeFileBtn = document.getElementById('changeFile');
    const searchInput = document.getElementById('searchInput');
    const filterDestination = document.getElementById('filterDestination');
    const filterStatus = document.getElementById('filterStatus');
    const exportExcel = document.getElementById('exportExcel');
    const exportCSV = document.getElementById('exportCSV');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    // Drag and drop on upload zone
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);

    // Click on upload zone (but not on the button)
    uploadZone.addEventListener('click', (e) => {
        if (e.target !== btnSelect && !btnSelect.contains(e.target)) {
            fileInput.click();
        }
    });

    // Select file button
    btnSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Change file button
    changeFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Search and filters
    searchInput.addEventListener('input', applyFilters);
    filterDestination.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);

    // Export buttons
    exportExcel.addEventListener('click', exportToExcel);
    exportCSV.addEventListener('click', exportToCSV);

    // Pagination
    prevPage.addEventListener('click', () => changePage(-1));
    nextPage.addEventListener('click', () => changePage(1));

    // Main Tabs
    const tabTable = document.getElementById('tabTable');
    const tabBayplan = document.getElementById('tabBayplan');
    tabTable.addEventListener('click', () => switchMainTab('table'));
    tabBayplan.addEventListener('click', () => switchMainTab('bayplan'));

    // Bayplan Tabs
    const tabBayplan2D = document.getElementById('tabBayplan2D');
    const tabBayplan3D = document.getElementById('tabBayplan3D');
    tabBayplan2D.addEventListener('click', () => switchBayplanTab('2d'));
    tabBayplan3D.addEventListener('click', () => switchBayplanTab('3d'));

    // Bayplan 3D controls
    const viewTop = document.getElementById('viewTop');
    const viewFront = document.getElementById('viewFront');
    const viewSide = document.getElementById('viewSide');
    const viewIso = document.getElementById('viewIso');
    const containerSearch = document.getElementById('containerSearch');
    const containerSelect = document.getElementById('containerSelect');

    viewTop.addEventListener('click', () => setBayplanView('top', viewTop));
    viewFront.addEventListener('click', () => setBayplanView('front', viewFront));
    viewSide.addEventListener('click', () => setBayplanView('side', viewSide));
    viewIso.addEventListener('click', () => setBayplanView('iso', viewIso));

    // Container search and selection
    containerSearch.addEventListener('input', filterContainerList);
    containerSelect.addEventListener('change', selectContainer);

    const btnResetSelection = document.getElementById('btnResetSelection');
    btnResetSelection.addEventListener('click', resetContainerSelection);

    // Export Bayplan PDF
    const exportBayplanPDF = document.getElementById('exportBayplanPDF');
    exportBayplanPDF.addEventListener('click', generateBayplanPDF);

    // View Cube controls
    const viewCube = document.getElementById('viewCube');
    if (viewCube) {
        viewCube.querySelectorAll('.cube-face').forEach(face => {
            face.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (bayplanVisualizer) {
                    if (view === 'sideR') {
                        // Right side view (opposite of left)
                        bayplanVisualizer.setView('side');
                        bayplanVisualizer.camera.position.x = -bayplanVisualizer.camera.position.x;
                    } else if (view === 'back') {
                        // Back view (opposite of front)
                        bayplanVisualizer.setView('front');
                        bayplanVisualizer.camera.position.z = -bayplanVisualizer.camera.position.z;
                    } else if (view === 'bottom') {
                        // Bottom view (opposite of top)
                        bayplanVisualizer.setView('top');
                        bayplanVisualizer.camera.position.y = -Math.abs(bayplanVisualizer.camera.position.y);
                    } else {
                        bayplanVisualizer.setView(view);
                    }

                    // Update button states
                    document.querySelectorAll('.btn-view').forEach(btn => btn.classList.remove('active'));
                }
            });
        });
    }
}

/**
 * Handle drag over event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

/**
 * Handle drag leave event
 */
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
}

/**
 * Handle drop event
 */
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

/**
 * Handle file selection
 */
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

/**
 * Process uploaded file
 */
function processFile(file) {
    // Validate file
    if (!file.name.match(/\.(edi|txt)$/i)) {
        alert('Por favor seleccione un archivo EDI válido (.edi o .txt)');
        // Reset file input
        document.getElementById('fileInput').value = '';
        return;
    }

    // Show file loaded info
    document.getElementById('loadedFileName').textContent = file.name;

    // Format file size
    const sizeKB = (file.size / 1024).toFixed(1);
    document.getElementById('fileSize').textContent = `${sizeKB} KB`;

    // Hide upload zone and show file loaded info
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('fileLoadedInfo').style.display = 'flex';

    // Read file
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            parseAndDisplayData(content);

            // Reset file input so the same file can be selected again if needed
            document.getElementById('fileInput').value = '';
        } catch (error) {
            alert('Error al leer el archivo: ' + error.message);
            console.error(error);
            // Reset on error
            document.getElementById('uploadZone').style.display = 'block';
            document.getElementById('fileLoadedInfo').style.display = 'none';
            document.getElementById('fileInput').value = '';
        }
    };
    reader.onerror = function() {
        alert('Error al leer el archivo');
        document.getElementById('uploadZone').style.display = 'block';
        document.getElementById('fileLoadedInfo').style.display = 'none';
        document.getElementById('fileInput').value = '';
    };
    reader.readAsText(file);
}

/**
 * Parse EDI content and display data
 */
function parseAndDisplayData(content) {
    try {
        // Parse EDI
        currentData = parser.parse(content);
        filteredData = [...currentData.containers];

        // Reset 3D visualizer to clear previous data
        bayplanVisualizer = null;

        // Display data
        displayVoyageInfo();
        displayStatistics();
        populateFilters();
        currentPage = 1;
        displayTable();

        // Show tabs and sections
        document.getElementById('mainTabsSection').style.display = 'block';
        document.getElementById('voyageSection').style.display = 'block';
        document.getElementById('statsSection').style.display = 'block';
        document.getElementById('tableSection').style.display = 'block';
        document.getElementById('bayplanSection').style.display = 'none';

        console.log('Parsed data:', currentData);
    } catch (error) {
        alert('Error al procesar el archivo EDI: ' + error.message);
        console.error(error);
    }
}

/**
 * Display voyage information
 */
function displayVoyageInfo() {
    const voyage = currentData.voyage;

    document.getElementById('vesselName').textContent = voyage.vesselName || '-';
    document.getElementById('voyageNumber').textContent = voyage.voyageNumber || '-';

    // Port Origin with description
    document.getElementById('portOrigin').textContent = voyage.portOrigin || '-';
    if (voyage.portOrigin) {
        const portInfo = EDICodes.formatPort(voyage.portOrigin);
        document.getElementById('portOriginName').textContent = portInfo.name || '';
    }

    // Port Destination with description
    document.getElementById('portDestination').textContent = voyage.portDestination || '-';
    if (voyage.portDestination) {
        const portInfo = EDICodes.formatPort(voyage.portDestination);
        document.getElementById('portDestinationName').textContent = portInfo.name || '';
    }

    document.getElementById('arrivalDate').textContent = voyage.arrivalDate || '-';
}

/**
 * Display statistics
 */
function displayStatistics() {
    const stats = parser.getStatistics();

    document.getElementById('totalContainers').textContent = stats.totalContainers;
    document.getElementById('totalWeight').textContent = stats.totalWeight;
    document.getElementById('reeferContainers').textContent = stats.reeferContainers;
    document.getElementById('damagedContainers').textContent = stats.damagedContainers;
}

/**
 * Populate filter dropdowns
 */
function populateFilters() {
    const destinations = parser.getDestinations();
    const filterDestination = document.getElementById('filterDestination');

    // Clear existing options (except first)
    filterDestination.innerHTML = '<option value="">Todos los destinos</option>';

    // Add destination options with descriptive names
    destinations.forEach(dest => {
        const option = document.createElement('option');
        option.value = dest;
        const portInfo = EDICodes.formatPort(dest);
        option.textContent = portInfo.formatted;
        filterDestination.appendChild(option);
    });
}

/**
 * Apply search and filters
 */
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterDest = document.getElementById('filterDestination').value;
    const filterStat = document.getElementById('filterStatus').value;

    filteredData = currentData.containers.filter(container => {
        // Search filter
        const matchesSearch = !searchTerm ||
            container.containerNumber.toLowerCase().includes(searchTerm);

        // Destination filter
        const matchesDest = !filterDest ||
            container.portDestination === filterDest;

        // Status filter
        let matchesStatus = true;
        if (filterStat === 'OK') {
            matchesStatus = container.status === 'OK';
        } else if (filterStat === 'DAMAGED') {
            matchesStatus = container.status === 'DAMAGED';
        } else if (filterStat === 'REEFER') {
            matchesStatus = container.temperature !== null;
        }

        return matchesSearch && matchesDest && matchesStatus;
    });

    currentPage = 1;
    displayTable();
}

/**
 * Display table with current page data
 */
function displayTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);

    // Populate table rows
    pageData.forEach((container, index) => {
        const row = tableBody.insertRow();
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
            // Don't open modal if clicking on the action button
            if (!e.target.closest('.btn-view-detail')) {
                showContainerDetail(container);
            }
        });

        // Apply row styling based on container properties
        if (container.status === 'DAMAGED') {
            row.classList.add('row-damaged');
        } else if (container.temperature !== null) {
            row.classList.add('row-reefer');
        } else if (container.cargoType && container.cargoType.includes('FOODSTUFF')) {
            row.classList.add('row-foodstuff');
        }

        // Nº
        row.insertCell(0).textContent = startIndex + index + 1;

        // Contenedor
        row.insertCell(1).textContent = container.containerNumber;

        // Posición
        row.insertCell(2).textContent = container.bayPosition || '-';

        // Longitud (extract from container type)
        const lengthCell = row.insertCell(3);
        const typeCode = container.containerType || '';
        if (typeCode.startsWith('20')) lengthCell.textContent = "20'";
        else if (typeCode.startsWith('40')) lengthCell.textContent = "40'";
        else if (typeCode.startsWith('45')) lengthCell.textContent = "45'";
        else lengthCell.textContent = '-';

        // Altura (from container type - assume standard for now)
        const heightCell = row.insertCell(4);
        if (typeCode.includes('H') || typeCode.includes('9')) heightCell.textContent = "9'6\"";
        else heightCell.textContent = "8'6\"";

        // Código ISO
        row.insertCell(5).textContent = container.containerType || '-';

        // Bahía
        row.insertCell(6).textContent = container.bay ? String(container.bay).padStart(3, '0') : '-';

        // Fila
        row.insertCell(7).textContent = container.row ? String(container.row).padStart(2, '0') : '-';

        // Tier
        row.insertCell(8).textContent = container.tier ? String(container.tier).padStart(2, '0') : '-';

        // Port Origin with tooltip
        const originCell = row.insertCell(9);
        originCell.textContent = container.portOrigin || '-';
        if (container.portOrigin) {
            const portInfo = EDICodes.formatPort(container.portOrigin);
            if (portInfo.name) {
                originCell.title = portInfo.name;
                originCell.style.cursor = 'help';
            }
        }

        // Port Destination with tooltip
        const destCell = row.insertCell(10);
        destCell.textContent = container.portDestination || '-';
        if (container.portDestination) {
            const portInfo = EDICodes.formatPort(container.portDestination);
            if (portInfo.name) {
                destCell.title = portInfo.name;
                destCell.style.cursor = 'help';
            }
        }

        // Cargo Type with translation
        const cargoCell = row.insertCell(11);
        const cargoType = container.cargoType || '-';
        cargoCell.textContent = EDICodes.getCargoType(cargoType);

        // Temperature
        row.insertCell(12).textContent = container.temperature !== null ? container.temperature.toFixed(1) : '-';

        // Peso
        row.insertCell(13).textContent = container.weight ? container.weight.toLocaleString() : '-';

        // VGM (assume same as weight if not available)
        row.insertCell(14).textContent = container.weight ? container.weight.toLocaleString() : '-';

        // Status cell with badge
        const statusCell = row.insertCell(15);
        const statusBadge = document.createElement('span');

        if (container.status === 'DAMAGED') {
            statusBadge.className = 'status-damaged';
            statusBadge.textContent = 'DAMAGED';
        } else if (container.temperature !== null) {
            statusBadge.className = 'status-reefer';
            statusBadge.textContent = 'REEFER';
        } else {
            statusBadge.className = 'status-ok';
            statusBadge.textContent = 'OK';
        }

        statusCell.appendChild(statusBadge);

        // Acciones
        const actionCell = row.insertCell(16);
        const detailBtn = document.createElement('button');
        detailBtn.className = 'btn-view-detail';
        detailBtn.innerHTML = '👁️';
        detailBtn.title = 'Ver detalles';
        detailBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showContainerDetail(container);
        });
        actionCell.appendChild(detailBtn);
    });

    // Update pagination info
    updatePagination();
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    document.getElementById('pageInfo').textContent =
        `Página ${currentPage} de ${totalPages} (${filteredData.length} contenedores)`;

    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages || totalPages === 0;
}

/**
 * Change page
 */
function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const newPage = currentPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayTable();

        // Scroll to top of table
        document.getElementById('tableSection').scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Sort table by column
 */
function sortTable(columnIndex) {
    if (sortColumn === columnIndex) {
        sortAscending = !sortAscending;
    } else {
        sortColumn = columnIndex;
        sortAscending = true;
    }

    filteredData.sort((a, b) => {
        let valueA, valueB;

        switch(columnIndex) {
            case 0: return 0; // Number column (no sort)
            case 1: valueA = a.containerNumber; valueB = b.containerNumber; break;
            case 2: valueA = a.bayPosition; valueB = b.bayPosition; break;
            case 3: // Longitud
                valueA = a.containerType?.startsWith('20') ? 20 : a.containerType?.startsWith('40') ? 40 : a.containerType?.startsWith('45') ? 45 : 0;
                valueB = b.containerType?.startsWith('20') ? 20 : b.containerType?.startsWith('40') ? 40 : b.containerType?.startsWith('45') ? 45 : 0;
                break;
            case 4: // Altura
                valueA = a.containerType?.includes('H') ? 9.5 : 8.5;
                valueB = b.containerType?.includes('H') ? 9.5 : 8.5;
                break;
            case 5: valueA = a.containerType; valueB = b.containerType; break;
            case 6: valueA = a.bay || 0; valueB = b.bay || 0; break;
            case 7: valueA = a.row || 0; valueB = b.row || 0; break;
            case 8: valueA = a.tier || 0; valueB = b.tier || 0; break;
            case 9: valueA = a.portOrigin; valueB = b.portOrigin; break;
            case 10: valueA = a.portDestination; valueB = b.portDestination; break;
            case 11: valueA = a.cargoType; valueB = b.cargoType; break;
            case 12: valueA = a.temperature || -999; valueB = b.temperature || -999; break;
            case 13: valueA = a.weight || 0; valueB = b.weight || 0; break;
            case 14: valueA = a.weight || 0; valueB = b.weight || 0; break; // VGM
            case 15: valueA = a.status; valueB = b.status; break;
            default: return 0;
        }

        if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }

        if (valueA < valueB) return sortAscending ? -1 : 1;
        if (valueA > valueB) return sortAscending ? 1 : -1;
        return 0;
    });

    currentPage = 1;
    displayTable();
}

/**
 * Show container detail modal
 */
function showContainerDetail(container) {
    const modal = document.getElementById('containerModal');
    const modalBody = document.getElementById('modalBody');

    // Build detail content
    const portOrigin = EDICodes.formatPort(container.portOrigin);
    const portDest = EDICodes.formatPort(container.portDestination);
    const typeInfo = EDICodes.formatContainerType(container.containerType);

    modalBody.innerHTML = `
        <div class="detail-section">
            <h4>Información Principal</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Equipo Nro:</label>
                    <span>${container.containerNumber}</span>
                </div>
                <div class="detail-item">
                    <label>Posición:</label>
                    <span>${container.bayPosition || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Código ISO:</label>
                    <span>${container.containerType || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Tipo:</label>
                    <span>${typeInfo.formatted}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>Ubicación en el Buque</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Bahía:</label>
                    <span>${container.bay ? String(container.bay).padStart(3, '0') : '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Fila:</label>
                    <span>${container.row ? String(container.row).padStart(2, '0') : '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Tier:</label>
                    <span>${container.tier ? String(container.tier).padStart(2, '0') : '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Lado:</label>
                    <span>${container.row % 2 === 0 ? 'STARBOARD (Estribor)' : 'PORT (Babor)'}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>Ruta y Puertos</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Puerto Origen:</label>
                    <span>${portOrigin.formatted}</span>
                </div>
                <div class="detail-item">
                    <label>Puerto Destino:</label>
                    <span>${portDest.formatted}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>Carga y Peso</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Tipo de Carga:</label>
                    <span>${EDICodes.getCargoType(container.cargoType || '-')}</span>
                </div>
                <div class="detail-item">
                    <label>Peso (KG):</label>
                    <span>${container.weight ? container.weight.toLocaleString() : '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Peso (Tons):</label>
                    <span>${container.weight ? (container.weight / 1000).toFixed(2) : '-'}</span>
                </div>
                <div class="detail-item">
                    <label>VGM (KG):</label>
                    <span>${container.weight ? container.weight.toLocaleString() : '-'}</span>
                </div>
            </div>
        </div>

        ${container.temperature !== null ? `
        <div class="detail-section">
            <h4>Refrigeración</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Temperatura:</label>
                    <span>${container.temperature.toFixed(1)}°C</span>
                </div>
                <div class="detail-item">
                    <label>Tipo:</label>
                    <span>Contenedor Refrigerado</span>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="detail-section">
            <h4>Estado</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Estado:</label>
                    <span class="${container.status === 'DAMAGED' ? 'status-damaged' : container.temperature !== null ? 'status-reefer' : 'status-ok'}">
                        ${container.status === 'DAMAGED' ? 'DAMAGED' : container.temperature !== null ? 'REEFER' : 'OK'}
                    </span>
                </div>
                <div class="detail-item">
                    <label>Lleno/Vacío:</label>
                    <span>${container.cargoType && container.cargoType !== 'Empty' ? 'Lleno' : 'Vacío'}</span>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// Close modal handler
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('containerModal');
    const closeBtn = document.getElementById('closeModal');

    closeBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            modal.style.display = 'none';
        }
    });
});

/**
 * Export to CSV
 */
function exportToCSV() {
    if (!currentData || !currentData.containers.length) {
        alert('No hay datos para exportar');
        return;
    }

    const headers = ['Nº', 'Contenedor', 'Tipo', 'Peso (KG)', 'Bahía', 'Origen', 'Destino', 'Carga', 'Temp (°C)', 'Estado'];

    let csvContent = headers.join(',') + '\n';

    filteredData.forEach((container, index) => {
        const row = [
            index + 1,
            container.containerNumber,
            container.containerType,
            container.weight || '',
            container.bayPosition || '',
            container.portOrigin || '',
            container.portDestination || '',
            `"${container.cargoType || ''}"`,
            container.temperature !== null ? container.temperature.toFixed(1) : '',
            container.status
        ];
        csvContent += row.join(',') + '\n';
    });

    downloadFile(csvContent, 'containers.csv', 'text/csv');
}

/**
 * Export to Excel (CSV format with UTF-8 BOM for Excel compatibility)
 */
function exportToExcel() {
    if (!currentData || !currentData.containers.length) {
        alert('No hay datos para exportar');
        return;
    }

    // Add UTF-8 BOM for Excel
    const BOM = '\uFEFF';
    const headers = ['Nº', 'Contenedor', 'Tipo', 'Peso (KG)', 'Bahía', 'Origen', 'Destino', 'Carga', 'Temp (°C)', 'Estado'];

    let csvContent = BOM + headers.join('\t') + '\n';

    filteredData.forEach((container, index) => {
        const row = [
            index + 1,
            container.containerNumber,
            container.containerType,
            container.weight || '',
            container.bayPosition || '',
            container.portOrigin || '',
            container.portDestination || '',
            container.cargoType || '',
            container.temperature !== null ? container.temperature.toFixed(1) : '',
            container.status
        ];
        csvContent += row.join('\t') + '\n';
    });

    downloadFile(csvContent, 'containers.xls', 'application/vnd.ms-excel');
}

/**
 * Download file helper
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/**
 * Switch between main tabs (Table / Bayplan)
 */
function switchMainTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.main-tab').forEach(btn => btn.classList.remove('active'));

    if (tab === 'table') {
        document.getElementById('tabTable').classList.add('active');
        document.getElementById('statsSection').style.display = 'block';
        document.getElementById('tableSection').style.display = 'block';
        document.getElementById('bayplanSection').style.display = 'none';
    } else if (tab === 'bayplan') {
        document.getElementById('tabBayplan').classList.add('active');
        document.getElementById('statsSection').style.display = 'none';
        document.getElementById('tableSection').style.display = 'none';
        document.getElementById('bayplanSection').style.display = 'block';

        // Initialize bayplan on first load
        if (!bayplanVisualizer) {
            setTimeout(() => {
                initializeBayplan();
            }, 100);
        }
    }
}

/**
 * Switch between Bayplan tabs (2D / 3D)
 */
function switchBayplanTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.bayplan-tab').forEach(btn => btn.classList.remove('active'));

    if (tab === '2d') {
        document.getElementById('tabBayplan2D').classList.add('active');
        document.getElementById('bayplan2DContainer').style.display = 'block';
        document.getElementById('bayplan3DContainer').style.display = 'none';

        // Generate 2D view if not already done
        generateBayplan2D();
    } else if (tab === '3d') {
        document.getElementById('tabBayplan3D').classList.add('active');
        document.getElementById('bayplan2DContainer').style.display = 'none';
        document.getElementById('bayplan3DContainer').style.display = 'flex';

        // Initialize 3D if needed
        if (!bayplanVisualizer) {
            bayplanVisualizer = new BayplanVisualizer('bayplan3D');
            bayplanVisualizer.loadContainers(currentData.containers);
            populateContainerSelector();
            initializeSidebarEvents(); // Initialize sidebar events once
        }

        // Always populate sidebar when showing 3D view
        populateSidebar();

        // Resize canvas to fit new layout with a longer delay to ensure layout is ready
        if (bayplanVisualizer) {
            setTimeout(() => {
                bayplanVisualizer.onWindowResize();
            }, 300);
        }
    }
}

/**
 * Initialize bayplan (called when first opening bayplan tab)
 */
function initializeBayplan() {
    // Generate 2D view by default
    generateBayplan2D();
    populateBaySelector();
}

/**
 * Populate bay selector for 2D view
 */
function populateBaySelector() {
    const baySelector = document.getElementById('baySelector');
    baySelector.innerHTML = '<option value="all">Todas las Bahías</option>';

    const bayStructure = buildBayStructure();
    const bays = Object.keys(bayStructure).map(Number).sort((a, b) => a - b);

    bays.forEach(bay => {
        const option = document.createElement('option');
        option.value = bay;
        option.textContent = `Bay ${String(bay).padStart(3, '0')}`;
        baySelector.appendChild(option);
    });

    // Add event listener for bay selection
    baySelector.addEventListener('change', () => generateBayplan2D());

    // Regenerate on window resize for responsive sizing
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const bayplanSection = document.getElementById('bayplanSection');
            const bayplan2DContainer = document.getElementById('bayplan2DContainer');
            if (bayplanSection.style.display !== 'none' &&
                bayplan2DContainer.style.display !== 'none') {
                generateBayplan2D();
            }
        }, 300);
    });
}

/**
 * Assign colors to destination ports (same as 3D)
 */
function assignPortColors() {
    const colorPalette = [
        '#ff6b6b', // Red
        '#4ecdc4', // Teal
        '#ffe66d', // Yellow
        '#95e1d3', // Mint
        '#f38181', // Pink
        '#aa96da', // Purple
        '#fcbad3', // Light Pink
        '#a8e6cf', // Light Green
    ];

    const portColors = {};
    const uniquePorts = [...new Set(currentData.containers.map(c => c.portDestination).filter(Boolean))];

    uniquePorts.forEach((port, index) => {
        portColors[port] = colorPalette[index % colorPalette.length];
    });

    return portColors;
}

/**
 * Generate Bayplan 2D view optimized for web
 */
function generateBayplan2D() {
    const gridContainer = document.getElementById('bayplan2DGrid');
    if (!currentData || !currentData.containers || currentData.containers.length === 0) {
        gridContainer.innerHTML = '<p>No hay datos para mostrar</p>';
        return;
    }

    const bayStructure = buildBayStructure();
    const selectedBay = document.getElementById('baySelector')?.value || 'all';
    const portColors = assignPortColors();

    gridContainer.innerHTML = '';

    const bays = selectedBay === 'all'
        ? Object.keys(bayStructure).map(Number).sort((a, b) => a - b)
        : [Number(selectedBay)];

    bays.forEach(bay => {
        const bayCard = document.createElement('div');
        bayCard.className = 'bay-2d-card';

        const bayData = bayStructure[bay];

        // Sort rows like BAPLIEVIEWER: even descending (PORT), 00, odd ascending (STARBOARD)
        // Example: 10, 08, 06, 04, 02, 00, 01, 03, 05, 07, 09
        const rows = Object.keys(bayData).map(Number).sort((a, b) => {
            // Separate rows into even (port), zero (center), and odd (starboard)
            const aIsEven = a % 2 === 0 && a !== 0;
            const bIsEven = b % 2 === 0 && b !== 0;
            const aIsZero = a === 0;
            const bIsZero = b === 0;

            // Group: even (port) < zero (center) < odd (starboard)
            if (aIsEven && !bIsEven) return -1;
            if (!aIsEven && bIsEven) return 1;
            if (aIsZero && !bIsZero) return bIsEven ? 1 : -1;
            if (!aIsZero && bIsZero) return aIsEven ? -1 : 1;

            // Within same group: even descending, odd ascending
            if (aIsEven && bIsEven) return b - a; // Descending for PORT
            return a - b; // Ascending for STARBOARD
        });

        // Get all tiers
        const allTiers = new Set();
        rows.forEach(row => {
            Object.keys(bayData[row]).forEach(tier => allTiers.add(Number(tier)));
        });
        const tiers = Array.from(allTiers).sort((a, b) => b - a); // Top to bottom

        // Bay header
        const header = document.createElement('div');
        header.className = 'bay-2d-header';
        header.textContent = `BAY ${String(bay).padStart(3, '0')}`;
        bayCard.appendChild(header);

        // Row header (top)
        const rowHeader = document.createElement('div');
        rowHeader.className = 'row-header-top';

        // Responsive cell sizing
        const isMobile = window.innerWidth <= 768;
        const tierLabelWidth = isMobile ? '30px' : '40px';
        const cellWidth = isMobile ? '90px' : '120px';

        rowHeader.style.gridTemplateColumns = `${tierLabelWidth} repeat(${rows.length}, ${cellWidth}) ${tierLabelWidth}`;

        // Empty corner cells
        rowHeader.appendChild(document.createElement('div'));

        rows.forEach(row => {
            const rowLabel = document.createElement('div');
            rowLabel.className = 'row-label-top';
            rowLabel.textContent = String(row).padStart(2, '0');
            rowHeader.appendChild(rowLabel);
        });

        rowHeader.appendChild(document.createElement('div'));
        bayCard.appendChild(rowHeader);

        // Bay view container (grid with tiers as rows, rows as columns)
        const bayView = document.createElement('div');
        bayView.className = 'bay-2d-view';

        // Draw each tier as a row
        tiers.forEach(tier => {
            const tierRow = document.createElement('div');
            tierRow.className = 'tier-row';
            tierRow.style.gridTemplateColumns = `${tierLabelWidth} repeat(${rows.length}, ${cellWidth}) ${tierLabelWidth}`;

            // Left tier label
            const tierLabelLeft = document.createElement('div');
            tierLabelLeft.className = 'tier-label';
            tierLabelLeft.textContent = String(tier).padStart(2, '0');
            tierRow.appendChild(tierLabelLeft);

            // Container cells for each row (column)
            rows.forEach(row => {
                const cell = document.createElement('div');

                if (bayData[row] && bayData[row][tier]) {
                    const container = bayData[row][tier];
                    cell.className = 'container-cell';

                    // Apply port color
                    const portColor = portColors[container.portDestination] || '#888888';
                    cell.style.backgroundColor = portColor;
                    cell.style.borderColor = portColor;

                    // Add special indicators for reefer/damaged
                    if (container.temperature !== null) {
                        cell.classList.add('reefer');
                    } else if (container.status === 'DAMAGED') {
                        cell.classList.add('damaged');
                    }

                    // Port destination (top, small)
                    const destPort = EDICodes.formatPort(container.portDestination);
                    const portLabel = document.createElement('div');
                    portLabel.className = 'container-port-label';
                    portLabel.textContent = `e ${destPort.code}`;
                    cell.appendChild(portLabel);

                    // Container number (center, large)
                    const containerNum = document.createElement('div');
                    containerNum.className = 'container-number';
                    // Format: PREFIX + NUMBER (first 4 chars + space + rest)
                    const cNum = container.containerNumber;
                    const formatted = cNum.length > 4 ? cNum.substring(0, 4) + '\n' + cNum.substring(4) : cNum;
                    containerNum.textContent = formatted;
                    containerNum.style.whiteSpace = 'pre-line';
                    cell.appendChild(containerNum);

                    // Container type (bottom, small)
                    const typeLabel = document.createElement('div');
                    typeLabel.className = 'container-type-label';

                    // Extract size and type from container type code
                    let size = 'STD';
                    const typeCode = container.containerType || '';
                    if (typeCode.startsWith('20')) size = "20'";
                    else if (typeCode.startsWith('40')) size = "40'";
                    else if (typeCode.startsWith('45')) size = "45'";

                    typeLabel.textContent = `${size}\n${typeCode}`;
                    typeLabel.style.whiteSpace = 'pre-line';
                    cell.appendChild(typeLabel);

                } else {
                    cell.className = 'container-cell empty';
                }

                tierRow.appendChild(cell);
            });

            // Right tier label
            const tierLabelRight = document.createElement('div');
            tierLabelRight.className = 'tier-label';
            tierLabelRight.textContent = String(tier).padStart(2, '0');
            tierRow.appendChild(tierLabelRight);

            bayView.appendChild(tierRow);
        });

        bayCard.appendChild(bayView);

        // Bottom info row (ht label on left, wt label on right)
        const bottomInfo = document.createElement('div');
        bottomInfo.className = 'row-bottom-info';
        bottomInfo.style.gridTemplateColumns = `${tierLabelWidth} repeat(${rows.length}, ${cellWidth}) ${tierLabelWidth}`;

        const htLabel = document.createElement('div');
        htLabel.className = 'info-label';
        htLabel.textContent = 'ht';
        bottomInfo.appendChild(htLabel);

        // Empty cells for each row
        rows.forEach(() => {
            bottomInfo.appendChild(document.createElement('div'));
        });

        const wtLabel = document.createElement('div');
        wtLabel.className = 'info-label';
        wtLabel.textContent = 'wt';
        bottomInfo.appendChild(wtLabel);

        bayCard.appendChild(bottomInfo);

        // Legend for this bay
        const legend = document.createElement('div');
        legend.className = 'bay-2d-legend';

        const legendTitle = document.createElement('h4');
        legendTitle.textContent = 'Leyenda - Puertos de Destino';
        legend.appendChild(legendTitle);

        const legendItems = document.createElement('div');
        legendItems.className = 'legend-items-2d';

        // Get unique ports in this bay
        const portsInBay = new Set();
        rows.forEach(row => {
            tiers.forEach(tier => {
                if (bayData[row] && bayData[row][tier]) {
                    portsInBay.add(bayData[row][tier].portDestination);
                }
            });
        });

        // Create legend items
        Array.from(portsInBay).sort().forEach(port => {
            if (!port) return;

            const item = document.createElement('div');
            item.className = 'legend-item-2d';

            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color-box';
            colorBox.style.backgroundColor = portColors[port];

            const portInfo = EDICodes.formatPort(port);
            const text = document.createElement('span');
            text.textContent = portInfo.formatted;

            item.appendChild(colorBox);
            item.appendChild(text);
            legendItems.appendChild(item);
        });

        legend.appendChild(legendItems);
        bayCard.appendChild(legend);

        gridContainer.appendChild(bayCard);

        // Sync horizontal scroll between header, body, and footer
        syncHorizontalScroll(rowHeader, bayView, bottomInfo);
    });

    console.log('Generated 2D Bayplan for', bays.length, 'bays');
}

/**
 * Synchronize horizontal scroll between multiple elements
 */
function syncHorizontalScroll(...elements) {
    let isScrolling = false;

    elements.forEach((element, index) => {
        element.addEventListener('scroll', function() {
            if (!isScrolling) {
                isScrolling = true;
                const scrollLeft = this.scrollLeft;

                elements.forEach((el, i) => {
                    if (i !== index) {
                        el.scrollLeft = scrollLeft;
                    }
                });

                requestAnimationFrame(() => {
                    isScrolling = false;
                });
            }
        });
    });
}

/**
 * Set bayplan 3D view
 */
function setBayplanView(viewType, clickedButton) {
    if (bayplanVisualizer) {
        bayplanVisualizer.setView(viewType);

        // Update active button state
        document.querySelectorAll('.btn-view').forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
    }
}

/**
 * Reset application
 */
function resetApp() {
    // Reset data
    currentData = null;
    filteredData = [];
    currentPage = 1;

    // Reset 3D visualizer
    if (bayplanVisualizer) {
        bayplanVisualizer.clearContainers();
        bayplanVisualizer = null;
    }

    // Reset UI
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('fileLoadedInfo').style.display = 'none';
    document.getElementById('voyageSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('bayplanSection').style.display = 'none';
    document.getElementById('tableSection').style.display = 'none';

    // Reset filters
    document.getElementById('searchInput').value = '';
    document.getElementById('filterDestination').value = '';
    document.getElementById('filterStatus').value = '';
}

/**
 * Populate container selector with all containers
 */
function populateContainerSelector() {
    console.log('Populating container selector...');
    console.log('Current data:', currentData);
    console.log('Containers count:', currentData?.containers?.length);

    if (!currentData || !currentData.containers || currentData.containers.length === 0) {
        console.error('No containers available to populate selector');
        return;
    }

    const containerSelect = document.getElementById('containerSelect');
    if (!containerSelect) {
        console.error('Container select element not found');
        return;
    }

    // Clear existing options (except first)
    containerSelect.innerHTML = '<option value="">Seleccionar contenedor...</option>';

    // Sort containers by number
    const sortedContainers = [...currentData.containers].sort((a, b) =>
        a.containerNumber.localeCompare(b.containerNumber)
    );

    console.log('Adding', sortedContainers.length, 'containers to selector');

    // Add container options
    sortedContainers.forEach(container => {
        const option = document.createElement('option');
        option.value = container.containerNumber;
        const portDest = EDICodes.formatPort(container.portDestination);
        option.textContent = `${container.containerNumber} - ${portDest.code} - Bay ${container.bayPosition}`;
        option.dataset.containerNumber = container.containerNumber;
        containerSelect.appendChild(option);
    });

    console.log('Container selector populated with', containerSelect.options.length - 1, 'containers');
}

/**
 * Filter container list based on search input
 */
function filterContainerList() {
    const searchTerm = document.getElementById('containerSearch').value.toLowerCase();
    const containerSelect = document.getElementById('containerSelect');
    const options = containerSelect.querySelectorAll('option');

    let visibleCount = 0;

    options.forEach((option, index) => {
        if (index === 0) return; // Skip first "Seleccionar..." option

        const text = option.textContent.toLowerCase();
        const matches = text.includes(searchTerm);

        option.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
    });

    // If only one match, auto-select it
    if (visibleCount === 1 && searchTerm.length > 0) {
        const visibleOption = Array.from(options).find((opt, idx) =>
            idx > 0 && opt.style.display !== 'none'
        );
        if (visibleOption) {
            containerSelect.value = visibleOption.value;
            selectContainer();
        }
    }
}

/**
 * Initialize sidebar events (call once)
 */
function initializeSidebarEvents() {
    console.log('Initializing sidebar events...');

    // Setup sidebar search
    const sidebarSearch = document.getElementById('sidebarSearch');
    if (sidebarSearch) {
        sidebarSearch.addEventListener('input', filterSidebar);
    }

    // Setup toggle button
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const sidebar = document.getElementById('bayplanSidebar');
    if (btnToggleSidebar && sidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            btnToggleSidebar.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
            // Resize canvas after sidebar toggle
            if (bayplanVisualizer) {
                setTimeout(() => {
                    bayplanVisualizer.onWindowResize();
                }, 350);
            }
        });
    }
}

/**
 * Populate sidebar with containers grouped by bay
 */
function populateSidebar() {
    if (!currentData || !currentData.containers || currentData.containers.length === 0) {
        return;
    }

    const sidebarContent = document.getElementById('sidebarContent');
    const sidebarTotal = document.getElementById('sidebarTotal');

    if (!sidebarContent || !sidebarTotal) {
        return;
    }

    // Update total
    sidebarTotal.textContent = `${currentData.containers.length} contenedores`;

    // Group containers by bay
    const bayGroups = {};
    currentData.containers.forEach(container => {
        const bay = container.bay || 0;
        if (!bayGroups[bay]) {
            bayGroups[bay] = [];
        }
        bayGroups[bay].push(container);
    });

    // Sort bays
    const sortedBays = Object.keys(bayGroups).map(Number).sort((a, b) => a - b);

    // Build HTML in one go (much faster than DOM manipulation)
    let html = '';

    sortedBays.forEach(bay => {
        const containers = bayGroups[bay];

        // Sort containers by position
        containers.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.tier - b.tier;
        });

        html += `
            <div class="sidebar-bay-group">
                <div class="bay-group-header" data-bay="${bay}">
                    <span>Bay ${String(bay).padStart(3, '0')}</span>
                    <span class="bay-count">${containers.length}</span>
                </div>
                <div class="bay-containers">
        `;

        containers.forEach(container => {
            const portDest = EDICodes.formatPort(container.portDestination);
            const size = container.containerType?.startsWith('20') ? "20'" :
                        container.containerType?.startsWith('40') ? "40'" :
                        container.containerType?.startsWith('45') ? "45'" : 'STD';

            html += `
                <div class="sidebar-container-item" data-container-number="${container.containerNumber}">
                    <div class="container-item-number">${container.containerNumber}</div>
                    <div class="container-item-details">
                        <span class="container-item-badge">${container.bayPosition || '-'}</span>
                        <span class="container-item-badge">→ ${portDest.code}</span>
                        <span class="container-item-badge">${size}</span>
                        ${container.temperature !== null ? '<span class="container-item-badge">❄️</span>' : ''}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    // Single DOM update
    sidebarContent.innerHTML = html;

    // Add event listeners after rendering (using event delegation)
    sidebarContent.addEventListener('click', (e) => {
        const bayHeader = e.target.closest('.bay-group-header');
        if (bayHeader) {
            const bayContainers = bayHeader.nextElementSibling;
            bayContainers.classList.toggle('collapsed');
            return;
        }

        const containerItem = e.target.closest('.sidebar-container-item');
        if (containerItem) {
            const containerNumber = containerItem.dataset.containerNumber;
            selectContainerFromSidebar(containerNumber);
        }
    });
}

/**
 * Filter sidebar containers based on search
 */
function filterSidebar() {
    const searchTerm = document.getElementById('sidebarSearch').value.toLowerCase();
    const items = document.querySelectorAll('.sidebar-container-item');
    const bayGroups = document.querySelectorAll('.sidebar-bay-group');

    let totalVisible = 0;

    bayGroups.forEach(group => {
        const bayContainers = group.querySelector('.bay-containers');
        const groupItems = group.querySelectorAll('.sidebar-container-item');
        let visibleInBay = 0;

        groupItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            const matches = text.includes(searchTerm);
            item.style.display = matches ? '' : 'none';
            if (matches) {
                visibleInBay++;
                totalVisible++;
            }
        });

        // Hide bay group if no visible containers
        group.style.display = visibleInBay > 0 ? '' : 'none';

        // Auto-expand bay groups with matches
        if (visibleInBay > 0 && searchTerm.length > 0) {
            bayContainers.classList.remove('collapsed');
        }
    });

    // Update total
    const sidebarTotal = document.getElementById('sidebarTotal');
    if (sidebarTotal) {
        sidebarTotal.textContent = searchTerm ?
            `${totalVisible} de ${currentData.containers.length} contenedores` :
            `${currentData.containers.length} contenedores`;
    }
}

/**
 * Select container from sidebar
 */
function selectContainerFromSidebar(containerNumber) {
    // Remove previous selection
    document.querySelectorAll('.sidebar-container-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Add selection to clicked item
    const selectedItem = document.querySelector(`[data-container-number="${containerNumber}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    // Highlight and focus in 3D
    if (bayplanVisualizer) {
        bayplanVisualizer.highlightContainer(containerNumber);
        bayplanVisualizer.focusOnContainer(containerNumber);
    }
}

/**
 * Select and focus on a specific container
 */
function selectContainer() {
    const containerSelect = document.getElementById('containerSelect');
    const containerNumber = containerSelect.value;

    if (!containerNumber) {
        // Reset highlight if no container selected
        if (bayplanVisualizer) {
            bayplanVisualizer.resetHighlight();
        }
        return;
    }

    // Switch to Bayplan tab and 3D view
    switchMainTab('bayplan');
    switchBayplanTab('3d');

    // Highlight and focus on selected container
    if (bayplanVisualizer) {
        // Add a small delay to ensure 3D view is ready
        setTimeout(() => {
            bayplanVisualizer.highlightContainer(containerNumber);
            bayplanVisualizer.focusOnContainer(containerNumber);
        }, 100);
    }
}

/**
 * Reset container selection and view
 */
function resetContainerSelection() {
    // Clear search input
    document.getElementById('containerSearch').value = '';

    // Reset selector
    document.getElementById('containerSelect').value = '';

    // Show all options
    const options = document.getElementById('containerSelect').querySelectorAll('option');
    options.forEach(option => {
        option.style.display = '';
    });

    // Reset 3D view
    if (bayplanVisualizer) {
        bayplanVisualizer.resetHighlight();
        bayplanVisualizer.centerCameraOnContainers();
    }
}

/**
 * Generate Bayplan PDF in 2D format (matching web view)
 */
function generateBayplanPDF() {
    if (!currentData || !currentData.containers || currentData.containers.length === 0) {
        alert('No hay datos para generar el PDF');
        return;
    }

    const { jsPDF } = window.jspdf;
    const bayStructure = buildBayStructure();
    const portColors = assignPortColors();
    const bays = Object.keys(bayStructure).map(Number).sort((a, b) => a - b);

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    bays.forEach((bay, bayIndex) => {
        if (bayIndex > 0) {
            doc.addPage();
        }

        // Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('BAYPLAN - CONTAINER STOWAGE PLAN', pageWidth / 2, 10, { align: 'center' });

        // Voyage info (compact)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const voyage = currentData.voyage;
        doc.text(`${voyage.vesselName || '-'} | Voyage: ${voyage.voyageNumber || '-'} | Bay: ${String(bay).padStart(3, '0')}`, pageWidth / 2, 16, { align: 'center' });

        // Bay data
        const bayData = bayStructure[bay];

        // Sort rows like web view
        const rows = Object.keys(bayData).map(Number).sort((a, b) => {
            const aIsEven = a % 2 === 0 && a !== 0;
            const bIsEven = b % 2 === 0 && b !== 0;
            const aIsZero = a === 0;
            const bIsZero = b === 0;

            if (aIsEven && !bIsEven) return -1;
            if (!aIsEven && bIsEven) return 1;
            if (aIsZero && !bIsZero) return bIsEven ? 1 : -1;
            if (!aIsZero && bIsZero) return aIsEven ? -1 : 1;

            if (aIsEven && bIsEven) return b - a;
            return a - b;
        });

        // Get all tiers
        const allTiers = new Set();
        rows.forEach(row => {
            Object.keys(bayData[row]).forEach(tier => allTiers.add(Number(tier)));
        });
        const tiers = Array.from(allTiers).sort((a, b) => b - a);

        // Calculate dimensions
        const cellWidth = Math.min(25, (pageWidth - 30) / (rows.length + 2));
        const cellHeight = Math.min(18, (pageHeight - 60) / (tiers.length + 2));
        const startX = 15;
        const startY = 25;
        const tierLabelWidth = 8;

        // Draw row headers (top)
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        rows.forEach((row, i) => {
            const x = startX + tierLabelWidth + (i * cellWidth);
            doc.setFillColor(45, 55, 72);
            doc.rect(x, startY, cellWidth, 5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(String(row).padStart(2, '0'), x + cellWidth / 2, startY + 3.5, { align: 'center' });
        });

        // Draw grid with containers
        tiers.forEach((tier, tierIdx) => {
            const y = startY + 5 + (tierIdx * cellHeight);

            // Left tier label
            doc.setFillColor(74, 85, 104);
            doc.rect(startX, y, tierLabelWidth, cellHeight, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text(String(tier).padStart(2, '0'), startX + tierLabelWidth / 2, y + cellHeight / 2 + 1, { align: 'center' });

            // Container cells
            rows.forEach((row, rowIdx) => {
                const x = startX + tierLabelWidth + (rowIdx * cellWidth);

                if (bayData[row] && bayData[row][tier]) {
                    const container = bayData[row][tier];

                    // Background color
                    const portColor = portColors[container.portDestination] || '#888888';
                    const rgb = hexToRgb(portColor);
                    doc.setFillColor(rgb.r, rgb.g, rgb.b);
                    doc.rect(x, y, cellWidth, cellHeight, 'F');

                    // Border (thicker for reefer/damaged)
                    if (container.temperature !== null) {
                        doc.setDrawColor(44, 82, 130);
                        doc.setLineWidth(0.5);
                    } else if (container.status === 'DAMAGED') {
                        doc.setDrawColor(197, 48, 48);
                        doc.setLineWidth(0.5);
                    } else {
                        doc.setDrawColor(203, 213, 224);
                        doc.setLineWidth(0.2);
                    }
                    doc.rect(x, y, cellWidth, cellHeight);

                    // Container content (text)
                    doc.setTextColor(26, 32, 44);

                    // Port (top, small)
                    doc.setFontSize(5);
                    doc.setFont('helvetica', 'normal');
                    const destPort = EDICodes.formatPort(container.portDestination);
                    doc.text(`e ${destPort.code}`, x + cellWidth / 2, y + 2, { align: 'center' });

                    // Container number (center, large)
                    doc.setFontSize(6);
                    doc.setFont('helvetica', 'bold');
                    const cNum = container.containerNumber;
                    const line1 = cNum.substring(0, 4);
                    const line2 = cNum.substring(4);
                    doc.text(line1, x + cellWidth / 2, y + cellHeight / 2 - 0.5, { align: 'center' });
                    doc.text(line2, x + cellWidth / 2, y + cellHeight / 2 + 2, { align: 'center' });

                    // Type (bottom, small)
                    doc.setFontSize(5);
                    doc.setFont('helvetica', 'normal');
                    const typeCode = container.containerType || '';
                    let size = 'STD';
                    if (typeCode.startsWith('20')) size = "20'";
                    else if (typeCode.startsWith('40')) size = "40'";
                    else if (typeCode.startsWith('45')) size = "45'";
                    doc.text(size, x + cellWidth / 2, y + cellHeight - 3, { align: 'center' });
                    doc.text(typeCode.substring(0, 6), x + cellWidth / 2, y + cellHeight - 0.5, { align: 'center' });

                } else {
                    // Empty cell
                    doc.setFillColor(247, 250, 252);
                    doc.rect(x, y, cellWidth, cellHeight, 'F');
                    doc.setDrawColor(203, 213, 224);
                    doc.setLineWidth(0.1);
                    doc.rect(x, y, cellWidth, cellHeight);
                }
            });

            // Right tier label
            const rightX = startX + tierLabelWidth + (rows.length * cellWidth);
            doc.setFillColor(74, 85, 104);
            doc.rect(rightX, y, tierLabelWidth, cellHeight, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(String(tier).padStart(2, '0'), rightX + tierLabelWidth / 2, y + cellHeight / 2 + 1, { align: 'center' });
        });

        // Bottom labels (ht, wt)
        const bottomY = startY + 5 + (tiers.length * cellHeight);
        doc.setFillColor(113, 128, 150);
        doc.rect(startX, bottomY, tierLabelWidth, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.text('ht', startX + tierLabelWidth / 2, bottomY + 3.5, { align: 'center' });

        const rightBottomX = startX + tierLabelWidth + (rows.length * cellWidth);
        doc.setFillColor(113, 128, 150);
        doc.rect(rightBottomX, bottomY, tierLabelWidth, 5, 'F');
        doc.text('wt', rightBottomX + tierLabelWidth / 2, bottomY + 3.5, { align: 'center' });

        // Legend
        const legendY = bottomY + 10;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text('LEYENDA - PUERTOS DE DESTINO', startX, legendY);

        // Get unique ports in this bay
        const portsInBay = new Set();
        rows.forEach(row => {
            tiers.forEach(tier => {
                if (bayData[row] && bayData[row][tier]) {
                    portsInBay.add(bayData[row][tier].portDestination);
                }
            });
        });

        let legendX = startX;
        let legendYPos = legendY + 5;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');

        Array.from(portsInBay).sort().forEach((port, idx) => {
            if (!port) return;

            const portColor = portColors[port];
            const rgb = hexToRgb(portColor);

            // Color box
            doc.setFillColor(rgb.r, rgb.g, rgb.b);
            doc.rect(legendX, legendYPos - 2.5, 4, 3, 'F');
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.1);
            doc.rect(legendX, legendYPos - 2.5, 4, 3);

            // Port name
            const portInfo = EDICodes.formatPort(port);
            doc.setTextColor(45, 55, 72);
            doc.text(portInfo.formatted, legendX + 5, legendYPos);

            // Move to next position (2 columns)
            legendX += 65;
            if (legendX > pageWidth - 60) {
                legendX = startX;
                legendYPos += 5;
            }
        });

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('ProEDI - by B&M', pageWidth / 2, pageHeight - 5, { align: 'center' });
    });

    // Save PDF
    const fileName = `Bayplan_${currentData.voyage.vesselName || 'Vessel'}_${currentData.voyage.voyageNumber || 'Voyage'}.pdf`;
    doc.save(fileName);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 136, g: 136, b: 136 };
}

/**
 * Build bay structure from containers
 */
function buildBayStructure() {
    const structure = {};
    const positionConflicts = [];

    currentData.containers.forEach(container => {
        if (!container.bay || !container.row || !container.tier) return;

        const bayKey = container.bay;
        if (!structure[bayKey]) {
            structure[bayKey] = {};
        }

        const rowKey = container.row;
        if (!structure[bayKey][rowKey]) {
            structure[bayKey][rowKey] = {};
        }

        // Check if position is already occupied
        if (structure[bayKey][rowKey][container.tier]) {
            const existing = structure[bayKey][rowKey][container.tier];
            positionConflicts.push({
                position: `Bay ${bayKey}, Row ${rowKey}, Tier ${container.tier}`,
                existing: existing.containerNumber,
                new: container.containerNumber
            });
        }

        structure[bayKey][rowKey][container.tier] = container;
    });

    if (positionConflicts.length > 0) {
        console.warn(`Found ${positionConflicts.length} position conflicts in 2D bayplan:`);
        positionConflicts.forEach(conflict => {
            console.warn(`  ${conflict.position}: ${conflict.existing} overwritten by ${conflict.new}`);
        });
    }

    return structure;
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
