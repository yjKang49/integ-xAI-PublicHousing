# KPI 정의서 (KPI Definition)

> AX 공공임대주택 관리 플랫폼 — 핵심 성과 지표 정의 및 계산 기준

---

## 개요

대시보드에 표시되는 6개 KPI 카드는 실시간 CouchDB 데이터에서 계산되어 Redis에 60초 캐시됩니다.  
각 KPI는 `direction`(높을수록 좋은지 / 낮을수록 좋은지)에 따라 색상 스타일이 자동 적용됩니다.

---

## KPI 목록

### 1. 민원 평균 처리 시간 (`avgResolutionHours`)

| 항목 | 내용 |
|------|------|
| **단위** | 시간 (h) |
| **방향** | 낮을수록 좋음 (lower-is-better) |
| **목표값** | ≤ 24시간 |
| **경고 기준** | > 24시간 |
| **위험 기준** | > 48시간 |
| **색상** | 달성: 초록 / 경고: 주황 / 위험: 빨강 |

**계산 방법:**
```
avgResolutionHours = Σ(resolvedAt - submittedAt) / resolvedCount
```
- 조건: `status IN ['RESOLVED', 'CLOSED']` AND `resolvedAt IS NOT NULL`
- 최근 500건 한정 (limit: 500)
- 단위: 밀리초 → 시간 환산 후 반올림

---

### 2. 점검 완료율 (`inspectionCompletionRate`)

| 항목 | 내용 |
|------|------|
| **단위** | % |
| **방향** | 높을수록 좋음 (higher-is-better) |
| **목표값** | ≥ 95% |
| **경고 기준** | 85% ~ 95% |
| **위험 기준** | < 85% |

**계산 방법:**
```
inspectionCompletionRate = (이번 달 완료 세션 수 / 전체 세션 수) × 100
```
- `이번 달 완료` = `status = 'COMPLETED'` AND `completedAt >= 월초 00:00:00`
- `전체 세션 수` = 단지/조직 내 모든 `inspectionSession` 문서 수
- 전체 세션이 0인 경우 0% 반환

---

### 3. 고위험 결함 수 (`criticalDefects + highDefects`)

| 항목 | 내용 |
|------|------|
| **단위** | 건 |
| **방향** | 낮을수록 좋음 (lower-is-better) |
| **긴급(CRITICAL) 목표** | 0건 유지 |
| **높음(HIGH) 경고 기준** | > 5건 |

**계산 방법:**
```sql
criticalDefects = COUNT WHERE docType='defect' AND severity='CRITICAL' AND isRepaired=false
highDefects     = COUNT WHERE docType='defect' AND severity='HIGH'     AND isRepaired=false
```
- 미수리(`isRepaired: false`) 건수만 카운트
- 수리 완료된 결함은 KPI에서 제외

---

### 4. 균열 임계치 초과 경보 수 (`crackAlertCount`)

| 항목 | 내용 |
|------|------|
| **단위** | 건 |
| **방향** | 낮을수록 좋음 (lower-is-better) |
| **목표값** | ≤ 2건/월 |
| **경고 기준** | > 2건 |
| **위험 기준** | > 5건 |

**계산 방법:**
```sql
crackAlertCount = COUNT WHERE docType='alert'
                           AND alertType='CRACK_THRESHOLD'
                           AND status='ACTIVE'
```
- `status = 'ACTIVE'`인 경보만 카운트 (ACKNOWLEDGED/RESOLVED 제외)
- 동일 게이지 포인트 중복 경보는 Alert 생성 시 deduplication으로 방지

**연관 지표:**
- `thresholdExceedances` = 총 임계치 초과 측정값 개수 (경보 수와 다름)
- `activeGaugePoints` = 활성 게이지 포인트 수

---

### 5. 예방 정비 절감 추산 (`preventiveMaintenanceSavingsEstimate`)

