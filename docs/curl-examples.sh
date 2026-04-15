#!/usr/bin/env bash
# ============================================================
# AX 공공임대주택 플랫폼 — API curl 예시
#
# 전제조건:
#   1. 인프라 기동: docker compose -f docker-compose.dev.yml up -d
#   2. 시드 데이터: yarn workspace @ax/api seed
#   3. API 기동:    yarn dev:api
# ============================================================

BASE="http://localhost:3000/api/v1"

echo "================================================="
echo "  1. 로그인 — ORG_ADMIN 계정"
echo "================================================="
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email":    "admin@happy-housing.kr",
    "password": "Admin@1234"
  }')

echo "$LOGIN" | python3 -m json.tool 2>/dev/null || echo "$LOGIN"

# 토큰 추출 (jq 없이 sed 사용)
TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
REFRESH=$(echo "$LOGIN" | grep -o '"refreshToken":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "ACCESS_TOKEN=${TOKEN:0:60}..."
echo ""

# ── 단지 ──────────────────────────────────────────────────────

echo "================================================="
echo "  2. 단지 목록 조회"
echo "================================================="
curl -s "$BASE/complexes" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "================================================="
echo "  3. 단지 등록"
echo "================================================="
CREATE_COMPLEX=$(curl -s -X POST "$BASE/complexes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name":           "테스트단지 2단지",
    "address":        "서울시 서초구 반포대로 58",
    "totalUnits":     300,
    "totalBuildings": 3,
    "builtYear":      2005,
    "managedBy":      "user:_platform:usr_admin01",
    "latitude":       37.5040,
    "longitude":      127.0052,
    "tags":           ["아파트", "서초구"]
  }')

echo "$CREATE_COMPLEX" | python3 -m json.tool 2>/dev/null || echo "$CREATE_COMPLEX"
COMPLEX_ID=$(echo "$CREATE_COMPLEX" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo ""
echo "생성된 단지 ID: $COMPLEX_ID"

echo ""
echo "================================================="
echo "  4. 단지 수정 (PATCH)"
echo "================================================="
curl -s -X PATCH "$BASE/complexes/$(python3 -c "import urllib.parse; print(urllib.parse.quote('$COMPLEX_ID', safe=''))")" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tags": ["아파트", "서초구", "리모델링"]}' | python3 -m json.tool 2>/dev/null

# ── 동 ────────────────────────────────────────────────────────

echo ""
echo "================================================="
echo "  5. 동 등록"
echo "================================================="
CREATE_BLDG=$(curl -s -X POST "$BASE/buildings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"complexId\":        \"$COMPLEX_ID\",
    \"name\":             \"201동\",
    \"code\":             \"B201\",
    \"totalFloors\":      12,
    \"undergroundFloors\":1,
    \"totalUnits\":       100,
    \"builtDate\":        \"2005-03-15\",
    \"structureType\":    \"철근콘크리트조\"
  }")

echo "$CREATE_BLDG" | python3 -m json.tool 2>/dev/null || echo "$CREATE_BLDG"
BLDG_ID=$(echo "$CREATE_BLDG" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "생성된 동 ID: $BLDG_ID"

# ── 층 ────────────────────────────────────────────────────────

echo ""
echo "================================================="
echo "  6. 층 등록"
echo "================================================="
CREATE_FLOOR=$(curl -s -X POST "$BASE/floors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"buildingId\":  \"$BLDG_ID\",
    \"complexId\":   \"$COMPLEX_ID\",
    \"floorNumber\": 1,
    \"floorName\":   \"1F\",
    \"area\":        280.5
  }")

echo "$CREATE_FLOOR" | python3 -m json.tool 2>/dev/null || echo "$CREATE_FLOOR"
FLOOR_ID=$(echo "$CREATE_FLOOR" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "생성된 층 ID: $FLOOR_ID"

# ── 구역 ──────────────────────────────────────────────────────

echo ""
echo "================================================="
echo "  7. 구역 등록"
echo "================================================="
CREATE_ZONE=$(curl -s -X POST "$BASE/zones" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"floorId\":     \"$FLOOR_ID\",
    \"buildingId\":  \"$BLDG_ID\",
    \"complexId\":   \"$COMPLEX_ID\",
    \"name\":        \"계단실 A\",
    \"code\":        \"Z-1F-A\",
    \"description\": \"1층 북측 계단실\"
  }")

echo "$CREATE_ZONE" | python3 -m json.tool 2>/dev/null || echo "$CREATE_ZONE"

# ── 토큰 갱신 ─────────────────────────────────────────────────

echo ""
echo "================================================="
echo "  8. Access Token 갱신"
echo "================================================="
curl -s -X POST "$BASE/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH\"}" | python3 -m json.tool 2>/dev/null

# ── 로그아웃 ──────────────────────────────────────────────────

echo ""
echo "================================================="
echo "  9. 로그아웃"
echo "================================================="
curl -s -X POST "$BASE/auth/logout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"refreshToken\": \"$REFRESH\"}"

echo ""
echo "================================================="
echo "  10. SUPER_ADMIN 로그인"
echo "================================================="
SUPER_LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email":    "super@ax-platform.kr",
    "password": "Super@1234"
  }')
echo "$SUPER_LOGIN" | python3 -m json.tool 2>/dev/null || echo "$SUPER_LOGIN"
SUPER_TOKEN=$(echo "$SUPER_LOGIN" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)

# ── /auth/me ──────────────────────────────────────────────────

echo ""
echo "================================================="
echo "  11. GET /auth/me — 현재 사용자 조회 (ORG_ADMIN)"
echo "================================================="
curl -s "$BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "================================================="
echo "  12. GET /auth/me — 현재 사용자 조회 (SUPER_ADMIN)"
echo "================================================="
curl -s "$BASE/auth/me" \
  -H "Authorization: Bearer $SUPER_TOKEN" | python3 -m json.tool 2>/dev/null

# ── RBAC guard 검증 ───────────────────────────────────────────

echo ""
echo "================================================="
echo "  13. INSPECTOR 로그인 후 보호 라우트 접근 테스트"
echo "================================================="
INSP_LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"hong@happy-housing.kr","password":"Inspector@1234"}')
INSP_TOKEN=$(echo "$INSP_LOGIN" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "[INSPECTOR] GET /api/v1/users (ORG_ADMIN only → 403 expected)"
curl -s "$BASE/users" \
  -H "Authorization: Bearer $INSP_TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "[INSPECTOR] GET /api/v1/auth/me (허용 → 200 expected)"
curl -s "$BASE/auth/me" \
  -H "Authorization: Bearer $INSP_TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "[인증 없이] GET /api/v1/dashboard (토큰 없음 → 401 expected)"
curl -s "$BASE/dashboard" | python3 -m json.tool 2>/dev/null

echo ""
echo "================================================="
echo "  14. COMPLAINT_MGR 로그인"
echo "================================================="
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"park@happy-housing.kr","password":"Cmgr@1234"}' \
  | python3 -m json.tool 2>/dev/null

echo ""
echo "================================================="
echo "  15. REVIEWER 로그인"
echo "================================================="
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"choi@happy-housing.kr","password":"Reviewer@1234"}' \
  | python3 -m json.tool 2>/dev/null

echo ""
echo "✅ 테스트 완료"
echo ""
echo "CouchDB Fauxton 확인: http://localhost:5984/_utils"
echo "  ID: admin / PW: secret"
echo "Swagger API 문서:     http://localhost:3000/api/docs"

# ================================================================
# 시설 구조 CRUD 테스트
# ================================================================

echo ""
echo "================================================="
echo "  [구조] 1. 단지 목록"
echo "================================================="
curl -s "$BASE/complexes" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "================================================="
echo "  [구조] 2. 단지 생성 (ORG_ADMIN)"
echo "================================================="
NEW_COMPLEX=$(curl -s -X POST "$BASE/complexes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "테스트 3단지",
    "address": "서울시 동작구 상도로 100",
    "totalUnits": 200,
    "totalBuildings": 2,
    "builtYear": 2003,
    "managedBy": "user:_platform:usr_admin01",
    "latitude": 37.5040,
    "longitude": 126.9420,
    "tags": ["아파트", "영구임대"]
  }')
echo "$NEW_COMPLEX" | python3 -m json.tool 2>/dev/null || echo "$NEW_COMPLEX"
COMPLEX_ID=$(echo "$NEW_COMPLEX" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "생성된 단지 ID: $COMPLEX_ID"

echo ""
echo "================================================="
echo "  [구조] 3. 단지 상세 조회"
echo "================================================="
curl -s "$BASE/complexes/$(python3 -c "import urllib.parse; print(urllib.parse.quote('$COMPLEX_ID', safe=''))")" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "================================================="
echo "  [구조] 4. 동 생성"
echo "================================================="
NEW_BLDG=$(curl -s -X POST "$BASE/buildings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"complexId\": \"$COMPLEX_ID\",
    \"name\": \"301동\",
    \"code\": \"C301\",
    \"totalFloors\": 10,
    \"undergroundFloors\": 1,
    \"totalUnits\": 100,
    \"builtDate\": \"2003-05-20\",
    \"structureType\": \"철근콘크리트조\"
  }")
echo "$NEW_BLDG" | python3 -m json.tool 2>/dev/null || echo "$NEW_BLDG"
BLDG_ID=$(echo "$NEW_BLDG" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "생성된 동 ID: $BLDG_ID"

echo ""
echo "================================================="
echo "  [구조] 5. 층 생성"
echo "================================================="
NEW_FLOOR=$(curl -s -X POST "$BASE/floors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"buildingId\": \"$BLDG_ID\",
    \"complexId\": \"$COMPLEX_ID\",
    \"floorNumber\": -1,
    \"floorName\": \"B1\",
    \"area\": 480.5
  }")
echo "$NEW_FLOOR" | python3 -m json.tool 2>/dev/null || echo "$NEW_FLOOR"
FLOOR_ID=$(echo "$NEW_FLOOR" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "================================================="
echo "  [구조] 6. 구역 생성"
echo "================================================="
curl -s -X POST "$BASE/zones" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"floorId\": \"$FLOOR_ID\",
    \"buildingId\": \"$BLDG_ID\",
    \"complexId\": \"$COMPLEX_ID\",
    \"name\": \"지하주차장 A\",
    \"code\": \"Z-PKG-A\",
    \"description\": \"B1 주차구역 A\"
  }" | python3 -m json.tool 2>/dev/null

echo ""
echo "================================================="
echo "  [구조] 7. 단지 전체 트리 조회 (단 1개 API 호출)"
echo "================================================="
curl -s "$BASE/complexes/$(python3 -c "import urllib.parse; print(urllib.parse.quote('$COMPLEX_ID', safe=''))")/tree" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "================================================="
echo "  [구조] 8. INSPECTOR 권한으로 단지 생성 시도 → 403"
echo "================================================="
INSP_TOKEN_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"hong@happy-housing.kr","password":"Inspector@1234"}')
INSP_TOKEN=$(echo "$INSP_TOKEN_RESP" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
curl -s -X POST "$BASE/complexes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INSP_TOKEN" \
  -d '{"name":"권한없음","address":"x","totalUnits":1,"totalBuildings":1,"builtYear":2000,"managedBy":"x"}' \
  | python3 -m json.tool 2>/dev/null

echo ""
echo "================================================="
echo "  [구조] 9. GET /organizations/current"
echo "================================================="
curl -s "$BASE/organizations/current" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "✅ 시설 구조 CRUD 테스트 완료"
