# Phase 2 기반 아키텍처

## 개요

Phase 1 MVP를 유지한 채 AI/드론/RPA 비동기 처리 인프라를 추가한다.

---

## 핵심 설계 원칙

- Phase 1 기능을 깨지 않는다 (기존 API, DB, 인증 그대로 유지)
- Feature Flag로 Phase 2 기능을 점진적으로 활성화
- 장시간 처리 작업은 Bull Queue → Worker로 분리
- Job 상태를 CouchDB에 추적, Admin Web에서 실시간 조회

---

## 아키텍처 다이어그램

```
                        ┌─────────────────────────────────────────────────────┐
                        │                  ax-net (Docker bridge)             │
                        │                                                     │
  Browser ──► nginx ──► │ api (:3000) ──► Bull Queue (Redis)                 │
                        │                    │                                │
                        │          ┌─────────┴──────────┐                    │
                        │          ▼                     ▼                    │
                        │     ai-worker             job-worker                │
                        │     (ai-queue)            (job-queue)               │
                        │          │                     │                    │
                        │          └─────────┬───────────┘                   │
                        │                    ▼                                │
                        │               CouchDB (:5984)                      │
                        │               MinIO (:9000)                        │
                        └─────────────────────────────────────────────────────┘
```

---

## 새로 추가된 컴포넌트

1. **Job 도메인** (`apps/api/src/modules/jobs/`)
   - Job CRUD API, 상태 추적, Bull 큐 발행
2. **Feature Flags 도메인** (`apps/api/src/modules/feature-flags/`)
   - 기능 플래그 관리 API, 런타임 활성화/비활성화
3. **AI Worker** (`apps/ai-worker/`)
   - `ai-queue` 소비자: AI 이미지 분석, 드론 영상 분석, 균열 폭 측정
4. **Job Worker** (`apps/job-worker/`)
   - `job-queue` 소비자: 보고서 생성, RPA 자동화, 일정 자동 생성
5. **Admin Web 신규 화면**
   - 비동기 작업 목록/상세 화면
   - 기능 플래그 관리 화면

---

## Job 상태 흐름

```
PENDING → QUEUED → RUNNING → COMPLETED
                           → FAILED
                           → CANCELLED
```

| 상태        | 설명                              |
|-------------|-----------------------------------|
| PENDING     | Job 생성됨, 아직 큐에 미발행      |
| QUEUED      | Bull 큐에 발행됨                  |
| RUNNING     | Worker가 처리 중                  |
| COMPLETED   | 정상 완료                         |
| FAILED      | 오류로 실패 (재시도 대상)         |
| CANCELLED   | 사용자 또는 시스템이 취소         |

---

## Job 큐 라우팅

### ai-queue (AI Worker 소비)

| Job Type                  | 설명                          |
|---------------------------|-------------------------------|
| `AI_IMAGE_ANALYSIS`       | 결함 이미지 AI 분석           |
| `DRONE_VIDEO_ANALYSIS`    | 드론 영상 프레임 분석         |
| `CRACK_WIDTH_MEASUREMENT` | 균열 폭 자동 측정             |

### job-queue (Job Worker 소비)

| Job Type                  | 설명                               |
|---------------------------|------------------------------------|
| `REPORT_GENERATION`       | 점검 보고서 PDF 생성               |
| `RPA_BILL_GENERATION`     | 관리비 고지서 RPA 자동 생성        |
| `RPA_CONTRACT_EXPIRY`     | 계약 만료 알림 RPA 자동화          |
| `RPA_COMPLAINT_INTAKE`    | 민원 접수 RPA 자동 처리            |
| `SCHEDULE_AUTO_GENERATE`  | 점검 일정 자동 생성                |

---

## Feature Flag 목록

| 키                        | 설명                              | 기본값  |
|---------------------------|-----------------------------------|---------|
| `phase2.ai`               | AI 분석 기능 전체 활성화          | `false` |
| `phase2.drone`            | 드론 영상 분석 기능               | `false` |
| `phase2.rpa`              | RPA 자동화 기능                   | `false` |
| `phase2.report`           | 보고서 자동 생성 기능             | `false` |
| `phase2.schedule`         | 일정 자동 생성 기능               | `false` |
| `phase2.crack-measure`    | 균열 폭 자동 측정 기능            | `false` |
| `phase2.feature-flags-ui` | Admin Web 기능 플래그 관리 화면   | `false` |

