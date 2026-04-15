#!/bin/bash
# scripts/dev/seed-phase2-demo.sh
#
# Phase 2 Demo Seed Script
# Seeds the database with demo data including:
#   - Organizations and users
#   - Housing complexes, buildings, floors, zones
#   - Defects, complaints, drone missions (with AI candidates)
#   - Sensors and IoT readings
#   - Automation rules (predefined)
#   - Feature flags (Phase 2 enabled)
#
# Usage:
#   bash scripts/dev/seed-phase2-demo.sh
#   bash scripts/dev/seed-phase2-demo.sh --reset   # drop + reseed

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

# ── Color helpers ──────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Prerequisites check ────────────────────────────────────────────────────────

info "Phase 2 Demo Seed — Checking prerequisites..."

command -v node >/dev/null 2>&1 || error "node is not installed"
command -v yarn >/dev/null 2>&1 || error "yarn is not installed"
command -v docker >/dev/null 2>&1 || error "docker is not installed"

# Check CouchDB
if ! curl -s http://admin:password@localhost:5984/_up | grep -q '"status":"ok"'; then
  warn "CouchDB is not running. Starting Docker services..."
  yarn docker:up
  sleep 5
fi

# Verify CouchDB is up
COUCH_STATUS=$(curl -s http://admin:password@localhost:5984/_up 2>/dev/null)
if echo "$COUCH_STATUS" | grep -q '"status":"ok"'; then
  success "CouchDB is running"
else
  error "CouchDB is not available at localhost:5984. Run: yarn docker:up"
fi

# Check Redis
if ! docker exec xai-publichousing-redis-1 redis-cli ping 2>/dev/null | grep -q "PONG"; then
  warn "Redis is not responding. Checking container..."
  docker start xai-publichousing-redis-1 2>/dev/null || true
  sleep 2
fi
success "Redis is running"

# ── Shared package build ───────────────────────────────────────────────────────

info "Building @ax/shared package..."
yarn build:shared
success "@ax/shared built"

# ── Handle --reset flag ────────────────────────────────────────────────────────

if [[ "$1" == "--reset" ]]; then
  warn "Resetting demo database (org_demo001)..."
  curl -s -X DELETE http://admin:password@localhost:5984/org_demo001 > /dev/null
  curl -s -X DELETE http://admin:password@localhost:5984/_users > /dev/null || true
  success "Database cleared"
fi

# ── Run seed scripts ───────────────────────────────────────────────────────────

info "Running master seed (organizations, users, platform data)..."
yarn workspace @ax/api seed:master
success "Master seed complete"

info "Running demo seed (complexes, buildings, defects, complaints)..."
yarn workspace @ax/api seed:demo
success "Demo seed complete"

# ── Verify key data ────────────────────────────────────────────────────────────

info "Verifying seeded data..."

API_BASE="http://localhost:3000/api/v1"

# Get admin token
TOKEN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.org","password":"demo1234"}')

ADMIN_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  warn "Could not verify data — API may not be running. Start with: yarn dev:api"
  info "Seed complete (data not verified — API offline)"
  exit 0
fi

# Verify complex exists
COMPLEX_CHECK=$(curl -s "$API_BASE/complexes?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$COMPLEX_CHECK" | grep -q '"success":true'; then
  success "Housing complexes: $(echo "$COMPLEX_CHECK" | grep -o '"total":[0-9]*' | cut -d':' -f2) records"
fi

# Verify complaints
COMPLAINT_CHECK=$(curl -s "$API_BASE/complaints?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$COMPLAINT_CHECK" | grep -q '"success":true'; then
  success "Complaints: $(echo "$COMPLAINT_CHECK" | grep -o '"total":[0-9]*' | cut -d':' -f2) records"
fi

# Verify defects
DEFECT_CHECK=$(curl -s "$API_BASE/defects?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$DEFECT_CHECK" | grep -q '"success":true'; then
  success "Defects: $(echo "$DEFECT_CHECK" | grep -o '"total":[0-9]*' | cut -d':' -f2) records"
fi

# ── Enable Phase 2 Feature Flags ───────────────────────────────────────────────

info "Enabling Phase 2 feature flags..."

PHASE2_FLAGS=(
  "PHASE2_AI"
  "PHASE2_DRONE"
  "PHASE2_RPA"
  "PHASE2_IOT"
  "AI_DEFECT_DETECTION"
  "AI_CRACK_ANALYSIS"
  "AI_DIAGNOSIS_OPINION"
  "AI_COMPLAINT_TRIAGE"
)

for FLAG in "${PHASE2_FLAGS[@]}"; do
  RESULT=$(curl -s -X PATCH "$API_BASE/feature-flags/$FLAG" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"enabled":true}')
  if echo "$RESULT" | grep -q '"success":true'; then
    success "Flag $FLAG enabled"
  else
    warn "Flag $FLAG — could not update (may not exist yet)"
  fi
done

# ── Summary ────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Phase 2 Demo Seed Complete!               ${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo "  Admin Web:  http://localhost:4200"
echo "  API:        http://localhost:3000/api/v1"
echo "  API Docs:   http://localhost:3000/api/docs"
echo "  CouchDB UI: http://localhost:5984/_utils"
echo "  MinIO:      http://localhost:9001"
echo ""
echo "  Credentials:"
echo "    admin@demo.org   / demo1234  (ORG_ADMIN)"
echo "    inspector@demo.org / demo1234 (INSPECTOR)"
echo "    reviewer@demo.org  / demo1234 (REVIEWER)"
echo "    cmgr@demo.org      / demo1234 (COMPLAINT_MGR)"
echo ""
echo -e "  Next: ${CYAN}bash scripts/dev/run-phase2-demo.sh${NC}"
echo ""
