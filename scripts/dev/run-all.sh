#!/usr/bin/env bash
# scripts/dev/run-all.sh
# ============================================================
# 개발 서버 전체 동시 실행 (API + Admin Web)
#
# 실행:
#   bash scripts/dev/run-all.sh
#   bash scripts/dev/run-all.sh --with-mobile
#
# 전제:
#   docker compose -f docker-compose.dev.yml up -d 실행 중
#   bootstrap.sh 완료 (의존성 설치 + seed)
#
# 종료: Ctrl+C 로 모든 프로세스 종료
# ============================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

BOLD='\033[1m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'
YELLOW='\033[1;33m'; RESET='\033[0m'

WITH_MOBILE=false
[[ "${1:-}" == "--with-mobile" ]] && WITH_MOBILE=true

# ── 인프라 기동 확인 ────────────────────────────────────────
if ! curl -sf http://localhost:5984/_up > /dev/null 2>&1; then
  echo -e "${YELLOW}[warn]${RESET} CouchDB 미기동 — Docker 인프라를 먼저 시작합니다..."
  docker compose -f docker-compose.dev.yml up -d
  sleep 5
fi

# ── 프로세스 그룹 관리 ──────────────────────────────────────
PIDS=()

cleanup() {
  echo -e "\n${BOLD}개발 서버 종료 중...${RESET}"
  for PID in "${PIDS[@]}"; do
    kill "$PID" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "종료 완료."
}
trap cleanup EXIT INT TERM

# ── 앱 실행 ─────────────────────────────────────────────────
echo -e "${BOLD}${GREEN}━━━ AX 개발 서버 시작 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

echo -e "  ${BLUE}[1]${RESET} API     → http://localhost:3000/api/v1"
yarn workspace @ax/api start:dev 2>&1 | sed 's/^/[api] /' &
PIDS+=($!)

sleep 2  # API 초기화 여유

echo -e "  ${BLUE}[2]${RESET} Admin   → http://localhost:4200"
yarn workspace @ax/admin-web start 2>&1 | sed 's/^/[web] /' &
PIDS+=($!)

if [[ "$WITH_MOBILE" == true ]]; then
  echo -e "  ${BLUE}[3]${RESET} Mobile  → http://localhost:8100"
  yarn workspace @ax/mobile-app serve 2>&1 | sed 's/^/[mob] /' &
  PIDS+=($!)
fi

echo ""
echo -e "${BOLD}  Swagger : http://localhost:3000/api/docs${RESET}"
echo -e "${BOLD}  Ctrl+C  : 전체 종료${RESET}"
echo ""

wait
