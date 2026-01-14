/**
 * EDI Parser for EDIFACT BAPLIE Messages
 * Parses container stowage plan information
 */

class EDIParser {
    constructor() {
        this.data = {
            voyage: {},
            containers: []
        };
    }

    /**
     * Main parsing function
     * @param {string} ediContent - Raw EDI file content
     * @returns {object} Parsed data structure
     */
    parse(ediContent) {
        try {
            // Split by segment terminator (')
            const segments = ediContent.split("'").filter(s => s.trim().length > 0);

            // Reset data
            this.data = {
                voyage: {
                    vesselName: '',
                    voyageNumber: '',
                    portOrigin: '',
                    portDestination: '',
                    arrivalDate: '',
                    transmissionDate: ''
                },
                containers: []
            };

            let currentContainer = null;
            let pendingData = {}; // Store data that comes before EQD (BAPLIE 2.0/2.2 format)

            // Parse each segment
            for (let segment of segments) {
                segment = segment.trim(); // Remove whitespace and newlines
                if (!segment) continue;

                const parts = segment.split('+');
                const tag = parts[0].trim();

                switch (tag) {
                    case 'UNB':
                        this.parseUNB(parts);
                        break;

                    case 'TDT':
                        this.parseTDT(parts);
                        break;

                    case 'LOC':
                        this.parseLOC(parts, currentContainer, pendingData);
                        break;

                    case 'DTM':
                        this.parseDTM(parts);
                        break;

                    case 'RFF':
                        this.parseRFF(parts, currentContainer, pendingData);
                        break;

                    case 'GDS':
                        // Cargo description (may come before EQD in BAPLIE 2.0/2.2)
                        if (currentContainer) {
                            if (parts.length >= 2) {
                                currentContainer.cargoType = parts[1];
                            }
                        } else {
                            pendingData.cargoType = parts.length >= 2 ? parts[1] : '';
                        }
                        break;

                    case 'EQD':
                        // Save previous container if exists
                        if (currentContainer) {
                            this.data.containers.push(currentContainer);
                        }
                        // Create new container
                        currentContainer = this.parseEQD(parts);

                        // Apply pending data to new container (BAPLIE 2.0/2.2 format)
                        if (pendingData.bayPosition) {
                            currentContainer.bayPosition = pendingData.bayPosition;
                            currentContainer.bay = pendingData.bay;
                            currentContainer.row = pendingData.row;
                            currentContainer.tier = pendingData.tier;
                        }
                        if (pendingData.portOrigin) currentContainer.portOrigin = pendingData.portOrigin;
                        if (pendingData.portDestination) currentContainer.portDestination = pendingData.portDestination;
                        if (pendingData.weight !== undefined) currentContainer.weight = pendingData.weight;
                        if (pendingData.cargoType) currentContainer.cargoType = pendingData.cargoType;
                        if (pendingData.temperature !== undefined) currentContainer.temperature = pendingData.temperature;
                        if (pendingData.status) currentContainer.status = pendingData.status;
                        if (pendingData.bookingRef) currentContainer.bookingRef = pendingData.bookingRef;

                        // Clear pending data
                        pendingData = {};
                        break;

                    case 'MEA':
                        this.parseMEA(parts, currentContainer, pendingData);
                        break;

                    case 'FTX':
                        this.parseFTX(parts, currentContainer, pendingData);
                        break;

                    case 'TMP':
                        this.parseTMP(parts, currentContainer, pendingData);
                        break;

                    case 'NAD':
                        if (currentContainer) {
                            this.parseNAD(parts, currentContainer);
                        }
                        break;
                }
            }

            // Add last container
            if (currentContainer) {
                this.data.containers.push(currentContainer);
            }

            // Deduplicate containers by container number AND position (safety net)
            const seenNumbers = new Set();
            const seenPositions = new Set();
            const originalCount = this.data.containers.length;

            this.data.containers = this.data.containers.filter(container => {
                const positionKey = `${container.bay}-${container.row}-${container.tier}`;

                // Check for duplicate container number
                if (seenNumbers.has(container.containerNumber)) {
                    console.warn('Duplicate container number removed:', container.containerNumber);
                    return false;
                }

                // Check for duplicate position (two containers at same physical location)
                // Allow 0 as valid value for bay/row/tier
                if (container.bay != null && container.row != null && container.tier != null && seenPositions.has(positionKey)) {
                    console.warn(`Duplicate position removed: ${container.containerNumber} at Bay ${container.bay}, Row ${container.row}, Tier ${container.tier}`);
                    return false;
                }

                seenNumbers.add(container.containerNumber);
                if (container.bay != null && container.row != null && container.tier != null) {
                    seenPositions.add(positionKey);
                }
                return true;
            });

            const duplicatesRemoved = originalCount - this.data.containers.length;
            if (duplicatesRemoved > 0) {
                console.log(`Deduplication: Removed ${duplicatesRemoved} duplicate(s) - ${this.data.containers.length} unique containers remain`);
            }

            return this.data;

        } catch (error) {
            console.error('Error parsing EDI:', error);
            throw new Error('Error al procesar el archivo EDI: ' + error.message);
        }
    }