| 항목 | 내용 |
|------|------|
| **단위** | 원 (KRW) |
| **방향** | 높을수록 좋음 (higher-is-better) |
| **표시** | 만 원 단위로 간략 표시 |

**계산 공식:**
```
조기 발견 결함 = defect 중 severity IN ['MEDIUM', 'LOW'] 인 전체 건수
절감 추산액  = 조기 발견 결함 × 1,400,000 원
```

**근거:**
- 긴급 보수 평균 비용: 200만 원
- 예방 점검을 통해 조기 발견 시 보수 비용: 60만 원 (긴급의 30%)
- 1건당 절감액 = 200만 − 60만 = **140만 원**

> 참고: 이 값은 추산치로, 실제 비용은 단지/건물별 보수 이력에 따라 달라질 수 있습니다.

---

### 6. 민원 해결률 (`complaintResolutionRate`)

| 항목 | 내용 |
|------|------|
| **단위** | % |
| **방향** | 높을수록 좋음 (higher-is-better) |
| **목표값** | ≥ 90% |
| **경고 기준** | 75% ~ 90% |
| **위험 기준** | < 75% |

**계산 방법:**
```
complaintResolutionRate = (RESOLVED + CLOSED 건수 / 전체 민원 수) × 100

전체 민원 = RECEIVED + ASSIGNED + RESOLVED + CLOSED + OVERDUE
```

---

## 결함 수리율 (`defectRepairRate`)

대시보드 KPI 외 별도 지표.

| 항목 | 내용 |
|------|------|
| **단위** | % |
| **목표값** | ≥ 85% |
| **방향** | 높을수록 좋음 |

```
defectRepairRate = ((전체 결함 - 미수리 결함) / 전체 결함) × 100
```
- 전체 결함이 0이면 100% 반환

---

## 계산 흐름

```
HTTP GET /api/v1/dashboard?complexId=xxx
         │
         ▼
DashboardService.getDashboard()
         │
         ├── Redis CACHE HIT? ──▶ 반환 (TTL: 60초)
         │
         └── computeDashboard()
                  │
                  ├── CouchDB: defect (count: CRITICAL/HIGH/unrepaired)
                  ├── CouchDB: alert (active + CRACK_THRESHOLD)
                  ├── CouchDB: complaint (pending/overdue/resolved)
                  ├── CouchDB: inspectionProject (active)
                  ├── CouchDB: inspectionSession (overdue/completed)
                  ├── CouchDB: crackMeasurement (exceedsThreshold)
                  ├── CouchDB: crackGaugePoint (active)
                  └── 계산 후 Redis SETEX (60초)
```

---

## 색상 매핑 기준

| 상태 | 색상 | 조건 |
|------|------|------|
| **정상 (success)** | 초록 `#4caf50` | 목표 달성 |
| **경고 (warn)** | 주황 `#ff9800` | 목표의 ±10% 이내 |
| **위험 (danger)** | 빨강 `#f44336` | 목표 대비 10% 초과 이탈 |
| **기본 (primary)** | 남색 `#1976d2` | 중립 지표 |

평가 함수: `packages/shared/src/domain/kpi-record.ts` → `evaluateKpi()`

---

## 캐시 및 갱신

- **Redis TTL**: 60초
- **자동 갱신**: 대시보드 페이지 60초마다 자동 refetch (setInterval)
- **수동 갱신**: 우상단 새로고침 버튼 또는 complexId 필터 변경 시 즉시 재조회
- **캐시 키**: `dashboard:{orgId}:{complexId|'all'}`

---

## 향후 고도화 계획

| 항목 | 내용 | 시기 |
|------|------|------|
| 기간별 KPI 추이 차트 | 월별/분기별 KPI 변화 시계열 | Phase 3 |
| 단지별 비교 | 복수 단지 KPI 대시보드 | Phase 3 |
| 알림 임계치 설정 | 관리자가 KPI 목표값 직접 설정 | Phase 4 |
| KPI 레포트 자동 발송 | 월 1회 이메일/SMS 보고 | Phase 4 |
