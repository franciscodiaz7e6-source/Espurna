#!/bin/sh
set -e
echo "=== Generating config files ==="

envsubst '${INFLUX_TOKEN} ${CHIRPSTACK_KEY} ${MAPTILER_KEY} ${CESIUM_TOKEN} ${MAPBOX_TOKEN}' \
  < /usr/share/nginx/html/js/config.js.template \
  > /usr/share/nginx/html/js/config.js 2>/dev/null && echo "✓ config.js" || echo "skip config.js"

envsubst '${INFLUX_TOKEN} ${CHIRPSTACK_KEY} ${MAPTILER_KEY} ${CESIUM_TOKEN} ${MAPBOX_TOKEN}' \
  < /usr/share/nginx/html/js/map.js.template \
  > /usr/share/nginx/html/js/map.js 2>/dev/null && echo "✓ map.js" || echo "skip map.js"

envsubst '${INFLUX_TOKEN} ${CHIRPSTACK_KEY} ${MAPTILER_KEY} ${CESIUM_TOKEN} ${MAPBOX_TOKEN}' \
  < /usr/share/nginx/html/js/rf_coverage.js.template \
  > /usr/share/nginx/html/js/rf_coverage.js 2>/dev/null && echo "✓ rf_coverage.js" || echo "skip rf_coverage.js"

exec nginx -g 'daemon off;'
