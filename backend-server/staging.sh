#!/usr/bin/env bash
# =============================================================
# staging.sh - Gestión del entorno de staging
# ProjecteEspVRna IoT
# =============================================================
# Uso:
#   ./staging.sh up           Levanta el entorno staging
#   ./staging.sh down         Para el entorno staging
#   ./staging.sh restart      Reinicia todos los servicios
#   ./staging.sh logs         Muestra logs (todos los servicios)
#   ./staging.sh build        Rebuild completo de imágenes
#   ./staging.sh status       Estado de los contenedores
#   ./staging.sh db-reset     Borra y reinicia InfluxDB staging
#   ./staging.sh shell <svc>  Abre shell en un contenedor staging
# =============================================================

set -euo pipefail

COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"
PROJECT_NAME="espvrna-staging"

# ── colores ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[STAGING]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── comprobaciones previas ─────────────────────────────────────
check_prereqs() {
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "No se encuentra $COMPOSE_FILE. Ejecuta desde backend-server/."
        exit 1
    fi
    if [[ ! -f "$ENV_FILE" ]]; then
        error "No se encuentra $ENV_FILE."
        warn "Copia .env a .env.staging y ajusta los valores."
        exit 1
    fi
    # Advertir si hay valores CHANGE_ME sin rellenar
    if grep -q "CHANGE_ME" "$ENV_FILE" 2>/dev/null; then
        warn "El archivo $ENV_FILE contiene valores CHANGE_ME sin configurar."
        warn "Edítalo antes de usar el entorno en producción."
    fi
}

compose_cmd() {
    docker compose \
        -f "$COMPOSE_FILE" \
        --env-file "$ENV_FILE" \
        -p "$PROJECT_NAME" \
        "$@"
}

# ── comandos ───────────────────────────────────────────────────
cmd_up() {
    check_prereqs
    info "Levantando entorno staging..."
    compose_cmd up -d --remove-orphans
    ok "Staging arriba. URLs:"
    echo "  Nginx (gateway):   http://localhost:18080"
    echo "  Home Assistant:    http://localhost:18123"
    echo "  InfluxDB:          http://localhost:18086"
    echo "  Node-RED:          http://localhost:11880"
    echo "  Grafana:           http://localhost:13000"
    echo "  MQTT (TCP):        localhost:18883"
    echo ""
    echo "  Basic auth: staging / staging123  (cambia en nginx/staging_htpasswd)"
}

cmd_down() {
    info "Parando entorno staging..."
    compose_cmd down
    ok "Staging detenido."
}

cmd_restart() {
    info "Reiniciando entorno staging..."
    compose_cmd restart
    ok "Staging reiniciado."
}

cmd_logs() {
    local service="${2:-}"
    if [[ -n "$service" ]]; then
        compose_cmd logs -f --tail=100 "$service"
    else
        compose_cmd logs -f --tail=50
    fi
}

cmd_build() {
    check_prereqs
    info "Rebuild completo de imágenes staging..."
    compose_cmd build --no-cache
    compose_cmd up -d --remove-orphans
    ok "Build y arranque completados."
}

cmd_status() {
    info "Estado de contenedores staging:"
    compose_cmd ps
    echo ""
    info "Redes Docker activas:"
    docker network ls --filter name=staging | grep -v "^NETWORK" || true
    echo ""
    info "Volúmenes staging:"
    docker volume ls --filter name=staging | grep -v "^DRIVER" || true
}

cmd_db_reset() {
    warn "Esto BORRARÁ todos los datos de InfluxDB staging."
    read -r -p "¿Confirmas? (escribe 'si' para continuar): " confirm
    if [[ "$confirm" != "si" ]]; then
        info "Operación cancelada."
        exit 0
    fi
    info "Parando staging-influxdb..."
    compose_cmd stop influxdb
    info "Eliminando volúmenes de InfluxDB staging..."
    docker volume rm "${PROJECT_NAME}_influxdb-data-staging" "${PROJECT_NAME}_influxdb-config-staging" 2>/dev/null || \
        docker volume rm "espvrna-staging_influxdb-data-staging" "espvrna-staging_influxdb-config-staging" 2>/dev/null || \
        warn "No se pudieron eliminar los volúmenes (puede que ya estén limpios)."
    info "Reiniciando InfluxDB staging..."
    compose_cmd up -d influxdb
    ok "InfluxDB staging reseteado y listo."
}

cmd_shell() {
    local service="${2:-}"
    if [[ -z "$service" ]]; then
        error "Especifica un servicio: ./staging.sh shell <servicio>"
        echo "Servicios disponibles: mosquitto, homeassistant, influxdb, node-red, grafana, nginx"
        exit 1
    fi
    info "Abriendo shell en staging-${service}..."
    # Intentar bash primero, luego sh
    compose_cmd exec "$service" bash 2>/dev/null || compose_cmd exec "$service" sh
}

cmd_help() {
    echo ""
    echo "  staging.sh — Gestión del entorno staging de ProjecteEspVRna"
    echo ""
    echo "  Comandos:"
    echo "    up              Levanta todos los servicios staging"
    echo "    down            Para todos los servicios staging"
    echo "    restart         Reinicia todos los servicios"
    echo "    logs [svc]      Muestra logs (de todos o de un servicio)"
    echo "    build           Rebuild completo + arranque"
    echo "    status          Estado de contenedores, redes y volúmenes"
    echo "    db-reset        Borra y reinicia la base de datos InfluxDB staging"
    echo "    shell <svc>     Abre una shell en el contenedor indicado"
    echo "    help            Muestra esta ayuda"
    echo ""
}

# ── dispatcher ─────────────────────────────────────────────────
COMMAND="${1:-help}"

case "$COMMAND" in
    up)        cmd_up "$@" ;;
    down)      cmd_down "$@" ;;
    restart)   cmd_restart "$@" ;;
    logs)      cmd_logs "$@" ;;
    build)     cmd_build "$@" ;;
    status)    cmd_status "$@" ;;
    db-reset)  cmd_db_reset "$@" ;;
    shell)     cmd_shell "$@" ;;
    help|--help|-h) cmd_help ;;
    *)
        error "Comando desconocido: $COMMAND"
        cmd_help
        exit 1
        ;;
esac
