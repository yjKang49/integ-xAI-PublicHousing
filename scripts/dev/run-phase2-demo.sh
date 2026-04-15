#!/bin/bash
# scripts/dev/run-phase2-demo.sh
#
# Phase 2 Full Demo Runner
# Starts all services and runs the demo scenario step by step.
#
# Modes:
#   bash scripts/dev/run-phase2-demo.sh           # start services only
#   bash scripts/dev/run-phase2-demo.sh --verify  # start + run smoke tests
#   bash scripts/dev/run-phase2-demo.sh --stop    # stop all services
#
# See: docs/phase2-demo-scenario.md for the full walkthrough

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

# ── Helpers ────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BLUE='\033[0;34m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
step()    { echo -e "\n${BLUE}━━ $* ${NC}"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

API_BASE="http://localhost:3000/api/v1"
ADMIN_TOKEN=""

get_token() {
  ADMIN_TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@demo.org","password":"demo1234"}' \
    | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  [ -z "$ADMIN_TOKEN" ] && error "Failed to get admin token — is the API running?"
}

api_get()  { curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_BASE$1"; }
api_post() { curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" "$API_BASE$1" -d "$2"; }
api_patch(){ curl -s -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" "$API_BASE$1" -d "$2"; }

# ── Stop mode ──────────────────────────────────────────────────────────────────

if [[ "$1" == "--stop" ]]; then
  info "Stopping all Phase 2 services..."
  yarn docker:down
  success "Docker services stopped"
  info "To stop local processes (API, workers): Ctrl+C in each terminal"
  exit 0
fi

# ── Start services ─────────────────────────────────────────────────────────────

step "PHASE 2 DEMO — Starting Services"

# 1. Docker infrastructure
info "Starting Docker infrastructure (CouchDB, Redis, MinIO)..."
yarn docker:up
sleep 3
success "Docker services started"

# 2. Check shared build
if [ ! -f "packages/shared/dist/index.js" ]; then
  info "Building @ax/shared..."
  yarn build:shared
fi
success "@ax/shared is built"

# 3. Seed check
COUCH_DBS=$(curl -s http://admin:password@localhost:5984/_all_dbs 2>/dev/null)
if ! echo "$COUCH_DBS" | grep -q "org_demo001"; then
  info "Demo database not found — running seed..."
  bash scripts/dev/seed-phase2-demo.sh
else
  success "Demo database already seeded"
fi

echo ""
echo -e "${YELLOW}┌──────────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}│  Open separate terminals and run:            │${NC}"
echo -e "${YELLOW}│                                              │${NC}"
echo -e "${YELLOW}│  Terminal 1:  yarn dev:api                   │${NC}"
echo -e "${YELLOW}│  Terminal 2:  yarn dev:admin                 │${NC}"
echo -e "${YELLOW}│  Terminal 3:  yarn dev:workers               │${NC}"
echo -e "${YELLOW}└──────────────────────────────────────────────┘${NC}"
echo ""

if [[ "$1" != "--verify" ]]; then
  echo -e "${GREEN}Infrastructure is ready. Start services in separate terminals above.${NC}"
  echo -e "Then follow: ${CYAN}docs/phase2-demo-scenario.md${NC}"
  exit 0
fi

# ── Smoke tests (--verify mode) ────────────────────────────────────────────────

step "SMOKE TESTS — Verifying Phase 2 Demo Flow"

# Wait for API
info "Waiting for API to be ready..."
MAX_WAIT=60
WAITED=0
until curl -s "$API_BASE/health" | grep -q "ok" 2>/dev/null; do
  sleep 2
  WAITED=$((WAITED + 2))
  [ $WAITED -ge $MAX_WAIT ] && error "API did not start within ${MAX_WAIT}s"
done
success "API is responding"

get_token
success "Admin login OK"

# ── STEP 1: Drone Mission ──────────────────────────────────────────────────────

step "STEP 1 — Drone Mission + AI Detection"

COMPLEX_ID="housingComplex:org_demo001:cplx_seed01"
BLDG_ID="building:org_demo001:bldg_101"

MISSION=$(api_post "/drone-missions" "{
  \"complexId\":\"$COMPLEX_ID\",
  \"buildingId\":\"$BLDG_ID\",
  \"pilotName\":\"Demo Pilot\",
  \"scheduledAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"notes\":\"Phase 2 demo smoke test\"
}")
MISSION_ID=$(echo "$MISSION" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$MISSION_ID" ] && warn "Mission creation may have failed — check PHASE2_DRONE flag" || success "Drone mission created: $MISSION_ID"

# ── STEP 2: Defect Candidate Review ────────────────────────────────────────────

step "STEP 2 — Defect Candidate Review"

CANDIDATES=$(api_get "/defect-candidates?reviewStatus=PENDING&limit=1")
CANDIDATE_ID=$(echo "$CANDIDATES" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CANDIDATE_ID" ]; then
  APPROVE=$(api_patch "/defect-candidates/$CANDIDATE_ID/review" \
    '{"reviewStatus":"APPROVED","reviewComment":"Demo smoke test — approved"}')
  if echo "$APPROVE" | grep -q "APPROVED"; then
    success "Candidate approved: $CANDIDATE_ID"
  else
    warn "Candidate approval returned unexpected response"
  fi
else
  warn "No pending candidates found — seed may include pre-approved candidates"
fi

# ── STEP 3: Complaint + Triage ──────────────────────────────────────────────────

step "STEP 3 — Complaint AI Triage"

COMPLAINT=$(api_post "/complaints" "{
  \"complexId\":\"$COMPLEX_ID\",
  \"title\":\"Demo: 외벽 균열 발견\",
  \"description\":\"101동 외벽 3층 구간에 균열이 확인됩니다. 점검 요청드립니다.\",
  \"category\":\"FACILITY\",
  \"unitNumber\":\"301\",
  \"submittedBy\":\"resident_demo_01\"
}")
COMPLAINT_ID=$(echo "$COMPLAINT" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$COMPLAINT_ID" ] && warn "Complaint creation failed" || success "Complaint created: $COMPLAINT_ID"

# Check triage (async — may not be ready immediately)
sleep 3
if [ -n "$COMPLAINT_ID" ]; then
  TRIAGE=$(api_get "/complaint-triage?complaintId=$COMPLAINT_ID&limit=1")
  if echo "$TRIAGE" | grep -q '"success":true'; then
    success "Triage result available"
  else
    warn "Triage not yet complete — AI worker may still be processing"
  fi
fi

# ── STEP 4: IoT Sensor + Alert ──────────────────────────────────────────────────

step "STEP 4 — IoT Sensor Threshold Alert"

SENSOR=$(api_post "/sensors" "{
  \"complexId\":\"$COMPLEX_ID\",
  \"buildingId\":\"$BLDG_ID\",
  \"type\":\"VIBRATION\",
  \"name\":\"Demo Vibration Sensor\",
  \"location\":\"B1 Demo Point\",
  \"thresholdMax\":5.0,
  \"unit\":\"mm/s\"
}")
SENSOR_ID=$(echo "$SENSOR" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$SENSOR_ID" ] && warn "Sensor creation failed" || success "Sensor created: $SENSOR_ID"

if [ -n "$SENSOR_ID" ]; then
  # Normal reading
  api_post "/sensor-readings" "{\"sensorId\":\"$SENSOR_ID\",\"value\":3.5,\"unit\":\"mm/s\",\"measuredAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > /dev/null
  success "Normal reading ingested (3.5 mm/s)"

  # Threshold-exceeding reading
  ALERT_READING=$(api_post "/sensor-readings" "{\"sensorId\":\"$SENSOR_ID\",\"value\":7.2,\"unit\":\"mm/s\",\"measuredAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}")
  if echo "$ALERT_READING" | grep -q '"anomalyDetected":true'; then
    success "Anomaly detected! Alert created (7.2 mm/s > 5.0 threshold)"
  else
    warn "Anomaly flag not set — check PHASE2_IOT feature flag"
  fi
fi

# ── STEP 5: Risk Score ─────────────────────────────────────────────────────────

step "STEP 5 — Risk Score Calculation"

RISK=$(api_post "/risk-scoring/calculate" "{
  \"targetType\":\"BUILDING\",
  \"targetId\":\"$BLDG_ID\"
}")
if echo "$RISK" | grep -q '"success":true'; then
  success "Risk score calculation queued"
else
  warn "Risk score calculation failed — check feature flag"
fi

# ── Summary ────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Phase 2 Demo Smoke Tests Complete             ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo "  Review results at:"
echo "    Admin Web:  http://localhost:4200"
echo "    API Docs:   http://localhost:3000/api/docs"
echo ""
echo -e "  Full demo walkthrough: ${CYAN}docs/phase2-demo-scenario.md${NC}"
echo ""
