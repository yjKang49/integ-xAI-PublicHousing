#!/usr/bin/env bash
# scripts/dev/reset-and-seed.sh
# ============================================================
# CouchDB 데이터 전체 초기화 후 seed 재실행
#
# 실행:
#   bash scripts/dev/reset-and-seed.sh
#   bash scripts/dev/reset-and-seed.sh --demo   # 데모 seed도 포함
#
# 주의: 기존 CouchDB 데이터가 모두 삭제됩니다.
# ============================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; RESET='\033[0m'

INCLUDE_DEMO=false
[[ "${1:-}" == "--demo" ]] && INCLUDE_DEMO=true

COUCH_URL="${COUCHDB_URL:-http://localhost:5984}"
COUCH_USER="${COUCHDB_USER:-admin}"
COUCH_PASS="${COUCHDB_PASSWORD:-secret}"

echo -e "${RED}${BOLD}"
echo "  ⚠️  경고: CouchDB 데이터가 전부 삭제됩니다."
echo -e "${RESET}"
read -r -p "  계속하시겠습니까? (yes 입력): " CONFIRM
[[ "$CONFIRM" != "yes" ]] && echo "취소됨." && exit 0

# ── CouchDB에서 ax_ 접두사 DB 목록 삭제 ────────────────────
echo -e "\n${BOLD}━━━ CouchDB 데이터베이스 삭제 ━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

DATABASES=$(curl -sf -u "${COUCH_USER}:${COUCH_PASS}" \
  "${COUCH_URL}/_all_dbs" | tr -d '[]"' | tr ',' '\n' | grep '^ax_') || true

if [[ -z "$DATABASES" ]]; then
  echo "  삭제할 AX 데이터베이스 없음."
else
  for DB in $DATABASES; do
    curl -sf -X DELETE -u "${COUCH_USER}:${COUCH_PASS}" "${COUCH_URL}/${DB}" > /dev/null
    echo -e "  ${RED}✗ 삭제${RESET}: ${DB}"
  done
fi

# Redis 캐시도 초기화
echo -e "\n${BOLD}━━━ Redis 캐시 초기화 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
docker compose -f docker-compose.dev.yml exec -T redis redis-cli FLUSHALL > /dev/null 2>&1 && \
  echo -e "  ${GREEN}✓${RESET} Redis FLUSHALL 완료" || \
  echo -e "  (Redis 미기동 — 건너뜀)"

# ── Seed 실행 ───────────────────────────────────────────────
echo -e "\n${BOLD}━━━ 메인 Seed 실행 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
yarn workspace @ax/api ts-node src/database/seed.ts

if [[ "$INCLUDE_DEMO" == true ]]; then
  echo -e "\n${BOLD}━━━ 데모 Seed 실행 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  yarn workspace @ax/api ts-node src/database/seeds/demo.seed.ts
fi

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  ✅ 리셋 및 시드 완료${RESET}"
if [[ "$INCLUDE_DEMO" == true ]]; then
  echo "  데모 계정:"
  echo "    admin@happy-housing.kr / Admin@1234"
  echo "    hong@happy-housing.kr  / Inspector@1234"
  echo "    park@happy-housing.kr  / Cmgr@1234"
fi
echo -e "${GREEN}${BOLD}═══════════════════════════════════════${RESET}"
