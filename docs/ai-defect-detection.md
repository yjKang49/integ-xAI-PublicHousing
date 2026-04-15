# AI 결함 자동 탐지 파이프라인

> Phase 2 — 세 번째 Vertical Slice  
> 이미지/프레임 기반 결함 자동 분류·탐지 + Human-in-the-loop 검토 흐름

---

## 1. 아키텍처 개요

```
[드론 미션 / 현장 이미지]
        │
        ▼
POST /ai-detections/trigger          ← feature flag: ai.defect_detection
        │
        ▼ (DEFECT_DETECTION Job → ai-queue)
┌──────────────────────────────────┐
│         ai-worker                │
│  DefectDetectionProcessor        │
│     ├─ VisionInferenceAdapter    │  (교체 가능한 추상 계층)
│     │      └─ MockVisionAdapter  │  (현재 기본값)
│     │         MaskRcnnAdapter    │  (교체 예정)
│     │         YMaskNetAdapter    │  (드론 전용, 교체 예정)
│     │                            │
│     └─ POST /defect-candidates/internal/batch  (X-Worker-Secret)
└──────────────────────────────────┘
        │
        ▼
  DetectedDefectCandidate (CouchDB)
        │
        ▼
[Admin Web — AI 결함 탐지 검토 페이지]
   PATCH /defect-candidates/:id/review   (APPROVED / REJECTED)
   POST  /defect-candidates/:id/promote  (→ Defect 문서 생성)
```

---

## 2. 결함 유형

| 코드 | 한국어 | KCS 기준 |
|------|--------|----------|
| `CRACK` | 균열 | KCS 41 55 02 |
| `LEAK` | 누수 | KCS 41 40 06 |
| `DELAMINATION` | 박리/박락 | KCS 41 55 02 |
| `SPOILING` | 오손/오염 | KCS 41 55 03 |
| `CORROSION` | 부식 | KCS 14 20 22 |
| `EFFLORESCENCE` | 백태 | KCS 41 55 04 |
| `FIRE_RISK_CLADDING` | 화재위험 외장재 | KCS 41 55 08 |
| `OTHER` | 기타 | — |

---

## 3. 신뢰도 등급

| 등급 | 범위 | 처리 |
|------|------|------|
| `AUTO_ACCEPT` | ≥ 90% | 자동 확정 후보 (검토자 확인 권장) |
| `REQUIRES_REVIEW` | 80~89% | 엔지니어 검토 필수 |
| `MANUAL_REQUIRED` | < 80% | 수동 입력 유도 |

---

## 4. API 엔드포인트

### AI 탐지 트리거

```http
POST /api/v1/ai-detections/trigger
Authorization: Bearer {token}
Content-Type: application/json

{
  "complexId": "complex001",
  "buildingId": "building_A",
  "sourceType": "DRONE_IMAGE",
  "sourceMediaId": "abc123",
  "storageKey": "drone/org001/complex001/abc/images/1234567890_img.jpg",
  "model": "MOCK",
  "confidenceThreshold": 0.5,
  "maxDetections": 20
}
```

**응답:**
```json
{ "jobId": "job:org001:a1b2c3d4", "status": "QUEUED" }
```

### 드론 미션 전체 일괄 탐지

```http
POST /api/v1/ai-detections/missions/:missionId/trigger
Authorization: Bearer {token}

{ "model": "MOCK", "confidenceThreshold": 0.5 }
```

### 결함 후보 목록 조회

```http
GET /api/v1/defect-candidates?reviewStatus=PENDING&complexId=complex001&page=1&limit=20
Authorization: Bearer {token}
```

### 결함 후보 검토 (승인/기각)

```http
PATCH /api/v1/defect-candidates/:id/review
Authorization: Bearer {token}

{
  "reviewStatus": "APPROVED",
  "reviewNote": "균열 확인 완료, 폭 0.5mm 초과"
}
```

### Defect 승격

```http
POST /api/v1/defect-candidates/:id/promote
Authorization: Bearer {token}

{
  "severity": "HIGH",
  "description": "RC 외벽 수직 균열, 즉시 보수 필요",
  "locationDescription": "A동 3층 외벽 북측",
  "sessionId": "session:org001:sess_abc"
}
```

