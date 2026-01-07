/**
 * Main Application Logic
 * Handles file upload, data display, search, filters, and export
 */

// Global variables
let parser = new EDIParser();
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

        // Display data
        displayVoyageInfo();
        displayStatistics();
        populateFilters();
        currentPage = 1;
        displayTable();

        // Show sections
        document.getElementById('voyageSection').style.display = 'block';
        document.getElementById('statsSection').style.display = 'block';
        document.getElementById('tableSection').style.display = 'block';

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

        // Apply row styling based on container properties
        if (container.status === 'DAMAGED') {
            row.classList.add('row-damaged');
        } else if (container.temperature !== null) {
            row.classList.add('row-reefer');
        } else if (container.cargoType && container.cargoType.includes('FOODSTUFF')) {
            row.classList.add('row-foodstuff');
        }

        // Add cells
        row.insertCell(0).textContent = startIndex + index + 1;
        row.insertCell(1).textContent = container.containerNumber;

        // Container Type with tooltip
        const typeCell = row.insertCell(2);
        typeCell.textContent = container.containerType || '-';
        if (container.containerType) {
            const typeInfo = EDICodes.formatContainerType(container.containerType);
            if (typeInfo.description) {
                typeCell.title = typeInfo.description;
                typeCell.style.cursor = 'help';
            }
        }

        row.insertCell(3).textContent = container.weight ? container.weight.toLocaleString() : '-';
        row.insertCell(4).textContent = container.bayPosition || '-';

        // Port Origin with tooltip
        const originCell = row.insertCell(5);
        originCell.textContent = container.portOrigin || '-';
        if (container.portOrigin) {
            const portInfo = EDICodes.formatPort(container.portOrigin);
            if (portInfo.name) {
                originCell.title = portInfo.name;
                originCell.style.cursor = 'help';
            }
        }

        // Port Destination with tooltip
        const destCell = row.insertCell(6);
        destCell.textContent = container.portDestination || '-';
        if (container.portDestination) {
            const portInfo = EDICodes.formatPort(container.portDestination);
            if (portInfo.name) {
                destCell.title = portInfo.name;
                destCell.style.cursor = 'help';
            }
        }

        // Cargo Type with translation
        const cargoCell = row.insertCell(7);
        const cargoType = container.cargoType || '-';
        cargoCell.textContent = EDICodes.getCargoType(cargoType);
        row.insertCell(8).textContent = container.temperature !== null ? container.temperature.toFixed(1) : '-';

        // Status cell with badge
        const statusCell = row.insertCell(9);
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
            case 2: valueA = a.containerType; valueB = b.containerType; break;
            case 3: valueA = a.weight || 0; valueB = b.weight || 0; break;
            case 4: valueA = a.bayPosition; valueB = b.bayPosition; break;
            case 5: valueA = a.portOrigin; valueB = b.portOrigin; break;
            case 6: valueA = a.portDestination; valueB = b.portDestination; break;
            case 7: valueA = a.cargoType; valueB = b.cargoType; break;
            case 8: valueA = a.temperature || -999; valueB = b.temperature || -999; break;
            case 9: valueA = a.status; valueB = b.status; break;
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
 * Reset application
 */
function resetApp() {
    // Reset data
    currentData = null;
    filteredData = [];
    currentPage = 1;

    // Reset UI
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('fileLoadedInfo').style.display = 'none';
    document.getElementById('voyageSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('tableSection').style.display = 'none';

    // Reset filters
    document.getElementById('searchInput').value = '';
    document.getElementById('filterDestination').value = '';
    document.getElementById('filterStatus').value = '';
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
