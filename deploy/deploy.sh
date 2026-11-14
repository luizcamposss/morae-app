#!/usr/bin/env bash
# Runs on the VPS, called by .github/workflows/deploy.yml over SSH.
# Usage: IMAGE_TAG=<git sha> GHCR_USER=<user> GHCR_TOKEN=<token> ./deploy.sh
# Backs up the database, pulls the new images, restarts and checks health.
# If the new version does not answer, the previous images are started again.
set -euo pipefail

cd "$(dirname "$0")"

: "${IMAGE_TAG:?IMAGE_TAG is required}"
COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yaml)
BACKUP_DIR=backups
BACKUPS_TO_KEEP=14
PREVIOUS_TAG=$(cat .deployed-tag 2>/dev/null || echo "")

log() { printf '[deploy %s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

wait_healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:8080/api/health >/dev/null 2>&1 &&
       curl -fsS -o /dev/null http://127.0.0.1:8081/; then
      return 0
    fi
    sleep 3
  done
  return 1
}

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:?GHCR_USER is required}" --password-stdin >/dev/null
fi

# Backup before anything changes: migrations run when the new API starts.
mkdir -p "$BACKUP_DIR"
if [[ -n "$("${COMPOSE[@]}" ps -q mysql 2>/dev/null)" ]]; then
  backup="$BACKUP_DIR/moraeDB-$(date '+%Y%m%d-%H%M%S')-${PREVIOUS_TAG:-none}.sql.gz"
  log "Backup do banco em $backup"
  "${COMPOSE[@]}" exec -T mysql sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines moraeDB' | gzip > "$backup"
  ls -1t "$BACKUP_DIR"/moraeDB-*.sql.gz | tail -n +$((BACKUPS_TO_KEEP + 1)) | xargs -r rm --
fi

log "Baixando as imagens $IMAGE_TAG"
IMAGE_TAG="$IMAGE_TAG" "${COMPOSE[@]}" pull api web

log "Subindo a versão $IMAGE_TAG"
IMAGE_TAG="$IMAGE_TAG" "${COMPOSE[@]}" up -d --remove-orphans

if wait_healthy; then
  echo "$IMAGE_TAG" > .deployed-tag
  log "Versão $IMAGE_TAG no ar"
  docker image prune -f >/dev/null
  docker logout ghcr.io >/dev/null 2>&1 || true
  exit 0
fi

log "A versão $IMAGE_TAG não respondeu. Logs da API:"
"${COMPOSE[@]}" logs --tail 80 api || true

if [[ -n "$PREVIOUS_TAG" ]]; then
  log "Voltando para $PREVIOUS_TAG (o banco não volta sozinho: se uma migration rodou, use o backup)"
  IMAGE_TAG="$PREVIOUS_TAG" "${COMPOSE[@]}" up -d --remove-orphans
  wait_healthy && log "Versão $PREVIOUS_TAG no ar de novo" || log "A versão anterior também não respondeu"
fi

docker logout ghcr.io >/dev/null 2>&1 || true
exit 1
