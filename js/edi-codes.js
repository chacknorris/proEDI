/**
 * EDI Code Dictionaries
 * UN/LOCODE ports, ISO container types, and other standard codes
 */

const EDICodes = {
    /**
     * UN/LOCODE Port Codes
     * Format: CODE: "Port Name, Country"
     */
    ports: {
        // Ecuador
        'ECPBO': 'Puerto Bolívar, Ecuador',
        'ECGYE': 'Guayaquil, Ecuador',
        'ECESM': 'Esmeraldas, Ecuador',
        'ECMEC': 'Manta, Ecuador',
        'ECPTM': 'Posorja Terminal, Ecuador',

        // Guinea
        'GPPTP': 'Puerto de Conakry, Guinea',

        // Guyana
        'GYGEO': 'Georgetown, Guyana',

        // Perú
        'PEPAI': 'Paita, Perú',
        'PECLL': 'Callao, Perú',
        'PEILO': 'Ilo, Perú',
        'PETPP': 'Talara, Perú',

        // Francia
        'FRRAD': 'Radès, Francia',
        'FRLEH': 'Le Havre, Francia',
        'FRMRS': 'Marsella, Francia',

        // Martinica (Francia)
        'MQFDF': 'Fort-de-France, Martinica',

        // Surinam
        'SRPBM': 'Paramaribo, Surinam',
        'SRNWN': 'Nieuw Nickerie, Surinam',

        // Colombia
        'COBUN': 'Buenaventura, Colombia',
        'COCTG': 'Cartagena, Colombia',
        'COBAR': 'Barranquilla, Colombia',
        'COSMC': 'Santa Marta, Colombia',

        // Panamá
        'PAMIT': 'MIT Balboa, Panamá',
        'PACRI': 'Cristóbal, Panamá',
        'PAPTY': 'Panamá City, Panamá',

        // Chile
        'CLVAP': 'Valparaíso, Chile',
        'CLSAI': 'San Antonio, Chile',
        'CLTCO': 'Talcahuano, Chile',

        // Estados Unidos
        'USNYC': 'New York, Estados Unidos',
        'USLAX': 'Los Angeles, Estados Unidos',
        'USHOU': 'Houston, Estados Unidos',
        'USMIA': 'Miami, Estados Unidos',

        // México
        'MXZLO': 'Manzanillo, México',
        'MXVER': 'Veracruz, México',
        'MXLZC': 'Lázaro Cárdenas, México',

        // China
        'CNSHA': 'Shanghai, China',
        'CNNBO': 'Ningbo, China',
        'CNSHK': 'Shekou, China',

        // Singapur
        'SGSIN': 'Singapur',

        // Japón
        'JPTYO': 'Tokyo, Japón',
        'JPYOK': 'Yokohama, Japón'
    },

    /**
     * ISO Container Type Codes
     * Format: CODE: "Description"
     */
    containerTypes: {
        // 20 feet
        '20G0': "20' Dry General Purpose",
        '20G1': "20' Dry General Purpose (Ventilated)",
        '22G0': "20' Dry General Purpose (>8'6\" high)",
        '22G1': "20' Dry General Purpose (>8'6\" high, Ventilated)",
        '2200': "20' Dry Van",
        '2210': "20' Dry Van (Ventilated)",

        // 40 feet
        '40G0': "40' Dry General Purpose",
        '40G1': "40' Dry General Purpose (Ventilated)",
        '42G0': "40' Dry High Cube",
        '42G1': "40' Dry High Cube (Ventilated)",
        '4000': "40' Dry Van",
        '4010': "40' Dry Van (Ventilated)",
        '4200': "40' High Cube",
        '4210': "40' High Cube (Ventilated)",

        // 45 feet
        '45G0': "45' Dry General Purpose",
        '45G1': "45' Dry General Purpose (Ventilated)",
        '45R0': "45' Refrigerated",
        '45R1': "45' Refrigerated High Cube",
        '4500': "45' Dry Van",
        '4510': "45' High Cube",

        // Refrigerated 20'
        '20R0': "20' Refrigerated",
        '20R1': "20' Refrigerated (Ventilated)",
        '22R0': "20' Refrigerated High Cube",
        '22R1': "20' Refrigerated High Cube (Ventilated)",

        // Refrigerated 40'
        '40R0': "40' Refrigerated",
        '40R1': "40' Refrigerated (Ventilated)",
        '42R0': "40' Refrigerated High Cube",
        '42R1': "40' Refrigerated High Cube (Ventilated)",

        // Open Top
        '20U0': "20' Open Top",
        '40U0': "40' Open Top",
        '42U0': "40' Open Top High Cube",

        // Flat Rack
        '20P0': "20' Flat Rack",
        '40P0': "40' Flat Rack",
        '42P0': "40' Flat Rack High Cube",

        // Tank
        '20T0': "20' Tank",
        '40T0': "40' Tank"
    },

    /**
     * Cargo Type Descriptions
     */
    cargoTypes: {
        'FOODSTUFFS': 'Productos Alimenticios',
        'DR': 'Carga Seca',
        'FROZEN': 'Congelados',
        'CHILLED': 'Refrigerados',
        'DANGEROUS': 'Mercancía Peligrosa',
        'FRAGILE': 'Frágil',
        'HEAVY': 'Carga Pesada',
        'GENERAL': 'Carga General'
    },

    /**
     * Country Codes (ISO 3166-1 alpha-2)
     */
    countries: {
        'EC': 'Ecuador',
        'PE': 'Perú',
        'CO': 'Colombia',
        'CL': 'Chile',
        'PA': 'Panamá',
        'MX': 'México',
        'US': 'Estados Unidos',
        'CA': 'Canadá',
        'BR': 'Brasil',
        'AR': 'Argentina',
        'VE': 'Venezuela',
        'GP': 'Guinea',
        'GY': 'Guyana',
        'SR': 'Surinam',
        'MQ': 'Martinica',
        'FR': 'Francia',
        'ES': 'España',
        'IT': 'Italia',
        'DE': 'Alemania',
        'NL': 'Países Bajos',
        'BE': 'Bélgica',
        'GB': 'Reino Unido',
        'CN': 'China',
        'JP': 'Japón',
        'KR': 'Corea del Sur',
        'SG': 'Singapur',
        'TH': 'Tailandia',
        'VN': 'Vietnam'
    },

    /**
     * Get port name from code
     * @param {string} code - UN/LOCODE port code
     * @returns {string} Port name or original code
     */
    getPortName: function(code) {
        if (!code) return '';

        const portName = this.ports[code];
        if (portName) {
            return portName;
        }

        // Try to extract country from first 2 characters
        const countryCode = code.substring(0, 2);
        const country = this.countries[countryCode];

        if (country) {
            return `${code} (${country})`;
        }

        return code;
    },

    /**
     * Get container type description
     * @param {string} code - ISO container type code
     * @returns {string} Container type description
     */
    getContainerType: function(code) {
        if (!code) return '';

        const description = this.containerTypes[code];
        if (description) {
            return description;
        }

        // Try to guess based on code pattern
        if (code.startsWith('20')) return `20' Container`;
        if (code.startsWith('40')) return `40' Container`;
        if (code.startsWith('45')) return `45' Container`;
        if (code.includes('R')) return 'Refrigerated Container';
        if (code.includes('G')) return 'Dry Container';

        return code;
    },

    /**
     * Get cargo type description
     * @param {string} code - Cargo type code
     * @returns {string} Cargo description
     */
    getCargoType: function(code) {
        if (!code) return '';

        const description = this.cargoTypes[code];
        return description || code;
    },

    /**
     * Get country name from code
     * @param {string} code - ISO country code
     * @returns {string} Country name
     */
    getCountryName: function(code) {
        if (!code || code.length < 2) return '';
        return this.countries[code] || code;
    },

    /**
     * Format port code with name
     * @param {string} code - Port code
     * @returns {object} {code, name, formatted}
     */
    formatPort: function(code) {
        if (!code) return { code: '', name: '', formatted: '' };

        const name = this.getPortName(code);
        const formatted = name !== code ? `${code} - ${name}` : code;

        return {
            code: code,
            name: name !== code ? name : '',
            formatted: formatted
        };
    },

    /**
     * Format container type with description
     * @param {string} code - Container type code
     * @returns {object} {code, description, formatted}
     */
    formatContainerType: function(code) {
        if (!code) return { code: '', description: '', formatted: '' };

        const description = this.getContainerType(code);
        const formatted = description !== code ? `${code} - ${description}` : code;

        return {
            code: code,
            description: description !== code ? description : '',
            formatted: formatted
        };
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EDICodes;
}