### 탐지 통계

```http
GET /api/v1/ai-detections/stats?complexId=complex001
Authorization: Bearer {token}
```

**응답:**
```json
{ "pending": 12, "approved": 5, "rejected": 3, "promoted": 8, "total": 28 }
```

---

## 5. Feature Flag

| 키 | 기본값 | 설명 |
|----|--------|------|
| `ai.defect_detection` | `false` | AI 결함 후보 자동 탐지 파이프라인 전체 on/off |

**활성화 방법:**
1. Admin Web → 기능 플래그 페이지 (`/feature-flags`)
2. `ai.defect_detection` 플래그를 `enabled: true` 로 설정

---

## 6. Vision Inference Adapter 교체

현재 기본값은 `MockVisionInferenceAdapter` (실제 모델 없이 결정론적 stub 결과 생성).

실제 모델로 교체하려면 `apps/ai-worker/src/worker.module.ts` 수정:

```typescript
// Mock (현재 기본값)
{ provide: VISION_INFERENCE_ADAPTER, useClass: MockVisionInferenceAdapter }

// Mask R-CNN (교체 예정)
{ provide: VISION_INFERENCE_ADAPTER, useClass: MaskRcnnAdapter }

// Y-MaskNet 드론 비전 AI (교체 예정)
{ provide: VISION_INFERENCE_ADAPTER, useClass: YMaskNetAdapter }
```

### 새 Adapter 구현

```typescript
@Injectable()
export class MaskRcnnAdapter implements VisionInferenceAdapter {
  async detect(input: VisionInferenceInput): Promise<VisionInferenceResult> {
    // 1. S3에서 이미지 다운로드
    // 2. gRPC 또는 HTTP로 추론 서버 호출
    // 3. 결과를 VisionInferenceResult 형태로 변환하여 반환
    return { candidates: [...], modelVersion: 'mask-rcnn-v1.2', ... }
  }
}
```

---

## 7. 도메인 문서 구조

### DetectedDefectCandidate

```
defectCandidate:{orgId}:{uuid8}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `defectType` | CandidateDefectType | AI 탐지 결함 유형 |
| `confidence` | number (0~1) | 탐지 신뢰도 |
| `confidenceLevel` | string | AUTO_ACCEPT / REQUIRES_REVIEW / MANUAL_REQUIRED |
| `bbox` | [x, y, w, h] | 바운딩 박스 (이미지 크기 기준 0~1 비율) |
| `suggestedSeverity` | string | AI 제안 심각도 |
| `aiCaption` | string | KCS 전문용어 기반 AI 캡션 |
| `kcsStandardRef` | string | KCS 기준 코드 |
| `kcsExceedsLimit` | boolean | KCS 허용 기준 초과 여부 |
| `reviewStatus` | CandidateReviewStatus | PENDING / APPROVED / REJECTED / PROMOTED |
| `promotedDefectId` | string | 승격된 Defect._id |
| `detectionJobId` | string | 탐지 Job._id |

---

## 8. 워커 ↔ API 통신

워커가 결함 후보를 저장할 때는 JWT 없이 `X-Worker-Secret` 헤더로 내부 엔드포인트를 호출합니다:

```
POST /api/v1/defect-candidates/internal/batch
X-Worker-Secret: {WORKER_SECRET 환경변수값}
```

---

## 9. Admin Web 검토 흐름

```
/ai-detections 페이지
    │
    ├─ [검색 대기 중] 필터 (상태/유형/신뢰도/소스) → 결함 후보 카드 그리드
    │
    ├─ [카드 클릭] → 우측 DetectionReviewPanel 열림
    │       ├─ 후보 정보 (신뢰도/bbox/AI캡션/KCS)
    │       ├─ 빠른 승인/기각 버튼
    │       └─ Defect 승격 폼 (APPROVED 상태일 때)
    │
    ├─ [승인 클릭] → PATCH /defect-candidates/:id/review { reviewStatus: "APPROVED" }
    ├─ [기각 클릭] → PATCH /defect-candidates/:id/review { reviewStatus: "REJECTED" }
    └─ [Defect 승격 클릭] → POST /defect-candidates/:id/promote
                              → Defect 문서 생성됨 → candidate.reviewStatus = "PROMOTED"
