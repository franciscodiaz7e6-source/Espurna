FROM nodered/node-red:latest

# Instalar solo paquetes que existen en el flow
RUN npm install \
    node-red-contrib-stackhero-influxdb-v2 \
    node-red-dashboard

EXPOSE 1880