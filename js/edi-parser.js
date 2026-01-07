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

            // Parse each segment
            for (let segment of segments) {
                const parts = segment.split('+');
                const tag = parts[0];

                switch (tag) {
                    case 'UNB':
                        this.parseUNB(parts);
                        break;

                    case 'TDT':
                        this.parseTDT(parts);
                        break;

                    case 'LOC':
                        this.parseLOC(parts, currentContainer);
                        break;

                    case 'DTM':
                        this.parseDTM(parts);
                        break;

                    case 'RFF':
                        this.parseRFF(parts);
                        break;

                    case 'EQD':
                        // Save previous container if exists
                        if (currentContainer) {
                            this.data.containers.push(currentContainer);
                        }
                        // Create new container
                        currentContainer = this.parseEQD(parts);
                        break;

                    case 'MEA':
                        if (currentContainer) {
                            this.parseMEA(parts, currentContainer);
                        }
                        break;

                    case 'FTX':
                        if (currentContainer) {
                            this.parseFTX(parts, currentContainer);
                        }
                        break;

                    case 'TMP':
                        if (currentContainer) {
                            this.parseTMP(parts, currentContainer);
                        }
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
    parseLOC(parts, currentContainer) {
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
                    currentContainer.bayPosition = location;
                }
                break;

            case '9': // Port of origin for container
                if (currentContainer) {
                    currentContainer.portOrigin = location;
                }
                break;

            case '11': // Port of destination for container
                if (currentContainer) {
                    currentContainer.portDestination = location;
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
    parseRFF(parts) {
        if (parts.length >= 2) {
            const refInfo = parts[1].split(':');
            if (refInfo[0] === 'VON' && refInfo[1]) {
                // Voyage reference number
                if (!this.data.voyage.voyageNumber) {
                    this.data.voyage.voyageNumber = refInfo[1];
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
    parseMEA(parts, container) {
        if (parts.length >= 4 && parts[1] === 'WT') {
            const weightInfo = parts[3].split(':');
            if (weightInfo.length >= 2) {
                container.weight = parseInt(weightInfo[1]) || 0;
            }
        }
    }

    /**
     * Parse FTX segment (Free Text - Cargo description)
     */
    parseFTX(parts, container) {
        if (parts.length >= 4) {
            const ftxType = parts[1];
            const description = parts[3];

            if (ftxType === 'AAA') {
                // Cargo type
                container.cargoType = description || '';
            } else if (ftxType === 'AAI' && description === 'DAMAGED') {
                // Damaged status
                container.status = 'DAMAGED';
            } else if (ftxType === 'CLR') {
                // Clearance (cargo description)
                if (!container.cargoType) {
                    container.cargoType = description || '';
                }
            }
        }
    }

    /**
     * Parse TMP segment (Temperature)
     */
    parseTMP(parts, container) {
        if (parts.length >= 3 && parts[1] === '2') {
            const tempInfo = parts[2].split(':');
            if (tempInfo.length >= 1) {
                container.temperature = parseFloat(tempInfo[0]) || null;
                if (container.temperature !== null) {
                    container.status = 'REEFER';
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