```

---

## 10. 테스트 방법

### 1) Feature Flag 활성화

```bash
curl -X PATCH http://localhost:3000/api/v1/feature-flags/ai.defect_detection \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### 2) 탐지 Job 생성

```bash
curl -X POST http://localhost:3000/api/v1/ai-detections/trigger \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "complexId": "complex001",
    "sourceType": "DRONE_IMAGE",
    "sourceMediaId": "mediaItem001",
    "storageKey": "drone/org001/complex001/test/images/sample.jpg",
    "model": "MOCK",
    "confidenceThreshold": 0.5
  }'
```

### 3) 후보 목록 조회

```bash
curl -X GET "http://localhost:3000/api/v1/defect-candidates?reviewStatus=PENDING" \
  -H "Authorization: Bearer {token}"
```

### 4) 승인 및 Defect 승격

```bash
# 승인
curl -X PATCH http://localhost:3000/api/v1/defect-candidates/{candidateId}/review \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"reviewStatus": "APPROVED"}'

# Defect 승격
curl -X POST http://localhost:3000/api/v1/defect-candidates/{candidateId}/promote \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"severity": "HIGH", "description": "AI 탐지 균열 확인"}'
```

### 5) 드론 미션 전체 탐지

```bash
curl -X POST "http://localhost:3000/api/v1/ai-detections/missions/{missionId}/trigger" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"model": "MOCK", "confidenceThreshold": 0.5}'
```

---

## 11. Mock 추론 결과 예시

`MockVisionInferenceAdapter`는 `storageKey`를 시드로 사용하여 결정론적 결과를 생성합니다.  
같은 `storageKey`로 호출하면 항상 동일한 결과가 반환됩니다.

```json
{
  "candidates": [
    {
      "defectType": "CRACK",
      "confidence": 0.94,
      "confidenceLevel": "AUTO_ACCEPT",
      "bbox": [0.12, 0.25, 0.18, 0.08],
      "suggestedSeverity": "MEDIUM",
      "aiCaption": "RC 외벽 수직 건조수축 균열 — 폭 0.4mm, 길이 약 35cm",
      "kcsStandardRef": "KCS 41 55 02",
      "kcsExceedsLimit": true
    },
    {
      "defectType": "LEAK",
      "confidence": 0.91,
      "confidenceLevel": "AUTO_ACCEPT",
      "bbox": [0.30, 0.10, 0.25, 0.30],
      "suggestedSeverity": "HIGH",
      "aiCaption": "외벽 누수 흔적 — 철근 부식 위험 동반 가능성",
      "kcsStandardRef": "KCS 41 40 06",
      "kcsExceedsLimit": true
    }
  ],
  "modelVersion": "mock-v0.1",
  "processedAt": "2026-04-13T10:00:00.000Z",
  "inferenceTimeMs": 342
}
```

---

## 12. CouchDB 인덱스

`apps/api/src/database/indexes/defect-candidates.index.json` 참조.  
실제 적용은 `CouchService.applyMangoIndexes()` 에서 자동 관리됩니다.

| 인덱스명 | 필드 | 용도 |
|----------|------|------|
| `idx-defectcandidate-complex-created` | docType, orgId, complexId, createdAt | 단지별 목록 |
| `idx-defectcandidate-review-created` | docType, orgId, reviewStatus, createdAt | 검토 상태별 목록 |
| `idx-defectcandidate-mission-created` | docType, orgId, sourceMissionId, createdAt | 미션별 목록 |
| `idx-defectcandidate-type-created` | docType, orgId, defectType, createdAt | 유형별 목록 |
| `idx-defectcandidate-confidence-review` | docType, orgId, confidenceLevel, reviewStatus | 신뢰도별 필터 |
| `idx-defectcandidate-job` | docType, orgId, detectionJobId | Job 연결 조회 |