---

## 실행 방법

### Phase 1만 (기존과 동일)

```bash
docker compose up -d
```

### Phase 2 포함 (Worker 서비스 추가 기동)

```bash
docker compose --profile phase2 up -d
```

### 특정 서비스만 빌드 후 기동

```bash
docker compose --profile phase2 up -d --build ai-worker job-worker
```

---

## Worker 상태 확인

```bash
# AI Worker 로그 실시간 확인
docker compose logs -f ai-worker

# Job Worker 로그 실시간 확인
docker compose logs -f job-worker

# 두 Worker 동시 확인
docker compose logs -f ai-worker job-worker
```

---

## Job API 사용 예시

### Job 생성

```http
POST /api/v1/jobs
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "AI_IMAGE_ANALYSIS",
  "payload": {
    "imageKey": "uploads/org_seed001/defect_001.jpg",
    "analysisType": "DEFECT_DETECTION"
  },
  "priority": "HIGH"
}
```

### Job 상태 조회

```http
GET /api/v1/jobs/{jobId}
Authorization: Bearer <token>
```

### Job 목록 조회 (필터 포함)

```http
GET /api/v1/jobs?status=RUNNING&type=AI_IMAGE_ANALYSIS&page=1&limit=20
Authorization: Bearer <token>
```

---

## Feature Flag 활성화

### 단일 플래그 활성화

```http
PUT /api/v1/feature-flags/phase2.ai
Content-Type: application/json
Authorization: Bearer <token>

{ "enabled": true }
```

### 전체 플래그 목록 조회

```http
GET /api/v1/feature-flags
Authorization: Bearer <token>
```

---

## 워커 상태 콜백 구조

워커는 JWT 없이 API를 호출한다. `X-Worker-Secret` 헤더 + `orgId` 쿼리파라미터 필수.

```
PATCH /api/v1/jobs/{jobDocId}/status?orgId={orgId}
X-Worker-Secret: {WORKER_SECRET}
Content-Type: application/json

{ "status": "RUNNING", "progress": 50 }
```

`orgId`는 Bull Job 페이로드에 포함되어 워커에서 꺼내 사용한다.  
누락 시 API가 CouchDB 조직 DB를 찾지 못해 404 응답.

---

## CouchDB 인덱스 파일

`apps/api/src/database/indexes/` 아래에 도메인별 인덱스 정의가 있다.

| 파일 | 설명 |
|------|------|
| `jobs.index.json` | Job 상태·유형·복합·우선순위별 인덱스 |
| `feature-flags.index.json` | 플래그 키·활성화 여부 인덱스 |

인덱스는 `CouchService.applyMangoIndexes()`에 하드코딩 형태로도 등록되어 이중 보호된다.

---

## Phase 2 워커 단독 기동

워커만 별도로 추가하려면:

```bash
# Phase 1 인프라가 실행 중인 상태에서
docker compose -f infra/docker/docker-compose.yml up -d

# 빌드와 함께
docker compose -f infra/docker/docker-compose.yml up -d --build
```

---

## 향후 확장 포인트

1. **실제 AI 모델 통합** — Mask R-CNN, Y-MaskNet 등 Python 추론 서버 연동
2. **IoT 센서 실시간 스트림 처리** — MQTT 브로커 → Worker 스트림 소비
3. **드론 WebSocket 실시간 피드** — WebSocket Gateway 추가, 프레임 스트리밍
4. **Job 결과 → 자동 결함 등록** — 결과 후처리 파이프라인(완료 훅) 구현
5. **분산 워커 스케일아웃** — `docker compose scale ai-worker=3`
6. **Job 스케줄링** — cron 기반 자동 실행 (Bull의 `repeat` 옵션 활용)
7. **Bull Board UI** — `/admin/queues` 큐 모니터링 대시보드 연동
8. **SSE 실시간 알림** — Job 완료 시 Admin Web에 Server-Sent Events 푸시
