#!/usr/bin/env sh
# ============================================================
# infra/docker/minio/init-buckets.sh
#
# Runs once at startup via docker-compose minio-init service.
# Creates required buckets and sets public download policy
# for the ax-media bucket (photos are accessible via pre-signed URLs).
#
# Usage (in docker-compose):
#   entrypoint: /bin/sh -c "sleep 5 && /init-buckets.sh"
# ============================================================

set -e

MINIO_HOST="${MINIO_ENDPOINT:-minio}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_URL="http://${MINIO_HOST}:${MINIO_PORT}"
ACCESS_KEY="${MINIO_ROOT_USER:-minioadmin}"
SECRET_KEY="${MINIO_ROOT_PASSWORD:-minioadmin}"
BUCKET="${MINIO_BUCKET:-ax-media}"

echo "[init-buckets] Waiting for MinIO at ${MINIO_URL}..."
until mc ready local 2>/dev/null; do
  sleep 2
done

echo "[init-buckets] MinIO is ready. Setting up..."

# Configure mc alias
mc alias set local "${MINIO_URL}" "${ACCESS_KEY}" "${SECRET_KEY}" --api S3v4

# Create main media bucket
mc mb --ignore-existing "local/${BUCKET}"
echo "[init-buckets] Bucket '${BUCKET}' ready."

# Versioning on for crash safety
mc version enable "local/${BUCKET}" 2>/dev/null || true

# Lifecycle: delete objects older than 365 days (cost control)
mc ilm rule add \
  --expire-days 365 \
  "local/${BUCKET}" 2>/dev/null || true

# Create a separate bucket for reports (PDF export)
REPORT_BUCKET="${REPORT_BUCKET:-ax-reports}"
mc mb --ignore-existing "local/${REPORT_BUCKET}"
echo "[init-buckets] Bucket '${REPORT_BUCKET}' ready."

echo "[init-buckets] Done."