    /**
     * Parse UNB segment (Interchange Header)
     */
    parseUNB(parts) {
        if (parts.length >= 5) {
            const dateTime = parts[4].split(':');
            if (dateTime.length >= 2) {
                this.data.voyage.transmissionDate = this.formatDateTime(dateTime[0], dateTime[1]);
            }
        }
    }

    /**
     * Parse TDT segment (Transport Details)
     */
    parseTDT(parts) {
        if (parts.length >= 9) {
            this.data.voyage.voyageNumber = parts[2] || '';

            // Vessel name is usually in parts[8]
            const vesselInfo = parts[8] ? parts[8].split(':') : [];
            if (vesselInfo.length >= 3) {
                this.data.voyage.vesselName = vesselInfo[2] || '';
            }
        }
    }

    /**
     * Parse LOC segment (Location)
     */
    parseLOC(parts, currentContainer, pendingData = {}) {
        if (parts.length < 3) return;

        const locType = parts[1];
        const location = parts[2].split(':')[0];

        switch (locType) {
            case '5': // Port of loading
                this.data.voyage.portOrigin = location;
                break;

            case '61': // Port of discharge
                this.data.voyage.portDestination = location;
                break;

            case '147': // Stowage location (bay position)
                if (currentContainer) {
                    // Update existing container position
                    currentContainer.bayPosition = location;
                    // Parse bay position into bay, row, tier (format: BBBRRTT)
                    if (location && location.length >= 6) {
                        currentContainer.bay = parseInt(location.substring(0, 3)) || 0;
                        currentContainer.row = parseInt(location.substring(3, 5)) || 0;
                        currentContainer.tier = parseInt(location.substring(5, 7)) || 0;
                    }
                } else {
                    // Store in pending data (BAPLIE 2.0/2.2 format - LOC comes before EQD)
                    pendingData.bayPosition = location;
                    if (location && location.length >= 6) {
                        pendingData.bay = parseInt(location.substring(0, 3)) || 0;
                        pendingData.row = parseInt(location.substring(3, 5)) || 0;
                        pendingData.tier = parseInt(location.substring(5, 7)) || 0;
                    }
                }
                break;

            case '9': // Port of origin for container
                if (currentContainer) {
                    currentContainer.portOrigin = location;
                } else {
                    pendingData.portOrigin = location;
                }
                break;

            case '11': // Port of destination for container
                if (currentContainer) {
                    currentContainer.portDestination = location;
                } else {
                    pendingData.portDestination = location;
                }
                break;
        }
    }

    /**
     * Parse DTM segment (Date/Time)
     */
    parseDTM(parts) {
        if (parts.length < 2) return;

        const dtmInfo = parts[1].split(':');
        const dtmType = dtmInfo[0];
        const dateTime = dtmInfo[1];

        switch (dtmType) {
            case '133': // Estimated date/time of arrival
                this.data.voyage.arrivalDate = this.formatDateTime(dateTime);
                break;

            case '137': // Document/message date/time
                if (!this.data.voyage.transmissionDate) {
                    this.data.voyage.transmissionDate = this.formatDateTime(dateTime);
                }
                break;
        }
    }

    /**
     * Parse RFF segment (Reference)
     */
    parseRFF(parts, currentContainer, pendingData = {}) {
        if (parts.length >= 2) {
            const refInfo = parts[1].split(':');
            if (refInfo[0] === 'VON' && refInfo[1]) {
                // Voyage reference number
                if (!this.data.voyage.voyageNumber) {
                    this.data.voyage.voyageNumber = refInfo[1];
                }
            } else if (refInfo[0] === 'BN' && refInfo[1]) {
                // Booking reference (may come before EQD in BAPLIE 2.0/2.2)
                if (currentContainer) {
                    currentContainer.bookingRef = refInfo[1];
                } else {
                    pendingData.bookingRef = refInfo[1];
                }
            }
        }
    }

    /**
     * Parse EQD segment (Equipment Details - Container)
     */
    parseEQD(parts) {
        return {
            containerNumber: parts[2] || '',
            containerType: parts[3] || '',
            bayPosition: '',
            bay: 0,
            row: 0,
            tier: 0,
            portOrigin: '',
            portDestination: '',
            weight: null,
            cargoType: '',
            temperature: null,
            status: 'OK',
            carrier: ''
        };
    }

