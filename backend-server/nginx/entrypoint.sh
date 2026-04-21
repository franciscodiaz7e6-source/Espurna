#!/bin/sh
set -e

echo "=== Generating config files ==="

envsubst '${INFLUX_TOKEN} ${CHIRPSTACK_KEY} ${MAPTILER_KEY} ${CESIUM_TOKEN}' \
  < /usr/share/nginx/html/js/config.js.template \
  > /usr/share/nginx/html/js/config.js
echo "✓ firesense/config.js"

envsubst '${INFLUX_TOKEN} ${CHIRPSTACK_KEY} ${MAPTILER_KEY} ${CESIUM_TOKEN}' \
  < /usr/share/nginx/html/js/map.js.template \
  > /usr/share/nginx/html/js/map.js
echo "✓ firesense/map.js"

envsubst '${INFLUX_TOKEN} ${CHIRPSTACK_KEY} ${MAPTILER_KEY} ${CESIUM_TOKEN}' \
  < /usr/share/nginx/html-espurna/js/config.js.template \
  > /usr/share/nginx/html-espurna/js/config.js
echo "✓ espurna/config.js"

envsubst '${INFLUX_TOKEN} ${CHIRPSTACK_KEY} ${MAPTILER_KEY} ${CESIUM_TOKEN}' \
  < /usr/share/nginx/html-espurna/js/map.js.template \
  > /usr/share/nginx/html-espurna/js/map.js
echo "✓ espurna/map.js"

envsubst '${INFLUX_TOKEN} ${CHIRPSTACK_KEY} ${MAPTILER_KEY} ${CESIUM_TOKEN} ${MAPBOX_TOKEN}' \
  < /usr/share/nginx/html/js/rf_coverage.js.template \
  > /usr/share/nginx/html/js/rf_coverage.js

envsubst '${INFLUX_TOKEN} ${CHIRPSTACK_KEY} ${MAPTILER_KEY} ${CESIUM_TOKEN} ${MAPBOX_TOKEN}' \
  < /usr/share/nginx/html-espurna/js/rf_coverage.js.template \
  > /usr/share/nginx/html-espurna/js/rf_coverage.js

exec nginx -g 'daemon off;'