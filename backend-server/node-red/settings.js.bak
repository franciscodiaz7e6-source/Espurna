module.exports = {
    adminAuth: {
        type: "credentials",
        users: [{
            username: "admin",
            password: "$2b$12$9VcpnAx295F2Kfjs6n00jOheMJX.RjThM2zhSeX.tYLoihNzcXVtK",
            permissions: "*"
        }],
        default: {
            permissions: "read"
        }
    },
    // NODE-RED SETTINGS
    uiPort: 1880,
    uiHost: "0.0.0.0",
    httpAdminRoot: "/",
    httpNodeRoot: "/api",
    
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