    /**
     * Parse MEA segment (Measurements - Weight)
     */
    parseMEA(parts, container, pendingData = {}) {
        if (parts.length >= 4) {
            const meaType = parts[1];
            const weightInfo = parts[3].split(':');

            if (meaType === 'WT' || meaType === 'VGM') {
                // Weight or VGM (Verified Gross Mass)
                if (weightInfo.length >= 2) {
                    const weight = parseInt(weightInfo[1]) || 0;
                    if (container) {
                        container.weight = weight;
                    } else {
                        pendingData.weight = weight;
                    }
                }
            }
        }
    }

    /**
     * Parse FTX segment (Free Text - Cargo description)
     */
    parseFTX(parts, container, pendingData = {}) {
        if (parts.length >= 4) {
            const ftxType = parts[1];
            const description = parts[3];

            if (ftxType === 'AAA') {
                // Cargo type
                if (container) {
                    container.cargoType = description || '';
                } else {
                    // Store most recent cargo description (don't overwrite GDS)
                    if (!pendingData.cargoType) {
                        pendingData.cargoType = description || '';
                    }
                }
            } else if (ftxType === 'AAI' && description === 'DAMAGED') {
                // Damaged status
                if (container) {
                    container.status = 'DAMAGED';
                } else {
                    pendingData.status = 'DAMAGED';
                }
            } else if (ftxType === 'CLR') {
                // Clearance (cargo description)
                if (container && !container.cargoType) {
                    container.cargoType = description || '';
                } else if (!container && !pendingData.cargoType) {
                    pendingData.cargoType = description || '';
                }
            }
        }
    }

    /**
     * Parse TMP segment (Temperature)
     */
    parseTMP(parts, container, pendingData = {}) {
        if (parts.length >= 3 && parts[1] === '2') {
            const tempInfo = parts[2].split(':');
            if (tempInfo.length >= 1) {
                const temperature = parseFloat(tempInfo[0]) || null;
                if (container) {
                    container.temperature = temperature;
                    if (container.temperature !== null) {
                        container.status = 'REEFER';
                    }
                } else {
                    pendingData.temperature = temperature;
                    if (pendingData.temperature !== null) {
                        pendingData.status = 'REEFER';
                    }
                }
            }
        }
    }

    /**
     * Parse NAD segment (Name and Address - Carrier)
     */
    parseNAD(parts, container) {
        if (parts.length >= 3 && parts[1] === 'CA') {
            const carrierInfo = parts[2].split(':');
            container.carrier = carrierInfo[0] || '';
        }
    }

    /**
     * Format date/time from EDI format to readable format
     */
    formatDateTime(dateStr, timeStr = '') {
        try {
            // EDI format: YYMMDD or YYMMDDHHMM
            if (dateStr.length >= 6) {
                const year = '20' + dateStr.substring(0, 2);
                const month = dateStr.substring(2, 4);
                const day = dateStr.substring(4, 6);

                let formattedDate = `${day}/${month}/${year}`;

                if (dateStr.length >= 10 || timeStr.length >= 4) {
                    const hours = dateStr.length >= 8 ? dateStr.substring(6, 8) : timeStr.substring(0, 2);
                    const minutes = dateStr.length >= 10 ? dateStr.substring(8, 10) : timeStr.substring(2, 4);
                    formattedDate += ` ${hours}:${minutes}`;
                }

                return formattedDate;
            }
            return dateStr;
        } catch (error) {
            return dateStr;
        }
    }

    /**
     * Get summary statistics
     */
    getStatistics() {
        const stats = {
            totalContainers: this.data.containers.length,
            totalWeight: 0,
            reeferContainers: 0,
            damagedContainers: 0,
            destinationCounts: {}
        };

        this.data.containers.forEach(container => {
            stats.totalWeight += container.weight || 0;

            if (container.temperature !== null) {
                stats.reeferContainers++;
            }

            if (container.status === 'DAMAGED') {
                stats.damagedContainers++;
            }

            // Count by destination
            const dest = container.portDestination || 'Unknown';
            stats.destinationCounts[dest] = (stats.destinationCounts[dest] || 0) + 1;
        });

        // Convert weight to tons
        stats.totalWeight = (stats.totalWeight / 1000).toFixed(2);

        return stats;
    }

    /**
     * Get unique destinations for filtering
     */
    getDestinations() {
        const destinations = new Set();
        this.data.containers.forEach(container => {
            if (container.portDestination) {
                destinations.add(container.portDestination);
            }
        });
        return Array.from(destinations).sort();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EDIParser;
}
