#!/bin/bash

# Horus Launcher - Gerenciador do Sistema Horus
# Comandos: start, stop, restart, status, logs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/apps/commercial"
PID_FILE="$SCRIPT_DIR/.horus.pid"
PORT_FILE="$SCRIPT_DIR/.horus.port"
LOG_FILE="$SCRIPT_DIR/.horus.log"

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function format_lines_inline() {
    awk 'BEGIN { first = 1 } NF { if (!first) printf ", "; printf "%s", $0; first = 0 } END { print "" }'
}

function find_horus_candidate_pids() {
    lsof -a -d cwd -c node "$APP_DIR" 2>/dev/null | awk 'NR > 1 { print $2 }' | sort -u
}

function find_horus_pids() {
    local PID
    local COMMAND

    {
        while read -r PID; do
            if [ -n "$PID" ]; then
                COMMAND=$(ps -p "$PID" -o command= 2>/dev/null || true)
                case "$COMMAND" in
                    *"node_modules/.bin/next dev"*|*"next-server"*|*"npm run dev"*)
                        echo "$PID"
                        ;;
                esac
            fi
        done < <(find_horus_candidate_pids)
    } | awk 'NF' | sort -u
}

function collect_known_pids() {
    {
        if [ -f "$PID_FILE" ] && awk 'NF { found = 1 } END { exit !found }' "$PID_FILE" >/dev/null 2>&1; then
            cat "$PID_FILE"
        fi
        find_horus_pids
        while read -r PID; do
            if [ -n "$PID" ]; then
                pgrep -P "$PID" || true
            fi
        done < <(find_horus_pids)
    } | awk 'NF' | sort -u
}

function find_horus_ports() {
    while read -r PID; do
        if [ -n "$PID" ]; then
            lsof -Pan -p "$PID" -iTCP -sTCP:LISTEN 2>/dev/null \
                | awk 'NR > 1 { sub(/^.*:/, "", $9); print $9 }'
        fi
    done < <(collect_known_pids) | sort -u
}

function cleanup_state_files() {
    if ! find_horus_pids | grep -q .; then
        rm -f "$PID_FILE" "$PORT_FILE"
    fi
}

function record_runtime_metadata() {
    local PRIMARY_PID
    local PRIMARY_PORT

    PRIMARY_PID=$(find_horus_pids | head -n 1)
    PRIMARY_PORT=$(find_horus_ports | head -n 1)

    if [ -n "$PRIMARY_PID" ]; then
        echo "$PRIMARY_PID" > "$PID_FILE"
    else
        rm -f "$PID_FILE"
    fi

    if [ -n "$PRIMARY_PORT" ]; then
        echo "$PRIMARY_PORT" > "$PORT_FILE"
    else
        rm -f "$PORT_FILE"
    fi
}

function pick_port() {
    local PORT

    for PORT in 3000 3001 3002 3003 3004 3005; do
        if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
            echo "$PORT"
            return 0
        fi
    done

    return 1
}

function start() {
    local RUNNING_PIDS
    local ACTIVE_PORTS
    local PORT
    local NEW_PID
    local ACTIVE_PORT

    cleanup_state_files

    RUNNING_PIDS=$(find_horus_pids)
    if [ -n "$RUNNING_PIDS" ]; then
        record_runtime_metadata
        ACTIVE_PORTS=$(find_horus_ports | format_lines_inline)

        echo -e "${RED}O Horus já está rodando.${NC}"
        echo -e "PIDs: ${BLUE}$(echo "$RUNNING_PIDS" | format_lines_inline)${NC}"
        if [ -n "$ACTIVE_PORTS" ]; then
            echo -e "Portas ativas: ${BLUE}${ACTIVE_PORTS}${NC}"
        fi
        return
    fi

    PORT=$(pick_port)
    if [ -z "$PORT" ]; then
        echo -e "${RED}Erro: não foi possível encontrar uma porta livre entre 3000 e 3005.${NC}"
        return 1
    fi

    echo -e "${BLUE}Iniciando Horus ERP em segundo plano...${NC}"
    cd "$APP_DIR" || return 1
    nohup env PORT="$PORT" npm run dev > "$LOG_FILE" 2>&1 &
    NEW_PID=$!
    cd "$SCRIPT_DIR" || return 1

    echo "$NEW_PID" > "$PID_FILE"
    echo "$PORT" > "$PORT_FILE"
    sleep 2
    record_runtime_metadata

    ACTIVE_PORT=$(find_horus_ports | head -n 1)

    echo -e "${GREEN}Horus iniciado com sucesso! (PID: $NEW_PID)${NC}"
    echo -e "Acesse em: ${BLUE}http://localhost:${ACTIVE_PORT:-$PORT}${NC}"
}

function stop() {
    local PIDS

    PIDS=$(collect_known_pids)
    if [ -z "$PIDS" ]; then
        cleanup_state_files
        echo -e "${RED}Erro: nenhuma instância do Horus foi encontrada.${NC}"
        return
    fi

    echo -e "${BLUE}Desligando Horus (PIDs: $(echo "$PIDS" | format_lines_inline))...${NC}"

    while read -r PID; do
        if ps -p "$PID" >/dev/null 2>&1; then
            pkill -P "$PID" >/dev/null 2>&1 || true
            kill "$PID" >/dev/null 2>&1 || true
        fi
    done < <(echo "$PIDS")

    sleep 1

    while read -r PID; do
        if ps -p "$PID" >/dev/null 2>&1; then
            kill -9 "$PID" >/dev/null 2>&1 || true
        fi
    done < <(echo "$PIDS")

    rm -f "$PID_FILE" "$PORT_FILE"
    echo -e "${GREEN}Horus desligado.${NC}"
}

function status() {
    local PIDS
    local ACTIVE_PORTS
    local PORT_COUNT

    cleanup_state_files

    PIDS=$(find_horus_pids)
    if [ -n "$PIDS" ]; then
        record_runtime_metadata
        ACTIVE_PORTS=$(find_horus_ports | format_lines_inline)
        PORT_COUNT=$(find_horus_ports | awk 'NF' | wc -l | tr -d ' ')

        echo -e "${GREEN}Horus está ATIVO.${NC}"
        echo -e "PIDs: ${BLUE}$(echo "$PIDS" | format_lines_inline)${NC}"
        if [ -n "$ACTIVE_PORTS" ]; then
            echo -e "Portas ativas: ${BLUE}${ACTIVE_PORTS}${NC}"
        fi
        if [ "$PORT_COUNT" -gt 1 ]; then
            echo -e "${RED}Atenção: múltiplas instâncias do Horus estão rodando.${NC}"
        fi
        echo -e "Logs: ${BLUE}tail -f $LOG_FILE${NC}"
    else
        echo -e "${RED}Horus está INATIVO.${NC}"
    fi
}

function logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo -e "${RED}Nenhum arquivo de log encontrado.${NC}"
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        echo "Uso: ./horus.sh {start|stop|restart|status|logs}"
        exit 1
esac
