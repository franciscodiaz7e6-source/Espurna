#!/bin/bash

# Script para configurar Grafana con InfluxDB automáticamente
# Proyecto: EspVRna IoT Backend

set -e

echo "🚀 Configurando Grafana para EspVRna..."

# Crear estructura de directorios
echo "📁 Creando directorios..."
mkdir -p ./grafana/provisioning/datasources
mkdir -p ./grafana/provisioning/dashboards
mkdir -p ./grafana/dashboards

# Copiar configuración de datasource
echo "🔗 Configurando datasource de InfluxDB..."
cat > ./grafana/provisioning/datasources/influxdb.yml << 'EOF'
apiVersion: 1

datasources:
  - name: InfluxDB-EspVRna
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    jsonData:
      version: Flux
      organization: ProjecteEspVRna
      defaultBucket: sensor_data
      tlsSkipVerify: true
    secureJsonData:
      token: ${INFLUXDB_ADMIN_TOKEN}
    editable: true
    isDefault: true
    uid: influxdb-espvrna
EOF

# Copiar configuración de dashboard provider
echo "📊 Configurando dashboards..."
cat > ./grafana/provisioning/dashboards/dashboards.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'EspVRna Dashboards'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Copiar dashboard de ejemplo (debes tener el JSON)
if [ -f "./collserola_dashboard.json" ]; then
    echo "📈 Copiando dashboard de Collserola..."
    cp ./collserola_dashboard.json ./grafana/dashboards/
else
    echo "⚠️  Dashboard JSON no encontrado. Deberás importarlo manualmente."
fi

# Establecer permisos
echo "🔐 Configurando permisos..."
chmod -R 755 ./grafana

echo ""
echo "✅ ¡Grafana configurado correctamente!"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Asegúrate de tener el archivo .env con GRAFANA_USER y GRAFANA_PASSWORD"
echo "   2. Ejecuta: docker-compose up -d"
echo "   3. Accede a Grafana: http://localhost:3000"
echo "   4. Usuario: \$GRAFANA_USER | Password: \$GRAFANA_PASSWORD"
echo ""
echo "🎯 El datasource de InfluxDB se configurará automáticamente"
echo "🎨 Dashboard disponible en: Home -> Dashboards -> EspVRna - Sensores Collserola"
echo ""
