module.exports = {
    credentialSecret: "espurna2026",
    adminAuth: {
        type: "credentials",
        users: [{
            username: "admin",
            password: "$2b$12$I0NvNO0Phnt4KOiKslrZ3ev0P9UOrU9SfSONmr317VyiqJog.hn8e",
            permissions: "*"
        }],
        default: {
            permissions: "read"
        }
    },
    // NODE-RED SETTINGS
    uiPort: 1880,
    uiHost: "0.0.0.0",
    httpAdminRoot: "/nodered",
    httpNodeRoot: "/nodered/api",
    
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    },

    editorTheme: {
        projects: {
            enabled: true,
            activeProject: "default"
        },
        palette: {
            catalogues: ['https://flows.nodered.org/catalogue']
        },
        tours: false
    },

    functionGlobalContext: {
        axios: require("axios"),
        require: require,
        influxdb_bucket: process.env.INFLUXDB_BUCKET || "sensor_data",
        influxdb_org: process.env.INFLUXDB_ORG || "PROJECTEESPVRNA"
    },

    // ============================================
    // API
    // ============================================
    apiMaxLength: '50mb',
    apiMaxRequestSize: '50mb',
    apiMaxResponseSize: '50mb',

    // ============================================
    // PROYECTOS
    // ============================================
    projects: {
        enabled: true,
        workflow: {
            mode: "manual"
        }
    }
};