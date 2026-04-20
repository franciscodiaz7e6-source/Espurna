#!/bin/bash
# scripts/generate-tls-certs.sh

cd ./certs

# 1. Generar Certificado Autoridad (CA)
echo "Generando CA..."
openssl req -new -x509 -days 365 -nodes \
  -out ca.crt -keyout ca.key \
  -subj "/CN=PROJECTEESPVRNA-CA/O=PROJECTEESPVRNA/C=ES"

# 2. Generar clave privada del servidor
echo "Generando clave servidor..."
openssl genrsa -out server.key 2048

# 3. Generar Certificate Signing Request (CSR)
echo "Generando CSR..."
openssl req -new -out server.csr \
  -key server.key \
  -subj "/CN=mqtt-broker/O=PROJECTEESPVRNA/C=ES"

# 4. Firmar certificado del servidor con CA
echo "Firmando certificado servidor..."
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt \
  -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:mqtt-broker,DNS:localhost,IP:127.0.0.1")

# Permisos
chmod 600 *.key
chmod 644 *.crt

echo "Certificados generados en mqtt/certs/"
ls -la
