#!/usr/bin/env bash
# scripts/dev/bootstrap.sh
# ============================================================
# AX 공공임대주택 플랫폼 — 최초 개발 환경 초기화
#
# 실행:
#   bash scripts/dev/bootstrap.sh
#
# 수행 작업:
#   1. .env 파일 생성 (없는 경우)
#   2. Docker 인프라 기동
#   3. 인프라 헬스체크 대기
#   4. 의존성 설치 및 shared 패키지 빌드
#   5. 메인 seed + 데모 seed 실행
# ============================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# ── 색상 출력 헬퍼 ─────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${BLUE}[info]${RESET}  $*"; }
success() { echo -e "${GREEN}[ok]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${RESET}  $*"; }
error()   { echo -e "${RED}[error]${RESET} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }

# ── 사전 도구 확인 ──────────────────────────────────────────
step "사전 요구사항 확인"

command -v docker  >/dev/null 2>&1 || error "Docker가 설치되어 있지 않습니다."
command -v node    >/dev/null 2>&1 || error "Node.js가 설치되어 있지 않습니다."
command -v yarn    >/dev/null 2>&1 || error "Yarn이 설치되어 있지 않습니다."

NODE_VER=$(node -e "console.log(process.versions.node.split('.')[0])")
[[ "$NODE_VER" -ge 20 ]] || warn "Node.js 20 LTS 권장 (현재: $NODE_VER)"

success "Docker, Node.js($NODE_VER), Yarn 확인됨"

# ── .env 파일 생성 ──────────────────────────────────────────
step ".env 파일 설정"

ENV_FILE="apps/api/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cp apps/api/.env.example "$ENV_FILE"
  success ".env 생성: apps/api/.env (기본값으로 초기화)"
  warn "운영 배포 시 JWT_SECRET 등 반드시 교체하세요."
else
  info ".env 이미 존재 — 건너뜀"
fi

# ── Docker 인프라 기동 ──────────────────────────────────────
step "Docker 인프라 기동 (CouchDB · Redis · MinIO)"

docker compose -f docker-compose.dev.yml up -d

# 헬스체크 — CouchDB
info "CouchDB 준비 대기 중..."
MAX_RETRY=30; COUNT=0
until curl -sf http://localhost:5984/_up > /dev/null 2>&1; do
  ((COUNT++))
  [[ $COUNT -ge $MAX_RETRY ]] && error "CouchDB가 시작되지 않았습니다 (${MAX_RETRY}초 초과)"
  sleep 1
done
success "CouchDB 준비 완료"

# 헬스체크 — Redis
info "Redis 준비 대기 중..."
COUNT=0
until docker compose -f docker-compose.dev.yml exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
  ((COUNT++))
  [[ $COUNT -ge $MAX_RETRY ]] && error "Redis가 시작되지 않았습니다"
  sleep 1
done
success "Redis 준비 완료"

# MinIO는 헬스체크 생략 (선택적)
success "MinIO 기동 중 (http://localhost:9001 — minioadmin/minioadmin)"

# ── 의존성 설치 & shared 빌드 ───────────────────────────────
step "의존성 설치"
yarn install --frozen-lockfile

step "공유 패키지(@ax/shared) 빌드"
yarn build:shared

success "의존성 및 shared 빌드 완료"

# ── Seed 실행 ───────────────────────────────────────────────
step "데이터베이스 초기 데이터 투입 (seed)"
yarn workspace @ax/api ts-node src/database/seed.ts

step "데모 시나리오 데이터 투입 (demo seed)"
yarn workspace @ax/api ts-node src/database/seeds/demo.seed.ts

# ── 완료 메시지 ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  ✅ 부트스트랩 완료!${RESET}"
echo ""
echo "  다음 명령으로 앱을 실행하세요:"
echo ""
echo -e "    ${BOLD}터미널 1${RESET}  yarn dev:api"
echo -e "    ${BOLD}터미널 2${RESET}  yarn dev:admin"
echo -e "    ${BOLD}터미널 3${RESET}  yarn dev:mobile  (선택)"
echo ""
echo "  또는 한 번에:"
echo -e "    ${BOLD}bash scripts/dev/run-all.sh${RESET}"
echo ""
echo "  접속 정보:"
echo "    Admin Web  : http://localhost:4200"
echo "    API Swagger: http://localhost:3000/api/docs"
echo "    CouchDB UI : http://localhost:5984/_utils (admin/secret)"
echo "    MinIO UI   : http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "  데모 로그인:"
echo "    ORG_ADMIN : admin@happy-housing.kr / Admin@1234"
echo "    INSPECTOR : hong@happy-housing.kr  / Inspector@1234"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════${RESET}"
